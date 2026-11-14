import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseService } from '@/lib/supabase/admin';
import { getPartnerProgram } from '@/lib/partners/server';

/**
 * Free-juice offers from the printed posters (first weekly/monthly order only):
 *   - Monthly plan, first order: 2 free juices in the first month (days 2 and 15
 *     by default, the customer can move them).
 *   - Weekly plan: 1 free juice when they renew for week 2 (on its first day).
 *   - Refer a friend: the friend's first plan gets a free juice, and so does
 *     the referrer (their next box, or their next order).
 *   - Trainer partner code (migration 0039): the member's first plan gets
 *     site_settings.partner_program.member_juices; the trainer earns commission.
 * ABC juice is never free. The customer picks the juice.
 *
 * This decides what the checkout shows and stores; the database records each
 * claim when the order is paid (crm.offer_claims, migration 0035) and is the
 * real one-per-customer guard.
 */

export type FreeOffer = 'first_monthly' | 'weekly_renewal' | 'referral_friend' | 'referral_referrer';

/** Juices that are never part of a free-juice offer. */
const NOT_FREE = new Set(['drink-abc']);
/** Default delivery days for the 2 monthly juices. */
export const MONTHLY_FREE_DAYS = [2, 15];

export const OFFER_LABEL: Record<FreeOffer, string> = {
  first_monthly: 'First-month gift',
  weekly_renewal: 'Week 2 gift',
  referral_friend: 'Referral gift',
  referral_referrer: 'Thanks for referring a friend',
};

export type FreeJuiceChoice = { key: string; juice: string; day: number };

export type FreeJuiceSlot = {
  key: string;
  offer: FreeOffer;
  /** Nth delivery day of the plan (1-based). */
  day: number;
  /** The customer can move it to another day (monthly gift). */
  dayChoice: boolean;
  /** Shown instead of the offer's usual title (trainer's gift). */
  label?: string;
  /** Addon slug the customer picked (or the default). */
  juice: string;
  addonId: string;
  juiceName: string;
  claimId?: string;
};

export type OfferResult = {
  slots: FreeJuiceSlot[];
  /** Juices the customer can pick from (no ABC). */
  juices: { slug: string; name: string; image: string }[];
  /** A promise for later, e.g. "renew for week 2". */
  note?: string;
  referralOn: boolean;
  /** Trainer partner codes are on (site_settings.partner_program). */
  partnerOn: boolean;
  referral?: { applied: boolean; message: string };
  referrerId?: string;
  /** Trainer whose code was applied: the customer is linked when the order is paid. */
  partnerId?: string;
};

const NONE: OfferResult = { slots: [], juices: [], referralOn: false, partnerOn: false };

/** Admin › Settings › Referral rewards. */
export async function referralsOn(): Promise<boolean> {
  const { data } = await getSupabaseService().from('site_settings').select('value').eq('key', 'features').maybeSingle();
  return (data?.value as { referrals?: boolean } | null)?.referrals === true;
}

const crm = () => (getSupabaseService() as unknown as SupabaseClient).schema('crm');
/** Trainer partner programme (own schema, migration 0039). */
const partnersDb = () => (getSupabaseService() as unknown as SupabaseClient).schema('partners');
const digits = (p?: string | null) => (p ?? '').replace(/\D/g, '').slice(-10);

type PartnerRow = { id: string; profile_id: string; status: string; phone: string; full_name: string };

/** An approved-or-not trainer partner by code (null if none, or the table is missing). */
async function findPartner(code: string): Promise<PartnerRow | null> {
  const { data, error } = await partnersDb().from('partners').select('id, profile_id, status, phone, full_name').eq('code', code).maybeSingle();
  return error ? null : ((data as PartnerRow | null) ?? null);
}

/** The trainer this customer is linked to, while the link lasts. */
async function findLink(userId: string): Promise<{ partnerId: string; active: boolean } | null> {
  const { data, error } = await partnersDb().from('customers').select('partner_id, linked_until').eq('customer_id', userId).maybeSingle();
  if (error || !data) return null;
  const { data: p } = await partnersDb().from('partners').select('status').eq('id', data.partner_id).maybeSingle();
  return { partnerId: data.partner_id as string, active: Date.parse(data.linked_until as string) > Date.now() && p?.status === 'approved' };
}

const firstName = (n: string) => (n.trim().split(/\s+/)[0] || 'your trainer');
const juiceCount = (n: number) => `${n} free juice${n === 1 ? '' : 's'}`;

export async function resolveOffers(
  userId: string | null,
  cart: { type: 'trial' | 'weekly' | 'monthly'; freeJuices: FreeJuiceChoice[]; referralCode?: string },
  dayCount: number,
): Promise<OfferResult> {
  const db = getSupabaseService();
  const code = cart.referralCode || undefined;

  const [{ data: features }, { data: drinks }, program, partner, link] = await Promise.all([
    db.from('site_settings').select('value').eq('key', 'features').maybeSingle(),
    db.from('addons').select('id, slug, name, image_url').eq('type', 'drink').eq('is_active', true).order('sort_order'),
    getPartnerProgram(),
    code ? findPartner(code) : Promise.resolve(null),
    userId ? findLink(userId) : Promise.resolve(null),
  ]);
  const referralOn = (features?.value as { referrals?: boolean } | null)?.referrals === true;
  const partnerOn = program.enabled;
  const juices = (drinks ?? []).filter((d) => !NOT_FREE.has(d.slug));
  const base: OfferResult = { ...NONE, referralOn, partnerOn };

  // Earlier paid plans and offers already used. The claims table arrives with
  // migration 0035: until it exists, no offers are shown (checkout still works).
  let history: string[] = [];
  let claims: { id: string; offer: FreeOffer; status: string }[] = [];
  let myPhone: string | null = null;
  if (userId) {
    const [orders, claimRows, me] = await Promise.all([
      db.from('orders').select('type, paid_at').eq('user_id', userId).eq('status', 'paid').in('type', ['weekly', 'monthly']).order('paid_at'),
      crm().from('offer_claims').select('id, offer, status').eq('user_id', userId),
      code ? db.from('profiles').select('phone').eq('id', userId).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    if (claimRows.error) return base;
    history = (orders.data ?? []).map((o) => o.type as string);
    claims = (claimRows.data ?? []) as typeof claims;
    myPhone = (me.data as { phone: string | null } | null)?.phone ?? null;
  } else {
    const { error } = await crm().from('offer_claims').select('id', { head: true, count: 'exact' }).limit(1);
    if (error) return base;
  }
  const used = (o: FreeOffer) => claims.some((c) => c.offer === o);
  const firstPlan = history.length === 0;
  const isTrial = cart.type === 'trial';
  const ownPhone = (phone: string | null | undefined) => !!digits(phone) && digits(phone) === digits(myPhone);

  // ----- Codes: a trainer partner's code (migration 0039) or a friend's code.
  // Both give the member perk through the one 'referral_friend' claim, so a
  // customer gets one code perk ever and the two can't be stacked.
  let referral: OfferResult['referral'];
  let referrerId: string | undefined;
  let partnerId: string | undefined;
  /** Free juices from a code (or the trainer link) on this order. */
  let codeJuices = 0;
  const codePerkOpen = !isTrial && firstPlan && !used('referral_friend');
  const linked = link?.active ? link.partnerId : null;
  const memberJuices = cart.type === 'trial' ? 0 : program.memberJuices[cart.type];

  if (code && partner && partnerOn) {
    if (partner.status !== 'approved') referral = { applied: false, message: "That trainer code isn't active right now." };
    else if (partner.profile_id === userId || ownPhone(partner.phone)) referral = { applied: false, message: "That's your own trainer code. Share it with your clients instead." };
    else if (link && link.partnerId !== partner.id) referral = { applied: false, message: 'Your account is already linked to another trainer.' };
    else if (link) {
      referral = { applied: true, message: `You're already linked to ${firstName(partner.full_name)}.` };
      if (codePerkOpen && link.active) codeJuices = memberJuices;
    } else if (!firstPlan || used('referral_friend')) referral = { applied: false, message: 'Trainer codes are for new customers, before their first weekly or monthly plan.' };
    else if (isTrial) {
      partnerId = partner.id;
      referral = { applied: true, message: `Trainer code applied. Your free juices come with your first weekly or monthly plan.` };
    } else {
      partnerId = partner.id;
      codeJuices = memberJuices;
      referral = { applied: true, message: `Trainer code applied: ${juiceCount(memberJuices)} on this plan.` };
    }
  } else if (code && referralOn) {
    // A friend's code waits quietly for the first plan (the trial box shows nothing).
    if (!isTrial) {
      const { data: ref } = await db.from('profiles').select('id, phone').eq('referral_code', code).maybeSingle();
      if (!ref) referral = { applied: false, message: 'That code is not valid.' };
      else if (ref.id === userId || ownPhone(ref.phone)) referral = { applied: false, message: "That's your own code. Share it with a friend instead." };
      else if (linked) referral = { applied: false, message: "Your trainer's code is already on your account." };
      else if (!firstPlan || used('referral_friend')) referral = { applied: false, message: 'Referral codes are for your first weekly or monthly plan.' };
      else {
        referrerId = ref.id;
        codeJuices = 1;
        referral = { applied: true, message: 'Referral code applied: you and your friend each get a free juice.' };
      }
    }
  } else if (code) {
    referral = { applied: false, message: 'That code is not valid.' };
  } else if (linked && codePerkOpen && partnerOn) {
    // Came through a trainer's code on their trial: the perk follows them here.
    codeJuices = memberJuices;
  }

  if (!juices.length) return { ...base, referral, partnerId };
  if (isTrial) return { ...base, referral, partnerId };

  const raw: Omit<FreeJuiceSlot, 'juice' | 'addonId' | 'juiceName'>[] = [];
  let note: string | undefined;

  if (cart.type === 'monthly' && firstPlan && !used('first_monthly')) {
    MONTHLY_FREE_DAYS.forEach((d, i) => raw.push({ key: `first_monthly-${i}`, offer: 'first_monthly', day: Math.min(d, dayCount), dayChoice: true }));
  }
  if (cart.type === 'weekly' && history.length === 1 && history[0] === 'weekly' && !used('weekly_renewal')) {
    raw.push({ key: 'weekly_renewal-0', offer: 'weekly_renewal', day: 1, dayChoice: false });
  }
  if (cart.type === 'weekly' && firstPlan && !used('weekly_renewal')) {
    note = 'Continue for week 2 and get 1 free juice with your renewal.';
  }

  // Code perk: one a week from day 1 (friend code: always 1).
  const trainerGift = !referrerId;
  for (let i = 0; i < codeJuices; i++) {
    raw.push({
      key: `referral_friend-${i}`, offer: 'referral_friend', day: Math.min(1 + i * 7, dayCount), dayChoice: false,
      ...(trainerGift && { label: "Trainer's gift" }),
    });
  }

  // Rewards this customer earned by referring friends, waiting for an order.
  for (const c of claims.filter((x) => x.offer === 'referral_referrer' && x.status === 'pending')) {
    raw.push({ key: `ref-${c.id}`, offer: 'referral_referrer', day: 1, dayChoice: false, claimId: c.id });
  }

  // The customer's picks (juice, and day where allowed); anything invalid falls back to the default.
  const bySlug = new Map(juices.map((j) => [j.slug, j]));
  const slots: FreeJuiceSlot[] = raw.map((s) => {
    const pick = cart.freeJuices.find((f) => f.key === s.key);
    const juice = (pick && bySlug.get(pick.juice)) || juices[0];
    const day = s.dayChoice && pick && pick.day >= 1 && pick.day <= dayCount ? pick.day : s.day;
    return { ...s, day, juice: juice.slug, addonId: juice.id, juiceName: juice.name };
  });

  return {
    slots,
    juices: juices.map((j) => ({ slug: j.slug, name: j.name, image: j.image_url ?? '' })),
    note,
    referralOn,
    partnerOn,
    referral,
    referrerId,
    partnerId,
  };
}
