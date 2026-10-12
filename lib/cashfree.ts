import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Cashfree Payment Gateway REST client. Server only: it holds the secret key.
 * Sandbox vs production is chosen by NEXT_PUBLIC_CASHFREE_ENV (shared with the
 * browser SDK so the two can never disagree). Keys come from the matching
 * mode of the Merchant Dashboard → Developers → API Keys.
 */

const API_VERSION = '2025-01-01';

export type CashfreeMode = 'sandbox' | 'production';

export const cashfreeMode = (): CashfreeMode =>
  process.env.NEXT_PUBLIC_CASHFREE_ENV === 'production' ? 'production' : 'sandbox';

const baseUrl = () => (cashfreeMode() === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg');

export const isCashfreeConfigured = () => !!(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY);

export class CashfreeError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
  }
}

export type CfOrderStatus = 'ACTIVE' | 'PAID' | 'EXPIRED' | 'TERMINATED' | 'TERMINATION_REQUESTED';

export type CfOrder = {
  order_id: string;              // our id (order_number), used in every API path
  cf_order_id: string;           // Cashfree's internal id
  order_status: CfOrderStatus;
  order_amount: number;
  order_currency: string;
  order_expiry_time: string;
  payment_session_id: string;
};

export type CfPaymentStatus = 'SUCCESS' | 'NOT_ATTEMPTED' | 'FAILED' | 'USER_DROPPED' | 'VOID' | 'CANCELLED' | 'PENDING';

export type CfPayment = {
  cf_payment_id: string | number;
  order_id: string;
  payment_status: CfPaymentStatus;
  payment_amount: number;
  payment_currency: string;
  payment_group?: string | null;   // upi, credit_card, debit_card, net_banking, wallet…
  payment_message?: string | null;
  bank_reference?: string | null;
  payment_time?: string | null;
  error_details?: { error_description?: string | null; error_reason?: string | null } | null;
};

async function request<T>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<T> {
  const appId = process.env.CASHFREE_APP_ID;
  const secret = process.env.CASHFREE_SECRET_KEY;
  if (!appId || !secret) throw new CashfreeError('Cashfree keys are not set', 500, 'not_configured');

  const res = await fetch(`${baseUrl()}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      'x-api-version': API_VERSION,
      'x-client-id': appId,
      'x-client-secret': secret,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data as { message?: string; code?: string };
    if (res.status === 401) console.error('[Cashfree] 401: check CASHFREE_APP_ID / CASHFREE_SECRET_KEY match NEXT_PUBLIC_CASHFREE_ENV');
    throw new CashfreeError(err.message || `Cashfree request failed (${res.status})`, res.status, err.code);
  }
  return data as T;
}

export function createOrder(input: {
  orderId: string;
  amount: number;
  expiresAt: string;
  customer: { id: string; phone: string; email?: string | null; name?: string | null };
  returnUrl: string;
  notifyUrl?: string;
  note?: string;
}) {
  return request<CfOrder>('/orders', {
    method: 'POST',
    body: {
      order_id: input.orderId,
      order_amount: input.amount,
      order_currency: 'INR',
      order_expiry_time: input.expiresAt,
      customer_details: {
        customer_id: input.customer.id,
        customer_phone: input.customer.phone,
        ...(input.customer.email && { customer_email: input.customer.email }),
        ...(input.customer.name && { customer_name: input.customer.name }),
      },
      order_meta: {
        return_url: input.returnUrl,
        ...(input.notifyUrl && { notify_url: input.notifyUrl }),
      },
      ...(input.note && { order_note: input.note }),
    },
  });
}

export const getOrder = (orderId: string) => request<CfOrder>(`/orders/${encodeURIComponent(orderId)}`);

export const getOrderPayments = (orderId: string) =>
  request<CfPayment[]>(`/orders/${encodeURIComponent(orderId)}/payments`);

/**
 * Webhook signature: base64(HMAC-SHA256(timestamp + rawBody, secret key)).
 * Must be computed on the body exactly as received, before JSON parsing.
 */
export function verifyWebhookSignature(rawBody: string, timestamp: string | null, signature: string | null): boolean {
  const secret = process.env.CASHFREE_SECRET_KEY;
  if (!secret || !timestamp || !signature) return false;
  const expected = Buffer.from(createHmac('sha256', secret).update(timestamp + rawBody).digest('base64'));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
