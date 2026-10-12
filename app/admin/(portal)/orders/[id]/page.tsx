import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { adminHref } from '@/lib/admin/paths';
import { Card, DataTable, PageHeader, StatusBadge, fmtDate, inr } from '@/components/admin/ui';
import { ActionForm, Field, Input, Select, SubmitButton } from '@/components/admin/forms';
import { cancelOrder, markOrderPaid, recheckCashfree } from '../actions';

export const metadata = { title: 'Order' };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff('orders.read');
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const supabase = await getSupabaseServer();
  const [{ data: order }, { data: items }, { data: payments }] = await Promise.all([
    supabase.from('orders')
      .select('*, profiles!orders_user_id_fkey(id, full_name, email, phone), subscriptions(id, status, type, diet, meals_total, start_date, end_date), coupons(code)')
      .eq('id', id).maybeSingle(),
    supabase.from('order_items').select('*').eq('order_id', id),
    supabase.from('payments').select('*').eq('order_id', id).order('created_at', { ascending: false }),
  ]);
  if (!order) notFound();

  const o = order as any;
  const unpaid = ['created', 'pending_payment'].includes(o.status);
  const addr = o.address_snapshot as Record<string, string> | null;

  return (
    <>
      <PageHeader
        title={`Order ${o.order_number}`}
        description={`Placed ${fmtDate(o.created_at, true)}${o.paid_at ? ` · paid ${fmtDate(o.paid_at, true)}` : ''}`}
        actions={<StatusBadge value={o.status === 'created' ? 'pending_payment' : o.status} />}
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card title="Items" padded={false}>
            <DataTable
              rows={(items ?? []) as any[]}
              rowKey={(r) => r.id}
              columns={[
                { header: 'Item', cell: (r) => r.name },
                { header: 'Type', cell: (r) => <span className="text-xs text-gray-500">{r.item_type}</span> },
                { header: 'Qty', cell: (r) => r.qty, className: 'text-right' },
                { header: 'Unit', cell: (r) => inr(r.unit_price), className: 'text-right' },
                { header: 'Total', cell: (r) => inr(r.total), className: 'text-right' },
              ]}
            />
            <dl className="px-5 py-4 border-t border-gray-100 text-sm grid grid-cols-2 gap-y-1 max-w-xs ml-auto">
              <dt className="text-gray-500">Subtotal</dt><dd className="text-right">{inr(o.subtotal)}</dd>
              <dt className="text-gray-500">Discount {o.coupons?.code && `(${o.coupons.code})`}</dt><dd className="text-right">− {inr(o.discount)}</dd>
              <dt className="text-gray-500">Delivery</dt><dd className="text-right">{inr(o.delivery_fee)}</dd>
              <dt className="font-bold">Total</dt><dd className="text-right font-black">{inr(o.total)}</dd>
            </dl>
          </Card>

          <Card title="Payments" padded={false}>
            <DataTable
              rows={(payments ?? []) as any[]}
              rowKey={(r) => r.id}
              empty={<p className="px-5 py-6 text-sm text-gray-500">No payment recorded yet.</p>}
              columns={[
                { header: 'When', cell: (r) => fmtDate(r.created_at, true) },
                { header: 'Method', cell: (r) => r.method || '—' },
                { header: 'Reference', cell: (r) => <span className="font-mono text-xs">{r.raw?.reference || r.cf_payment_id || '—'}</span> },
                { header: 'Status', cell: (r) => <StatusBadge value={r.status === 'success' ? 'paid' : r.status} /> },
                { header: 'Amount', cell: (r) => inr(r.amount), className: 'text-right' },
              ]}
            />
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Customer">
            <p className="font-bold">{o.profiles?.full_name || '—'}</p>
            <p className="text-sm text-gray-600">{o.profiles?.email}</p>
            {o.profiles?.phone && <p className="text-sm text-gray-600">{o.profiles.phone}</p>}
            {staff.can('customers.read') && o.profiles?.id && (
              <Link href={adminHref(`/customers/${o.profiles.id}`)} className="inline-block mt-2 text-xs font-bold text-primary">Open customer profile →</Link>
            )}
            {addr && (
              <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                {addr.recipient_name} · {addr.phone}<br />
                {addr.flat}, {addr.street}{addr.landmark ? `, ${addr.landmark}` : ''}<br />
                {addr.area}, {addr.city} {addr.pincode}
              </p>
            )}
          </Card>

          {o.subscriptions && (
            <Card title="Subscription">
              <div className="flex items-center justify-between">
                <span className="capitalize text-sm">{o.subscriptions.type} · {o.subscriptions.diet.replace('_', '-')}</span>
                <StatusBadge value={o.subscriptions.status} />
              </div>
              <p className="text-xs text-gray-600 mt-1">{o.subscriptions.meals_total} meals · {fmtDate(o.subscriptions.start_date)} → {fmtDate(o.subscriptions.end_date)}</p>
            </Card>
          )}

          {o.metadata?.upi_reference && (
            <Card title="Customer says they paid">
              <p className="font-mono text-sm">{o.metadata.upi_reference}</p>
              <p className="text-xs text-gray-500 mt-1">Submitted {fmtDate(o.metadata.reference_submitted_at, true)}. Check this in your UPI/bank app before confirming.</p>
            </Card>
          )}

          {o.cf_order_id && (
            <Card title="Cashfree">
              <p className="text-xs text-gray-500">Cashfree order ID</p>
              <p className="font-mono text-sm select-all">{o.cf_order_id}</p>
              {o.status !== 'paid' && staff.can('orders.mark_paid') && (
                <ActionForm action={recheckCashfree} className="mt-3">
                  <input type="hidden" name="order_id" value={o.id} />
                  <SubmitButton pendingText="Checking…">Re-check with Cashfree</SubmitButton>
                </ActionForm>
              )}
            </Card>
          )}

          {unpaid && staff.can('orders.mark_paid') && (
            <Card title="Confirm payment">
              <ActionForm action={markOrderPaid} className="space-y-3">
                <input type="hidden" name="order_id" value={o.id} />
                <Field label="Reference you verified">
                  <Input name="reference" required minLength={4} maxLength={60} defaultValue={o.metadata?.upi_reference ?? ''} />
                </Field>
                <Field label="Method">
                  <Select name="method" defaultValue="upi" options={[
                    { value: 'upi', label: 'UPI' }, { value: 'cash', label: 'Cash' },
                    { value: 'bank_transfer', label: 'Bank transfer' }, { value: 'card', label: 'Card' },
                  ]} />
                </Field>
                <SubmitButton confirm={`Confirm you received ${inr(o.total)}? This schedules the customer's meals.`}>Mark as paid</SubmitButton>
              </ActionForm>
            </Card>
          )}

          {unpaid && staff.can('orders.write') && (
            <Card title="Cancel order">
              <ActionForm action={cancelOrder} className="space-y-3">
                <input type="hidden" name="order_id" value={o.id} />
                <Field label="Reason"><Input name="reason" maxLength={300} placeholder="e.g. customer asked to cancel" /></Field>
                <SubmitButton variant="danger" confirm="Cancel this unpaid order?">Cancel order</SubmitButton>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
