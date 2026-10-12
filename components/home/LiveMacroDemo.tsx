'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import boxesData from '@/data/boxes.json';
import { Box } from '@/types';
import { Scale, Flame, Dumbbell, Wheat, Droplets, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LiveMacroDemo() {
  const boxes = boxesData as Box[];
  const [activeBoxIndex, setActiveBoxIndex] = useState(0);
  const activeBox = boxes[activeBoxIndex] || boxes[0];

  // Animated counting numbers
  const [displayedCals, setDisplayedCals] = useState(0);
  const [displayedProtein, setDisplayedProtein] = useState(0);
  const [displayedCarbs, setDisplayedCarbs] = useState(0);
  const [displayedFat, setDisplayedFat] = useState(0);

  useEffect(() => {
    const duration = 500;
    const steps = 18;
    const intervalTime = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      setDisplayedCals(Math.round(activeBox.totals.calories * progress));
      setDisplayedProtein(Math.round(activeBox.totals.protein * progress));
      setDisplayedCarbs(Math.round(activeBox.totals.carbs * progress));
      setDisplayedFat(Math.round(activeBox.totals.fat * progress));

      if (step >= steps) {
        clearInterval(timer);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [activeBoxIndex, activeBox]);

  return (
    <section className="py-12 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-primary-dark via-primary to-ink-deep rounded-3xl p-6 sm:p-10 text-white shadow-2xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-lime-brand/10 blur-3xl pointer-events-none" />

          <div className="max-w-2xl mb-8">
            <div className="flex items-center gap-2 text-lime-brand text-xs font-bold uppercase tracking-wider mb-2">
              <Scale className="w-4 h-4" />
              <span>Digital Kitchen Scale Calibration</span>
            </div>
            <h2 className="font-heading font-black text-2xl sm:text-3xl text-white">
              Every box weighed to the gram before dispatch
            </h2>
            <p className="text-gray-300 text-xs sm:text-sm mt-1">
              Select any of our 6 scheduled rotation boxes to view its real pre-cook ingredient weights and calibrated macro profile.
            </p>
          </div>

          {/* Interactive Day Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {boxes.map((b, idx) => (
              <button
                key={b.id}
                onClick={() => setActiveBoxIndex(idx)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all tap-active flex items-center gap-2",
                  activeBoxIndex === idx
                    ? "bg-lime-brand text-primary-dark shadow-md"
                    : "bg-white/10 text-white hover:bg-white/20"
                )}
              >
                <span>{b.day}: {b.name.split(' ')[0]}</span>
                <span className="text-[10px] opacity-75 font-semibold">({b.totals.protein}g P)</span>
              </button>
            ))}
          </div>

          {/* Scale Display Card */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-black/35 backdrop-blur-md rounded-2xl p-5 border border-white/10">
            {/* Box Image Thumbnail & Description */}
            <div className="md:col-span-4 flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 border-2 border-white/20">
                <Image
                  src={activeBox.image}
                  alt={activeBox.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase text-lime-brand tracking-wider">
                  {activeBox.day} Cook • ~{activeBox.totals.weightG}g Net Portion
                </p>
                <h4 className="font-heading font-extrabold text-base text-white leading-tight">
                  {activeBox.name}
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-gray-300 mt-1">
                  <CheckCircle className="w-3.5 h-3.5 text-lime-brand" />
                  <span>5 Compartments Weighed</span>
                </div>
              </div>
            </div>

            {/* Live Animated Counters */}
            <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Protein */}
              <div className="bg-emerald-950/80 border border-emerald-500/30 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-emerald-400 text-xs font-bold">
                  <Dumbbell className="w-3.5 h-3.5" />
                  <span>PROTEIN</span>
                </div>
                <div className="font-heading font-black text-3xl text-emerald-400 mt-1">
                  {displayedProtein}
                  <span className="text-xs font-medium text-emerald-300 ml-0.5">g</span>
                </div>
                <p className="text-[10px] text-emerald-200/70 mt-0.5">tested estimate</p>
              </div>

              {/* Calories */}
              <div className="bg-orange-950/80 border border-orange-500/30 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-orange-400 text-xs font-bold">
                  <Flame className="w-3.5 h-3.5" />
                  <span>CALORIES</span>
                </div>
                <div className="font-heading font-black text-3xl text-orange-400 mt-1">
                  {displayedCals}
                  <span className="text-xs font-medium text-orange-300 ml-0.5">kcal</span>
                </div>
                <p className="text-[10px] text-orange-200/70 mt-0.5">sustained energy</p>
              </div>

              {/* Carbs */}
              <div className="bg-amber-950/80 border border-amber-500/30 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-amber-400 text-xs font-bold">
                  <Wheat className="w-3.5 h-3.5" />
                  <span>CARBS</span>
                </div>
                <div className="font-heading font-black text-3xl text-amber-400 mt-1">
                  {displayedCarbs}
                  <span className="text-xs font-medium text-amber-300 ml-0.5">g</span>
                </div>
                <p className="text-[10px] text-amber-200/70 mt-0.5">millets & channa</p>
              </div>

              {/* Fat */}
              <div className="bg-purple-950/80 border border-purple-500/30 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-purple-400 text-xs font-bold">
                  <Droplets className="w-3.5 h-3.5" />
                  <span>FAT</span>
                </div>
                <div className="font-heading font-black text-3xl text-purple-400 mt-1">
                  {displayedFat}
                  <span className="text-xs font-medium text-purple-300 ml-0.5">g</span>
                </div>
                <p className="text-[10px] text-purple-200/70 mt-0.5">zero refined fats</p>
              </div>
            </div>
          </div>

          {/* 5-item Weighed Ingredients Strip */}
          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {activeBox.items.map((it, idx) => (
              <div key={idx} className="bg-white/5 rounded-xl p-2 border border-white/10">
                <span className="text-[9px] uppercase font-bold text-lime-brand block">{it.type}</span>
                <span className="font-bold text-white block truncate">{it.name}</span>
                <span className="text-[11px] text-gray-300">{it.grams}g • {it.protein}g P</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
