import Link from 'next/link';
import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { adminHref } from '@/lib/admin/paths';
import { Card, DataTable, EmptyState, PageHeader, Pagination, StatusBadge, fmtDate } from '@/components/admin/ui';
import { FilterBar } from '@/components/admin/FilterBar';

export const metadata = { title: 'Subscriptions' };
const PAGE = 25;
const STATUSES = ['active', 'paused', 'pending_payment', 'completed', 'cancelled', 'expired'] as const;

export default async function SubscriptionsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string; ending?: string }> }) {
  await requireStaff('subscriptions.read');
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as never) ? sp.status : undefined;
  const ending = sp.ending === 'week';
  const page = Math.max(1, Number(sp.page) || 1);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const weekAhead = new Date(Date.now() + 7 * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const supabase = await getSupabaseServer();
  let query = supabase
    .from('subscriptions')
    .select('id, type, diet, meals_per_day, meals_total, meals_delivered, meals_skipped, status, start_date, end_date, paused_until, created_at, plans(name), profiles!subscriptions_user_id_fkey(id, full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (status) query = query.eq('status', status as never);
  if (ending) query = query.eq('status', 'active').gte('end_date', today).lte('end_date', weekAhead);
  const { data, count } = await query;

  const base = adminHref('/subscriptions');
  return (
    <>
      <PageHeader title="Subscriptions" description="Every plan bought. Open the customer to pause, skip, add credits or cancel." />
      <FilterBar
        action={base}
        current={ending ? 'week' : status ?? ''}
        param={ending ? 'ending' : 'status'}
        tabs={[
          { value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' },
          { value: 'pending_payment', label: 'Awaiting payment' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' },
        ]}
      />
      <div className="mb-3 text-xs">
        <Link href={`${base}?ending=week`} className="font-bold text-primary">Show plans ending in the next 7 days →</Link>
      </div>
      <Card padded={false}>
        <DataTable
          rows={(data ?? []) as any[]}
          rowKey={(r) => r.id}
          empty={<EmptyState title="No subscriptions" />}
          columns={[
            { header: 'Customer', cell: (r) => <Link className="font-bold text-primary" href={adminHref(`/customers/${r.profiles?.id}`)}>{r.profiles?.full_name || r.profiles?.email || '—'}</Link> },
            { header: 'Plan', cell: (r) => <div><p>{r.plans?.name ?? r.type}</p><p className="text-xs text-gray-500">{r.diet.replace('_', '-')} · {r.meals_per_day}/day</p></div> },
            { header: 'Progress', cell: (r) => <span className="text-xs">{r.meals_delivered}/{r.meals_total} delivered · {r.meals_skipped} skipped</span> },
            { header: 'Dates', cell: (r) => <span className="text-xs whitespace-nowrap">{fmtDate(r.start_date)} → {fmtDate(r.end_date)}</span> },
            { header: 'Status', cell: (r) => <div><StatusBadge value={r.status} />{r.paused_until && <p className="text-[11px] text-gray-500 mt-0.5">till {fmtDate(r.paused_until)}</p>}</div> },
          ]}
        />
        <Pagination page={page} pageSize={PAGE} total={count ?? 0}
          hrefFor={(p) => `${base}?${new URLSearchParams({ ...(status ? { status } : {}), ...(ending ? { ending: 'week' } : {}), page: String(p) })}`} />
      </Card>
    </>
  );
}
