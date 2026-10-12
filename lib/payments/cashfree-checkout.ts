import 'server-only';
import { getSupabaseService } from '@/lib/supabase/admin';
import { CashfreeError, createOrder, getOrder, getOrderPayments, type CfOrder, type CfPayment } from '@/lib/cashfree';
import { notifyOrderPaid } from '@/lib/notifications/telegram';
import type { Database, Json } from '@/types/database';

type PaymentStatus = Database['public']['Enums']['payment_status'];
type OrderStatus = Database['public']['Enums']['order_status'];

const UNPAID: OrderStatus[] = ['created', 'pending_payment'];
// Cashfree needs an expiry at least ~15 minutes ahead.
const MIN_EXPIRY_MS = 16 * 60 * 1000;

export type SessionResult =
  | { ok: true; sessionId: string }
  | { ok: false; error: string; paid?: boolean };

/**
 * Returns a Cashfree payment session for one of the customer's unpaid orders.
 * Reuses the existing Cashfree order while it is still ACTIVE, so retries and
 * double clicks never create duplicates. Amounts always come from our DB.
 */
export async function ensurePaymentSession(orderId: string, userId: string, origin: string): Promise<SessionResult> {
  const db = getSupabaseService();
  const { data: o } = await db
    .from('orders')
    .select('id, order_number, user_id, status, total, expires_at, address_snapshot, cf_order_id, profiles!orders_user_id_fkey(email, full_name, phone)')
    .eq('id', orderId)
    .maybeSingle();
  if (!o || o.user_id !== userId) return { ok: false, error: 'Order not found.' };
  if (o.status === 'paid') return { ok: false, error: 'This order is already paid.', paid: true };
  if (!UNPAID.includes(o.status)) return { ok: false, error: `This order is ${o.status.replace('_', ' ')}. Please place a new order.` };

  // 1. Existing Cashfree order still payable → reuse it.
  if (o.cf_order_id) {
    const existing = await getOrder(o.cf_order_id).catch(() => null);
    if (existing?.order_status === 'ACTIVE') return saveSession(o.id, existing);
    if (existing?.order_status === 'PAID') {
      const state = await syncOrderFromCashfree(o.id);
      return state === 'paid'
        ? { ok: false, error: 'This order is already paid.', paid: true }
        : { ok: false, error: 'Your payment is being confirmed. Refresh in a minute.' };
    }
  }

  // 2. Create one. The first attempt uses the order number; a re-attempt after
  //    an expired Cashfree order gets a suffix (Cashfree ids are single-use).
  if (new Date(o.expires_at).getTime() - Date.now() < MIN_EXPIRY_MS) {
    return { ok: false, error: 'This order is about to expire. Please place it again.' };
  }
  const profile = (o as unknown as { profiles: { email: string | null; full_name: string | null; phone: string | null } | null }).profiles;
  const addr = (o.address_snapshot ?? {}) as { phone?: string; recipient_name?: string };
  const phone = (addr.phone || profile?.phone || '').replace(/\D/g, '').slice(-10);
  if (!/^[6-9]\d{9}$/.test(phone)) return { ok: false, error: 'Add a valid 10-digit mobile number to your delivery address first.' };

  const site = origin.replace(/\/+$/, '');
  const cfId = o.cf_order_id ? `${o.order_number}-${Date.now().toString(36)}` : o.order_number;
  let cf: CfOrder;
  try {
    cf = await createOrder({
      orderId: cfId,
      amount: Number(o.total),
      expiresAt: new Date(o.expires_at).toISOString(),
      customer: { id: userId.replace(/-/g, ''), phone, email: profile?.email, name: addr.recipient_name || profile?.full_name },
      returnUrl: `${site}/checkout/pay/${o.id}?cf=1`,
      // Cashfree only calls https endpoints; locally the return page confirms instead.
      notifyUrl: site.startsWith('https://') ? `${site}/api/webhooks/cashfree` : undefined,
      note: `BroTin Box ${o.order_number}`,
    });
  } catch (e) {
    // Created on a previous click but our DB write didn't land → fetch it.
    if (e instanceof CashfreeError && e.code === 'order_already_exists') {
      cf = await getOrder(cfId);
      if (cf.order_status !== 'ACTIVE') return { ok: false, error: 'Please refresh the page and try again.' };
    } else {
      console.error('[Cashfree] create order failed', e);
      return { ok: false, error: 'Could not start the payment. Please try again in a moment.' };
    }
  }
  return saveSession(o.id, cf);
}

async function saveSession(orderId: string, cf: CfOrder): Promise<SessionResult> {
  const { error } = await getSupabaseService()
    .from('orders')
    .update({ cf_order_id: cf.order_id, cf_payment_session_id: cf.payment_session_id, status: 'pending_payment' })
    .eq('id', orderId)
    .in('status', UNPAID);
  if (error) {
    console.error('[Cashfree] save session failed', error);
    return { ok: false, error: 'Could not start the payment. Please try again.' };
  }
  return { ok: true, sessionId: cf.payment_session_id };
}

export type SyncState = 'paid' | 'pending' | 'failed' | 'none';

const ATTEMPT_STATUS: Partial<Record<CfPayment['payment_status'], PaymentStatus>> = {
  FAILED: 'failed',
  USER_DROPPED: 'user_dropped',
  CANCELLED: 'cancelled',
  VOID: 'cancelled',
};

/**
 * Asks Cashfree for the truth about an order and records it. Used by the
 * return page, the webhook and the staff "Re-check" button; safe to run any
 * number of times (mark_order_paid is idempotent).
 */
export async function syncOrderFromCashfree(orderId: string): Promise<SyncState> {
  const db = getSupabaseService();
  const { data: o } = await db.from('orders').select('id, status, cf_order_id').eq('id', orderId).maybeSingle();
  if (!o) return 'none';
  if (o.status === 'paid') return 'paid';
  if (!o.cf_order_id) return 'none';

  const payments = await getOrderPayments(o.cf_order_id);

  for (const p of payments) {
    const status = ATTEMPT_STATUS[p.payment_status];
    if (!status) continue;
    const { error } = await db.rpc('record_payment_attempt', {
      p_order: o.id,
      p_cf_payment_id: String(p.cf_payment_id),
      p_amount: Number(p.payment_amount),
      p_method: p.payment_group ?? '',
      p_status: status,
      p_reason: p.error_details?.error_description || p.payment_message || p.payment_status,
      p_raw: p as unknown as Json,
    });
    if (error) console.error('[Cashfree] record attempt failed', error);
  }

  const success = payments.find((p) => p.payment_status === 'SUCCESS');
  if (success) {
    if (success.payment_currency && success.payment_currency !== 'INR') {
      throw new Error(`Unexpected currency ${success.payment_currency} on ${o.cf_order_id}`);
    }
    const { error } = await db.rpc('mark_order_paid', {
      p_order: o.id,
      p_cf_payment_id: String(success.cf_payment_id),
      p_amount: Number(success.payment_amount),
      p_method: success.payment_group ?? 'cashfree',
      p_raw: success as unknown as Json,
    });
    if (error) throw error;
    notifyOrderPaid(o.id).catch((err) => console.error('[Cashfree] Telegram notify error:', err));
    return 'paid';
  }
  if (payments.some((p) => p.payment_status === 'PENDING')) return 'pending';
  return payments.some((p) => ATTEMPT_STATUS[p.payment_status]) ? 'failed' : 'none';
}
