import Link from 'next/link';
import { requireStaff } from '@/lib/auth/session';
import { adminHref } from '@/lib/admin/paths';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseService } from '@/lib/supabase/admin';
import { Card, PageHeader, fmtDate } from '@/components/admin/ui';
import { ActionForm, SubmitButton } from '@/components/admin/forms';
import { cashfreeKeys, cashfreeMode, getOrder, getOrderPayments, getOrderRefunds, type CfOrder, type CfPayment, type CfRefund } from '@/lib/cashfree';
import { refundTestPayment } from './actions';
import { isTestOrderId } from './shared';
import { AutoRefresh, TestPayButton } from './TestPayButton';

export const metadata = { title: 'Cashfree test payment' };
export const dynamic = 'force-dynamic';

type Check = { label: string; state: 'ok' | 'wait' | 'fail' | 'skip'; detail: string };

const ICON: Record<Check['state'], string> = { ok: '✅', wait: '⏳', fail: '❌', skip: '➖' };

export default async function CashfreeTestPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const staff = await requireStaff('settings.write');
  const sp = await searchParams;
  const mode = await cashfreeMode();
  const keys = cashfreeKeys(mode);
  const keyHint = keys ? `${keys.appId.slice(0, 6)}…${keys.appId.slice(-4)}` : 'missing';
  const live = mode === 'production';

  const supabase = await getSupabaseServer();
  const { data: wa } = await supabase.from('site_settings').select('value').eq('key', 'support_whatsapp').maybeSingle();
  const defaultPhone = (staff.profile.phone || (typeof wa?.value === 'string' ? wa.value : '') || '').replace(/\D/g, '').slice(-10);

  const orderId = sp.order && isTestOrderId(sp.order) ? sp.order : null;

  return (
    <>
      <PageHeader
        title="Cashfree ₹1 test payment"
        description="Checks the keys, the payment page, the webhook and refunds end to end. Nothing is added to orders or finance."
        actions={<Link href={adminHref('/settings')} className="text-sm font-semibold underline">Back to settings</Link>}
      />
      <div className="grid max-md:grid-cols-[minmax(0,1fr)] lg:grid-cols-2 gap-4">
        <Card title="Start a test">
          <div className="space-y-3 text-sm">
            <p>
              Mode: <b className={live ? 'text-rose-700' : 'text-emerald-700'}>{live ? 'LIVE (real ₹1)' : 'TEST (sandbox, no real money)'}</b>
              {' '}· App ID in use: <code>{keyHint}</code>
            </p>
            <p className="text-xs text-gray-600">
              Compare the App ID with Developers → API Keys in the Cashfree dashboard to be sure this is the new account.
              Pay with UPI; you come back here and the checks fill in.
            </p>
            {keys ? <TestPayButton defaultPhone={defaultPhone} live={live} /> : <p className="text-rose-700 font-semibold">No {live ? 'live' : 'test'} keys in Vercel.</p>}
          </div>
        </Card>

        {orderId && <Results orderId={orderId} />}
      </div>
    </>
  );
}

async function Results({ orderId }: { orderId: string }) {
  let order: CfOrder | null = null;
  let orderError: string | null = null;
  let payments: CfPayment[] = [];
  let refunds: CfRefund[] = [];
  try {
    order = await getOrder(orderId);
    [payments, refunds] = await Promise.all([
      getOrderPayments(orderId).catch(() => []),
      getOrderRefunds(orderId).catch(() => []),
    ]);
  } catch (e) {
    orderError = e instanceof Error ? e.message : 'Could not read the order from Cashfree.';
  }

  // The webhook route stores an event only after the signature check passes.
  const { data: events } = await getSupabaseService()
    .from('webhook_events')
    .select('event_type, received_at, payload')
    .eq('provider', 'cashfree')
    .gte('received_at', new Date(Date.now() - 2 * 86_400_000).toISOString())
    .order('received_at', { ascending: false })
    .limit(200);
  const mine = (events ?? []).filter((e) => JSON.stringify(e.payload).includes(orderId));
  const payHook = mine.find((e) => /PAYMENT/i.test(e.event_type));
  const refundHook = mine.find((e) => /REFUND/i.test(e.event_type));

  const paid = payments.find((p) => p.payment_status === 'SUCCESS');
  const lastPay = paid ?? payments[0];
  const refund = refunds[0];

  const checks: Check[] = [
    order
      ? { label: 'Order created with these keys', state: 'ok', detail: `Cashfree order ${order.cf_order_id}, ₹${order.order_amount}` }
      : { label: 'Order created with these keys', state: 'fail', detail: orderError ?? 'Not found' },
    paid
      ? { label: 'Payment successful', state: 'ok', detail: `${paid.payment_group ?? 'payment'} · ref ${paid.bank_reference ?? '-'} · ${fmtDate(paid.payment_time ?? null, true)}` }
      : lastPay && lastPay.payment_status !== 'PENDING'
        ? { label: 'Payment successful', state: 'fail', detail: `${lastPay.payment_status}: ${lastPay.payment_message ?? lastPay.error_details?.error_description ?? ''}` }
        : { label: 'Payment successful', state: 'wait', detail: order?.order_status === 'ACTIVE' ? 'Not paid yet' : `Order is ${order?.order_status ?? 'unknown'}` },
    payHook
      ? { label: 'Payment webhook received and signature verified', state: 'ok', detail: `${payHook.event_type} at ${fmtDate(payHook.received_at, true)}` }
      : { label: 'Payment webhook received and signature verified', state: paid ? 'wait' : 'skip', detail: paid ? 'Waiting for Cashfree (usually under a minute). If it never comes: check the dashboard webhook URL/events, or the secret key in Vercel.' : 'After payment' },
    refund
      ? { label: 'Refund', state: refund.refund_status === 'SUCCESS' ? 'ok' : refund.refund_status === 'PENDING' || refund.refund_status === 'ONHOLD' ? 'wait' : 'fail', detail: `${refund.refund_status}${refund.status_description ? `: ${refund.status_description}` : ''}` }
      : { label: 'Refund', state: 'skip', detail: 'Optional: use the button below' },
    refundHook
      ? { label: 'Refund webhook received', state: 'ok', detail: `${refundHook.event_type} at ${fmtDate(refundHook.received_at, true)}` }
      : { label: 'Refund webhook received', state: refund ? 'wait' : 'skip', detail: refund ? 'Waiting for Cashfree' : 'After refund' },
  ];

  const waiting = checks.some((c) => c.state === 'wait');

  return (
    <Card title={`Results · ${orderId}`}>
      <ul className="space-y-3 text-sm">
        {checks.map((c) => (
          <li key={c.label} className="flex gap-2">
            <span aria-hidden>{ICON[c.state]}</span>
            <span>
              <b>{c.label}</b>
              <span className="block text-xs text-gray-600 break-words">{c.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-3">
        <AutoRefresh active={waiting} />
        {paid && !refund && (
          <ActionForm action={refundTestPayment} className="space-y-2">
            <input type="hidden" name="order_id" value={orderId} />
            <SubmitButton>Refund ₹1</SubmitButton>
          </ActionForm>
        )}
      </div>
    </Card>
  );
}
