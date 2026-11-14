import Link from 'next/link';
import { requireStaff } from '@/lib/auth/session';
import { adminHref } from '@/lib/admin/paths';
import { partnerCommissionsTable, partnerCustomersTable, partnersTable, type Partner } from '@/lib/partners/server';
import { suggestPartnerCode, todayIst } from '@/lib/partners/program';
import { Card, DataTable, EmptyState, PageHeader, StatCard, StatusBadge, fmtDate, inr } from '@/components/admin/ui';
import { FilterBar, likePattern } from '@/components/admin/FilterBar';
import { ActionForm, SubmitButton } from '@/components/admin/forms';
import { approvePartner, setPartnerStatus } from './actions';

export const metadata = { title: 'Partners' };

const TABS = [
  { value: '', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'paused', label: 'Paused' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

export default async function PartnersAdminPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireStaff('customers.read');
  const sp = await searchParams;
  const q = (sp.q ?? '').trim().slice(0, 40);
  const status = ['approved', 'paused', 'rejected', 'all'].includes(sp.status ?? '') ? sp.status! : '';

  let query = partnersTable().select('*').order('created_at', { ascending: false }).limit(200);
  if (status === '') query = query.eq('status', 'pending');
  else if (status !== 'all') query = query.eq('status', status);
  if (q) {
    const like = likePattern(q);
    query = query.or(`full_name.ilike.${like},gym_name.ilike.${like},code.ilike.${like},phone.ilike.${like}`);
  }
  const { data, error } = await query;
  const partners = (data ?? []) as Partner[];

  // Clients and money per partner (small numbers: fetched in one go).
  const ids = partners.map((p) => p.id);
  const [links, comms, counts] = await Promise.all([
    ids.length ? partnerCustomersTable().select('partner_id').in('partner_id', ids) : Promise.resolve({ data: [] }),
    ids.length ? partnerCommissionsTable().select('partner_id, amount, status, hold_until').in('partner_id', ids) : Promise.resolve({ data: [] }),
    partnersTable().select('status'),
  ]);
  const clients = new Map<string, number>();
  for (const l of (links.data ?? []) as { partner_id: string }[]) clients.set(l.partner_id, (clients.get(l.partner_id) ?? 0) + 1);
  const owed = new Map<string, { ready: number; pending: number }>();
  const today = todayIst();
  for (const c of (comms.data ?? []) as { partner_id: string; amount: number; status: string; hold_until: string }[]) {
    if (c.status !== 'pending') continue;
    const o = owed.get(c.partner_id) ?? { ready: 0, pending: 0 };
    if (c.hold_until <= today) o.ready += Number(c.amount); else o.pending += Number(c.amount);
    owed.set(c.partner_id, o);
  }
  const byStatus = new Map<string, number>();
  for (const r of (counts.data ?? []) as { status: string }[]) byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);

  const base = adminHref('/partners');
  return (
    <>
      <PageHeader
        title="Partners"
        description="Personal trainers who share BroTin Box with their clients. Check each application (call, Instagram, gym visit), then approve with a code. Pausing stops the code and new commission at once."
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label="Waiting for review" value={String(byStatus.get('pending') ?? 0)} tone={(byStatus.get('pending') ?? 0) > 0 ? 'warn' : 'default'} />
        <StatCard label="Approved" value={String(byStatus.get('approved') ?? 0)} tone="good" />
        <StatCard label="Paused" value={String(byStatus.get('paused') ?? 0)} />
        <StatCard label="Rejected" value={String(byStatus.get('rejected') ?? 0)} />
      </div>

      <FilterBar action={base} q={q} current={status} searchPlaceholder="Name, gym, code or phone" tabs={TABS} />

      <Card padded={false}>
        {error ? (
          <EmptyState title="Partner tables not set up yet" description="Run the migration 20261114000039_partner_program.sql in Supabase." />
        ) : (
          <DataTable
            rows={partners}
            rowKey={(r) => r.id}
            empty={<EmptyState title="No partners here" description={q ? 'Try another search.' : 'Applications from /partners appear here.'} />}
            columns={[
              { header: 'Trainer', cell: (r) => (
                <div className="space-y-1 min-w-[180px]">
                  <Link href={adminHref(`/partners/${r.id}`)} className="font-bold text-sm text-primary underline">{r.full_name}</Link>
                  <p className="font-mono text-xs text-gray-600">{r.phone.replace(/^\+91/, '+91 ')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <a href={`https://wa.me/${r.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex rounded-lg bg-[#25D366] px-2 py-0.5 text-[11px] font-bold text-white hover:opacity-90">WhatsApp</a>
                    {r.instagram && (
                      <a href={`https://instagram.com/${encodeURIComponent(r.instagram)}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex rounded-lg border border-gray-200 px-2 py-0.5 text-[11px] font-bold text-gray-700 hover:bg-gray-50">@{r.instagram}</a>
                    )}
                  </div>
                </div>
              ) },
              { header: 'Gym', cell: (r) => (
                <div className="text-xs space-y-0.5 max-w-[220px]">
                  <p className="font-semibold text-gray-800">{r.gym_name}</p>
                  <p className="text-gray-600">{r.gym_area} {r.gym_pincode}</p>
                  {r.gym_maps_url && <a href={r.gym_maps_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">Map</a>}
                  <p className="text-gray-500">{r.years_training} yrs · ~{r.active_clients} clients</p>
                  {r.pitch && <p className="text-gray-500 italic">“{r.pitch}”</p>}
                </div>
              ) },
              { header: 'Status', cell: (r) => {
                const o = owed.get(r.id);
                return (
                  <div className="text-xs space-y-1">
                    <StatusBadge value={r.status} />
                    {r.code && <p className="font-mono font-bold text-gray-800">{r.code}</p>}
                    <p className="text-gray-500">{clients.get(r.id) ?? 0} clients</p>
                    {o && (o.ready > 0 || o.pending > 0) && <p className="text-gray-700">To pay {inr(o.ready)}{o.pending ? ` · ${inr(o.pending)} pending` : ''}</p>}
                    <p className="text-gray-400">applied {fmtDate(r.created_at)}</p>
                  </div>
                );
              } },
              { header: 'Decision', cell: (r) => (
                <div className="space-y-2 min-w-[210px]">
                  {r.status !== 'approved' && r.status !== 'rejected' && (
                    <ActionForm action={approvePartner} className="flex gap-1.5 items-start flex-wrap">
                      <input type="hidden" name="id" value={r.id} />
                      <input name="code" defaultValue={r.code ?? suggestPartnerCode(r.full_name)} maxLength={20} required
                        className="w-28 rounded-lg border border-gray-200 px-2 py-1 text-xs font-mono uppercase" />
                      <SubmitButton className="!py-1 !px-2.5 !text-[11px]">{r.status === 'paused' ? 'Resume' : 'Approve'}</SubmitButton>
                    </ActionForm>
                  )}
                  <div className="flex gap-1.5 flex-wrap">
                    {r.status === 'pending' && (
                      <ActionForm action={setPartnerStatus}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value="rejected" />
                        <SubmitButton variant="secondary" className="!py-1 !px-2.5 !text-[11px]" confirm={{ title: `Reject ${r.full_name}?`, confirmLabel: 'Reject' }}>Reject</SubmitButton>
                      </ActionForm>
                    )}
                    {r.status === 'approved' && (
                      <ActionForm action={setPartnerStatus}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value="paused" />
                        <SubmitButton variant="secondary" className="!py-1 !px-2.5 !text-[11px]" confirm={{ title: `Pause ${r.code}?`, message: 'The code stops working at checkout and linked clients stop earning commission until you resume.', confirmLabel: 'Pause' }}>Pause</SubmitButton>
                      </ActionForm>
                    )}
                    {r.status === 'rejected' && (
                      <ActionForm action={setPartnerStatus}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value="pending" />
                        <SubmitButton variant="secondary" className="!py-1 !px-2.5 !text-[11px]">Reopen</SubmitButton>
                      </ActionForm>
                    )}
                    <Link href={adminHref(`/partners/${r.id}`)} className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-800 hover:bg-gray-50">Details</Link>
                  </div>
                </div>
              ) },
            ]}
          />
        )}
      </Card>
    </>
  );
}
