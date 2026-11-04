'use server';

import { z } from 'zod';
import { leadsTable } from '@/lib/leads';
import { cleanText } from '@/lib/security/request';
import { fail, ok, staffAction, type ActionResult } from '@/lib/admin/actions';

const phoneSchema = z.string().regex(/^\+[0-9]{10,15}$/);

/** Marks a lead as contacted (or clears it) and saves a short note. */
export async function updateLead(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const phone = phoneSchema.safeParse(fd.get('phone'));
  if (!phone.success) return fail('Invalid number.');
  const contacted = fd.get('contacted') === 'on';
  const note = cleanText(fd.get('note'), 500) || null;

  return staffAction('customers.write', async () => {
    // otp schema is service-role only; staffAction has checked customers.write.
    const { error } = await leadsTable()
      .update({ contacted_at: contacted ? new Date().toISOString() : null, note })
      .eq('phone', phone.data);
    if (error) throw error;
    return ok(contacted ? 'Marked as contacted.' : 'Saved.');
  });
}
