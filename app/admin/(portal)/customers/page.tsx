import Link from 'next/link';
import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { adminHref } from '@/lib/admin/paths';
import { Card, DataTable, EmptyState, PageHeader, Pagination, StatusBadge, fmtDate } from '@/components/admin/ui';
import { FilterBar, likePattern } from '@/components/admin/FilterBar';

export const metadata = { title: 'Customers' };
const PAGE = 25;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; filter?: string }> }) {
  await requireStaff('customers.read');
  const sp = await searchParams;
  const q = (sp.q ?? '').trim().slice(0, 100);
  const page = Math.max(1, Number(sp.page) || 1);
  const filter = ['onboarded', 'not_onboarded', 'blocked'].includes(sp.filter ?? '') ? sp.filter : '';

  const supabase = await getSupabaseServer();
  let query = supabase
    .from('profiles')
    .select('id, full_name, email, phone, diet_type, goal, is_onboarded, is_blocked, created_at, last_seen_at, subscriptions(status)', { count: 'exact' })
    .eq('role', 'customer')
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (q) {
    const p = likePattern(q);
    query = query.or(`full_name.ilike.${p},email.ilike.${p},phone.ilike.${p}`);
  }
  if (filter === 'onboarded') query = query.eq('is_onboarded', true);
  if (filter === 'not_onboarded') query = query.eq('is_onboarded', false);
  if (filter === 'blocked') query = query.eq('is_blocked', true);
  const { data, count } = await query;

  const base = adminHref('/customers');
  return (
    <>
      <PageHeader title="Customers" description="Everyone who has signed up. Open a customer to see their plan, meals, payments and history." />
      <FilterBar
        action={base}
        q={q}
        param="filter"
        current={filter}
        searchPlaceholder="Name, email or phone"
        tabs={[{ value: '', label: 'All' }, { value: 'onboarded', label: 'Onboarded' }, { value: 'not_onboarded', label: 'Signed up only' }, { value: 'blocked', label: 'Blocked' }]}
      />
      <Card padded={false}>
        <DataTable
          rows={(data ?? []) as any[]}
          rowKey={(r) => r.id}
          empty={<EmptyState title="No customers found" description={q ? 'Try another search.' : 'Customers appear here when they sign in with Google.'} />}
          columns={[
            { header: 'Customer', cell: (r) => (
              <Link href={adminHref(`/customers/${r.id}`)} className="block">
                <p className="font-bold text-primary">{r.full_name || 'No name yet'}</p>
                <p className="text-xs text-gray-500">{r.email}</p>
              </Link>
            ) },
            { header: 'Phone', cell: (r) => r.phone || <span className="text-gray-400">—</span> },
            { header: 'Diet / goal', cell: (r) => <span className="text-xs">{r.diet_type || '—'} · {r.goal || '—'}</span> },
            { header: 'Plan', cell: (r) => {
              const subs = (r.subscriptions ?? []) as { status: string }[];
              const live = subs.find((s) => s.status === 'active') ?? subs.find((s) => s.status === 'paused');
              return live ? <StatusBadge value={live.status} /> : <span className="text-xs text-gray-400">{subs.length ? 'past plans' : 'none'}</span>;
            } },
            { header: 'Status', cell: (r) => r.is_blocked ? <StatusBadge value="rejected" label="blocked" /> : r.is_onboarded ? <StatusBadge value="active" label="onboarded" /> : <StatusBadge value="draft" label="signed up" /> },
            { header: 'Joined', cell: (r) => <span className="text-xs text-gray-600">{fmtDate(r.created_at)}</span> },
          ]}
        />
        <Pagination page={page} pageSize={PAGE} total={count ?? 0}
          hrefFor={(p) => `${base}?${new URLSearchParams({ ...(q ? { q } : {}), ...(filter ? { filter } : {}), page: String(p) })}`} />
      </Card>
    </>
  );
}
