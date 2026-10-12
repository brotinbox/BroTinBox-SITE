import Link from 'next/link';
import { requireCustomer } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { cancelPlan, pausePlan, resumePlan } from '@/lib/customer/actions';
import { dateLabel, getMySubscriptions } from '@/lib/customer/data';
import { AccountShell } from '@/components/account/AccountNav';
import { Btn, CustomerForm } from '@/components/account/forms';

export const metadata = { title: 'My plan', robots: { index: false } };
export const dynamic = 'force-dynamic';

const STATUS: Record<string, string> = {
  active: 'Active', paused: 'Paused', pending_payment: 'Waiting for payment', completed: 'Completed', cancelled: 'Cancelled', expired: 'Expired',
};

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

  return (
    <AccountShell current="/subscription" title="My plan" subtitle={`Pause for up to ${pauseDays} days when you travel. Paused meals move to the end of your plan.`}>
      {subs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center space-y-3">
          <p className="text-sm text-gray-600">You don&apos;t have a plan yet.</p>
          <div className="flex justify-center gap-2">
            <Link href="/weekly" className="px-4 py-2 rounded-xl bg-[#124233] text-white text-xs font-bold">Weekly plan</Link>
            <Link href="/monthly" className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold">Monthly plan</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {subs.map((s) => (
            <section key={s.id} className="rounded-2xl border border-[#124233]/15 bg-white p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading font-black text-lg text-gray-900 capitalize">{s.plans?.name ?? `${s.type} plan`}</h2>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {s.meals_per_day} meal{s.meals_per_day > 1 ? 's' : ''}/day · {s.diet === 'veg' ? 'Veg' : 'Non-veg'}
                    {(s.preferences as { diet_variation?: string } | null)?.diet_variation === 'mixed' && ' (mixed days)'}
                  </p>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F5F8EC] text-[#124233] border border-[#124233]/15">{STATUS[s.status] ?? s.status}</span>
              </div>

              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div><dt className="text-[11px] text-gray-500">Starts</dt><dd className="font-bold">{dateLabel(s.start_date)}</dd></div>
                <div><dt className="text-[11px] text-gray-500">Ends</dt><dd className="font-bold">{s.end_date ? dateLabel(s.end_date) : '—'}</dd></div>
                <div><dt className="text-[11px] text-gray-500">Delivered</dt><dd className="font-bold">{s.meals_delivered} / {s.meals_total}</dd></div>
                <div><dt className="text-[11px] text-gray-500">Skipped (moved)</dt><dd className="font-bold">{s.meals_skipped}</dd></div>
              </dl>

              {s.status === 'paused' && s.paused_until && (
                <p className="text-sm text-sky-800 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2">Paused {s.paused_from ? dateLabel(s.paused_from) : ''} – {dateLabel(s.paused_until)}. Meals restart automatically after that.</p>
              )}

              {s.status === 'active' && (
                <CustomerForm action={pausePlan} className="space-y-2">
                  <input type="hidden" name="subscription_id" value={s.id} />
                  <p className="text-xs font-bold text-gray-800">Pause my plan</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <label>From <input type="date" name="from" min={minDate} required className="ml-1 rounded-lg border border-gray-200 px-2 py-1.5" /></label>
                    <label>Until <input type="date" name="until" min={minDate} required className="ml-1 rounded-lg border border-gray-200 px-2 py-1.5" /></label>
                    <Btn variant="ghost">Pause</Btn>
                  </div>
                </CustomerForm>
              )}

              {s.status === 'paused' && (
                <CustomerForm action={resumePlan}>
                  <input type="hidden" name="subscription_id" value={s.id} />
                  <Btn>Resume now</Btn>
                </CustomerForm>
              )}

              {(s.status === 'active' || s.status === 'paused') && (
                <details className="text-xs">
                  <summary className="cursor-pointer font-bold text-rose-700">Cancel plan</summary>
                  <CustomerForm action={cancelPlan} className="mt-2 space-y-2">
                    <input type="hidden" name="subscription_id" value={s.id} />
                    <textarea name="reason" required maxLength={500} placeholder="Why are you cancelling? It helps us improve." className="w-full rounded-xl border border-gray-200 p-2.5 text-sm" />
                    <p className="text-gray-500">Meals not yet locked are cancelled. Our team will contact you about unused meals.</p>
                    <Btn variant="danger" confirm="Cancel your plan? This cannot be undone.">Cancel my plan</Btn>
                  </CustomerForm>
                </details>
              )}

              {s.status === 'pending_payment' && (
                <Link href="/orders" className="inline-block text-xs font-bold text-amber-800">Finish payment in Orders →</Link>
              )}
            </section>
          ))}
        </div>
      )}
    </AccountShell>
  );
}
