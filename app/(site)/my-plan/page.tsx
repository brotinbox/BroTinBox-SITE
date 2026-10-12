import Link from 'next/link';
import { requireCustomer } from '@/lib/auth/session';
import { dateLabel, getUpcomingMeals } from '@/lib/customer/data';
import { AccountShell } from '@/components/account/AccountNav';
import { MealCard } from '@/components/account/MealCard';

export const metadata = { title: 'My meals', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function MyMealsPage() {
  await requireCustomer('/my-plan');
  const meals = await getUpcomingMeals(80);

  const byDate = new Map<string, typeof meals>();
  meals.forEach((m) => byDate.set(m.delivery_date, [...(byDate.get(m.delivery_date) ?? []), m]));

  return (
    <AccountShell current="/my-plan" title="My meals" subtitle="Every upcoming meal. Skip a day, or go egg-free / no legume, until 9 PM the night before.">
      {meals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center space-y-3">
          <p className="text-sm text-gray-600">No upcoming meals.</p>
          <div className="flex justify-center gap-2">
            <Link href="/tomorrow" className="px-4 py-2 rounded-xl bg-[#124233] text-white text-xs font-bold">Try a day</Link>
            <Link href="/weekly" className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold">Weekly plan</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {[...byDate.entries()].map(([date, list]) => (
            <section key={date}>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-2">{dateLabel(date)}</h2>
              <div className="space-y-3">{list.map((m) => <MealCard key={m.id} meal={m} showCustomise />)}</div>
            </section>
          ))}
        </div>
      )}
    </AccountShell>
  );
}
