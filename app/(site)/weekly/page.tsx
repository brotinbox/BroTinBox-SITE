'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { WeeklyPlanStepModal } from '@/components/weekly/WeeklyPlanStepModal';

export default function WeeklyPlanPage() {
  return (
    <main className="min-h-[calc(100vh-70px)] bg-[#F5F8EC]/40 flex flex-col justify-between py-2 sm:py-10 px-2 sm:px-6">
      {/* Centered Step-by-Step Weekly Booking Modal */}
      <section className="flex-1 flex items-start sm:items-center justify-center sm:my-auto w-full">
        <WeeklyPlanStepModal />
      </section>

      {/* Minimal Micro Footer - visible on tablet and desktop */}
      <footer className="hidden sm:block max-w-2xl w-full mx-auto pt-6 pb-2 text-center">
        <div className="flex items-center justify-center gap-4 text-[11px] text-[#124233]/70 font-medium flex-wrap">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Skip-Any-Day Policy</span>
          </span>
          <span>•</span>
          <span>Digital Kitchen Weighed Macros</span>
          <span>•</span>
          <span>Thermal Bag Doorstep Delivery</span>
        </div>
      </footer>
    </main>
  );
}
