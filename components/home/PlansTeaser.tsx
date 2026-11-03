'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { usePricing, useRegularTrialPrice, useTrialOffer } from '@/components/providers/CatalogProvider';
import {
  PLAN_DAYS, fullPlanTotal, guaranteedDiscountPercent, perMealAverage, savingsVsTrial,
  type PricedDiet,
} from '@/lib/pricing';

/**
 * Home-page plan cards. Same three options, names and numbers as /pricing
 * (both read lib/pricing.ts), so the two pages can never disagree.
 */
export function PlansTeaser() {
  const PRICING = usePricing();
  const TRIAL_REGULAR = useRegularTrialPrice();
  const trialOffer = useTrialOffer();
  const [diet, setDiet] = useState<PricedDiet>('non-veg');
  const [cycle, setCycle] = useState<'weekly' | 'monthly'>('weekly');

  const days = PLAN_DAYS[cycle];
  const cycleName = cycle === 'weekly' ? 'Weekly' : 'Monthly';
  const fullDays = Array.from({ length: days }, () => ({ diet }));
  const monthlySavePct = guaranteedDiscountPercent(PRICING, TRIAL_REGULAR, 'monthly');
  const href = `/${cycle}?diet=${diet}`;

  const cards = [1, 2].map((m) => {
    const mpd = m as 1 | 2;
    return {
      key: `m${m}`,
      title: `${days * m}-${m === 1 ? 'Day' : 'Meal'} ${cycleName} Plan`,
      badge: m === 1 ? '1 meal/day' : '2 meals/day',
      blurb: m === 1
        ? 'One measured protein box every day, Mon–Sat.'
        : `Lunch + dinner every day, ₹${PRICING.secondMealDiscount} off each second meal.`,
      total: fullPlanTotal(PRICING, cycle, diet, mpd),
      perMeal: perMealAverage(PRICING, cycle, diet, mpd),
      saved: savingsVsTrial(PRICING, TRIAL_REGULAR, cycle, fullDays, mpd),
      popular: m === 2,
      cta: `Choose ${m === 1 ? days + '-Day' : days * 2 + '-Meal'} ${cycleName}`,
    };
  });

  const pill = (active: boolean) =>
    cn('px-4 sm:px-5 py-2 rounded-full text-xs font-bold transition-all tap-active whitespace-nowrap',
      active ? 'bg-ink text-white shadow-xs' : 'text-gray-600 hover:text-gray-900');

  return (
    <section className="py-12 sm:py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-10">
          <span className="text-xs font-extrabold uppercase tracking-wider text-accent">Transparent Pricing</span>
          <h2 className="font-heading font-black text-lg sm:text-4xl text-gray-900 mt-1">Simple, Honest Subscription Plans</h2>
          <p className="hidden sm:block text-gray-600 text-sm mt-2">
            Cooked fresh 6 days a week (Monday to Saturday). Skip a day and your bill drops.
          </p>

          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="inline-flex p-1 bg-white rounded-full border border-gray-200 shadow-sm">
              <button type="button" onClick={() => setDiet('non-veg')} className={pill(diet === 'non-veg')}>Non-Veg</button>
              <button type="button" onClick={() => setDiet('veg')} className={pill(diet === 'veg')}>Pure Veg</button>
            </div>
            <div className="inline-flex p-1 bg-white rounded-full border border-gray-200 shadow-sm">
              <button type="button" onClick={() => setCycle('weekly')} className={pill(cycle === 'weekly')}>
                Weekly ({PLAN_DAYS.weekly} days)
              </button>
              <button type="button" onClick={() => setCycle('monthly')} className={cn(pill(cycle === 'monthly'), 'flex items-center gap-1.5')}>
                <span>Monthly ({PLAN_DAYS.monthly} days)</span>
                {monthlySavePct > 0 && (
                  <span className="bg-accent text-ink-deep font-black text-[10px] px-1.5 py-0.5 rounded-full uppercase">Save {monthlySavePct}%</span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-stretch">
          {cards.map((c) => (
            <div
              key={c.key}
              className={cn(
                'bg-white rounded-3xl p-5 sm:p-6 border flex flex-col justify-between relative',
                c.popular ? 'border-2 border-ink shadow-xl shadow-ink/10 md:-translate-y-2' : 'border-gray-200 shadow-sm',
              )}
            >
              {c.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                  <Sparkles className="w-3 h-3" /> Most popular
                </span>
              )}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-heading font-black text-lg sm:text-xl text-gray-900">{c.title}</h3>
                  <span className="text-[11px] font-bold bg-accent-soft text-ink px-2.5 py-1 rounded-full whitespace-nowrap">{c.badge}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">{c.blurb}</p>

                <div className="mt-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="font-heading font-black text-3xl text-ink">{formatCurrency(c.total)}</span>
                    <span className="text-xs text-gray-500 font-medium">/{cycle === 'weekly' ? 'week' : 'month'}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-2 text-xs">
                    <span className="font-bold text-accent">{formatCurrency(c.perMeal)} / meal</span>
                    <span className="text-gray-400 line-through">{formatCurrency(TRIAL_REGULAR[diet])} one-off</span>
                  </div>
                  {c.saved > 0 && (
                    <p className="mt-1.5 text-[11px] font-bold text-emerald-700">You save {formatCurrency(c.saved)} vs one-off boxes</p>
                  )}
                </div>
              </div>
              <Link
                href={href}
                className="mt-5 w-full py-3.5 px-4 rounded-2xl font-bold text-sm bg-ink hover:bg-ink-soft text-white flex items-center justify-center gap-2 tap-active shadow-sm"
              >
                <span>{c.cta}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}

          {/* Daily trial */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-heading font-black text-lg sm:text-xl text-gray-900">Daily Trial Box</h3>
                <span className="text-[11px] font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full whitespace-nowrap">No commitment</span>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">Try one box first. No auto-renewal, no recurring charge.</p>
              <div className="mt-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                {trialOffer && (
                  <span className="inline-block mb-1.5 rounded-full bg-accent-soft text-accent px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">{trialOffer.label}</span>
                )}
                <div className="flex items-baseline justify-center gap-1">
                  {trialOffer && <s className="mr-1 text-base font-bold text-gray-400">{formatCurrency(TRIAL_REGULAR[diet])}</s>}
                  <span className="font-heading font-black text-3xl text-ink">{formatCurrency(PRICING.trial[diet])}</span>
                  <span className="text-xs text-gray-500 font-medium">/box</span>
                </div>
                <p className="mt-1 text-xs font-bold text-gray-700">Single-day trial</p>
              </div>
            </div>
            <Link
              href={`/tomorrow?diet=${diet}`}
              className="mt-5 w-full py-3.5 px-4 rounded-2xl font-bold text-sm border-2 border-ink text-ink hover:bg-ink hover:text-white flex items-center justify-center gap-2 tap-active"
            >
              <span>Book Tomorrow&apos;s Trial Box</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent-soft text-xs font-bold text-ink border border-accent-muted hover:bg-accent-muted transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Compare all plans &amp; what&apos;s included &rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
