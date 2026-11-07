'use client';

import { useMenuVersion } from '@/components/providers/CatalogProvider';
import { usePricing, useRegularTrialPrice } from '@/components/providers/CatalogProvider';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Lock,
  Plus,
  QrCode,
  Ban,
  Sun,
  Moon,
  X,
} from 'lucide-react';
import {
  getNextWeekOperatingDays,
  getMenuForDate,
  DietType,
  DailyMenuResult,
} from '@/lib/menu-engine';
import { useAppStore } from '@/store/useAppStore';
import { SIGN_IN_PENDING, submitOrder, toDbDiet } from '@/lib/checkout/submit';
import { clearDraft, loadDraft, saveDraft } from '@/lib/checkout/draft';
import { cn, formatCurrency } from '@/lib/utils';
import { planTotal, savingsVsTrial } from '@/lib/pricing';
import { useDeliveryZones, useSavedLocation } from '@/lib/location';
import { PincodeStatus } from '@/components/delivery/PincodeStatus';
import { OrderTerms } from '@/components/legal/OrderTerms';
import { DietMascot } from '@/components/trial/DietMascot';
import { DietMark } from '@/components/trial/DietMark';
import { SLOT_TIME, g1 } from '@/lib/meal-display';

export function WeeklyPlanStepModal() {
  const menuVersion = useMenuVersion();
  const PRICING = usePricing();
  const TRIAL_REGULAR = useRegularTrialPrice();
  // The "mixed" week is 4 non-veg + 2 veg days: show its real daily average.
  const mixedAvgPerDay = Math.round((4 * PRICING.weekly['non-veg'] + 2 * PRICING.weekly.veg) / 6);
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
  // Delivery slot when 1 meal/day; with 2 meals both runs are delivered.
  const [slot, setSlot] = useState<'lunch' | 'dinner'>('lunch');

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
  const [inspectedSlot, setInspectedSlot] = useState<'lunch' | 'dinner'>('lunch');

  // Active Days and Pricing Calculations
  const activeDays = useMemo(() => weeklyMenus.filter((d) => !d.isSkipped), [weeklyMenus]);

  const pricingCalculations = useMemo(() => {
    const total = planTotal(PRICING, 'weekly', activeDays, mealsPerDay);
    const skippedDaysList = weeklyMenus.filter((d) => d.isSkipped);
    return {
      total,
      savings: savingsVsTrial(PRICING, TRIAL_REGULAR, 'weekly', activeDays, mealsPerDay),
      // What the skipped days would have cost: the bill drops by exactly this.
      skippedValue: planTotal(PRICING, 'weekly', skippedDaysList, mealsPerDay),
      activeCount: activeDays.length,
      skippedCount: skippedDays.length,
    };
  }, [activeDays, weeklyMenus, mealsPerDay, skippedDays, PRICING, TRIAL_REGULAR]);

  // Step 4: Address
  const activeAddress = useMemo(() => {
    return addresses.find((a) => a.id === selectedAddressId) || addresses[0];
  }, [addresses, selectedAddressId]);

  const [useNewAddress, setUseNewAddress] = useState(addresses.length === 0);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState((user?.phone || '').replace(/^\+91/, ''));
  const [flatNumber, setFlatNumber] = useState('');
  const [street, setStreet] = useState('');
  const saved = useSavedLocation();
  const [area, setArea] = useState(saved.area);
  const [pincode, setPincode] = useState(saved.pincode);
  const [isProcessing, setIsProcessing] = useState(false);
  const [payError, setPayError] = useState('');

  // Order draft: survives the Google sign-in redirect and page refreshes.
  // Saving waits until the restored values have rendered, so defaults never overwrite a draft.
  const [draftReady, setDraftReady] = useState(false);
  useEffect(() => {
    const d = loadDraft<{
      step: 1 | 2 | 3 | 4 | 5; dietVariation: 'non-veg' | 'veg' | 'mixed'; skippedDays: string[]; mealsPerDay: 1 | 2;
      slot?: 'lunch' | 'dinner'; useNewAddress: boolean;
      fullName: string; phone: string; flatNumber: string; street: string; area: string; pincode: string;
    }>('weekly');
    if (d) {
      setDietVariation(d.dietVariation);
      setSkippedDays(d.skippedDays.filter((x) => nextWeekDays.some((w) => w.dateStr === x)));
      setMealsPerDay(d.mealsPerDay);
      setSlot(d.slot === 'dinner' ? 'dinner' : 'lunch');
      setUseNewAddress(d.useNewAddress);
      if (d.fullName) setFullName(d.fullName);
      if (d.phone) setPhone(d.phone);
      setFlatNumber(d.flatNumber);
      setStreet(d.street);
      setArea(d.area || saved.area);
      setPincode(d.pincode || saved.pincode);
      setStep(d.step);
    }
    setDraftReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!draftReady) return;
    saveDraft('weekly', { step, dietVariation, skippedDays, mealsPerDay, slot, useNewAddress, fullName, phone, flatNumber, street, area, pincode });
  }, [draftReady, step, dietVariation, skippedDays, mealsPerDay, slot, useNewAddress, fullName, phone, flatNumber, street, area, pincode]);

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
        slot: mealsPerDay === 2 ? 'lunch' : slot,
        days: activeDays.map((d) => ({ date: d.dateStr, diet: toDbDiet(d.diet) })),
        addonIds: [],
        preferences: { isEggFree: false, skipLegume: false, dietVariation },
        addressId: isEnteringNewAddress ? undefined : activeAddress?.id,
      },
      {
        newAddress: isEnteringNewAddress
          ? { recipientName: fullName, phone, flat: flatNumber, street, area, pincode }
          : undefined,
        navigate: (href) => { clearDraft('weekly'); router.push(href); },
        onSignedIn: () => { handlePay(); },
      }
    );
    if (error) {
      setPayError(error === SIGN_IN_PENDING ? '' : error);
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
        className={cn(
          'p-3.5 sm:p-8 flex-1 overflow-y-auto sm:max-h-[calc(85vh-160px)] transition-all',
          step === 1 ? 'min-h-0' : 'min-h-[420px] sm:min-h-[460px]'
        )}
      >
        {/* ================= STEP 1: DIET ================= */}
        {step === 1 && (
          <div className="space-y-3.5 sm:space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="font-heading font-black text-xl sm:text-3xl text-ink">
                Choose your week
              </h2>
              <p className="text-[11px] sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                6 days, a different box every day.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4 pt-2">
              {([
                { key: 'veg', label: 'Veg', price: PRICING.weekly.veg, sel: 'border-emerald-600 bg-emerald-50 ring-emerald-600/15', tick: 'border-emerald-600 bg-emerald-600', text: 'text-emerald-700' },
                { key: 'mixed', label: 'Mix', price: mixedAvgPerDay, sel: 'border-accent bg-accent/5 ring-accent/20', tick: 'border-accent bg-accent', text: 'text-accent' },
                { key: 'non-veg', label: 'Non-Veg', price: PRICING.weekly['non-veg'], sel: 'border-red-600 bg-red-50 ring-red-600/15', tick: 'border-red-600 bg-red-600', text: 'text-red-700' },
              ] as const).map((opt) => {
                const selected = dietVariation === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setDietVariation(opt.key)}
                    aria-pressed={selected}
                    className={cn(
                      'relative rounded-2xl sm:rounded-3xl border-2 transition-all tap-active flex items-center text-center active:scale-[0.99] sm:flex-col sm:p-5 sm:pt-10',
                      opt.key === 'mixed'
                        ? 'col-span-2 order-last sm:col-span-1 sm:order-none flex-row justify-center gap-4 px-4 pt-7 pb-3'
                        : 'flex-col px-2 pt-8 pb-3',
                      selected ? `${opt.sel} ring-2 sm:ring-4 shadow-md` : 'border-gray-200 hover:border-gray-300 bg-white'
                    )}
                  >
                    <span className="absolute top-2 left-2 sm:top-3 sm:left-3 flex gap-0.5">
                      {opt.key !== 'non-veg' && <DietMark kind="veg" />}
                      {opt.key !== 'veg' && <DietMark kind="non-veg" />}
                    </span>
                    <span
                      className={cn(
                        'absolute top-2 right-2 sm:top-3 sm:right-3 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-colors',
                        selected ? `${opt.tick} text-white` : 'border-gray-300'
                      )}
                    >
                      {selected && <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" />}
                    </span>
                    {opt.key === 'mixed' && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-white bg-accent px-2 py-0.5 rounded-full whitespace-nowrap">
                        Popular
                      </span>
                    )}

                    <div className="h-[76px] sm:h-[96px] flex items-end justify-center shrink-0">
                      {opt.key === 'mixed' ? (
                        <div className="flex items-end -space-x-3">
                          <DietMascot kind="veg" active={selected} size="sm" />
                          <DietMascot kind="non-veg" active={selected} size="sm" />
                        </div>
                      ) : (
                        <DietMascot kind={opt.key} active={selected} />
                      )}
                    </div>

                    <div className="flex flex-col items-center">
                    <h3 className={cn('font-heading font-black text-base sm:text-2xl mt-2', selected ? opt.text : 'text-gray-900')}>
                      {opt.label}
                    </h3>

                    {/* Which days are veg / non-veg */}
                    <div className="flex gap-0.5 sm:gap-1 mt-1.5" aria-hidden="true">
                      {['M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => {
                        const veg = opt.key === 'veg' || (opt.key === 'mixed' && (i === 2 || i === 4));
                        return (
                          <span
                            key={i}
                            className={cn(
                              'w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full text-[7px] sm:text-[9px] font-black text-white flex items-center justify-center',
                              veg ? 'bg-emerald-600' : 'bg-red-600'
                            )}
                          >
                            {d}
                          </span>
                        );
                      })}
                    </div>

                    <span className="font-heading font-black text-xs sm:text-base text-ink mt-1.5">
                      ₹{opt.price}
                      <span className="text-[10px] sm:text-xs font-bold text-gray-500">/day</span>
                    </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= STEP 2: DAYS & MEALS ================= */}
        {step === 2 && (
          <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="font-heading font-black text-xl sm:text-3xl text-ink">
                Your week
              </h2>
              <p className="text-[11px] sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                Tap a day to skip it. You only pay for the days you keep.
              </p>
            </div>

            {/* Mon–Sat */}
            <div className="space-y-2">
              <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                {weeklyMenus.map((day) => {
                  const isSkipped = day.isSkipped;
                  return (
                    <button
                      key={day.dateStr}
                      type="button"
                      onClick={() => toggleSkipDay(day.dateStr)}
                      aria-pressed={!isSkipped}
                      aria-label={`${day.dayName} ${day.formatted}: ${isSkipped ? 'skipped' : 'included'}`}
                      className={cn(
                        'py-2 sm:py-3 rounded-xl sm:rounded-2xl border-2 text-center transition-all tap-active flex flex-col items-center gap-1 active:scale-[0.97]',
                        isSkipped
                          ? 'border-dashed border-gray-300 bg-gray-50 text-gray-400'
                          : day.diet === 'veg'
                          ? 'border-emerald-600 bg-emerald-50 text-gray-900'
                          : 'border-red-600 bg-red-50 text-gray-900'
                      )}
                    >
                      <span className="font-heading font-black text-xs sm:text-base leading-none">{day.dayOfWeek}</span>
                      <span className="text-[9px] sm:text-[10px] font-semibold text-gray-500 leading-none">
                        {day.formatted.split(' ')[0]}
                      </span>
                      {isSkipped ? (
                        <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gray-300 text-white flex items-center justify-center">
                          <X className="w-3 h-3 stroke-[3]" />
                        </span>
                      ) : (
                        <DietMark kind={day.diet} />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="p-2.5 sm:p-3 rounded-xl bg-sand border border-ink/10 flex items-center justify-between text-xs text-ink">
                <span className="font-semibold">
                  {pricingCalculations.activeCount} of 6 days
                  {pricingCalculations.skippedCount > 0 && (
                    <span className="text-emerald-700"> · saves {formatCurrency(pricingCalculations.skippedValue)}</span>
                  )}
                </span>
                <span className="font-heading font-black text-sm">
                  {formatCurrency(pricingCalculations.total)}
                </span>
              </div>
            </div>

            {/* Meals per day */}
            <div className="space-y-1.5 sm:space-y-2 pt-2 border-t border-gray-100">
              <label className="text-[11px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Meals a day
              </label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {([1, 2] as const).map((n) => {
                  const selected = mealsPerDay === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMealsPerDay(n)}
                      aria-pressed={selected}
                      className={cn(
                        'relative p-3 rounded-xl sm:rounded-2xl border-2 transition-all tap-active flex flex-col items-center gap-1.5',
                        selected ? 'border-ink bg-paper ring-2 ring-ink/10' : 'border-gray-200 bg-white hover:border-gray-300'
                      )}
                    >
                      {n === 2 && (
                        <span className="absolute top-1.5 right-1.5 text-[9px] font-black uppercase text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                          -₹{PRICING.secondMealDiscount}
                        </span>
                      )}
                      <span className="flex gap-1" aria-hidden="true">
                        {Array.from({ length: n }).map((_, i) => (
                          <span key={i} className="w-7 h-5 sm:w-8 sm:h-6 rounded-md border-2 border-ink bg-accent/20 grid grid-cols-3 gap-px p-px">
                            <span className="col-span-2 bg-accent/60 rounded-sm" />
                            <span className="bg-emerald-500/60 rounded-sm" />
                          </span>
                        ))}
                      </span>
                      <span className="font-heading font-black text-xs sm:text-sm text-gray-900">
                        {n} Meal{n === 2 ? 's' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Delivery time */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[11px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider block">
                {mealsPerDay === 2 ? 'Delivered at' : 'Delivery time'}
              </label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {(['lunch', 'dinner'] as const).map((s) => {
                  const selected = mealsPerDay === 2 || slot === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={mealsPerDay === 2}
                      onClick={() => setSlot(s)}
                      aria-pressed={selected}
                      className={cn(
                        'p-3 rounded-xl sm:rounded-2xl border-2 transition-all tap-active flex items-center gap-2.5 text-left disabled:cursor-default',
                        selected ? 'border-ink bg-paper ring-2 ring-ink/10' : 'border-gray-200 bg-white hover:border-gray-300'
                      )}
                    >
                      <span
                        className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                          s === 'lunch' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'
                        )}
                      >
                        {s === 'lunch' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                      </span>
                      <span className="min-w-0">
                        <span className="font-heading font-black text-xs sm:text-sm text-gray-900 block">
                          {s === 'lunch' ? 'Lunch' : 'Dinner'}
                        </span>
                        <span className="text-[10px] sm:text-xs text-gray-500 block">{SLOT_TIME[s]}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: WEEK PREVIEW ================= */}
        {step === 3 && (() => {
          const currentDay = weeklyMenus[inspectedDayIndex] || weeklyMenus[0];
          const viewSlot = mealsPerDay === 2 ? inspectedSlot : slot;
          const box = viewSlot === 'dinner' ? currentDay.menu.dinner : currentDay.menu.lunch;
          return (
            <div className="space-y-3.5 sm:space-y-4 animate-in fade-in duration-200">
              <div>
                <h2 className="font-heading font-black text-xl sm:text-3xl text-ink">
                  Your week&apos;s boxes
                </h2>
                <p className="text-[11px] sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                  Tap a day to see its box.
                </p>
              </div>

              {/* Day tabs */}
              <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                {weeklyMenus.map((day, idx) => {
                  const active = inspectedDayIndex === idx;
                  return (
                    <button
                      key={day.dateStr}
                      type="button"
                      onClick={() => setInspectedDayIndex(idx)}
                      aria-pressed={active}
                      className={cn(
                        'py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all tap-active flex flex-col items-center gap-1',
                        active ? 'bg-ink text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-200',
                        day.isSkipped && !active && 'opacity-50 line-through'
                      )}
                    >
                      <span>{day.dayOfWeek}</span>
                      {day.isSkipped ? (
                        <X className="w-3.5 h-3.5" />
                      ) : (
                        <DietMark kind={day.diet} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      )}
                    </button>
                  );
                })}
              </div>

              {mealsPerDay === 2 && (
                <div className="grid grid-cols-2 gap-1.5 bg-paper border border-ink/15 p-1 rounded-xl sm:rounded-2xl">
                  {(['lunch', 'dinner'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setInspectedSlot(s)}
                      className={cn(
                        'py-2 rounded-lg sm:rounded-xl text-xs font-heading font-bold transition-all tap-active flex items-center justify-center gap-1.5',
                        inspectedSlot === s ? 'bg-ink text-white shadow-sm' : 'text-gray-600'
                      )}
                    >
                      {s === 'lunch' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                      {s === 'lunch' ? 'Lunch' : 'Dinner'}
                    </button>
                  ))}
                </div>
              )}

              {currentDay.isSkipped ? (
                <div className="p-8 rounded-2xl border-2 border-dashed border-gray-200 text-center bg-gray-50/50">
                  <Ban className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <h4 className="font-heading font-bold text-sm text-gray-700">
                    {currentDay.dayName} skipped
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">Not charged. Add it back in step 2.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <DietMascot kind={currentDay.diet} active size="sm" />
                    <div className="min-w-0">
                      <span className="text-[10px] sm:text-[11px] uppercase font-extrabold text-accent">
                        {currentDay.dayName} · {viewSlot === 'lunch' ? 'Lunch' : 'Dinner'}
                      </span>
                      <h3 className="font-heading font-black text-base sm:text-xl text-gray-900 leading-tight truncate">
                        {box.items.main.name}
                      </h3>
                    </div>
                  </div>

                  {/* Macros */}
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center">
                    {[
                      { label: 'Protein', value: `${g1(box.totals.protein)}g`, cls: 'bg-emerald-50 text-emerald-800' },
                      { label: 'Calories', value: `${Math.round(box.totals.calories)}`, cls: 'bg-gray-50 text-gray-900' },
                      { label: 'Carbs', value: `${g1(box.totals.carbs)}g`, cls: 'bg-amber-50 text-amber-800' },
                      { label: 'Fat', value: `${g1(box.totals.fat)}g`, cls: 'bg-purple-50 text-purple-800' },
                    ].map((m) => (
                      <div key={m.label} className={cn('rounded-xl py-2', m.cls)}>
                        <span className="font-heading font-black text-sm sm:text-base block leading-tight">{m.value}</span>
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase opacity-70">{m.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* 5 compartments */}
                  <div className="grid grid-cols-1 gap-1.5 sm:gap-2">
                    {[
                      { label: 'Protein', item: box.items.main, icon: currentDay.diet === 'veg' ? '🧀' : '🍗' },
                      { label: 'Side', item: box.items.proteinSide, icon: currentDay.diet === 'veg' ? '🥛' : '🥚' },
                      { label: 'Legume', item: box.items.legume, icon: '🫘' },
                      { label: 'Salad', item: box.items.salad, icon: '🥗' },
                      { label: 'Carb', item: box.items.carb, icon: '🍚' },
                    ].map((c) => (
                      <div
                        key={c.label}
                        className="p-2.5 rounded-xl bg-gray-50/80 border border-gray-100 flex items-center gap-2.5 text-xs"
                      >
                        <span className="text-base shrink-0" aria-hidden="true">{c.icon}</span>
                        <span className="font-bold text-gray-900 truncate flex-1">{c.item.name}</span>
                        <span className="text-[11px] font-mono font-bold text-gray-500 shrink-0">{g1(c.item.grams)}g</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })()}

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
                    <PincodeStatus pincode={pincode} />
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
                Cooked fresh every day and delivered to your door.
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
                    {' · '}
                    {mealsPerDay === 2
                      ? 'Lunch & Dinner'
                      : slot === 'lunch'
                      ? `Lunch (${SLOT_TIME.lunch})`
                      : `Dinner (${SLOT_TIME.dinner})`}
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
