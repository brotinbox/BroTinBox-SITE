'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useMenuVersion } from '@/components/providers/CatalogProvider';
import { getMenuForDate } from '@/lib/menu-engine';
import type { CartPlan } from '@/store/useAppStore';
import { DietMark } from '@/components/trial/DietMark';
import { g1 } from '@/lib/meal-display';
import { cn } from '@/lib/utils';
import { boxView } from '@/lib/lite-box';

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

/** "View details" under the plan line: every delivery day with its box. */
export function PlanDetails({ plan, editHref }: { plan: CartPlan; editHref: string }) {
  const [open, setOpen] = useState(false);
  const menuVersion = useMenuVersion();
  const rows = useMemo(() => {
    if (!open) return [];
    return plan.days.map((d) => {
      const menu = getMenuForDate(d.date, d.diet === 'veg' ? 'veg' : 'non-veg');
      const slots = (plan.mealsPerDay === 2 ? [menu.lunch, menu.dinner] : [plan.slot === 'dinner' ? menu.dinner : menu.lunch])
        .map((b) => ({ slot: b.slot, ...boxView(b, plan.boxSize ?? 'regular') }));
      return { ...d, slots };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plan, menuVersion]);

  return (
    <div className="mt-2">
      <div className="flex items-center gap-3 text-[11px] font-bold">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-0.5 text-gray-700">
          {open ? 'Hide details' : 'View details'}
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
        </button>
        <Link href={editHref} className="text-accent">Change plan</Link>
      </div>

      {open && (
        <ul className="mt-2.5 space-y-2">
          {rows.map((r) => (
            <li key={r.date} className="rounded-xl bg-gray-50 border border-gray-100 p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                <DietMark kind={r.diet === 'veg' ? 'veg' : 'non-veg'} size="sm" />
                {dayLabel(r.date)}
              </div>
              {r.slots.map((box) => (
                <div key={box.slot} className="mt-1 text-[11px] text-gray-600">
                  {plan.mealsPerDay === 2 && <b className="text-gray-800 capitalize">{box.slot}: </b>}
                  {box.parts.map((p) => `${p.item.name} ${p.item.grams} g`).join(' · ')}
                  <span className="block text-gray-400">
                    {Math.round(box.totals.calories)} kcal · {g1(box.totals.protein)} g protein
                  </span>
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
