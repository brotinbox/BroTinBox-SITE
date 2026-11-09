import { MONTHLY_MIN_DAYS, MONTHLY_PLAN_DAYS, type PRICING } from '@/lib/menu-engine';

/**
 * ONE place that turns the price table into rupees. Every page that shows a
 * plan price, total, per-meal rate or "you save" figure must go through here,
 * so the numbers on screen always agree with each other and with what the
 * server charges (lib/checkout/quote.ts uses the same formulas).
 *
 * Inputs always come from the database price table (usePricing() on the
 * client, getPricingMatrix() on the server) — never hardcode a rupee amount.
 *
 * The rules, in plain words:
 *   - Price table: one price per meal for each plan type (trial / weekly /
 *     monthly) and diet (veg / non-veg).
 *   - A day with 1 meal costs that price. With 2 meals (lunch + dinner) the
 *     second meal gets `secondMealDiscount` off.
 *   - Plan total = sum of the day prices of the days kept in the plan.
 *   - Weekly plan = 6 delivery days (Mon–Sat). Monthly plan = 26 delivery days.
 *     Skipping is allowed down to the minimums below and the bill drops with
 *     each skipped day.
 *   - "Savings" are always measured against the regular one-off trial price,
 *     never the opening-offer price (otherwise a plan would look dearer than
 *     the trial).
 */

export type PricingMatrix = typeof PRICING;
export type PlanKind = 'trial' | 'weekly' | 'monthly';
export type PricedDiet = 'veg' | 'non-veg';
export type MealsPerDay = 1 | 2;
export type RegularTrial = PricingMatrix['trial'];
export type BoxSize = 'regular' | 'lite';

/**
 * The price table for one box size. Lite has its own prices (and its own
 * trial price, used for "you save" on Lite plans); every helper below works
 * the same on either. Throws if Lite isn't on sale (check `p.lite` first).
 */
export function pricingFor(p: PricingMatrix, size: BoxSize): PricingMatrix {
  if (size === 'regular') return p;
  if (!p.lite) throw new Error('Lite prices are not live');
  return { ...p, trial: p.lite.trial, weekly: p.lite.weekly, monthly: p.lite.monthly, secondMealDiscount: p.lite.secondMealDiscount };
}

/** Delivery days in a full plan. */
export const PLAN_DAYS = { trial: 1, weekly: 6, monthly: MONTHLY_PLAN_DAYS } as const;
/** Fewest days a plan may keep after skips and still get the plan rate. */
export const MIN_PLAN_DAYS: Record<PlanKind, number> = { trial: 1, weekly: 3, monthly: MONTHLY_MIN_DAYS };
export const MAX_SKIPS: Record<PlanKind, number> = {
  trial: 0,
  weekly: PLAN_DAYS.weekly - MIN_PLAN_DAYS.weekly,
  monthly: PLAN_DAYS.monthly - MIN_PLAN_DAYS.monthly,
};

/** Price of one meal on a plan. */
export const mealPrice = (p: PricingMatrix, plan: PlanKind, diet: PricedDiet): number => p[plan][diet];

/** Price of the second meal of the day. */
export const secondMealPrice = (base: number, discount: number): number => base - discount;

/** Price of one delivery day (1 or 2 meals). */
export function dayPrice(p: PricingMatrix, plan: PlanKind, diet: PricedDiet, mealsPerDay: MealsPerDay): number {
  const base = mealPrice(p, plan, diet);
  return mealsPerDay === 2 ? base + secondMealPrice(base, p.secondMealDiscount) : base;
}

/** Total for a list of delivery days (each with its own diet, e.g. mixed veg / non-veg weeks). */
export function planTotal(p: PricingMatrix, plan: PlanKind, days: { diet: PricedDiet }[], mealsPerDay: MealsPerDay): number {
  return days.reduce((sum, d) => sum + dayPrice(p, plan, d.diet, mealsPerDay), 0);
}

/** Total for a full, unskipped plan in a single diet. */
export function fullPlanTotal(p: PricingMatrix, plan: Exclude<PlanKind, 'trial'>, diet: PricedDiet, mealsPerDay: MealsPerDay): number {
  return dayPrice(p, plan, diet, mealsPerDay) * PLAN_DAYS[plan];
}

/** Average price per meal on a plan (a 2-meal day averages out the discount). */
export function perMealAverage(p: PricingMatrix, plan: PlanKind, diet: PricedDiet, mealsPerDay: MealsPerDay): number {
  return dayPrice(p, plan, diet, mealsPerDay) / mealsPerDay;
}

/** What the same days would cost as separate one-off trial boxes at the regular price. */
export function trialEquivalent(p: PricingMatrix, regularTrial: RegularTrial, days: { diet: PricedDiet }[], mealsPerDay: MealsPerDay): number {
  const asTrial: PricingMatrix = { ...p, trial: regularTrial };
  return planTotal(asTrial, 'trial', days, mealsPerDay);
}

/** Rupees saved on these days vs buying each as a regular-price trial box. Never negative. */
export function savingsVsTrial(
  p: PricingMatrix, regularTrial: RegularTrial, plan: Exclude<PlanKind, 'trial'>,
  days: { diet: PricedDiet }[], mealsPerDay: MealsPerDay,
): number {
  return Math.max(0, trialEquivalent(p, regularTrial, days, mealsPerDay) - planTotal(p, plan, days, mealsPerDay));
}

/** Whole-number percent a plan's per-meal price is below the regular trial price (1 meal/day, one diet). */
export function discountPercent(p: PricingMatrix, regularTrial: RegularTrial, plan: Exclude<PlanKind, 'trial'>, diet: PricedDiet): number {
  const was = regularTrial[diet];
  return was > 0 ? Math.max(0, Math.round(((was - mealPrice(p, plan, diet)) / was) * 100)) : 0;
}

/** The smaller of the two diets' discounts: a claim that is true for every customer ("Save 10%"). */
export function guaranteedDiscountPercent(p: PricingMatrix, regularTrial: RegularTrial, plan: Exclude<PlanKind, 'trial'>): number {
  return Math.min(discountPercent(p, regularTrial, plan, 'veg'), discountPercent(p, regularTrial, plan, 'non-veg'));
}

/** Cheapest price per meal across diets: for "from ₹X" labels. */
export function fromPrice(p: PricingMatrix, plan: PlanKind): number {
  return Math.min(p[plan].veg, p[plan]['non-veg']);
}
