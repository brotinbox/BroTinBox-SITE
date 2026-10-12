'use client';

import { useMenuVersion } from '@/components/providers/CatalogProvider';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Box, ScheduleItem } from '@/types';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { CurvedBoxCard } from '@/components/ui/CurvedBoxCard';
import { getMenuForDate, formatDateToYMD, DietType } from '@/lib/menu-engine';
import { cn } from '@/lib/utils';

interface WeeklyCalendarStripProps {
  boxes?: Box[];
  schedule?: ScheduleItem[];
}

function getWeeklyOperatingDays(): Array<{
  date: Date;
  dateStr: string;
  dayOfWeek: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
  dayName: string;
  formatted: string;
}> {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat

  // Monday of the active week cycle (if Sunday, look forward to tomorrow Monday)
  const monday = new Date(now);
  if (day === 0) {
    monday.setDate(now.getDate() + 1);
  } else {
    monday.setDate(now.getDate() - (day - 1));
  }
  monday.setHours(12, 0, 0, 0);

  const days: Array<{
    date: Date;
    dateStr: string;
    dayOfWeek: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
    dayName: string;
    formatted: string;
  }> = [];

  const dayAbbrs: Array<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat'> = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 0; i < 6; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    days.push({
      date: cur,
      dateStr: formatDateToYMD(cur),
      dayOfWeek: dayAbbrs[i],
      dayName: cur.toLocaleDateString('en-IN', { weekday: 'long' }),
      formatted: cur.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    });
  }

  return days;
}

export function WeeklyCalendarStrip({ boxes, schedule }: WeeklyCalendarStripProps) {
  const menuVersion = useMenuVersion();
  const [diet, setDiet] = useState<DietType>('non-veg');
  const operatingDays = useMemo(() => getWeeklyOperatingDays(), []);
  const todayStr = useMemo(() => formatDateToYMD(new Date()), []);

  return (
    <section className="py-14 sm:py-18 bg-background relative overflow-hidden text-gray-900 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Heading: Title on Left, Non-Veg/Veg Toggle on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 sm:mb-10">
          <div>
            <h2 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-ink tracking-tight">
              Six Dedicated Protein Boxes
            </h2>
            <p className="text-xs sm:text-sm text-ink/70 font-medium mt-1">
              Fresh 5-compartment chef rotation weighed to the gram on digital kitchen scales.
            </p>
          </div>

          {/* Non-Veg & Pure Veg Pill Switcher with crisp SVG FSSAI symbols */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <div className="p-1 sm:p-1.5 bg-white rounded-full border border-ink/15 shadow-sm inline-flex items-center gap-1">
              {/* Non-Veg Button */}
              <button
                type="button"
                onClick={() => setDiet('non-veg')}
                className={cn(
                  'flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all tap-active whitespace-nowrap',
                  diet === 'non-veg'
                    ? 'bg-ink text-white shadow-xs'
                    : 'text-gray-600 hover:text-ink'
                )}
              >
                {/* Indian FSSAI Non-Veg Symbol with solid Brown Triangle */}
                <svg viewBox="0 0 16 16" className="w-4 h-4 shrink-0" fill="none" aria-hidden="true">
                  <rect x="0.75" y="0.75" width="14.5" height="14.5" rx="3.5" fill="#FFFFFF" stroke="#7B3F00" strokeWidth="1.5" />
                  <polygon points="8,3.2 12.8,11.8 3.2,11.8" fill="#7B3F00" />
                </svg>
                <span>Non-Veg</span>
              </button>

              {/* Veg Button */}
              <button
                type="button"
                onClick={() => setDiet('veg')}
                className={cn(
                  'flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all tap-active whitespace-nowrap',
                  diet === 'veg'
                    ? 'bg-ink text-white shadow-xs'
                    : 'text-gray-600 hover:text-ink'
                )}
              >
                {/* Indian FSSAI Pure Veg Symbol with solid Green Circle */}
                <svg viewBox="0 0 16 16" className="w-4 h-4 shrink-0" fill="none" aria-hidden="true">
                  <rect x="0.75" y="0.75" width="14.5" height="14.5" rx="3.5" fill="#FFFFFF" stroke="#16A34A" strokeWidth="1.5" />
                  <circle cx="8" cy="8" r="3.75" fill="#16A34A" />
                </svg>
                <span>Pure Veg</span>
              </button>
            </div>
          </div>
        </div>

        {/* 6 Box Cards Grid (Mon to Sat) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {operatingDays.map((day) => {
            const menu = getMenuForDate(day.date, diet);
            const isToday = day.dateStr === todayStr;

            return (
              <CurvedBoxCard
                key={`${day.dateStr}-${diet}`}
                menu={menu}
                dayInfo={day}
                diet={diet}
                isToday={isToday}
              />
            );
          })}
        </div>

        {/* Bottom Banner Linking to Weekly Subscription Plan */}
        <div className="mt-12 sm:mt-16 bg-gradient-to-r from-ink to-ink-soft rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-accent-bright text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Full 6-Day Routine • Mon to Sat</span>
            </div>
            <h3 className="font-heading font-black text-xl sm:text-2xl text-white">
              Want the entire week handled without ordering daily?
            </h3>
            <p className="text-gray-200 text-xs sm:text-sm">
              Subscribe to the Weekly Plan with our hassle-free Skip-a-Day policy. Discounted to ₹{diet === 'non-veg' ? 289 : 259}/meal.
            </p>
          </div>

          <Link
            href="/weekly"
            className="shrink-0 bg-cta hover:bg-cta-hover text-white font-bold text-sm py-3 px-6 rounded-2xl shadow-lg shadow-cta/25 hover:scale-105 transition-all tap-active flex items-center gap-2"
          >
            <span>Explore Weekly Plan</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
