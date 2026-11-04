import Link from 'next/link';
import { requireStaff } from '@/lib/auth/session';
import { leadsTable } from '@/lib/leads';
import { adminHref } from '@/lib/admin/paths';
import { Card, DataTable, EmptyState, PageHeader, Pagination, StatCard, StatusBadge, fmtDate } from '@/components/admin/ui';
import { FilterBar, likePattern } from '@/components/admin/FilterBar';
import { ActionForm, SubmitButton } from '@/components/admin/forms';
import { updateLead } from './actions';

export const metadata = { title: 'Leads' };
const PAGE = 25;

type Lead = {
  phone: string;
  first_seen_at: string;
  last_seen_at: string;
  code_requests: number;
  source: string | null;
  context: { flow?: string; summary?: string; area?: string; pincode?: string } | null;
  user_id: string | null;
  verified_at: string | null;
  ordered_at: string | null;
  order_id: string | null;
  contacted_at: string | null;
  note: string | null;
};

const TABS = [
  { value: '', label: "Didn't finish sign-in" },
  { value: 'no_order', label: 'Signed in, no order' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'all', label: 'All' },
];

/** A polite, personal follow-up: these numbers did not opt in to marketing. */
function waLink(l: Lead, tab: string) {
  const what = l.context?.flow ? ` a ${l.context.flow} order` : ' your order';
  const text =
    tab === 'ordered'
      ? 'Hi! This is BroTin Box. Thanks for your order. Is everything okay with it? Reply here if you need anything.'
      : l.verified_at
        ? `Hi! This is BroTin Box. You signed in but didn't finish${what}. Any questions about the menu, timing or delivery area? Happy to help.`
        : `Hi! This is BroTin Box. We saw you trying to sign in for${what}. Did the WhatsApp code reach you? Happy to help you finish it.`;
  return `https://wa.me/${l.phone.replace('+', '')}?text=${encodeURIComponent(text)}`;
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; status?: string }> }) {
  await requireStaff('customers.read');
  const sp = await searchParams;
  const q = (sp.q ?? '').trim().slice(0, 40);
  const page = Math.max(1, Number(sp.page) || 1);
  const status = ['no_order', 'ordered', 'all'].includes(sp.status ?? '') ? sp.status! : '';

  // otp schema is service-role only; requireStaff above has checked customers.read.
  const leads = leadsTable;

  let query = leads()
    .select('*', { count: 'exact' })
    .order('last_seen_at', { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (q) query = query.ilike('phone', likePattern(q.replace(/\D/g, '')));
  if (status === '') query = query.is('verified_at', null);
  if (status === 'no_order') query = query.not('verified_at', 'is', null).is('ordered_at', null);
  if (status === 'ordered') query = query.not('ordered_at', 'is', null);
  const { data, count, error } = await query;

  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [week, weekVerified, weekOrdered] = await Promise.all([
    leads().select('phone', { count: 'exact', head: true }).gte('first_seen_at', since),
    leads().select('phone', { count: 'exact', head: true }).gte('first_seen_at', since).not('verified_at', 'is', null),
    leads().select('phone', { count: 'exact', head: true }).gte('first_seen_at', since).not('ordered_at', 'is', null),
  ]);

  const base = adminHref('/leads');
  return (
    <>
      <PageHeader
        title="Leads"
        description="Everyone who entered their number to sign in, what they were looking at, and how far they got. Follow up personally on WhatsApp. These people did not opt in to marketing, so don't send promotions."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <StatCard label="New numbers (7 days)" value={String(week.count ?? 0)} />
        <StatCard label="Signed in" value={String(weekVerified.count ?? 0)} hint={week.count ? `${Math.round(((weekVerified.count ?? 0) / week.count) * 100)}% of numbers` : undefined} />
        <StatCard label="Placed an order" value={String(weekOrdered.count ?? 0)} tone="good" />
      </div>

      <FilterBar action={base} q={q} current={status} searchPlaceholder="Phone number" tabs={TABS} />

      <Card padded={false}>
        {error ? (
          <EmptyState title="Leads table not set up yet" description="Run the migration 20261104000025_phone_leads.sql in Supabase." />
        ) : (
          <DataTable
            rows={(data ?? []) as unknown as Lead[]}
            rowKey={(r) => r.phone}
            empty={<EmptyState title="No leads here" description={q ? 'Try another number.' : 'Numbers appear here when someone asks for a WhatsApp sign-in code.'} />}
            columns={[
              { header: 'Number', cell: (r) => (
                <div className="space-y-1.5">
                  <p className="font-bold font-mono text-sm">{r.phone.replace(/^\+91/, '+91 ')}</p>
                  <a href={waLink(r, status)} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-[#25D366] px-2.5 py-1 text-[11px] font-bold text-white hover:opacity-90">
                    WhatsApp
                  </a>
                  {r.user_id && (
                    <Link href={adminHref(`/customers/${r.user_id}`)} className="block text-[11px] font-semibold text-primary underline">
                      Customer profile
                    </Link>
                  )}
                </div>
              ) },
              { header: 'Looking at', cell: (r) => (
                <div className="text-xs space-y-0.5 max-w-xs">
                  {r.context?.summary ? <p className="font-semibold text-gray-800">{r.context.summary}</p> : null}
                  {r.context?.area || r.context?.pincode ? <p className="text-gray-600">{[r.context.area, r.context.pincode].filter(Boolean).join(' ')}</p> : null}
                  <p className="text-gray-400">{r.source || '—'}</p>
                </div>
              ) },
              { header: 'Progress', cell: (r) => (
                <div className="text-xs space-y-1">
                  {r.ordered_at ? <StatusBadge value="active" label="ordered" /> : r.verified_at ? <StatusBadge value="pending" label="signed in" /> : <StatusBadge value="draft" label="code sent" />}
                  <p className="text-gray-500">{r.code_requests} code{r.code_requests > 1 ? 's' : ''} · last {fmtDate(r.last_seen_at, true)}</p>
                  <p className="text-gray-400">first {fmtDate(r.first_seen_at, true)}</p>
                </div>
              ) },
              { header: 'Follow-up', cell: (r) => (
                <ActionForm action={updateLead} className="space-y-1.5 min-w-[200px]">
                  <input type="hidden" name="phone" value={r.phone} />
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                    <input type="checkbox" name="contacted" defaultChecked={!!r.contacted_at} />
                    Contacted{r.contacted_at ? ` (${fmtDate(r.contacted_at)})` : ''}
                  </label>
                  <input name="note" defaultValue={r.note ?? ''} maxLength={500} placeholder="Note (optional)"
                    className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs" />
                  <SubmitButton variant="secondary" className="!py-1 !px-2.5 !text-[11px]">Save</SubmitButton>
                </ActionForm>
              ) },
            ]}
          />
        )}
        <Pagination page={page} pageSize={PAGE} total={count ?? 0}
          hrefFor={(p) => `${base}?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), page: String(p) })}`} />
      </Card>
    </>
  );
}
