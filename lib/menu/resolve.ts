import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { rotationDayNumber } from '@/lib/menu/rotation';
import { getMenuSnapshot } from '@/lib/data/catalog';

export type MenuDish = { id: string; code: string; name: string; category: string; calories: number; protein: number; carbs: number; fat: number; grams: number; image_url: string | null; allergens: string[] };
export type ResolvedMenu = { dishes: MenuDish[]; calories: number; protein: number; overridden: boolean };

const PARTS = ['main_id', 'protein_side_id', 'legume_id', 'salad_id', 'carb_id'] as const;
const ORDER = ['main', 'protein_side', 'legume', 'salad', 'carb'];

type RotationRow = { day_number: number; diet: string; slot: string } & Partial<Record<(typeof PARTS)[number], string | null>>;
type OverrideRow = { menu_date: string; diet: string; slot: string } & Partial<Record<(typeof PARTS)[number], string | null>>;

/**
 * Rotation, overrides and dishes. Normally served from the cached public menu
 * snapshot (cleared by the 'menu' tag on every admin menu edit), which covers
 * overrides from two days ago onward. Falls back to live queries when the
 * snapshot is unavailable or the range starts earlier than it covers.
 */
async function loadMenuData(supabase: SupabaseClient<Database>, from: string, to: string) {
  const snap = await getMenuSnapshot();
  const snapFrom = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
  if (snap && from >= snapFrom) {
    return {
      rotation: snap.rotation as RotationRow[],
      overrides: snap.overrides.filter((o) => o.menu_date >= from && o.menu_date <= to) as OverrideRow[],
      items: snap.items as unknown as MenuDish[],
    };
  }
  const [rot, ovr, items] = await Promise.all([
    supabase.from('menu_rotation').select('day_number, diet, slot, main_id, protein_side_id, legume_id, salad_id, carb_id'),
    supabase.from('menu_overrides').select('menu_date, diet, slot, main_id, protein_side_id, legume_id, salad_id, carb_id')
      .gte('menu_date', from).lte('menu_date', to),
    supabase.from('menu_items').select('id, code, name, category, calories, protein, carbs, fat, grams, image_url, allergens'),
  ]);
  return {
    rotation: (rot.data ?? []) as RotationRow[],
    overrides: (ovr.data ?? []) as OverrideRow[],
    items: (items.data ?? []) as unknown as MenuDish[],
  };
}

/**
 * Resolves the menu for many (date, diet, slot) combinations from the
 * 30-day rotation, per-date overrides and the dish catalog.
 */
export async function resolveMenus(
  supabase: SupabaseClient<Database>,
  keys: { date: string; diet: 'veg' | 'non_veg'; slot: 'lunch' | 'dinner' }[]
): Promise<Map<string, ResolvedMenu>> {
  const out = new Map<string, ResolvedMenu>();
  if (!keys.length) return out;
  const dates = [...new Set(keys.map((k) => k.date))].sort();

  const data = await loadMenuData(supabase, dates[0], dates[dates.length - 1]);
  const rotation = new Map(data.rotation.map((r) => [`${r.day_number}|${r.diet}|${r.slot}`, r]));
  const overrides = new Map(data.overrides.map((o) => [`${o.menu_date}|${o.diet}|${o.slot}`, o]));
  const catalog = new Map(data.items.map((i) => [i.id, { ...i, calories: Number(i.calories), protein: Number(i.protein), carbs: Number(i.carbs), fat: Number(i.fat), grams: Number(i.grams) } as MenuDish]));

  for (const k of keys) {
    const key = `${k.date}|${k.diet}|${k.slot}`;
    if (out.has(key)) continue;
    const n = rotationDayNumber(k.date);
    if (n === null) continue;
    const r = rotation.get(`${n}|${k.diet}|${k.slot}`);
    const o = overrides.get(key);
    const dishes = PARTS
      .map((p) => catalog.get(((o?.[p] as string | null) ?? (r?.[p] as string | undefined)) ?? ''))
      .filter((d): d is MenuDish => !!d)
      .sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category));
    out.set(key, {
      dishes,
      calories: Math.round(dishes.reduce((s, d) => s + d.calories, 0)),
      protein: Math.round(dishes.reduce((s, d) => s + d.protein, 0) * 10) / 10,
      overridden: !!o,
    });
  }
  return out;
}

/** Locked deliveries carry a frozen menu snapshot; prefer it when present. */
export function menuFromSnapshot(snapshot: unknown): ResolvedMenu | null {
  const s = snapshot as { items?: MenuDish[]; is_override?: boolean } | null;
  if (!s?.items?.length) return null;
  const dishes = [...s.items].sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category));
  return {
    dishes,
    calories: Math.round(dishes.reduce((t, d) => t + Number(d.calories), 0)),
    protein: Math.round(dishes.reduce((t, d) => t + Number(d.protein), 0) * 10) / 10,
    overridden: !!s.is_override,
  };
}
