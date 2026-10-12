'use client';

import { useMenuVersion } from '@/components/providers/CatalogProvider';
import { usePricing } from '@/components/providers/CatalogProvider';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  X,
  RotateCcw,
  CheckCircle2,
  Clock,
  Layers,
  Drumstick,
  Leaf,
  CreditCard,
  QrCode,
  Flame,
  Info,
  Check,
} from 'lucide-react';
import {
  getMonthlyOperatingDays,
  getMenuForDate,
  DailyMenuResult,
  DietType,
} from '@/lib/menu-engine';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

export default function MonthlyPlanPage() {
  const menuVersion = useMenuVersion();
  const PRICING = usePricing();
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

  // Delivery slots
  const [lunchSlot, setLunchSlot] = useState('7:00 AM - 9:00 AM');
  const [dinnerSlot, setDinnerSlot] = useState('7:00 PM - 9:00 PM');

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

  // Build menu for all 24 operating days
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
      .filter((d) => d.menu.lunch.hasPeanut)
      .map((d) => d.dateStr);

    setSkippedDays((prev) => Array.from(new Set([...prev, ...peanutDayDates])));
  };

  // Price calculations
  // Monthly pricing from the database (usePricing); second meal gets the discount.
  const activeDays = calendarDays.filter((d) => !d.isSkipped);

  const totalPrice = useMemo(() => {
    let sum = 0;
    activeDays.forEach((d) => {
      const base = PRICING.monthly[d.diet];
      sum += base;
      if (mealsPerDay === 2) {
        sum += (base - PRICING.secondMealDiscount);
      }
    });
    return sum;
  }, [activeDays, mealsPerDay, PRICING]);

  const weeklyAutoPayAmount = Math.round(totalPrice / 4);

  const handleProceed = () => {
    setMonthlyOrder({
      startMonthDate: monthlyDays[0].dateStr,
      dietVariation,
      mealsPerDay,
      skippedDays,
      paymentMode,
      lunchSlot,
      dinnerSlot,
      price: totalPrice,
      schedule: activeDays.map((d) => ({ date: d.dateStr, diet: d.diet })),
    });
    router.push('/checkout');
  };

  return (
    <div className="min-h-screen bg-paper text-ink pb-28 lg:pb-32">
      {/* 1. Clear Header & Key Highlights */}
      <section className="bg-gradient-to-b from-accent-soft via-sand to-paper pt-5 sm:pt-8 pb-5 sm:pb-7 border-b border-ink/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="font-heading font-black text-2xl sm:text-4xl lg:text-5xl text-ink tracking-tight">
              Monthly Lifestyle Plan
            </h1>
            <p className="text-xs sm:text-sm text-ink/80 font-medium max-w-2xl mt-1 leading-relaxed">
              24 days of fresh chef nutrition across 4 weeks (Mon–Sat). Cooked fresh and delivered hot every morning (7:00–9:00 AM) &amp; evening (7:00–9:00 PM).
            </p>

            {/* Clear At-A-Glance Value Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-2.5 text-xs font-semibold text-ink/90">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-ink/10 shadow-2xs">
                <span>🌅 Morning (7–9 AM) &amp; 🌙 Dinner (7–9 PM)</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-ink/10 shadow-2xs">
                <span>⚡ Best value • ₹{dietVariation === 'veg' ? PRICING.monthly.veg : PRICING.monthly['non-veg']}/meal</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-ink/10 shadow-2xs">
                <span>⏸️ 1-Tap Skips Rolled Over</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Compact Controls & Quick Toggles */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-black/5 shadow-xs space-y-3">
          {/* Controls row: Diet on Left/Top, Meals on Right/Bottom */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Diet Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 shrink-0">
                Diet:
              </span>
              <div className="p-1 bg-gray-100/80 rounded-full border border-gray-200/80 shadow-2xs inline-flex items-center gap-1 overflow-x-auto scrollbar-none">
                {/* Non-Veg Button with SVG */}
                <button
                  type="button"
                  onClick={() => setDietVariation('non-veg')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all tap-active whitespace-nowrap",
                    dietVariation === 'non-veg'
                      ? "bg-ink text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 shrink-0" fill="none" aria-hidden="true">
                    <rect x="0.75" y="0.75" width="14.5" height="14.5" rx="3.5" fill="#FFFFFF" stroke="#7B3F00" strokeWidth="1.5" />
                    <polygon points="8,3.2 12.8,11.8 3.2,11.8" fill="#7B3F00" />
                  </svg>
                  <span>Non-Veg</span>
                </button>

                {/* Veg Button with SVG */}
                <button
                  type="button"
                  onClick={() => setDietVariation('veg')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all tap-active whitespace-nowrap",
                    dietVariation === 'veg'
                      ? "bg-ink text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 shrink-0" fill="none" aria-hidden="true">
                    <rect x="0.75" y="0.75" width="14.5" height="14.5" rx="3.5" fill="#FFFFFF" stroke="#16A34A" strokeWidth="1.5" />
                    <circle cx="8" cy="8" r="3.75" fill="#16A34A" />
                  </svg>
                  <span>Pure Veg</span>
                </button>

                {/* Mixed Button */}
                <button
                  type="button"
                  onClick={() => setDietVariation('mixed')}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all tap-active whitespace-nowrap",
                    dietVariation === 'mixed'
                      ? "bg-accent text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <Layers className="w-3 h-3 shrink-0" />
                  <span>Mixed</span>
                </button>
              </div>
            </div>

            {/* Meals/Day Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 shrink-0">
                Portion:
              </span>
              <div className="p-1 bg-gray-100/80 rounded-full border border-gray-200/80 shadow-2xs inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMealsPerDay(1)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold transition-all tap-active whitespace-nowrap",
                    mealsPerDay === 1
                      ? "bg-ink text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  1 Meal (Morning or Dinner)
                </button>

                <button
                  type="button"
                  onClick={() => setMealsPerDay(2)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all tap-active whitespace-nowrap",
                    mealsPerDay === 2
                      ? "bg-ink text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <span>2 Meals (Morning + Dinner)</span>
                  <span className="text-[9px] font-black bg-accent text-white px-1.5 py-0.2 rounded-full uppercase">
                    -₹10
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Dietary Filters & Allergy Bar */}
          <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
              <span>🥜 Peanut Allergy?</span>
              <span className="hidden sm:inline text-gray-400">• Skip peanut sundal days with 1-tap</span>
            </div>

            <button
              type="button"
              onClick={handleSkipAllPeanutDays}
              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-200/80 transition-colors shrink-0 tap-active"
            >
              Skip Peanut Days
            </button>
          </div>
        </div>

        {/* 3. The 24-Day Calendar Grid + Sticky Checkout Panel */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Calendar Section (Mobile View & Desktop Grid) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Mobile Calendar Experience (< lg) */}
            <div className="block lg:hidden bg-white rounded-3xl p-4 sm:p-5 border border-black/5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-black text-lg text-ink">
                    24-Day Schedule
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Tap any day to inspect the 5-item box or skip
                  </p>
                </div>
                <span className="text-[11px] font-bold text-accent bg-sand px-2.5 py-1 rounded-full shrink-0">
                  {activeDays.length}/24 Active
                </span>
              </div>

              {/* Week Tab Selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
                {[
                  { id: 0, label: 'Week 1', days: 'Days 1–6' },
                  { id: 1, label: 'Week 2', days: 'Days 7–12' },
                  { id: 2, label: 'Week 3', days: 'Days 13–18' },
                  { id: 3, label: 'Week 4', days: 'Days 19–24' },
                  { id: 'all', label: 'All 24', days: 'Full Month' },
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
                  const lunch = cDay.menu.lunch;
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

                        <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
                          <span className="font-bold text-accent">{lunch.totals.protein}g Protein</span>
                          <span>•</span>
                          <span>{lunch.totals.calories} kcal</span>
                          <span>•</span>
                          <span className="capitalize">{cDay.diet}</span>
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
                <span>* Sundays are closed for kitchen sanitisation</span>
                <span>Free credit for skipped days</span>
              </div>
            </div>

            {/* Desktop Calendar Experience (>= lg) */}
            <div className="hidden lg:block bg-white rounded-3xl p-5 sm:p-7 border border-black/5 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-black text-xl text-ink">
                    24-Day Operating Calendar
                  </h3>
                  <p className="text-xs text-gray-500">
                    4 weeks of Mon–Sat meals • Tap any cell to view 5-item box details
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
                  const lunch = cDay.menu.lunch;
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
                          {cDay.formatted.split(' ')[1]}
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
                            {lunch.totals.protein}g P
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
                  24 Days Transformation
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

              {/* Delivery Slots Selection */}
              <div className="space-y-3 text-xs">
                {mealsPerDay === 1 ? (
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Select Delivery Window</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setLunchSlot('7:00 AM - 9:00 AM')}
                        className={cn(
                          "p-2.5 rounded-xl border text-center font-bold transition-all tap-active text-xs",
                          lunchSlot.includes('AM')
                            ? "bg-ink text-white border-ink"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300"
                        )}
                      >
                        Morning (7–9 AM)
                      </button>
                      <button
                        type="button"
                        onClick={() => setLunchSlot('7:00 PM - 9:00 PM')}
                        className={cn(
                          "p-2.5 rounded-xl border text-center font-bold transition-all tap-active text-xs",
                          lunchSlot.includes('PM')
                            ? "bg-ink text-white border-ink"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300"
                        )}
                      >
                        Dinner (7–9 PM)
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">Morning Delivery Window (Breakfast)</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['7:00 AM - 8:00 AM', '8:00 AM - 9:00 AM'].map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setLunchSlot(slot)}
                            className={cn(
                              "p-2.5 rounded-xl border text-center font-bold transition-all tap-active text-xs",
                              lunchSlot === slot
                                ? "bg-ink text-white border-ink"
                                : "bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300"
                            )}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="font-bold text-gray-700 block mb-1">Dinner Delivery Window (Evening)</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['7:00 PM - 8:00 PM', '8:00 PM - 9:00 PM'].map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setDinnerSlot(slot)}
                            className={cn(
                              "p-2.5 rounded-xl border text-center font-bold transition-all tap-active text-xs",
                              dinnerSlot === slot
                                ? "bg-ink text-white border-ink"
                                : "bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300"
                            )}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Price Calculation Breakdown */}
              <div className="space-y-2 pt-2 text-xs border-t border-gray-100">
                <div className="flex justify-between text-gray-600">
                  <span>Operating Days Billed</span>
                  <span className="font-bold text-ink">{activeDays.length} / 24 Days</span>
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
                    <span>-₹10 / Dinner</span>
                  </div>
                )}

                {skippedDays.length > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Skipped Days Adjustment ({skippedDays.length} days)</span>
                    <span>Auto-Deducted</span>
                  </div>
                )}

                <div className="flex justify-between text-emerald-800 font-semibold">
                  <span>Coimbatore Doorstep Delivery</span>
                  <span>FREE</span>
                </div>

                <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline">
                  <div>
                    <span className="text-xs uppercase font-extrabold text-gray-400 block">Total Due</span>
                    <span className="text-[10px] text-gray-400">
                      {paymentMode === 'autopay' ? `Billed ₹${weeklyAutoPayAmount}/week` : 'Full 24 days prepaid'}
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
                disabled={activeDays.length === 0}
                className="w-full bg-ink hover:bg-ink-soft disabled:bg-gray-300 text-white py-4 px-6 rounded-2xl font-heading font-bold text-sm tracking-wide shadow-lg shadow-ink/25 flex items-center justify-center gap-2 tap-active transition-all group"
              >
                <span>{paymentMode === 'autopay' ? 'Setup UPI AutoPay Mandate' : 'Prepay Monthly Plan'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

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
            disabled={activeDays.length === 0}
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
            {inspectedDay.menu.lunch.hasPeanut && (
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

            {/* Morning Box Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-heading font-bold text-sm text-ink">
                  Morning Box (7:00 AM – 9:00 AM)
                </h4>
                <div className="text-xs font-mono text-accent font-bold">
                  {inspectedDay.menu.lunch.totals.protein}g Protein • {inspectedDay.menu.lunch.totals.calories} kcal
                </div>
              </div>

              <div className="space-y-2">
                {inspectedDay.menu.lunch.itemArray.map((it) => (
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
                      <span className="font-bold text-emerald-800">{it.protein}g P</span>
                      <span className="text-gray-400 block">{it.grams}g</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dinner Box Breakdown (if 2 meals) */}
            {mealsPerDay === 2 && (
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading font-bold text-sm text-accent">
                    Dinner Box Variation (7:00 PM – 9:00 PM)
                  </h4>
                  <div className="text-xs font-mono text-accent font-bold">
                    {inspectedDay.menu.dinner.totals.protein}g Protein • {inspectedDay.menu.dinner.totals.calories} kcal
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
