'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Box, SideBox, AddonDrink } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import {
  Flame,
  Dumbbell,
  ShieldCheck,
  Check,
  Leaf,
  ChevronLeft,
  ArrowRight,
  Info,
  Sparkles,
  Scale,
  Plus,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface BoxDetailClientProps {
  box: Box;
  suggestedSides: SideBox[];
  suggestedAddons: AddonDrink[];
}

export function BoxDetailClient({
  box,
  suggestedSides,
  suggestedAddons,
}: BoxDetailClientProps) {
  const router = useRouter();
  const [selectedVersion, setSelectedVersion] = useState<'standard' | 'egg-free'>('standard');
  const { toggleDay, selectedDays, toggleSideForDay, setDayConfig } = useAppStore();

  const isEggFree = selectedVersion === 'egg-free';
  const currentMacros = isEggFree ? box.eggFreeVersion : box.totals;

  // Donut chart angles for macros (Protein: 4 kcal/g, Carbs: 4 kcal/g, Fat: 9 kcal/g)
  const proteinKcal = currentMacros.protein * 4;
  const carbsKcal = currentMacros.carbs * 4;
  const fatKcal = currentMacros.fat * 9;
  const totalMacroKcal = proteinKcal + carbsKcal + fatKcal || 1;

  const proteinPct = Math.round((proteinKcal / totalMacroKcal) * 100);
  const carbsPct = Math.round((carbsKcal / totalMacroKcal) * 100);
  const fatPct = 100 - proteinPct - carbsPct;

  // SVG circle calculations
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const proteinOffset = circumference - (proteinPct / 100) * circumference;
  const carbsOffset = circumference - ((proteinPct + carbsPct) / 100) * circumference;

  const handleAddToPlan = () => {
    // Ensure day is selected and egg-free preference configured
    if (!selectedDays.includes(box.day)) {
      toggleDay(box.day);
    }
    setDayConfig(box.day, { isEggFree });
    router.push(`/build-plan?day=${box.day}`);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Top Breadcrumb */}
      <div className="bg-white border-b border-gray-200 py-3.5 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/menu"
            className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to This Week</span>
          </Link>
          <span className="text-xs font-bold text-primary bg-primary-light px-2.5 py-0.5 rounded-full uppercase">
            {box.day} Cook Schedule
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">
        {/* Hero Section */}
        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-card p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Box Main Photo */}
            <div className="lg:col-span-6 space-y-4">
              <div className="relative h-72 sm:h-96 rounded-2xl overflow-hidden shadow-inner bg-gray-100">
                <Image
                  src={box.image}
                  alt={box.name}
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="bg-primary text-lime-brand font-black text-xs px-3 py-1 rounded-full shadow-md uppercase">
                    {box.day} Rotation
                  </span>
                  <span className={cn(
                    "text-white font-extrabold text-xs px-2.5 py-1 rounded-full shadow-md uppercase",
                    box.isVeg ? "bg-emerald-600" : "bg-rose-600"
                  )}>
                    {box.isVeg ? 'Veg' : 'Non-Veg'}
                  </span>
                </div>
              </div>

              {/* Version Toggle (Standard vs Egg-Free) */}
              <div className="p-1 bg-gray-100 rounded-2xl flex text-xs font-bold border border-gray-200">
                <button
                  onClick={() => setSelectedVersion('standard')}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5",
                    selectedVersion === 'standard'
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  <span>Standard Box (with 2 Eggs)</span>
                </button>
                <button
                  onClick={() => setSelectedVersion('egg-free')}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5",
                    selectedVersion === 'egg-free'
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  <Leaf className="w-3.5 h-3.5" />
                  <span>Egg-Free (+Extra Legumes)</span>
                </button>
              </div>
            </div>

            {/* Title, Macros & Donut */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <h1 className="font-heading font-black text-3xl sm:text-4xl text-gray-900">
                  {box.name}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
                  {box.description}
                </p>
                {isEggFree && (
                  <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 mt-2.5 font-medium">
                    ✓ <strong>Egg-Free Customization:</strong> {box.eggFreeVersion.description}
                  </p>
                )}
              </div>

              {/* Macro Tiles */}
              <div className="grid grid-cols-4 gap-2.5 text-center">
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Energy</span>
                  <span className="font-heading font-black text-xl text-gray-900">~{currentMacros.calories}</span>
                  <span className="text-[10px] text-gray-400 block">kcal</span>
                </div>
                <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200/80 ring-1 ring-emerald-500/20">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Protein</span>
                  <span className="font-heading font-black text-xl text-emerald-700">~{currentMacros.protein}g</span>
                  <span className="text-[10px] text-emerald-600 block">{proteinPct}% cals</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Carbs</span>
                  <span className="font-heading font-black text-xl text-gray-900">{currentMacros.carbs}g</span>
                  <span className="text-[10px] text-gray-400 block">{carbsPct}% cals</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Fats</span>
                  <span className="font-heading font-black text-xl text-gray-900">{currentMacros.fat}g</span>
                  <span className="text-[10px] text-gray-400 block">{fatPct}% cals</span>
                </div>
              </div>

              {/* Macro Donut & Split Breakdown */}
              <div className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100 flex items-center justify-between gap-6">
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="transparent"
                      stroke="#f97316"
                      strokeWidth="12"
                      strokeDasharray={circumference}
                      strokeDashoffset={0}
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="transparent"
                      stroke="#3b82f6"
                      strokeWidth="12"
                      strokeDasharray={circumference}
                      strokeDashoffset={carbsOffset}
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="transparent"
                      stroke="#EA580C"
                      strokeWidth="12"
                      strokeDasharray={circumference}
                      strokeDashoffset={proteinOffset}
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="font-heading font-black text-xs text-gray-900 block leading-tight">
                      {currentMacros.protein}g
                    </span>
                    <span className="text-[8px] font-bold uppercase text-gray-400">Prot</span>
                  </div>
                </div>

                <div className="flex-1 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                      <span>Protein ({proteinPct}%)</span>
                    </span>
                    <span className="font-bold text-gray-900">{currentMacros.protein}g</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                      <span>Carbs ({carbsPct}%)</span>
                    </span>
                    <span className="font-bold text-gray-900">{currentMacros.carbs}g</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
                      <span>Fats ({fatPct}%)</span>
                    </span>
                    <span className="font-bold text-gray-900">{currentMacros.fat}g</span>
                  </div>
                </div>
              </div>

              {/* Lab verification disclaimer */}
              <p className="text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200/80 rounded-xl px-3 py-2 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{box.labVerifiedNote}</span>
              </p>

              {/* Price and Add button */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Subscription Price</span>
                  <span className="font-heading font-black text-3xl text-gray-900">{formatCurrency(box.price)}</span>
                </div>
                <button
                  onClick={handleAddToPlan}
                  className="bg-cta hover:bg-cta-hover text-white font-black text-sm px-6 py-3 rounded-2xl shadow-lg shadow-cta/25 hover:shadow-xl tap-active flex items-center gap-1.5"
                >
                  <span>Add To Plan</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Five-Item Breakdown with Photos */}
        <div className="space-y-4">
          <div>
            <h2 className="font-heading font-black text-2xl text-gray-900">
              Five-Item Breakdown
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Each meal is weighed on digital kitchen scales to strictly guarantee calibrated macro delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {box.items.map((item, idx) => {
              // If egg-free is active and this is the egg item, show swap item
              const isEggItem = item.type === 'egg';
              const showAsSwapped = isEggFree && isEggItem;

              return (
                <div
                  key={idx}
                  className={cn(
                    "bg-white rounded-3xl p-4 border transition-all flex flex-col justify-between shadow-xs",
                    showAsSwapped ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20" : "border-gray-200"
                  )}
                >
                  <div>
                    <div className="relative h-36 rounded-2xl overflow-hidden mb-3 bg-gray-100">
                      {item.image && (
                        <Image
                          src={showAsSwapped ? "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=400&q=80" : item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      )}
                      <span className="absolute top-2 left-2 bg-black/75 text-white text-[9px] font-bold px-2 py-0.5 rounded capitalize">
                        {item.type}
                      </span>
                    </div>

                    <h3 className="font-heading font-bold text-sm text-gray-900 leading-snug">
                      {showAsSwapped ? box.eggFreeVersion.extraLegumeName : item.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">
                      {showAsSwapped ? "+80g extra portion" : `${item.grams}g weighed`}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="font-heading font-black text-emerald-700">
                      {showAsSwapped ? "~6g P" : `${item.protein}g P`}
                    </span>
                    <span className="text-gray-400 font-medium">
                      {showAsSwapped ? "~120 kcal" : `${item.calories} kcal`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Benefits & Allergens Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nutrition Benefits */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs">
            <h3 className="font-heading font-black text-lg text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>Targeted Physiological Benefits</span>
            </h3>
            <div className="space-y-3">
              {box.benefits.map((b, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-gray-700">
                  <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span>{b}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Allergens & Free-From */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs">
            <h3 className="font-heading font-black text-lg text-gray-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span>Allergens & Dietary Transparency</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-gray-500 block mb-1 font-semibold">Declared Allergens:</span>
                <div className="flex flex-wrap gap-1.5">
                  {box.allergens.map((all) => (
                    <span key={all} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-xl font-bold">
                      {all}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <span className="text-gray-500 block mb-1 font-semibold">Clean Safety Verification:</span>
                <div className="flex flex-wrap gap-1.5">
                  {box.freeFrom.map((tag) => (
                    <span key={tag} className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-xl font-bold">
                      ✓ {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Suggested Add-Ons (Sides & Drinks) */}
        <div className="space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary-light px-3 py-1 rounded-full">
              Recommended Pairings
            </span>
            <h2 className="font-heading font-black text-2xl text-gray-900 mt-2">
              Suggested Sides & Cold-Pressed Juices
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Need more protein or natural vitamins? Add these freshly prepared items to your {box.day} delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {suggestedSides.map((side) => (
              <div
                key={side.id}
                className="bg-white rounded-3xl p-4 border border-gray-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-32 rounded-xl overflow-hidden mb-3 bg-gray-100">
                    <Image
                      src={side.image}
                      alt={side.name}
                      fill
                      className="object-cover"
                    />
                    <span className="absolute bottom-2 right-2 bg-black/75 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      +{side.protein}g Protein
                    </span>
                  </div>
                  <h4 className="font-heading font-bold text-xs text-gray-900">{side.name}</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{side.description}</p>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="font-bold text-xs text-gray-900">{formatCurrency(side.price)}</span>
                  <button
                    onClick={() => {
                      toggleSideForDay(box.day, side.id);
                      router.push(`/build-plan?day=${box.day}`);
                    }}
                    className="text-primary font-bold text-xs hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Side</span>
                  </button>
                </div>
              </div>
            ))}

            {suggestedAddons.map((addon) => (
              <div
                key={addon.id}
                className="bg-white rounded-3xl p-4 border border-gray-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-32 rounded-xl overflow-hidden mb-3 bg-gray-100">
                    <Image
                      src={addon.image}
                      alt={addon.name}
                      fill
                      className="object-cover"
                    />
                    <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                      {addon.volume}
                    </span>
                  </div>
                  <h4 className="font-heading font-bold text-xs text-gray-900">{addon.name}</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{addon.description}</p>
                  <p className="text-[10px] text-amber-800 bg-amber-50 rounded px-1.5 py-0.5 mt-1">
                    {addon.sugar}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="font-bold text-xs text-gray-900">{formatCurrency(addon.price)}</span>
                  <Link
                    href={`/build-plan?day=${box.day}&addDrink=${addon.id}`}
                    className="text-primary font-bold text-xs hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Drink</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 py-3.5 px-4 sm:px-6 z-40 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block">{box.day} Box</span>
              <div className="flex items-baseline gap-2">
                <span className="font-heading font-black text-xl text-gray-900">
                  {formatCurrency(box.price)}
                </span>
                <span className="text-xs font-bold text-emerald-700">
                  ~{currentMacros.protein}g Protein
                </span>
              </div>
            </div>
            <div className="hidden sm:block text-xs text-gray-500 border-l border-gray-200 pl-4">
              <span>Includes 5 items • 9 PM night-before cutoff</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAddToPlan}
              className="bg-cta hover:bg-cta-hover text-white font-black text-xs sm:text-sm py-3 px-6 sm:px-8 rounded-2xl shadow-lg shadow-cta/25 hover:shadow-xl tap-active flex items-center gap-2"
            >
              <span>Add {box.day} To My Week</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
