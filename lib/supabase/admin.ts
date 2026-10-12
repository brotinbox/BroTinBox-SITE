import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

let serviceClient: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Service-role client: bypasses RLS. Only for trusted server code that has
 * already authenticated/authorised the caller (checkout, webhooks, cron,
 * public form submissions after rate limiting). Never import from client code.
 */
export function getSupabaseService() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  if (!serviceClient) {
    serviceClient = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serviceClient;
}
