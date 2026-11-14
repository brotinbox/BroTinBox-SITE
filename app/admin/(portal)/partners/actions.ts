'use server';

import { z } from 'zod';
import { cleanText } from '@/lib/security/request';
import { fail, ok, staffAction, type ActionResult } from '@/lib/admin/actions';
import { codeTaken, partnerCommissionsTable, partnerPayoutsTable, partnersTable, type Commission } from '@/lib/partners/server';
import { isValidPartnerCode, todayIst } from '@/lib/partners/program';

const id = z.string().uuid();
const PERM = 'customers.write';

/** Approve with a code (new or edited). Also re-activates a paused partner. */
export async function approvePartner(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const pid = id.safeParse(fd.get('id'));
  const code = cleanText(fd.get('code'), 20).toUpperCase();
  if (!pid.success) return fail('Invalid partner.');
  if (!isValidPartnerCode(code)) return fail('Code: 4–20 letters or numbers, no spaces.');

  return staffAction(PERM, async (staff) => {
    if (await codeTaken(code, pid.data)) return fail(`${code} is already used (by a partner or a customer's referral code). Try another.`);
    const { data: cur } = await partnersTable().select('approved_at').eq('id', pid.data).maybeSingle();
    if (!cur) return fail('Partner not found.');
    const now = new Date().toISOString();
    const { error } = await partnersTable().update({
      status: 'approved', code, decided_by: staff.profile.id, decided_at: now,
      approved_at: (cur as { approved_at: string | null }).approved_at ?? now,
    }).eq('id', pid.data);
    if (error) throw error;
    return ok(`Approved with code ${code}. Send them the WhatsApp message.`);
  });
}

const statusSchema = z.enum(['rejected', 'paused', 'pending']);

/** Reject, pause, or move back to pending. Takes effect immediately. */
export async function setPartnerStatus(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const pid = id.safeParse(fd.get('id'));
  const status = statusSchema.safeParse(fd.get('status'));
  if (!pid.success || !status.success) return fail('Invalid request.');
  return staffAction(PERM, async (staff) => {
    const { error } = await partnersTable().update({ status: status.data, decided_by: staff.profile.id, decided_at: new Date().toISOString() }).eq('id', pid.data);
    if (error) throw error;
    return ok(status.data === 'paused' ? 'Paused: the code stops working and earning.' : status.data === 'rejected' ? 'Rejected.' : 'Moved back to pending.');
  });
}

export async function savePartnerNote(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const pid = id.safeParse(fd.get('id'));
  if (!pid.success) return fail('Invalid partner.');
  const note = cleanText(fd.get('note'), 1000) || null;
  return staffAction(PERM, async () => {
    const { error } = await partnersTable().update({ admin_note: note }).eq('id', pid.data);
    if (error) throw error;
    return ok('Note saved.');
  });
}

/**
 * Pays every approved commission (past its hold date, still pending) in one
 * UPI transfer: records the payout and marks those commissions paid.
 */
export async function markPartnerPaid(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const pid = id.safeParse(fd.get('id'));
  const reference = cleanText(fd.get('reference'), 60);
  const note = cleanText(fd.get('note'), 300) || null;
  const expected = Number(fd.get('expected'));
  if (!pid.success) return fail('Invalid partner.');
  if (reference.length < 4) return fail('Enter the UPI transaction reference.');

  return staffAction(PERM, async (staff) => {
    const { data: partner } = await partnersTable().select('id, upi_id').eq('id', pid.data).maybeSingle();
    if (!partner) return fail('Partner not found.');
    const { data: rows, error } = await partnerCommissionsTable().select('id, amount')
      .eq('partner_id', pid.data).eq('status', 'pending').lte('hold_until', todayIst());
    if (error) throw error;
    const due = (rows ?? []) as Pick<Commission, 'id' | 'amount'>[];
    const amount = Math.round(due.reduce((s, c) => s + Number(c.amount), 0) * 100) / 100;
    if (!due.length || amount <= 0) return fail('Nothing approved to pay.');
    if (Number.isFinite(expected) && Math.abs(expected - amount) > 0.009) return fail(`The amount changed to ₹${amount}. Reload the page and check before paying.`);

    const { data: payout, error: pe } = await partnerPayoutsTable().insert({
      partner_id: pid.data, amount, reference, note, upi_id: (partner as { upi_id: string | null }).upi_id, paid_by: staff.profile.id,
    }).select('id').single();
    if (pe || !payout) throw pe ?? new Error('payout not saved');
    const { error: ue } = await partnerCommissionsTable().update({ status: 'paid', payout_id: (payout as { id: string }).id })
      .in('id', due.map((c) => c.id)).eq('status', 'pending');
    if (ue) throw ue;
    return ok(`Recorded payout of ₹${amount.toLocaleString('en-IN')} (${due.length} plan${due.length === 1 ? '' : 's'}).`);
  });
}

/** Cancel one unpaid commission (e.g. a fake order or a partial refund). */
export async function voidCommission(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const cid = id.safeParse(fd.get('id'));
  const reason = cleanText(fd.get('reason'), 200) || 'Cancelled by staff';
  if (!cid.success) return fail('Invalid commission.');
  return staffAction(PERM, async () => {
    const { data, error } = await partnerCommissionsTable().update({ status: 'void', void_reason: reason })
      .eq('id', cid.data).eq('status', 'pending').select('id');
    if (error) throw error;
    if (!data?.length) return fail('Only unpaid commissions can be cancelled.');
    return ok('Commission cancelled.');
  });
}
