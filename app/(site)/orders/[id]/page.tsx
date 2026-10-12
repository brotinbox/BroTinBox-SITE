import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { requireCustomer } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { dateLabel, inr } from '@/lib/customer/data';
import { AccountShell } from '@/components/account/AccountNav';

export const metadata = { title: 'Order', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  await requireCustomer(`/orders/${id}`);
  const supabase = await getSupabaseServer();
  const [{ data: o }, { data: items }, { data: payments }] = await Promise.all([
    supabase.from('orders').select('id, order_number, type, status, total, subtotal, discount, delivery_fee, created_at, paid_at, address_snapshot').eq('id', id).maybeSingle(),
    supabase.from('order_items').select('id, name, qty, total').eq('order_id', id),
    supabase.from('payments').select('id, method, status, amount, created_at').eq('order_id', id).eq('status', 'success'),
  ]);
  if (!o) notFound();
  if (o.status === 'created' || o.status === 'pending_payment') redirect(`/checkout/pay/${o.id}`);
  const a = (o.address_snapshot ?? {}) as Record<string, string>;

  return (
    <AccountShell current="/orders" title={`Order ${o.order_number}`} subtitle={`Placed ${dateLabel(o.created_at.slice(0, 10))}${o.paid_at ? ` · paid ${dateLabel(o.paid_at.slice(0, 10))}` : ''}`}>
      <div className="space-y-4">
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <ul className="space-y-1.5 text-sm">
            {(items ?? []).map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="text-gray-700">{i.name}{i.qty > 1 ? ` × ${i.qty}` : ''}</span>
                <span>{Number(i.total) < 0 ? `− ${inr(-Number(i.total))}` : inr(i.total)}</span>
              </li>
            ))}
            <li className="flex justify-between pt-2 border-t border-gray-100 font-black"><span>Total</span><span>{inr(o.total)}</span></li>
          </ul>
          {(payments ?? []).map((p) => (
            <p key={p.id} className="text-xs text-gray-500 mt-3">Paid {inr(p.amount)} by {p.method ?? 'UPI'} on {dateLabel(p.created_at.slice(0, 10))}</p>
          ))}
          <p className="text-xs text-gray-500 mt-1 capitalize">Status: {o.status.replace('_', ' ')}</p>
        </section>
        {a.flat && (
          <section className="rounded-2xl border border-gray-200 bg-white p-5 text-sm">
            <h2 className="font-bold text-gray-900 mb-1">Delivered to</h2>
            <p className="text-gray-600">{a.recipient_name} · {a.phone}<br />{a.flat}, {a.street}{a.landmark ? `, ${a.landmark}` : ''}<br />{a.area}, {a.city} {a.pincode}</p>
          </section>
        )}
        <Link href="/my-plan" className="inline-block text-sm font-bold text-ink">See my meals →</Link>
      </div>
    </AccountShell>
  );
}
