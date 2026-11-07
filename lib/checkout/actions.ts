'use server';

import { markLeadOrdered } from '@/lib/leads';
import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseService } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/security/ratelimit';
import { cleanText } from '@/lib/security/request';
import { CheckoutError, cartSchema, quoteCart, type Cart, type CheckoutErrorCode, type QuoteLine } from '@/lib/checkout/quote';
import { phoneOtpMode } from '@/lib/auth/otp-mode';
import { getMyTrialStatus, type MyTrialStatus } from '@/lib/checkout/trial';
import { createOrderFromQuote } from '@/lib/checkout/create-order';
import { notifyOrderPlaced } from '@/lib/notifications/telegram';

type Fail = { ok: false; error: string; code?: CheckoutErrorCode };

/** A failure the screen can turn into the right next step (plans card, verify link). */
function checkoutFail(e: unknown, fallback: string): Fail {
  if (e instanceof CheckoutError) return { ok: false, error: e.message, ...(e.code && { code: e.code }) };
  // The database's own guard (two tabs / double click got past the first check).
  if ((e as { message?: string } | null)?.message === 'TRIAL_USED') {
    return { ok: false, error: "You've already booked your trial box.", code: 'TRIAL_USED' };
  }
  return { ok: false, error: fallback };
}

async function currentCustomer() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in to continue.' } as const;
  const { data: profile } = await supabase.from('profiles').select('id, is_blocked, phone_verified').eq('id', user.id).maybeSingle();
  if (!profile || profile.is_blocked) return { error: 'Your account cannot place orders. Contact us on WhatsApp.' } as const;
  return { userId: user.id, phoneVerified: !!profile.phone_verified } as const;
}

/** A trial needs a verified mobile number, so one person can't take several trials. */
async function trialPhoneCheck(cart: Cart, phoneVerified: boolean): Promise<Fail | null> {
  if (cart.type !== 'trial' || phoneVerified || (await phoneOtpMode()) === 'off') return null;
  return { ok: false, error: 'Please verify your mobile number to book your trial box.', code: 'VERIFY_PHONE' };
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
  const phoneFail = await trialPhoneCheck(cart.data, me.phoneVerified);
  if (phoneFail) return phoneFail;
  try {
    const q = await quoteCart(cart.data, me.userId);
    return { ok: true, lines: q.lines, subtotal: q.subtotal, discount: q.discount, deliveryFee: q.deliveryFee, total: q.total, couponMessage: q.couponMessage, couponApplied: !!q.couponId };
  } catch (e) {
    return checkoutFail(e, 'Could not price your order. Please try again.');
  }
}

/** The signed-in customer's trial status (null when signed out or unavailable). */
export async function myTrialStatus(): Promise<MyTrialStatus | null> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  try {
    return await getMyTrialStatus(user.id);
  } catch {
    return null;
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
  const phoneFail = await trialPhoneCheck(cart.data, me.phoneVerified);
  if (phoneFail) return phoneFail;

  try {
    const q = await quoteCart(cart.data, me.userId);
    const db = getSupabaseService();
    // A new coupon order replaces the customer's unpaid ones with the same
    // coupon, so per-customer / first-order limits can't be stacked.
    if (q.couponId) {
      await db.from('orders').update({ status: 'cancelled' })
        .eq('user_id', me.userId).eq('coupon_id', q.couponId).in('status', ['created', 'pending_payment']);
    }
    const order = await createOrderFromQuote(me.userId, cart.data, q);
    // Consent ticked at checkout (only ever switches it on here; turning off is in the profile or "Stop offers").
    if (cart.data.whatsappOffers) {
      await db.from('profiles').update({ whatsapp_offers_opt_in: true, whatsapp_offers_opt_in_at: new Date().toISOString() })
        .eq('id', me.userId).eq('whatsapp_offers_opt_in', false);
    }

    // Fire Telegram order notification asynchronously (best effort)
    markLeadOrdered(me.userId, order.id).catch(() => {});
    notifyOrderPlaced(order.id).catch((err) => {
      console.error('[Order] Telegram notify error:', err);
    });

    return { ok: true, orderId: order.id, orderNumber: order.order_number, total: Number(order.total) };
  } catch (e) {
    return checkoutFail(e, 'Could not place your order. Please try again.');
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
