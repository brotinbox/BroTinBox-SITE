'use client';

import { usePricing, useRegularTrialPrice, useTrialOffer } from '@/components/providers/CatalogProvider';
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Box } from '@/types';
import { DailyMenuResult, DietType, getNextBookableDays } from '@/lib/menu-engine';
import { ArrowUpRight, ArrowRight, X } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { DietMark } from '@/components/trial/DietMark';
import { BoxContents, MacroLine, OptionCard, Section } from '@/components/flow/FlowUI';

export interface CurvedBoxCardProps {
  menu?: DailyMenuResult;
  dayInfo?: {
    date: Date;
    dateStr: string;
    dayOfWeek: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
    dayName: string;
    formatted: string;
  };
  diet?: DietType;
  isToday?: boolean;
  box?: Box; // Backwards-compatibility fallback
}

export function CurvedBoxCard({
  menu,
  dayInfo,
  diet = 'non-veg',
  isToday = false,
  box,
}: CurvedBoxCardProps) {
  const PRICING = usePricing();
  const [mounted, setMounted] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const { setDetailsModalOpen } = useAppStore();
  const CARD_BG = '#ffffff';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (showSheet) {
      setDetailsModalOpen(true);
      document.body.style.overflow = 'hidden';
    } else {
      setDetailsModalOpen(false);
      document.body.style.overflow = 'unset';
    }
    return () => {
      setDetailsModalOpen(false);
      document.body.style.overflow = 'unset';
    };
  }, [showSheet, setDetailsModalOpen]);

  // 1. If dynamic menu is provided (5-item rotation engine)
  if (menu) {
    const meal = menu.lunch;
    const mainItem = meal.items.main;
    const price = PRICING.trial[diet];
    const weeklyPrice = PRICING.weekly[diet];

    return (
      <div
        className={cn(
          "h-full rounded-[28px] sm:rounded-[32px] p-3 sm:p-5 flex flex-col justify-between group relative overflow-hidden transition-all duration-300",
          "bg-white border",
          isToday
            ? "border-ink ring-2 ring-ink/10 shadow-[0_10px_30px_rgba(0,0,0,0.10)] md:-translate-y-1"
            : "border-gray-200/90 hover:border-gray-300 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.08)]"
        )}
      >
        <div>
          {/* Top Image Container with 21st.dev Style Inverted Curved Corner Cutout */}
          <div className="relative aspect-[16/10] w-full rounded-[20px] sm:rounded-[24px] overflow-hidden bg-gray-100">
            <Image
              src={mainItem.image}
              alt={mainItem.name}
              fill
              sizes="(max-width: 768px) 220px, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            />

            {/* Subtle gradient vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent pointer-events-none" />

            {/* Day of this box */}
            {dayInfo && (
              <span className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-ink shadow-sm">
                {dayInfo.dayOfWeek} · {dayInfo.formatted}
              </span>
            )}

            {/* Signature Inverted Curved Cutout (Bottom-Right Scoop Nook) in Pure White */}
            <div
              className="absolute bottom-0 right-0 z-20 w-12 h-12 rounded-tl-[16px] sm:w-[72px] sm:h-[72px] sm:rounded-tl-[24px] flex items-center justify-center pointer-events-auto"
              style={{ backgroundColor: CARD_BG }}
            >
              {/* Top concave curved connector (smaller on mobile) */}
              <svg
                className="absolute right-0 bottom-[47px] w-4 h-4 sm:bottom-[71px] sm:w-6 sm:h-6 pointer-events-none"
                style={{ color: CARD_BG }}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M24 0 C24 13.2548 13.2548 24 0 24 H24 V0 Z" />
              </svg>

              {/* Left concave curved connector (smaller on mobile) */}
              <svg
                className="absolute bottom-0 right-[47px] w-4 h-4 sm:right-[71px] sm:w-6 sm:h-6 pointer-events-none"
                style={{ color: CARD_BG }}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M0 24 C13.2548 24 24 13.2548 24 0 V24 H0 Z" />
              </svg>

              {/* Circular Action Button: opens the box panel */}
              <button
                type="button"
                onClick={() => setShowSheet(true)}
                className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-accent hover:text-white hover:scale-110 active:scale-95 transition-all duration-300 shadow-md group/btn cursor-pointer"
                aria-label={`See what's inside ${mainItem.name}`}
              >
                <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Content Section */}
          <div className="pt-3 sm:pt-4">
            <div className="flex items-start gap-2.5">
              <DietMark kind={diet} className="mt-0.5 sm:mt-1.5" />
              <button
                type="button"
                onClick={() => setShowSheet(true)}
                className="block text-left group/title flex-1 min-w-0 cursor-pointer"
              >
                <h3 className="font-heading font-black text-sm sm:text-2xl text-gray-900 group-hover/title:text-accent transition-colors tracking-tight line-clamp-1">
                  {mainItem.name}
                </h3>
              </button>
            </div>

            <p className="hidden sm:block text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
              {mainItem.description}
            </p>

            <p className="sm:hidden mt-1.5 text-[11px] font-semibold text-gray-600">
              <span className="text-emerald-700 font-bold">~{Math.round(meal.totals.protein)}g protein</span>
              <span className="text-gray-300 mx-1">•</span>
              ~{Math.round(meal.totals.calories)} kcal
            </p>

            <div className="hidden sm:block mt-3.5">
              <MacroLine {...meal.totals} />
            </div>
          </div>
        </div>

        {/* Card Footer: price with its label, one button */}
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-3.5 border-t border-gray-100 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <span className="block text-[11px] font-semibold text-gray-500 leading-none">On weekly plan</span>
            <p className="mt-1 leading-none whitespace-nowrap">
              <span className="font-heading font-black text-lg sm:text-2xl text-gray-900">₹{weeklyPrice}</span>
              <span className="text-[11px] font-semibold text-gray-500">/meal</span>
            </p>
            <span className="block text-[11px] text-gray-500 mt-1 whitespace-nowrap">or try one for ₹{price}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowSheet(true)}
            className="shrink-0 bg-accent hover:bg-accent-hover text-white text-xs font-bold py-2 px-3 sm:px-4 rounded-xl transition-colors tap-active flex items-center gap-1 cursor-pointer"
          >
            <span className="whitespace-nowrap">Get box</span>
            <ArrowRight className="hidden sm:block w-3.5 h-3.5" />
          </button>
        </div>

        {mounted && showSheet && createPortal(
          <BoxSheet menu={menu} dayInfo={dayInfo} diet={diet} onClose={() => setShowSheet(false)} />,
          document.body
        )}
      </div>
    );
  }


  // 2. Legacy fallback if box is passed
  if (!box) return null;

  return (
    <div
      className={cn(
        "rounded-[32px] p-4 sm:p-5 flex flex-col justify-between group relative overflow-hidden transition-all duration-300",
        "bg-white border",
        isToday
          ? "border-ink ring-2 ring-ink/10 shadow-[0_10px_30px_rgba(0,0,0,0.10)] md:-translate-y-1"
          : "border-gray-200/90 hover:border-gray-300 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.08)]"
      )}
    >
      <div>
        <div className="relative aspect-[16/11] w-full rounded-[24px] overflow-hidden bg-gray-100">
          <Image
            src={box.image}
            alt={box.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

          <div
            className="absolute bottom-0 right-0 z-20 w-[72px] h-[72px] rounded-tl-[24px] flex items-center justify-center pointer-events-auto"
            style={{ backgroundColor: CARD_BG }}
          >
            <svg
              className="absolute right-0 pointer-events-none"
              style={{ bottom: '71px', width: '24px', height: '24px', color: CARD_BG }}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M24 0 C24 13.2548 13.2548 24 0 24 H24 V0 Z" />
            </svg>
            <svg
              className="absolute bottom-0 pointer-events-none"
              style={{ right: '71px', width: '24px', height: '24px', color: CARD_BG }}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M0 24 C13.2548 24 24 13.2548 24 0 V24 H0 Z" />
            </svg>

            <Link
              href="/tomorrow"
              className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-primary hover:text-white hover:scale-110 active:scale-95 transition-all duration-300 shadow-md group/btn"
              aria-label={`View ${box.name} breakdown`}
            >
              <ArrowUpRight className="w-5 h-5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform stroke-[2.5]" />
            </Link>
          </div>
        </div>

        <div className="pt-4">
          <Link href="/tomorrow" className="block group/title">
            <h3 className="font-heading font-black text-xl sm:text-2xl text-gray-900 group-hover/title:text-primary transition-colors tracking-tight line-clamp-1">
              {box.name}
            </h3>
          </Link>

          <p className="text-xs sm:text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">
            {box.description}
          </p>

          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mt-4 p-2 sm:p-2.5 rounded-2xl bg-gray-50 border border-gray-100 text-center">
            <div className="p-1.5 sm:p-2 bg-white rounded-xl shadow-2xs border border-gray-100/80 flex flex-col items-center justify-center">
              <span className="text-[11px] font-black uppercase text-amber-700 tracking-wider block">KCAL</span>
              <span className="font-heading font-black text-xs sm:text-sm text-gray-900 mt-0.5 leading-none">
                ~{Math.round(box.totals.calories)}
              </span>
            </div>
            <div className="p-1.5 sm:p-2 bg-white rounded-xl shadow-2xs border border-emerald-200/80 ring-1 ring-emerald-500/10 flex flex-col items-center justify-center">
              <span className="text-[11px] font-black uppercase text-emerald-700 tracking-wider block">PROTEIN</span>
              <span className="font-heading font-black text-xs sm:text-sm text-emerald-700 mt-0.5 leading-none">
                ~{Math.round(box.totals.protein)}g
              </span>
            </div>
            <div className="p-1.5 sm:p-2 bg-white rounded-xl shadow-2xs border border-purple-200/80 ring-1 ring-purple-500/10 flex flex-col items-center justify-center">
              <span className="text-[11px] font-black uppercase text-purple-700 tracking-wider block">FAT</span>
              <span className="font-heading font-black text-xs sm:text-sm text-gray-900 mt-0.5 leading-none">
                {Math.round(box.totals.fat)}g
              </span>
            </div>
            <div className="p-1.5 sm:p-2 bg-white rounded-xl shadow-2xs border border-orange-200/80 ring-1 ring-orange-500/10 flex flex-col items-center justify-center">
              <span className="text-[11px] font-black uppercase text-orange-700 tracking-wider block">CARBS</span>
              <span className="font-heading font-black text-xs sm:text-sm text-gray-900 mt-0.5 leading-none">
                {Math.round(box.totals.carbs)}g
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
        <div>
          <span className="text-[11px] text-gray-400 uppercase tracking-wider block font-bold">
            Get the box at
          </span>
          <div className="mt-0.5">
            <span className="font-heading font-black text-2xl text-gray-900 leading-none">
              ₹{PRICING.weekly[diet]}
            </span>
          </div>
          <span className="text-[11px] text-gray-400 font-medium block mt-0.5">
            or {formatCurrency(box.price)} single trial
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/weekly"
            className="py-2.5 px-3.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-all tap-active"
          >
            Details
          </Link>
          <Link
            href="/weekly"
            className="bg-cta hover:bg-cta-hover text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-cta/25 hover:shadow-md hover:scale-105 transition-all tap-active flex items-center gap-1.5"
          >
            <span>Get Box</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * One bottom panel for a day's box, in the checkout look: what's inside
 * (weighed), then weekly plan or a single box, and one button.
 */
function BoxSheet({ menu, dayInfo, diet, onClose }: {
  menu: DailyMenuResult;
  dayInfo?: CurvedBoxCardProps['dayInfo'];
  diet: DietType;
  onClose: () => void;
}) {
  const router = useRouter();
  const PRICING = usePricing();
  const trialOffer = useTrialOffer();
  const TRIAL_REGULAR = useRegularTrialPrice();
  const [choice, setChoice] = useState<'weekly' | 'trial'>('weekly');

  const meal = menu.lunch;
  const mainItem = meal.items.main;
  const dateStr = dayInfo?.dateStr || menu.date;
  const price = PRICING.trial[diet];
  const regularPrice = TRIAL_REGULAR[diet];
  const weeklyPrice = PRICING.weekly[diet];
  const weekSaving = (regularPrice - weeklyPrice) * 6;

  // A single box can only be booked for the next 3 open days.
  const bookable = useMemo(() => getNextBookableDays(3).some((d) => d.dateStr === dateStr), [dateStr]);
  const href = choice === 'weekly'
    ? `/weekly?diet=${diet}`
    : bookable ? `/tomorrow?date=${dateStr}&diet=${diet}` : `/tomorrow?diet=${diet}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mainItem.name}
        className="w-full max-w-lg bg-paper rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden text-left max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-300 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 pt-3 pb-3 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-3 sm:hidden" />
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-100">
              <Image src={mainItem.image} alt="" fill sizes="56px" className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                <DietMark kind={diet} size="sm" />
                {dayInfo ? `${dayInfo.dayName}, ${dayInfo.formatted}` : 'Daily box'}
              </p>
              <h2 className="font-heading font-black text-base text-ink leading-tight mt-0.5 line-clamp-2">{mainItem.name}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-gray-500 hover:text-ink bg-gray-100 hover:bg-gray-200 transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          <Section title="What's inside" note="5 items, each weighed on a kitchen scale.">
            <BoxContents box={meal} photo={false} />
          </Section>

          <Section title="How do you want it?">
            <div className="grid gap-2" role="radiogroup" aria-label="How do you want it">
              <OptionCard
                selected={choice === 'weekly'}
                onClick={() => setChoice('weekly')}
                title="Weekly plan · Mon–Sat"
                note={weekSaving > 0 ? `Save ₹${weekSaving} a week · skip any day` : 'A new box each day · skip any day'}
                right={
                  <>
                    <span className="block font-heading font-black text-sm text-gray-900">₹{weeklyPrice}</span>
                    <span className="block text-[11px] text-gray-500">per meal</span>
                  </>
                }
              />
              <OptionCard
                selected={choice === 'trial'}
                onClick={() => setChoice('trial')}
                title={bookable ? 'Try this box' : 'Try a single box'}
                note={bookable
                  ? `One box on ${dayInfo?.dayName ?? 'this day'} · no plan`
                  : 'This day isn’t open yet. Single boxes book up to 3 days ahead.'}
                right={
                  <>
                    <span className="block font-heading font-black text-sm text-gray-900">
                      {trialOffer && regularPrice !== price && <s className="mr-1 text-xs font-bold text-gray-400">₹{regularPrice}</s>}
                      ₹{price}
                    </span>
                    <span className="block text-[11px] text-gray-500">{trialOffer ? trialOffer.label : 'one box'}</span>
                  </>
                }
              />
            </div>
            {PRICING.lite && (
              <p className="text-xs text-gray-500">
                Want it smaller? The Lite box ({diet === 'veg' ? 4 : 3} items, smaller portions) starts at ₹{PRICING.lite.trial[diet]}. Pick it on the next screen.
              </p>
            )}
          </Section>
        </div>

        {/* Bottom bar */}
        <div className="bg-white border-t border-gray-200 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0">
          <button
            type="button"
            onClick={() => { onClose(); router.push(href); }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-ink hover:bg-ink-soft text-white font-heading font-black text-sm"
          >
            {choice === 'weekly' ? 'Continue with weekly plan' : bookable ? `Order ${dayInfo?.dayName ?? 'this'} box` : 'Pick a day'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
