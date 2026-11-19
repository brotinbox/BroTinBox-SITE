'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubmitButton } from '@/components/admin/forms';
import type { ActionResult } from '@/lib/admin/actions';
import { EXTRA_CATEGORIES, INPUT_UNITS, STOCK_CATEGORIES, fmtPrice, type BaseUnit } from '@/lib/stock/units';

export type BillIngredient = { id: string; name: string; unit: BaseUnit; category: string; price_per_unit: number | null };
export type BillPrefill = { ingredient_id: string; qty: number; unit: string };

type Line = { key: number; ingredient_id: string; qty: string; unit: string; amount: string };
type Extra = { key: number; label: string; category: string; amount: string };

const field = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';
const label = 'block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1';
const iconBtn = 'w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50';

let nextKey = 1;
const k = () => nextKey++;

/**
 * Itemised bill: what was bought, how much, and what it cost. Stock goes up,
 * the price per kg is remembered, and Revenue & profit gets the total.
 */
export function BillForm({ ingredients, today, minDate, prefill, action }: {
  ingredients: BillIngredient[];
  today: string;
  minDate: string;
  prefill: BillPrefill[];
  action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction] = useActionState(action, null);
  const byId = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);
  const firstUnit = (id: string) => INPUT_UNITS[byId.get(id)?.unit ?? 'g'][0].unit;
  const blank = (): Line => ({ key: k(), ingredient_id: '', qty: '', unit: 'kg', amount: '' });
  const fromPrefill = () => (prefill.length
    ? prefill.map((p) => ({ key: k(), ingredient_id: p.ingredient_id, qty: String(p.qty), unit: p.unit, amount: '' }))
    : [blank()]);
  const [lines, setLines] = useState<Line[]>(fromPrefill);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [formKey, setFormKey] = useState(0);

  // Clear the form after a successful save.
  useEffect(() => {
    if (state?.ok) {
      setLines([blank()]);
      setExtras([]);
      setFormKey((x) => x + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const setLine = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const num = (v: string) => (v.trim() === '' || Number.isNaN(Number(v)) ? 0 : Number(v));
  const total = lines.reduce((s, l) => s + num(l.amount), 0) + extras.reduce((s, e) => s + num(e.amount), 0);

  const linesJson = JSON.stringify(lines.filter((l) => l.ingredient_id && num(l.qty) > 0)
    .map((l) => ({ ingredient_id: l.ingredient_id, qty: num(l.qty), unit: l.unit, amount: num(l.amount) })));
  const extrasJson = JSON.stringify(extras.filter((e) => e.label.trim() && num(e.amount) > 0)
    .map((e) => ({ label: e.label.trim(), category: e.category, amount: num(e.amount) })));

  const grouped = STOCK_CATEGORIES.map((c) => ({ ...c, items: ingredients.filter((i) => i.category === c.value) })).filter((g) => g.items.length);

  return (
    <form action={formAction} className="space-y-4" key={formKey}>
      <input type="hidden" name="lines" value={linesJson} />
      <input type="hidden" name="extras" value={extrasJson} />
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block"><span className={label}>Date</span>
          <input className={field} type="date" name="purchase_date" defaultValue={today} max={today} min={minDate} required /></label>
        <label className="block"><span className={label}>Shop</span>
          <input className={field} name="vendor" maxLength={80} placeholder="e.g. Ukkadam market" /></label>
      </div>

      <section>
        <h3 className="font-heading font-bold text-sm text-gray-900 mb-2">Items bought</h3>
        <div className="space-y-2">
          {lines.map((l) => {
            const ing = byId.get(l.ingredient_id);
            const units = INPUT_UNITS[ing?.unit ?? 'g'];
            return (
              <div key={l.key} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.6fr_5.5rem_5rem_6.5rem_auto] gap-2 items-start max-sm:pb-3 max-sm:border-b max-sm:border-gray-100">
                <div className="max-sm:col-span-2">
                  <select className={field} value={l.ingredient_id} aria-label="Item"
                    onChange={(e) => setLine(l.key, { ingredient_id: e.target.value, unit: firstUnit(e.target.value) })}>
                    <option value="">Pick an item…</option>
                    {grouped.map((g) => (
                      <optgroup key={g.value} label={g.label}>
                        {g.items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  {ing?.price_per_unit != null && <span className="block text-[11px] text-gray-500 mt-0.5 pl-1">Last price {fmtPrice(ing.price_per_unit, ing.unit)}</span>}
                </div>
                <input className={cn(field, 'tabular-nums')} type="number" min={0} step="any" inputMode="decimal" placeholder="Qty" value={l.qty}
                  onChange={(e) => setLine(l.key, { qty: e.target.value })} aria-label="Quantity" />
                <select className={field} value={l.unit} onChange={(e) => setLine(l.key, { unit: e.target.value })} aria-label="Unit">
                  {units.map((u) => <option key={u.unit} value={u.unit}>{u.unit}</option>)}
                </select>
                <input className={cn(field, 'tabular-nums')} type="number" min={0} step="0.01" inputMode="decimal" placeholder="₹" value={l.amount}
                  onChange={(e) => setLine(l.key, { amount: e.target.value })} aria-label="Amount paid (₹)" />
                <button type="button" className={iconBtn} onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : [blank()]))} aria-label="Remove item">
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
        <button type="button" onClick={() => setLines((ls) => [...ls, blank()])} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
          <Plus className="w-3.5 h-3.5" /> Add item
        </button>
        <p className="text-[11px] text-gray-500 mt-1">Amount = what you paid for that item in total, not per kg. Leave it empty if you don’t know.</p>
      </section>

      <section>
        <h3 className="font-heading font-bold text-sm text-gray-900 mb-1">Other things on the bill <span className="font-medium text-gray-500">(not stock)</span></h3>
        <p className="text-[11px] text-gray-500 mb-2">Gas cylinder, boxes, bags… They go to Revenue & profit only.</p>
        <div className="space-y-2">
          {extras.map((e) => (
            <div key={e.key} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.6fr_10rem_6.5rem_auto] gap-2 items-center">
              <input className={cn(field, 'max-sm:col-span-2')} placeholder="What, e.g. Gas cylinder" maxLength={60} value={e.label}
                onChange={(ev) => setExtras((xs) => xs.map((x) => (x.key === e.key ? { ...x, label: ev.target.value } : x)))} aria-label="What" />
              <select className={field} value={e.category} aria-label="Type"
                onChange={(ev) => setExtras((xs) => xs.map((x) => (x.key === e.key ? { ...x, category: ev.target.value } : x)))}>
                {EXTRA_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <input className={cn(field, 'tabular-nums')} type="number" min={0} step="0.01" inputMode="decimal" placeholder="₹" value={e.amount}
                onChange={(ev) => setExtras((xs) => xs.map((x) => (x.key === e.key ? { ...x, amount: ev.target.value } : x)))} aria-label="Amount (₹)" />
              <button type="button" className={iconBtn} onClick={() => setExtras((xs) => xs.filter((x) => x.key !== e.key))} aria-label="Remove">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setExtras((xs) => [...xs, { key: k(), label: '', category: 'packaging', amount: '' }])}
          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
          <Plus className="w-3.5 h-3.5" /> Add other cost
        </button>
      </section>

      <label className="block"><span className={label}>Note</span>
        <input className={field} name="note" maxLength={300} placeholder="Optional" /></label>

      <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
        <p className="text-sm text-gray-700">Bill total <span className="font-heading font-black text-lg text-gray-900 tabular-nums ml-1">₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></p>
        <SubmitButton>Save bill</SubmitButton>
      </div>
      {state?.message && (
        <p role="status" className={cn('text-xs font-semibold rounded-lg px-3 py-2', state.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700')}>
          {state.message}
        </p>
      )}
    </form>
  );
}
