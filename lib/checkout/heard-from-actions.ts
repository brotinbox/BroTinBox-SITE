'use server';

import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseService } from '@/lib/supabase/admin';
import { cleanText } from '@/lib/security/request';
import { HEARD_FROM } from '@/lib/heard-from';

const crm = () => (getSupabaseService() as unknown as SupabaseClient).schema('crm');

async function currentUserId() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Has this customer already told us? (then checkout doesn't ask again) */
export async function hasAnsweredHeardFrom(): Promise<boolean> {
  const uid = await currentUserId();
  if (!uid) return false;
  const { data } = await crm().from('heard_from').select('user_id').eq('user_id', uid).maybeSingle();
  return !!data;
}

const schema = z.object({
  source: z.enum(HEARD_FROM.map((o) => o.value) as [string, ...string[]]),
  detail: z.string().max(400).optional(),
  orderId: z.string().uuid().optional(),
});

/** Optional checkout answer. Never blocks the order: errors are swallowed. */
export async function saveHeardFrom(input: { source: string; detail?: string; orderId?: string }): Promise<void> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return;
  const uid = await currentUserId();
  if (!uid) return;
  const detail = parsed.data.detail ? cleanText(parsed.data.detail, 200) || null : null;
  const { error } = await crm().from('heard_from').upsert(
    { user_id: uid, source: parsed.data.source, detail, order_id: parsed.data.orderId ?? null },
    { onConflict: 'user_id', ignoreDuplicates: true }, // keep the first answer
  );
  if (error) console.error('[heard_from] save failed', error.message);
}
