'use client';

import { useMenuVersion } from '@/components/providers/CatalogProvider';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { CurvedBoxCard } from '@/components/ui/CurvedBoxCard';
import { getMenuForDate, formatDateToYMD, DietType } from '@/lib/menu-engine';
import { cn } from '@/lib/utils';
import addonsData from '@/data/addons.json';

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

  const dayAbbrs: Array<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat'> = [
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
  ];

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

export default function MenuBrowserPage() {
  const menuVersion = useMenuVersion();
  const [diet, setDiet] = useState<DietType>('non-veg');
  const operatingDays = useMemo(() => getWeeklyOperatingDays(), []);
  const todayStr = useMemo(() => formatDateToYMD(new Date()), []);

  return (
    <div className="min-h-screen bg-paper text-ink pt-6 sm:pt-10 pb-24 selection:bg-accent/30 selection:text-ink">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Heading: Title on Left, Non-Veg/Veg Toggle on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 sm:mb-10">
          <div>
            <h1 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-ink tracking-tight">
              Six Dedicated Protein Boxes
            </h1>
            <p className="text-xs sm:text-sm text-ink/70 font-medium mt-1">
              Fresh 5-compartment chef rotation weighed to the gram on digital kitchen scales.
            </p>
          </div>

          {/* Non-Veg & Veg Pill Switcher */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <div className="inline-flex items-center p-1 rounded-full bg-white border border-ink/15 shadow-sm shadow-ink/5">
              {/* Non-Veg Button */}
              <button
                type="button"
                onClick={() => setDiet('non-veg')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all tap-active',
                  diet === 'non-veg'
                    ? 'bg-ink text-white shadow-xs'
                    : 'text-gray-500 hover:text-ink'
                )}
              >
                {/* Brown Triangle */}
                <span className="w-3.5 h-3.5 rounded-[3px] border border-[#7B3F00] bg-white flex items-center justify-center p-[2px]">
                  <span className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[6px] border-b-[#7B3F00] inline-block" />
                </span>
                <span>Non-Veg</span>
              </button>

              {/* Veg Button */}
              <button
                type="button"
                onClick={() => setDiet('veg')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all tap-active',
                  diet === 'veg'
                    ? 'bg-ink text-white shadow-xs'
                    : 'text-gray-500 hover:text-ink'
                )}
              >
                {/* Green Dot */}
                <span className="w-3.5 h-3.5 rounded-[3px] border border-emerald-600 bg-white flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                </span>
                <span>Pure Veg</span>
              </button>
            </div>
          </div>
        </div>

        {/* 6 Box Cards Grid (Mon to Sat) with Images, Items List & Macros */}
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

        {/* Natural Homemade Juices Strip */}
        <div className="mt-14 sm:mt-18 pt-10 border-t border-ink/10">
          <div className="mb-6 sm:mb-8">
            <h2 className="font-heading font-black text-2xl sm:text-3xl text-ink tracking-tight">
              Natural Homemade Juices
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {addonsData.map((juice) => (
              <div
                key={juice.id}
                className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-ink/10 shadow-sm shadow-ink/5 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="relative aspect-square w-full rounded-xl sm:rounded-2xl overflow-hidden mb-3 bg-gray-100">
                  <Image
                    src={juice.image}
                    alt={juice.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <h3 className="font-heading font-bold text-xs sm:text-sm text-ink truncate">
                    {juice.name}
                  </h3>
                  <span className="font-heading font-black text-xs sm:text-sm text-ink shrink-0">
                    ₹{juice.price}
                  </span>
                </div>
              </div>
            ))}
          </div>
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
              Subscribe to the Weekly Plan with our hassle-free Skip-a-Day policy. Discounted to ₹
              {diet === 'non-veg' ? 279 : 259}/day.
            </p>
          </div>

          <Link
            href="/weekly"
            className="shrink-0 bg-cta hover:bg-cta-hover text-white font-bold text-sm py-3.5 px-6 rounded-2xl shadow-lg shadow-cta/25 hover:scale-105 transition-all tap-active flex items-center gap-2"
          >
            <span>Explore Weekly Plan</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
