import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth/session';
import { adminHref } from '@/lib/admin/paths';
import { getSupabaseService } from '@/lib/supabase/admin';
import { getPartnerProgram, loadPartnerActivity, partnersTable, type Partner } from '@/lib/partners/server';
import { commissionStage, suggestPartnerCode, todayIst } from '@/lib/partners/program';
import { referralLink } from '@/lib/referral';
import { BRAND } from '@/config/brand';
import { Card, DataTable, EmptyState, PageHeader, StatCard, StatusBadge, fmtDate, inr } from '@/components/admin/ui';
import { ActionForm, Field, Input, SubmitButton, Textarea } from '@/components/admin/forms';
import { approvePartner, markPartnerPaid, savePartnerNote, setPartnerStatus, voidCommission } from '../actions';

export const metadata = { title: 'Partner' };

const STAGE_LABEL = { pending: 'pending', approved: 'ready to pay', paid: 'paid', void: 'void' } as const;

export default async function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff('customers.read');
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data } = await partnersTable().select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  const p = data as Partner;
  const canWrite = staff.can('customers.write');

  const [program, activity] = await Promise.all([getPartnerProgram(), loadPartnerActivity(p.id)]);
  const { customers, commissions, payouts, names, summary } = activity;
  const today = todayIst();
  const ready = commissions.filter((c) => commissionStage(c, today) === 'approved');
  const readyTotal = Math.round(ready.reduce((s, c) => s + c.amount, 0) * 100) / 100;

  const orderIds = commissions.map((c) => c.order_id);
  const { data: orders } = orderIds.length
    ? await getSupabaseService().from('orders').select('id, order_number, status, total').in('id', orderIds)
    : { data: [] as { id: string; order_number: string; status: string; total: number }[] };
  const orderById = new Map((orders ?? []).map((o) => [o.id, o]));

  const firstName = p.full_name.split(' ')[0];
  const welcome = p.code
    ? `Hi ${firstName}! You're in: welcome to the ${BRAND.name} trainer partner programme. Your code is ${p.code}. Share this link with your clients: ${referralLink(p.code)} . Your dashboard (sign in with this number): ${BRAND.siteUrl.replace(/\/$/, '')}/partner`
    : '';

  return (
    <>
      <PageHeader
        title={p.full_name}
        description={`${p.gym_name}, ${p.gym_area} ${p.gym_pincode} · applied ${fmtDate(p.created_at)}`}
        actions={<Link href={adminHref('/partners')} className="text-xs font-bold text-primary underline">All partners</Link>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <StatCard label="Clients" value={String(summary.clients)} hint={`${summary.clientsThisMonth} this month`} />
        <StatCard label="New plans this month" value={String(summary.firstPlansThisMonth)} />
        <StatCard label="Ready to pay" value={inr(readyTotal)} tone={readyTotal >= program.minPayout ? 'good' : 'default'} hint={`min ${inr(program.minPayout)}`} />
        <StatCard label="Pending" value={inr(summary.pending)} hint={`${program.holdDays}-day hold`} />
        <StatCard label="Paid so far" value={inr(summary.paid)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card title="Commissions" padded={false}>
            <DataTable
              rows={commissions}
              rowKey={(c) => c.id}
              empty={<EmptyState title="No commissions yet" description="They appear when a linked client pays for a weekly or monthly plan." />}
              columns={[
                { header: 'Order', cell: (c) => {
                  const o = orderById.get(c.order_id);
                  return (
                    <div className="text-xs space-y-0.5">
                      <Link href={adminHref(`/orders/${c.order_id}`)} className="font-mono font-bold text-primary underline">{o?.order_number ?? 'order'}</Link>
                      <p className="text-gray-500">{fmtDate(c.created_at)}{o && o.status !== 'paid' ? ` · order ${o.status.replace(/_/g, ' ')}` : ''}</p>
                    </div>
                  );
                } },
                { header: 'Client', cell: (c) => (
                  <Link href={adminHref(`/customers/${c.customer_id}`)} className="text-xs font-semibold text-gray-800 underline">{names.get(c.customer_id)?.full_name || 'Customer'}</Link>
                ) },
                { header: 'Plan', cell: (c) => <span className="text-xs">{c.plan_type} · {c.kind === 'first_plan' ? `first plan${c.tier ? ` (tier ${c.tier})` : ''}` : 'renewal'}</span> },
                { header: 'Amount', cell: (c) => <span className="font-bold text-sm">{inr(c.amount)}</span> },
                { header: 'Status', cell: (c) => {
                  const stage = commissionStage(c, today);
                  return (
                    <div className="text-xs space-y-1">
                      <StatusBadge value={stage === 'approved' ? 'approved' : stage === 'void' ? 'rejected' : stage} label={STAGE_LABEL[stage]} />
                      {stage === 'pending' && <p className="text-gray-500">from {fmtDate(c.hold_until)}</p>}
                      {c.void_reason && <p className="text-gray-500">{c.void_reason}</p>}
                      {canWrite && c.status === 'pending' && (
                        <ActionForm action={voidCommission}>
                          <input type="hidden" name="id" value={c.id} />
                          <SubmitButton variant="secondary" className="!py-0.5 !px-2 !text-[10px]" confirm={{ title: 'Cancel this commission?', message: 'Use this for fake or self orders, or a plan that was mostly refunded.', confirmLabel: 'Cancel it', tone: 'danger' }}>Void</SubmitButton>
                        </ActionForm>
                      )}
                    </div>
                  );
                } },
              ]}
            />
          </Card>

          <Card title={`Clients (${customers.length})`} padded={false}>
            <DataTable
              rows={customers}
              rowKey={(c) => c.customer_id}
              empty={<EmptyState title="No clients yet" />}
              columns={[
                { header: 'Client', cell: (c) => (
                  <div className="text-xs">
                    <Link href={adminHref(`/customers/${c.customer_id}`)} className="font-semibold text-primary underline">{names.get(c.customer_id)?.full_name || 'Customer'}</Link>
                    <p className="font-mono text-gray-500">{names.get(c.customer_id)?.phone ?? ''}</p>
                  </div>
                ) },
                { header: 'Linked', cell: (c) => <span className="text-xs">{fmtDate(c.linked_at)} → {fmtDate(c.linked_until)}</span> },
                { header: 'First order', cell: (c) => c.first_order_id ? <Link href={adminHref(`/orders/${c.first_order_id}`)} className="text-xs text-primary underline">View</Link> : <span className="text-xs text-gray-400">—</span> },
              ]}
            />
          </Card>

          <Card title="Payouts" padded={false}>
            <DataTable
              rows={payouts}
              rowKey={(x) => x.id}
              empty={<EmptyState title="No payouts yet" />}
              columns={[
                { header: 'Date', cell: (x) => <span className="text-xs">{fmtDate(x.paid_at)}</span> },
                { header: 'Amount', cell: (x) => <span className="font-bold text-sm">{inr(x.amount)}</span> },
                { header: 'UPI', cell: (x) => <span className="text-xs font-mono">{x.upi_id ?? '—'}</span> },
                { header: 'Reference', cell: (x) => <span className="text-xs font-mono">{x.reference}{x.note ? <span className="block font-sans text-gray-500">{x.note}</span> : null}</span> },
              ]}
            />
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Partner">
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2"><StatusBadge value={p.status} />{p.code && <span className="font-mono font-bold text-sm">{p.code}</span>}</div>
              <p><span className="text-gray-500">Phone</span> <span className="font-mono">{p.phone}</span></p>
              {p.email && <p><span className="text-gray-500">Email</span> {p.email}</p>}
              {p.instagram && <p><span className="text-gray-500">Instagram</span> <a className="text-primary underline" href={`https://instagram.com/${encodeURIComponent(p.instagram)}`} target="_blank" rel="noopener noreferrer">@{p.instagram}</a></p>}
              {p.gym_maps_url && <p><a className="text-primary underline" href={p.gym_maps_url} target="_blank" rel="noopener noreferrer">Gym on Google Maps</a></p>}
              <p><span className="text-gray-500">Experience</span> {p.years_training} yrs · ~{p.active_clients} clients</p>
              {p.pitch && <p className="italic text-gray-600">“{p.pitch}”</p>}
              <p><span className="text-gray-500">UPI</span> {p.upi_id ? <span className="font-mono">{p.upi_id}{p.upi_name ? ` (${p.upi_name})` : ''}</span> : <span className="text-amber-700">not added yet</span>}</p>
              <p className="text-gray-400">Terms {p.terms_version} accepted {fmtDate(p.terms_accepted_at)}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <a href={`https://wa.me/${p.phone.replace(/\D/g, '')}${welcome && p.status === 'approved' ? `?text=${encodeURIComponent(welcome)}` : ''}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex rounded-lg bg-[#25D366] px-2.5 py-1 text-[11px] font-bold text-white hover:opacity-90">
                  {p.status === 'approved' ? 'Send "You\'re in" on WhatsApp' : 'WhatsApp'}
                </a>
              </div>
            </div>
          </Card>

          {canWrite && (
            <Card title={p.status === 'approved' ? 'Code' : 'Decision'}>
              <div className="space-y-3">
                {p.status !== 'rejected' && (
                  <ActionForm action={approvePartner} className="space-y-2">
                    <input type="hidden" name="id" value={p.id} />
                    <Field label="Partner code" hint="4–20 letters or numbers. Changing it stops the old code working.">
                      <Input name="code" defaultValue={p.code ?? suggestPartnerCode(p.full_name)} maxLength={20} required className="font-mono uppercase" />
                    </Field>
                    <SubmitButton>{p.status === 'approved' ? 'Save code' : p.status === 'paused' ? 'Resume with this code' : 'Approve'}</SubmitButton>
                  </ActionForm>
                )}
                <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                  {p.status === 'approved' && (
                    <ActionForm action={setPartnerStatus}>
                      <input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value="paused" />
                      <SubmitButton variant="secondary" confirm={{ title: `Pause ${p.code}?`, message: 'The code stops working at checkout and linked clients stop earning commission until you resume.', confirmLabel: 'Pause' }}>Pause</SubmitButton>
                    </ActionForm>
                  )}
                  {(p.status === 'pending' || p.status === 'paused') && (
                    <ActionForm action={setPartnerStatus}>
                      <input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value="rejected" />
                      <SubmitButton variant="danger" confirm={{ title: `Reject ${p.full_name}?`, confirmLabel: 'Reject', tone: 'danger' }}>Reject</SubmitButton>
                    </ActionForm>
                  )}
                  {p.status === 'rejected' && (
                    <ActionForm action={setPartnerStatus}>
                      <input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value="pending" />
                      <SubmitButton variant="secondary">Reopen application</SubmitButton>
                    </ActionForm>
                  )}
                </div>
              </div>
            </Card>
          )}

          {canWrite && (
            <Card title="Mark paid">
              {readyTotal > 0 ? (
                <ActionForm action={markPartnerPaid} className="space-y-3" resetOnSuccess>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="expected" value={readyTotal} />
                  <p className="text-sm">Pay <strong>{inr(readyTotal)}</strong> for {ready.length} plan{ready.length === 1 ? '' : 's'} to <span className="font-mono">{p.upi_id ?? 'their UPI (not added yet)'}</span>.</p>
                  {readyTotal < program.minPayout && <p className="text-xs text-amber-700">Below the {inr(program.minPayout)} minimum. Usually this waits for next month.</p>}
                  <Field label="UPI transaction reference"><Input name="reference" required minLength={4} maxLength={60} placeholder="12-digit UTR" /></Field>
                  <Field label="Note (optional)"><Input name="note" maxLength={300} placeholder="e.g. November payout" /></Field>
                  <SubmitButton confirm={{ title: `Record ${inr(readyTotal)} paid?`, message: 'Send the UPI payment first, then record it here.', confirmLabel: 'Record payout' }}>Record payout</SubmitButton>
                </ActionForm>
              ) : (
                <p className="text-xs text-gray-500">Nothing ready to pay. Commissions become payable {program.holdDays} days after the plan starts.</p>
              )}
            </Card>
          )}

          <Card title="Staff note">
            <ActionForm action={savePartnerNote} className="space-y-2">
              <input type="hidden" name="id" value={p.id} />
              <Textarea name="note" defaultValue={p.admin_note ?? ''} maxLength={1000} placeholder="Call notes, gym visit, why approved / paused" disabled={!canWrite} />
              {canWrite && <SubmitButton variant="secondary">Save note</SubmitButton>}
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}
