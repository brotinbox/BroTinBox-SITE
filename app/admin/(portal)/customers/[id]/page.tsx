import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { adminHref } from '@/lib/admin/paths';
import { Card, DataTable, EmptyState, PageHeader, StatCard, StatusBadge, fmtDate, inr } from '@/components/admin/ui';
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from '@/components/admin/forms';
import { getTrialEligibility, type TrialEligibility } from '@/lib/checkout/trial';
import { customersById, trialBoxDates, trialClaims, type TrialClaim } from '@/lib/admin/trials';
import { resetTrial } from '../../trials/actions';
import {
  addNote, setBlocked, setTags, staffAddCredit, staffCancelSubscription, staffPause, staffResume, staffSkipDelivery,
} from '../actions';

export const metadata = { title: 'Customer' };

type CustomerTrial = {
  eligibility: TrialEligibility | null;
  history: TrialClaim[];
  /** When their number matched someone else's trial: that trial and its customer. */
  other: (TrialClaim & { name: string | null }) | null;
  boxes: Map<string, { date: string | null; orderNumber: string }>;
};

async function loadCustomerTrial(userId: string): Promise<CustomerTrial> {
  // crm data via service role; requireStaff('customers.read') has run.
  const [eligibility, historyRes] = await Promise.all([
    getTrialEligibility(userId).catch(() => null),
    trialClaims().select('*').eq('user_id', userId).order('claimed_at', { ascending: false }),
  ]);
  const history = (historyRes.data ?? []) as TrialClaim[];
  let other: CustomerTrial['other'] = null;
  if (eligibility?.claim_id && eligibility.matched_on !== 'account') {
    const { data } = await trialClaims().select('*').eq('id', eligibility.claim_id).maybeSingle();
    if (data) {
      const people = await customersById([data.user_id]);
      other = { ...(data as TrialClaim), name: people.get(data.user_id)?.full_name ?? people.get(data.user_id)?.email ?? null };
    }
  }
  const boxes = await trialBoxDates([...history.map((c) => c.order_id), ...(other ? [other.order_id] : [])]);
  return { eligibility, history, other, boxes };
}

function TrialPanel({ trial, canReset }: { trial: CustomerTrial; canReset: boolean }) {
  const { eligibility: e, history, other, boxes } = trial;
  const active = history.find((c) => c.status !== 'released' && !c.is_override) ?? history.find((c) => c.status !== 'released');
  // Only this customer's own trial can be reset here; a shared-number block is lifted with an extra trial instead.
  const resettable = active ?? null;
  return (
    <div className="space-y-3 text-sm">
      {!e ? (
        <p className="text-gray-500">Could not load trial status.</p>
      ) : e.eligible && !e.own_pending ? (
        <p><StatusBadge value="active" label="can book a trial" /> <span className="text-xs text-gray-500 ml-1">No trial used yet.</span></p>
      ) : e.matched_on === 'account' ? (
        <div className="space-y-1">
          <StatusBadge value={e.status === 'used' ? 'paid' : 'pending_payment'} label={e.status === 'used' ? 'trial used' : 'trial awaiting payment'} />
          {active && (
            <p className="text-xs text-gray-600">
              Box {boxes.get(active.order_id)?.date ? fmtDate(boxes.get(active.order_id)!.date) : '—'} ·{' '}
              <Link href={adminHref(`/orders/${active.order_id}`)} className="text-primary underline">{boxes.get(active.order_id)?.orderNumber ?? 'order'}</Link>
              {active.delivered_at ? ' · delivered' : ''}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <StatusBadge value="pending" label="blocked: number already used" />
          <p className="text-xs text-gray-600">
            Their {e.matched_on === 'phone' ? 'mobile number' : 'delivery number'} matches a trial on{' '}
            {other ? <Link href={adminHref(`/customers/${other.user_id}`)} className="text-primary underline">{other.name || 'another account'}</Link> : 'another account'}
            {other && boxes.get(other.order_id)?.date ? ` (box ${fmtDate(boxes.get(other.order_id)!.date)})` : ''}. Usually the same person with two accounts.
          </p>
          <p className="text-xs text-gray-500">
            Genuinely a different person? Create their trial from{' '}
            <Link href={adminHref('/orders/new')} className="text-primary underline">New WhatsApp order</Link> with “Allow an extra trial” ticked.
          </p>
        </div>
      )}

      {history.some((c) => c.address_flag) && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          A trial was delivered to the same flat and pincode under a different number. Could be family or a flatmate; check before allowing another.
        </p>
      )}

      {history.length > 0 && (
        <ul className="text-xs text-gray-600 space-y-1 border-t border-gray-100 pt-2">
          {history.map((c) => (
            <li key={c.id}>
              <Link href={adminHref(`/orders/${c.order_id}`)} className="text-primary underline">{boxes.get(c.order_id)?.orderNumber ?? 'order'}</Link>
              {' · '}{c.status === 'used' ? 'used' : c.status === 'pending' ? 'awaiting payment' : 'released'}
              {c.is_override ? ' · extra trial' : ''}
              {c.release_reason ? ` (${c.release_reason})` : c.override_reason ? ` (“${c.override_reason}”)` : ''}
            </li>
          ))}
        </ul>
      )}

      {canReset && resettable && (
        <ActionForm action={resetTrial} className="space-y-1.5 border-t border-gray-100 pt-2">
          <input type="hidden" name="claim_id" value={resettable.id} />
          <Input name="reason" required minLength={4} maxLength={200} placeholder="Why give the trial back? e.g. refund, kitchen mistake" />
          <SubmitButton variant="secondary" confirm={{ eyebrow: 'Reset trial', title: 'Give this customer their trial back?', message: 'They’ll be able to book the trial box again.', confirmLabel: 'Reset trial' }}>
            Reset trial
          </SubmitButton>
          <p className="text-[11px] text-gray-500">Saved in the activity log with your name.</p>
        </ActionForm>
      )}
    </div>
  );
}

type Summary = { lifetime_value: number; orders_paid: number; meals_delivered: number; meals_skipped: number; meals_upcoming: number; first_order_at: string | null };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff('customers.read');
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const supabase = await getSupabaseServer();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const [profileRes, summaryRes, addresses, subs, upcoming, orders, notes, tags, activity, progress] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
    supabase.rpc('customer_summary', { p_customer: id }),
    supabase.from('addresses').select('*').eq('user_id', id).order('is_default', { ascending: false }),
    supabase.from('subscriptions').select('*, plans(name)').eq('user_id', id).order('created_at', { ascending: false }),
    supabase.from('deliveries').select('id, delivery_date, slot, status, diet, is_egg_free, skip_legume, is_make_up, subscription_id')
      .eq('user_id', id).gte('delivery_date', today).order('delivery_date').order('slot').limit(40),
    supabase.from('orders').select('id, order_number, status, total, created_at, type').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
    supabase.from('customer_notes').select('id, body, created_at, profiles!customer_notes_author_id_fkey(full_name, email)').eq('customer_id', id).order('created_at', { ascending: false }),
    supabase.from('customer_tags').select('tag').eq('customer_id', id),
    supabase.from('activity_log').select('id, action, entity, actor_role, created_at, before, after').eq('user_id', id).order('created_at', { ascending: false }).limit(60),
    supabase.from('progress_logs').select('log_date, weight_kg').eq('user_id', id).order('log_date', { ascending: false }).limit(8),
  ]);
  const trial = await loadCustomerTrial(id);

  const p = profileRes.data;
  if (!p) notFound();
  const s = (summaryRes.data ?? {}) as Summary;
  const live = (subs.data ?? []).filter((x) => x.status === 'active' || x.status === 'paused');
  const canWrite = staff.can('subscriptions.write');

  return (
    <>
      <PageHeader
        title={p.full_name || p.email || 'Customer'}
        description={`${/@phone\.brotinbox\.invalid$/.test(p.email ?? '') ? 'Phone sign-in' : (p.email ?? '')}${p.phone ? ` · ${p.phone}` : ''} · joined ${fmtDate(p.created_at)}`}
        actions={
          <>
            {p.role !== 'customer' && <StatusBadge value={p.role} />}
            {p.is_blocked && <StatusBadge value="rejected" label="blocked" />}
            {p.phone && (
              <a href={`https://wa.me/${p.phone.replace(/\D/g, '').replace(/^(\d{10})$/, '91$1')}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700">WhatsApp</a>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label="Lifetime value" value={inr(s.lifetime_value)} hint={`${s.orders_paid ?? 0} paid orders`} />
        <StatCard label="Meals delivered" value={s.meals_delivered ?? 0} />
        <StatCard label="Meals upcoming" value={s.meals_upcoming ?? 0} tone="good" />
        <StatCard label="Meals skipped" value={s.meals_skipped ?? 0} />
        <StatCard label="Customer since" value={s.first_order_at ? fmtDate(s.first_order_at) : '—'} hint="first paid order" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Subscriptions */}
          <Card title="Subscriptions" padded={false}>
            <DataTable
              rows={(subs.data ?? []) as any[]}
              rowKey={(r) => r.id}
              empty={<EmptyState title="No subscriptions" description="This customer has not ordered yet." />}
              columns={[
                { header: 'Plan', cell: (r) => <div><p className="font-semibold">{r.plans?.name ?? r.type}</p><p className="text-xs text-gray-500">{r.diet.replace('_', '-')} · {r.meals_per_day}/day · {r.meals_total} meals</p></div> },
                { header: 'Dates', cell: (r) => <span className="text-xs">{fmtDate(r.start_date)} → {fmtDate(r.end_date)}{r.paused_until && <><br />paused till {fmtDate(r.paused_until)}</>}</span> },
                { header: 'Delivered / skipped / credits', cell: (r) => <span className="text-xs">{r.meals_delivered} / {r.meals_skipped} / {r.meal_credits_issued}</span> },
                { header: 'Status', cell: (r) => <StatusBadge value={r.status} /> },
              ]}
            />
          </Card>

          {/* Plan controls */}
          {canWrite && live.map((sub) => (
            <Card key={sub.id} title={`Manage plan · ${sub.type} (${sub.status})`}>
              <div className="grid md:grid-cols-3 gap-4">
                {sub.status === 'active' ? (
                  <ActionForm action={staffPause} className="space-y-2">
                    <input type="hidden" name="subscription_id" value={sub.id} />
                    <p className="text-xs font-bold text-gray-700">Pause</p>
                    <Input type="date" name="from" required min={today} />
                    <Input type="date" name="until" required min={today} />
                    <SubmitButton variant="secondary" confirm={{ eyebrow: 'Pause plan', title: 'Pause this customer’s plan?', message: 'No meals go out between these dates.', confirmLabel: 'Pause plan' }}>Pause plan</SubmitButton>
                  </ActionForm>
                ) : (
                  <ActionForm action={staffResume} className="space-y-2">
                    <input type="hidden" name="subscription_id" value={sub.id} />
                    <p className="text-xs font-bold text-gray-700">Resume</p>
                    <p className="text-xs text-gray-500">Restores paused meals that are still before the cutoff.</p>
                    <SubmitButton variant="secondary">Resume now</SubmitButton>
                  </ActionForm>
                )}
                <ActionForm action={staffAddCredit} className="space-y-2" resetOnSuccess>
                  <input type="hidden" name="subscription_id" value={sub.id} />
                  <p className="text-xs font-bold text-gray-700">Add meal credits</p>
                  <div className="flex gap-2">
                    <Input type="number" name="count" min={1} max={30} defaultValue={1} className="w-20" />
                    <Select name="slot" options={sub.slots.map((sl: string) => ({ value: sl, label: sl }))} />
                  </div>
                  <Input name="reason" maxLength={300} placeholder="Reason (e.g. late delivery)" required />
                  <SubmitButton variant="secondary">Add meals</SubmitButton>
                </ActionForm>
                <ActionForm action={staffCancelSubscription} className="space-y-2">
                  <input type="hidden" name="subscription_id" value={sub.id} />
                  <p className="text-xs font-bold text-gray-700">Cancel plan</p>
                  <Input name="reason" maxLength={500} placeholder="Reason" />
                  <SubmitButton variant="danger" confirm={{ eyebrow: 'Cancel plan', tone: 'danger', title: 'Cancel this plan?', message: 'Future meals are removed. Refunds are manual. This can’t be undone.', confirmLabel: 'Cancel plan', cancelLabel: 'Keep plan' }}>Cancel plan</SubmitButton>
                </ActionForm>
              </div>
            </Card>
          ))}

          {/* Upcoming meals */}
          <Card title="Upcoming meals" padded={false}>
            <DataTable
              rows={(upcoming.data ?? []) as any[]}
              rowKey={(r) => r.id}
              empty={<EmptyState title="No upcoming meals" />}
              columns={[
                { header: 'Date', cell: (r) => <span className="whitespace-nowrap">{fmtDate(r.delivery_date)}</span> },
                { header: 'Slot', cell: (r) => <span className="capitalize">{r.slot}</span> },
                { header: 'Box', cell: (r) => <span className="text-xs">{r.diet.replace('_', '-')}{r.is_egg_free ? ' · egg-free' : ''}{r.skip_legume ? ' · no legume' : ''}{r.is_make_up ? ' · make-up' : ''}</span> },
                { header: 'Status', cell: (r) => <StatusBadge value={r.status} /> },
                { header: '', cell: (r) => canWrite && (r.status === 'scheduled' || r.status === 'skipped') ? (
                  <ActionForm action={staffSkipDelivery}>
                    <input type="hidden" name="delivery_id" value={r.id} />
                    <input type="hidden" name="undo" value={r.status === 'skipped' ? 'true' : 'false'} />
                    <SubmitButton variant="secondary" pendingText="…">{r.status === 'skipped' ? 'Undo skip' : 'Skip'}</SubmitButton>
                  </ActionForm>
                ) : null, className: 'text-right' },
              ]}
            />
          </Card>

          {/* Orders */}
          <Card title="Orders & payments" padded={false}>
            <DataTable
              rows={(orders.data ?? []) as any[]}
              rowKey={(r) => r.id}
              empty={<EmptyState title="No orders" />}
              columns={[
                { header: 'Order', cell: (r) => <Link className="font-bold text-primary" href={adminHref(`/orders/${r.id}`)}>{r.order_number}</Link> },
                { header: 'Plan', cell: (r) => <span className="capitalize">{r.type}</span> },
                { header: 'Placed', cell: (r) => fmtDate(r.created_at, true) },
                { header: 'Status', cell: (r) => <StatusBadge value={r.status === 'created' ? 'pending_payment' : r.status} /> },
                { header: 'Total', cell: (r) => inr(r.total), className: 'text-right' },
              ]}
            />
          </Card>

          {/* Timeline */}
          <Card title="Activity timeline">
            {(activity.data ?? []).length === 0 ? <EmptyState title="No activity yet" /> : (
              <ol className="relative border-l border-gray-200 ml-2 space-y-4">
                {(activity.data ?? []).map((a) => (
                  <li key={a.id} className="ml-4">
                    <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-primary/70 border-2 border-white" />
                    <p className="text-sm"><span className="font-semibold">{a.entity} · {a.action.replace(/_/g, ' ')}</span> <span className="text-xs text-gray-500">by {a.actor_role}</span></p>
                    <p className="text-xs text-gray-500">{fmtDate(a.created_at, true)}</p>
                    {a.after && <pre className="mt-1 text-[11px] text-gray-600 bg-gray-50 rounded-lg p-2 overflow-x-auto max-w-full">{JSON.stringify(a.after)}</pre>}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Trial box">
            <TrialPanel trial={trial} canReset={staff.can('orders.refund')} />
          </Card>

          <Card title="Profile">
            <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
              <dt className="text-gray-500">Goal</dt><dd>{p.goal ?? '—'}</dd>
              <dt className="text-gray-500">Diet</dt><dd>{p.diet_type ?? '—'}</dd>
              <dt className="text-gray-500">Gender</dt><dd>{p.gender ?? '—'}</dd>
              <dt className="text-gray-500">Height</dt><dd>{p.height_cm ? `${p.height_cm} cm` : '—'}</dd>
              <dt className="text-gray-500">Weight</dt><dd>{p.weight_kg ? `${p.weight_kg} kg` : '—'}{p.target_weight_kg ? ` → ${p.target_weight_kg}` : ''}</dd>
              <dt className="text-gray-500">Activity</dt><dd>{p.activity_level ?? '—'}</dd>
              <dt className="text-gray-500">Targets</dt><dd>{p.target_calories ? `${p.target_calories} kcal · ${p.target_protein} g P` : '—'}</dd>
              <dt className="text-gray-500">Allergies</dt><dd>{p.allergies?.length ? p.allergies.join(', ') : 'none'}</dd>
              <dt className="text-gray-500">Dislikes</dt><dd>{p.disliked_ingredients?.length ? p.disliked_ingredients.join(', ') : 'none'}</dd>
              <dt className="text-gray-500">WhatsApp updates</dt><dd>{p.whatsapp_opt_in ? 'yes' : 'no'}</dd>
              <dt className="text-gray-500">WhatsApp offers</dt><dd>{p.whatsapp_offers_opt_in ? `yes${p.whatsapp_offers_opt_in_at ? ` (since ${fmtDate(p.whatsapp_offers_opt_in_at)})` : ''}` : 'no'}</dd>
              <dt className="text-gray-500">Referral code</dt><dd className="font-mono text-xs">{p.referral_code}</dd>
              <dt className="text-gray-500">Last seen</dt><dd>{fmtDate(p.last_seen_at, true)}</dd>
            </dl>
            {(progress.data ?? []).length > 0 && (
              <p className="text-xs text-gray-600 mt-3">Weight log: {(progress.data ?? []).map((l) => `${l.weight_kg ?? '—'} kg (${fmtDate(l.log_date)})`).join(' · ')}</p>
            )}
          </Card>

          <Card title="Addresses">
            {(addresses.data ?? []).length === 0 ? <p className="text-sm text-gray-500">No address saved.</p> : (
              <ul className="space-y-3 text-sm">
                {(addresses.data ?? []).map((a) => (
                  <li key={a.id}>
                    <p className="font-semibold">{a.label}{a.is_default && <span className="ml-1 text-[10px] font-bold text-primary">DEFAULT</span>}</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{a.recipient_name} · {a.phone}<br />{a.flat}, {a.street}{a.landmark ? `, ${a.landmark}` : ''}<br />{a.area}, {a.city} {a.pincode}</p>
                    {a.instructions && <p className="text-xs text-gray-500 italic mt-0.5">“{a.instructions}”</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {staff.can('customers.notes') && (
            <Card title="Tags">
              <ActionForm action={setTags} className="space-y-2">
                <input type="hidden" name="customer_id" value={p.id} />
                <Input name="tags" defaultValue={(tags.data ?? []).map((t) => t.tag).join(', ')} placeholder="VIP, gym partner, complaint" maxLength={400} />
                <SubmitButton variant="secondary">Save tags</SubmitButton>
              </ActionForm>
            </Card>
          )}

          {staff.can('customers.notes') && (
            <Card title="Internal notes">
              <ActionForm action={addNote} className="space-y-2" resetOnSuccess>
                <input type="hidden" name="customer_id" value={p.id} />
                <Textarea name="body" maxLength={5000} placeholder="Only staff can see notes." required />
                <SubmitButton variant="secondary">Add note</SubmitButton>
              </ActionForm>
              <ul className="mt-4 space-y-3">
                {(notes.data ?? []).map((n: any) => (
                  <li key={n.id} className="text-sm border-l-2 border-gray-200 pl-3">
                    <p className="whitespace-pre-wrap">{n.body}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{n.profiles?.full_name || n.profiles?.email || 'Staff'} · {fmtDate(n.created_at, true)}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {staff.can('customers.write') && p.role === 'customer' && (
            <Card title="Account">
              <ActionForm action={setBlocked}>
                <input type="hidden" name="customer_id" value={p.id} />
                <input type="hidden" name="blocked" value={p.is_blocked ? 'false' : 'true'} />
                <Field label={p.is_blocked ? 'This account is blocked' : 'Block this account'} hint="Blocked customers cannot sign in, order or change meals.">
                  <SubmitButton variant={p.is_blocked ? 'secondary' : 'danger'} confirm={p.is_blocked ? undefined : { eyebrow: 'Block customer', tone: 'danger', title: 'Block this customer?', message: 'They won’t be able to place orders until unblocked.', confirmLabel: 'Block', cancelLabel: 'Go back' }}>
                    {p.is_blocked ? 'Unblock' : 'Block customer'}
                  </SubmitButton>
                </Field>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
