'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useMenuVersion, usePricing } from '@/components/providers/CatalogProvider';
import { getMenuForDate, getNextBookableDays, formatDateToYMD, type DietType } from '@/lib/menu-engine';
import { boxView } from '@/lib/lite-box';
import { g1 } from '@/lib/meal-display';
import { cn } from '@/lib/utils';
import { BoxPhoto, hasBoxPhoto } from '@/components/ui/BoxPhoto';
import { DietMark } from '@/components/trial/DietMark';
import { getWeeklyOperatingDays } from '@/components/home/WeeklyCalendarStrip';

/**
 * Home page: the Lite box for each day this week, drawn from that day's dishes
 * (components/ui/BoxPhoto.tsx). Hidden while Lite isn't on sale (PRICING.lite = null).
 */
export function LiteBoxStrip() {
  useMenuVersion(); // re-render when the live menu arrives
  const PRICING = usePricing();
  const [diet, setDiet] = useState<DietType>('non-veg');
  const days = useMemo(() => getWeeklyOperatingDays(), []);
  const todayStr = useMemo(() => formatDateToYMD(new Date()), []);
  const bookable = useMemo(() => new Set(getNextBookableDays(3).map((d) => d.dateStr)), []);
  if (!PRICING.lite) return null;
  const price = PRICING.lite.trial[diet];

  return (
    <section className="py-8 sm:py-16 bg-background border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5 sm:mb-8">
          <div>
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-cta">Lite box · ₹{price}</p>
            <h2 className="font-heading font-black text-lg sm:text-3xl text-ink tracking-tight">Lighter appetite? Same menu, smaller box.</h2>
            <p className="text-[11px] sm:text-sm text-ink/70 font-medium mt-0.5">
              Main, salad and carb in smaller portions{diet === 'veg' ? ', plus the curd cup' : ''}. Every dish weighed.
            </p>
          </div>
          <div className="p-1 bg-white rounded-full border border-ink/15 shadow-sm inline-flex items-center gap-1 self-start sm:self-auto">
            {(['non-veg', 'veg'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDiet(d)}
                className={cn(
                  'flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-sm font-bold transition-all whitespace-nowrap',
                  diet === d ? 'bg-ink text-white' : 'text-gray-600 hover:text-ink',
                )}
              >
                <DietMark kind={d} size="sm" />
                {d === 'veg' ? 'Pure Veg' : 'Non-Veg'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex md:grid overflow-x-auto md:overflow-visible snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 pb-2 [scrollbar-width:none] md:grid-cols-3 gap-3 sm:gap-6">
          {days.map((day) => {
            const meal = getMenuForDate(day.date, diet).lunch;
            if (!hasBoxPhoto(meal)) return null;
            const view = boxView(meal, 'lite');
            const canBook = bookable.has(day.dateStr);
            const href = canBook ? `/tomorrow?date=${day.dateStr}&diet=${diet}&size=lite` : `/tomorrow?diet=${diet}&size=lite`;
            return (
              <Link
                key={`${day.dateStr}-${diet}`}
                href={href}
                className={cn(
                  'shrink-0 w-[240px] md:w-auto snap-start rounded-[28px] bg-white border p-3 sm:p-4 flex flex-col gap-3 transition-shadow hover:shadow-[0_16px_36px_rgba(0,0,0,0.08)]',
                  day.dateStr === todayStr ? 'border-ink ring-2 ring-ink/10' : 'border-gray-200/90',
                )}
              >
                <div className="relative aspect-[16/10] w-full rounded-[20px] overflow-hidden">
                  <BoxPhoto box={meal} size="lite" />
                  <span className="absolute top-2 left-2 z-10 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-ink shadow-sm">
                    {day.dayOfWeek} · {day.formatted}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-black text-base text-ink leading-tight line-clamp-1">{view.main.name}</h3>
                  <ul className="mt-1.5 space-y-0.5 text-xs text-gray-600">
                    {view.parts.map(({ key, item }) => (
                      <li key={key} className="flex justify-between gap-2">
                        <span className="truncate">{item.name}</span>
                        <span className="shrink-0 text-gray-400">{g1(item.grams)} g</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="text-xs font-semibold text-gray-500">
                    <b className="text-ink">{Math.round(view.totals.protein)} g</b> protein · {Math.round(view.totals.calories)} kcal
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-cta">
                    {canBook ? `₹${price}` : 'Pick a day'} <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
