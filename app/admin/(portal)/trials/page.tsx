import Link from 'next/link';
import { requireStaff } from '@/lib/auth/session';
import { adminHref } from '@/lib/admin/paths';
import { Card, DataTable, EmptyState, PageHeader, Pagination, StatCard, StatusBadge, fmtDate } from '@/components/admin/ui';
import { FilterBar } from '@/components/admin/FilterBar';
import { ActionForm, Input, SubmitButton } from '@/components/admin/forms';
import {
  TEMPLATE_LABEL, autoMessagesFor, convertedCustomers, customersById, showPhone, trialAttempts, trialBoxDates, trialClaims, waNumber,
  type TrialAttempt, type TrialClaim,
} from '@/lib/admin/trials';
import { markTrialFollowedUp, resetTrial, setTrialFollowupOptOut } from './actions';

export const metadata = { title: 'Trials' };
const PAGE = 25;

const TABS = [
  { value: '', label: 'Follow up' },
  { value: 'converted', label: 'Subscribed' },
  { value: 'all', label: 'All trials' },
  { value: 'blocked', label: 'Blocked repeats' },
];

const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const daysSince = (d: string | null) => (d ? Math.floor((Date.parse(todayIST()) - Date.parse(d)) / 86400_000) : null);

/** Personal, one-to-one follow-up text (not a broadcast). */
function followUpText(name: string | null, boxDate: string | null) {
  const first = (name ?? '').split(' ')[0];
  const hi = first ? `Hi ${first}!` : 'Hi!';
  const upcoming = boxDate && boxDate >= todayIST();
  return upcoming
    ? `${hi} This is BroTin Box. Your trial box is on its way on ${fmtDate(boxDate)}. If you'd like the meals to continue after that, our Weekly and Monthly plans cost less per meal. Happy to help you pick one.`
    : `${hi} This is BroTin Box. How did you find your trial box? We'd love your feedback. If you'd like to continue, our Weekly and Monthly plans cost less per meal than the trial. Happy to help you pick one.`;
}

const MATCHED: Record<string, string> = { account: 'same account', phone: 'same mobile number', address_phone: 'same delivery number' };

export default async function TrialsPage({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string; q?: string }> }) {
  const staff = await requireStaff('customers.read');
  const sp = await searchParams;
  const tab = ['converted', 'all', 'blocked'].includes(sp.tab ?? '') ? sp.tab! : '';
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q ?? '').replace(/\D/g, '').slice(-10);
  const canWrite = staff.can('customers.write');
  const canReset = staff.can('orders.refund');

  // crm schema is service-role only; requireStaff above has checked customers.read.
  // Volumes are small (one row per trial), so the lists are built in memory.
  const since7 = new Date(Date.now() - 7 * 86400_000).toISOString();
  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [claimsRes, attemptsRes, blocked7] = await Promise.all([
    trialClaims().select('*').order('claimed_at', { ascending: false }).limit(1000),
    tab === 'blocked'
      ? trialAttempts().select('*', { count: 'exact' }).order('created_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1)
      : Promise.resolve({ data: [] as TrialAttempt[], count: 0, error: null }),
    trialAttempts().select('id', { count: 'exact', head: true }).gte('created_at', since7),
  ]);

  const claims = (claimsRes.data ?? []) as TrialClaim[];
  const attempts = (attemptsRes.data ?? []) as TrialAttempt[];
  const used = claims.filter((c) => c.status === 'used');
  const claimById = new Map(claims.map((c) => [c.id, c]));

  const [people, converted, boxes, autoMsgs] = await Promise.all([
    customersById([...claims.map((c) => c.user_id), ...attempts.map((a) => a.user_id ?? '')]),
    convertedCustomers([...new Set(used.map((c) => c.user_id))]),
    trialBoxDates(claims.map((c) => c.order_id)),
    autoMessagesFor(used.map((c) => c.id)),
  ]);

  const waiting = used.filter((c) => !converted.has(c.user_id) && !c.followup_opt_out);
  let rows: TrialClaim[] =
    tab === 'converted' ? used.filter((c) => converted.has(c.user_id))
      : tab === 'all' ? claims
        : waiting.sort((a, b) => (boxes.get(b.order_id)?.date ?? '').localeCompare(boxes.get(a.order_id)?.date ?? ''));
  if (q) rows = rows.filter((c) => (c.phone ?? '').includes(q) || (c.address_phone ?? '').includes(q) || (people.get(c.user_id)?.phone ?? '').includes(q));
  const total = tab === 'blocked' ? (attemptsRes.count ?? 0) : rows.length;
  const pageRows = rows.slice((page - 1) * PAGE, page * PAGE);

  const usedLast30 = used.filter((c) => (c.used_at ?? c.claimed_at) >= since30).length;
  const convRate = used.length ? Math.round((used.filter((c) => converted.has(c.user_id)).length / used.length) * 100) : 0;
  const flagged = claims.filter((c) => c.address_flag && c.status !== 'released').length;

  const base = adminHref('/trials');
  const customerCell = (userId: string | null, fallbackPhone?: string | null) => {
    const p = userId ? people.get(userId) : undefined;
    return (
      <div className="space-y-0.5">
        {userId ? (
          <Link href={adminHref(`/customers/${userId}`)} className="font-bold text-primary">{p?.full_name || p?.email || 'Customer'}</Link>
        ) : <span className="text-gray-500">Unknown</span>}
        <p className="text-xs font-mono text-gray-600">{showPhone(p?.phone ?? fallbackPhone)}</p>
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Trials"
        description="One trial box per customer. WhatsApp follow-ups go out automatically (feedback the day after, then up to two plan reminders for people who opted in to offers). Message personally too, and see who tried to book a second trial."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Trials paid (30 days)" value={String(usedLast30)} />
        <StatCard label="Went on to subscribe" value={`${convRate}%`} hint={`of ${used.length} trials`} tone="good" />
        <StatCard label="Waiting for follow-up" value={String(waiting.length)} tone={waiting.length ? 'warn' : 'default'} />
        <StatCard label="Repeat attempts blocked (7 days)" value={String(blocked7.count ?? 0)} hint={flagged ? `${flagged} trial${flagged > 1 ? 's' : ''} share an address` : undefined} />
      </div>

      <FilterBar action={base} q={sp.q ?? ''} param="tab" current={tab} searchPlaceholder="Phone number" tabs={TABS} />

      <Card padded={false}>
        {claimsRes.error ? (
          <EmptyState title="Trial tables not reachable" description="Check that migrations 0028 and 0029 ran and `crm` is in the exposed schemas." />
        ) : tab === 'blocked' ? (
          <DataTable
            rows={attempts}
            rowKey={(r) => r.id}
            empty={<EmptyState title="No blocked attempts" description="Shown here when someone tries to book a second trial." />}
            columns={[
              { header: 'Who tried', cell: (r) => customerCell(r.user_id, r.phone) },
              { header: 'Matched', cell: (r) => {
                const c = r.matched_claim_id ? claimById.get(r.matched_claim_id) : undefined;
                return (
                  <div className="text-xs space-y-0.5">
                    <p className="font-semibold">{MATCHED[r.matched_on ?? ''] ?? r.matched_on ?? '—'}</p>
                    {c && c.user_id !== r.user_id && (
                      <p className="text-gray-600">earlier trial by <Link href={adminHref(`/customers/${c.user_id}`)} className="text-primary underline">{people.get(c.user_id)?.full_name || 'another account'}</Link></p>
                    )}
                    {r.address_phone && r.address_phone !== r.phone && <p className="text-gray-500">delivery number {showPhone(r.address_phone)}</p>}
                  </div>
                );
              } },
              { header: 'Where', cell: (r) => <span className="text-xs">{r.source === 'admin' ? 'Staff order' : 'Website'}</span> },
              { header: 'When', cell: (r) => <span className="text-xs text-gray-600">{fmtDate(r.created_at, true)}</span> },
            ]}
          />
        ) : (
          <DataTable
            rows={pageRows}
            rowKey={(r) => r.id}
            empty={<EmptyState
              title={tab === '' ? 'Nobody waiting' : 'No trials here'}
              description={tab === '' ? 'Everyone who had a trial has subscribed or been followed up.' : q ? 'Try another number.' : 'Trials appear here once they are booked.'} />}
            columns={[
              { header: 'Customer', cell: (r) => {
                const p = people.get(r.user_id);
                const wa = waNumber(p?.phone ?? r.phone);
                return (
                  <div className="space-y-1.5">
                    {customerCell(r.user_id, r.phone)}
                    {wa && tab !== 'converted' && (
                      <a href={`https://wa.me/${wa}?text=${encodeURIComponent(followUpText(p?.full_name ?? null, boxes.get(r.order_id)?.date ?? null))}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-[#25D366] px-2.5 py-1 text-[11px] font-bold text-white hover:opacity-90">
                        WhatsApp
                      </a>
                    )}
                  </div>
                );
              } },
              { header: 'Trial box', cell: (r) => {
                const b = boxes.get(r.order_id);
                const ago = daysSince(b?.date ?? null);
                return (
                  <div className="text-xs space-y-1">
                    <p className="font-semibold">{b?.date ? fmtDate(b.date) : '—'}{ago !== null && ago >= 0 ? <span className="text-gray-500 font-normal"> · {ago === 0 ? 'today' : `${ago} day${ago > 1 ? 's' : ''} ago`}</span> : ago !== null ? <span className="text-gray-500 font-normal"> · upcoming</span> : null}</p>
                    <Link href={adminHref(`/orders/${r.order_id}`)} className="text-primary underline">{b?.orderNumber ?? 'Order'}</Link>
                    <div className="flex flex-wrap gap-1">
                      {r.delivered_at && <StatusBadge value="delivered" />}
                      {r.address_flag && <StatusBadge value="pending" label="shares an address" />}
                      {r.is_override && <StatusBadge value="draft" label="extra trial" />}
                    </div>
                    {r.is_override && r.override_reason && <p className="text-gray-500 italic">“{r.override_reason}”</p>}
                  </div>
                );
              } },
              tab === 'converted'
                ? { header: 'Subscribed', cell: (r) => {
                  const c = converted.get(r.user_id);
                  return c ? <div className="text-xs"><StatusBadge value="converted" label={c.type} /><p className="text-gray-500 mt-1">{fmtDate(c.paidAt)}</p></div> : '—';
                } }
                : { header: tab === 'all' ? 'Status' : 'Follow-up', cell: (r) => (
                  <div className="text-xs space-y-1.5 min-w-[170px]">
                    {tab === 'all' && (
                      <div className="space-y-0.5">
                        <StatusBadge value={r.status === 'used' ? 'paid' : r.status === 'pending' ? 'pending_payment' : 'cancelled'} label={r.status === 'used' ? (converted.has(r.user_id) ? 'used · subscribed' : 'used') : r.status === 'pending' ? 'awaiting payment' : 'released'} />
                        {r.release_reason && <p className="text-gray-500">{r.release_reason}</p>}
                      </div>
                    )}
                    {r.status === 'used' && !converted.has(r.user_id) && (
                      <>
                        <p className="text-gray-600">
                          {r.followup_opt_out ? 'Not interested / stopped' : r.followup_stage ? `Messaged ${r.followup_stage}× · last ${fmtDate(r.followup_sent_at)}` : 'Not messaged yet'}
                        </p>
                        {(autoMsgs.get(r.id) ?? []).length > 0 && (
                          <ul className="text-[11px] text-gray-500 space-y-0.5">
                            {(autoMsgs.get(r.id) ?? []).map((m) => (
                              <li key={`${m.stage}-${m.created_at}`}>
                                Auto · {TEMPLATE_LABEL[m.template.replace(/_v\d+$/, '')] ?? m.template}: <b className={m.status === 'failed' ? 'text-rose-700' : m.status === 'skipped' ? 'text-gray-500' : 'text-emerald-700'}>{m.status}</b>
                                {m.error_title ? ` (${m.error_title})` : ''} · {fmtDate(m.created_at)}
                              </li>
                            ))}
                          </ul>
                        )}
                        {canWrite && (
                          <div className="flex flex-wrap gap-1.5">
                            {!r.followup_opt_out && (
                              <ActionForm action={markTrialFollowedUp}>
                                <input type="hidden" name="claim_id" value={r.id} />
                                <SubmitButton variant="secondary" className="!py-1 !px-2.5 !text-[11px]">Mark messaged</SubmitButton>
                              </ActionForm>
                            )}
                            <ActionForm action={setTrialFollowupOptOut}>
                              <input type="hidden" name="claim_id" value={r.id} />
                              <input type="hidden" name="opt_out" value={r.followup_opt_out ? '0' : '1'} />
                              <SubmitButton variant="secondary" className="!py-1 !px-2.5 !text-[11px]">{r.followup_opt_out ? 'Follow up again' : 'Not interested'}</SubmitButton>
                            </ActionForm>
                          </div>
                        )}
                      </>
                    )}
                    {tab === 'all' && canReset && r.status !== 'released' && (
                      <ActionForm action={resetTrial} className="flex gap-1.5 pt-1">
                        <input type="hidden" name="claim_id" value={r.id} />
                        <Input name="reason" required minLength={4} maxLength={200} placeholder="Reason to reset" className="!py-1 !text-[11px]" />
                        <SubmitButton variant="secondary" className="!py-1 !px-2.5 !text-[11px]" confirm="Give this customer their trial back?">Reset</SubmitButton>
                      </ActionForm>
                    )}
                  </div>
                ) },
            ]}
          />
        )}
        <Pagination page={page} pageSize={PAGE} total={total}
          hrefFor={(p) => `${base}?${new URLSearchParams({ ...(tab ? { tab } : {}), ...(sp.q ? { q: sp.q } : {}), page: String(p) })}`} />
      </Card>
    </>
  );
}
