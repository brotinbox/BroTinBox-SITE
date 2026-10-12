'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Browser Supabase client (anon key + the signed-in user's session). */
export function getSupabaseBrowser() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}
