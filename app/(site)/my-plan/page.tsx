import Link from 'next/link';
import { CalendarX } from 'lucide-react';
import { requireCustomer } from '@/lib/auth/session';
import { dayWord, getUpcomingMeals } from '@/lib/customer/data';
import { AccountShell } from '@/components/account/AccountNav';
import { MealCard } from '@/components/account/MealCard';
import { getMyTrialStatus, type MyTrialStatus } from '@/lib/checkout/trial';

export const metadata = { title: 'My meals', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function MyMealsPage() {
  const profile = await requireCustomer('/my-plan');
  const [meals, trial] = await Promise.all([
    getUpcomingMeals(80),
    getMyTrialStatus(profile.id).catch((): MyTrialStatus => ({ state: 'available' })),
  ]);
  const trialUsed = trial.state === 'used';

  const byDate = new Map<string, typeof meals>();
  meals.forEach((m) => byDate.set(m.delivery_date, [...(byDate.get(m.delivery_date) ?? []), m]));
  const coming = meals.filter((m) => m.status !== 'skipped' && m.status !== 'paused').length;

  return (
    <AccountShell current="/my-plan" title="My meals"
      subtitle={meals.length ? `${coming} meal${coming === 1 ? '' : 's'} coming up · change any until 9 PM the night before` : undefined}>
      {meals.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center space-y-3">
          <span className="mx-auto w-12 h-12 rounded-2xl bg-sand text-ink flex items-center justify-center"><CalendarX className="w-5 h-5" /></span>
          <div>
            <p className="font-heading font-black text-base text-gray-900">No meals coming up</p>
            <p className="text-xs text-gray-500 mt-0.5">Pick a plan and your boxes show up here.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
            {trialUsed
              ? <Link href="/monthly" className="py-2.5 rounded-xl border border-gray-200 text-xs font-bold">Monthly plan</Link>
              : <Link href="/tomorrow" className="py-2.5 rounded-xl border border-gray-200 text-xs font-bold">Trial box</Link>}
            <Link href="/weekly" className="py-2.5 rounded-xl bg-ink text-white text-xs font-bold">Weekly plan</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {[...byDate.entries()].map(([date, list]) => {
            const word = dayWord(date);
            const near = word === 'Today' || word === 'Tomorrow';
            return (
              <section key={date}>
                <h2 className="flex items-center gap-2 mb-2 px-1">
                  <span className={near ? 'font-heading font-black text-sm text-ink' : 'font-heading font-bold text-sm text-gray-700'}>{word}</span>
                  {near && <span className="h-1.5 w-1.5 rounded-full bg-orange-500" aria-hidden="true" />}
                </h2>
                <div className="space-y-2.5">{list.map((m) => <MealCard key={m.id} meal={m} showCustomise />)}</div>
              </section>
            );
          })}
        </div>
      )}
    </AccountShell>
  );
}
