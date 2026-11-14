/**
 * Trainer partner programme: rules and rates. The live values come from
 * site_settings.partner_program (migration 0039), which the database also uses
 * to work out commissions, so the page and the payouts never disagree.
 * DEFAULT_PROGRAM is only the fallback if the setting can't be read.
 */

export type PlanKind = 'weekly' | 'monthly';
export type PartnerTier = { from: number; monthly: number; weekly: number };

export type PartnerProgram = {
  enabled: boolean;
  /** How long a customer stays linked to the trainer who brought them. */
  linkMonths: number;
  /** Days after the plan starts before its commission can be paid. */
  holdDays: number;
  minPayout: number;
  /** Day of the month payouts go out. */
  payoutDay: number;
  /** Free juices for a member who uses a trainer code on their first plan. */
  memberJuices: Record<PlanKind, number>;
  tiers: PartnerTier[];
  renewal: Record<PlanKind, number>;
};

export const DEFAULT_PROGRAM: PartnerProgram = {
  enabled: true,
  linkMonths: 6,
  holdDays: 7,
  minPayout: 500,
  payoutDay: 5,
  memberJuices: { weekly: 1, monthly: 2 },
  tiers: [
    { from: 1, monthly: 250, weekly: 60 },
    { from: 5, monthly: 350, weekly: 80 },
    { from: 10, monthly: 450, weekly: 100 },
  ],
  renewal: { monthly: 100, weekly: 40 },
};

/** Bump when the Partner Terms change materially (stored with each application). */
export const PARTNER_TERMS_VERSION = '2026-11-14';

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

export function parseProgram(raw: unknown): PartnerProgram {
  const v = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_PROGRAM;
  const pair = (x: unknown, fb: Record<PlanKind, number>) => {
    const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
    return { weekly: num(o.weekly, fb.weekly), monthly: num(o.monthly, fb.monthly) };
  };
  const tiers = Array.isArray(v.tiers)
    ? (v.tiers as Record<string, unknown>[])
        .map((t) => ({ from: num(t?.from, 1), monthly: num(t?.monthly, 0), weekly: num(t?.weekly, 0) }))
        .sort((a, b) => a.from - b.from)
    : d.tiers;
  return {
    enabled: v.enabled !== false,
    linkMonths: num(v.link_months, d.linkMonths),
    holdDays: num(v.hold_days, d.holdDays),
    minPayout: num(v.min_payout, d.minPayout),
    payoutDay: num(v.payout_day, d.payoutDay),
    memberJuices: pair(v.member_juices, d.memberJuices),
    tiers: tiers.length ? tiers : d.tiers,
    renewal: pair(v.renewal, d.renewal),
  };
}

/** Tier (0-based) the Nth new paid plan of the month falls in. */
export function tierIndex(p: PartnerProgram, nth: number): number {
  let idx = 0;
  p.tiers.forEach((t, i) => { if (nth >= t.from) idx = i; });
  return idx;
}

/**
 * "N more paid plans to unlock ₹X per monthly plan" (the Nth one already earns
 * the new rate), or null at the top tier.
 */
export function nextMilestone(p: PartnerProgram, plansThisMonth: number): { need: number; tier: PartnerTier } | null {
  const next = p.tiers.find((t) => t.from > plansThisMonth);
  return next ? { need: next.from - plansThisMonth, tier: next } : null;
}

const CODE_RE = /^[A-Z0-9]{4,20}$/;
export const isValidPartnerCode = (c: string) => CODE_RE.test(c);

/** RAHUL10 from "Rahul Kumar". */
export function suggestPartnerCode(name: string): string {
  const first = (name.trim().split(/\s+/)[0] ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  return `${first.length >= 2 ? first : 'COACH'}10`;
}

export type PartnerStatus = 'pending' | 'approved' | 'rejected' | 'paused';
export type CommissionStatus = 'pending' | 'paid' | 'void';

/** How a commission shows to the trainer and staff. */
export function commissionStage(c: { status: CommissionStatus; hold_until: string }, todayIst: string): 'pending' | 'approved' | 'paid' | 'void' {
  if (c.status === 'paid' || c.status === 'void') return c.status;
  return c.hold_until <= todayIst ? 'approved' : 'pending';
}

export const todayIst = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

/** "Arun K." — what a trainer sees of a client. */
export function shortName(full: string | null | undefined): string {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Client';
  const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  return parts[1] ? `${first} ${parts[1].charAt(0).toUpperCase()}.` : first;
}
