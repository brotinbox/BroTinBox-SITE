import 'server-only';
import { unstable_cache } from 'next/cache';
import { getSupabasePublic } from '@/lib/supabase/server';

/**
 * Next kitchen day after `after` (YYYY-MM-DD), from the database's own rule
 * (Sundays and kitchen closures are skipped). Cached per date and cleared by
 * the 'menu' tag, which every closure edit revalidates.
 */
export const getNextOperatingDay = unstable_cache(
  async (after: string): Promise<string> => {
    const { data } = await getSupabasePublic().rpc('next_operating_day', { after_date: after });
    return (data as string | null) ?? after;
  },
  ['next-operating-day'],
  { tags: ['menu'], revalidate: 3600 }
);

/** Hour (IST) when today's work is done and the staff views move on to the next day — the 9 PM skip cutoff. */
const DAY_CLOSES_AT_HOUR = 21;

/**
 * The kitchen day the staff views (Day plan, Cook sheet) should open on:
 * today, if the kitchen runs today and it is before 9 PM IST; otherwise the
 * next operating day (after 9 PM tomorrow's list is locked, so it is the one to plan).
 */
export async function getCurrentKitchenDay(now: Date = new Date()): Promise<string> {
  const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const hour = Number(now.toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }));
  if (hour >= DAY_CLOSES_AT_HOUR) return getNextOperatingDay(today);
  // next_operating_day() looks strictly after its argument, so start from yesterday to include today.
  const [y, m, d] = today.split('-').map(Number);
  const yesterday = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
  return getNextOperatingDay(yesterday);
}
