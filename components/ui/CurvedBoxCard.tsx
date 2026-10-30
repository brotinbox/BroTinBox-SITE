'use client';

import { usePricing, useRegularTrialPrice, useTrialOffer } from '@/components/providers/CatalogProvider';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { Box } from '@/types';
import { DailyMenuResult, DietType } from '@/lib/menu-engine';
import { ArrowUpRight, ArrowRight, ChevronDown, X, Sparkles, CheckCircle2, Info } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';

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
  const trialOffer = useTrialOffer();
  const TRIAL_REGULAR = useRegularTrialPrice();
  const [mounted, setMounted] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const { setDetailsModalOpen } = useAppStore();
  const CARD_BG = '#ffffff';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (showDetailsModal || showPurchaseModal) {
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
  }, [showDetailsModal, showPurchaseModal, setDetailsModalOpen]);

  // 1. If dynamic menu is provided (5-item rotation engine)
  if (menu) {
    const meal = menu.lunch;
    const mainItem = meal.items.main;
    const dayOfWeekAbbr = dayInfo ? dayInfo.dayOfWeek : menu.dayOfWeek;
    const price = PRICING.trial[diet];
    const regularPrice = TRIAL_REGULAR[diet];
    const weeklyPrice = PRICING.weekly[diet];
    const orderUrl = `/tomorrow?date=${dayInfo?.dateStr || menu.date}&diet=${diet}`;

    return (
      <div
        className={cn(
          "h-full rounded-[28px] sm:rounded-[32px] p-3 sm:p-5 flex flex-col justify-between group relative overflow-hidden transition-all duration-300",
          "bg-white border",
          isToday
            ? "border-primary ring-2 ring-primary/20 shadow-[0_10px_30px_rgba(20,83,45,0.12)] md:-translate-y-1"
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

            {/* Signature Inverted Curved Cutout (Bottom-Right Scoop Nook) in Pure White */}
            <div
              className="absolute bottom-0 right-0 z-20 w-[72px] h-[72px] rounded-tl-[24px] flex items-center justify-center pointer-events-auto"
              style={{ backgroundColor: CARD_BG }}
            >
              {/* Top concave curved connector */}
              <svg
                className="absolute right-0 pointer-events-none"
                style={{ bottom: '71px', width: '24px', height: '24px', color: CARD_BG }}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M24 0 C24 13.2548 13.2548 24 0 24 H24 V0 Z" />
              </svg>

              {/* Left concave curved connector */}
              <svg
                className="absolute bottom-0 pointer-events-none"
                style={{ right: '71px', width: '24px', height: '24px', color: CARD_BG }}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M0 24 C13.2548 24 24 13.2548 24 0 V24 H0 Z" />
              </svg>

              {/* Circular Action Button */}
              <button
                type="button"
                onClick={() => setShowPurchaseModal(true)}
                className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-primary hover:text-white hover:scale-110 active:scale-95 transition-all duration-300 shadow-md group/btn cursor-pointer"
                aria-label={`Purchase options for ${mainItem.name}`}
              >
                <ArrowUpRight className="w-5 h-5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Content Section */}
          <div className="pt-3 sm:pt-4">
            {/* Title with Indian FSSAI symbol: Green Dot for Veg, Brown Triangle for Non-Veg */}
            <div className="flex items-start gap-2.5">
              {diet === 'veg' ? (
                /* FSSAI Green Dot inside square */
                <span
                  className="w-4 h-4 mt-1 rounded-[4px] border-[1.5px] border-emerald-600 bg-white flex items-center justify-center shrink-0 shadow-2xs"
                  title="Vegetarian"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                </span>
              ) : (
                /* FSSAI Brown Triangle inside square */
                <span
                  className="w-4 h-4 mt-1 rounded-[4px] border-[1.5px] border-[#7B3F00] bg-white flex items-center justify-center shrink-0 shadow-2xs"
                  title="Non-Vegetarian"
                >
                  <span className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[6px] border-b-[#7B3F00]" />
                </span>
              )}

              <button
                type="button"
                onClick={() => setShowPurchaseModal(true)}
                className="block text-left group/title flex-1 min-w-0 cursor-pointer"
              >
                <h3 className="font-heading font-black text-sm sm:text-2xl text-gray-900 group-hover/title:text-primary transition-colors tracking-tight line-clamp-1">
                  {mainItem.name}
                </h3>
              </button>
            </div>

            <p className="hidden sm:block text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
              {mainItem.description}
            </p>

            {/* Measured Nutrition Macro Boxes: KCAL, PROTEIN, FAT, CARBS (Fixed rounded decimals) */}
            <p className="sm:hidden mt-1.5 text-[11px] font-semibold text-gray-600">
              <span className="text-emerald-700 font-bold">~{Math.round(meal.totals.protein)}g protein</span>
              <span className="text-gray-300 mx-1">•</span>
              ~{Math.round(meal.totals.calories)} kcal
            </p>

            <div className="hidden sm:grid grid-cols-4 gap-1 sm:gap-2 mt-2.5 sm:mt-3.5 p-1.5 sm:p-2 rounded-2xl bg-gray-50 border border-gray-100 text-center">
              {/* KCAL */}
              <div className="p-1.5 bg-white rounded-xl shadow-2xs border border-gray-100/80 flex flex-col items-center justify-center">
                <span className="text-[9px] font-black uppercase text-amber-700 tracking-wider block">KCAL</span>
                <span className="font-heading font-black text-xs text-gray-900 mt-0.5 leading-none">
                  ~{Math.round(meal.totals.calories)}
                </span>
              </div>

              {/* PROTEIN */}
              <div className="p-1.5 bg-white rounded-xl shadow-2xs border border-emerald-200/80 ring-1 ring-emerald-500/10 flex flex-col items-center justify-center">
                <span className="text-[9px] font-black uppercase text-emerald-700 tracking-wider block">PROTEIN</span>
                <span className="font-heading font-black text-xs text-emerald-700 mt-0.5 leading-none">
                  ~{Math.round(meal.totals.protein)}g
                </span>
              </div>

              {/* FAT */}
              <div className="p-1.5 bg-white rounded-xl shadow-2xs border border-purple-200/80 ring-1 ring-purple-500/10 flex flex-col items-center justify-center">
                <span className="text-[9px] font-black uppercase text-purple-700 tracking-wider block">FAT</span>
                <span className="font-heading font-black text-xs text-gray-900 mt-0.5 leading-none">
                  {Math.round(meal.totals.fat)}g
                </span>
              </div>

              {/* CARBS */}
              <div className="p-1.5 bg-white rounded-xl shadow-2xs border border-orange-200/80 ring-1 ring-orange-500/10 flex flex-col items-center justify-center">
                <span className="text-[9px] font-black uppercase text-orange-700 tracking-wider block">CARBS</span>
                <span className="font-heading font-black text-xs text-gray-900 mt-0.5 leading-none">
                  {Math.round(meal.totals.carbs)}g
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Card Footer: Lowest Price & Direct Choose Action */}
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-3.5 border-t border-gray-100 flex items-center justify-between gap-2">
          <div>
            <span className="hidden sm:block text-[10px] text-gray-400 uppercase tracking-wider font-bold">
              Get the box at
            </span>
            <div className="mt-0.5">
              <span className="font-heading font-black text-lg sm:text-2xl text-gray-900 leading-none">
                ₹{weeklyPrice}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 font-medium block mt-0.5 whitespace-nowrap">
              <span className="sm:hidden">₹{price} trial</span>
              <span className="hidden sm:inline">or ₹{price} single trial</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowDetailsModal(true)}
              className="w-8 h-8 sm:w-auto sm:h-auto justify-center sm:py-2 sm:px-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-all tap-active flex items-center gap-1 cursor-pointer"
            >
              <span className="hidden sm:inline">Details</span>
              <Info className="w-3.5 h-3.5 text-gray-400" />
            </button>
            <button
              type="button"
              onClick={() => setShowPurchaseModal(true)}
              className="bg-cta hover:bg-cta-hover text-white text-[11px] sm:text-xs font-bold py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl shadow-cta/25 hover:shadow-md transition-all tap-active flex items-center gap-1 cursor-pointer"
            >
              <span className="whitespace-nowrap">Get Box</span>
              <ArrowRight className="hidden sm:block w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Box Details Slider from Bottom (Bottom Sheet Drawer) */}
        {mounted && showDetailsModal && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowDetailsModal(false)}
          >
            <div
              className="w-full max-w-5xl bg-white rounded-t-[32px] sm:rounded-t-[40px] shadow-2xl relative border-t border-gray-100 overflow-hidden text-left max-h-[92vh] sm:max-h-[88vh] flex flex-col animate-in slide-in-from-bottom duration-300 ease-out"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile Drag Handle Bar */}
              <div className="w-12 h-1.5 rounded-full bg-gray-300 mx-auto mt-3 mb-1 sm:hidden shrink-0" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="absolute top-4 right-4 sm:top-5 sm:right-6 p-2 rounded-full text-gray-400 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer z-30 shadow-xs"
                aria-label="Close meal details"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Scrollable Content Container */}
              <div className="overflow-y-auto flex-1 p-5 sm:p-7 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
                  {/* LEFT COLUMN: Large Meal Tray Image + Quality Badges */}
                  <div className="md:col-span-5 lg:col-span-5 space-y-4">
                    {/* Big Tray Image Container */}
                    <div className="relative w-full aspect-[4/3] md:aspect-square rounded-3xl overflow-hidden bg-gray-100 border border-gray-200/80 shadow-md group">
                      <Image
                        src={mainItem.image}
                        alt={mainItem.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        priority
                      />

                      {/* Veg / Non-Veg Indicator Icon Floating Over Image */}
                      <div className="absolute top-3.5 left-3.5 z-10">
                        {diet === 'veg' ? (
                          <span
                            className="w-5 h-5 rounded-[5px] border-[1.5px] border-emerald-600 bg-white/95 backdrop-blur-md flex items-center justify-center shrink-0 shadow-sm"
                            title="Vegetarian"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                          </span>
                        ) : (
                          <span
                            className="w-5 h-5 rounded-[5px] border-[1.5px] border-[#7B3F00] bg-white/95 backdrop-blur-md flex items-center justify-center shrink-0 shadow-sm"
                            title="Non-Vegetarian"
                          >
                            <span className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[7px] border-b-[#7B3F00]" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Meal Details, Macros & 5 Weighed Items */}
                  <div className="md:col-span-7 lg:col-span-7 space-y-5">
                    {/* Header */}
                    <div>
                      <span className="text-xs font-bold text-accent uppercase tracking-wider block mb-1">
                        Daily Signature Protein Bento
                      </span>
                      <h2 className="font-heading font-black text-2xl sm:text-3xl text-gray-900 tracking-tight">
                        {mainItem.name}
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
                        {mainItem.description}
                      </p>
                      {/* Day Box Badge moved after description */}
                      <div className="mt-3 flex items-center gap-2">
                        <span className="inline-flex items-center text-xs font-bold px-3 py-1 rounded-full bg-sand text-ink border border-ink/15">
                          {dayInfo?.dayName || menu.dayOfWeek} Box
                        </span>
                      </div>
                    </div>

                    {/* Macro Summary Cards */}
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-2">
                        Nutritional Values Per Box
                      </span>
                      <div className="grid grid-cols-4 gap-2 sm:gap-2.5 text-center">
                        <div className="p-2.5 bg-amber-50/70 rounded-2xl border border-amber-200/60">
                          <span className="text-[9px] font-black uppercase text-amber-700 tracking-wider block">KCAL</span>
                          <span className="font-heading font-black text-base sm:text-lg text-gray-900 mt-0.5 block">
                            ~{Math.round(meal.totals.calories)}
                          </span>
                        </div>
                        <div className="p-2.5 bg-emerald-50/70 rounded-2xl border border-emerald-200 ring-1 ring-emerald-500/20">
                          <span className="text-[9px] font-black uppercase text-emerald-700 tracking-wider block">PROTEIN</span>
                          <span className="font-heading font-black text-base sm:text-lg text-emerald-700 mt-0.5 block">
                            ~{Math.round(meal.totals.protein)}g
                          </span>
                        </div>
                        <div className="p-2.5 bg-purple-50/70 rounded-2xl border border-purple-200/60">
                          <span className="text-[9px] font-black uppercase text-purple-700 tracking-wider block">FAT</span>
                          <span className="font-heading font-black text-base sm:text-lg text-gray-900 mt-0.5 block">
                            {Math.round(meal.totals.fat)}g
                          </span>
                        </div>
                        <div className="p-2.5 bg-orange-50/70 rounded-2xl border border-orange-200/60">
                          <span className="text-[9px] font-black uppercase text-orange-700 tracking-wider block">CARBS</span>
                          <span className="font-heading font-black text-base sm:text-lg text-gray-900 mt-0.5 block">
                            {Math.round(meal.totals.carbs)}g
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 5 Digitally Weighed Items List */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="flex flex-row items-center justify-between gap-2 mb-3 pb-2.5 border-b border-gray-200/60">
                        <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-gray-700 min-w-0">
                          5 Items Digitally Weighed Inside
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-[10px] sm:text-[11px] font-mono text-gray-600 bg-white px-2.5 py-1 rounded-full border border-gray-200 font-bold shadow-2xs">
                          Net Meal: <span className="text-ink font-black">~620g</span>
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        {/* 1. Main Dish */}
                        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">{diet === 'non-veg' ? (dayOfWeekAbbr === 'Wed' ? '🐟' : '🍗') : '🧀'}</span>
                            <div>
                              <span className="font-bold text-gray-900 block">{mainItem.name}</span>
                              <span className="text-[10px] text-gray-400">Primary Protein Core</span>
                            </div>
                          </div>
                          <span className="text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-lg">
                            {mainItem.grams}g
                          </span>
                        </div>

                        {/* 2. Protein Booster Side */}
                        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">{diet === 'non-veg' ? '🥚' : '🌱'}</span>
                            <div>
                              <span className="font-semibold text-gray-800 block">{meal.items.proteinSide.name}</span>
                              <span className="text-[10px] text-gray-400">Protein Booster Side</span>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                            {meal.items.proteinSide.grams}g
                          </span>
                        </div>

                        {/* 3. Rotational Salad */}
                        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">🥗</span>
                            <div>
                              <span className="font-semibold text-gray-800 block">{meal.items.salad.name}</span>
                              <span className="text-[10px] text-gray-400">Fresh Raw Micronutrients</span>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                            {meal.items.salad.grams}g
                          </span>
                        </div>

                        {/* 4. Rotational Legume */}
                        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">🫘</span>
                            <div>
                              <span className="font-semibold text-gray-800 block">{meal.items.legume.name}</span>
                              <span className="text-[10px] text-gray-400">Complex Fiber &amp; Satiety</span>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                            {meal.items.legume.grams}g
                          </span>
                        </div>

                        {/* 5. Rotational Carb */}
                        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">🌾</span>
                            <div>
                              <span className="font-semibold text-gray-800 block">{meal.items.carb.name}</span>
                              <span className="text-[10px] text-gray-400">Clean Sustained Fuel</span>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                            {meal.items.carb.grams}g
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fixed Bottom Action Bar */}
              <div className="p-4 sm:p-5 bg-white border-t border-gray-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg z-20">
                <div className="hidden sm:block">
                  <span className="text-[11px] text-gray-400 uppercase tracking-wider block font-bold">
                    Doorstep Coimbatore Delivery
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-heading font-black text-2xl text-gray-900 leading-none">
                      ₹{weeklyPrice}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      /box on weekly plan • or ₹{price} single trial
                    </span>
                  </div>
                </div>

                <div className="w-full sm:w-auto flex items-center gap-2.5">
                  <Link
                    href={`/weekly?diet=${diet}`}
                    onClick={() => setShowDetailsModal(false)}
                    className="flex-1 sm:flex-initial bg-cta hover:bg-cta-hover text-white font-bold text-xs sm:text-sm py-3 px-5 rounded-2xl transition-all shadow-md text-center flex items-center justify-center gap-1.5 tap-active"
                  >
                    <span>Subscribe Weekly (₹{weeklyPrice}/box)</span>
                  </Link>
                  <Link
                    href={orderUrl}
                    onClick={() => setShowDetailsModal(false)}
                    className="flex-1 sm:flex-initial bg-gray-900 hover:bg-ink text-white font-bold text-xs sm:text-sm py-3 px-5 rounded-2xl transition-all text-center flex items-center justify-center gap-1.5 tap-active"
                  >
                    <span>Order Single (₹{price})</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Purchase Options Modal */}
        {mounted && showPurchaseModal && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setShowPurchaseModal(false)}
          >
            <div
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100 overflow-hidden text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowPurchaseModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Meal Summary Header */}
              <div className="flex items-center gap-3 pr-8 pb-4 border-b border-gray-100">
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-gray-100 border border-gray-200">
                  <Image
                    src={mainItem.image}
                    alt={mainItem.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                        diet === 'veg'
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      )}
                    >
                      {diet === 'veg' ? 'Pure Veg' : 'Non-Veg'}
                    </span>
                    <span className="text-xs text-gray-500 font-semibold">
                      {dayInfo?.dayName || 'Day Special'}
                    </span>
                  </div>
                  <h3 className="font-heading font-black text-base text-gray-900 mt-0.5 line-clamp-1">
                    {mainItem.name}
                  </h3>
                </div>
              </div>

              {/* Options Header */}
              <div className="mt-4 mb-3">
                <h4 className="font-heading font-black text-lg text-gray-900">
                  Choose Purchase Option
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Get the box on weekly subscription or order as a single trial.
                </p>
              </div>

              {/* Options Grid/List */}
              <div className="space-y-3">
                {/* 1. Weekly Subscription (Recommended - Lowest Price) */}
                <Link
                  href={`/weekly?diet=${diet}`}
                  onClick={() => setShowPurchaseModal(false)}
                  className="group block p-4 rounded-2xl border-2 border-emerald-600 bg-emerald-50/40 hover:bg-emerald-50 transition-all text-left relative shadow-xs hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Best Value
                        </span>
                        <span className="text-[11px] font-bold text-emerald-800">
                          Weekly Plan
                        </span>
                      </div>
                      <p className="font-heading font-black text-base text-gray-900 mt-1">
                        6-Day Subscription
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                        Full routine (Mon–Sat) with free delivery & skip-anytime flexibility.
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Only</span>
                      <span className="font-heading font-black text-2xl text-emerald-700">
                        ₹{weeklyPrice}
                      </span>
                      <span className="text-[10px] text-gray-500 font-semibold block">/box</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-emerald-200/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800">
                      Save ₹{(regularPrice - weeklyPrice) * 6} every week
                    </span>
                    <span className="bg-emerald-600 group-hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3 rounded-xl transition-colors flex items-center gap-1">
                      <span>Subscribe at ₹{weeklyPrice}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>

                {/* 2. Single Day Trial */}
                <Link
                  href={orderUrl}
                  onClick={() => setShowPurchaseModal(false)}
                  className="group block p-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50/80 hover:border-gray-300 transition-all text-left relative shadow-2xs hover:shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        Single Day Trial
                      </span>
                      <p className="font-heading font-black text-base text-gray-900 mt-0.5">
                        Single Box Only
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        Try just this box for {dayInfo?.dayName || 'the day'}. No subscription required.
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">
                        {trialOffer ? <span className="text-accent">{trialOffer.label}</span> : 'Price'}
                      </span>
                      {trialOffer && <s className="mr-1 text-xs font-bold text-gray-400">₹{regularPrice}</s>}
                      <span className="font-heading font-black text-2xl text-gray-900">
                        ₹{price}
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold block">single</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      One-time order
                    </span>
                    <span className="bg-gray-900 group-hover:bg-primary text-white text-xs font-bold py-1.5 px-3 rounded-xl transition-colors flex items-center gap-1">
                      <span>Order Single Box</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              </div>
            </div>
          </div>,
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
          ? "border-primary ring-2 ring-primary/20 shadow-[0_10px_30px_rgba(20,83,45,0.12)] md:-translate-y-1"
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
              <span className="text-[9px] font-black uppercase text-amber-700 tracking-wider block">KCAL</span>
              <span className="font-heading font-black text-xs sm:text-sm text-gray-900 mt-0.5 leading-none">
                ~{Math.round(box.totals.calories)}
              </span>
            </div>
            <div className="p-1.5 sm:p-2 bg-white rounded-xl shadow-2xs border border-emerald-200/80 ring-1 ring-emerald-500/10 flex flex-col items-center justify-center">
              <span className="text-[9px] font-black uppercase text-emerald-700 tracking-wider block">PROTEIN</span>
              <span className="font-heading font-black text-xs sm:text-sm text-emerald-700 mt-0.5 leading-none">
                ~{Math.round(box.totals.protein)}g
              </span>
            </div>
            <div className="p-1.5 sm:p-2 bg-white rounded-xl shadow-2xs border border-purple-200/80 ring-1 ring-purple-500/10 flex flex-col items-center justify-center">
              <span className="text-[9px] font-black uppercase text-purple-700 tracking-wider block">FAT</span>
              <span className="font-heading font-black text-xs sm:text-sm text-gray-900 mt-0.5 leading-none">
                {Math.round(box.totals.fat)}g
              </span>
            </div>
            <div className="p-1.5 sm:p-2 bg-white rounded-xl shadow-2xs border border-orange-200/80 ring-1 ring-orange-500/10 flex flex-col items-center justify-center">
              <span className="text-[9px] font-black uppercase text-orange-700 tracking-wider block">CARBS</span>
              <span className="font-heading font-black text-xs sm:text-sm text-gray-900 mt-0.5 leading-none">
                {Math.round(box.totals.carbs)}g
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">
            Get the box at
          </span>
          <div className="mt-0.5">
            <span className="font-heading font-black text-2xl text-gray-900 leading-none">
              ₹{PRICING.weekly[diet]}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
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
