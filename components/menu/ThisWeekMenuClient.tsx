'use client';

import { AddToCartButton } from '@/components/checkout/AddToCartButton';
import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Box, DayOfWeek, SideBox, AddonDrink, ScheduleItem } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { getTodayDayOfWeek } from '@/lib/api/boxes';
import {
  Sparkles,
  Flame,
  Dumbbell,
  Clock,
  ArrowRight,
  ShieldCheck,
  Check,
  Info,
  Calendar,
  Layers,
  Leaf,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface ThisWeekMenuClientProps {
  boxes: Box[];
  schedule: ScheduleItem[];
  sides: SideBox[];
  addons: AddonDrink[];
}

const ALL_DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ThisWeekMenuClient({
  boxes,
  schedule,
  sides,
  addons,
}: ThisWeekMenuClientProps) {
  const today = getTodayDayOfWeek();
  const [activeTab, setActiveTab] = useState<DayOfWeek | 'extras'>(today);
  const { toggleDay, selectedDays, toggleDrinkForDay, dayConfigs } = useAppStore();

  const currentBox = boxes.find((b) => b.day === activeTab);

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Top Banner */}
      <section className="bg-gradient-to-b from-white to-background border-b border-gray-200 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary font-bold text-xs px-3.5 py-1.5 rounded-full mb-3">
            <Calendar className="w-4 h-4" />
            <span>This Week’s Daily Fixed Rotation • Sunday Kitchen Off</span>
          </div>
          <h1 className="font-heading font-black text-3xl sm:text-5xl text-gray-900 tracking-tight">
            One Fresh Box Cooked Per Day
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm max-w-2xl mx-auto mt-2.5">
            Zero food waste, zero stale batches. Every morning our kitchen cooks precisely one measured box in bulk. Cutoff is 9:00 PM the night before.
          </p>

          {/* Operational Policy Pills */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-semibold text-gray-600">
            <span className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1 rounded-xl shadow-xs">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>9:00 PM Night-Before Cutoff</span>
            </span>
            <span className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1 rounded-xl shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Lab Verification Pending</span>
            </span>
            <span className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1 rounded-xl shadow-xs">
              <Leaf className="w-3.5 h-3.5 text-emerald-600" />
              <span>Egg-Free Swap Available</span>
            </span>
          </div>

          {/* Day Navigation Tabs */}
          <div className="mt-8 flex items-center justify-center">
            <div className="inline-flex p-1.5 bg-gray-100/90 rounded-2xl border border-gray-200 shadow-inner overflow-x-auto max-w-full">
              {ALL_DAYS.map((day) => {
                const isToday = day === today;
                const isActive = activeTab === day;
                const sched = schedule.find((s) => s.day === day);

                return (
                  <button
                    key={day}
                    onClick={() => setActiveTab(day)}
                    className={cn(
                      "px-3 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition-all relative flex flex-col items-center shrink-0",
                      isActive
                        ? "bg-white text-gray-950 shadow-md ring-1 ring-gray-200/80"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{day}</span>
                      {isToday && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </div>
                    <span className="text-[10px] font-normal text-gray-400 hidden sm:inline">
                      {sched?.protein}g P
                    </span>
                  </button>
                );
              })}

              <button
                onClick={() => setActiveTab('extras')}
                className={cn(
                  "px-4 sm:px-6 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
                  activeTab === 'extras'
                    ? "bg-primary text-white shadow-md"
                    : "text-primary hover:text-primary-dark"
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Extras (Sides & Juices)</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Tab Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {activeTab !== 'extras' && currentBox && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Box Hero Card */}
            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-card hover:shadow-card-hover transition-all">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                {/* Image Section */}
                <div className="lg:col-span-6 relative min-h-[300px] sm:min-h-[400px]">
                  <Image
                    src={currentBox.image}
                    alt={currentBox.name}
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent lg:hidden" />

                  {/* Day Badge */}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                    <span className="bg-primary text-lime-brand font-black text-xs uppercase px-3 py-1 rounded-full shadow-md">
                      {currentBox.day} Menu
                    </span>
                    {currentBox.day === today && (
                      <span className="bg-emerald-600 text-white font-extrabold text-xs px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        <span>Cooking Today</span>
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 lg:hidden text-white">
                    <h2 className="font-heading font-black text-2xl">{currentBox.name}</h2>
                    <p className="text-xs text-gray-200 mt-1 line-clamp-2">{currentBox.description}</p>
                  </div>
                </div>

                {/* Box Meta & Details */}
                <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between">
                  <div>
                    <div className="hidden lg:block">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "w-2.5 h-2.5 rounded-full",
                          currentBox.isVeg ? "bg-emerald-600" : "bg-rose-600"
                        )} />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          {currentBox.isVeg ? 'Vegetarian' : 'Non-Vegetarian'} • Fixed Cook Day
                        </span>
                      </div>
                      <h2 className="font-heading font-black text-2xl sm:text-3xl text-gray-900 mt-1">
                        {currentBox.name}
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
                        {currentBox.description}
                      </p>
                    </div>

                    {/* Macro Tiles Grid */}
                    <div className="grid grid-cols-4 gap-2 mt-6 p-3 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                      <div className="p-2 bg-white rounded-xl shadow-xs">
                        <span className="text-[10px] font-bold uppercase text-gray-400 block">Calories</span>
                        <span className="font-heading font-black text-lg text-gray-950">~{currentBox.totals.calories}</span>
                        <span className="text-[9px] text-gray-400 block">kcal</span>
                      </div>
                      <div className="p-2 bg-white rounded-xl shadow-xs ring-1 ring-emerald-500/20">
                        <span className="text-[10px] font-bold uppercase text-emerald-700 block">Protein</span>
                        <span className="font-heading font-black text-lg text-emerald-700">~{currentBox.totals.protein}g</span>
                        <span className="text-[9px] text-emerald-600 block">primary</span>
                      </div>
                      <div className="p-2 bg-white rounded-xl shadow-xs">
                        <span className="text-[10px] font-bold uppercase text-gray-400 block">Carbs</span>
                        <span className="font-heading font-black text-lg text-gray-800">{currentBox.totals.carbs}g</span>
                        <span className="text-[9px] text-gray-400 block">clean</span>
                      </div>
                      <div className="p-2 bg-white rounded-xl shadow-xs">
                        <span className="text-[10px] font-bold uppercase text-gray-400 block">Fats</span>
                        <span className="font-heading font-black text-lg text-gray-800">{currentBox.totals.fat}g</span>
                        <span className="text-[9px] text-gray-400 block">healthy</span>
                      </div>
                    </div>

                    {/* Lab verification disclaimer badge */}
                    <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-1.5 mt-3 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span>{currentBox.labVerifiedNote}</span>
                    </p>

                    {/* Allergens & Free-From */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {currentBox.freeFrom.map((tag) => (
                        <span key={tag} className="text-[10px] font-bold bg-primary-light/60 text-primary-dark px-2.5 py-0.5 rounded-full">
                          ✓ {tag}
                        </span>
                      ))}
                      {currentBox.allergens.map((all) => (
                        <span key={all} className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          Contains: {all}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Pricing and Action */}
                  <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-heading font-black text-3xl text-gray-950">
                          {formatCurrency(currentBox.price)}
                        </span>
                        <span className="text-xs text-gray-400 line-through">
                          {formatCurrency(currentBox.price + 50)} one-off
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-700 font-semibold">
                        Includes 2 boiled eggs • Swap for extra legumes anytime
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        href={`/box/${currentBox.slug}`}
                        className="py-3 px-5 rounded-xl border border-gray-300 font-bold text-xs text-gray-700 hover:bg-gray-50 tap-active"
                      >
                        Item Breakdown
                      </Link>
                      <Link
                        href={`/build-plan?day=${currentBox.day}`}
                        className="bg-cta hover:bg-cta-hover text-white font-black text-xs py-3 px-6 rounded-xl shadow-cta/25 hover:shadow-md tap-active flex items-center gap-1.5"
                      >
                        <span>Add To My Week</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5-Item Bento Breakdown Strip */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-heading font-black text-lg text-gray-900">
                    What’s Inside the {currentBox.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Five separated compartments. Weighed precisely before and after batch cooking.
                  </p>
                </div>
                <Link
                  href={`/box/${currentBox.slug}`}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <span>Detailed Nutrition</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {currentBox.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl p-3 border border-gray-200/90 shadow-xs flex flex-col justify-between"
                  >
                    <div className="relative h-24 rounded-xl overflow-hidden mb-2 bg-gray-100">
                      {item.image && (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      )}
                      <span className="absolute bottom-1.5 left-1.5 bg-black/75 text-white text-[9px] font-bold px-1.5 py-0.5 rounded capitalize">
                        {item.type}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-heading font-bold text-xs text-gray-900 leading-snug">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
                        {item.grams}g portion
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                      <span className="font-bold text-emerald-700">{item.protein}g P</span>
                      <span className="text-gray-400 font-medium">{item.calories} kcal</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Egg-Free Version Callout */}
            <div className="bg-emerald-50/60 rounded-3xl p-5 border border-emerald-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-heading font-bold text-sm text-gray-900">
                      Egg-Free / Pure Vegetarian Swap
                    </h4>
                    <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase">
                      Zero Extra Charge
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {currentBox.eggFreeVersion.description}. Delivers ~{currentBox.eggFreeVersion.protein}g protein & ~{currentBox.eggFreeVersion.calories} kcal.
                  </p>
                </div>
              </div>

              <Link
                href={`/build-plan?day=${currentBox.day}&eggFree=true`}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shrink-0 text-center"
              >
                Select Egg-Free Version
              </Link>
            </div>
          </div>
        )}

        {/* Extras Tab: Sides & Cold-Pressed Drinks */}
        {activeTab === 'extras' && (
          <div className="space-y-12 animate-in fade-in duration-200">
            {/* Sides Section */}
            <div>
              <div className="mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary-light px-3 py-1 rounded-full">
                  High-Protein Additions
                </span>
                <h2 className="font-heading font-black text-2xl sm:text-3xl text-gray-900 mt-2">
                  Side Boxes (Protein Boosters & Post-Workout Fuel)
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-2xl">
                  Ideal for hitting 90g–140g daily protein targets. Add to any day’s box or order as a light post-workout meal.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sides.map((side) => (
                  <div
                    key={side.id}
                    className="bg-white rounded-3xl p-5 border border-gray-200/90 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-44 rounded-2xl overflow-hidden mb-4 bg-gray-100">
                        <Image
                          src={side.image}
                          alt={side.name}
                          fill
                          className="object-cover"
                        />
                        <span className={cn(
                          "absolute top-3 left-3 text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-md text-white",
                          side.isVeg ? "bg-emerald-600" : "bg-rose-600"
                        )}>
                          {side.isVeg ? 'Veg' : 'Non-Veg'}
                        </span>
                        <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-xs text-white text-xs font-bold px-2.5 py-1 rounded-xl">
                          {side.protein}g Protein
                        </div>
                      </div>

                      <h3 className="font-heading font-black text-base text-gray-900">
                        {side.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        {side.description}
                      </p>

                      <div className="mt-3 flex items-center gap-3 text-xs">
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {side.protein}g Protein
                        </span>
                        <span className="text-gray-500">
                          {side.calories} kcal
                        </span>
                        <span className="text-gray-400">
                          {side.carbs}g C • {side.fat}g F
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="font-heading font-black text-xl text-gray-900">
                        {formatCurrency(side.price)}
                      </span>
                      <AddToCartButton item={side} type="side" label="Add to cart" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cold-Pressed Drinks Section */}
            <div>
              <div className="mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                  100% Raw & Cold-Pressed
                </span>
                <h2 className="font-heading font-black text-2xl sm:text-3xl text-gray-900 mt-2">
                  Daily Fresh Juices (250 ml, Zero Added Sugar)
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-2xl">
                  Pressed fresh every morning at 5:00 AM. Unpasteurized and free from chemical preservatives. We disclose naturally occurring vegetable & fruit sugars per glass.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {addons.map((drink) => (
                  <div
                    key={drink.id}
                    className="bg-white rounded-3xl p-5 border border-gray-200/90 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-44 rounded-2xl overflow-hidden mb-4 bg-gray-100">
                        <Image
                          src={drink.image}
                          alt={drink.name}
                          fill
                          className="object-cover"
                        />
                        <span className="absolute top-3 left-3 bg-emerald-600 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-md">
                          {drink.volume}
                        </span>
                      </div>

                      <h3 className="font-heading font-bold text-base text-gray-900">
                        {drink.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        {drink.description}
                      </p>

                      {/* Sugar Transparency Badge */}
                      <div className="mt-3 p-2 bg-amber-50/70 border border-amber-200/60 rounded-xl text-[11px] text-amber-900 font-medium">
                        <strong>Natural Sugar:</strong> {drink.sugar}
                      </div>

                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                        <span>{drink.calories} kcal</span>
                        <span>•</span>
                        <span>{drink.protein}g Protein</span>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="font-heading font-black text-xl text-gray-900">
                        {formatCurrency(drink.price)}
                      </span>
                      <AddToCartButton item={drink} type="drink" label="Add to cart" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
