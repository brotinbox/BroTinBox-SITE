import Link from 'next/link';
import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { adminHref } from '@/lib/admin/paths';
import { Card, DataTable, EmptyState, PageHeader, Pagination, StatusBadge, fmtDate } from '@/components/admin/ui';
import { FilterBar } from '@/components/admin/FilterBar';

export const metadata = { title: 'Activity log' };
const PAGE = 50;
const ENTITIES = ['order', 'subscription', 'delivery', 'profile', 'kitchen', 'auth'];

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ entity?: string; page?: string }> }) {
  const staff = await requireStaff('activity.read');
  const sp = await searchParams;
  const entity = ENTITIES.includes(sp.entity ?? '') ? sp.entity! : '';
  const page = Math.max(1, Number(sp.page) || 1);

  const supabase = await getSupabaseServer();
  let query = supabase
    .from('activity_log')
    .select('id, entity, action, actor_role, created_at, after, ip, user_id, profiles!activity_log_user_id_fkey(full_name, email), actor:profiles!activity_log_actor_id_fkey(full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (entity) query = query.eq('entity', entity);
  // Staff sign-in events are visible to super admins only.
  if (!staff.can('staff.manage')) query = query.neq('entity', 'auth');
  const { data, count } = await query;

  const base = adminHref('/activity');
  const tabs = [{ value: '', label: 'All' }, ...ENTITIES.filter((e) => e !== 'auth' || staff.can('staff.manage')).map((e) => ({ value: e, label: e === 'auth' ? 'Staff sign-ins' : e }))];

  return (
    <>
      <PageHeader title="Activity log" description="Every change made by customers, staff and scheduled jobs." />
      <FilterBar action={base} param="entity" current={entity} tabs={tabs} />
      <Card padded={false}>
        <DataTable
          rows={(data ?? []) as any[]}
          rowKey={(r) => String(r.id)}
          empty={<EmptyState title="No activity" />}
          columns={[
            { header: 'When', cell: (r) => <span className="text-xs whitespace-nowrap">{fmtDate(r.created_at, true)}</span> },
            { header: 'Who', cell: (r) => <div><StatusBadge value={r.actor_role} /><p className="text-xs text-gray-600 mt-0.5">{r.actor?.full_name || r.actor?.email || ''}</p></div> },
            { header: 'What', cell: (r) => <span className="font-semibold">{r.entity} · {r.action.replace(/_/g, ' ')}</span> },
            { header: 'Customer', cell: (r) => r.user_id && r.entity !== 'auth' && staff.can('customers.read')
              ? <Link href={adminHref(`/customers/${r.user_id}`)} className="text-primary font-semibold">{r.profiles?.full_name || r.profiles?.email || 'open'}</Link>
              : <span className="text-gray-400">—</span> },
            { header: 'Details', cell: (r) => <code className="text-[11px] text-gray-600 break-all line-clamp-2 max-w-md block">{r.after ? JSON.stringify(r.after) : ''}{r.ip ? ` · ${r.ip}` : ''}</code> },
          ]}
        />
        <Pagination page={page} pageSize={PAGE} total={count ?? 0}
          hrefFor={(p) => `${base}?${new URLSearchParams({ ...(entity ? { entity } : {}), page: String(p) })}`} />
      </Card>
    </>
  );
}
