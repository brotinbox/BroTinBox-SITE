import Link from 'next/link';
import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { adminHref } from '@/lib/admin/paths';
import { ButtonLink, Card, DataTable, EmptyState, PageHeader, Pagination, StatusBadge, fmtDate, inr } from '@/components/admin/ui';
import { FilterBar, likePattern } from '@/components/admin/FilterBar';

export const metadata = { title: 'Orders' };
const PAGE = 25;
const STATUSES = ['pending_payment', 'paid', 'failed', 'cancelled', 'refunded'] as const;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  await requireStaff('orders.read');
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as never) ? sp.status : undefined;
  const q = (sp.q ?? '').trim().slice(0, 100);
  const page = Math.max(1, Number(sp.page) || 1);

  const supabase = await getSupabaseServer();
  let query = supabase
    .from('orders')
    .select('id, order_number, type, status, total, created_at, paid_at, metadata, profiles!orders_user_id_fkey(full_name, email, phone)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (status === 'pending_payment') query = query.in('status', ['created', 'pending_payment']);
  else if (status) query = query.eq('status', status as never);
  if (q) query = query.ilike('order_number', likePattern(q.toUpperCase()));
  const { data, count } = await query;

  const base = adminHref('/orders');
  return (
    <>
      <PageHeader
        title="Orders & payments"
        description="Every purchase. Confirm UPI payments here to activate subscriptions."
        actions={<ButtonLink href={adminHref('/orders/new')}>New WhatsApp order</ButtonLink>}
      />
      <FilterBar
        action={base}
        q={q}
        current={status ?? ''}
        searchPlaceholder="Order number, e.g. BB-24001"
        tabs={[{ value: '', label: 'All' }, { value: 'pending_payment', label: 'Awaiting payment' }, { value: 'paid', label: 'Paid' }, { value: 'cancelled', label: 'Cancelled' }, { value: 'failed', label: 'Failed' }, { value: 'refunded', label: 'Refunded' }]}
      />
      <Card padded={false}>
        <DataTable
          rows={(data ?? []) as any[]}
          rowKey={(r) => r.id}
          empty={<EmptyState title="No orders" description={status || q ? 'Try a different filter.' : 'Orders appear here as customers check out.'} />}
          columns={[
            { header: 'Order', cell: (r) => <Link className="font-bold text-primary" href={adminHref(`/orders/${r.id}`)}>{r.order_number}</Link> },
            { header: 'Customer', cell: (r) => <div><p className="font-semibold">{r.profiles?.full_name || '—'}</p><p className="text-xs text-gray-500">{r.profiles?.email}</p></div> },
            { header: 'Plan', cell: (r) => <span className="capitalize">{r.type}</span> },
            { header: 'Status', cell: (r) => <StatusBadge value={r.status === 'created' ? 'pending_payment' : r.status} /> },
            { header: 'UPI ref', cell: (r) => r.metadata?.upi_reference ? <span className="font-mono text-xs">{r.metadata.upi_reference}</span> : <span className="text-gray-400">—</span> },
            { header: 'Placed', cell: (r) => <span className="text-xs text-gray-600 whitespace-nowrap">{fmtDate(r.created_at, true)}</span> },
            { header: 'Total', cell: (r) => <span className="font-bold">{inr(r.total)}</span>, className: 'text-right' },
          ]}
        />
        <Pagination page={page} pageSize={PAGE} total={count ?? 0}
          hrefFor={(p) => `${base}?${new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}), page: String(p) })}`} />
      </Card>
    </>
  );
}
