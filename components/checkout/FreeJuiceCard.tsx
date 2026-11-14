'use client';

import { Gift } from 'lucide-react';
import type { CheckoutOffers } from '@/lib/checkout/actions';
import { cn } from '@/lib/utils';

const OFFER_TITLE: Record<CheckoutOffers['slots'][number]['offer'], string> = {
  first_monthly: 'First-month gift',
  weekly_renewal: 'Week 2 gift',
  referral_friend: 'Referral gift',
  referral_referrer: 'Thanks for referring a friend',
};

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

/**
 * Poster offers at checkout: each free juice with a juice picker (and a day
 * picker for the monthly gift). Renders nothing when no offer applies; a
 * promise for later ("renew for week 2") shows as one quiet line.
 */
export function FreeJuiceCard({ offers, dates, onPick }: {
  offers: CheckoutOffers;
  /** The plan's delivery dates (ISO), day 1 first. */
  dates: string[];
  onPick: (key: string, pick: { juice: string; day: number }) => void;
}) {
  if (!offers.slots.length) {
    if (!offers.note) return null;
    return (
      <p className="flex items-center gap-2 rounded-2xl border border-dashed border-accent/40 bg-white px-4 py-3 text-xs text-gray-700">
        <Gift className="w-4 h-4 text-accent shrink-0" /> {offers.note}
      </p>
    );
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <Gift className="w-5 h-5 text-accent shrink-0 mt-0.5" />
        <div>
          <p className="font-heading font-black text-sm text-gray-900">
            {offers.slots.length === 1 ? 'A free juice on us' : `${offers.slots.length} free juices on us`}
          </p>
          <p className="text-xs text-gray-500">Pick your juice. It comes in the same bag as your box.</p>
        </div>
      </div>

      {offers.slots.map((s) => (
        <div key={s.key} className="space-y-2 border-t border-gray-100 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-gray-900">
              {s.label ?? OFFER_TITLE[s.offer]}
              {!s.dayChoice && dates[s.day - 1] && dates.length > 1 && <span className="font-normal text-gray-500"> · {shortDate(dates[s.day - 1])}</span>}
            </p>
            {s.dayChoice && dates.length > 1 && (
              <select
                value={s.day}
                onChange={(e) => onPick(s.key, { juice: s.juice, day: Number(e.target.value) })}
                aria-label={`Delivery day for your ${s.juiceName}`}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-800 focus:border-ink focus:outline-none"
              >
                {dates.map((d, i) => <option key={d} value={i + 1}>Day {i + 1} · {shortDate(d)}</option>)}
              </select>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none]">
            {offers.juices.map((j) => {
              const on = j.slug === s.juice;
              return (
                <button
                  key={j.slug}
                  type="button"
                  onClick={() => onPick(s.key, { juice: j.slug, day: s.day })}
                  aria-pressed={on}
                  className={cn(
                    'flex items-center gap-1.5 shrink-0 rounded-full border py-1 pl-1 pr-3 text-xs font-semibold transition-colors',
                    on ? 'border-ink bg-ink text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400',
                  )}
                >
                  {j.image ? <img src={j.image} alt="" className="w-6 h-6 rounded-full object-cover bg-gray-100" /> : <span className="w-6 h-6 rounded-full bg-gray-100" />}
                  {j.name.replace(/ Juice$/, '')}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
