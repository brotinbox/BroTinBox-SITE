'use client';

import Link from 'next/link';
import { ArrowRight, Check, Star } from 'lucide-react';
import { usePricing, useRegularTrialPrice } from '@/components/providers/CatalogProvider';
import { MAX_SKIPS, PLAN_DAYS, guaranteedDiscountPercent } from '@/lib/pricing';

/**
 * "Pick a box" list on an empty checkout. No rupee prices here: they differ by
 * veg / non-veg and the plan pages show the right one. Monthly is the value
 * pick: split ribbon, heavier frame, and a saving that holds for both diets.
 */
export function PlanPicks() {
  const pricing = usePricing();
  const regular = useRegularTrialPrice();
  const monthlySave = guaranteedDiscountPercent(pricing, regular, 'monthly');

  const plain = [
    { href: '/tomorrow', title: 'Try one day', note: 'A single box, delivered tomorrow' },
    { href: '/weekly', title: 'Weekly plan', note: `${PLAN_DAYS.weekly} days, lower price per meal` },
  ];
  const perks = [
    `${PLAN_DAYS.monthly} days of meals`,
    'Lowest plan rate',
    `Skip up to ${MAX_SKIPS.monthly} days`,
  ];

  return (
    <div className="space-y-2.5">
      {plain.map((p) => (
        <Link key={p.href} href={p.href}
          className="group flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 hover:border-ink">
          <span className="min-w-0">
            <span className="block font-heading font-bold text-sm text-ink">{p.title}</span>
            <span className="block text-xs text-gray-500">{p.note}</span>
          </span>
          <ArrowRight className="w-4 h-4 shrink-0 text-gray-300 group-hover:text-ink" />
        </Link>
      ))}

      {/* Monthly: the value pick */}
      <Link href="/monthly"
        className="group relative block rounded-2xl border-2 border-ink bg-gradient-to-br from-white via-white to-accent-soft px-4 pt-6 pb-4 mt-5 shadow-[0_10px_28px_-14px_rgba(234,88,12,0.55)] transition-transform hover:-translate-y-0.5">
        {/* Split ribbon sitting on the top edge */}
        <span className="absolute -top-3 left-4 flex overflow-hidden rounded-md shadow-sm text-[10px] font-black uppercase tracking-[0.12em]">
          <span className="flex items-center gap-1 bg-ink text-white px-2.5 py-1">
            <Star className="w-3 h-3 fill-accent-bright text-accent-bright" /> Best value
          </span>
          {monthlySave > 0 && <span className="bg-accent text-white px-2.5 py-1">Save {monthlySave}%</span>}
        </span>

        <span className="block font-heading font-black text-base text-ink">Monthly plan</span>
        <span className="block text-xs text-gray-600 mt-0.5">Fresh meals all month, the biggest saving of any plan</span>

        <span className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {perks.map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-accent-soft">
                <Check className="w-2.5 h-2.5 text-accent stroke-[3]" />
              </span>
              {t}
            </span>
          ))}
        </span>

        <span className="mt-3.5 flex items-center justify-between rounded-xl bg-ink px-3.5 py-2.5 text-xs font-bold text-white group-hover:bg-ink-soft">
          Choose monthly
          <ArrowRight className="w-4 h-4 text-accent-bright transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </div>
  );
}
