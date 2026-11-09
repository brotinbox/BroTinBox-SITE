'use client';

import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import type { CheckoutAddon } from '@/lib/checkout/actions';
import { cn } from '@/lib/utils';

/**
 * "Complete your meal": the cart's cross-sell row (Swiggy/Zomato pattern).
 * One tap adds 1 of the item to every delivery; the cart line has the stepper.
 */
export function AddonRail({ catalog, inCart, days, onAdd }: {
  catalog: CheckoutAddon[];
  inCart: Set<string>;
  days: number;
  onAdd: (a: CheckoutAddon) => void;
}) {
  const [tab, setTab] = useState<'side' | 'drink'>('side');
  if (!catalog.length) return null;
  const items = catalog.filter((c) => c.type === tab);
  const n = Math.max(days, 1);

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-heading font-bold text-sm text-gray-900">Complete your meal</h2>
          <p className="text-[11px] text-gray-500">Comes in the same bag as your box{n > 1 ? `, every day` : ''}.</p>
        </div>
        <div className="flex rounded-full bg-gray-100 p-0.5 text-[11px] font-bold shrink-0">
          {(['side', 'drink'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={cn('px-3 py-1 rounded-full', tab === t ? 'bg-ink text-white' : 'text-gray-600')}>
              {t === 'side' ? 'Protein sides' : 'Juices'}
            </button>
          ))}
        </div>
      </div>

      <div className="-mx-4 px-4 flex gap-2.5 overflow-x-auto snap-x pb-1 [scrollbar-width:none]">
        {items.map((a) => {
          const added = inCart.has(a.id);
          return (
            <div key={a.id} className="snap-start shrink-0 w-36 rounded-xl border border-gray-200 overflow-hidden flex flex-col">
              <div className="relative h-24 bg-gray-100">
                {a.image && <img src={a.image} alt={a.name} loading="lazy" className="w-full h-full object-cover" />}
                <button
                  type="button"
                  onClick={() => !added && onAdd(a)}
                  aria-label={added ? `${a.name} added` : `Add ${a.name}`}
                  className={cn(
                    'absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-black shadow',
                    added ? 'bg-ink text-white' : 'bg-white text-ink border border-ink'
                  )}
                >
                  {added ? <><Check className="w-3 h-3" /> Added</> : <><Plus className="w-3 h-3" /> ADD</>}
                </button>
              </div>
              <div className="p-2 flex-1 flex flex-col">
                <p className="text-xs font-bold text-gray-900 leading-tight line-clamp-2">{a.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{a.note}</p>
                <p className="mt-auto pt-1 text-xs font-black text-gray-900">
                  ₹{a.price}
                  {n > 1 && <span className="font-semibold text-gray-500"> · ₹{a.price * n} for {n} days</span>}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
