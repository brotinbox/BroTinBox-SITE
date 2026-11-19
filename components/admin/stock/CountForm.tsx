'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { SubmitButton } from '@/components/admin/forms';
import type { ActionResult } from '@/lib/admin/actions';
import { INPUT_UNITS, STOCK_CATEGORIES, fmtQty, type BaseUnit, type StockKind } from '@/lib/stock/units';

export type CountItem = { id: string; name: string; unit: BaseUnit; kind: StockKind; category: string; onHand: number };

const field = 'w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';

/**
 * Stock count: type what is on the shelf; empty rows are skipped. The system
 * quantity is shown so a big gap stands out.
 */
export function CountForm({ items, opening, defaultCooked, action }: {
  items: CountItem[];
  opening: boolean;
  defaultCooked: boolean;
  action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction] = useActionState(action, null);
  const [show, setShow] = useState<StockKind | 'all'>(opening ? 'all' : 'pantry');
  const [vals, setVals] = useState<Record<string, { qty: string; unit: string }>>({});
  useEffect(() => { if (state?.ok) setVals({}); }, [state]);

  const shown = useMemo(() => items.filter((i) => show === 'all' || i.kind === show), [items, show]);
  const json = JSON.stringify(Object.entries(vals)
    .filter(([, v]) => v.qty.trim() !== '' && !Number.isNaN(Number(v.qty)))
    .map(([id, v]) => ({ ingredient_id: id, qty: Number(v.qty), unit: v.unit })));
  const filled = Object.values(vals).filter((v) => v.qty.trim() !== '').length;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="items" value={json} />
      <fieldset className="rounded-xl border border-gray-200 p-3">
        <legend className="px-1 text-[11px] font-bold uppercase tracking-wider text-gray-600">Is today’s cooking finished?</legend>
        <div className="flex gap-4 flex-wrap text-sm">
          <label className="inline-flex items-center gap-2"><input type="radio" name="cooked_today" value="yes" defaultChecked={defaultCooked} /> Yes, or no cooking today</label>
          <label className="inline-flex items-center gap-2"><input type="radio" name="cooked_today" value="no" defaultChecked={!defaultCooked} /> No, still to cook today</label>
        </div>
        <p className="text-[11px] text-gray-500 mt-1.5">So the system knows whether today’s food is still on the shelf. Sunday is the easiest day to count.</p>
      </fieldset>

      <div className="flex gap-1.5 flex-wrap">
        {(['pantry', 'fresh', 'all'] as const).map((s) => (
          <button key={s} type="button" onClick={() => setShow(s)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-bold border', show === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200')}>
            {s === 'pantry' ? 'Stock items (masala, oil…)' : s === 'fresh' ? 'Fresh items' : 'Everything'}
          </button>
        ))}
      </div>

      {STOCK_CATEGORIES.map((c) => {
        const rows = shown.filter((i) => i.category === c.value);
        if (!rows.length) return null;
        return (
          <section key={c.value}>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">{c.label}</h3>
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
              {rows.map((i) => {
                const units = INPUT_UNITS[i.unit];
                const v = vals[i.id] ?? { qty: '', unit: units[i.unit === 'pcs' ? 0 : 1].unit };
                return (
                  <div key={i.id} className="grid grid-cols-[1fr_5.5rem_4.5rem] gap-2 items-center px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{i.name}</p>
                      {!opening && <p className="text-[11px] text-gray-500">System: {fmtQty(i.onHand, i.unit)}</p>}
                    </div>
                    <input className={cn(field, 'tabular-nums')} type="number" min={0} step="any" inputMode="decimal" placeholder="Count"
                      value={v.qty} aria-label={`${i.name} counted`}
                      onChange={(e) => setVals((x) => ({ ...x, [i.id]: { ...v, qty: e.target.value } }))} />
                    <select className={field} value={v.unit} aria-label="Unit" onChange={(e) => setVals((x) => ({ ...x, [i.id]: { ...v, unit: e.target.value } }))}>
                      {units.map((u) => <option key={u.unit} value={u.unit}>{u.unit}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 sticky bottom-2">
        <p className="text-sm text-gray-700">{filled} item{filled === 1 ? '' : 's'} counted <span className="text-gray-500">(empty rows are skipped)</span></p>
        <SubmitButton confirm={opening ? { title: 'Save the opening stock?', message: 'From now on, every day’s cooking is taken off at 9 PM the night before.', confirmLabel: 'Save' } : undefined}>
          {opening ? 'Save opening stock' : 'Save count'}
        </SubmitButton>
      </div>
      {state?.message && (
        <p role="status" className={cn('text-xs font-semibold rounded-lg px-3 py-2', state.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700')}>
          {state.message}
        </p>
      )}
    </form>
  );
}
