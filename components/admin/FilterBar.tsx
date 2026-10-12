import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * GET-form search + status tabs. Works without JavaScript; the URL holds the
 * state so filtered views can be bookmarked and shared between staff.
 */
export function FilterBar({ action, q, searchPlaceholder, tabs, current, param = 'status', extra }: {
  action: string;
  q?: string;
  searchPlaceholder?: string;
  tabs?: { value: string; label: string }[];
  current?: string;
  param?: string;
  extra?: Record<string, string | undefined>;
}) {
  const hrefFor = (value: string) => {
    const sp = new URLSearchParams();
    if (value) sp.set(param, value);
    if (q) sp.set('q', q);
    Object.entries(extra ?? {}).forEach(([k, v]) => v && sp.set(k, v));
    const s = sp.toString();
    return s ? `${action}?${s}` : action;
  };
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
      {tabs && (
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <Link
              key={t.value}
              href={hrefFor(t.value)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-bold border transition-colors',
                (current ?? '') === t.value ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50')}
            >
              {t.label}
            </Link>
          ))}
        </div>
      )}
      {searchPlaceholder && (
        <form action={action} method="get" className="md:ml-auto flex gap-2">
          {current && <input type="hidden" name={param} value={current} />}
          {Object.entries(extra ?? {}).map(([k, v]) => v ? <input key={k} type="hidden" name={k} value={v} /> : null)}
          <input
            name="q"
            defaultValue={q}
            maxLength={100}
            placeholder={searchPlaceholder}
            className="w-64 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
          <button className="px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold">Search</button>
        </form>
      )}
    </div>
  );
}

/** Escapes % and _ so user search text is matched literally in ilike. */
export function likePattern(q: string) {
  return `%${q.replace(/[\\%_]/g, (m) => `\\${m}`).replace(/[(),]/g, ' ')}%`;
}
