import Link from 'next/link';

function shift(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Prev / date input / next, as a GET form so it works without JS. */
export function DatePicker({ action, date, extra }: { action: string; date: string; extra?: Record<string, string | undefined> }) {
  const qs = (d: string) => `${action}?${new URLSearchParams({ date: d, ...Object.fromEntries(Object.entries(extra ?? {}).filter(([, v]) => v) as [string, string][]) })}`;
  return (
    <form action={action} method="get" className="flex items-center gap-2">
      {Object.entries(extra ?? {}).map(([k, v]) => v ? <input key={k} type="hidden" name={k} value={v} /> : null)}
      <Link href={qs(shift(date, -1))} className="px-2.5 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold hover:bg-gray-50">←</Link>
      <input type="date" name="date" defaultValue={date} className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm" />
      <button className="px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold">Go</button>
      <Link href={qs(shift(date, 1))} className="px-2.5 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold hover:bg-gray-50">→</Link>
    </form>
  );
}

export function isIsoDate(v: string | undefined): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
}
