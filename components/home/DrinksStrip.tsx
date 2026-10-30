'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AddonDrink } from '@/types';
import { Plus, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface DrinksStripProps {
  addons: AddonDrink[];
}

export function DrinksStrip({ addons }: DrinksStripProps) {
  return (
    <section className="py-8 sm:py-16 bg-background border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-5 sm:mb-10 gap-2 sm:gap-4">
          <div>
            <h2 className="font-heading font-black text-lg sm:text-4xl text-gray-900 tracking-tight">
              Cold-Pressed Juices
            </h2>
            <p className="text-gray-500 text-[11px] sm:text-sm mt-0.5">
              Pressed fresh every morning, no added sugar.
            </p>
          </div>

          <Link
            href="/plans"
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1 self-start md:self-auto"
          >
            <span>See all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex md:grid overflow-x-auto md:overflow-visible snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 pb-2 [scrollbar-width:none] md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {addons.map((drink) => (
            <div
              key={drink.id}
              className="shrink-0 w-[150px] md:w-auto snap-start bg-white rounded-2xl sm:rounded-3xl p-2 sm:p-5 border border-gray-200/90 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative h-24 sm:h-52 rounded-2xl overflow-hidden mb-2 sm:mb-4 bg-gray-50">
                  <Image
                    src={drink.image}
                    alt={drink.name}
                    fill
                    sizes="(max-width: 768px) 150px, (max-width: 1024px) 50vw, 33vw"
                    className="object-contain p-3"
                  />
                </div>

                <h3 className="font-heading font-bold text-xs sm:text-base text-gray-900 line-clamp-1">
                  {drink.name}
                </h3>
              </div>

              <div className="mt-2 sm:mt-5 pt-2 sm:pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                <span className="font-heading font-black text-sm sm:text-xl text-gray-900">
                  {formatCurrency(drink.price)}
                </span>
                <Link
                  href={`/build-plan?addDrink=${drink.id}`}
                  className="bg-primary hover:bg-primary-hover text-white font-bold text-[11px] sm:text-xs py-1.5 sm:py-2 px-2.5 sm:px-4 rounded-xl tap-active flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add Drink</span><span className="sm:hidden">Add</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
