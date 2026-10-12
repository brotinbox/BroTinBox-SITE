/**
 * Same formula as public.rotation_day_number() / lib/menu-engine.ts:
 * anchor Monday 2026-01-05, six operating days a week, 30-day cycle.
 * Returns null on Sundays.
 */
const ANCHOR = Date.UTC(2026, 0, 5);

export function rotationDayNumber(isoDate: string): number | null {
  const [y, m, d] = isoDate.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d);
  const dow = new Date(t).getUTCDay(); // 0 Sun … 6 Sat
  if (dow === 0) return null;
  const diffDays = Math.floor((t - ANCHOR) / 86_400_000);
  const weeks = Math.floor(diffDays / 7);
  return (Math.abs(weeks * 6 + (dow - 1)) % 30) + 1;
}

export function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function todayIST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export function weekdayLabel(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}
