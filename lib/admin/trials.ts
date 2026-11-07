import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseService } from '@/lib/supabase/admin';

/**
 * Staff views of the one-trial-per-customer data (crm schema, service role).
 * Every caller must have checked a staff permission first.
 */

export type TrialClaim = {
  id: string;
  order_id: string;
  user_id: string;
  phone: string | null;
  address_phone: string | null;
  address_key: string | null;
  status: 'pending' | 'used' | 'released';
  is_override: boolean;
  override_reason: string | null;
  address_flag: boolean;
  claimed_at: string;
  used_at: string | null;
  released_at: string | null;
  release_reason: string | null;
  delivered_at: string | null;
  followup_stage: number;
  followup_sent_at: string | null;
  followup_opt_out: boolean;
};

export type TrialAttempt = {
  id: string;
  user_id: string | null;
  phone: string | null;
  address_phone: string | null;
  matched_claim_id: string | null;
  matched_on: string | null;
  source: string;
  created_at: string;
};

const crm = () => (getSupabaseService() as unknown as SupabaseClient).schema('crm');
export const trialClaims = () => crm().from('trial_claims');
export const trialAttempts = () => crm().from('trial_attempts');

/** Active (pending/used) trial per customer, for list badges. */
export async function activeTrialsFor(userIds: string[]): Promise<Map<string, TrialClaim>> {
  if (!userIds.length) return new Map();
  const { data } = await trialClaims().select('*').in('user_id', userIds).in('status', ['pending', 'used'])
    .order('claimed_at', { ascending: false });
  const map = new Map<string, TrialClaim>();
  for (const c of (data ?? []) as TrialClaim[]) if (!map.has(c.user_id)) map.set(c.user_id, c);
  return map;
}

export type AutoMessage = { claim_id: string; template: string; stage: number; status: string; error_title: string | null; created_at: string };

/** Automated WhatsApp follow-ups per trial, newest first. */
export async function autoMessagesFor(claimIds: string[]): Promise<Map<string, AutoMessage[]>> {
  const map = new Map<string, AutoMessage[]>();
  if (!claimIds.length) return map;
  const { data } = await crm().from('whatsapp_messages').select('claim_id, template, stage, status, error_title, created_at')
    .in('claim_id', claimIds).order('created_at', { ascending: false });
  for (const m of (data ?? []) as AutoMessage[]) map.set(m.claim_id, [...(map.get(m.claim_id) ?? []), m]);
  return map;
}

export const TEMPLATE_LABEL: Record<string, string> = {
  trial_feedback: 'Feedback ask',
  trial_plan_offer: 'Plan offer',
  trial_last_reminder: 'Last reminder',
};

/** Delivery day of each trial (the trial's one-day subscription start), by order id. */
export async function trialBoxDates(orderIds: string[]): Promise<Map<string, { date: string | null; orderNumber: string }>> {
  if (!orderIds.length) return new Map();
  const { data } = await getSupabaseService().from('orders')
    .select('id, order_number, subscriptions(start_date)').in('id', orderIds);
  return new Map((data ?? []).map((o) => {
    const sub = (o as unknown as { subscriptions?: { start_date?: string } | null }).subscriptions;
    return [o.id, { date: sub?.start_date ?? null, orderNumber: o.order_number }];
  }));
}

/** Customers (by id) who have paid for a weekly or monthly plan, with their first such purchase. */
export async function convertedCustomers(userIds: string[]): Promise<Map<string, { type: string; paidAt: string }>> {
  if (!userIds.length) return new Map();
  const { data } = await getSupabaseService().from('orders')
    .select('user_id, type, paid_at').in('user_id', userIds).in('type', ['weekly', 'monthly'])
    .in('status', ['paid', 'refunded', 'partially_refunded']).order('paid_at');
  const map = new Map<string, { type: string; paidAt: string }>();
  for (const o of data ?? []) if (!map.has(o.user_id)) map.set(o.user_id, { type: o.type, paidAt: o.paid_at ?? '' });
  return map;
}

export async function customersById(ids: string[]): Promise<Map<string, { full_name: string | null; email: string | null; phone: string | null }>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const { data } = await getSupabaseService().from('profiles').select('id, full_name, email, phone').in('id', unique);
  return new Map((data ?? []).map((p) => [p.id, p]));
}

/** "+91 98765 43210" from a stored 10-digit or +91 number. */
export const showPhone = (p: string | null | undefined) => {
  const d = (p ?? '').replace(/\D/g, '').slice(-10);
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : '—';
};
export const waNumber = (p: string | null | undefined) => {
  const d = (p ?? '').replace(/\D/g, '').slice(-10);
  return d.length === 10 ? `91${d}` : null;
};
