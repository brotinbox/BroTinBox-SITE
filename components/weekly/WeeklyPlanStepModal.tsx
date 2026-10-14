'use client';

import { useMenuVersion } from '@/components/providers/CatalogProvider';
import { usePricing } from '@/components/providers/CatalogProvider';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Leaf,
  Drumstick,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Plus,
  QrCode,
  CreditCard,
  Calendar,
  Layers,
  Sparkles,
  Ban,
  RotateCcw,
  Flame,
  Dumbbell,
  AlertTriangle,
} from 'lucide-react';
import {
  getNextWeekOperatingDays,
  getMenuForDate,
  DietType,
  DailyMenuResult,
} from '@/lib/menu-engine';
import { useAppStore } from '@/store/useAppStore';
import { submitOrder, toDbDiet } from '@/lib/checkout/submit';
import { cn, formatCurrency } from '@/lib/utils';
import { useDeliveryZones } from '@/lib/location';
import { OrderTerms } from '@/components/legal/OrderTerms';

export function WeeklyPlanStepModal() {
  const menuVersion = useMenuVersion();
  const PRICING = usePricing();
  const router = useRouter();
  const {
    addresses,
    selectedAddressId,
    setSelectedAddressId,
    user,
  } = useAppStore();

  // Wizard Step: 1 = Diet Strategy, 2 = Schedule & Skip, 3 = Menu Preview, 4 = Address, 5 = Review & Pay
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Smoothly align scroll to top of dialog on step change
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }

    if (modalRef.current) {
      const navOffset = 70; // Clearance for top navbar
      const currentScroll =
        window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
      const elementTop = modalRef.current.getBoundingClientRect().top + currentScroll;
      const targetScroll = Math.max(0, elementTop - navOffset);

      window.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });
    }
  }, [step]);

  const { getZoneByPincode } = useDeliveryZones();

  // Operating 6 days (Mon-Sat)
  const nextWeekDays = useMemo(() => getNextWeekOperatingDays(), []);

  // Step 1: Diet Variation
  const [dietVariation, setDietVariation] = useState<'non-veg' | 'veg' | 'mixed'>('non-veg');

  // Step 2: Schedule & Skip Days & Meals per Day
  const [skippedDays, setSkippedDays] = useState<string[]>([]);
  const [mealsPerDay, setMealsPerDay] = useState<1 | 2>(1);
  const [lunchSlot, setLunchSlot] = useState('7:00 AM - 9:00 AM');
  const [dinnerSlot, setDinnerSlot] = useState('7:00 PM - 9:00 PM');

  // Toggle skipping a day
  const toggleSkipDay = (dateStr: string) => {
    setSkippedDays((prev) => {
      if (prev.includes(dateStr)) {
        return prev.filter((d) => d !== dateStr);
      } else {
        // Enforce maximum 3 skipped days (minimum 3 active days)
        if (prev.length >= 3) {
          alert('A minimum of 3 operating days is required for a weekly routine.');
          return prev;
        }
        return [...prev, dateStr];
      }
    });
  };

  // Determine diet for each day based on dietVariation
  const getDayDiet = (dayOfWeek: string): DietType => {
    if (dietVariation === 'non-veg') return 'non-veg';
    if (dietVariation === 'veg') return 'veg';
    // Mixed: Mon, Tue, Thu, Sat -> Non-Veg (4); Wed, Fri -> Veg (2)
    return dayOfWeek === 'Wed' || dayOfWeek === 'Fri' ? 'veg' : 'non-veg';
  };

  // Daily menus for all 6 days
  const weeklyMenus = useMemo(() => {
    return nextWeekDays.map((d) => {
      const diet = getDayDiet(d.dayOfWeek);
      const menu = getMenuForDate(d.dateStr, diet);
      return {
        ...d,
        diet,
        menu,
        isSkipped: skippedDays.includes(d.dateStr),
      };
    });
  }, [nextWeekDays, dietVariation, skippedDays, menuVersion]);

  // Step 3: Tab Inspection
  const [inspectedDayIndex, setInspectedDayIndex] = useState(0);

  // Active Days and Pricing Calculations
  const activeDays = useMemo(() => weeklyMenus.filter((d) => !d.isSkipped), [weeklyMenus]);

  const pricingCalculations = useMemo(() => {
    let baseWeeklyTotal = 0;
    activeDays.forEach((d) => {
      const dayBase = PRICING.weekly[d.diet];
      baseWeeklyTotal += dayBase;
      if (mealsPerDay === 2) {
        baseWeeklyTotal += dayBase - PRICING.secondMealDiscount;
      }
    });

    const trialEquivalentTotal = activeDays.reduce((sum, d) => {
      const singleDayBase = PRICING.trial[d.diet];
      return (
        sum +
        singleDayBase +
        (mealsPerDay === 2 ? singleDayBase - PRICING.secondMealDiscount : 0)
      );
    }, 0);

    const weeklySavings = trialEquivalentTotal - baseWeeklyTotal;

    return {
      total: baseWeeklyTotal,
      savings: Math.max(0, weeklySavings),
      activeCount: activeDays.length,
      skippedCount: skippedDays.length,
    };
  }, [activeDays, mealsPerDay, skippedDays, PRICING]);

  // Step 4: Address
  const activeAddress = useMemo(() => {
    return addresses.find((a) => a.id === selectedAddressId) || addresses[0];
  }, [addresses, selectedAddressId]);

  const [useNewAddress, setUseNewAddress] = useState(addresses.length === 0);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState((user?.phone || '').replace(/^\+91/, ''));
  const [flatNumber, setFlatNumber] = useState('');
  const [street, setStreet] = useState('');
  const [area, setArea] = useState('');
  const [pincode, setPincode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [payError, setPayError] = useState('');

  // Pincode validation & zone detection
  const detectedZone = useMemo(() => getZoneByPincode(pincode), [getZoneByPincode, pincode]);

  const isEnteringNewAddress = useNewAddress || addresses.length === 0 || !activeAddress;

  // Step validations
  const canGoNextFromStep1 = true;
  const canGoNextFromStep2 = pricingCalculations.activeCount >= 3;
  const canGoNextFromStep4 = isEnteringNewAddress
    ? flatNumber.trim().length > 0 &&
      street.trim().length > 0 &&
      area.trim().length > 0 &&
      pincode.trim().length === 6 &&
      Boolean(detectedZone)
    : Boolean(activeAddress);

  // Place a real order: the server prices it and we go to the UPI payment page.
  const handlePay = async () => {
    setPayError('');
    setIsProcessing(true);
    const error = await submitOrder(
      {
        type: 'weekly',
        mealsPerDay,
        slot: 'lunch',
        days: activeDays.map((d) => ({ date: d.dateStr, diet: toDbDiet(d.diet) })),
        addonIds: [],
        preferences: { isEggFree: false, skipLegume: false, dietVariation },
        addressId: isEnteringNewAddress ? undefined : activeAddress?.id,
      },
      {
        newAddress: isEnteringNewAddress
          ? { recipientName: fullName, phone, flat: flatNumber, street, area, pincode }
          : undefined,
        navigate: (href) => router.push(href),
      }
    );
    if (error) {
      setPayError(error);
      setIsProcessing(false);
    }
  };

  return (
    <div
      ref={modalRef}
      className="w-full max-w-2xl mx-auto bg-white rounded-2xl sm:rounded-[36px] border border-ink/10 shadow-xl sm:shadow-2xl shadow-ink/10 overflow-hidden flex flex-col scroll-mt-20 sm:scroll-mt-6 transition-[min-height] duration-200"
    >
      {/* Top Header: Progress Indicator */}
      <div className="bg-paper border-b border-ink/10 px-4 sm:px-8 py-3 sm:py-5">
        <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="font-heading font-black text-xs sm:text-base text-ink truncate">
              6-Day Weekly Routine
            </span>
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider bg-accent/20 text-ink px-2 py-0.5 rounded-full shrink-0">
              Step {step}/5
            </span>
          </div>

          <span className="text-[11px] sm:text-xs font-bold text-gray-500 shrink-0 text-right">
            {step === 1 && 'Diet Strategy'}
            {step === 2 && 'Days & Meals'}
            {step === 3 && 'Week Preview'}
            {step === 4 && 'Delivery'}
            {step === 5 && 'Prepay & Save'}
          </span>
        </div>

        {/* 5-Step Segmented Bar */}
        <div className="grid grid-cols-5 gap-1 sm:gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={cn(
                'h-1.5 sm:h-2 rounded-full transition-all duration-300',
                step === s
                  ? 'bg-ink'
                  : step > s
                  ? 'bg-accent'
                  : 'bg-gray-200'
              )}
            />
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div
        ref={contentRef}
        className="p-3.5 sm:p-8 flex-1 overflow-y-auto sm:max-h-[calc(85vh-160px)] min-h-[420px] sm:min-h-[460px] transition-all"
      >
        {/* ================= STEP 1: DIET STRATEGY ================= */}
        {step === 1 && (
          <div className="space-y-3.5 sm:space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="font-heading font-black text-xl sm:text-3xl text-ink">
                Choose your weekly diet
              </h2>
              <p className="text-[11px] sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                6 days of non-repeating kitchen recipes calibrated for steady muscle nourishment.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:gap-3.5">
              {/* Option 1: High-Protein Non-Veg */}
              <button
                type="button"
                onClick={() => setDietVariation('non-veg')}
                className={cn(
                  'p-3.5 sm:p-5 rounded-2xl border-2 text-left transition-all tap-active flex items-start justify-between active:scale-[0.99]',
                  dietVariation === 'non-veg'
                    ? 'border-ink bg-paper ring-2 ring-ink/15'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                    <Drumstick className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-base sm:text-lg text-gray-900">
                      High-Protein Non-Veg (6 Days)
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Kongu pepper chicken breast, fish, herb grilled cuts & boiled whole egg whites every day.
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        ~75g+ Protein / Day
                      </span>
                      <span className="text-xs font-bold text-accent">
                        from ₹{PRICING.weekly.veg} / day
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    'w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 mt-1',
                    dietVariation === 'non-veg'
                      ? 'border-ink bg-ink text-white'
                      : 'border-gray-300'
                  )}
                >
                  {dietVariation === 'non-veg' && <Check className="w-3 sm:w-3.5 h-3 sm:h-3.5 stroke-[3]" />}
                </div>
              </button>

              {/* Option 2: Balanced Mixed Diet */}
              <button
                type="button"
                onClick={() => setDietVariation('mixed')}
                className={cn(
                  'p-3.5 sm:p-5 rounded-2xl border-2 text-left transition-all tap-active flex items-start justify-between active:scale-[0.99]',
                  dietVariation === 'mixed'
                    ? 'border-ink bg-paper ring-2 ring-ink/15'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-500/10 text-blue-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                    <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-heading font-black text-base sm:text-lg text-gray-900">
                        Balanced Mixed Routine
                      </h3>
                      <span className="text-[9px] font-black uppercase tracking-wider text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                        Popular
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      4 Non-Veg Days (Mon, Tue, Thu, Sat) + 2 Pure Veg Days (Wed, Fri for light recovery).
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                        ~65g+ Avg Protein
                      </span>
                      <span className="text-xs font-bold text-accent">
                        ₹279 / day avg
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    'w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 mt-1',
                    dietVariation === 'mixed'
                      ? 'border-ink bg-ink text-white'
                      : 'border-gray-300'
                  )}
                >
                  {dietVariation === 'mixed' && <Check className="w-3 sm:w-3.5 h-3 sm:h-3.5 stroke-[3]" />}
                </div>
              </button>

              {/* Option 3: Pure Vegetarian */}
              <button
                type="button"
                onClick={() => setDietVariation('veg')}
                className={cn(
                  'p-3.5 sm:p-5 rounded-2xl border-2 text-left transition-all tap-active flex items-start justify-between active:scale-[0.99]',
                  dietVariation === 'veg'
                    ? 'border-ink bg-paper ring-2 ring-ink/15'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                    <Leaf className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-base sm:text-lg text-gray-900">
                      Pure Vegetarian (6 Days)
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Malai paneer cubes, organic tofu, roasted soya chunks & mint probiotic curd.
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        ~45g+ Clean Protein
                      </span>
                      <span className="text-xs font-bold text-accent">
                        ₹259 / day
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    'w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 mt-1',
                    dietVariation === 'veg'
                      ? 'border-ink bg-ink text-white'
                      : 'border-gray-300'
                  )}
                >
                  {dietVariation === 'veg' && <Check className="w-3 sm:w-3.5 h-3 sm:h-3.5 stroke-[3]" />}
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: SCHEDULE & SKIP DAYS ================= */}
        {step === 2 && (
          <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="font-heading font-black text-xl sm:text-3xl text-ink">
                Your 6-day schedule
              </h2>
              <p className="text-[11px] sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                Going out or fasting? Tap any day below to skip it. Your bill automatically reduces.
              </p>
            </div>

            {/* Mon-Sat Interactive Grid */}
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Tap to Skip or Include Days
                </label>
                <span className="text-xs font-extrabold text-ink">
                  {pricingCalculations.activeCount} of 6 Days Active
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {weeklyMenus.map((day) => {
                  const isSkipped = day.isSkipped;
                  return (
                    <button
                      key={day.dateStr}
                      type="button"
                      onClick={() => toggleSkipDay(day.dateStr)}
                      className={cn(
                        'p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border-2 text-center transition-all tap-active flex flex-col items-center justify-between min-h-[90px] active:scale-[0.98]',
                        isSkipped
                          ? 'border-dashed border-gray-300 bg-gray-50/70 text-gray-400 opacity-70'
                          : 'border-ink bg-paper text-gray-900 shadow-xs'
                      )}
                    >
                      <span className="text-[10px] font-mono text-gray-400 block">
                        {day.formatted}
                      </span>
                      <span className="font-heading font-black text-sm sm:text-base block mt-0.5">
                        {day.dayOfWeek}
                      </span>
                      <div className="mt-1">
                        {isSkipped ? (
                          <span className="text-[9px] font-black uppercase tracking-tight text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full inline-block">
                            Skipped
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase tracking-tight text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-full inline-block">
                            {day.diet === 'non-veg' ? '🍗 NV' : '🧀 Veg'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Status Banner */}
              <div className="p-3 rounded-xl bg-sand border border-ink/10 flex items-center justify-between text-xs text-ink">
                <span className="font-medium">
                  {pricingCalculations.skippedCount > 0 ? (
                    <>
                      <strong>{pricingCalculations.skippedCount} Day Skipped</strong> (You save ₹
                      {pricingCalculations.skippedCount * 289})
                    </>
                  ) : (
                    'All 6 operating days included in weekly routine'
                  )}
                </span>
                <span className="font-heading font-black text-sm">
                  {formatCurrency(pricingCalculations.total)}
                </span>
              </div>
            </div>

            {/* Meals Per Day Toggle */}
            <div className="space-y-1.5 sm:space-y-2 pt-2 border-t border-gray-100">
              <label className="text-[11px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Meals per day
              </label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setMealsPerDay(1)}
                  className={cn(
                    'p-3 rounded-xl sm:rounded-2xl border-2 text-left transition-all tap-active flex items-center justify-between',
                    mealsPerDay === 1
                      ? 'border-ink bg-paper ring-1 ring-ink/15'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  <div>
                    <span className="font-heading font-bold text-xs sm:text-sm text-gray-900 block">
                      1 Meal / Day
                    </span>
                    <span className="text-[10px] text-gray-500">Morning or Dinner</span>
                  </div>
                  <div
                    className={cn(
                      'w-4 h-4 rounded-full border flex items-center justify-center',
                      mealsPerDay === 1 ? 'border-ink bg-ink text-white' : 'border-gray-300'
                    )}
                  >
                    {mealsPerDay === 1 && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMealsPerDay(2)}
                  className={cn(
                    'p-3 rounded-xl sm:rounded-2xl border-2 text-left transition-all tap-active flex items-center justify-between',
                    mealsPerDay === 2
                      ? 'border-ink bg-paper ring-1 ring-ink/15'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-heading font-bold text-xs sm:text-sm text-gray-900 block">
                        2 Meals / Day
                      </span>
                      <span className="text-[9px] font-black uppercase text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                        -₹10
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500">Morning + Dinner</span>
                  </div>
                  <div
                    className={cn(
                      'w-4 h-4 rounded-full border flex items-center justify-center',
                      mealsPerDay === 2 ? 'border-ink bg-ink text-white' : 'border-gray-300'
                    )}
                  >
                    {mealsPerDay === 2 && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: 6-DAY KITCHEN PREVIEW ================= */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="font-heading font-black text-xl sm:text-3xl text-ink">
                Preview your week's boxes
              </h2>
              <p className="text-[11px] sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                Tap each day to inspect what our central kitchen will prepare for you.
              </p>
            </div>

            {/* Horizontal Day Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {weeklyMenus.map((day, idx) => (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => setInspectedDayIndex(idx)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all tap-active flex items-center gap-1',
                    inspectedDayIndex === idx
                      ? 'bg-ink text-white shadow-xs'
                      : day.isSkipped
                      ? 'bg-gray-100 text-gray-400 line-through'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                  )}
                >
                  <span>{day.dayOfWeek}</span>
                  {day.isSkipped && <span className="text-[9px] font-mono">(Skip)</span>}
                </button>
              ))}
            </div>

            {/* Inspected Day Card */}
            {(() => {
              const currentDay = weeklyMenus[inspectedDayIndex] || weeklyMenus[0];
              const menuSlot = currentDay.menu.lunch;
              const isSkipped = currentDay.isSkipped;

              return (
                <div className="space-y-3.5">
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-paper border border-ink/15 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-black text-sm sm:text-base text-ink">
                          {currentDay.dayName} Box
                        </span>
                        <span className="text-[10px] font-bold text-gray-500">
                          {currentDay.formatted}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-gray-800 mt-0.5">
                        {menuSlot.items.main.name}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-gray-500 block">Macros</span>
                      <span className="font-heading font-black text-xs sm:text-sm text-emerald-800">
                        {menuSlot.totals.protein}g P • {menuSlot.totals.calories} kcal
                      </span>
                    </div>
                  </div>

                  {isSkipped ? (
                    <div className="p-8 rounded-2xl border-2 border-dashed border-gray-200 text-center bg-gray-50/50">
                      <Ban className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <h4 className="font-heading font-bold text-sm text-gray-700">
                        {currentDay.dayName} is currently skipped
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        You won't be charged for this day. You can include it anytime from Step 2.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">
                        5 Measured Compartments
                      </label>
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        {[
                          { label: 'Main Protein', item: menuSlot.items.main, num: '1' },
                          { label: 'Protein Side', item: menuSlot.items.proteinSide, num: '2' },
                          { label: 'High-Fiber Legume', item: menuSlot.items.legume, num: '3' },
                          { label: 'Fresh Salad', item: menuSlot.items.salad, num: '4' },
                          { label: 'Complex Carb', item: menuSlot.items.carb, num: '5' },
                        ].map((c) => (
                          <div
                            key={c.num}
                            className="p-2.5 rounded-xl bg-white border border-gray-100 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-accent/15 text-ink font-bold text-[10px] flex items-center justify-center">
                                {c.num}
                              </span>
                              <div>
                                <strong className="text-gray-900 block leading-tight">{c.item.name}</strong>
                                <span className="text-[10px] text-gray-500">{c.label}</span>
                              </div>
                            </div>
                            <span className="text-[11px] font-mono text-gray-500">
                              {c.item.grams}g scaled
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ================= STEP 4: DELIVERY ADDRESS ================= */}
        {step === 4 && (
          <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="font-heading font-black text-xl sm:text-3xl text-ink">
                Where should we deliver?
              </h2>
              <p className="text-[11px] sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                Delivered daily in food-grade thermal insulated totes across Coimbatore.
              </p>
            </div>

            {/* Saved Addresses (if any) */}
            {addresses.length > 0 && !isEnteringNewAddress && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider block">
                    Saved Delivery Address
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseNewAddress(true)}
                    className="text-xs font-bold text-accent hover:text-ink flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {addresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={cn(
                          'p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all flex items-start justify-between tap-active',
                          isSelected
                            ? 'border-ink bg-paper ring-2 ring-ink/15'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-heading font-bold text-xs sm:text-sm text-gray-900">
                              {addr.tag || 'Home'}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {addr.flatNumber}, {addr.street}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {addr.area}, Coimbatore - {addr.pincode}
                          </p>
                        </div>

                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5',
                            isSelected ? 'border-ink bg-ink text-white' : 'border-gray-300'
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* New Address Form */}
            {isEnteringNewAddress && (
              <div className="space-y-3 pt-1">
                {addresses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setUseNewAddress(false)}
                    className="text-xs font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1 mb-2"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Use existing saved address</span>
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 uppercase block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Receiver name"
                      className="w-full text-xs font-medium bg-paper border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-ink"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 uppercase block mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile"
                      className="w-full text-xs font-medium bg-paper border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-ink"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-600 uppercase block mb-1">
                    Flat / House / Building *
                  </label>
                  <input
                    type="text"
                    value={flatNumber}
                    onChange={(e) => setFlatNumber(e.target.value)}
                    placeholder="e.g. 4B, Green Acres Apartment"
                    className="w-full text-xs font-medium bg-paper border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 uppercase block mb-1">
                      Street / Road *
                    </label>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="e.g. Sambandam Road"
                      className="w-full text-xs font-medium bg-paper border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-ink"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 uppercase block mb-1">
                      Area / Locality *
                    </label>
                    <input
                      type="text"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. RS Puram / Saibaba Colony"
                      className="w-full text-xs font-medium bg-paper border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-ink"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-600 uppercase block mb-1">
                    Coimbatore Pincode *
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    placeholder="641002"
                    className="w-full text-xs font-mono font-bold bg-paper border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                    {detectedZone ? (
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-700 font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Delivery Available: {detectedZone.area} (Coimbatore)</span>
                      </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-amber-600 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Enter valid 6-digit Coimbatore pincode (641xxx)</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 5: PREPAY & CONFIRMATION ================= */}
        {step === 5 && (
          <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="font-heading font-black text-xl sm:text-3xl text-ink">
                Confirm & start routine
              </h2>
              <p className="text-[11px] sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                Your meals will be freshly cooked each morning and delivered to your doorstep.
              </p>
            </div>

            {/* Plan Breakdown Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-paper border border-ink/15 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200/80">
                <div>
                  <span className="font-heading font-black text-sm sm:text-base text-ink block">
                    6-Day Weekly Routine
                  </span>
                  <span className="text-xs text-gray-500">
                    {dietVariation === 'non-veg'
                      ? 'High-Protein Non-Veg'
                      : dietVariation === 'veg'
                      ? 'Pure Vegetarian'
                      : 'Balanced Mixed (4 NV + 2 Veg)'}
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {pricingCalculations.activeCount} Days Active
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Weekly Meals ({pricingCalculations.activeCount} days × {mealsPerDay} meal)</span>
                  <span className="font-bold text-gray-900">{formatCurrency(pricingCalculations.total)}</span>
                </div>
                {pricingCalculations.savings > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Weekly Routine Bulk Discount</span>
                    <span>-₹{pricingCalculations.savings}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Thermal Insulation & Coimbatore Delivery</span>
                  <span className="font-bold text-emerald-700">FREE</span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">Total Payable</span>
                  <span className="font-heading font-black text-xl sm:text-2xl text-ink">
                    {formatCurrency(pricingCalculations.total)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 block">Delivery To</span>
                  <span className="text-xs font-bold text-gray-800 truncate max-w-[140px] block">
                    {activeAddress?.area || area || 'Coimbatore'}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="p-3 rounded-xl border border-ink/15 bg-paper text-[11px] sm:text-xs text-gray-700 flex items-start gap-2">
              <QrCode className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>Next you&apos;ll see our UPI ID and QR code. Pay from any UPI app and enter the reference number. We confirm and schedule your week.</span>
            </div>
          </div>
        )}
      </div>

      {payError && (
        <p role="alert" className="mx-3 sm:mx-6 mt-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
          {payError}
        </p>
      )}

      {step === 5 && <OrderTerms className="mx-3 sm:mx-6 mt-2 text-center" />}

      {/* Bottom Sticky Action Controls */}
      <div className="bg-paper border-t border-ink/10 p-3 sm:p-6 flex items-center justify-between gap-2 sm:gap-3">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => (s - 1) as any)}
            className="flex items-center gap-1 px-3.5 sm:px-6 py-3 rounded-xl sm:rounded-2xl text-xs font-bold text-gray-700 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-100 transition-all tap-active active:scale-[0.98]"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        ) : (
          <div />
        )}

        {step < 5 ? (
          <button
            type="button"
            disabled={
              (step === 1 && !canGoNextFromStep1) ||
              (step === 2 && !canGoNextFromStep2) ||
              (step === 4 && !canGoNextFromStep4)
            }
            onClick={() => setStep((s) => (s + 1) as any)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-5 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-heading font-black bg-ink text-white hover:bg-ink-soft disabled:opacity-50 disabled:pointer-events-none transition-all tap-active active:scale-[0.98] shadow-md sm:shadow-lg shadow-ink/15"
          >
            <span>
              {step === 1 && 'Next: Choose Days & Meals'}
              {step === 2 && 'Next: Preview Weekly Menu'}
              {step === 3 && 'Confirm Menu & Add Address'}
              {step === 4 && 'Proceed to Prepay'}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={isProcessing}
            onClick={handlePay}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-heading font-black bg-ink text-white hover:bg-ink-soft disabled:opacity-60 transition-all tap-active active:scale-[0.98] shadow-lg sm:shadow-xl shadow-ink/20"
          >
            {isProcessing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Placing your order…</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-accent" />
                <span>Place order · {formatCurrency(pricingCalculations.total)}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
