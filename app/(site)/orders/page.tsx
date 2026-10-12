import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { requireCustomer } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { dateLabel, inr } from '@/lib/customer/data';
import { AccountShell } from '@/components/account/AccountNav';

export const metadata = { title: 'My orders', robots: { index: false } };
export const dynamic = 'force-dynamic';

const LABEL: Record<string, string> = {
  created: 'Waiting for payment', pending_payment: 'Waiting for payment', paid: 'Paid', failed: 'Payment failed',
  cancelled: 'Cancelled', refunded: 'Refunded', partially_refunded: 'Partly refunded',
};

export default async function OrdersPage() {
  await requireCustomer('/orders');
  const supabase = await getSupabaseServer();
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, type, status, total, created_at')
    .order('created_at', { ascending: false });

  return (
    <AccountShell current="/orders" title="My orders">
      {!orders?.length ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">No orders yet.</div>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => {
            const unpaid = o.status === 'created' || o.status === 'pending_payment';
            return (
              <li key={o.id}>
                <Link href={unpaid ? `/checkout/pay/${o.id}` : `/orders/${o.id}`} className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50">
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{o.order_number} <span className="capitalize text-gray-500 font-medium">· {o.type}</span></p>
                    <p className="text-xs text-gray-500">{dateLabel(o.created_at.slice(0, 10))}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black">{inr(o.total)}</p>
                    <p className={unpaid ? 'text-xs font-bold text-amber-700' : 'text-xs text-gray-500'}>{LABEL[o.status] ?? o.status}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AccountShell>
  );
}
