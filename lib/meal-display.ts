import { BRAND } from '@/config/brand';

/** Delivery window per slot ('lunch' = midday run). Times live in config/brand.ts. */
export const SLOT_TIME = {
  lunch: BRAND.deliverySlots.lunch.replace(' - ', ' – '),
  dinner: BRAND.deliverySlots.dinner.replace(' - ', ' – '),
} as const;

/** Macro grams with at most one decimal (sums of floats can give 122.69999…). */
export const g1 = (n: number) => Math.round(n * 10) / 10;
