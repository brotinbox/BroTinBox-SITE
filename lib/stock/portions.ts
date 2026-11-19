import { liteFactor } from '@/lib/lite-box';

/**
 * Portions to cook per dish for one day: the cook sheet's rule, shared with
 * the kitchen stock (buy list and the 9 PM usage). Lite boxes get main, salad
 * and carb (veg Lite also the curd cup) in smaller portions (lib/lite-box.ts).
 * `fullEq` counts Lite portions as their share of a full portion, so weights
 * stay exact.
 */

export type SheetRow = {
  slot: 'lunch' | 'dinner'; diet: 'veg' | 'non_veg'; box_size: 'regular' | 'lite';
  total: number; egg_free: number; skip_legume: number; double_main: number; make_up: number;
};
export type DishInfo = { id: string; code: string; name: string; category: string; grams: number };
export type DayMenu = {
  main_id: string | null; protein_side_id: string | null; legume_id: string | null;
  salad_id: string | null; carb_id: string | null; is_closed?: boolean;
} | null | undefined;
export type Spare = { slot: 'lunch' | 'dinner'; diet: 'veg' | 'non_veg'; spares: number; used: number };
export type Portion = { full: number; lite: number; liteEq: number };

export const COMBOS = [
  ['non_veg', 'lunch'], ['veg', 'lunch'], ['non_veg', 'dinner'], ['veg', 'dinner'],
] as const;

/** menus: one per COMBOS entry, same order. */
export function countDishPortions(rows: SheetRow[], menus: DayMenu[], items: Map<string, DishInfo>, spares: Spare[]) {
  const portions = new Map<string, Portion>();
  const add = (id: string | null, n: number, size: 'full' | 'lite', veg = false) => {
    if (!id || n <= 0) return;
    const p = portions.get(id) ?? { full: 0, lite: 0, liteEq: 0 };
    p[size] += n;
    if (size === 'lite') {
      const item = items.get(id);
      p.liteEq += n * (item ? liteFactor(item.category, item.grams, item.name, veg) : 0);
    }
    portions.set(id, p);
  };
  COMBOS.forEach(([diet, slot], idx) => {
    const m = menus[idx];
    if (!m || m.is_closed) return;
    for (const r of rows.filter((x) => x.diet === diet && x.slot === slot && x.total > 0)) {
      if (r.box_size === 'lite') {
        const veg = diet === 'veg';
        add(m.main_id, r.total + r.double_main, 'lite', veg);
        if (veg) add(m.protein_side_id, r.total, 'lite', veg); // veg Lite keeps the curd cup
        add(m.salad_id, r.total, 'lite', veg);
        add(m.carb_id, r.total, 'lite', veg);
        continue;
      }
      const eggs = m.protein_side_id ? items.get(m.protein_side_id)?.code === 'NVE' : false;
      add(m.main_id, r.total + r.double_main, 'full');
      add(m.protein_side_id, eggs ? r.total - r.egg_free : r.total, 'full');
      add(m.legume_id, r.total - r.skip_legume + (eggs ? r.egg_free : 0), 'full');
      add(m.salad_id, r.total, 'full');
      add(m.carb_id, r.total, 'full');
    }
  });
  // Spare full boxes for same-day orders are cooked on top of the booked boxes.
  // Spares already sold are booked deliveries (counted above), so only the unsold ones are added.
  const spareExtra = new Map<string, number>();
  let unsoldSpares = 0;
  COMBOS.forEach(([diet, slot], idx) => {
    const m = menus[idx];
    const sp = spares.find((x) => x.diet === diet && x.slot === slot);
    const n = sp ? Math.max(sp.spares - sp.used, 0) : 0;
    if (!m || m.is_closed || n <= 0) return;
    unsoldSpares += n;
    for (const id of [m.main_id, m.protein_side_id, m.legume_id, m.salad_id, m.carb_id]) {
      if (!id) continue;
      add(id, n, 'full');
      spareExtra.set(id, (spareExtra.get(id) ?? 0) + n);
    }
  });
  return { portions, spareExtra, unsoldSpares };
}
