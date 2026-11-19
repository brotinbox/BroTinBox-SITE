import 'server-only';
import { getSupabaseService } from '@/lib/supabase/admin';

/**
 * Same-day single boxes (migration 0052). The kitchen cooks a few SPARE boxes
 * per run on top of the 9 PM cook sheet; customers can order one of them for
 * today until the slot's cutoff (site_settings.same_day). The database checks
 * again when the order is created and when it is paid.
 */

export type Slot = 'lunch' | 'dinner';
export type DbDiet = 'veg' | 'non_veg';
export type SameDaySettings = { enabled: boolean; lunch_until: string; dinner_until: string; grace_minutes: number };

export const SAME_DAY_DEFAULTS: SameDaySettings = { enabled: true, lunch_until: '09:30', dinner_until: '17:00', grace_minutes: 40 };

export function sameDaySettings(value: unknown): SameDaySettings {
  const v = (value ?? {}) as Partial<SameDaySettings>;
  return {
    enabled: v.enabled ?? SAME_DAY_DEFAULTS.enabled,
    lunch_until: v.lunch_until || SAME_DAY_DEFAULTS.lunch_until,
    dinner_until: v.dinner_until || SAME_DAY_DEFAULTS.dinner_until,
    grace_minutes: Number(v.grace_minutes ?? SAME_DAY_DEFAULTS.grace_minutes),
  };
}

export type SameDayRow = {
  day: string; slot: Slot; diet: DbDiet; until_time: string; is_open: boolean;
  spares: number; used: number; held: number; spares_left: number;
};

/** Rows for today (or another date, for staff). Throws if the RPC fails (e.g. migration not run). */
export async function getSameDayRows(date?: string): Promise<SameDayRow[]> {
  const { data, error } = await getSupabaseService().rpc('same_day_status', date ? { p_date: date } : {});
  if (error) throw error;
  return (data ?? []) as SameDayRow[];
}

/** What the order screen needs. Counts are capped so order volume isn't public. */
export type SameDayOffer = {
  date: string;
  slots: Record<Slot, { open: boolean; until: string; left: Record<DbDiet, number> }>;
};

export const FEW_SPARES = 3;

export async function getSameDayOffer(): Promise<SameDayOffer | null> {
  const rows = await getSameDayRows();
  if (!rows.length) return null;
  const slot = (s: Slot) => {
    const r = rows.filter((x) => x.slot === s);
    const left = (d: DbDiet) => Math.min(r.find((x) => x.diet === d)?.spares_left ?? 0, FEW_SPARES + 1);
    return { open: r.some((x) => x.is_open), until: r[0]?.until_time ?? '', left: { veg: left('veg'), non_veg: left('non_veg') } };
  };
  return { date: rows[0].day, slots: { lunch: slot('lunch'), dinner: slot('dinner') } };
}

/** Why a same-day order can't go through, or null when every slot asked for is open with a spare left. */
export async function sameDayProblem(date: string, slots: Slot[], diet: DbDiet): Promise<string | null> {
  const rows = await getSameDayRows();
  if (!rows.length || rows[0].day !== date) return 'Same-day ordering is only for today. Please pick another day.';
  for (const s of slots) {
    const r = rows.find((x) => x.slot === s && x.diet === diet);
    const name = s === 'lunch' ? 'lunch' : 'dinner';
    if (!r || !r.is_open) return `Same-day ${name} orders closed at ${fmtClock(r?.until_time ?? '')} today. Please pick tomorrow.`;
    if (r.spares_left <= 0) return `Today's ${diet === 'veg' ? 'veg' : 'non-veg'} ${name} boxes are sold out. Please pick tomorrow.`;
  }
  return null;
}

/** "17:00" → "5:00 PM" */
export function fmtClock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return hhmm;
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Today's date in IST (YYYY-MM-DD). */
export const todayIst = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
