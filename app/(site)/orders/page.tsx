import Link from 'next/link';
import { ChevronRight, Gift, Receipt, Repeat } from 'lucide-react';
import { requireCustomer } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { dateLabel, inr } from '@/lib/customer/data';
import { AccountShell } from '@/components/account/AccountNav';
import { cn } from '@/lib/utils';

export const metadata = { title: 'My orders', robots: { index: false } };
export const dynamic = 'force-dynamic';

const STATUS: Record<string, { text: string; cls: string }> = {
  created: { text: 'Pay now', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  pending_payment: { text: 'Pay now', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  paid: { text: 'Paid', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed: { text: 'Payment failed', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  cancelled: { text: 'Cancelled', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  expired: { text: 'Expired', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  refunded: { text: 'Refunded', cls: 'bg-sky-50 text-sky-800 border-sky-200' },
  partially_refunded: { text: 'Part refunded', cls: 'bg-sky-50 text-sky-800 border-sky-200' },
};
const TYPE: Record<string, string> = { trial: 'Trial box', weekly: 'Weekly plan', monthly: 'Monthly plan', custom: 'Custom plan' };

export default async function OrdersPage() {
  await requireCustomer('/orders');
  const supabase = await getSupabaseServer();
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, type, status, total, created_at')
    .order('created_at', { ascending: false });

  return (
    <AccountShell current="/orders" title="Orders & payments">
      {!orders?.length ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center space-y-3">
          <span className="mx-auto w-12 h-12 rounded-2xl bg-sand text-ink flex items-center justify-center"><Receipt className="w-5 h-5" /></span>
          <div>
            <p className="font-heading font-black text-base text-gray-900">No orders yet</p>
            <p className="text-xs text-gray-500 mt-0.5">Your trial box and plan orders show up here.</p>
          </div>
          <Link href="/pricing" className="inline-block px-5 py-2.5 rounded-xl bg-ink text-white text-xs font-bold">See plans</Link>
        </div>
      ) : (
        <ul className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
          {orders.map((o) => {
            const unpaid = o.status === 'created' || o.status === 'pending_payment';
            const st = STATUS[o.status] ?? { text: o.status, cls: STATUS.cancelled.cls };
            const Icon = o.type === 'trial' ? Gift : Repeat;
            return (
              <li key={o.id}>
                <Link href={unpaid ? `/checkout/pay/${o.id}` : `/orders/${o.id}`} className={cn('flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50', unpaid && 'bg-amber-50/40')}>
                  <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', o.type === 'trial' ? 'bg-orange-50 text-orange-600' : 'bg-sand text-ink')}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-gray-900">{TYPE[o.type] ?? o.type}</span>
                    <span className="block text-xs text-gray-500">{o.order_number} · {dateLabel(o.created_at.slice(0, 10))}</span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block font-heading font-black text-sm text-gray-900">{inr(o.total)}</span>
                    <span className={cn('inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border', st.cls)}>{st.text}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AccountShell>
  );
}
