'use server';

import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import { cleanText } from '@/lib/security/request';
import { fail, ok, staffAction, type ActionResult } from '@/lib/admin/actions';
import { redirect } from 'next/navigation';
import { getSupabaseService } from '@/lib/supabase/admin';
import { CACHE_KEYS, invalidate } from '@/lib/cache/redis';
import { syncOrderFromCashfree } from '@/lib/payments/cashfree-checkout';
import { adminHref } from '@/lib/admin/paths';
import { CheckoutError, quoteCart, type Cart } from '@/lib/checkout/quote';
import { createOrderFromQuote } from '@/lib/checkout/create-order';
import { notifyOrderPlaced } from '@/lib/notifications/telegram';

const idSchema = z.string().uuid();

export async function markOrderPaid(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = idSchema.safeParse(fd.get('order_id'));
  if (!id.success) return fail('Invalid order.');
  const reference = cleanText(fd.get('reference'), 60);
  const method = z.enum(['upi', 'cash', 'bank_transfer', 'card']).catch('upi').parse(fd.get('method'));
  if (reference.length < 4) return fail('Enter the UPI / transaction reference you verified.');

  return staffAction('orders.mark_paid', async () => {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.rpc('admin_mark_order_paid', { p_order: id.data, p_reference: reference, p_method: method });
    if (error) throw error;
    await invalidate(CACHE_KEYS.overview, CACHE_KEYS.revenue30, CACHE_KEYS.forecast7);
    return ok('Payment confirmed. The subscription is active and meals are scheduled.');
  });
}

export async function cancelOrder(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = idSchema.safeParse(fd.get('order_id'));
  if (!id.success) return fail('Invalid order.');
  const reason = cleanText(fd.get('reason'), 300) || 'Cancelled by staff';
  return staffAction('orders.write', async () => {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.rpc('admin_cancel_order', { p_order: id.data, p_reason: reason });
    if (error) throw error;
    await invalidate(CACHE_KEYS.overview);
    return ok('Order cancelled.');
  });
}

/** Asks Cashfree for the order's payments and records the result (safe to repeat). */
export async function recheckCashfree(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = idSchema.safeParse(fd.get('order_id'));
  if (!id.success) return fail('Invalid order.');
  return staffAction('orders.mark_paid', async () => {
    const state = await syncOrderFromCashfree(id.data);
    if (state === 'paid') {
      await invalidate(CACHE_KEYS.overview, CACHE_KEYS.revenue30, CACHE_KEYS.forecast7);
      return ok('Cashfree confirms the payment. The order is paid and meals are scheduled.');
    }
    if (state === 'pending') return ok('Cashfree says the payment is still processing. Check again in a few minutes.');
    if (state === 'failed') return ok('Cashfree shows only failed or abandoned attempts. The order is still unpaid.');
    return ok('No payment attempt found on Cashfree for this order yet.');
  });
}

// ---------------------------------------------------------------------------
// WhatsApp / phone orders: staff enter name, address and plan; the customer
// account, address and order are created exactly as a website checkout would.
// ---------------------------------------------------------------------------

const PLAN_DAYS = { trial: 1, weekly: 6, monthly: 26 } as const;

const manualOrderSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  email: z.union([z.literal(''), z.string().trim().toLowerCase().email().max(120)]),
  flat: z.string().trim().min(1).max(120),
  street: z.string().trim().min(2).max(160),
  landmark: z.string().max(120),
  area: z.string().trim().min(2).max(80),
  pincode: z.string().regex(/^\d{6}$/),
  type: z.enum(['trial', 'weekly', 'monthly']),
  diet: z.enum(['veg', 'non_veg']),
  meals: z.enum(['lunch', 'dinner', 'both']),
  start: z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  payment: z.enum(['unpaid', 'upi', 'cash', 'bank_transfer']),
  reference: z.string().max(60),
});

/** Same person on WhatsApp = same 10-digit number; reuse their account if it exists. */
async function findOrCreateCustomer(name: string, phone: string, email: string): Promise<string> {
  const db = getSupabaseService();
  const e164 = `+91${phone}`;
  const { data: byPhone } = await db.from('profiles').select('id').in('phone', [e164, `91${phone}`, phone]).limit(1).maybeSingle();
  if (byPhone) return byPhone.id;
  if (email) {
    const { data: byEmail } = await db.from('profiles').select('id').eq('email', email).limit(1).maybeSingle();
    if (byEmail) return byEmail.id;
  }
  // With an email, a later Google sign-in using that address lands on this same account.
  const { data, error } = await db.auth.admin.createUser({
    phone: e164,
    phone_confirm: true,
    ...(email && { email, email_confirm: true }),
    user_metadata: { full_name: name, source: 'whatsapp' },
  });
  if (error || !data.user) throw new CheckoutError('Could not create the customer account. Check the number and email are not used by someone else.');
  await db.from('profiles').update({ full_name: name, phone: e164, is_onboarded: true, metadata: { source: 'whatsapp' } }).eq('id', data.user.id);
  return data.user.id;
}

/** The plan's delivery days: from the chosen start (or earliest bookable day), skipping Sundays and closures. */
async function planDates(start: string, count: number): Promise<string[]> {
  const db = getSupabaseService();
  const { data: earliest } = await db.rpc('earliest_bookable_date', {});
  let d = start && start > (earliest as string) ? start : (earliest as string);
  const { data: open } = await db.rpc('is_operating_day', { d });
  if (!open) d = (await db.rpc('next_operating_day', { after_date: d })).data as string;
  const dates = [d];
  while (dates.length < count) {
    d = (await db.rpc('next_operating_day', { after_date: d })).data as string;
    dates.push(d);
  }
  return dates;
}

export async function createManualOrder(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const v = manualOrderSchema.safeParse(Object.fromEntries(['name', 'phone', 'email', 'flat', 'street', 'landmark', 'area', 'pincode', 'type', 'diet', 'meals', 'start', 'payment', 'reference']
    .map((k) => [k, String(fd.get(k) ?? '')])));
  if (!v.success) return fail('Check the form: name, 10-digit WhatsApp number, flat, street, area, 6-digit pincode and plan are needed.');
  const f = v.data;
  const reference = cleanText(f.reference, 60) || (f.payment === 'cash' ? 'CASH' : '');
  if (f.payment !== 'unpaid' && reference.length < 4) return fail('Enter the UPI / transaction reference you verified, or choose “Not paid yet”.');

  let orderId: string | null = null;
  const result = await staffAction('orders.write', async (staff) => {
    const db = getSupabaseService();
    const { data: zone } = await db.from('delivery_zones').select('id').eq('pincode', f.pincode).eq('is_active', true).limit(1).maybeSingle();
    if (!zone) return fail(`We don't deliver to ${f.pincode} yet. Add it under Delivery zones first.`);

    try {
      const userId = await findOrCreateCustomer(cleanText(f.name, 80), f.phone, f.email);
      const { count } = await db.from('addresses').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_default', true);
      const { data: address, error: addrErr } = await db.from('addresses').insert({
        user_id: userId,
        label: 'Home',
        recipient_name: cleanText(f.name, 80),
        phone: `+91${f.phone}`,
        flat: cleanText(f.flat, 120),
        street: cleanText(f.street, 160),
        landmark: cleanText(f.landmark, 120) || null,
        area: cleanText(f.area, 80),
        pincode: f.pincode,
        city: 'Coimbatore',
        zone_id: zone.id,
        is_default: !count,
      }).select('id').single();
      if (addrErr || !address) throw addrErr ?? new Error('address');

      const dates = await planDates(f.start, PLAN_DAYS[f.type]);
      const cart: Cart = {
        type: f.type,
        mealsPerDay: f.meals === 'both' ? 2 : 1,
        slot: f.meals === 'dinner' ? 'dinner' : 'lunch',
        days: dates.map((date) => ({ date, diet: f.diet })),
        addonIds: [],
        preferences: { isEggFree: false, skipLegume: false },
        addressId: address.id,
      };
      const q = await quoteCart(cart, userId);
      // Unpaid WhatsApp orders wait a week for the customer's payment instead of the website's 48 hours.
      const order = await createOrderFromQuote(userId, cart, q, { expiresIn: '7 days' });
      await db.from('orders').update({ metadata: { source: 'whatsapp', entered_by: staff.profile.id } }).eq('id', order.id);
      orderId = order.id;
      notifyOrderPlaced(order.id).catch((err) => console.error('[Order] Telegram notify error:', err));

      if (f.payment !== 'unpaid') {
        // Staff session (not service role): the RPC checks orders.mark_paid itself.
        const supabase = await getSupabaseServer();
        const { error } = await supabase.rpc('admin_mark_order_paid', { p_order: order.id, p_reference: reference, p_method: f.payment });
        if (error) return ok(`Order ${order.order_number} created, but it could not be marked paid (${error.message}). Mark it paid from the order page.`);
        await invalidate(CACHE_KEYS.overview, CACHE_KEYS.revenue30, CACHE_KEYS.forecast7);
      }
      return ok(`Order ${order.order_number} created.`);
    } catch (e) {
      if (e instanceof CheckoutError) return fail(e.message);
      throw e;
    }
  });

  if (orderId) redirect(adminHref(`/orders/${orderId}`));
  return result;
}
