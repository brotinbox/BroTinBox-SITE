'use client';

import { useMenuVersion } from '@/components/providers/CatalogProvider';
import { usePricing, useRegularTrialPrice } from '@/components/providers/CatalogProvider';
import { planTotal, savingsVsTrial } from '@/lib/pricing';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  ArrowRight,
  X,
  CreditCard,
  Sun,
  Moon,
} from 'lucide-react';
import {
  MONTHLY_MIN_DAYS,
  MONTHLY_PLAN_DAYS,
  getMonthlyOperatingDays,
  getMenuForDate,
  DailyMenuResult,
  DietType,
} from '@/lib/menu-engine';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { DietMark } from '@/components/trial/DietMark';
import { SLOT_TIME, g1 } from '@/lib/meal-display';

export default function MonthlyPlanPage() {
  const menuVersion = useMenuVersion();
  const PRICING = usePricing();
  const TRIAL_REGULAR = useRegularTrialPrice();
  const router = useRouter();
  const { setMonthlyOrder } = useAppStore();

  const monthlyDays = useMemo(() => getMonthlyOperatingDays(), []);

  // Controls
  const [mealsPerDay, setMealsPerDay] = useState<1 | 2>(1);
  const [dietVariation, setDietVariation] = useState<'non-veg' | 'veg' | 'mixed'>('non-veg');
  // Prepaid only at launch; UPI AutoPay arrives with Cashfree.
  const paymentMode = 'prepaid' as 'prepaid' | 'autopay';
  const [skippedDays, setSkippedDays] = useState<string[]>([]);
  const [mobileWeekTab, setMobileWeekTab] = useState<0 | 1 | 2 | 3 | 'all'>(0);

  // Delivery slot when 1 meal/day; with 2 meals both runs are delivered.
  const [slot, setSlot] = useState<'lunch' | 'dinner'>('lunch');
  // The box the customer receives (dinner box for dinner-only plans).
  const boxFor = (menu: DailyMenuResult) => (mealsPerDay === 1 && slot === 'dinner' ? menu.dinner : menu.lunch);

  // Modal inspection state
  const [inspectedDay, setInspectedDay] = useState<{
    dateStr: string;
    dayOfWeek: string;
    dayName: string;
    formatted: string;
    diet: DietType;
    menu: DailyMenuResult;
  } | null>(null);


  const getDayDiet = (dayOfWeek: string): DietType => {
    if (dietVariation === 'non-veg') return 'non-veg';
    if (dietVariation === 'veg') return 'veg';
    return dayOfWeek === 'Wed' || dayOfWeek === 'Fri' ? 'veg' : 'non-veg';
  };

  // Build menu for all 26 operating days
  const calendarDays = useMemo(() => {
    return monthlyDays.map((d) => {
      const diet = getDayDiet(d.dayOfWeek);
      const menu = getMenuForDate(d.dateStr, diet);
      const isSkipped = skippedDays.includes(d.dateStr);
      return {
        ...d,
        diet,
        menu,
        isSkipped,
      };
    });
  }, [monthlyDays, dietVariation, skippedDays, menuVersion]);

  // Mobile filtered calendar days
  const displayedMobileDays = useMemo(() => {
    if (mobileWeekTab === 'all') return calendarDays;
    return calendarDays.filter((d) => d.weekIndex === mobileWeekTab);
  }, [calendarDays, mobileWeekTab]);

  // Color coding helper based on main dish name
  const getMainColorTheme = (mainName: string, isVeg: boolean) => {
    if (mainName.includes('Fish')) {
      return {
        bg: 'bg-sky-50',
        border: 'border-sky-200',
        badge: 'bg-sky-100 text-sky-800 border-sky-300',
        dot: 'bg-sky-500',
      };
    }
    if (isVeg) {
      if (mainName.includes('Paneer')) {
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          badge: 'bg-amber-100 text-amber-900 border-amber-300',
          dot: 'bg-amber-500',
        };
      }
      if (mainName.includes('Tofu')) {
        return {
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          badge: 'bg-purple-100 text-purple-900 border-purple-300',
          dot: 'bg-purple-500',
        };
      }
      return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        dot: 'bg-emerald-500',
      };
    }
    // Chicken varieties
    return {
      bg: 'bg-paper',
      border: 'border-ink/15',
      badge: 'bg-accent-soft text-ink border-accent/40',
      dot: 'bg-accent',
    };
  };

  // Toggle skip day
  const toggleSkipDay = (dateStr: string) => {
    setSkippedDays((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr]
    );
  };

  // Automatically skip all peanut days helper
  const handleSkipAllPeanutDays = () => {
    const peanutDayDates = calendarDays
      .filter((d) => boxFor(d.menu).hasPeanut)
      .map((d) => d.dateStr);

    setSkippedDays((prev) => Array.from(new Set([...prev, ...peanutDayDates])));
  };

  // Price calculations
  // Monthly pricing from the database (usePricing); second meal gets the discount.
  const activeDays = calendarDays.filter((d) => !d.isSkipped);
  // The monthly rate needs at least MONTHLY_MIN_DAYS days (the server checks too).
  const tooFewDays = activeDays.length < MONTHLY_MIN_DAYS;
  const minDaysMessage = `Keep at least ${MONTHLY_MIN_DAYS} days for the monthly rate. You can skip up to ${MONTHLY_PLAN_DAYS - MONTHLY_MIN_DAYS} days.`;

  const totalPrice = useMemo(() => planTotal(PRICING, 'monthly', activeDays, mealsPerDay), [activeDays, mealsPerDay, PRICING]);
  const savedVsTrial = useMemo(
    () => savingsVsTrial(PRICING, TRIAL_REGULAR, 'monthly', activeDays, mealsPerDay),
    [activeDays, mealsPerDay, PRICING, TRIAL_REGULAR],
  );

  const weeklyAutoPayAmount = Math.round(totalPrice / 4);

  const handleProceed = () => {
    setMonthlyOrder({
      startMonthDate: monthlyDays[0].dateStr,
      dietVariation,
      mealsPerDay,
      skippedDays,
      paymentMode,
      slot: mealsPerDay === 2 ? 'lunch' : slot,
      lunchSlot: SLOT_TIME.lunch,
      dinnerSlot: SLOT_TIME.dinner,
      price: totalPrice,
      schedule: activeDays.map((d) => ({ date: d.dateStr, diet: d.diet })),
    });
    // Checkout needs an account: sign in here (choices are kept in the store), then continue.
    const store = useAppStore.getState();
    if (!store.isLoggedIn) {
      store.openSignIn({
        title: 'Sign in to continue to checkout',
        returnTo: '/checkout',
        context: {
          flow: 'monthly',
          summary: `Monthly · ${dietVariation} · ${mealsPerDay} meal${mealsPerDay > 1 ? 's' : ''}/day · from ${monthlyDays[0].dateStr}`,
        },
      });
      return;
    }
    router.push('/checkout');
  };

  return (
    <div className="min-h-screen bg-paper text-ink pb-28 lg:pb-32">
      {/* 1. Header */}
      <section className="bg-gradient-to-b from-accent-soft via-sand to-paper pt-5 sm:pt-8 pb-5 sm:pb-7 border-b border-ink/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading font-black text-2xl sm:text-4xl lg:text-5xl text-ink tracking-tight">
            Monthly Lifestyle Plan
          </h1>
          <p className="text-xs sm:text-sm text-ink/80 font-medium max-w-2xl mt-1 leading-relaxed">
            26 days, Monday to Saturday. A different box every day, cooked fresh.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] sm:text-xs font-semibold text-ink/90">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-ink/10">
              <Sun className="w-3.5 h-3.5 text-amber-600" /> Lunch {SLOT_TIME.lunch}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-ink/10">
              <Moon className="w-3.5 h-3.5 text-indigo-600" /> Dinner {SLOT_TIME.dinner}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-ink/10">
              From ₹{PRICING.monthly.veg}/meal
            </span>
          </div>
        </div>
      </section>

      {/* 2. Plan choices */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-black/5 shadow-xs grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Diet */}
          <div className="space-y-1.5 min-w-0">
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 block">Diet</span>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {([
                { key: 'veg', label: 'Veg', on: 'border-emerald-600 bg-emerald-50 text-emerald-800' },
                { key: 'non-veg', label: 'Non-Veg', on: 'border-red-600 bg-red-50 text-red-700' },
                { key: 'mixed', label: 'Mixed', on: 'border-accent bg-accent/5 text-accent' },
              ] as const).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setDietVariation(opt.key)}
                  aria-pressed={dietVariation === opt.key}
                  className={cn(
                    'py-2.5 px-1 rounded-xl border-2 text-xs sm:text-sm font-bold transition-all tap-active flex flex-col items-center gap-1',
                    dietVariation === opt.key ? opt.on : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
                  )}
                >
                  <span className="flex gap-0.5">
                    {opt.key !== 'non-veg' && <DietMark kind="veg" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    {opt.key !== 'veg' && <DietMark kind="non-veg" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  </span>
                  {opt.label}
                </button>
              ))}
            </div>
            {dietVariation === 'mixed' && (
              <p className="text-[11px] text-gray-500">Veg on Wednesday and Friday, non-veg the other days.</p>
            )}
          </div>

          {/* Meals a day */}
          <div className="space-y-1.5 min-w-0">
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 block">Meals a day</span>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {([1, 2] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMealsPerDay(n)}
                  aria-pressed={mealsPerDay === n}
                  className={cn(
                    'relative py-2.5 px-2 rounded-xl border-2 text-center transition-all tap-active',
                    mealsPerDay === n ? 'border-ink bg-paper text-ink' : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
                  )}
                >
                  <span className="text-xs sm:text-sm font-bold block">{n} Meal{n === 2 ? 's' : ''}</span>
                  <span className="text-[10px] sm:text-[11px] text-gray-500 block">
                    {n === 1 ? 'Lunch or dinner' : 'Lunch + dinner'}
                  </span>
                  {n === 2 && (
                    <span className="absolute -top-2 right-1.5 text-[9px] font-black bg-accent text-white px-1.5 py-0.5 rounded-full">
                      -₹{PRICING.secondMealDiscount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Delivery time */}
          <div className="space-y-1.5 min-w-0">
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 block">
              {mealsPerDay === 2 ? 'Delivered at' : 'Delivery time'}
            </span>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {(['lunch', 'dinner'] as const).map((s) => {
                const on = mealsPerDay === 2 || slot === s;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={mealsPerDay === 2}
                    onClick={() => setSlot(s)}
                    aria-pressed={on}
                    className={cn(
                      'py-2.5 px-2 rounded-xl border-2 transition-all tap-active flex items-center justify-center gap-1.5 disabled:cursor-default',
                      on ? 'border-ink bg-paper text-ink' : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
                    )}
                  >
                    {s === 'lunch' ? <Sun className="w-4 h-4 text-amber-600 shrink-0" /> : <Moon className="w-4 h-4 text-indigo-600 shrink-0" />}
                    <span className="text-left min-w-0">
                      <span className="text-xs sm:text-sm font-bold block">{s === 'lunch' ? 'Lunch' : 'Dinner'}</span>
                      <span className="text-[10px] text-gray-500 block whitespace-nowrap">{SLOT_TIME[s]}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Peanut allergy */}
          <div className="lg:col-span-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-3 text-xs">
            <span className="text-gray-500 text-[11px]">🥜 Peanut allergy? Skip every peanut day at once.</span>
            <button
              type="button"
              onClick={handleSkipAllPeanutDays}
              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-200/80 transition-colors shrink-0 tap-active"
            >
              Skip Peanut Days
            </button>
          </div>
        </div>

        {/* 3. The 26-Day Calendar Grid + Sticky Checkout Panel */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Calendar Section (Mobile View & Desktop Grid) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Mobile Calendar Experience (< lg) */}
            <div className="block lg:hidden bg-white rounded-3xl p-4 sm:p-5 border border-black/5 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-heading font-black text-lg text-ink">
                    Your 26 days
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Tap a day to see its box or skip it
                  </p>
                </div>
                <span className="text-[11px] font-bold text-accent bg-sand px-2.5 py-1 rounded-full shrink-0">
                  {activeDays.length}/{MONTHLY_PLAN_DAYS} Active
                </span>
              </div>

              {/* Week Tab Selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
                {[
                  { id: 0, label: 'Week 1', days: 'Days 1–6' },
                  { id: 1, label: 'Week 2', days: 'Days 7–12' },
                  { id: 2, label: 'Week 3', days: 'Days 13–18' },
                  { id: 3, label: 'Week 4', days: 'Days 19–26' },
                  { id: 'all', label: 'All 26', days: 'Full Month' },
                ].map((tab) => {
                  const isActive = mobileWeekTab === tab.id;
                  const weekActiveCount = tab.id === 'all'
                    ? activeDays.length
                    : calendarDays.filter((d) => d.weekIndex === tab.id && !d.isSkipped).length;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setMobileWeekTab(tab.id as any)}
                      className={cn(
                        "px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 tap-active",
                        isActive
                          ? "bg-ink text-white shadow-xs"
                          : "bg-sand text-ink/70 hover:text-ink"
                      )}
                    >
                      <span>{tab.label}</span>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                        isActive ? "bg-white/20 text-white" : "bg-black/5 text-gray-500"
                      )}>
                        {weekActiveCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Mobile Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {displayedMobileDays.map((cDay) => {
                  const lunch = boxFor(cDay.menu);
                  const theme = getMainColorTheme(lunch.items.main.name, cDay.diet === 'veg');
                  const isSkipped = cDay.isSkipped;
                  const dayGlobalIndex = monthlyDays.findIndex((d) => d.dateStr === cDay.dateStr) + 1;

                  return (
                    <div
                      key={cDay.dateStr}
                      className={cn(
                        "p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 relative",
                        isSkipped
                          ? "bg-gray-100/80 border-gray-200 opacity-60"
                          : `${theme.bg} ${theme.border} shadow-xs`
                      )}
                    >
                      {/* Top Bar: Date, Day Number & Allergy Warning */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-black text-sm text-ink">
                            {cDay.dayOfWeek}, {cDay.formatted}
                          </span>
                          <span className="text-[10px] font-bold text-gray-500 bg-white/80 px-1.5 py-0.5 rounded-md border border-black/5">
                            Day {dayGlobalIndex}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {lunch.hasPeanut && (
                            <span className="text-xs bg-amber-100 px-1 py-0.5 rounded-md" title="Contains Peanut Sundal">
                              🥜 Peanut
                            </span>
                          )}
                          <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", isSkipped ? "bg-gray-400" : theme.dot)} />
                        </div>
                      </div>

                      {/* Main Protein Dish Name & Portion Macros */}
                      <div className="space-y-1">
                        <span className={cn(
                          "font-heading font-bold text-sm block leading-snug",
                          isSkipped ? "text-gray-400 line-through" : "text-ink"
                        )}>
                          {lunch.items.main.name}
                        </span>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                          <DietMark kind={cDay.diet} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="font-bold text-accent">{g1(lunch.totals.protein)}g protein</span>
                          <span>·</span>
                          <span>{Math.round(lunch.totals.calories)} kcal</span>
                        </div>
                      </div>

                      {/* Interactive Buttons */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/5">
                        <button
                          type="button"
                          onClick={() => setInspectedDay(cDay)}
                          className="text-xs font-bold text-ink hover:underline flex items-center gap-1 py-1 tap-active"
                        >
                          <span>5-Item Box</span>
                          <ArrowRight className="w-3 h-3 text-accent" />
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleSkipDay(cDay.dateStr)}
                          className={cn(
                            "px-3 py-1 rounded-xl text-xs font-bold transition-all tap-active",
                            isSkipped
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-white text-red-600 border border-red-200 hover:bg-red-50"
                          )}
                        >
                          {isSkipped ? "Restore Day" : "Skip Day"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                <span>Closed on Sundays</span>
                <span>Skipped days aren't charged</span>
              </div>
            </div>

            {/* Desktop Calendar Experience (>= lg) */}
            <div className="hidden lg:block bg-white rounded-3xl p-5 sm:p-7 border border-black/5 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-black text-xl text-ink">
                    26-Day Operating Calendar
                  </h3>
                  <p className="text-xs text-gray-500">
                    A month of Mon–Sat meals • Tap any cell to view 5-item box details
                  </p>
                </div>
                <span className="text-xs font-bold text-accent bg-sand px-3 py-1 rounded-full">
                  {activeDays.length} Days Active
                </span>
              </div>

              {/* Calendar Grid Headers */}
              <div className="grid grid-cols-6 gap-2 text-center text-xs font-black uppercase tracking-wider text-gray-400 pb-2 border-b border-gray-100">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Grid Cells (4 rows of 6 days) */}
              <div className="grid grid-cols-6 gap-2 sm:gap-3">
                {calendarDays.map((cDay) => {
                  const lunch = boxFor(cDay.menu);
                  const theme = getMainColorTheme(lunch.items.main.name, cDay.diet === 'veg');
                  const isSkipped = cDay.isSkipped;

                  return (
                    <div
                      key={cDay.dateStr}
                      onClick={() => setInspectedDay(cDay)}
                      className={cn(
                        "relative p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between aspect-square group",
                        isSkipped
                          ? "bg-gray-100/70 border-gray-200 opacity-50"
                          : `${theme.bg} ${theme.border} hover:shadow-md hover:-translate-y-0.5`
                      )}
                    >
                      {/* Top Bar: Date & Status */}
                      <div className="flex items-start justify-between">
                        <span className="font-heading font-black text-xs sm:text-sm text-ink">
                          {cDay.formatted.split(' ')[0]}
                        </span>
                        <div className="flex items-center gap-1">
                          {lunch.hasPeanut && (
                            <span className="text-[10px]" title="Contains Peanuts">
                              🥜
                            </span>
                          )}
                          <span className={cn("w-2 h-2 rounded-full", isSkipped ? "bg-gray-400" : theme.dot)} />
                        </div>
                      </div>

                      {/* Main Protein Tag */}
                      <div className="my-auto">
                        <span className={cn(
                          "text-[9px] sm:text-[10px] font-bold block truncate leading-tight",
                          isSkipped ? "text-gray-400 line-through" : "text-ink"
                        )}>
                          {isSkipped ? "Skipped" : lunch.items.main.name.split(' ')[0]}
                        </span>
                        {!isSkipped && (
                          <span className="text-[9px] font-mono text-gray-500 block truncate">
                            {g1(lunch.totals.protein)}g P
                          </span>
                        )}
                      </div>

                      {/* Bottom indicator */}
                      <div className="text-[8px] font-black uppercase tracking-wider text-gray-400 flex items-center justify-between">
                        <span>W{cDay.weekIndex + 1}</span>
                        <span className="group-hover:text-ink transition-colors">Inspect &rarr;</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                <span>* Sundays are closed kitchen days for deep sanitisation.</span>
                <span>Lab verification pending for macros.</span>
              </div>
            </div>
          </div>

          {/* Right Column: Pricing & Checkout Panel */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-black/5 shadow-xl shadow-ink/5 space-y-5">
              <div className="pb-4 border-b border-gray-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Monthly Subscription</span>
                <h3 className="font-heading font-black text-xl text-ink mt-0.5">
                  26 Days Transformation
                </h3>
                <p className="text-xs text-gray-500">
                  Starts {monthlyDays[0].dayName}, {monthlyDays[0].formatted}
                </p>
              </div>

              {/* Billing: prepaid only at launch */}
              <div className="p-3 rounded-2xl border border-gray-200 bg-gray-50 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-gray-800">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Prepaid · one payment by UPI</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">Skip or pause any day before 9 PM the night before. Skipped meals move to the end of your plan.</p>
              </div>

              {/* Price Calculation Breakdown */}
              <div className="space-y-2 pt-2 text-xs border-t border-gray-100">
                <div className="flex justify-between text-gray-600">
                  <span>Operating Days Billed</span>
                  <span className="font-bold text-ink">{activeDays.length} / {MONTHLY_PLAN_DAYS} Days</span>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>Monthly Rate / Meal</span>
                  <span className="font-mono font-bold">
                    {dietVariation === 'non-veg' ? `₹${PRICING.monthly['non-veg']} NV` : dietVariation === 'veg' ? `₹${PRICING.monthly.veg} V` : `₹${PRICING.monthly['non-veg']} / ₹${PRICING.monthly.veg}`}
                  </span>
                </div>

                {mealsPerDay === 2 && (
                  <div className="flex justify-between text-accent font-semibold">
                    <span>2nd Meal Discount</span>
                    <span>-₹{PRICING.secondMealDiscount} / Dinner</span>
                  </div>
                )}

                {skippedDays.length > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Skipped Days Adjustment ({skippedDays.length} days)</span>
                    <span>Auto-Deducted</span>
                  </div>
                )}

                {savedVsTrial > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>You save vs one-off boxes</span>
                    <span>-₹{savedVsTrial}</span>
                  </div>
                )}

                <div className="flex justify-between text-emerald-800 font-semibold">
                  <span>Delivery</span>
                  <span>Free in core zones · fee shown at checkout</span>
                </div>

                <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline">
                  <div>
                    <span className="text-xs uppercase font-extrabold text-gray-400 block">Total Due</span>
                    <span className="text-[10px] text-gray-400">
                      {paymentMode === 'autopay' ? `Billed ₹${weeklyAutoPayAmount}/week` : `${activeDays.length} days prepaid`}
                    </span>
                  </div>
                  <span className="font-heading font-black text-3xl text-ink">
                    ₹{totalPrice}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleProceed}
                disabled={tooFewDays}
                className="w-full bg-ink hover:bg-ink-soft disabled:bg-gray-300 text-white py-4 px-6 rounded-2xl font-heading font-bold text-sm tracking-wide shadow-lg shadow-ink/25 flex items-center justify-center gap-2 tap-active transition-all group"
              >
                <span>{paymentMode === 'autopay' ? 'Setup UPI AutoPay Mandate' : 'Prepay Monthly Plan'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              {tooFewDays && (
                <p className="text-[11px] font-semibold text-accent text-center">{minDaysMessage}</p>
              )}

              <div className="text-[11px] text-gray-400 text-center space-y-1">
                <p>✓ Prepaid by UPI • Pause anytime before the 9 PM cutoff</p>
                <p>✓ Automated credit adjustments on all skipped days</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Sticky Checkout Action Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-ink/15 px-4 py-3 shadow-[0_-8px_25px_rgba(0,0,0,0.12)]">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-heading font-black text-2xl text-ink">
                ₹{totalPrice}
              </span>
              <span className="text-[11px] font-bold text-gray-500">
                / {activeDays.length} days
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
              <span className="text-accent font-bold">
                ₹{activeDays.length > 0 ? Math.round(totalPrice / (activeDays.length * mealsPerDay)) : 0}/meal
              </span>
              <span>•</span>
              <span>
                {paymentMode === 'autopay' ? `AutoPay: ₹${weeklyAutoPayAmount}/wk` : 'Prepaid'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleProceed}
            disabled={tooFewDays}
            title={tooFewDays ? minDaysMessage : undefined}
            className="bg-ink hover:bg-ink-soft disabled:bg-gray-300 text-white py-3 px-5 rounded-2xl font-heading font-bold text-xs tracking-wide shadow-md shadow-ink/20 flex items-center gap-1.5 tap-active shrink-0 transition-transform active:scale-95"
          >
            <span>{paymentMode === 'autopay' ? 'Subscribe Plan' : 'Prepay Plan'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. Day Inspection Modal (Opens on day tap) */}
      {inspectedDay && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[88vh] overflow-y-auto border border-black/10 shadow-2xl p-5 sm:p-6 space-y-4 sm:space-y-5 animate-in slide-in-from-bottom sm:zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading font-black text-xl text-ink">
                    {inspectedDay.dayName}, {inspectedDay.formatted}
                  </span>
                  <span className={cn(
                    "text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase",
                    inspectedDay.diet === 'non-veg' ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
                  )}>
                    {inspectedDay.diet === 'non-veg' ? 'Non-Veg' : 'Veg'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  5-item rotating protein box breakdown
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInspectedDay(null)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Peanut Warning Banner (if applicable) */}
            {boxFor(inspectedDay.menu).hasPeanut && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🥜</span>
                  <div>
                    <span className="font-bold text-amber-900 block">Peanut Allergen Notice</span>
                    <span className="text-[11px] text-amber-800">This box contains Steamed Peanut Sundal.</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleSkipDay(inspectedDay.dateStr)}
                  className="px-3 py-1.5 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold text-xs"
                >
                  {skippedDays.includes(inspectedDay.dateStr) ? "Restored" : "Free Skip Day"}
                </button>
              </div>
            )}

            {/* Main box breakdown */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <h4 className="font-heading font-bold text-sm text-ink">
                  {mealsPerDay === 1 && slot === 'dinner'
                    ? `Dinner Box (${SLOT_TIME.dinner})`
                    : `Lunch Box (${SLOT_TIME.lunch})`}
                </h4>
                <div className="text-xs text-accent font-bold">
                  {g1(boxFor(inspectedDay.menu).totals.protein)}g protein · {Math.round(boxFor(inspectedDay.menu).totals.calories)} kcal
                </div>
              </div>

              <div className="space-y-2">
                {boxFor(inspectedDay.menu).itemArray.map((it) => (
                  <div key={it.id} className="p-3 rounded-2xl bg-sand border border-ink/10 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-gray-200">
                        <Image src={it.image} alt={it.name} fill sizes="40px" className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase font-bold text-gray-400 block">{it.category}</span>
                        <span className="font-bold text-ink block truncate">{it.name}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-mono text-[11px]">
                      <span className="font-bold text-emerald-800">{g1(it.protein)}g P</span>
                      <span className="text-gray-400 block">{g1(it.grams)}g</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dinner Box Breakdown (if 2 meals) */}
            {mealsPerDay === 2 && (
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <h4 className="font-heading font-bold text-sm text-accent">
                    Dinner Box ({SLOT_TIME.dinner})
                  </h4>
                  <div className="text-xs text-accent font-bold">
                    {g1(inspectedDay.menu.dinner.totals.protein)}g protein · {Math.round(inspectedDay.menu.dinner.totals.calories)} kcal
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-accent-soft/60 border border-accent/20 text-xs space-y-1">
                  <p className="font-bold text-ink">
                    Main: {inspectedDay.menu.dinner.items.main.name}
                  </p>
                  <p className="text-gray-600">
                    Rotated Salad: <span className="font-semibold text-ink">{inspectedDay.menu.dinner.items.salad.name}</span>
                  </p>
                  <p className="text-gray-600">
                    Rotated Legume: <span className="font-semibold text-ink">{inspectedDay.menu.dinner.items.legume.name}</span>
                  </p>
                  <p className="text-gray-600">
                    Rotated Carb: <span className="font-semibold text-ink">{inspectedDay.menu.dinner.items.carb.name}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Skip Toggle Button inside modal */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  toggleSkipDay(inspectedDay.dateStr);
                }}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all tap-active",
                  skippedDays.includes(inspectedDay.dateStr)
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-red-50 text-red-700 hover:bg-red-100"
                )}
              >
                {skippedDays.includes(inspectedDay.dateStr) ? "Restore this Day" : "Skip this Day (Auto-Refund)"}
              </button>

              <button
                type="button"
                onClick={() => setInspectedDay(null)}
                className="px-5 py-2 rounded-xl bg-ink text-white text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
