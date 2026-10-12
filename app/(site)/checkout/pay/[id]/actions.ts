'use server';

import { refresh } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/security/ratelimit';
import { notifyPaymentReferenceSubmitted } from '@/lib/notifications/telegram';
import { isCashfreeConfigured } from '@/lib/cashfree';
import { ensurePaymentSession } from '@/lib/payments/cashfree-checkout';

export type RefState = { ok?: boolean; error?: string } | null;

export async function submitReference(_p: RefState, fd: FormData): Promise<RefState> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in again.' };
  const rl = await rateLimit('customerAction', user.id);
  if (!rl.success) return { error: 'Too many attempts. Wait a minute.' };

  const orderId = z.string().uuid().safeParse(fd.get('order_id'));
  const ref = String(fd.get('reference') ?? '').replace(/\s+/g, '');
  if (!orderId.success) return { error: 'Invalid order.' };
  if (!/^[A-Za-z0-9]{6,30}$/.test(ref)) return { error: 'Enter the UPI reference / UTR number (letters and numbers, 6–30 characters).' };

  const { error } = await supabase.rpc('submit_payment_reference', { p_order: orderId.data, p_reference: ref });
  if (error) return { error: 'Could not save the reference. Please check it and try again.' };

  // Notify on Telegram asynchronously
  notifyPaymentReferenceSubmitted(orderId.data, ref).catch((err) => {
    console.error('[PaymentRef] Telegram notify error:', err);
  });

  refresh();
  return { ok: true };
}

export type StartPaymentResult = { ok: true; sessionId: string } | { ok: false; error: string; paid?: boolean };

/** Creates (or reuses) the Cashfree payment session for the customer's order. */
export async function startCashfreePayment(orderId: string): Promise<StartPaymentResult> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Please sign in again.' };
  const rl = await rateLimit('checkout', user.id);
  if (!rl.success) return { ok: false, error: 'Too many attempts. Wait a minute and try again.' };
  const id = z.string().uuid().safeParse(orderId);
  if (!id.success) return { ok: false, error: 'Invalid order.' };
  if (!isCashfreeConfigured()) return { ok: false, error: 'Online payment is not available right now. Please WhatsApp us.' };
  return ensurePaymentSession(id.data, user.id, await requestOrigin());
}

/**
 * The domain the customer is actually on (www.brotinbox.com, a Vercel preview
 * or localhost), so Cashfree always sends them back to the same site.
 */
async function requestOrigin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  if (!host) return (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}
