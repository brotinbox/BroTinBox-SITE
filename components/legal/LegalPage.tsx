import Link from 'next/link';
import type { ReactNode } from 'react';
import { LEGAL } from '@/config/legal';

export const LEGAL_PAGES = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/refund-policy', label: 'Refund & Cancellation' },
  { href: '/delivery-policy', label: 'Delivery Policy' },
  { href: '/food-safety', label: 'Food Safety & Allergens' },
  { href: '/grievance', label: 'Grievance Redressal' },
] as const;

export type LegalSection = { id: string; title: string; body: ReactNode };

/**
 * One layout for every policy: title, effective date, a plain-language
 * summary (which never overrides the full text), numbered sections with
 * anchors, and links to the related policies.
 */
export function LegalPage({ title, current, summary, sections }: {
  title: string;
  current: string;
  summary: ReactNode[];
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-background py-10 sm:py-14 px-4 sm:px-6">
      <article className="max-w-3xl mx-auto bg-white rounded-3xl p-5 sm:p-10 border border-gray-200 shadow-sm text-sm text-gray-700 leading-relaxed">
        <header className="pb-5 border-b border-gray-100">
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-gray-900">{title}</h1>
          <p className="text-gray-500 text-xs mt-1.5">Effective {LEGAL.effectiveDate}</p>
        </header>

        <aside className="mt-6 rounded-2xl bg-[#E8F1D4]/50 border border-[#124233]/10 p-4 sm:p-5">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#124233]">In short</p>
          <ul className="mt-2 space-y-1.5 list-disc pl-5 text-[13px] text-gray-800">
            {summary.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
          <p className="mt-3 text-[11px] text-gray-500">This summary is for convenience. The full text below is what applies.</p>
        </aside>

        <nav aria-label="Contents" className="mt-6">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Contents</p>
          <ol className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-[13px]">
            {sections.map((s, i) => (
              <li key={s.id}><a href={`#${s.id}`} className="text-[#124233] hover:underline">{i + 1}. {s.title}</a></li>
            ))}
          </ol>
        </nav>

        <div className="mt-8 space-y-8">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 space-y-2.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_a]:text-[#124233] [&_a]:underline [&_strong]:text-gray-900">
              <h2 className="font-heading font-bold text-base sm:text-lg text-gray-900">{i + 1}. {s.title}</h2>
              {s.body}
            </section>
          ))}
        </div>

        <footer className="mt-10 pt-6 border-t border-gray-100">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Related policies</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {LEGAL_PAGES.filter((p) => p.href !== current).map((p) => (
              <li key={p.href}>
                <Link href={p.href} className="inline-block px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:border-[#124233]">{p.label}</Link>
              </li>
            ))}
          </ul>
        </footer>
      </article>
    </div>
  );
}

/** Two-column definition table used for contact blocks and data inventories. */
export function KeyValue({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="rounded-xl border border-gray-200 divide-y divide-gray-100 text-[13px]">
      {rows.map(([k, v]) => (
        <div key={k} className="grid sm:grid-cols-[180px_1fr] gap-1 sm:gap-4 px-3.5 py-2.5">
          <dt className="font-bold text-gray-900">{k}</dt>
          <dd className="text-gray-700">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
