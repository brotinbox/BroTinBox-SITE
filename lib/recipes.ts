import { z } from 'zod';

/**
 * Recipe workbook (migration 0038). Quantities are per ONE portion; the cook
 * book multiplies them by the day's count. Shared by the editor (client) and
 * the server action / pages.
 */

export const RECIPE_UNITS = ['g', 'kg', 'ml', 'L', 'tsp', 'tbsp', 'cup', 'pcs', 'pinch', 'to taste'] as const;
export type RecipeUnit = (typeof RECIPE_UNITS)[number];

export type Ingredient = { name: string; qty: number | null; unit: string; note?: string };
export type Recipe = {
  ingredients: Ingredient[];
  steps: string[];
  prep_minutes: number | null;
  cook_minutes: number | null;
  equipment: string | null;
  tips: string | null;
  notes: string | null;
};

export const EMPTY_RECIPE: Recipe = { ingredients: [], steps: [], prep_minutes: null, cook_minutes: null, equipment: null, tips: null, notes: null };

const text = (max: number) => z.string().trim().max(max);
const minutes = z.number().int().min(0).max(1440).nullable();

export const recipeSchema = z.object({
  ingredients: z.array(z.object({
    name: text(80).min(1),
    qty: z.number().min(0).max(100000).nullable(),
    unit: text(12),
    note: text(120).optional(),
  })).max(60),
  steps: z.array(text(600).min(1)).max(40),
  prep_minutes: minutes,
  cook_minutes: minutes,
  equipment: text(300).nullable(),
  tips: text(2000).nullable(),
  notes: text(2000).nullable(),
});

/** Database row → Recipe, tolerating old/odd JSON. */
export function toRecipe(row: Partial<Record<keyof Recipe, unknown>> | null | undefined): Recipe {
  if (!row) return { ...EMPTY_RECIPE };
  const ingredients = Array.isArray(row.ingredients)
    ? (row.ingredients as Record<string, unknown>[]).filter((i) => i && typeof i.name === 'string').map((i) => ({
        name: String(i.name),
        qty: typeof i.qty === 'number' ? i.qty : null,
        unit: typeof i.unit === 'string' ? i.unit : '',
        ...(typeof i.note === 'string' && i.note ? { note: i.note } : {}),
      }))
    : [];
  const steps = Array.isArray(row.steps) ? (row.steps as unknown[]).filter((s): s is string => typeof s === 'string') : [];
  const num = (v: unknown) => (typeof v === 'number' ? v : null);
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null);
  return {
    ingredients, steps,
    prep_minutes: num(row.prep_minutes), cook_minutes: num(row.cook_minutes),
    equipment: str(row.equipment), tips: str(row.tips), notes: str(row.notes),
  };
}

const trim = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });

/** "2.8 kg", "450 g", "3 tbsp", "to taste" for qty × portions. */
export function scaledQty(i: Ingredient, portions: number): string {
  if (i.qty === null || i.unit === 'to taste') return i.unit || '—';
  const q = i.qty * portions;
  if (i.unit === 'g' && q >= 1000) return `${trim(q / 1000)} kg`;
  if (i.unit === 'ml' && q >= 1000) return `${trim(q / 1000)} L`;
  return `${trim(q)} ${i.unit}`.trim();
}
