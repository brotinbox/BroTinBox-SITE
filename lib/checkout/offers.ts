import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseService } from '@/lib/supabase/admin';

/**
 * Free-juice offers from the printed posters (first weekly/monthly order only):
 *   - Monthly plan, first order: 2 free juices in the first month (days 2 and 15
 *     by default, the customer can move them).
 *   - Weekly plan: 1 free juice when they renew for week 2 (on its first day).
 *   - Refer a friend: the friend's first plan gets a free juice, and so does
 *     the referrer (their next box, or their next order).
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
  referral?: { applied: boolean; message: string };
  referrerId?: string;
};

const NONE: OfferResult = { slots: [], juices: [], referralOn: false };

/** Admin › Settings › Referral rewards. */
export async function referralsOn(): Promise<boolean> {
  const { data } = await getSupabaseService().from('site_settings').select('value').eq('key', 'features').maybeSingle();
  return (data?.value as { referrals?: boolean } | null)?.referrals === true;
}

const crm = () => (getSupabaseService() as unknown as SupabaseClient).schema('crm');
const digits = (p?: string | null) => (p ?? '').replace(/\D/g, '').slice(-10);

export async function resolveOffers(
  userId: string | null,
  cart: { type: 'trial' | 'weekly' | 'monthly'; freeJuices: FreeJuiceChoice[]; referralCode?: string },
  dayCount: number,
): Promise<OfferResult> {
  const db = getSupabaseService();

  const [{ data: features }, { data: drinks }] = await Promise.all([
    db.from('site_settings').select('value').eq('key', 'features').maybeSingle(),
    db.from('addons').select('id, slug, name, image_url').eq('type', 'drink').eq('is_active', true).order('sort_order'),
  ]);
  const referralOn = (features?.value as { referrals?: boolean } | null)?.referrals === true;
  const juices = (drinks ?? []).filter((d) => !NOT_FREE.has(d.slug));
  if (!juices.length) return { ...NONE, referralOn };

  if (cart.type === 'trial') {
    return {
      ...NONE, referralOn,
      ...(cart.referralCode && referralOn && { referral: { applied: false, message: 'Referral codes work on weekly and monthly plans.' } }),
    };
  }

  // Earlier paid plans and offers already used. The claims table arrives with
  // migration 0035: until it exists, no offers are shown (checkout still works).
  let history: string[] = [];
  let claims: { id: string; offer: FreeOffer; status: string }[] = [];
  if (userId) {
    const [orders, claimRows] = await Promise.all([
      db.from('orders').select('type, paid_at').eq('user_id', userId).eq('status', 'paid').in('type', ['weekly', 'monthly']).order('paid_at'),
      crm().from('offer_claims').select('id, offer, status').eq('user_id', userId),
    ]);
    if (claimRows.error) return NONE;
    history = (orders.data ?? []).map((o) => o.type as string);
    claims = (claimRows.data ?? []) as typeof claims;
  } else {
    const { error } = await crm().from('offer_claims').select('id', { head: true, count: 'exact' }).limit(1);
    if (error) return NONE;
  }
  const used = (o: FreeOffer) => claims.some((c) => c.offer === o);
  const firstPlan = history.length === 0;

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

  // Refer a friend
  let referral: OfferResult['referral'];
  let referrerId: string | undefined;
  if (referralOn && cart.referralCode) {
    const { data: ref } = await db.from('profiles').select('id, phone').eq('referral_code', cart.referralCode).maybeSingle();
    const me = userId ? (await db.from('profiles').select('phone').eq('id', userId).maybeSingle()).data : null;
    if (!ref) referral = { applied: false, message: 'That referral code is not valid.' };
    else if (ref.id === userId || (digits(ref.phone) && digits(ref.phone) === digits(me?.phone))) referral = { applied: false, message: "That's your own code. Share it with a friend instead." };
    else if (!firstPlan || used('referral_friend')) referral = { applied: false, message: 'Referral codes are for your first weekly or monthly plan.' };
    else {
      referrerId = ref.id;
      referral = { applied: true, message: 'Referral code applied: you and your friend each get a free juice.' };
      raw.push({ key: 'referral_friend-0', offer: 'referral_friend', day: 1, dayChoice: false });
    }
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
    referral,
    referrerId,
  };
}
