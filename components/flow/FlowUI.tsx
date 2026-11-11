'use client';

import { useEffect, type ReactNode } from 'react';
import Image from 'next/image';
import { Check, ChevronLeft } from 'lucide-react';
import type { BoxMeal } from '@/lib/menu-engine';
import { boxView, type BoxSize } from '@/lib/lite-box';
import { g1 } from '@/lib/meal-display';
import { cn } from '@/lib/utils';

/**
 * Shared look for the order flows (trial, weekly, monthly), matching the
 * checkout page: white cards on the paper background, one clear type scale,
 * black for selection, orange only for small accents, and a fixed bottom bar
 * with the live price and one button.
 *
 * Type scale: page title text-xl/2xl black · section title text-sm bold ·
 * body text-sm · notes text-xs gray-500. Nothing smaller than 11px.
 */

export function FlowShell({ flow, step, steps, title, subtitle, onBack, bar, children }: {
  /** "Trial box", "Weekly plan" … */
  flow: string;
  step: number;
  steps: number;
  title: string;
  subtitle?: string;
  /** Step > 1: previous step. Step 1: browser back. */
  onBack?: () => void;
  bar: ReactNode;
  children: ReactNode;
}) {
  // Each step starts at the top of the page.
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [step]);

  return (
    <div className="min-h-screen bg-paper pb-36">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button type="button" onClick={onBack ?? (() => history.back())} className="flex items-center gap-1 text-xs font-bold text-gray-700 py-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-xs font-bold text-gray-500">{flow} · Step {step} of {steps}</span>
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="flex gap-1.5" aria-hidden="true">
            {Array.from({ length: steps }, (_, i) => (
              <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors duration-300', i < step ? 'bg-ink' : 'bg-gray-200')} />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-3">
        <div className="pb-1">
          <h1 className="font-heading font-black text-xl sm:text-2xl text-ink">{title}</h1>
          {subtitle && <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>}
        </div>
        {children}
      </div>

      {bar}
    </div>
  );
}

export function Section({ title, note, right, children, className }: {
  title?: string;
  note?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('bg-white rounded-2xl border border-gray-200 p-4 space-y-3', className)}>
      {(title || right) && (
        <div className="flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="font-heading font-bold text-sm text-gray-900">{title}</h2>}
            {note && <p className="text-xs text-gray-500 mt-0.5">{note}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

/** Radio-style card (like picking a delivery address). */
export function OptionCard({ selected, onClick, title, note, right, lead, disabled }: {
  selected: boolean;
  onClick: () => void;
  title: ReactNode;
  note?: ReactNode;
  right?: ReactNode;
  lead?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'w-full min-h-[56px] flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors tap-active disabled:opacity-50',
        selected ? 'border-ink bg-paper ring-1 ring-ink' : 'border-gray-200 bg-white hover:border-gray-300'
      )}
    >
      <span className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0', selected ? 'border-ink bg-ink text-white' : 'border-gray-300')}>
        {selected && <Check className="w-3 h-3 stroke-[3]" />}
      </span>
      {lead}
      <span className="flex-1 min-w-0">
        <span className="block font-heading font-bold text-sm text-gray-900">{title}</span>
        {note && <span className="block text-xs text-gray-500 mt-0.5">{note}</span>}
      </span>
      {right && <span className="shrink-0 text-right">{right}</span>}
    </button>
  );
}

/** Day / date pill. */
export function DayChip({ selected, onClick, top, main, sub, crossed, disabled, topTone }: {
  selected: boolean;
  onClick: () => void;
  top?: string;
  main: string;
  sub?: string;
  /** Skipped day: shown crossed out. */
  crossed?: boolean;
  /** Fully booked: greyed out and can't be picked. */
  disabled?: boolean;
  /** 'warn' shows the top label in orange (e.g. "2 left"). */
  topTone?: 'warn';
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'min-h-[56px] rounded-xl border px-2 py-2 text-center transition-colors tap-active',
        selected ? 'border-ink bg-ink text-white' : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300',
        crossed && 'bg-gray-50 text-gray-400 border-dashed',
        disabled && 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed hover:border-gray-200'
      )}
    >
      {top && <span className={cn('block text-[11px] font-bold', topTone === 'warn' && !selected ? 'text-orange-600' : selected ? 'text-accent-bright' : 'text-gray-400')}>{top}</span>}
      <span className={cn('block font-heading font-black text-sm', crossed && 'line-through')}>{main}</span>
      {sub && <span className={cn('block text-[11px]', selected ? 'text-white/75' : 'text-gray-500')}>{sub}</span>}
    </button>
  );
}

/** Two-way switch (Lunch / Dinner tabs and similar). */
export function Segmented<T extends string>({ value, onChange, options }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex rounded-full bg-gray-100 p-0.5 text-xs font-bold" role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cn('flex-1 px-3 py-1.5 rounded-full transition-colors', value === o.value ? 'bg-ink text-white' : 'text-gray-600')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const PART_LABEL = { main: 'Main', proteinSide: 'Protein', salad: 'Salad', legume: 'Legume', carb: 'Carb' } as const;

/**
 * The items in a box with grams, plus one neutral macro line. Shows the day's
 * tray photo on top (photo={false} where a photo is already on screen).
 */
export function BoxContents({ box, size = 'regular', photo = true }: { box: BoxMeal; size?: BoxSize; photo?: boolean }) {
  const view = boxView(box, size);
  const img = box.items.main.image;
  return (
    <div className="space-y-3">
      {photo && img && (
        <div className="relative aspect-[16/10] sm:aspect-[2/1] w-full overflow-hidden rounded-xl bg-gray-100">
          <Image key={img} src={img} alt={box.items.main.name} fill sizes="(max-width: 672px) 100vw, 640px" className="object-cover" />
          {size === 'lite' && (
            <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-ink shadow-sm">
              Photo shows the full box · Lite has {view.parts.length} items, smaller portions
            </span>
          )}
        </div>
      )}
      <ul className="divide-y divide-gray-100">
        {view.parts.map(({ key, item }) => (
          <li key={key} className="flex items-center justify-between gap-3 py-2.5">
            <span className="min-w-0">
              <span className="block text-sm font-bold text-gray-900 truncate">{item.name}</span>
              <span className="block text-xs text-gray-500">{PART_LABEL[key]} · {g1(item.grams)} g</span>
            </span>
            <span className="text-xs font-semibold text-gray-500 shrink-0">{Math.round(item.calories)} kcal</span>
          </li>
        ))}
      </ul>
      <MacroLine {...view.totals} />
    </div>
  );
}

type SizeInfo = { price: number; protein: number; calories: number; strike?: number };

/**
 * Full box vs Lite box. Renders nothing while Lite isn't on sale (lite = null).
 * Prices are whatever this flow charges per box (trial / weekly / monthly).
 */
export function BoxSizeSection({ value, onChange, full, lite, priceNote }: {
  value: BoxSize;
  onChange: (v: BoxSize) => void;
  full: SizeInfo;
  lite: SizeInfo | null;
  /** e.g. "per meal" */
  priceNote?: string;
}) {
  if (!lite) return null;
  const price = (i: SizeInfo) => (
    <span className="text-right">
      <span className="block font-heading font-black text-sm text-gray-900">
        {i.strike && i.strike !== i.price && <s className="mr-1 text-xs font-bold text-gray-400">₹{i.strike}</s>}₹{i.price}
      </span>
      {priceNote && <span className="block text-[11px] text-gray-500">{priceNote}</span>}
    </span>
  );
  const extraProtein = Math.round(full.protein - lite.protein);
  return (
    <Section title="Box size" note={extraProtein > 0 ? `The full box has about ${extraProtein} g more protein.` : undefined}>
      <div className="grid gap-2" role="radiogroup" aria-label="Box size">
        <OptionCard selected={value === 'regular'} onClick={() => onChange('regular')}
          title="Full box" note={`5 items · ${g1(full.protein)} g protein · ${Math.round(full.calories)} kcal`} right={price(full)} />
        <OptionCard selected={value === 'lite'} onClick={() => onChange('lite')}
          title="Lite box" note={`Smaller portions · ${g1(lite.protein)} g protein · ${Math.round(lite.calories)} kcal`} right={price(lite)} />
      </div>
    </Section>
  );
}

export function MacroLine({ calories, protein, carbs, fat }: { calories: number; protein: number; carbs: number; fat: number }) {
  return (
    <div className="grid grid-cols-4 gap-2 rounded-xl bg-paper border border-gray-100 p-2.5 text-center">
      {[
        ['Calories', `${Math.round(calories)}`],
        ['Protein', `${g1(protein)} g`],
        ['Carbs', `${g1(carbs)} g`],
        ['Fat', `${g1(fat)} g`],
      ].map(([label, value]) => (
        <div key={label}>
          <span className="block text-[11px] font-semibold text-gray-500">{label}</span>
          <span className={cn('block font-heading font-black text-sm', label === 'Protein' ? 'text-emerald-700' : 'text-gray-900')}>{value}</span>
        </div>
      ))}
    </div>
  );
}

/** Fixed bottom bar: live price on the left, one black button. */
export function FlowBar({ price, strike, note, cta, onClick, disabled, icon, hint }: {
  price: string;
  strike?: string;
  note?: string;
  cta: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  /** Why the button is disabled. */
  hint?: string;
}) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)]">
      <div className="max-w-2xl mx-auto flex items-center gap-3">
        <div className="min-w-0">
          <p className="font-heading font-black text-lg text-ink leading-none">
            {strike && <s className="mr-1.5 text-xs font-bold text-gray-400">{strike}</s>}
            {price}
          </p>
          {note && <p className="text-[11px] text-gray-500 mt-1 truncate">{note}</p>}
        </div>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-ink hover:bg-ink-soft disabled:opacity-50 text-white font-heading font-black text-sm"
        >
          {icon}
          {cta}
        </button>
      </div>
      {hint && disabled && <p className="max-w-2xl mx-auto mt-1.5 text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}
