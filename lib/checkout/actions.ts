'use server';

import { markLeadOrdered } from '@/lib/leads';
import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseService } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/security/ratelimit';
import { cleanText, clientIp } from '@/lib/security/request';
import { CheckoutError, cartSchema, quoteCart, type Cart, type CheckoutErrorCode, type QuoteLine } from '@/lib/checkout/quote';
import { phoneOtpMode } from '@/lib/auth/otp-mode';
import { getMyTrialStatus, type MyTrialStatus } from '@/lib/checkout/trial';
import { createOrderFromQuote } from '@/lib/checkout/create-order';
import { notifyOrderPlaced } from '@/lib/notifications/telegram';
import { getDrinks, getSides } from '@/lib/data/catalog';
import { isCashfreeConfigured } from '@/lib/cashfree';
import type { FreeOffer } from '@/lib/checkout/offers';

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

/** Free-juice offers as the checkout shows them (no internal ids). */
export type CheckoutOffers = {
  slots: { key: string; offer: FreeOffer; day: number; dayChoice: boolean; juice: string; juiceName: string }[];
  juices: { slug: string; name: string; image: string }[];
  note?: string;
  referralOn: boolean;
  referral?: { applied: boolean; message: string };
};

export type QuoteResult =
  | { ok: true; lines: QuoteLine[]; subtotal: number; discount: number; deliveryFee: number; total: number; couponMessage?: string; couponApplied: boolean; offers: CheckoutOffers }
  | Fail;

/**
 * Price preview for the checkout screen (same maths as placeOrder). Works
 * signed out and before the address is saved: it then prices from the pincode.
 */
export async function getQuote(input: Cart): Promise<QuoteResult> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const rl = await rateLimit('quote', user?.id ?? `ip:${await clientIp()}`);
  if (!rl.success) return { ok: false, error: 'Too many requests. Wait a minute.' };
  const cart = cartSchema.safeParse(input);
  if (!cart.success) return { ok: false, error: 'Your selection is incomplete. Please go back and check it.' };
  // Signed out (or no saved address yet): pincode preview only.
  if (!user || !cart.data.addressId) {
    if (!cart.data.pincode) return { ok: false, error: 'Enter your delivery pincode to see the price.' };
  }
  if (user) {
    const me = await currentCustomer();
    if ('error' in me) return { ok: false, error: me.error! };
    const phoneFail = await trialPhoneCheck(cart.data, me.phoneVerified);
    if (phoneFail) return phoneFail;
  }
  try {
    const q = await quoteCart(user ? cart.data : { ...cart.data, addressId: undefined }, user?.id ?? null, { preview: !user || !cart.data.addressId });
    const o = q.offers;
    const offers: CheckoutOffers = {
      slots: o.slots.map(({ key, offer, day, dayChoice, juice, juiceName }) => ({ key, offer, day, dayChoice, juice, juiceName })),
      juices: o.juices, note: o.note, referralOn: o.referralOn, referral: o.referral,
    };
    return { ok: true, lines: q.lines, subtotal: q.subtotal, discount: q.discount, deliveryFee: q.deliveryFee, total: q.total, couponMessage: q.couponMessage, couponApplied: !!q.couponId, offers };
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

/** payOnline: Cashfree is switched on (Settings) and configured, so checkout can open it directly. */
export type PlaceOrderResult = { ok: true; orderId: string; orderNumber: string; total: number; payOnline: boolean } | Fail;

export async function placeOrder(input: Cart): Promise<PlaceOrderResult> {
  const me = await currentCustomer();
  if ('error' in me) return { ok: false, error: me.error! };
  const rl = await rateLimit('checkout', me.userId);
  if (!rl.success) return { ok: false, error: 'Too many attempts. Wait a minute and try again.' };
  const cart = cartSchema.safeParse(input);
  if (!cart.success) return { ok: false, error: 'Your selection is incomplete. Please go back and check it.' };
  if (!cart.data.addressId) return { ok: false, error: 'Add a delivery address.' };
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

    const { data: paySetting } = await db.from('site_settings').select('value').eq('key', 'payment').maybeSingle();
    const payOnline = (paySetting?.value as { mode?: string } | null)?.mode === 'cashfree' && (await isCashfreeConfigured());
    return { ok: true, orderId: order.id, orderNumber: order.order_number, total: Number(order.total), payOnline };
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

export type CheckoutAddon = {
  id: string; type: 'side' | 'drink'; name: string; price: number; image: string;
  calories: number; protein: number; isVeg: boolean; note: string;
};

/** Live sides & juices for the checkout (admin prices and availability). */
export async function getCheckoutAddons(): Promise<CheckoutAddon[]> {
  const [sides, drinks] = await Promise.all([getSides(), getDrinks()]);
  return [
    ...sides.map((s) => ({ id: s.id, type: 'side' as const, name: s.name, price: s.price, image: s.image, calories: s.calories, protein: s.protein, isVeg: s.isVeg, note: `${s.protein} g protein · ${s.calories} kcal` })),
    ...drinks.map((d) => ({ id: d.id, type: 'drink' as const, name: d.name, price: d.price, image: d.image, calories: d.calories, protein: d.protein, isVeg: true, note: [d.volume, `${d.calories} kcal`, 'no added sugar'].filter(Boolean).join(' · ') })),
  ];
}
