'use client';

import { usePricing } from '@/components/providers/CatalogProvider';
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { DietType } from '@/lib/menu-engine';

export default function PricingPage() {
  const PRICING = usePricing();
  const [diet, setDiet] = useState<DietType>('non-veg');
  const [billingCycle, setBillingCycle] = useState<'weekly' | 'monthly'>('weekly');

  // Prices come from the database (admin › Plans & pricing) via usePricing().
  const isNV = diet === 'non-veg';
  const trialPrice = PRICING.trial[diet];

  // 1 Meal/day prices
  const p1WeeklyPerMeal = isNV ? 289 : 259;
  const p1WeeklyTotal = p1WeeklyPerMeal * 6; // ₹1,734 (NV) or ₹1,554 (Veg)

  const p1MonthlyPerMeal = isNV ? 269 : 239;
  const p1MonthlyTotal = p1MonthlyPerMeal * 24; // ₹6,456 (NV) or ₹5,736 (Veg)

  // 2 Meals/day prices (Lunch + Dinner with -₹10 second meal discount)
  const p2WeeklyPerMeal = isNV ? 284 : 254; // (289 * 2 - 10) / 2
  const p2WeeklyTotal = isNV ? 3408 : 3048; // (289 * 2 - 10) * 6

  const p2MonthlyPerMeal = isNV ? 264 : 234; // (269 * 2 - 10) / 2
  const p2MonthlyTotal = isNV ? 12672 : 11232; // (269 * 2 - 10) * 24

  return (
    <div className="min-h-screen bg-[#FBFDF8] text-[#124233]">
      {/* 1. Centered Header & Dual Interactive Switchers */}
      <section className="pt-8 sm:pt-14 pb-8 sm:pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-black uppercase tracking-wider text-[#899545]">
            Transparent Pricing
          </span>

          <h1 className="font-heading font-black text-2xl sm:text-4xl lg:text-5xl text-[#124233] mt-2 tracking-tight">
            Simple, Honest Subscription Plans
          </h1>

          <p className="text-xs sm:text-sm text-gray-600 mt-2 max-w-xl mx-auto">
            Cooked fresh 6 days a week (Monday to Saturday). Pause or swap meals anytime.
          </p>

          {/* Dual Toggle Container */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-2xl mx-auto">
            {/* Diet Toggle (Matching FSSAI Non-Veg Triangle & Pure Veg Dot Pill) */}
            <div className="p-1 sm:p-1.5 bg-white rounded-full border border-gray-200/90 shadow-xs inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDiet('non-veg')}
                className={cn(
                  'flex items-center justify-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all tap-active whitespace-nowrap',
                  diet === 'non-veg'
                    ? 'bg-[#124233] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {/* Indian FSSAI Non-Veg Symbol with solid Brown Triangle */}
                <svg viewBox="0 0 16 16" className="w-4 h-4 shrink-0" fill="none" aria-hidden="true">
                  <rect x="0.75" y="0.75" width="14.5" height="14.5" rx="3.5" fill="#FFFFFF" stroke="#7B3F00" strokeWidth="1.5" />
                  <polygon points="8,3.2 12.8,11.8 3.2,11.8" fill="#7B3F00" />
                </svg>
                <span>Non-Veg</span>
              </button>

              <button
                type="button"
                onClick={() => setDiet('veg')}
                className={cn(
                  'flex items-center justify-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all tap-active whitespace-nowrap',
                  diet === 'veg'
                    ? 'bg-[#124233] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {/* Indian FSSAI Pure Veg Symbol with solid Green Circle */}
                <svg viewBox="0 0 16 16" className="w-4 h-4 shrink-0" fill="none" aria-hidden="true">
                  <rect x="0.75" y="0.75" width="14.5" height="14.5" rx="3.5" fill="#FFFFFF" stroke="#16A34A" strokeWidth="1.5" />
                  <circle cx="8" cy="8" r="3.75" fill="#16A34A" />
                </svg>
                <span>Pure Veg</span>
              </button>
            </div>

            {/* Billing Cycle Toggle: Weekly (6 days) vs Monthly (24 days) SAVE 12% */}
            <div className="inline-flex p-1 sm:p-1.5 bg-white rounded-full border border-gray-200/90 shadow-xs">
              <button
                type="button"
                onClick={() => setBillingCycle('weekly')}
                className={cn(
                  "px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all tap-active whitespace-nowrap",
                  billingCycle === 'weekly'
                    ? "bg-[#124233] text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                Weekly (6 days)
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={cn(
                  "px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all tap-active flex items-center gap-1.5 whitespace-nowrap",
                  billingCycle === 'monthly'
                    ? "bg-[#124233] text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <span>Monthly (24 days)</span>
                <span className="bg-[#84cc16] text-[#0f2e23] font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  SAVE 12%
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Three Dynamic Subscription Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-28 md:pb-20 pt-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {/* Card 1: 1 Meal / Day Plan */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-black text-2xl text-gray-900 tracking-tight">
                  {billingCycle === 'weekly' ? '6-Day Weekly Plan' : '24-Day Monthly Plan'}
                </h3>
                <span className="text-xs font-bold bg-[#E8F1D4] text-[#124233] px-2.5 py-1 rounded-full whitespace-nowrap">
                  1 Meal/day
                </span>
              </div>

              <p className="text-xs text-gray-500 mt-2 min-h-[32px] leading-relaxed">
                {billingCycle === 'weekly'
                  ? 'One fixed measured protein box every day (Mon-Sat, Sunday kitchen closed).'
                  : 'Full month consistent habit: 24 cooking-free days with maximum per-meal savings.'}
              </p>

              {/* Price Banner */}
              <div className="mt-5 p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="font-heading font-black text-3xl sm:text-4xl text-[#124233]">
                    {formatCurrency(billingCycle === 'weekly' ? p1WeeklyTotal : p1MonthlyTotal)}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    /{billingCycle === 'weekly' ? 'week' : 'month'}
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-center gap-2 text-xs">
                  <span className="font-bold text-emerald-800">
                    {formatCurrency(billingCycle === 'weekly' ? p1WeeklyPerMeal : p1MonthlyPerMeal)} / meal
                  </span>
                  <span className="text-gray-400 line-through">
                    {formatCurrency(trialPrice)} one-off
                  </span>
                </div>
              </div>

              {/* Target Macros */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-emerald-50 rounded-xl p-2.5 border border-emerald-100">
                  <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Daily Protein</p>
                  <p className="font-heading font-extrabold text-emerald-900 mt-0.5">
                    {isNV ? '75g - 80g' : '42g - 48g'}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-xl p-2.5 border border-orange-100">
                  <p className="text-[10px] text-orange-700 font-bold uppercase tracking-wider">Daily Calories</p>
                  <p className="font-heading font-extrabold text-orange-900 mt-0.5">685 - 725 kcal</p>
                </div>
              </div>

              {/* Features */}
              <div className="mt-6 space-y-2.5 text-xs text-gray-700">
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    {billingCycle === 'weekly' ? '6 fresh daily boxes' : '24 fresh daily boxes'} (Mon–Sat rotation)
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Digital scale calories &amp; protein printed on every box</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>9:00 PM previous-night pause &amp; skip cutoff</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>100% free doorstep delivery across Coimbatore</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-100">
              <Link
                href={billingCycle === 'weekly' ? `/weekly?diet=${diet}` : `/monthly?diet=${diet}`}
                className="w-full py-3.5 px-4 rounded-2xl font-heading font-bold text-xs sm:text-sm bg-[#124233] hover:bg-[#0c2e23] text-white flex items-center justify-center gap-2 transition-all tap-active shadow-sm"
              >
                <span>Choose {billingCycle === 'weekly' ? 'Weekly 1-Meal' : 'Monthly 1-Meal'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 2: 2 Meals / Day Plan (MOST POPULAR) */}
          <div className="bg-[#FAFDF6] rounded-3xl p-6 sm:p-8 border-2 border-[#124233] shadow-xl shadow-[#124233]/10 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between relative md:-translate-y-2">
            {/* Top Popular Floating Ribbon */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-[#124233] text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md flex items-center gap-1.5 whitespace-nowrap">
                <Sparkles className="w-3 h-3 text-[#E2ECBA]" />
                <span>MOST POPULAR • Save ₹10 on 2nd Meal</span>
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-black text-2xl text-gray-900 tracking-tight">
                  {billingCycle === 'weekly' ? '12-Meal Weekly Plan' : '48-Meal Monthly Plan'}
                </h3>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full whitespace-nowrap">
                  2 Meals/day
                </span>
              </div>

              <p className="text-xs text-gray-600 mt-2 min-h-[32px] leading-relaxed">
                Complete morning + dinner daily nutrition with built-in ₹10 discount on every second meal.
              </p>

              {/* Price Banner */}
              <div className="mt-5 p-4 rounded-2xl bg-white border border-[#124233]/15 text-center shadow-xs">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="font-heading font-black text-3xl sm:text-4xl text-[#124233]">
                    {formatCurrency(billingCycle === 'weekly' ? p2WeeklyTotal : p2MonthlyTotal)}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    /{billingCycle === 'weekly' ? 'week' : 'month'}
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-center gap-2 text-xs">
                  <span className="font-bold text-emerald-800">
                    {formatCurrency(billingCycle === 'weekly' ? p2WeeklyPerMeal : p2MonthlyPerMeal)} / meal
                  </span>
                  <span className="text-gray-400 line-through">
                    {formatCurrency(trialPrice)} one-off
                  </span>
                </div>
              </div>

              {/* Target Macros */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-emerald-50 rounded-xl p-2.5 border border-emerald-100">
                  <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Daily Protein</p>
                  <p className="font-heading font-extrabold text-emerald-900 mt-0.5">
                    {isNV ? '150g - 160g' : '85g - 96g'}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-xl p-2.5 border border-orange-100">
                  <p className="text-[10px] text-orange-700 font-bold uppercase tracking-wider">Daily Calories</p>
                  <p className="font-heading font-extrabold text-orange-900 mt-0.5">1370 - 1450 kcal</p>
                </div>
              </div>

              {/* Features */}
              <div className="mt-6 space-y-2.5 text-xs text-gray-800">
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5 stroke-[2.5]" />
                  <span>
                    <strong>2 boxes/day:</strong> Morning (7:00–9:00 AM) &amp; Dinner (7:00–9:00 PM)
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5 stroke-[2.5]" />
                  <span>
                    <strong>Second meal discount:</strong> ₹10 off every evening box automatically
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5 stroke-[2.5]" />
                  <span>Single-tap pause or skip any day before 9:00 PM</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5 stroke-[2.5]" />
                  <span>Dedicated WhatsApp dietitian consultation included</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#124233]/10">
              <Link
                href={billingCycle === 'weekly' ? `/weekly?diet=${diet}` : `/monthly?diet=${diet}`}
                className="w-full py-4 px-4 rounded-2xl font-heading font-black text-xs sm:text-sm bg-[#124233] hover:bg-[#0c2e23] text-white flex items-center justify-center gap-2 transition-all tap-active shadow-lg shadow-[#124233]/25"
              >
                <span>Choose {billingCycle === 'weekly' ? '12-Meal Weekly' : '48-Meal Monthly'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 3: Daily Trial Box */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-black text-2xl text-gray-900 tracking-tight">
                  Daily Trial Box
                </h3>
                <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full whitespace-nowrap">
                  Zero Commitment
                </span>
              </div>

              <p className="text-xs text-gray-500 mt-2 min-h-[32px] leading-relaxed">
                Test digital kitchen scale precision and taste tomorrow&apos;s rotating signature bento box.
              </p>

              {/* Price Banner */}
              <div className="mt-5 p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="font-heading font-black text-3xl sm:text-4xl text-[#124233]">
                    {formatCurrency(trialPrice)}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    /box
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-center gap-2 text-xs">
                  <span className="font-bold text-gray-700">
                    Single-day trial
                  </span>
                  <span className="text-gray-400">
                    • Free doorstep delivery
                  </span>
                </div>
              </div>

              {/* Target Macros */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-emerald-50 rounded-xl p-2.5 border border-emerald-100">
                  <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Protein / Box</p>
                  <p className="font-heading font-extrabold text-emerald-900 mt-0.5">
                    {isNV ? '~80g Protein' : '~45g Protein'}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-xl p-2.5 border border-orange-100">
                  <p className="text-[10px] text-orange-700 font-bold uppercase tracking-wider">Calories</p>
                  <p className="font-heading font-extrabold text-orange-900 mt-0.5">685 - 725 kcal</p>
                </div>
              </div>

              {/* Features */}
              <div className="mt-6 space-y-2.5 text-xs text-gray-700">
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>1 freshly cooked 5-compartment chef bento box</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Choose exact delivery time (Morning or Dinner)</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>9:00 PM previous-night cutoff lock guarantee</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Zero automatic renewal or hidden recurring charge</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-100">
              <Link
                href={`/tomorrow?diet=${diet}`}
                className="w-full py-3.5 px-4 rounded-2xl font-heading font-bold text-xs sm:text-sm border-2 border-[#124233] text-[#124233] hover:bg-[#124233] hover:text-white flex items-center justify-center gap-2 transition-all tap-active"
              >
                <span>Book Tomorrow&apos;s Trial Box</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
