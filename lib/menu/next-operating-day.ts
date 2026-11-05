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
