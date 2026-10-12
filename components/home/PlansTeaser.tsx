'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PlanTier } from '@/types';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';

interface PlansTeaserProps {
  plans: PlanTier[];
}

export function PlansTeaser({ plans }: PlansTeaserProps) {
  const [billingCycle, setBillingCycle] = useState<'weekly' | 'monthly'>('weekly');
  const { setSelectedTier } = useAppStore();

  return (
    <section className="py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
            Transparent Pricing
          </span>
          <h2 className="font-heading font-black text-3xl sm:text-4xl text-gray-900 mt-2">
            Simple, Honest Subscription Plans
          </h2>
          <p className="text-gray-600 text-sm mt-2">
            Cooked fresh 6 days a week (Monday to Saturday). Pause or swap meals anytime.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-6 inline-flex p-1 bg-white rounded-full border border-gray-200 shadow-sm">
            <button
              onClick={() => setBillingCycle('weekly')}
              className={cn(
                "px-5 py-2 rounded-full text-xs font-bold transition-all tap-active",
                billingCycle === 'weekly'
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              Weekly (6 days)
            </button>
            <button
              onClick={() => setBillingCycle('monthly')}
              className={cn(
                "px-5 py-2 rounded-full text-xs font-bold transition-all tap-active flex items-center gap-1.5",
                billingCycle === 'monthly'
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <span>Monthly (24 days)</span>
              <span className="bg-lime-brand text-primary-dark font-extrabold text-[10px] px-1.5 py-0.5 rounded-full uppercase">
                Save 12%
              </span>
            </button>
          </div>
        </div>

        {/* 3 Main Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {plans.slice(0, 3).map((plan) => {
            const isPopular = plan.isPopular;
            const price = billingCycle === 'weekly' ? plan.weeklyPrice : plan.monthlyPrice;
            const perMeal = billingCycle === 'weekly' ? plan.pricePerMealWeekly : plan.pricePerMealMonthly;

            return (
              <div
                key={plan.id}
                className={cn(
                  "bg-white rounded-3xl p-6 sm:p-8 border transition-all duration-300 flex flex-col justify-between relative shadow-card hover:shadow-card-hover",
                  isPopular
                    ? "border-primary ring-2 ring-primary/20 shadow-lg md:-translate-y-2"
                    : "border-gray-200"
                )}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-lime-brand text-xs font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Most Popular</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading font-black text-2xl text-gray-900">
                      {plan.name}
                    </h3>
                    <span className="text-xs font-bold bg-primary-light text-primary px-2.5 py-1 rounded-full">
                      {plan.mealsPerDay} {plan.mealsPerDay === 1 ? 'Meal' : 'Meals'}/day
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 mt-2 min-h-[32px] leading-relaxed">
                    {plan.tagline}
                  </p>

                  {/* Price Banner */}
                  <div className="mt-5 p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="font-heading font-black text-3xl sm:text-4xl text-gray-950">
                        {formatCurrency(price)}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">
                        /{billingCycle === 'weekly' ? 'week' : 'month'}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-center gap-2 text-xs">
                      <span className="font-bold text-emerald-700">
                        {formatCurrency(perMeal)} / meal
                      </span>
                      <span className="text-gray-400 line-through">
                        {formatCurrency(plan.oneOffComparePrice)} one-off
                      </span>
                    </div>
                  </div>

                  {/* Target Macros */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-emerald-50 rounded-xl p-2 border border-emerald-100">
                      <p className="text-[10px] text-emerald-700 font-bold uppercase">Daily Protein</p>
                      <p className="font-heading font-extrabold text-emerald-900 mt-0.5">{plan.dailyProteinTarget}</p>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-2 border border-orange-100">
                      <p className="text-[10px] text-orange-700 font-bold uppercase">Daily Calories</p>
                      <p className="font-heading font-extrabold text-orange-900 mt-0.5">{plan.dailyCaloriesTarget}</p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="mt-6 space-y-2.5">
                    {plan.features.slice(0, 5).map((f) => (
                      <div key={f} className="flex items-start gap-2.5 text-xs text-gray-700">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-gray-100">
                  <Link
                    href={billingCycle === 'monthly' ? '/monthly' : '/weekly'}
                    onClick={() => setSelectedTier(plan)}
                    className={cn(
                      "w-full py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all tap-active shadow-sm",
                      isPopular
                        ? "bg-cta hover:bg-cta-hover text-white shadow-cta/25 hover:shadow-lg"
                        : "bg-primary hover:bg-primary-hover text-white"
                    )}
                  >
                    <span>Choose {plan.name}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-50 text-xs font-bold text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>View Full Subscription Pricing & Feature Comparison &rarr;</span>
          </Link>
          <Link
            href="/weekly"
            className="text-xs font-bold text-primary hover:underline underline-offset-4"
          >
            Explore Next Week&apos;s Planned 6-Day Food Rotation &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
