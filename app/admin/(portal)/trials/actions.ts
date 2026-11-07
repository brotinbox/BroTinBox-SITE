'use server';

import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import { cleanText } from '@/lib/security/request';
import { dbError, fail, ok, staffAction, type ActionResult } from '@/lib/admin/actions';
import { trialClaims } from '@/lib/admin/trials';

const uuid = z.string().uuid();

/** Records one personal WhatsApp follow-up (the later automation uses the same counter). */
export async function markTrialFollowedUp(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = uuid.safeParse(fd.get('claim_id'));
  if (!id.success) return fail('Invalid trial.');
  return staffAction('customers.write', async () => {
    // crm schema is service-role only; staffAction has checked customers.write.
    const { data: c, error } = await trialClaims().select('followup_stage').eq('id', id.data).maybeSingle();
    if (error || !c) return fail('Trial not found.');
    const { error: upErr } = await trialClaims()
      .update({ followup_stage: (c.followup_stage ?? 0) + 1, followup_sent_at: new Date().toISOString() })
      .eq('id', id.data);
    if (upErr) throw upErr;
    return ok('Marked as messaged.');
  });
}

/** Stop (or restart) follow-ups for a customer who said no thanks. */
export async function setTrialFollowupOptOut(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = uuid.safeParse(fd.get('claim_id'));
  if (!id.success) return fail('Invalid trial.');
  const optOut = fd.get('opt_out') === '1';
  return staffAction('customers.write', async () => {
    const { error } = await trialClaims().update({ followup_opt_out: optOut }).eq('id', id.data);
    if (error) throw error;
    return ok(optOut ? 'No more follow-ups for this customer.' : 'Follow-ups switched back on.');
  });
}

/**
 * Gives the customer their trial back (refund for our mistake, wrong number…).
 * The database function checks orders.refund again and logs who did it.
 */
export async function resetTrial(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = uuid.safeParse(fd.get('claim_id'));
  const reason = cleanText(fd.get('reason'), 200);
  if (!id.success) return fail('Invalid trial.');
  if (reason.length < 4) return fail('Write a short reason (it is saved in the log).');
  return staffAction('orders.refund', async () => {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.rpc('admin_reset_trial', { p_claim: id.data, p_reason: reason });
    if (error) return fail(dbError(error));
    return ok('Trial reset. This customer can book a trial again.');
  });
}
