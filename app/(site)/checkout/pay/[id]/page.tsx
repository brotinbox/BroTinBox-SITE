import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { AlertTriangle, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { requireCustomer } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { BRAND } from '@/config/brand';
import { isCashfreeConfigured, cashfreeMode } from '@/lib/cashfree';
import { syncOrderFromCashfree, type SyncState } from '@/lib/payments/cashfree-checkout';
import { ReferenceForm } from './ReferenceForm';
import { CashfreeButton } from './CashfreeButton';

export const metadata = { title: 'Payment', robots: { index: false } };
export const dynamic = 'force-dynamic';

const inr = (n: number | string) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default async function PayPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cf?: string }> }) {
  const [{ id }, { cf }] = await Promise.all([params, searchParams]);
  if (!z.string().uuid().safeParse(id).success) notFound();
  await requireCustomer(`/checkout/pay/${id}`);

  const supabase = await getSupabaseServer();
  const [{ data: order }, { data: items }, { data: setting }] = await Promise.all([
    supabase.from('orders').select('id, order_number, status, total, subtotal, discount, delivery_fee, metadata, created_at, expires_at, type').eq('id', id).maybeSingle(),
    supabase.from('order_items').select('id, name, qty, unit_price, total, item_type').eq('order_id', id),
    supabase.from('site_settings').select('value').eq('key', 'payment').maybeSingle(),
  ]);
  if (!order) notFound(); // RLS: customers only see their own orders

  const pay = (setting?.value ?? {}) as { mode?: string; upi_id?: string; payee_name?: string; qr_image_url?: string | null; instructions?: string };
  // Cashfree when switched on in Settings AND the keys are set; otherwise manual UPI.
  const online = pay.mode === 'cashfree' && isCashfreeConfigured();
  const meta = (order.metadata ?? {}) as { upi_reference?: string };

  // Back from Cashfree (?cf=1): ask Cashfree directly instead of waiting for the webhook.
  let cfState: SyncState = 'none';
  if (cf && order.status !== 'paid' && isCashfreeConfigured()) {
    cfState = await syncOrderFromCashfree(order.id).catch((e) => {
      console.error('[Cashfree] return sync failed', e);
      return 'none' as const;
    });
    if (cfState === 'paid') order.status = 'paid';
  }

  const paid = order.status === 'paid';
  const unpaid = order.status === 'created' || order.status === 'pending_payment';
  const upiLink = pay.upi_id
    ? `upi://pay?${new URLSearchParams({ pa: pay.upi_id, pn: pay.payee_name || BRAND.name, am: Number(order.total).toFixed(2), cu: 'INR', tn: `${BRAND.name} ${order.order_number}` })}`
    : null;
  const waLink = `https://wa.me/${BRAND.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${BRAND.name}, I placed order ${order.order_number} (${inr(order.total)}). How do I pay?`)}`;

  return (
    <div className="min-h-screen bg-[#FBFDF8] py-8 px-4">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Order {order.order_number}</p>
          <h1 className="font-heading font-black text-3xl text-[#124233] mt-1">{inr(order.total)}</h1>
          <p className="text-xs text-gray-500 mt-1 capitalize">{order.type} plan</p>
        </div>

        {paid && (
          <div className="bg-white rounded-3xl border border-emerald-200 p-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h2 className="font-heading font-black text-xl text-gray-900">Payment confirmed</h2>
            <p className="text-sm text-gray-600">Your meals are scheduled. You can skip or pause days until 9 PM the night before.</p>
            <Link href="/dashboard" className="inline-block px-5 py-3 rounded-xl bg-[#124233] text-white font-bold text-sm">Go to my dashboard</Link>
          </div>
        )}

        {!paid && !unpaid && (
          <div className="bg-white rounded-3xl border border-gray-200 p-6 text-center space-y-2">
            <h2 className="font-heading font-black text-lg text-gray-900">This order is {order.status.replace('_', ' ')}</h2>
            <p className="text-sm text-gray-600">If you already paid, message us on WhatsApp with your order number.</p>
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-sm font-bold text-emerald-700">WhatsApp us →</a>
          </div>
        )}

        {unpaid && (
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-5">
            {online ? (
              <>
                <div>
                  <h2 className="font-heading font-black text-lg text-gray-900">Pay securely</h2>
                  <p className="text-xs text-gray-600 mt-1">UPI, cards, net banking and wallets via Cashfree. Your meals are scheduled as soon as the payment goes through.</p>
                </div>
                {cashfreeMode() === 'sandbox' && (
                  <p className="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">Test mode: no real money is charged.</p>
                )}
                {cfState === 'pending' && (
                  <div className="flex items-start gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Your payment is processing. Refresh this page in a minute; don&apos;t pay again yet.</span>
                  </div>
                )}
                {cfState === 'failed' && (
                  <div className="flex items-start gap-2 text-xs text-rose-900 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>The payment didn&apos;t go through. You can try again below. If money left your account, WhatsApp us with order {order.order_number}.</span>
                  </div>
                )}
                {cfState !== 'pending' && <CashfreeButton orderId={order.id} amountLabel={inr(order.total)} />}
              </>
            ) : pay.upi_id ? (
              <>
                <div>
                  <h2 className="font-heading font-black text-lg text-gray-900">Pay by UPI</h2>
                  <p className="text-xs text-gray-600 mt-1">{pay.instructions || 'Pay the exact amount, then enter the UPI reference number below.'}</p>
                </div>
                {pay.qr_image_url && (
                  <Image src={pay.qr_image_url} alt="UPI QR code" width={220} height={220} className="mx-auto rounded-xl border border-gray-200" />
                )}
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">UPI ID</span><span className="font-mono font-bold select-all">{pay.upi_id}</span></div>
                  <div className="flex justify-between mt-1"><span className="text-gray-500">Name</span><span className="font-semibold">{pay.payee_name || BRAND.name}</span></div>
                  <div className="flex justify-between mt-1"><span className="text-gray-500">Amount</span><span className="font-bold">{inr(order.total)}</span></div>
                  <div className="flex justify-between mt-1"><span className="text-gray-500">Note</span><span className="font-mono">{order.order_number}</span></div>
                </div>
                {upiLink && (
                  <a href={upiLink} className="block text-center w-full py-3 rounded-xl border-2 border-[#124233] text-[#124233] font-heading font-black text-sm sm:hidden">
                    Open UPI app
                  </a>
                )}
                {meta.upi_reference ? (
                  <div className="flex items-start gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Reference <b className="font-mono">{meta.upi_reference}</b> received. We&apos;ll confirm and schedule your meals shortly. You can correct it below.</span>
                  </div>
                ) : null}
                <ReferenceForm orderId={order.id} existing={meta.upi_reference} />
              </>
            ) : (
              <div className="space-y-3 text-center">
                <h2 className="font-heading font-black text-lg text-gray-900">Order received</h2>
                <p className="text-sm text-gray-600">Our team will WhatsApp you to collect payment. Your meals are scheduled as soon as payment is confirmed.</p>
                <a href={waLink} target="_blank" rel="noopener noreferrer" className="inline-block px-5 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm">WhatsApp us now</a>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-3xl border border-gray-200 p-5">
          <h3 className="font-heading font-bold text-sm text-gray-900 mb-3">Order summary</h3>
          <ul className="space-y-1.5 text-sm">
            {(items ?? []).map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="text-gray-700">{i.name}{i.qty > 1 ? ` × ${i.qty}` : ''}</span>
                <span className={Number(i.total) < 0 ? 'text-emerald-700' : 'text-gray-900'}>{Number(i.total) < 0 ? `− ${inr(-Number(i.total))}` : inr(i.total)}</span>
              </li>
            ))}
            <li className="flex justify-between pt-2 border-t border-gray-100 font-black"><span>Total</span><span>{inr(order.total)}</span></li>
          </ul>
        </div>

        <p className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Prices are confirmed by our server. Need help? <a href={waLink} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-700">WhatsApp us</a>
        </p>
      </div>
    </div>
  );
}
