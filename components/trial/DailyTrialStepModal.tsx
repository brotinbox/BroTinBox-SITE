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
} from 'lucide-react';
import {
  getMenuForDate,
  getNextBookableDays,
  DietType,
  DailyMenuResult,
} from '@/lib/menu-engine';
import { useAppStore } from '@/store/useAppStore';
import { MealSlot } from '@/types';
import { submitOrder, toDbDiet } from '@/lib/checkout/submit';
import { cn, formatCurrency } from '@/lib/utils';
import { useDeliveryZones } from '@/lib/location';
import { OrderTerms } from '@/components/legal/OrderTerms';

export function DailyTrialStepModal() {
  const menuVersion = useMenuVersion();
  const PRICING = usePricing();
  const router = useRouter();
  const {
    addresses,
    selectedAddressId,
    setSelectedAddressId,
    user,
  } = useAppStore();

  // Wizard Step: 1 = Diet, 2 = Date & Slot, 3 = Menu Review, 4 = Address, 5 = Review & Pay
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // When step changes, smoothly follow the dialog and keep the top in view
  useEffect(() => {
    // 1. Reset internal scroll container
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }

    // 2. Scroll window to follow the top of the dialog (accounting for navbar clearance)
    if (modalRef.current) {
      const navOffset = 70; // Clearance for mobile top bar
      const currentScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
      const elementTop = modalRef.current.getBoundingClientRect().top + currentScroll;
      const targetScroll = Math.max(0, elementTop - navOffset);

      window.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });
    }
  }, [step]);

  // Step 1: Diet
  const [diet, setDiet] = useState<DietType>('non-veg');

  // Step 2: Date & Time Slot
  const bookableDays = useMemo(() => getNextBookableDays(3), []);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    bookableDays[0]?.dateStr || ''
  );
  const [mealSlot, setMealSlot] = useState<MealSlot>('lunch');
  const [mealsPerDay, setMealsPerDay] = useState<1 | 2>(1);
  const [inspectedSlot, setInspectedSlot] = useState<'lunch' | 'dinner'>('lunch');

  // Step 3: Kitchen Menu
  const menu: DailyMenuResult = useMemo(() => {
    return getMenuForDate(selectedDateStr || bookableDays[0]?.dateStr, diet);
  }, [selectedDateStr, diet, bookableDays, menuVersion]);

  // Selected Day Information
  const selectedDayInfo = useMemo(() => {
    return (
      bookableDays.find((d) => d.dateStr === selectedDateStr) || bookableDays[0]
    );
  }, [bookableDays, selectedDateStr]);

  const { getZoneByPincode } = useDeliveryZones();

  // Step 4: Address
  const activeAddress = useMemo(() => {
    return addresses.find((a) => a.id === selectedAddressId) || addresses[0];
  }, [addresses, selectedAddressId]);

  const [useNewAddress, setUseNewAddress] = useState(false);
  const [fullName, setFullName] = useState(user.fullName || '');
  const [phone, setPhone] = useState((user.phone || '').replace(/^\+91/, ''));
  const [flatNumber, setFlatNumber] = useState(activeAddress?.flatNumber || '');
  const [street, setStreet] = useState(activeAddress?.street || '');
  const [area, setArea] = useState(activeAddress?.area || '');
  const [pincode, setPincode] = useState(activeAddress?.pincode || '');
  const [payError, setPayError] = useState('');

  // Step 5: Payment method & loading state
  const [isProcessing, setIsProcessing] = useState(false);

  // Price calculations
  const basePrice = PRICING.trial[diet];
  const portionMultiplier = mealsPerDay;
  const mealTotal = basePrice * portionMultiplier - (mealsPerDay === 2 ? 10 : 0);
  const zoneInfo = getZoneByPincode(pincode);
  const deliveryFee = zoneInfo?.tier === 'phase2' ? zoneInfo.deliveryFee : 0;
  const finalTotal = mealTotal + deliveryFee;

  // Step validation
  const canGoNextFromStep1 = !!diet;
  const canGoNextFromStep2 = !!selectedDateStr && !!mealSlot;
  const canGoNextFromStep4 = useNewAddress
    ? flatNumber.trim().length > 0 &&
      street.trim().length > 0 &&
      area.trim().length > 0 &&
      phone.trim().length >= 10
    : !!activeAddress;

  // Place a real order: the server prices it and we go to the UPI payment page.
  const handlePay = async () => {
    setPayError('');
    setIsProcessing(true);
    const error = await submitOrder(
      {
        type: 'trial',
        mealsPerDay,
        slot: mealSlot,
        days: [{ date: selectedDateStr, diet: toDbDiet(diet) }],
        addonIds: [],
        preferences: { isEggFree: false, skipLegume: false },
        addressId: useNewAddress ? undefined : activeAddress?.id,
      },
      {
        newAddress: useNewAddress || !activeAddress
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
              Single Day Trial
            </span>
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider bg-accent/20 text-ink px-2 py-0.5 rounded-full shrink-0">
              Step {step}/5
            </span>
          </div>

          <span className="text-[11px] sm:text-xs font-bold text-gray-500 shrink-0 text-right">
            {step === 1 && 'Select Diet'}
            {step === 2 && 'Date & Time'}
            {step === 3 && 'Kitchen Box'}
            {step === 4 && 'Address'}
            {step === 5 && 'Prepay'}
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
        {/* ================= STEP 1: DIET PREFERENCE ================= */}
        {step === 1 && (
          <div className="space-y-3.5 sm:space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="font-heading font-black text-xl sm:text-3xl text-ink">
                Choose your diet
              </h2>
              <p className="text-[11px] sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                Every box is weighed to the gram on digital kitchen scales with certified macros.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1 sm:pt-2">
              {/* Non-Veg Option */}
              <button
                type="button"
                onClick={() => setDiet('non-veg')}
                className={cn(
                  'relative text-left p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 transition-all tap-active flex flex-col justify-between active:scale-[0.99]',
                  diet === 'non-veg'
                    ? 'border-ink bg-paper ring-2 sm:ring-4 ring-ink/10 shadow-md sm:shadow-lg'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                      <Drumstick className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div
                      className={cn(
                        'w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-colors',
                        diet === 'non-veg'
                          ? 'border-ink bg-ink text-white'
                          : 'border-gray-300'
                      )}
                    >
                      {diet === 'non-veg' && <Check className="w-3 sm:w-3.5 h-3 sm:h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  <h3 className="font-heading font-black text-base sm:text-xl text-gray-900">
                    Non-Veg Protein
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    Kongu pepper chicken breast, herb grilled cuts & boiled whole egg whites.
                  </p>
                </div>

                <div className="mt-3.5 sm:mt-5 pt-2.5 sm:pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
                    ~80g+ Clean Protein
                  </span>
                  <span className="font-heading font-black text-sm sm:text-base text-ink">
                    ₹{PRICING.trial['non-veg']}
                  </span>
                </div>
              </button>

              {/* Vegetarian Option */}
              <button
                type="button"
                onClick={() => setDiet('veg')}
                className={cn(
                  'relative text-left p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 transition-all tap-active flex flex-col justify-between active:scale-[0.99]',
                  diet === 'veg'
                    ? 'border-ink bg-paper ring-2 sm:ring-4 ring-ink/10 shadow-md sm:shadow-lg'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold">
                      <Leaf className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div
                      className={cn(
                        'w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-colors',
                        diet === 'veg'
                          ? 'border-ink bg-ink text-white'
                          : 'border-gray-300'
                      )}
                    >
                      {diet === 'veg' && <Check className="w-3 sm:w-3.5 h-3 sm:h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  <h3 className="font-heading font-black text-base sm:text-xl text-gray-900">
                    Vegetarian Protein
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    Malai paneer cubes, roasted soya chunks & mint protein curd.
                  </p>
                </div>

                <div className="mt-3.5 sm:mt-5 pt-2.5 sm:pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
                    ~45g+ Clean Protein
                  </span>
                  <span className="font-heading font-black text-sm sm:text-base text-ink">
                    ₹{PRICING.trial.veg}
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: DATE & TIME SLOT ================= */}
        {step === 2 && (
          <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="font-heading font-black text-xl sm:text-3xl text-ink">
                When should we deliver?
              </h2>
              <p className="text-[11px] sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                Select from the next 3 available kitchen booking days (Sundays closed for sanitation).
              </p>
            </div>

            {/* Exactly 3 Future Dates */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[11px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Choose Upcoming Date (3 Days Open)
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {bookableDays.map((d, index) => {
                  const isSelected = selectedDateStr === d.dateStr;
                  return (
                    <button
                      key={d.dateStr}
                      type="button"
                      onClick={() => setSelectedDateStr(d.dateStr)}
                      className={cn(
                        'p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 text-center transition-all tap-active flex flex-col justify-center items-center active:scale-[0.98]',
                        isSelected
                          ? 'border-ink bg-ink text-white shadow-md'
                          : 'border-gray-200 bg-white hover:border-gray-300 text-gray-800'
                      )}
                    >
                      <span
                        className={cn(
                          'text-[9px] sm:text-[10px] uppercase font-black block tracking-tight truncate max-w-full',
                          isSelected ? 'text-accent' : 'text-gray-400'
                        )}
                      >
                        {index === 0 ? 'Earliest' : 'Available'}
                      </span>
                      <span className="font-heading font-black text-sm sm:text-lg block leading-tight mt-0.5">
                        {d.dayOfWeek}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] sm:text-xs font-semibold block mt-0.5 whitespace-nowrap',
                          isSelected ? 'text-white/80' : 'text-gray-500'
                        )}
                      >
                        {d.formatted}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Delivery Time Window */}
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Delivery Time Window
                </label>
                {mealsPerDay === 2 && (
                  <span className="text-[9px] sm:text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 sm:px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Both Slots Selected
                  </span>
                )}
              </div>

              {mealsPerDay === 2 && (
                <div className="p-2.5 sm:p-3 bg-paper border border-ink/15 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs text-ink flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <span>
                    <strong>2 Meals Selected:</strong> Both fresh Morning and fresh Dinner deliveries are included to your doorstep!
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (mealsPerDay === 2) {
                      setMealsPerDay(1);
                      setMealSlot('lunch');
                    } else {
                      setMealSlot('lunch');
                    }
                  }}
                  className={cn(
                    'p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 text-left transition-all tap-active flex items-center justify-between active:scale-[0.99]',
                    mealsPerDay === 2 || mealSlot === 'lunch'
                      ? 'border-ink bg-paper ring-2 ring-ink/15'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  )}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-heading font-bold text-xs sm:text-sm text-gray-900 block">
                          Morning Delivery
                        </span>
                        {mealsPerDay === 2 && (
                          <span className="text-[8px] sm:text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                            Included
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] sm:text-xs text-gray-500">7:00 AM – 9:00 AM</span>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                      mealsPerDay === 2 || mealSlot === 'lunch'
                        ? 'border-ink bg-ink text-white'
                        : 'border-gray-300'
                    )}
                  >
                    {(mealsPerDay === 2 || mealSlot === 'lunch') && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (mealsPerDay === 2) {
                      setMealsPerDay(1);
                      setMealSlot('dinner');
                    } else {
                      setMealSlot('dinner');
                    }
                  }}
                  className={cn(
                    'p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 text-left transition-all tap-active flex items-center justify-between active:scale-[0.99]',
                    mealsPerDay === 2 || mealSlot === 'dinner'
                      ? 'border-ink bg-paper ring-2 ring-ink/15'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  )}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-heading font-bold text-xs sm:text-sm text-gray-900 block">
                          Dinner Delivery
                        </span>
                        {mealsPerDay === 2 && (
                          <span className="text-[8px] sm:text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                            Included
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] sm:text-xs text-gray-500">7:00 PM – 9:00 PM</span>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                      mealsPerDay === 2 || mealSlot === 'dinner'
                        ? 'border-ink bg-ink text-white'
                        : 'border-gray-300'
                    )}
                  >
                    {(mealsPerDay === 2 || mealSlot === 'dinner') && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              </div>
            </div>

            {/* Meal Portions */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[11px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Number of Portions
              </label>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setMealsPerDay(1)}
                  className={cn(
                    'p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 text-center transition-all tap-active active:scale-[0.99]',
                    mealsPerDay === 1
                      ? 'border-ink bg-paper font-bold text-ink ring-2 ring-ink/15'
                      : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
                  )}
                >
                  <span className="text-xs sm:text-sm font-heading font-black block">1 Meal</span>
                  <span className="text-[10px] sm:text-[11px] text-gray-500">Morning OR Dinner</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMealsPerDay(2)}
                  className={cn(
                    'p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 text-center transition-all tap-active active:scale-[0.99]',
                    mealsPerDay === 2
                      ? 'border-ink bg-paper font-bold text-ink ring-2 ring-ink/15'
                      : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
                  )}
                >
                  <span className="text-xs sm:text-sm font-heading font-black block">
                    2 Meals (-₹10 OFF)
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-emerald-700 font-bold">Both Morning & Dinner</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: MENU INSPECTION ================= */}
        {step === 3 && (() => {
          const currentBox =
            mealsPerDay === 2
              ? inspectedSlot === 'dinner'
                ? menu.dinner
                : menu.lunch
              : mealSlot === 'dinner'
              ? menu.dinner
              : menu.lunch;

          const activeSlotName =
            mealsPerDay === 2
              ? inspectedSlot === 'lunch'
                ? 'Morning Box (7:00 AM – 9:00 AM)'
                : 'Dinner Box (7:00 PM – 9:00 PM)'
              : mealSlot === 'lunch'
              ? 'Morning Box (7:00 AM – 9:00 AM)'
              : 'Dinner Box (7:00 PM – 9:00 PM)';

          return (
            <div className="space-y-3.5 sm:space-y-5 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 pb-2.5 sm:pb-3 border-b border-gray-100">
                <div>
                  <span className="text-[10px] sm:text-[11px] uppercase font-extrabold text-accent">
                    {selectedDayInfo?.dayName} • {diet === 'non-veg' ? 'Non-Veg Protein' : 'Vegetarian Protein'} •{' '}
                    {activeSlotName}
                  </span>
                  <h2 className="font-heading font-black text-lg sm:text-3xl text-gray-900 leading-tight">
                    {currentBox.items.main.name}
                  </h2>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[11px] sm:text-xs text-gray-400 block">
                    {mealsPerDay === 2 ? 'Total (2 Meals Combo)' : 'Single Box Price'}
                  </span>
                  <span className="font-heading font-black text-xl sm:text-2xl text-ink">
                    ₹{mealTotal}
                  </span>
                </div>
              </div>

              {/* If 2 meals selected, show Lunch / Dinner tab toggle */}
              {mealsPerDay === 2 && (
                <div className="flex items-center gap-1.5 sm:gap-2 bg-paper border border-ink/15 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setInspectedSlot('lunch')}
                    className={cn(
                      'flex-1 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-heading font-bold transition-all tap-active flex items-center justify-center gap-1',
                      inspectedSlot === 'lunch'
                        ? 'bg-ink text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 bg-transparent'
                    )}
                  >
                    <span>Morning Box</span>
                    <span className="text-[9px] opacity-75">(7–9 AM)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInspectedSlot('dinner')}
                    className={cn(
                      'flex-1 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-heading font-bold transition-all tap-active flex items-center justify-center gap-1',
                      inspectedSlot === 'dinner'
                        ? 'bg-ink text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 bg-transparent'
                    )}
                  >
                    <span>Dinner Box</span>
                    <span className="text-[9px] opacity-75">(7–9 PM)</span>
                  </button>
                </div>
              )}

              {/* Macro Summary Strip */}
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2 bg-paper p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-ink/10 text-center">
                <div>
                  <span className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase block">Calories</span>
                  <span className="font-heading font-black text-xs sm:text-base text-gray-900">
                    {mealsPerDay === 2
                      ? `${menu.lunch.totals.calories + menu.dinner.totals.calories}`
                      : `${currentBox.totals.calories}`}{' '}
                    kcal
                  </span>
                  {mealsPerDay === 2 && (
                    <span className="text-[8px] sm:text-[9px] text-gray-400 block font-semibold">2 Meals</span>
                  )}
                </div>
                <div>
                  <span className="text-[9px] sm:text-[10px] text-emerald-700 font-bold uppercase block">Protein</span>
                  <span className="font-heading font-black text-xs sm:text-base text-emerald-800">
                    {mealsPerDay === 2
                      ? `${menu.lunch.totals.protein + menu.dinner.totals.protein}`
                      : `${currentBox.totals.protein}`}g
                  </span>
                  {mealsPerDay === 2 && (
                    <span className="text-[8px] sm:text-[9px] text-emerald-600 block font-semibold">2 Meals</span>
                  )}
                </div>
                <div>
                  <span className="text-[9px] sm:text-[10px] text-amber-700 font-bold uppercase block">Carbs</span>
                  <span className="font-heading font-black text-xs sm:text-base text-amber-800">
                    {mealsPerDay === 2
                      ? `${menu.lunch.totals.carbs + menu.dinner.totals.carbs}`
                      : `${currentBox.totals.carbs}`}g
                  </span>
                </div>
                <div>
                  <span className="text-[9px] sm:text-[10px] text-purple-700 font-bold uppercase block">Fats</span>
                  <span className="font-heading font-black text-xs sm:text-base text-purple-800">
                    {mealsPerDay === 2
                      ? `${menu.lunch.totals.fat + menu.dinner.totals.fat}`
                      : `${currentBox.totals.fat}`}g
                  </span>
                </div>
              </div>

              {/* 5-Item Bento Box Contents for currently inspected slot */}
              <div className="space-y-2 sm:space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider block">
                    5 Measured Compartments ({activeSlotName})
                  </span>
                  {mealsPerDay === 2 && (
                    <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Viewing {inspectedSlot === 'lunch' ? 'Morning' : 'Dinner'}
                    </span>
                  )}
                </div>

                {[
                  { label: 'Main Protein', item: currentBox.items.main, icon: '🍗' },
                  { label: 'Protein Side', item: currentBox.items.proteinSide, icon: '🥚' },
                  { label: 'Fresh Salad', item: currentBox.items.salad, icon: '🥗' },
                  { label: 'High-Fiber Legume', item: currentBox.items.legume, icon: '🫘' },
                  { label: 'Complex Carb', item: currentBox.items.carb, icon: '🍚' },
                ].map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gray-50/80 border border-gray-100 text-[11px] sm:text-xs"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <span className="text-sm sm:text-base shrink-0">{c.icon}</span>
                      <div className="min-w-0">
                        <span className="font-bold text-gray-900 block truncate">{c.item.name}</span>
                        <span className="text-[9px] sm:text-[10px] text-gray-500">
                          {c.label} • {c.item.grams}g scaled
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-gray-600 font-bold shrink-0 ml-2">
                      {c.item.calories} kcal
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-[10px] sm:text-[11px] text-emerald-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  {mealsPerDay === 2
                    ? 'Both Morning and Dinner are weighed to the gram on digital kitchen scales and cooked fresh in separate batches.'
                    : '100% Digital Kitchen Scale Guarantee. Cooked fresh in cold-pressed groundnut oil.'}
                </span>
              </div>
            </div>
          );
        })()}

        {/* ================= STEP 4: DELIVERY ADDRESS ================= */}
        {step === 4 && (
          <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="font-heading font-black text-xl sm:text-3xl text-ink">
                Delivery Address
              </h2>
              <p className="text-[11px] sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                Where should our delivery rider bring your hot meal?
              </p>
            </div>

            {/* Saved Address Cards */}
            {addresses.length > 0 && !useNewAddress && (
              <div className="space-y-2.5 sm:space-y-3">
                <label className="text-[11px] sm:text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Select Saved Address
                </label>
                {addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.id;
                  return (
                    <div
                      key={addr.id}
                      onClick={() => {
                        setSelectedAddressId(addr.id);
                        setFlatNumber(addr.flatNumber);
                        setStreet(addr.street);
                        setArea(addr.area);
                        setPincode(addr.pincode);
                      }}
                      className={cn(
                        'p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all flex items-start justify-between tap-active active:scale-[0.99]',
                        isSelected
                          ? 'border-ink bg-paper ring-2 ring-ink/15'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="font-heading font-bold text-xs sm:text-sm text-ink">
                            {addr.tag} ({addr.area})
                          </span>
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded-full uppercase">
                            Core Zone • Free
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {addr.flatNumber}, {addr.street}, {addr.area} - {addr.pincode}
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 font-mono">{addr.phone}</p>
                      </div>

                      <div
                        className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5',
                          isSelected
                            ? 'border-ink bg-ink text-white'
                            : 'border-gray-300'
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setUseNewAddress(true)}
                  className="w-full py-2.5 border-2 border-dashed border-gray-300 hover:border-ink rounded-xl sm:rounded-2xl text-xs font-bold text-gray-600 hover:text-ink flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Enter New Address Instead</span>
                </button>
              </div>
            )}

            {/* Inline Address Form */}
            {(useNewAddress || addresses.length === 0) && (
              <div className="space-y-3 bg-gray-50/80 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-200 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <span className="font-heading font-bold text-xs sm:text-sm text-gray-900">
                    Enter Delivery Details
                  </span>
                  {addresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setUseNewAddress(false)}
                      className="text-xs font-bold text-ink hover:underline"
                    >
                      Use Saved Address
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="text-[10px] sm:text-[11px] font-bold text-gray-600 block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full p-2.5 rounded-xl border border-gray-200 bg-white font-medium text-xs sm:text-sm focus:border-ink focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] sm:text-[11px] font-bold text-gray-600 block mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9842123456"
                      className="w-full p-2.5 rounded-xl border border-gray-200 bg-white font-medium text-xs sm:text-sm focus:border-ink focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] sm:text-[11px] font-bold text-gray-600 block mb-1">
                    Flat / House No / Apartment *
                  </label>
                  <input
                    type="text"
                    value={flatNumber}
                    onChange={(e) => setFlatNumber(e.target.value)}
                    placeholder="e.g. Flat 4B, Green Acres"
                    className="w-full p-2.5 rounded-xl border border-gray-200 bg-white font-medium text-xs sm:text-sm focus:border-ink focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] sm:text-[11px] font-bold text-gray-600 block mb-1">
                    Street & Landmark *
                  </label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="e.g. East Sambandam Road, Near Avila Convent"
                    className="w-full p-2.5 rounded-xl border border-gray-200 bg-white font-medium text-xs sm:text-sm focus:border-ink focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <label className="text-[10px] sm:text-[11px] font-bold text-gray-600 block mb-1">
                      Area (Coimbatore) *
                    </label>
                    <input
                      type="text"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. RS Puram / Gandhipuram"
                      className="w-full p-2.5 rounded-xl border border-gray-200 bg-white font-medium text-xs sm:text-sm focus:border-ink focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] sm:text-[11px] font-bold text-gray-600 block mb-1">
                      Pincode *
                    </label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="e.g. 641002"
                      className="w-full p-2.5 rounded-xl border border-gray-200 bg-white font-medium text-xs sm:text-sm focus:border-ink focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 5: REVIEW & PAY ================= */}
        {step === 5 && (
          <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="font-heading font-black text-xl sm:text-3xl text-ink">
                Order Summary & Prepay
              </h2>
              <p className="text-[11px] sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                9:00 PM cutoff lock policy ensures 0 food wastage and fresh hot kitchen prep.
              </p>
            </div>

            {/* Bill Details */}
            <div className="bg-paper rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-ink/15 space-y-2.5 sm:space-y-3 text-xs">
              <div className="flex justify-between items-start pb-2.5 sm:pb-3 border-b border-gray-200">
                <div>
                  <span className="font-heading font-black text-sm sm:text-base text-ink block">
                    {mealsPerDay === 2
                      ? `${menu.lunch.items.main.name} + ${menu.dinner.items.main.name}`
                      : (mealSlot === 'dinner' ? menu.dinner : menu.lunch).items.main.name}
                  </span>
                  <span className="text-gray-500 text-[11px] sm:text-xs">
                    {diet === 'non-veg' ? 'Non-Veg Protein' : 'Vegetarian Protein'} •{' '}
                    {mealsPerDay === 2 ? '2 Meals (Morning & Dinner Combo)' : '1 Meal'}
                  </span>
                </div>
                <span className="font-heading font-black text-lg sm:text-xl text-ink">
                  ₹{mealTotal}
                </span>
              </div>

              <div className="space-y-1.5 text-gray-600 text-[11px] sm:text-xs">
                <div className="flex justify-between">
                  <span>Scheduled Delivery Date:</span>
                  <span className="font-bold text-gray-900">
                    {selectedDayInfo?.dayOfWeek}, {selectedDayInfo?.formatted}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Delivery Window:</span>
                  <span className="font-bold text-gray-900 text-right">
                    {mealsPerDay === 2
                      ? 'Both Windows: Morning (7–9 AM) & Dinner (7–9 PM)'
                      : mealSlot === 'lunch'
                      ? 'Morning (7:00 AM – 9:00 AM)'
                      : 'Dinner (7:00 PM – 9:00 PM)'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Delivery Address:</span>
                  <span className="font-bold text-gray-900 text-right truncate max-w-[180px] sm:max-w-[220px]">
                    {flatNumber ? `${flatNumber}, ${area}` : activeAddress?.area}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>5-Compartment Eco Bento:</span>
                  <span className="font-bold text-emerald-800 uppercase">Included</span>
                </div>

                <div className="flex justify-between">
                  <span>Doorstep Delivery Fee:</span>
                  {deliveryFee > 0 ? (
                    <span className="font-bold text-amber-800 font-mono">+₹{deliveryFee}</span>
                  ) : (
                    <span className="font-bold text-emerald-800 uppercase">FREE (Core Hub)</span>
                  )}
                </div>
              </div>

              <div className="pt-2.5 sm:pt-3 border-t border-gray-200 flex justify-between items-baseline">
                <div>
                  <span className="font-heading font-black text-xs sm:text-sm text-gray-900">
                    Total Payable
                  </span>
                  <p className="text-[9px] sm:text-[10px] text-gray-400">All taxes & packaging included</p>
                </div>
                <span className="font-heading font-black text-2xl sm:text-3xl text-ink">
                  ₹{finalTotal}
                </span>
              </div>
            </div>

            {/* Payment */}
            <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-ink/15 bg-paper text-[11px] sm:text-xs text-gray-700 flex items-start gap-2">
              <QrCode className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>Next you&apos;ll see our UPI ID and QR code. Pay from any UPI app (GPay, PhonePe, Paytm) and enter the reference number. We confirm and schedule your box.</span>
            </div>

            {/* Guarantees */}
            <div className="p-2.5 sm:p-3 bg-gray-50 rounded-xl sm:rounded-2xl border border-gray-100 text-[10px] sm:text-[11px] text-gray-600 space-y-0.5">
              <p>✓ Price confirmed by our server before you pay</p>
              <p>✓ Delivery updates on WhatsApp</p>
            </div>
          </div>
        )}
      </div>

      {payError && (
        <p role="alert" className="mx-3 sm:mx-6 mb-0 mt-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
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
              {step === 1 && 'Next: Choose Date & Time'}
              {step === 2 && 'Next: Inspect Kitchen Menu'}
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
                <Lock className="w-4 h-4" />
                <span>Place order · {formatCurrency(finalTotal)}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
