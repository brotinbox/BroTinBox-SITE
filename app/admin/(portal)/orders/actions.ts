'use server';

import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import { cleanText } from '@/lib/security/request';
import { fail, ok, staffAction, type ActionResult } from '@/lib/admin/actions';
import { CACHE_KEYS, invalidate } from '@/lib/cache/redis';
import { syncOrderFromCashfree } from '@/lib/payments/cashfree-checkout';

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
