import 'server-only';
import { unstable_cache } from 'next/cache';
import { getSupabasePublic } from '@/lib/supabase/server';
import { PRICING } from '@/lib/menu-engine';
import type { AddonDrink, PlanTier, SideBox } from '@/types';

/**
 * Shared, cached catalog reads for public pages.
 *
 * - Anonymous client (no cookies), so one cached result serves every visitor.
 * - Each dataset has a cache tag; admin actions call revalidateTag(tag) and
 *   the next request rebuilds it (and the CDN copy of pages that used it).
 * - `revalidate` is only a safety net in case a tag is ever missed.
 *
 * Tag map (keep in sync with the admin actions):
 *   menu · plans · addons · zones · faqs · reviews · blog · settings
 */
export const CATALOG_TAGS = ['menu', 'plans', 'addons', 'zones', 'faqs', 'reviews', 'blog', 'settings'] as const;
const HOUR = 3600;

// ---------------------------------------------------------------- menu
export type MenuSnapshot = {
  items: { id: string; code: string; name: string; category: string; grams: number; calories: number; protein: number; carbs: number; fat: number; fiber: number; allergens: string[]; description: string | null; image_url: string | null }[];
  rotation: { day_number: number; diet: string; slot: string; main_id: string; protein_side_id: string; salad_id: string; legume_id: string; carb_id: string }[];
  overrides: { menu_date: string; diet: string; slot: string; main_id: string | null; protein_side_id: string | null; salad_id: string | null; legume_id: string | null; carb_id: string | null }[];
  closures: { closed_date: string; reason: string }[];
  version: string;
};

export const getMenuSnapshot = unstable_cache(
  async (): Promise<MenuSnapshot | null> => {
    const db = getSupabasePublic();
    const since = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
    const [items, rotation, overrides, closures] = await Promise.all([
      db.from('menu_items').select('id, code, name, category, grams, calories, protein, carbs, fat, fiber, allergens, description, image_url'),
      db.from('menu_rotation').select('day_number, diet, slot, main_id, protein_side_id, salad_id, legume_id, carb_id'),
      db.from('menu_overrides').select('menu_date, diet, slot, main_id, protein_side_id, salad_id, legume_id, carb_id').gte('menu_date', since),
      db.from('kitchen_closures').select('closed_date, reason').gte('closed_date', since),
    ]);
    if (items.error || rotation.error || !items.data?.length || !rotation.data?.length) return null;
    return {
      items: items.data.map((i) => ({ ...i, calories: Number(i.calories), protein: Number(i.protein), carbs: Number(i.carbs), fat: Number(i.fat), fiber: Number(i.fiber) })),
      rotation: rotation.data,
      overrides: overrides.data ?? [],
      closures: closures.data ?? [],
      version: new Date().toISOString(),
    };
  },
  ['catalog-menu'],
  { tags: ['menu'], revalidate: HOUR }
);

// ---------------------------------------------------------------- prices
export type PricingMatrix = typeof PRICING;

export const getPricingMatrix = unstable_cache(
  async (): Promise<PricingMatrix> => {
    const { data } = await getSupabasePublic()
      .from('pricing_rules')
      .select('plan_type, diet, price_per_meal, second_meal_discount, effective_from')
      .lte('effective_from', new Date().toISOString())
      .order('effective_from', { ascending: false });
    const m: PricingMatrix = JSON.parse(JSON.stringify(PRICING));
    const seen = new Set<string>();
    for (const r of data ?? []) {
      const key = `${r.plan_type}|${r.diet}`;
      if (seen.has(key) || !(r.plan_type in m)) continue;
      seen.add(key);
      m[r.plan_type as 'trial' | 'weekly' | 'monthly'][r.diet === 'veg' ? 'veg' : 'non-veg'] = Number(r.price_per_meal);
      m.secondMealDiscount = Number(r.second_meal_discount);
    }
    return m;
  },
  ['catalog-pricing'],
  { tags: ['plans'], revalidate: HOUR }
);

// ---------------------------------------------------------------- plans (home teaser)
export const getPlanTiers = unstable_cache(
  async (): Promise<PlanTier[]> => {
    const [{ data: plans }, pricing, menu] = await Promise.all([
      getSupabasePublic().from('plans').select('*').eq('is_active', true).neq('type', 'trial').order('sort_order'),
      getPricingMatrix(),
      getMenuSnapshot(),
    ]);
    // Daily protein/kcal ranges from the real 30-day non-veg lunch rotation.
    const byId = new Map((menu?.items ?? []).map((i) => [i.id, i]));
    const boxes = (menu?.rotation ?? []).filter((r) => r.diet === 'non_veg' && r.slot === 'lunch').map((r) => {
      const parts = [r.main_id, r.protein_side_id, r.salad_id, r.legume_id, r.carb_id].map((id) => byId.get(id));
      return { kcal: parts.reduce((s, p) => s + (p?.calories ?? 0), 0), protein: parts.reduce((s, p) => s + (p?.protein ?? 0), 0) };
    });
    const range = (vals: number[], mult: number, unit: string) =>
      vals.length ? `${Math.round(Math.min(...vals) * mult)}–${Math.round(Math.max(...vals) * mult)}${unit}` : '';

    const nvW = pricing.weekly['non-veg'];
    const nvM = pricing.monthly['non-veg'];
    const disc = pricing.secondMealDiscount;
    return (plans ?? []).map((p) => {
      const mpd = p.meals_per_day as 1 | 2;
      const perDayW = nvW + (mpd === 2 ? nvW - disc : 0);
      const perDayM = nvM + (mpd === 2 ? nvM - disc : 0);
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline ?? '',
        mealsPerDay: mpd,
        dailyProteinTarget: range(boxes.map((b) => b.protein), mpd, ' g'),
        dailyCaloriesTarget: range(boxes.map((b) => b.kcal), mpd, ' kcal'),
        weeklyPrice: perDayW * 6,
        monthlyPrice: perDayM * 24,
        pricePerMealWeekly: Math.round(perDayW / mpd),
        pricePerMealMonthly: Math.round(perDayM / mpd),
        oneOffComparePrice: pricing.trial['non-veg'],
        isPopular: p.is_popular,
        badge: p.badge ?? undefined,
        description: p.description ?? '',
        idealFor: (p.ideal_for as string[]) ?? [],
        features: (p.features as string[]) ?? [],
      };
    });
  },
  ['catalog-plan-tiers'],
  { tags: ['plans', 'menu'], revalidate: HOUR }
);

// ---------------------------------------------------------------- add-ons
const getAddonRows = unstable_cache(
  async () => {
    const { data } = await getSupabasePublic().from('addons').select('*').eq('is_active', true).order('sort_order');
    return data ?? [];
  },
  ['catalog-addons'],
  { tags: ['addons'], revalidate: HOUR }
);

export async function getSides(): Promise<SideBox[]> {
  return (await getAddonRows())
    .filter((a) => a.type === 'side' && !a.tags.includes('Dip'))
    .map((a) => ({
      id: a.slug, slug: a.slug, name: a.name, price: Number(a.price),
      calories: Number(a.calories), protein: Number(a.protein), carbs: Number(a.carbs), fat: Number(a.fat),
      isVeg: a.is_veg, tags: a.tags, description: a.description ?? '', image: a.image_url ?? '',
    }));
}

export async function getDrinks(): Promise<AddonDrink[]> {
  return (await getAddonRows())
    .filter((a) => a.type === 'drink')
    .map((a) => ({
      id: a.slug, name: a.name, price: Number(a.price),
      volume: a.volume_ml ? `${a.volume_ml} ml` : '',
      calories: Number(a.calories), protein: Number(a.protein), carbs: Number(a.carbs),
      sugarGrams: Number(a.sugar_g ?? 0),
      sugar: a.sugar_g != null ? `${Number(a.sugar_g)}g natural sugar` : '',
      showSugarBadge: false,
      tags: a.tags, description: a.description ?? '', image: a.image_url ?? '',
    }));
}

// ---------------------------------------------------------------- content
export const getFaqs = unstable_cache(
  async () => {
    const { data } = await getSupabasePublic().from('faqs').select('id, question, answer, category').eq('is_active', true).order('sort_order');
    return data ?? [];
  },
  ['catalog-faqs'],
  { tags: ['faqs'], revalidate: HOUR }
);

export const getPublicSettings = unstable_cache(
  async () => {
    const { data } = await getSupabasePublic().from('site_settings').select('key, value').eq('is_public', true);
    return Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) as Record<string, unknown>;
  },
  ['catalog-settings'],
  { tags: ['settings'], revalidate: HOUR }
);
