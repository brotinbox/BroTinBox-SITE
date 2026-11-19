'use client';

import Link from 'next/link';
import { Fragment, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GUIDE_SECTIONS, topicHaystack, words, type GuideSectionKey, type GuideTopic } from '@/lib/admin/guide';

const STOP = new Set(['how', 'do', 'i', 'the', 'a', 'an', 'to', 'what', 'is', 'my', 'can', 'for', 'of', 'in', 'on', 'and', 'where', 'when', 'we', 'it', 'does', 'should', 'with', 'or', 'be', 'me']);
const SUGGESTIONS = ['UPI payment', 'skip a meal', 'buy list', 'add bill', 'holiday', 'price change', 'refund', 'add staff', 'tatkal', 'recipe'];

/** "payments" also finds "payment", "cooking" finds "cook". */
const stem = (t: string) => t.replace(/(ing|es|ed|s)$/u, '');
const terms = (q: string) => words(q).split(' ').filter((t) => t && !STOP.has(t));
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function score(t: GuideTopic, hay: string, toks: string[]): number {
  let total = 0;
  const title = words(t.title);
  const keys = words(t.keywords ?? '');
  for (const tok of toks) {
    const s = stem(tok).length >= 3 ? stem(tok) : tok;
    if (!hay.includes(s)) return 0;      // every word must match somewhere
    total += title.includes(s) ? 6 : keys.includes(s) ? 3 : 1;
  }
  return total;
}

function Highlight({ text, re }: { text: string; re: RegExp | null }) {
  if (!re) return <>{text}</>;
  const parts = text.split(re);
  return <>{parts.map((p, i) => (i % 2 === 1 ? <mark key={i} className="bg-amber-200/80 text-inherit rounded px-0.5">{p}</mark> : <Fragment key={i}>{p}</Fragment>))}</>;
}

/**
 * Searchable staff guide: type words ("upi paid", "holiday", "buy list") and
 * only matching topics stay, best match first, with the words highlighted.
 */
export function GuideSearch({ topics, base, initialQuery = '' }: { topics: GuideTopic[]; base: string; initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery);
  const [section, setSection] = useState<GuideSectionKey | 'all'>('all');
  const query = useDeferredValue(q);
  const input = useRef<HTMLInputElement>(null);

  const label = useMemo(() => new Map(GUIDE_SECTIONS.map((s) => [s.key, s.label])), []);
  const indexed = useMemo(() => topics.map((t) => ({ t, hay: topicHaystack(t, label.get(t.section) ?? '') })), [topics, label]);
  const toks = useMemo(() => terms(query), [query]);
  const re = useMemo(() => {
    if (!toks.length) return null;
    const alts = [...new Set(toks.map((t) => (stem(t).length >= 3 ? stem(t) : t)))].sort((a, b) => b.length - a.length).map(escape);
    return new RegExp(`(${alts.join('|')})`, 'giu');
  }, [toks]);

  const results = useMemo(() => {
    const inSection = indexed.filter(({ t }) => section === 'all' || t.section === section);
    if (!toks.length) return inSection.map(({ t }) => t);
    return inSection.map(({ t, hay }) => ({ t, s: score(t, hay, toks) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.t);
  }, [indexed, toks, section]);

  // Keep ?q= in the address so a search can be shared; "/" focuses the box.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (query.trim()) url.searchParams.set('q', query.trim()); else url.searchParams.delete('q');
    window.history.replaceState(null, '', url);
  }, [query]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') { e.preventDefault(); input.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const searching = toks.length > 0;
  const grouped = GUIDE_SECTIONS.map((s) => ({ ...s, items: results.filter((t) => t.section === s.key) })).filter((g) => g.items.length);

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-1 px-1 pt-1 pb-3 bg-gray-50/95 backdrop-blur print:hidden">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden />
          <input
            ref={input}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') setQ(''); }}
            placeholder="Search the guide: e.g. upi payment, skip, buy list, holiday…"
            aria-label="Search the guide"
            className="w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-10 py-3 text-sm text-gray-900 shadow-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          {q && (
            <button type="button" onClick={() => { setQ(''); input.current?.focus(); }} aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 inline-flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          <Chip active={section === 'all'} onClick={() => setSection('all')}>All</Chip>
          {GUIDE_SECTIONS.map((s) => (
            <Chip key={s.key} active={section === s.key} onClick={() => setSection(s.key)}>{s.label}</Chip>
          ))}
        </div>
        {searching && (
          <p className="mt-1.5 text-xs text-gray-500" role="status">
            {results.length ? `${results.length} topic${results.length === 1 ? '' : 's'} match “${query.trim()}”` : ''}
            {section !== 'all' && results.length > 0 && <> in {label.get(section)} · <button type="button" className="font-bold text-primary" onClick={() => setSection('all')}>search everywhere</button></>}
          </p>
        )}
      </div>

      {results.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
          <p className="font-heading font-bold text-gray-900">Nothing matches “{query.trim()}”</p>
          <p className="text-sm text-gray-600 mt-1">Try fewer or simpler words{section !== 'all' ? ', or search all sections' : ''}. For example:</p>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {section !== 'all' && <Chip active={false} onClick={() => setSection('all')}>Search all sections</Chip>}
            {SUGGESTIONS.map((s) => <Chip key={s} active={false} onClick={() => setQ(s)}>{s}</Chip>)}
          </div>
        </div>
      ) : searching ? (
        <div className="space-y-3">
          {results.map((t) => <TopicCard key={t.id} t={t} re={re} base={base} sectionLabel={label.get(t.section)} />)}
        </div>
      ) : (
        <>
          {section === 'all' && (
            <div className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
              <span className="font-semibold">Popular:</span>
              {SUGGESTIONS.map((s) => <Chip key={s} active={false} onClick={() => setQ(s)}>{s}</Chip>)}
            </div>
          )}
          <div className="space-y-8">
            {grouped.map((g) => (
              <section key={g.key} id={g.key} className="scroll-mt-32">
                <h2 className="font-heading font-black text-lg text-gray-900 mb-3">{g.label}</h2>
                <div className="space-y-3">
                  {g.items.map((t) => <TopicCard key={t.id} t={t} re={null} base={base} />)}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('shrink-0 px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap transition-colors',
        active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-900')}>
      {children}
    </button>
  );
}

function TopicCard({ t, re, base, sectionLabel }: { t: GuideTopic; re: RegExp | null; base: string; sectionLabel?: string }) {
  const H = ({ s }: { s: string }) => <Highlight text={s} re={re} />;
  return (
    <article id={`topic-${t.id}`} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 max-sm:p-4 scroll-mt-32">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {sectionLabel && <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{sectionLabel}</p>}
          <h3 className="font-heading font-bold text-gray-900"><H s={t.title} /></h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {t.who && <span className="text-[10px] font-bold uppercase tracking-wider rounded-full bg-gray-100 text-gray-600 px-2 py-0.5">{t.who}</span>}
          {t.href && <Link href={`${base}${t.href === '/' ? '' : t.href}`} className="text-xs font-bold text-primary hover:underline whitespace-nowrap">Open →</Link>}
        </div>
      </div>

      {t.steps && (
        <ol className="mt-3 space-y-2">
          {t.steps.map((s, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-gray-700 leading-relaxed">
              <span className="w-5 h-5 mt-0.5 shrink-0 rounded-full bg-gray-900 text-white text-[10px] font-black inline-flex items-center justify-center">{i + 1}</span>
              <span><H s={s} /></span>
            </li>
          ))}
        </ol>
      )}

      {t.text && <p className={cn('text-sm text-gray-600 leading-relaxed', t.steps ? 'mt-3' : 'mt-2')}><H s={t.text} /></p>}

      {t.rows && (
        <dl className="mt-3 divide-y divide-gray-100 border-t border-gray-100">
          {t.rows.rows.map(([a, b]) => (
            <div key={a} className="grid sm:grid-cols-[13rem_1fr] gap-x-4 gap-y-0.5 py-2">
              <dt className="text-sm font-semibold text-gray-900"><H s={a} /></dt>
              <dd className="text-sm text-gray-600"><H s={b} /></dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}
