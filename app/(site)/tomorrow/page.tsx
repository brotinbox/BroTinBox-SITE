'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { DailyTrialStepModal } from '@/components/trial/DailyTrialStepModal';

export default function TomorrowMenuPage() {
  return (
    <main className="min-h-[calc(100vh-70px)] bg-[#F5F8EC]/40 flex flex-col justify-between py-2 sm:py-10 px-2 sm:px-6">
      {/* Centered Step-by-Step Booking Modal */}
      <section className="flex-1 flex items-start sm:items-center justify-center sm:my-auto w-full">
        <DailyTrialStepModal />
      </section>

      {/* Minimal Micro Footer - visible on tablet and desktop */}
      <footer className="hidden sm:block max-w-2xl w-full mx-auto pt-6 pb-2 text-center">
        <div className="flex items-center justify-center gap-4 text-[11px] text-[#124233]/70 font-medium flex-wrap">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Digital Kitchen Scale Weighed</span>
          </span>
          <span>•</span>
          <span>Zero Food Waste Kitchen</span>
          <span>•</span>
          <span>Coimbatore Doorstep Delivery</span>
        </div>
      </footer>
    </main>
  );
}
