import 'server-only';
import { getSupabaseService } from '@/lib/supabase/admin';
import type { Cart, Quote } from '@/lib/checkout/quote';

export type CreatedOrder = { id: string; order_number: string; total: number };

/**
 * Writes subscription + order + items for an already-priced cart. Shared by
 * the website checkout and staff-entered (WhatsApp) orders so both produce
 * identical rows.
 */
export async function createOrderFromQuote(userId: string, cart: Cart, q: Quote, opts: { expiresIn?: string } = {}): Promise<CreatedOrder> {
  const db = getSupabaseService();
  const prefs = cart.preferences;
  const { data, error } = await db.rpc('create_checkout_order', {
    p_user: userId,
    p_plan: q.planId as string,
    p_type: cart.type,
    p_diet: q.primaryDiet,
    p_slots: q.slots,
    p_excluded: [],
    p_start: q.schedule[0].date,
    p_address: cart.addressId,
    p_preferences: {
      schedule: q.schedule,
      is_egg_free: prefs.isEggFree,
      skip_legume: prefs.skipLegume,
      diet_variation: prefs.dietVariation ?? null,
      addon_ids: q.addonIds,
    },
    p_meals_total: q.mealsTotal,
    p_subtotal: q.subtotal,
    p_discount: q.discount,
    p_fee: q.deliveryFee,
    p_total: q.total,
    p_coupon: q.couponId as string,
    p_pricing: { lines: q.lines, schedule: q.schedule, quoted_at: new Date().toISOString() },
    p_items: q.lines,
    ...(opts.expiresIn && { p_expires_in: opts.expiresIn }),
  });
  if (error || !data) throw error ?? new Error('no order');
  return data as unknown as CreatedOrder;
}
