/**
 * Kitchen stock units (migration 0053). Every stock quantity is stored in the
 * ingredient's base unit: g, ml or pcs. Recipes use friendlier units, turned
 * into the base unit here. Shared by client forms and the server.
 */

export type BaseUnit = 'g' | 'ml' | 'pcs';
export type StockKind = 'fresh' | 'pantry';

export const STOCK_CATEGORIES = [
  { value: 'vegetables', label: 'Vegetables & herbs' },
  { value: 'meat_eggs', label: 'Meat & eggs' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'grocery', label: 'Grocery & masala' },
  { value: 'packaging', label: 'Packaging' },
] as const;
export type StockCategory = (typeof STOCK_CATEGORIES)[number]['value'];
export const categoryName = (c: string) => STOCK_CATEGORIES.find((x) => x.value === c)?.label ?? c;

/** Bill lines that are not stock (gas, boxes…) go straight to these finance categories. */
export const EXTRA_CATEGORIES = [
  { value: 'packaging', label: 'Packaging' },
  { value: 'gas', label: 'Gas' },
  { value: 'grocery', label: 'Grocery (not tracked)' },
  { value: 'vegetables', label: 'Vegetables (not tracked)' },
  { value: 'dairy', label: 'Dairy (not tracked)' },
  { value: 'meat_eggs', label: 'Meat & eggs (not tracked)' },
] as const;

/** Units a person types a quantity in, per base unit (first = default). */
export const INPUT_UNITS: Record<BaseUnit, { unit: string; factor: number }[]> = {
  g: [{ unit: 'kg', factor: 1000 }, { unit: 'g', factor: 1 }],
  ml: [{ unit: 'L', factor: 1000 }, { unit: 'ml', factor: 1 }],
  pcs: [{ unit: 'pcs', factor: 1 }],
};

export function inputToBase(qty: number, unit: string, base: BaseUnit): number | null {
  const u = INPUT_UNITS[base].find((x) => x.unit === unit);
  return u && Number.isFinite(qty) ? qty * u.factor : null;
}

type Dim = 'mass' | 'volume' | 'count';
// Spoon and cup measures are taken as ml, and 1 ml as 1 g: close enough for
// buying. Recipes weighed in grams are exact.
const RECIPE_UNIT: Record<string, { dim: Dim; f: number }> = {
  g: { dim: 'mass', f: 1 },
  kg: { dim: 'mass', f: 1000 },
  ml: { dim: 'volume', f: 1 },
  L: { dim: 'volume', f: 1000 },
  tsp: { dim: 'volume', f: 5 },
  tbsp: { dim: 'volume', f: 15 },
  cup: { dim: 'volume', f: 240 },
  pinch: { dim: 'mass', f: 0.15 },
  pcs: { dim: 'count', f: 1 },
};
const BASE_DIM: Record<BaseUnit, Dim> = { g: 'mass', ml: 'volume', pcs: 'count' };

/**
 * Recipe quantity → ingredient base unit. null qty ("to taste") → 0.
 * Returns null when the units can't be compared (pcs vs g).
 */
export function recipeToBase(qty: number | null, unit: string, base: BaseUnit): number | null {
  if (qty === null || unit === 'to taste') return 0;
  const u = RECIPE_UNIT[unit];
  if (!u) return null;
  const want = BASE_DIM[base];
  if (u.dim === want || (u.dim !== 'count' && want !== 'count')) return qty * u.f;
  return null;
}

const num = (n: number, max = 2) => (Math.round(n * 10 ** max) / 10 ** max).toLocaleString('en-IN', { maximumFractionDigits: max });

/** 2400 g → "2.4 kg", 60 g → "60 g", 1500 ml → "1.5 L", 6 pcs → "6 pcs". */
export function fmtQty(qty: number, base: BaseUnit): string {
  const neg = qty < 0 ? '−' : '';
  const q = Math.abs(qty);
  if (base === 'pcs') return `${neg}${num(q, 1)} pcs`;
  const big = base === 'g' ? 'kg' : 'L';
  if (q >= 1000) return `${neg}${num(q / 1000, 2)} ${big}`;
  return `${neg}${num(q, q < 10 ? 1 : 0)} ${base}`;
}

/** Shop-friendly amount: up to 10 g / 50 g / 100 g steps, whole pieces. */
export function roundUpToBuy(qty: number, base: BaseUnit): number {
  if (qty <= 0) return 0;
  if (base === 'pcs') return Math.ceil(qty);
  const step = qty < 100 ? 10 : qty < 1000 ? 50 : 100;
  return Math.ceil(qty / step) * step;
}

/** Price per base unit → "₹240/kg", "₹6/pc". */
export function fmtPrice(perUnit: number | null, base: BaseUnit): string {
  if (perUnit === null || perUnit === undefined) return '—';
  if (base === 'pcs') return `₹${num(perUnit, 2)}/pc`;
  return `₹${num(perUnit * 1000, 0)}/${base === 'g' ? 'kg' : 'L'}`;
}

/** Recipe name → alias key (same rule as the SQL seed). */
export const nameKey = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
