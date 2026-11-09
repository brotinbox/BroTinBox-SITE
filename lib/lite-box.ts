import type { BoxMeal, MenuItem } from '@/lib/menu-engine';

/**
 * The Lite box (₹199): the same day's dishes as the regular box, in 3 smaller
 * compartments. One place for the rule, used by the order flows, checkout and
 * the kitchen cook sheet.
 *
 *   Main   up to 100 g cooked (150 g chicken → 100 g; 100 g paneer stays 100 g)
 *   Salad  100 g (regular: 150 g)
 *   Carb   1 roti / 1 dosa instead of 2, or ~30 g dry oats instead of 50 g
 *   Veg boxes keep their protein side (the curd cup, full size) so veg Lite
 *   isn't too low on protein: 4 items. Non-veg Lite has no eggs: 3 items.
 *   No legume in any Lite box.
 */
export type BoxSize = 'regular' | 'lite';

export const LITE_MAIN_G = 100;
export const LITE_SALAD_G = 100;
/** Carbs sold by the piece (chapati, dosa) halve; oat dishes go from ~50 g to ~30 g dry oats. */
const carbFactor = (name: string) => (/piece/i.test(name) ? 0.5 : 0.6);

type Category = 'main' | 'protein_side' | 'protein-side' | 'salad' | 'legume' | 'carb' | string;

/** Share of the regular portion that goes into a Lite box (0 = not in it). */
export function liteFactor(category: Category, grams: number, name: string, veg = false): number {
  if (category === 'main') return grams > 0 ? Math.min(1, LITE_MAIN_G / grams) : 1;
  if (category === 'salad') return grams > 0 ? Math.min(1, LITE_SALAD_G / grams) : 1;
  if (category === 'carb') return carbFactor(name);
  if (veg && (category === 'protein_side' || category === 'protein-side')) return 1;
  return 0;
}

/** Veg box? Menu codes: non-veg mains are NVM…, veg mains VM…. */
export const isVegBox = (box: BoxMeal) => !/^NV/i.test(box.items.main.id);

const scale = (item: MenuItem, f: number): MenuItem => ({
  ...item,
  grams: Math.round(item.grams * f),
  calories: item.calories * f,
  protein: item.protein * f,
  carbs: item.carbs * f,
  fat: item.fat * f,
  fiber: (item.fiber ?? 0) * f,
  name: item.category === 'carb' && f === 0.5 ? item.name.replace(/\(2 pieces\)/i, '(1 piece)') : item.name,
});

export type BoxPart = { key: 'main' | 'proteinSide' | 'salad' | 'legume' | 'carb'; item: MenuItem };
export type BoxView = {
  parts: BoxPart[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
  main: MenuItem;
  hasPeanut: boolean;
};

/** The compartments a customer gets for this box size. */
export function boxView(box: BoxMeal, size: BoxSize = 'regular', veg = isVegBox(box)): BoxView {
  const parts: BoxPart[] = size === 'lite'
    ? ([
        ['main', box.items.main, 'main'],
        ...(veg ? [['proteinSide', box.items.proteinSide, 'protein-side']] as const : []),
        ['salad', box.items.salad, 'salad'],
        ['carb', box.items.carb, 'carb'],
      ] as const).map(([key, item, cat]) => ({ key, item: scale(item, liteFactor(cat, item.grams, item.name, veg)) }))
    : (['main', 'proteinSide', 'salad', 'legume', 'carb'] as const).map((key) => ({ key, item: box.items[key] }));
  const totals = parts.reduce(
    (t, { item }) => ({ calories: t.calories + item.calories, protein: t.protein + item.protein, carbs: t.carbs + item.carbs, fat: t.fat + item.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  return {
    parts,
    totals,
    main: parts[0].item,
    hasPeanut: parts.some((p) => p.item.allergens?.includes('Peanut')),
  };
}

export const BOX_LABEL: Record<BoxSize, string> = { regular: 'Full box', lite: 'Lite box' };
