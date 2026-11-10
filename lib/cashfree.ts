import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getCashfreeSettings, type CashfreeMode } from '@/lib/settings/runtime';

/**
 * Cashfree Payment Gateway REST client. Server only: it holds the secret key.
 *
 * Test / Live is switched in admin → Settings → Payments (falls back to
 * NEXT_PUBLIC_CASHFREE_ENV). Each mode has its own keys in Vercel:
 *   Live: CASHFREE_APP_ID + CASHFREE_SECRET_KEY
 *   Test: CASHFREE_TEST_APP_ID + CASHFREE_TEST_SECRET_KEY
 * Cashfree test app ids start with "TEST", so test keys left in
 * CASHFREE_APP_ID (as in .env.local) still count as test keys and are never
 * sent to the live API.
 */

const API_VERSION = '2025-01-01';

export type { CashfreeMode };

type Keys = { appId: string; secret: string };

const isTestId = (id: string) => /^TEST/i.test(id);

export function cashfreeKeys(mode: CashfreeMode): Keys | null {
  const id = process.env.CASHFREE_APP_ID?.trim() || '';
  const secret = process.env.CASHFREE_SECRET_KEY?.trim() || '';
  if (mode === 'production') return id && secret && !isTestId(id) ? { appId: id, secret } : null;
  const tId = process.env.CASHFREE_TEST_APP_ID?.trim() || '';
  const tSecret = process.env.CASHFREE_TEST_SECRET_KEY?.trim() || '';
  if (tId && tSecret) return { appId: tId, secret: tSecret };
  return id && secret && isTestId(id) ? { appId: id, secret } : null;
}

/** Current mode (admin switch, cached). */
export const cashfreeMode = async (): Promise<CashfreeMode> => (await getCashfreeSettings()).mode;

/** Keys exist for the mode currently switched on. */
export const isCashfreeConfigured = async () => !!cashfreeKeys(await cashfreeMode());

const baseUrl = (mode: CashfreeMode) => (mode === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg');

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
  const mode = await cashfreeMode();
  const keys = cashfreeKeys(mode);
  if (!keys) throw new CashfreeError(`Cashfree ${mode} keys are not set`, 500, 'not_configured');

  const res = await fetch(`${baseUrl(mode)}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      'x-api-version': API_VERSION,
      'x-client-id': keys.appId,
      'x-client-secret': keys.secret,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data as { message?: string; code?: string };
    if (res.status === 401) console.error(`[Cashfree] 401 in ${mode} mode: the ${mode === 'production' ? 'CASHFREE_APP_ID / CASHFREE_SECRET_KEY' : 'CASHFREE_TEST_APP_ID / CASHFREE_TEST_SECRET_KEY'} keys are wrong for this mode`);
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
 * Accepts either mode's secret, so webhooks for payments started just before
 * the Test/Live switch was flipped still verify. If a separate webhook secret
 * was generated in the Cashfree dashboard, it goes in CASHFREE_WEBHOOK_SECRET.
 */
export function verifyWebhookSignature(rawBody: string, timestamp: string | null, signature: string | null): boolean {
  if (!timestamp || !signature) return false;
  const given = Buffer.from(signature);
  const secrets = new Set([process.env.CASHFREE_WEBHOOK_SECRET?.trim(), cashfreeKeys('production')?.secret, cashfreeKeys('sandbox')?.secret].filter((x): x is string => !!x));
  for (const secret of secrets) {
    const expected = Buffer.from(createHmac('sha256', secret).update(timestamp + rawBody).digest('base64'));
    if (expected.length === given.length && timingSafeEqual(expected, given)) return true;
  }
  return false;
}
