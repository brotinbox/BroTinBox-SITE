import 'server-only';
import { z } from 'zod';
import { getSupabaseService } from '@/lib/supabase/admin';
import sidesData from '@/data/sides.json';

/**
 * Server-side pricing. The browser sends WHAT the customer chose; the server
 * decides HOW MUCH it costs from the database (pricing_rules, addons, zones,
 * coupons). Client-side totals are display-only and never trusted.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const cartSchema = z.object({
  type: z.enum(['trial', 'weekly', 'monthly']),
  mealsPerDay: z.union([z.literal(1), z.literal(2)]),
  slot: z.enum(['lunch', 'dinner']).default('lunch'),            // used when mealsPerDay = 1
  days: z.array(z.object({ date: isoDate, diet: z.enum(['veg', 'non_veg']) })).min(1).max(26),
  addonIds: z.array(z.string().max(80)).max(10).default([]),      // applied to every day
  preferences: z.object({ isEggFree: z.boolean().default(false), skipLegume: z.boolean().default(false), dietVariation: z.string().max(20).optional() }).default({}),
  addressId: z.string().uuid(),
  couponCode: z.string().trim().toUpperCase().max(30).optional(),
});
export type Cart = z.infer<typeof cartSchema>;

export type QuoteLine = { item_type: 'meal' | 'addon' | 'fee' | 'discount'; ref_id: string | null; name: string; qty: number; unit_price: number; total: number };
export type Quote = {
  lines: QuoteLine[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  mealsTotal: number;
  couponId: string | null;
  couponMessage?: string;
  planId: string | null;
  primaryDiet: 'veg' | 'non_veg';
  slots: ('lunch' | 'dinner')[];
  schedule: { date: string; diet: 'veg' | 'non_veg' }[];
  addonIds: string[];
};

export class CheckoutError extends Error {}

const SIDE_ID_TO_SLUG = new Map((sidesData as { id: string; slug: string }[]).map((s) => [s.id, s.slug]));
const round2 = (n: number) => Math.round(n * 100) / 100;

export async function quoteCart(cart: Cart, userId: string): Promise<Quote> {
  const db = getSupabaseService();

  // Ordering switch
  const { data: openSetting } = await db.from('site_settings').select('value').eq('key', 'ordering_open').maybeSingle();
  if (openSetting && openSetting.value === false) throw new CheckoutError('We are not taking new orders right now. Please check back soon.');

  // Address belongs to the customer and is in a delivery zone
  const { data: address } = await db.from('addresses').select('id, user_id, zone_id, pincode').eq('id', cart.addressId).maybeSingle();
  if (!address || address.user_id !== userId) throw new CheckoutError('Choose a delivery address.');
  const { data: zone } = await db.from('delivery_zones').select('id, delivery_fee, is_active')
    .eq(address.zone_id ? 'id' : 'pincode', address.zone_id ?? address.pincode).eq('is_active', true).limit(1).maybeSingle();
  if (!zone) throw new CheckoutError(`We don't deliver to ${address.pincode} yet.`);

  // Dates: unique, operating days, not before the cutoff, not too far ahead
  const dates = [...new Map(cart.days.map((d) => [d.date, d])).values()].sort((a, b) => a.date.localeCompare(b.date));
  const expected = cart.type === 'trial' ? 1 : null;
  if (expected && dates.length !== expected) throw new CheckoutError('A trial is for one day.');
  const { data: earliest } = await db.rpc('earliest_bookable_date', {});
  const maxDate = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10);
  for (const d of dates) {
    if (earliest && d.date < (earliest as string)) throw new CheckoutError(`The earliest day you can book is ${earliest}. Please pick again.`);
    if (d.date > maxDate) throw new CheckoutError('Pick dates within the next 60 days.');
    const { data: open } = await db.rpc('is_operating_day', { d: d.date });
    if (!open) throw new CheckoutError(`The kitchen is closed on ${d.date}. Please pick another day.`);
  }

  // Prices per diet for this plan type
  const { data: rules } = await db.from('pricing_rules').select('diet, price_per_meal, second_meal_discount, effective_from')
    .eq('plan_type', cart.type).lte('effective_from', new Date().toISOString()).order('effective_from', { ascending: false });
  const price = (diet: 'veg' | 'non_veg') => {
    const r = (rules ?? []).find((x) => x.diet === diet);
    if (!r) throw new CheckoutError('Prices are being updated. Please try again shortly.');
    return { meal: Number(r.price_per_meal), second: Number(r.second_meal_discount) };
  };

  const lines: QuoteLine[] = [];
  for (const diet of ['non_veg', 'veg'] as const) {
    const n = dates.filter((d) => d.diet === diet).length;
    if (!n) continue;
    const p = price(diet);
    const label = diet === 'veg' ? 'Veg box' : 'Non-veg box';
    lines.push({ item_type: 'meal', ref_id: null, name: `${label} (${cart.type})`, qty: n, unit_price: p.meal, total: round2(p.meal * n) });
    if (cart.mealsPerDay === 2) {
      lines.push({ item_type: 'meal', ref_id: null, name: `${label}, 2nd meal of the day`, qty: n, unit_price: p.meal - p.second, total: round2((p.meal - p.second) * n) });
    }
  }

  // Add-ons: accept DB slugs or legacy front-end ids; applied to every day
  const slugs = cart.addonIds.map((id) => SIDE_ID_TO_SLUG.get(id) ?? id);
  const addonIds: string[] = [];
  if (slugs.length) {
    const { data: addons } = await db.from('addons').select('id, slug, name, price').in('slug', slugs).eq('is_active', true);
    for (const a of addons ?? []) {
      addonIds.push(a.id);
      lines.push({ item_type: 'addon', ref_id: a.id, name: a.name, qty: dates.length, unit_price: Number(a.price), total: round2(Number(a.price) * dates.length) });
    }
  }

  const subtotal = round2(lines.reduce((s, l) => s + l.total, 0));
  const deliveryFee = Number(zone.delivery_fee ?? 0);

  // Coupon
  let discount = 0;
  let couponId: string | null = null;
  let couponMessage: string | undefined;
  if (cart.couponCode) {
    const { data: c } = await db.from('coupons').select('*').eq('code', cart.couponCode).eq('is_active', true).maybeSingle();
    const now = new Date();
    if (!c || new Date(c.valid_from) > now || (c.valid_to && new Date(c.valid_to) < now)) couponMessage = 'That coupon is not valid.';
    else if (c.plan_types && !c.plan_types.includes(cart.type)) couponMessage = `That coupon doesn't apply to ${cart.type} plans.`;
    else if (subtotal < Number(c.min_order)) couponMessage = `Minimum order for ${c.code} is ₹${Number(c.min_order)}.`;
    else {
      const [{ count: used }, { count: usedByMe }, { count: paidOrders }] = await Promise.all([
        db.from('coupon_redemptions').select('id', { count: 'exact', head: true }).eq('coupon_id', c.id),
        db.from('coupon_redemptions').select('id', { count: 'exact', head: true }).eq('coupon_id', c.id).eq('user_id', userId),
        db.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'paid'),
      ]);
      if (c.usage_limit && (used ?? 0) >= c.usage_limit) couponMessage = 'That coupon has been fully used.';
      else if ((usedByMe ?? 0) >= c.per_user_limit) couponMessage = 'You have already used that coupon.';
      else if (c.first_order_only && (paidOrders ?? 0) > 0) couponMessage = 'That coupon is for first orders only.';
      else {
        discount = c.discount_type === 'flat' ? Number(c.value) : (subtotal * Number(c.value)) / 100;
        if (c.max_discount) discount = Math.min(discount, Number(c.max_discount));
        discount = round2(Math.min(discount, subtotal));
        couponId = c.id;
        couponMessage = `${c.code} applied.`;
        lines.push({ item_type: 'discount', ref_id: c.id, name: `Coupon ${c.code}`, qty: 1, unit_price: -discount, total: -discount });
      }
    }
  }
  if (deliveryFee > 0) lines.push({ item_type: 'fee', ref_id: zone.id, name: 'Delivery fee', qty: 1, unit_price: deliveryFee, total: deliveryFee });

  const { data: plan } = await db.from('plans').select('id').eq('type', cart.type).eq('meals_per_day', cart.mealsPerDay).eq('is_active', true).order('sort_order').limit(1).maybeSingle();
  const nonVegDays = dates.filter((d) => d.diet === 'non_veg').length;

  return {
    lines,
    subtotal,
    discount,
    deliveryFee,
    total: round2(subtotal - discount + deliveryFee),
    mealsTotal: dates.length * cart.mealsPerDay,
    couponId,
    couponMessage,
    planId: plan?.id ?? null,
    primaryDiet: nonVegDays >= dates.length - nonVegDays ? 'non_veg' : 'veg',
    slots: cart.mealsPerDay === 2 ? ['lunch', 'dinner'] : [cart.slot],
    schedule: dates,
    addonIds,
  };
}
