import 'server-only';
import { unstable_cache } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseService } from '@/lib/supabase/admin';
import { getSupabasePublic } from '@/lib/supabase/server';
import { commissionStage, parseProgram, todayIst, type CommissionStatus, type PartnerProgram, type PartnerStatus } from '@/lib/partners/program';

/**
 * Trainer partner data (own `partners` schema, service role only, migration 0039).
 * Callers check who is asking first: the trainer's own session, or a staff
 * permission.
 */

const db = () => (getSupabaseService() as unknown as SupabaseClient).schema('partners');
export const partnersTable = () => db().from('partners');
export const partnerCustomersTable = () => db().from('customers');
export const partnerCommissionsTable = () => db().from('commissions');
export const partnerPayoutsTable = () => db().from('payouts');

export type Partner = {
  id: string;
  profile_id: string;
  status: PartnerStatus;
  code: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  gym_name: string;
  gym_area: string;
  gym_pincode: string;
  gym_maps_url: string | null;
  instagram: string | null;
  years_training: number;
  active_clients: number;
  pitch: string | null;
  terms_version: string;
  terms_accepted_at: string;
  upi_id: string | null;
  upi_name: string | null;
  admin_note: string | null;
  decided_at: string | null;
  approved_at: string | null;
  created_at: string;
};

export type Commission = {
  id: string;
  partner_id: string;
  customer_id: string;
  order_id: string;
  kind: 'first_plan' | 'renewal';
  plan_type: 'weekly' | 'monthly';
  amount: number;
  tier: number | null;
  status: CommissionStatus;
  hold_until: string;
  void_reason: string | null;
  payout_id: string | null;
  created_at: string;
};

export type Payout = { id: string; partner_id: string; amount: number; upi_id: string | null; reference: string; note: string | null; paid_at: string };
export type PartnerCustomer = { customer_id: string; partner_id: string; first_order_id: string | null; linked_at: string; linked_until: string };

/** site_settings.partner_program (public key), cached with the other settings. */
export const getPartnerProgram = unstable_cache(
  async (): Promise<PartnerProgram> => {
    const { data } = await getSupabasePublic().from('site_settings').select('value').eq('key', 'partner_program').maybeSingle();
    return parseProgram(data?.value);
  },
  ['partner-program'],
  { tags: ['settings'], revalidate: 3600 }
);

/** The signed-in person's own application, if any (null also if the table is missing). */
export async function getPartnerByProfile(profileId: string): Promise<Partner | null> {
  const { data, error } = await partnersTable().select('*').eq('profile_id', profileId).maybeSingle();
  if (error) return null;
  return (data as Partner | null) ?? null;
}

/** Start of the current month in IST, as an ISO timestamp. */
export function monthStartIst(): string {
  const ist = new Date(Date.now() + 5.5 * 3600_000);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - 5.5 * 3600_000).toISOString();
}

export type PartnerSummary = {
  clients: number;
  clientsThisMonth: number;
  firstPlansThisMonth: number;
  earnedThisMonth: number;
  pending: number;
  approved: number;
  paid: number;
};

export function summarise(commissions: Commission[], customers: PartnerCustomer[]): PartnerSummary {
  const since = monthStartIst();
  const today = todayIst();
  const s: PartnerSummary = { clients: customers.length, clientsThisMonth: 0, firstPlansThisMonth: 0, earnedThisMonth: 0, pending: 0, approved: 0, paid: 0 };
  for (const c of customers) if (c.linked_at >= since) s.clientsThisMonth++;
  for (const c of commissions) {
    const stage = commissionStage(c, today);
    const amt = Number(c.amount);
    if (stage === 'void') continue;
    if (c.created_at >= since) {
      s.earnedThisMonth += amt;
      if (c.kind === 'first_plan') s.firstPlansThisMonth++;
    }
    s[stage] += amt;
  }
  return s;
}

/** Everything a partner's dashboard or the staff detail page shows. */
export async function loadPartnerActivity(partnerId: string) {
  const [cust, comm, pays] = await Promise.all([
    partnerCustomersTable().select('*').eq('partner_id', partnerId).order('linked_at', { ascending: false }).limit(500),
    partnerCommissionsTable().select('*').eq('partner_id', partnerId).order('created_at', { ascending: false }).limit(1000),
    partnerPayoutsTable().select('*').eq('partner_id', partnerId).order('paid_at', { ascending: false }).limit(100),
  ]);
  const customers = (cust.data ?? []) as PartnerCustomer[];
  const commissions = ((comm.data ?? []) as Commission[]).map((c) => ({ ...c, amount: Number(c.amount) }));
  const payouts = ((pays.data ?? []) as Payout[]).map((p) => ({ ...p, amount: Number(p.amount) }));

  const ids = [...new Set(customers.map((c) => c.customer_id))];
  const names = new Map<string, { full_name: string | null; phone: string | null }>();
  if (ids.length) {
    const { data } = await getSupabaseService().from('profiles').select('id, full_name, phone').in('id', ids);
    for (const p of data ?? []) names.set(p.id, { full_name: p.full_name, phone: p.phone });
  }
  return { customers, commissions, payouts, names, summary: summarise(commissions, customers) };
}

/** A code is free if no partner and no customer referral code uses it. */
export async function codeTaken(code: string, exceptPartnerId?: string): Promise<boolean> {
  let q = partnersTable().select('id').eq('code', code).limit(1);
  if (exceptPartnerId) q = q.neq('id', exceptPartnerId);
  const [{ data: p }, { data: r }] = await Promise.all([
    q,
    getSupabaseService().from('profiles').select('id').eq('referral_code', code).limit(1),
  ]);
  return !!(p?.length || r?.length);
}
