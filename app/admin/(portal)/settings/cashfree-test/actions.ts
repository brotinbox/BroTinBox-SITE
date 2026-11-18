'use server';

import { headers } from 'next/headers';
import { assertStaff } from '@/lib/auth/session';
import { fail, ok, staffAction, type ActionResult } from '@/lib/admin/actions';
import { adminHref } from '@/lib/admin/paths';
import { rateLimit } from '@/lib/security/ratelimit';
import { CashfreeError, cashfreeMode, createOrder, createRefund, getOrder, isCashfreeConfigured, type CashfreeMode } from '@/lib/cashfree';
import { isTestOrderId } from './shared';

/**
 * ₹1 Cashfree test payment, straight against the gateway. Nothing is written
 * to our orders table, so it never shows in orders, kitchen sheets or
 * finance. The webhook handler stores the event and ignores it (unknown
 * order), which is exactly what the check page looks for.
 */

export type StartTestResult = { ok: true; sessionId: string; mode: CashfreeMode; orderId: string } | { ok: false; error: string };

export async function startTestPayment(phoneInput: string): Promise<StartTestResult> {
  let staffId: string;
  let staffName: string | null;
  let staffEmail: string | null;
  try {
    const staff = await assertStaff('settings.write');
    staffId = staff.profile.id;
    staffName = staff.profile.full_name;
    staffEmail = staff.profile.email;
  } catch {
    return { ok: false, error: 'You do not have permission to do that.' };
  }
  const rl = await rateLimit('adminMutation', staffId);
  if (!rl.success) return { ok: false, error: 'Too many attempts. Wait a minute and try again.' };

  const phone = String(phoneInput ?? '').replace(/\D/g, '').slice(-10);
  if (!/^[6-9]\d{9}$/.test(phone)) return { ok: false, error: 'Enter a valid 10-digit mobile number.' };
  if (!(await isCashfreeConfigured())) return { ok: false, error: 'Cashfree keys for the current mode are not set in Vercel.' };

  const origin = await requestOrigin();
  const orderId = `CFTEST-${Date.now().toString(36).toUpperCase()}`;
  try {
    const cf = await createOrder({
      orderId,
      amount: 1,
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      customer: { id: staffId.replace(/-/g, ''), phone, email: staffEmail && !/\.invalid$/.test(staffEmail) ? staffEmail : null, name: staffName },
      returnUrl: `${origin}${adminHref('/settings/cashfree-test')}?order=${orderId}`,
      notifyUrl: origin.startsWith('https://') ? `${origin}/api/webhooks/cashfree` : undefined,
      note: 'BroTin Box admin test payment',
    });
    return { ok: true, sessionId: cf.payment_session_id, mode: await cashfreeMode(), orderId };
  } catch (e) {
    console.error('[Cashfree test] create order failed', e);
    if (e instanceof CashfreeError) {
      if (e.status === 401) return { ok: false, error: 'Cashfree rejected the keys (401). Check CASHFREE_APP_ID / CASHFREE_SECRET_KEY in Vercel and redeploy.' };
      return { ok: false, error: `Cashfree: ${e.message}` };
    }
    return { ok: false, error: 'Could not reach Cashfree. Try again in a moment.' };
  }
}

export async function refundTestPayment(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const orderId = String(fd.get('order_id') ?? '');
  if (!isTestOrderId(orderId)) return fail('Only CFTEST orders can be refunded here.');
  return staffAction('settings.write', async () => {
    try {
      const order = await getOrder(orderId);
      if (order.order_status !== 'PAID') return fail(`This test order is ${order.order_status}, not PAID.`);
      await createRefund({ orderId, refundId: `${orderId}-R`, amount: 1, note: 'Admin test payment refund' });
      return ok('Refund requested. Cashfree usually confirms it within a minute; the refund webhook then appears below.');
    } catch (e) {
      if (e instanceof CashfreeError) {
        if (/already/i.test(e.message) || e.code === 'refund_already_exists') return ok('A refund for this test was already requested.');
        return fail(`Cashfree: ${e.message}`);
      }
      throw e;
    }
  });
}

async function requestOrigin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  if (!host) return (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}
