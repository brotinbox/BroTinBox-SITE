'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AddonDrink } from '@/types';
import { GlassWater, Plus, Sparkles, ArrowRight, ShieldCheck, Heart } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface DrinksStripProps {
  addons: AddonDrink[];
}

export function DrinksStrip({ addons }: DrinksStripProps) {
  return (
    <section className="py-16 bg-background border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-ink font-extrabold text-xs uppercase tracking-wider mb-2">
              <GlassWater className="w-4 h-4" />
              <span>100% Cold-Pressed • Zero Refined Sugar</span>
            </div>
            <h2 className="font-heading font-black text-3xl sm:text-4xl text-gray-900 tracking-tight">
              Fresh Daily Cold-Pressed Juices (250 ml)
            </h2>
            <p className="text-gray-600 text-xs sm:text-sm mt-2 max-w-xl leading-relaxed">
              Unpasteurized local vegetable and citrus elixirs pressed fresh every morning at 5:00 AM. We transparently disclose natural vegetable and fruit sugars per glass.
            </p>
          </div>

          <Link
            href="/plans"
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1 self-start md:self-auto"
          >
            <span>Weekly Juice Bundle (₹299/wk)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {addons.map((drink) => (
            <div
              key={drink.id}
              className="bg-white rounded-3xl p-5 border border-gray-200/90 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative h-52 rounded-2xl overflow-hidden mb-4 bg-gray-50">
                  <Image
                    src={drink.image}
                    alt={drink.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-contain p-3"
                  />
                  <span className="absolute top-3 left-3 bg-ink text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-md">
                    {drink.volume}
                  </span>
                </div>

                <h3 className="font-heading font-bold text-base text-gray-900">
                  {drink.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {drink.description}
                </p>

                {/* Natural Sugar Transparency Callout */}
                <div className="mt-3 p-2 bg-amber-50/80 border border-amber-200/70 rounded-xl text-[11px] text-amber-900 font-medium">
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
                <Link
                  href={`/build-plan?addDrink=${drink.id}`}
                  className="bg-primary hover:bg-primary-hover text-white font-bold text-xs py-2 px-4 rounded-xl tap-active flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Drink</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
