'use server';

import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseService } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/security/ratelimit';
import { cleanText } from '@/lib/security/request';
import { CheckoutError, cartSchema, quoteCart, type Cart, type QuoteLine } from '@/lib/checkout/quote';
import { notifyOrderPlaced } from '@/lib/notifications/telegram';

type Fail = { ok: false; error: string };

async function currentCustomer() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in to continue.' } as const;
  const { data: profile } = await supabase.from('profiles').select('id, is_blocked').eq('id', user.id).maybeSingle();
  if (!profile || profile.is_blocked) return { error: 'Your account cannot place orders. Contact us on WhatsApp.' } as const;
  return { userId: user.id } as const;
}

export type QuoteResult =
  | { ok: true; lines: QuoteLine[]; subtotal: number; discount: number; deliveryFee: number; total: number; couponMessage?: string; couponApplied: boolean }
  | Fail;

/** Price preview for the checkout screen (same maths as placeOrder). */
export async function getQuote(input: Cart): Promise<QuoteResult> {
  const me = await currentCustomer();
  if ('error' in me) return { ok: false, error: me.error! };
  const rl = await rateLimit('checkout', me.userId);
  if (!rl.success) return { ok: false, error: 'Too many requests. Wait a minute.' };
  const cart = cartSchema.safeParse(input);
  if (!cart.success) return { ok: false, error: 'Your selection is incomplete. Please go back and check it.' };
  try {
    const q = await quoteCart(cart.data, me.userId);
    return { ok: true, lines: q.lines, subtotal: q.subtotal, discount: q.discount, deliveryFee: q.deliveryFee, total: q.total, couponMessage: q.couponMessage, couponApplied: !!q.couponId };
  } catch (e) {
    return { ok: false, error: e instanceof CheckoutError ? e.message : 'Could not price your order. Please try again.' };
  }
}

export type PlaceOrderResult = { ok: true; orderId: string; orderNumber: string; total: number } | Fail;

export async function placeOrder(input: Cart): Promise<PlaceOrderResult> {
  const me = await currentCustomer();
  if ('error' in me) return { ok: false, error: me.error! };
  const rl = await rateLimit('checkout', me.userId);
  if (!rl.success) return { ok: false, error: 'Too many attempts. Wait a minute and try again.' };
  const cart = cartSchema.safeParse(input);
  if (!cart.success) return { ok: false, error: 'Your selection is incomplete. Please go back and check it.' };

  try {
    const q = await quoteCart(cart.data, me.userId);
    const prefs = cart.data.preferences;
    const { data, error } = await getSupabaseService().rpc('create_checkout_order', {
      p_user: me.userId,
      p_plan: q.planId as string,
      p_type: cart.data.type,
      p_diet: q.primaryDiet,
      p_slots: q.slots,
      p_excluded: [],
      p_start: q.schedule[0].date,
      p_address: cart.data.addressId,
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
    });
    if (error || !data) throw error ?? new Error('no order');
    const order = data as unknown as { id: string; order_number: string; total: number };

    // Fire Telegram order notification asynchronously (best effort)
    notifyOrderPlaced(order.id).catch((err) => {
      console.error('[Order] Telegram notify error:', err);
    });

    return { ok: true, orderId: order.id, orderNumber: order.order_number, total: Number(order.total) };
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, error: e.message };
    return { ok: false, error: 'Could not place your order. Please try again.' };
  }
}

/** Saves a new delivery address for the signed-in customer and returns its id. */
const addressSchema = z.object({
  recipientName: z.string().trim().min(2).max(80),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  flat: z.string().trim().min(1).max(120),
  street: z.string().trim().min(2).max(160),
  landmark: z.string().max(120).optional(),
  area: z.string().trim().min(2).max(80),
  pincode: z.string().regex(/^\d{6}$/),
  instructions: z.string().max(300).optional(),
  makeDefault: z.boolean().default(false),
});

export async function saveAddress(input: z.input<typeof addressSchema>): Promise<{ ok: true; id: string; deliverable: boolean } | Fail> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Please sign in again.' };
  const rl = await rateLimit('customerAction', user.id);
  if (!rl.success) return { ok: false, error: 'Too many attempts. Wait a minute.' };
  const v = addressSchema.safeParse(input);
  if (!v.success) return { ok: false, error: 'Check the address: name, 10-digit mobile, flat, street, area and 6-digit pincode are needed.' };

  const { data: zone } = await supabase.from('delivery_zones').select('id').eq('pincode', v.data.pincode).eq('is_active', true).limit(1).maybeSingle();
  const { count } = await supabase.from('addresses').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
  const makeDefault = v.data.makeDefault || !count;
  if (makeDefault) await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
  const { data, error } = await supabase.from('addresses').insert({
    user_id: user.id,
    label: 'Home',
    recipient_name: cleanText(v.data.recipientName, 80),
    phone: `+91${v.data.phone}`,
    flat: cleanText(v.data.flat, 120),
    street: cleanText(v.data.street, 160),
    landmark: cleanText(v.data.landmark, 120) || null,
    area: cleanText(v.data.area, 80),
    pincode: v.data.pincode,
    city: 'Coimbatore',
    instructions: cleanText(v.data.instructions, 300) || null,
    zone_id: zone?.id ?? null,
    is_default: makeDefault,
  }).select('id').single();
  if (error || !data) return { ok: false, error: 'Could not save the address.' };

  // Onboarding no longer asks for these, so fill them from the first address.
  const { data: profile } = await supabase.from('profiles').select('full_name, phone').eq('id', user.id).maybeSingle();
  if (profile && (!profile.full_name || !profile.phone)) {
    await supabase.from('profiles').update({
      ...(!profile.full_name && { full_name: cleanText(v.data.recipientName, 80) }),
      ...(!profile.phone && { phone: `+91${v.data.phone}` }),
      is_onboarded: true,
    }).eq('id', user.id);
  }
  return { ok: true, id: data.id, deliverable: !!zone };
}
