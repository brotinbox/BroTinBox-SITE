import Link from 'next/link';
import { ChevronRight, PauseCircle, PlayCircle, Wallet, XCircle } from 'lucide-react';
import { requireCustomer } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { cancelPlan, pausePlan, resumePlan } from '@/lib/customer/actions';
import { dateLabel, getMySubscriptions } from '@/lib/customer/data';
import { AccountShell } from '@/components/account/AccountNav';
import { Btn, CustomerForm } from '@/components/account/forms';
import { cn } from '@/lib/utils';
import { todayIST } from '@/lib/menu/rotation';

export const metadata = { title: 'My plan', robots: { index: false } };
export const dynamic = 'force-dynamic';

const STATUS: Record<string, { text: string; cls: string }> = {
  active: { text: 'Active', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  paused: { text: 'Paused', cls: 'bg-sky-50 text-sky-800 border-sky-200' },
  pending_payment: { text: 'Waiting for payment', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  completed: { text: 'Completed', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  cancelled: { text: 'Cancelled', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  expired: { text: 'Expired', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
};

type Sub = Awaited<ReturnType<typeof getMySubscriptions>>[number];
const planName = (s: Sub) => s.plans?.name ?? `${s.type} plan`;
const planLine = (s: Sub) =>
  `${s.meals_per_day} meal${s.meals_per_day > 1 ? 's' : ''} a day · ${s.diet === 'veg' ? 'Veg' : 'Non-veg'}${(s.preferences as { diet_variation?: string } | null)?.diet_variation === 'mixed' ? ' (mixed days)' : ''}`;

const rowCls = 'list-none cursor-pointer flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50';
const dateInput = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-ink focus:outline-none';

export default async function SubscriptionPage() {
  await requireCustomer('/subscription');
  const supabase = await getSupabaseServer();
  const [subs, earliest, maxPause] = await Promise.all([
    getMySubscriptions(),
    supabase.rpc('earliest_bookable_date', {}),
    supabase.from('site_settings').select('value').eq('key', 'max_pause_days').maybeSingle(),
  ]);
  const minDate = (earliest.data as string) ?? '';
  const pauseDays = Number(maxPause.data?.value ?? 30);
  const today = todayIST();
  // A plan whose last day has passed is history, even before the nightly job marks it completed.
  const ended = (s: Sub) => !!s.end_date && s.end_date < today;
  const active = subs.filter((s) => (s.status === 'active' || s.status === 'paused') && !ended(s));
  // Several unpaid checkouts for the same thing: show only the newest.
  const unpaid = subs.filter((s) => s.status === 'pending_payment').slice(0, 1);
  const current = [...active, ...unpaid];
  const past = subs.filter((s) => !current.includes(s) && s.status !== 'pending_payment');

  return (
    <AccountShell current="/subscription" title="My plan">
      <div className="space-y-5">
        {current.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center space-y-3">
            <span className="mx-auto w-12 h-12 rounded-2xl bg-sand text-ink flex items-center justify-center"><Wallet className="w-5 h-5" /></span>
            <div>
              <p className="font-heading font-black text-base text-gray-900">No active plan</p>
              <p className="text-xs text-gray-500 mt-0.5">Fresh meals 6 days a week. Skip or pause any day.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
              <Link href="/weekly" className="py-2.5 rounded-xl border border-gray-200 text-xs font-bold">Weekly plan</Link>
              <Link href="/monthly" className="py-2.5 rounded-xl bg-ink text-white text-xs font-bold">Monthly plan</Link>
            </div>
          </div>
        )}

        {current.map((s) => {
          const st = STATUS[s.status] ?? { text: s.status, cls: STATUS.completed.cls };
          const pct = s.meals_total ? Math.min(100, Math.round((s.meals_delivered / s.meals_total) * 100)) : 0;
          const left = Math.max(0, s.meals_total - s.meals_delivered);
          const manageable = s.status === 'active' || s.status === 'paused';
          return (
            <div key={s.id} className="space-y-3">
              {manageable ? (
                <section className="rounded-3xl bg-ink text-white p-5 relative overflow-hidden">
                  <span aria-hidden="true" className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-accent/25 blur-2xl" />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-accent-bright">Current plan</p>
                      <h2 className="font-heading font-black text-xl capitalize truncate mt-0.5">{planName(s)}</h2>
                      <p className="text-xs text-white/70 mt-0.5">{planLine(s)}</p>
                    </div>
                    <span className={cn('shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full',
                      s.status === 'paused' ? 'bg-sky-400/20 text-sky-200' : 'bg-emerald-400/20 text-emerald-200')}>{st.text}</span>
                  </div>

                  <div className="relative mt-5 flex items-end justify-between">
                    <p><span className="font-heading font-black text-4xl">{left}</span><span className="text-sm text-white/70"> meal{left === 1 ? '' : 's'} left</span></p>
                    <p className="text-xs text-white/60">{s.meals_delivered} of {s.meals_total} delivered</p>
                  </div>
                  <div className="relative mt-2 h-2 rounded-full bg-white/15 overflow-hidden"><div className="h-full rounded-full bg-accent-bright" style={{ width: `${Math.max(pct, 3)}%` }} /></div>

                  <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
                    {[
                      ['Started', dateLabel(s.start_date)],
                      ['Ends', s.end_date ? dateLabel(s.end_date) : '—'],
                      ['Skipped', `${s.meals_skipped} moved`],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-xl bg-white/10 px-2 py-2.5">
                        <p className="text-[11px] text-white/60">{k}</p>
                        <p className="text-xs font-bold mt-0.5">{v}</p>
                      </div>
                    ))}
                  </div>

                  {s.status === 'paused' && s.paused_until && (
                    <p className="relative mt-3 text-xs text-sky-100 bg-sky-400/15 rounded-xl px-3 py-2.5">
                      Paused {s.paused_from ? `${dateLabel(s.paused_from)} – ` : 'until '}{dateLabel(s.paused_until)}. Meals restart on their own after that.
                    </p>
                  )}
                </section>
              ) : (
                <Link href="/orders" className="block rounded-2xl border border-amber-200 bg-amber-50 p-4 tap-active">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">Almost there</p>
                      <h2 className="font-heading font-black text-lg text-ink capitalize truncate mt-0.5">{planName(s)}</h2>
                      <p className="text-xs text-gray-600 mt-0.5">{planLine(s)} · {s.meals_total} meals</p>
                    </div>
                    <span className={cn('shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border', st.cls)}>{st.text}</span>
                  </div>
                  <span className="mt-3 flex items-center justify-between rounded-xl bg-ink text-white px-4 py-3 text-sm font-bold">
                    Finish payment to start <ChevronRight className="w-4 h-4" />
                  </span>
                </Link>
              )}

              {manageable && (
                <section className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
                  <Link href="/my-plan" className={rowCls}>
                    <span className="w-9 h-9 rounded-xl bg-sand text-ink flex items-center justify-center shrink-0"><Wallet className="w-4 h-4" /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-gray-900">Skip or customise a meal</span>
                      <span className="block text-xs text-gray-500">Until 9 PM the night before</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>

                  {s.status === 'active' && (
                    <details className="group">
                      <summary className={rowCls}>
                        <span className="w-9 h-9 rounded-xl bg-sky-50 text-sky-800 flex items-center justify-center shrink-0"><PauseCircle className="w-4 h-4" /></span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-bold text-gray-900">Pause my plan</span>
                          <span className="block text-xs text-gray-500">Travelling? Up to {pauseDays} days. Meals move to the end.</span>
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90" />
                      </summary>
                      <CustomerForm action={pausePlan} className="px-4 pb-4 space-y-3">
                        <input type="hidden" name="subscription_id" value={s.id} />
                        <div className="grid grid-cols-2 gap-2">
                          <label className="text-[11px] font-bold text-gray-600">First day off<input type="date" name="from" min={minDate} required className={cn(dateInput, 'mt-1')} /></label>
                          <label className="text-[11px] font-bold text-gray-600">Last day off<input type="date" name="until" min={minDate} required className={cn(dateInput, 'mt-1')} /></label>
                        </div>
                        <Btn className="w-full py-3 text-sm" confirm={{ eyebrow: 'Pause plan', title: 'Pause your plan for these dates?', message: 'No meals arrive while paused. They pick up again automatically after.', confirmLabel: 'Pause plan', cancelLabel: 'Go back' }}>Pause plan</Btn>
                      </CustomerForm>
                    </details>
                  )}

                  {s.status === 'paused' && (
                    <CustomerForm action={resumePlan} className="px-4 py-3.5 flex items-center gap-3">
                      <input type="hidden" name="subscription_id" value={s.id} />
                      <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0"><PlayCircle className="w-4 h-4" /></span>
                      <span className="flex-1 text-sm font-bold text-gray-900">Back early?</span>
                      <Btn>Resume now</Btn>
                    </CustomerForm>
                  )}

                  <details className="group">
                    <summary className={rowCls}>
                      <span className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0"><XCircle className="w-4 h-4" /></span>
                      <span className="flex-1 text-sm font-bold text-rose-700">Cancel plan</span>
                      <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90" />
                    </summary>
                    <CustomerForm action={cancelPlan} className="px-4 pb-4 space-y-2">
                      <input type="hidden" name="subscription_id" value={s.id} />
                      <p className="text-xs text-gray-600">Would a pause work instead? If not, tell us why. Meals not yet locked are cancelled and our team will contact you about unused meals.</p>
                      <textarea name="reason" required maxLength={500} placeholder="Why are you cancelling?" className="w-full rounded-xl border border-gray-200 p-3 text-sm" />
                      <Btn variant="danger" className="w-full py-3 text-sm" confirm={{ eyebrow: 'Cancel plan', tone: 'danger', title: 'Cancel your plan?', message: 'Meals that aren’t locked yet are cancelled. This can’t be undone.', confirmLabel: 'Yes, cancel plan', cancelLabel: 'Keep my plan' }}>Cancel my plan</Btn>
                    </CustomerForm>
                  </details>
                </section>
              )}
            </div>
          );
        })}

        {past.length > 0 && (
          <section>
            <h2 className="px-1 mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Past plans</h2>
            <ul className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
              {past.map((s) => {
                const st = STATUS[s.status] ?? { text: s.status, cls: STATUS.completed.cls };
                return (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-gray-900 capitalize truncate">{planName(s)}</span>
                      <span className="block text-xs text-gray-500">{dateLabel(s.start_date)}{s.end_date ? ` – ${dateLabel(s.end_date)}` : ''} · {s.meals_delivered}/{s.meals_total} meals</span>
                    </span>
                    <span className={cn('shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border', st.cls)}>{st.text}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </AccountShell>
  );
}
