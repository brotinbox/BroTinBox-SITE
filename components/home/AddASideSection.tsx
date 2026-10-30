'use client';

import React from 'react';
import Link from 'next/link';
import { SideBox } from '@/types';
import { ArrowRight } from 'lucide-react';
import { CurvedSideCard } from '@/components/ui/CurvedSideCard';

interface AddASideSectionProps {
  sides: SideBox[];
}

export function AddASideSection({ sides }: AddASideSectionProps) {
  return (
    <section className="py-8 sm:py-20 bg-white border-t border-gray-100 text-gray-900 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-5 sm:mb-12 gap-2 sm:gap-4">
          <div>
            <h2 className="font-heading font-black text-lg sm:text-4xl text-gray-900 tracking-tight">
              Add a Side
            </h2>
            <p className="text-gray-500 text-[11px] sm:text-sm mt-0.5">
              Extra chicken or paneer to boost your protein.
            </p>
          </div>

          <Link
            href="/menu"
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1 self-start md:self-auto"
          >
            <span>View All Extras</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex md:grid overflow-x-auto md:overflow-visible snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 pb-2 [scrollbar-width:none] md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-7">
          {sides.map((side) => (
            <div key={side.id} className="shrink-0 w-[150px] md:w-auto snap-start">
              <CurvedSideCard side={side} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
