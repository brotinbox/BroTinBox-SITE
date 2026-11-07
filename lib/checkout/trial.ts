import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseService } from '@/lib/supabase/admin';
import { CheckoutError } from '@/lib/checkout/quote';

/**
 * One trial box per customer. The database (crm.trial_claims, migration 0028)
 * is the real guard; this gives the customer a clear answer before the order
 * is created and records blocked attempts for staff.
 */

export type TrialEligibility = {
  eligible: boolean;
  own_pending?: boolean;
  matched_on?: 'account' | 'phone' | 'address_phone';
  claim_id?: string;
  status?: 'pending' | 'used';
  order_id?: string;
  order_number?: string;
  claimed_at?: string;
  delivered_at?: string | null;
  address_flag?: boolean;
};

// crm tables are not in the generated Database types.
const crm = () => (getSupabaseService() as unknown as SupabaseClient).schema('crm');

export async function getTrialEligibility(userId: string, addressId?: string | null): Promise<TrialEligibility> {
  const { data, error } = await getSupabaseService().rpc('trial_eligibility', {
    p_user: userId,
    ...(addressId && { p_address: addressId }),
  });
  if (error || !data) throw error ?? new Error('trial eligibility unavailable');
  return data as unknown as TrialEligibility;
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

/** Customer-facing reason. Another account's details are never revealed. */
export function trialUsedMessage(e: TrialEligibility): string {
  if (e.matched_on === 'account') {
    if (e.status === 'pending') return 'You already have a trial box booked.';
    const when = e.delivered_at ?? e.claimed_at;
    return when ? `You've already tried our trial box (${shortDate(when)}).` : "You've already tried our trial box.";
  }
  return 'A trial box has already been ordered with this mobile number.';
}

/** Throws CheckoutError('TRIAL_USED') when this customer can't book another trial. */
export async function assertTrialAvailable(userId: string, addressId: string, source: 'web' | 'admin'): Promise<TrialEligibility> {
  const e = await getTrialEligibility(userId, addressId);
  if (e.eligible) return e;
  await logTrialAttempt(userId, addressId, e, source);
  throw new CheckoutError(trialUsedMessage(e), 'TRIAL_USED');
}

/** Best effort: a logging failure never changes the answer the customer gets. */
async function logTrialAttempt(userId: string, addressId: string, e: TrialEligibility, source: 'web' | 'admin') {
  try {
    const db = getSupabaseService();
    const [{ data: profile }, { data: address }] = await Promise.all([
      db.from('profiles').select('phone').eq('id', userId).maybeSingle(),
      db.from('addresses').select('phone').eq('id', addressId).maybeSingle(),
    ]);
    const last10 = (p?: string | null) => (p ? p.replace(/\D/g, '').slice(-10) || null : null);
    const { error } = await crm().from('trial_attempts').insert({
      user_id: userId,
      phone: last10(profile?.phone),
      address_phone: last10(address?.phone),
      matched_claim_id: e.claim_id ?? null,
      matched_on: e.matched_on ?? null,
      source,
    });
    if (error) console.error('[Trial] attempt log failed:', error.message);
  } catch (err) {
    console.error('[Trial] attempt log failed:', err);
  }
}

/** What the customer's own trial looks like, for the dashboard and the /tomorrow page. */
export type MyTrialStatus =
  | { state: 'available' }
  | { state: 'pending'; orderId: string; orderNumber?: string }
  | { state: 'used'; ownAccount: boolean; boxDate: string | null; delivered: boolean; phoneLast4?: string };

export async function getMyTrialStatus(userId: string): Promise<MyTrialStatus> {
  const e = await getTrialEligibility(userId);
  if (e.eligible && !e.own_pending) return { state: 'available' };
  if (e.own_pending && e.order_id) return { state: 'pending', orderId: e.order_id, orderNumber: e.order_number };
  if (e.matched_on !== 'account' || !e.order_id) {
    // Their own number matched a trial on another account: say which number (theirs), nothing else.
    const { data: me } = await getSupabaseService().from('profiles').select('phone').eq('id', userId).maybeSingle();
    const last4 = (me?.phone ?? '').replace(/\D/g, '').slice(-4) || undefined;
    return { state: 'used', ownAccount: false, boxDate: null, delivered: false, phoneLast4: last4 };
  }
  // The box's delivery day comes from the trial's one-day subscription.
  const { data } = await getSupabaseService()
    .from('orders').select('subscriptions(start_date)').eq('id', e.order_id).maybeSingle();
  const sub = (data as { subscriptions?: { start_date?: string } | null } | null)?.subscriptions;
  return { state: 'used', ownAccount: true, boxDate: sub?.start_date ?? null, delivered: !!e.delivered_at };
}
