/**
 * Revenue & profit maths, shared by the server page and the client charts.
 * The numbers come from finance.daily() (migration 0049); everything here is
 * plain arithmetic on those rows.
 *
 * Revenue
 *   earned  value of meals served that day (a plan's price spread over its meals)
 *   cash    money that came in that day
 *   both minus refunds, plus other income typed in by hand
 * Cost, two ways
 *   estimate  recipe cost of boxes cooked + packaging + add-ons
 *   bills     what was actually bought (procurement bills)
 *   both plus running costs (overheads), Cashfree fees and trainer commission
 */

export type DayRow = {
  day: string;
  cash_revenue: number;
  earned_revenue: number;
  refunds: number;
  other_income: number;
  meals_served: number;
  meals_failed: number;
  food_cost: number;
  packaging_cost: number;
  addon_cost: number;
  gateway_fees: number;
  commissions: number;
  procurement: number;
  overheads: number;
};

export type Basis = 'earned' | 'cash';
export type CostMode = 'estimate' | 'bills';

export const ENTRY_CATEGORIES = [
  { value: 'vegetables', label: 'Vegetables & fruit', group: 'procurement' },
  { value: 'meat_eggs', label: 'Chicken, meat & eggs', group: 'procurement' },
  { value: 'dairy', label: 'Milk, curd & paneer', group: 'procurement' },
  { value: 'grocery', label: 'Grocery (oats, dal, oil, spices)', group: 'procurement' },
  { value: 'packaging', label: 'Boxes & packaging', group: 'procurement' },
  { value: 'gas', label: 'Gas cylinder', group: 'procurement' },
  { value: 'fuel', label: 'Petrol (delivery)', group: 'overhead' },
  { value: 'marketing', label: 'Ads & printing', group: 'overhead' },
  { value: 'rent_utilities', label: 'Rent, power & internet', group: 'overhead' },
  { value: 'equipment', label: 'Kitchen equipment', group: 'overhead' },
  { value: 'staff', label: 'Paid helper / staff', group: 'overhead' },
  { value: 'fees', label: 'Licences & bank fees', group: 'overhead' },
  { value: 'other', label: 'Other cost', group: 'overhead' },
  { value: 'refund', label: 'Refund to a customer (outside Cashfree)', group: 'refund' },
  { value: 'other_income', label: 'Money received outside the website', group: 'income' },
] as const;

export type EntryCategory = (typeof ENTRY_CATEGORIES)[number]['value'];
export type EntryGroup = (typeof ENTRY_CATEGORIES)[number]['group'];

export const categoryLabel = (c: string) => ENTRY_CATEGORIES.find((x) => x.value === c)?.label ?? c;
export const categoryGroup = (c: string): EntryGroup | 'overhead' => ENTRY_CATEGORIES.find((x) => x.value === c)?.group ?? 'overhead';

export const GROUP_LABEL: Record<EntryGroup, string> = {
  procurement: 'Food bought',
  overhead: 'Running cost',
  refund: 'Refund',
  income: 'Income',
};

/** finance.daily returns numerics as strings; make every field a number. */
export function normaliseRows(rows: Record<string, unknown>[]): DayRow[] {
  return rows.map((r) => {
    const out: Record<string, unknown> = { day: String(r.day) };
    for (const [k, v] of Object.entries(r)) if (k !== 'day') out[k] = Number(v ?? 0);
    return out as DayRow;
  });
}

export const dayRevenue = (r: DayRow, basis: Basis) =>
  (basis === 'cash' ? r.cash_revenue : r.earned_revenue) - r.refunds + r.other_income;

/** Recipe estimate of what was cooked: food + gas, packaging, add-ons. */
export const dayStandardCost = (r: DayRow) => r.food_cost + r.packaging_cost + r.addon_cost;

const dayFixed = (r: DayRow) => r.overheads + r.gateway_fees + r.commissions;

export const dayCost = (r: DayRow, mode: CostMode) =>
  (mode === 'bills' ? r.procurement : dayStandardCost(r)) + dayFixed(r);

export type Totals = {
  days: number;
  revenue: number;
  cash: number;
  earned: number;
  refunds: number;
  otherIncome: number;
  meals: number;
  failed: number;
  food: number;
  packaging: number;
  addons: number;
  standardCost: number;
  procurement: number;
  overheads: number;
  fees: number;
  commissions: number;
  costEstimate: number;
  costBills: number;
  profitEstimate: number;
  profitBills: number;
  /** procurement bills − recipe estimate (positive = spent more than the recipes say) */
  variance: number;
  foodCostPct: number | null;
  revenuePerMeal: number | null;
  costPerMeal: number | null;
  /** meals a day needed to cover running costs, fees and commission */
  breakEvenMealsPerDay: number | null;
};

const sum = (rows: DayRow[], f: (r: DayRow) => number) => rows.reduce((s, r) => s + f(r), 0);
const round2 = (n: number) => Math.round(n * 100) / 100;

export function totals(rows: DayRow[], basis: Basis): Totals {
  const revenue = sum(rows, (r) => dayRevenue(r, basis));
  const earned = sum(rows, (r) => r.earned_revenue);
  const meals = sum(rows, (r) => r.meals_served);
  const failed = sum(rows, (r) => r.meals_failed);
  const food = sum(rows, (r) => r.food_cost);
  const packaging = sum(rows, (r) => r.packaging_cost);
  const addons = sum(rows, (r) => r.addon_cost);
  const standardCost = food + packaging + addons;
  const procurement = sum(rows, (r) => r.procurement);
  const overheads = sum(rows, (r) => r.overheads);
  const fees = sum(rows, (r) => r.gateway_fees);
  const commissions = sum(rows, (r) => r.commissions);
  const fixed = overheads + fees + commissions;
  const costEstimate = standardCost + fixed;
  const costBills = procurement + fixed;

  const boxes = meals + failed;
  const revenuePerMeal = meals > 0 ? earned / meals : null;
  const costPerMeal = boxes > 0 ? standardCost / boxes : null;
  const margin = revenuePerMeal != null && costPerMeal != null ? revenuePerMeal - costPerMeal : null;
  const days = Math.max(1, rows.length);

  return {
    days: rows.length,
    revenue: round2(revenue),
    cash: round2(sum(rows, (r) => r.cash_revenue)),
    earned: round2(earned),
    refunds: round2(sum(rows, (r) => r.refunds)),
    otherIncome: round2(sum(rows, (r) => r.other_income)),
    meals,
    failed,
    food: round2(food),
    packaging: round2(packaging),
    addons: round2(addons),
    standardCost: round2(standardCost),
    procurement: round2(procurement),
    overheads: round2(overheads),
    fees: round2(fees),
    commissions: round2(commissions),
    costEstimate: round2(costEstimate),
    costBills: round2(costBills),
    profitEstimate: round2(revenue - costEstimate),
    profitBills: round2(revenue - costBills),
    variance: round2(procurement - standardCost),
    foodCostPct: revenue > 0 ? (standardCost / revenue) * 100 : null,
    revenuePerMeal: revenuePerMeal != null ? round2(revenuePerMeal) : null,
    costPerMeal: costPerMeal != null ? round2(costPerMeal) : null,
    breakEvenMealsPerDay: margin != null && margin > 0 ? Math.ceil(fixed / days / margin) : null,
  };
}

/** Change vs the previous period, as a percentage (null when there is nothing to compare). */
export const pctChange = (now: number, before: number) =>
  before === 0 ? null : ((now - before) / Math.abs(before)) * 100;

export type ChartPoint = { label: string; from: string; revenue: number; cost: number; profit: number };

/** Daily points, or weekly (Mon–Sun) when the range is longer than 62 days. */
export function chartPoints(rows: DayRow[], basis: Basis, mode: CostMode): ChartPoint[] {
  const fmt = (d: string) => new Date(`${d}T00:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
  const point = (label: string, from: string, rs: DayRow[]): ChartPoint => {
    const revenue = round2(sum(rs, (r) => dayRevenue(r, basis)));
    const cost = round2(sum(rs, (r) => dayCost(r, mode)));
    return { label, from, revenue, cost, profit: round2(revenue - cost) };
  };
  if (rows.length <= 62) return rows.map((r) => point(fmt(r.day), r.day, [r]));
  const weeks = new Map<string, DayRow[]>();
  for (const r of rows) {
    const d = new Date(`${r.day}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const k = d.toISOString().slice(0, 10);
    weeks.set(k, [...(weeks.get(k) ?? []), r]);
  }
  return [...weeks.entries()].map(([k, rs]) => point(`Wk ${fmt(k)}`, k, rs));
}
