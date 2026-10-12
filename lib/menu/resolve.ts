import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { rotationDayNumber } from '@/lib/menu/rotation';

export type MenuDish = { id: string; code: string; name: string; category: string; calories: number; protein: number; carbs: number; fat: number; grams: number; image_url: string | null; allergens: string[] };
export type ResolvedMenu = { dishes: MenuDish[]; calories: number; protein: number; overridden: boolean };

const PARTS = ['main_id', 'protein_side_id', 'legume_id', 'salad_id', 'carb_id'] as const;
const ORDER = ['main', 'protein_side', 'legume', 'salad', 'carb'];

/**
 * Resolves the menu for many (date, diet, slot) combinations in three queries:
 * 30-day rotation + per-date overrides + dish catalog.
 */
export async function resolveMenus(
  supabase: SupabaseClient<Database>,
  keys: { date: string; diet: 'veg' | 'non_veg'; slot: 'lunch' | 'dinner' }[]
): Promise<Map<string, ResolvedMenu>> {
  const out = new Map<string, ResolvedMenu>();
  if (!keys.length) return out;
  const dates = [...new Set(keys.map((k) => k.date))].sort();

  const [rot, ovr, items] = await Promise.all([
    supabase.from('menu_rotation').select('day_number, diet, slot, main_id, protein_side_id, legume_id, salad_id, carb_id'),
    supabase.from('menu_overrides').select('menu_date, diet, slot, main_id, protein_side_id, legume_id, salad_id, carb_id')
      .gte('menu_date', dates[0]).lte('menu_date', dates[dates.length - 1]),
    supabase.from('menu_items').select('id, code, name, category, calories, protein, carbs, fat, grams, image_url, allergens'),
  ]);
  const rotation = new Map((rot.data ?? []).map((r) => [`${r.day_number}|${r.diet}|${r.slot}`, r]));
  const overrides = new Map((ovr.data ?? []).map((o) => [`${o.menu_date}|${o.diet}|${o.slot}`, o]));
  const catalog = new Map((items.data ?? []).map((i) => [i.id, { ...i, calories: Number(i.calories), protein: Number(i.protein), carbs: Number(i.carbs), fat: Number(i.fat) } as MenuDish]));

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
