'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { SideBox } from '@/types';
import { Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface CurvedSideCardProps {
  side: SideBox;
}

export function CurvedSideCard({ side }: CurvedSideCardProps) {
  const CARD_BG = '#ffffff';

  return (
    <div className="h-full rounded-[24px] sm:rounded-[32px] p-2 sm:p-5 flex flex-col justify-between group relative overflow-hidden transition-all duration-300 bg-white border border-gray-200/90 hover:border-gray-300 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.08)]">
      <div>
        {/* Top Image Container with 21st.dev Style Inverted Curved Corner Cutout */}
        <div className="relative aspect-square sm:aspect-[16/11] w-full rounded-[18px] sm:rounded-[24px] overflow-hidden bg-gray-100">
          <Image
            src={side.image}
            alt={side.name}
            fill
            sizes="(max-width: 768px) 150px, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

          {/* Signature Inverted Curved Cutout (Bottom-Right Scoop Nook) in Pure White */}
          <div
            className="absolute bottom-0 right-0 z-20 w-[68px] h-[68px] rounded-tl-[24px] flex items-center justify-center pointer-events-auto"
            style={{ backgroundColor: CARD_BG }}
          >
            {/* Top concave curved connector */}
            <svg
              className="absolute right-0 pointer-events-none"
              style={{ bottom: '67px', width: '22px', height: '22px', color: CARD_BG }}
              viewBox="0 0 22 22"
              fill="currentColor"
            >
              <path d="M22 0 C22 12.15 12.15 22 0 22 H22 V0 Z" />
            </svg>

            {/* Left concave curved connector */}
            <svg
              className="absolute bottom-0 pointer-events-none"
              style={{ right: '67px', width: '22px', height: '22px', color: CARD_BG }}
              viewBox="0 0 22 22"
              fill="currentColor"
            >
              <path d="M0 22 C12.15 22 22 12.15 22 0 V22 H0 Z" />
            </svg>

            {/* Circular Add Action Button */}
            <Link
              href={`/build-plan?addSide=${side.id}`}
              className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-primary hover:text-white hover:scale-110 active:scale-95 transition-all duration-300 shadow-md group/btn"
              aria-label={`Add ${side.name} to plan`}
            >
              <Plus className="w-5 h-5 group-hover/btn:rotate-90 transition-transform stroke-[2.5]" />
            </Link>
          </div>
        </div>

        {/* Content Section */}
        <div className="pt-2 sm:pt-3">
          <h3 className="font-heading font-black text-xs sm:text-xl text-gray-900 group-hover:text-primary transition-colors tracking-tight line-clamp-1">
            {side.name}
          </h3>

        </div>
      </div>

      {/* Card Footer: Price & Direct Add Action */}
      <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
        <div>
          <span className="font-heading font-black text-sm sm:text-xl text-gray-900">
            {formatCurrency(side.price)}
          </span>
        </div>

        <Link
          href={`/build-plan?addSide=${side.id}`}
          className="bg-primary hover:bg-primary-hover text-white text-[11px] sm:text-xs font-bold py-1.5 sm:py-2 px-2.5 sm:px-4 rounded-xl shadow-md hover:scale-105 transition-all tap-active flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </Link>
      </div>
    </div>
  );
}
