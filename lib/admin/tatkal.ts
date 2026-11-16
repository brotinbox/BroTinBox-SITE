import 'server-only';

/** site_settings.tatkal (migration 0045): last IST time staff can move an order to today, per slot. */
export type TatkalSettings = { enabled: boolean; lunch_until: string; dinner_until: string };

export const TATKAL_DEFAULTS: TatkalSettings = { enabled: true, lunch_until: '10:00', dinner_until: '18:00' };

export function tatkalSettings(value: unknown): TatkalSettings {
  const v = (value ?? {}) as Partial<TatkalSettings>;
  return {
    enabled: v.enabled ?? TATKAL_DEFAULTS.enabled,
    lunch_until: v.lunch_until || TATKAL_DEFAULTS.lunch_until,
    dinner_until: v.dinner_until || TATKAL_DEFAULTS.dinner_until,
  };
}

/** Today's date and the current HH:MM in IST. */
export function nowIst(): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

/** "18:00" → "6:00 PM" */
export function fmtClock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
