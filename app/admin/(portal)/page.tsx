import Link from 'next/link';
import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { adminHref } from '@/lib/admin/paths';
import { CACHE_KEYS, cached } from '@/lib/cache/redis';
import { Card, DataTable, EmptyState, PageHeader, StatCard, StatusBadge, fmtDate, inr } from '@/components/admin/ui';

export const metadata = { title: 'Overview' };

type Overview = {
  revenue_today: number; revenue_mtd: number; active_subscriptions: number; paused_subscriptions: number;
  ending_this_week: number; meals_tomorrow: number; skips_tomorrow: number; tomorrow: string;
  new_customers_7d: number; pending_payments: number; new_enquiries: number;
};

export default async function OverviewPage() {
  const staff = await requireStaff('dashboard.read');
  const supabase = await getSupabaseServer();

  const [overview, revenue, forecast, pending, activity] = await Promise.all([
    // Expensive aggregates: shared across staff for 30–60 s (permission already checked above).
    cached(CACHE_KEYS.overview, 30, async () => ({ data: (await supabase.rpc('admin_overview')).data })),
    staff.can('analytics.read')
      ? cached(CACHE_KEYS.revenue30, 60, async () => ({ data: (await supabase.rpc('metric_revenue_daily', { p_days: 30 })).data }))
      : Promise.resolve({ data: null }),
    cached(CACHE_KEYS.forecast7, 60, async () => ({ data: (await supabase.rpc('metric_meals_forecast', { p_days: 7 })).data })),
    staff.can('orders.read')
      ? supabase.from('orders').select('id, order_number, total, created_at, metadata, profiles!orders_user_id_fkey(full_name, email)')
          .in('status', ['created', 'pending_payment']).order('created_at', { ascending: false }).limit(8)
      : Promise.resolve({ data: [] }),
    staff.can('customers.read')
      ? supabase.from('activity_log').select('id, action, entity, actor_role, created_at, after, profiles!activity_log_user_id_fkey(full_name, email)')
          .neq('entity', 'auth').order('created_at', { ascending: false }).limit(12)
      : Promise.resolve({ data: [] }),
  ]);

  const o = (overview.data ?? {}) as Overview;
  const rev = (revenue.data ?? []) as { day: string; revenue: number; orders: number }[];
  const maxRev = Math.max(1, ...rev.map((r) => Number(r.revenue)));
  const fc = (forecast.data ?? []) as { day: string; lunch: number; dinner: number; skipped: number }[];

  return (
    <>
      <PageHeader title="Overview" description={`Kitchen and sales at a glance. Next cooking day: ${fmtDate(o.tomorrow)}.`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Revenue today" value={inr(o.revenue_today)} hint={`Month to date ${inr(o.revenue_mtd)}`} />
        <StatCard label="Meals next cooking day" value={o.meals_tomorrow ?? 0} hint={`${o.skips_tomorrow ?? 0} skipped`} />
        <StatCard label="Active subscriptions" value={o.active_subscriptions ?? 0} hint={`${o.paused_subscriptions ?? 0} paused · ${o.ending_this_week ?? 0} ending this week`} tone="good" />
        <StatCard label="Awaiting payment" value={o.pending_payments ?? 0} hint={`${o.new_enquiries ?? 0} new enquiries · ${o.new_customers_7d ?? 0} new customers (7d)`} tone={(o.pending_payments ?? 0) > 0 ? 'warn' : 'default'} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {rev.length > 0 && (
          <Card title="Revenue, last 30 days" className="lg:col-span-2">
            <div className="flex items-end gap-1 h-40" role="img" aria-label="Daily revenue bar chart">
              {rev.map((r) => (
                <div key={r.day} className="flex-1 flex flex-col justify-end group relative">
                  <div className="bg-primary/80 group-hover:bg-primary rounded-t" style={{ height: `${(Number(r.revenue) / maxRev) * 100}%`, minHeight: Number(r.revenue) > 0 ? 3 : 0 }} />
                  <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap bg-gray-900 text-white text-[10px] px-2 py-1 rounded">
                    {fmtDate(r.day)} · {inr(r.revenue)} · {r.orders} orders
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
        <Card title="Meals, next 7 days" className={rev.length > 0 ? '' : 'lg:col-span-3'}>
          {fc.length === 0 ? (
            <EmptyState title="No meals scheduled yet" description="Paid subscriptions appear here." />
          ) : (
            <ul className="space-y-2 text-sm">
              {fc.map((d) => (
                <li key={d.day} className="flex items-center justify-between">
                  <span className="text-gray-600">{fmtDate(d.day)}</span>
                  <span className="font-bold">{d.lunch} lunch · {d.dinner} dinner {d.skipped > 0 && <span className="text-gray-400 font-medium">({d.skipped} off)</span>}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {staff.can('orders.read') && (
          <Card title="Waiting for payment confirmation" padded={false}
            actions={<Link href={adminHref('/orders?status=pending_payment')} className="text-xs font-bold text-primary">View all</Link>}>
            <DataTable
              rows={(pending.data ?? []) as any[]}
              rowKey={(r) => r.id}
              empty={<EmptyState title="All caught up" description="No unpaid orders." />}
              columns={[
                { header: 'Order', cell: (r) => <Link className="font-bold text-primary" href={adminHref(`/orders/${r.id}`)}>{r.order_number}</Link> },
                { header: 'Customer', cell: (r) => r.profiles?.full_name || r.profiles?.email || '—' },
                { header: 'UPI ref', cell: (r) => r.metadata?.upi_reference ? <span className="font-mono text-xs">{r.metadata.upi_reference}</span> : <span className="text-gray-400">not sent</span> },
                { header: 'Total', cell: (r) => inr(r.total), className: 'text-right' },
              ]}
            />
          </Card>
        )}
        {staff.can('customers.read') && (
          <Card title="Recent activity" padded={false}
            actions={staff.can('activity.read') ? <Link href={adminHref('/activity')} className="text-xs font-bold text-primary">Activity log</Link> : undefined}>
            <DataTable
              rows={(activity.data ?? []) as any[]}
              rowKey={(r) => String(r.id)}
              empty={<EmptyState title="No activity yet" />}
              columns={[
                { header: 'When', cell: (r) => <span className="text-gray-500 text-xs whitespace-nowrap">{fmtDate(r.created_at, true)}</span> },
                { header: 'What', cell: (r) => <span><StatusBadge value={r.actor_role} /> <span className="ml-1">{r.entity} · {r.action.replace(/_/g, ' ')}</span></span> },
                { header: 'Customer', cell: (r) => r.profiles?.full_name || r.profiles?.email || '—' },
              ]}
            />
          </Card>
        )}
      </div>
    </>
  );
}
