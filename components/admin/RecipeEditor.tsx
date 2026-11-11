'use client';

import { useActionState, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RECIPE_UNITS, type Recipe } from '@/lib/recipes';
import type { ActionResult } from '@/lib/admin/actions';
import { SubmitButton } from '@/components/admin/forms';

type Row = { key: number; name: string; qty: string; unit: string; note: string };
type Step = { key: number; text: string };

const field = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';
const label = 'block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1';
const iconBtn = 'w-8 h-8 shrink-0 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30';

let nextKey = 1;
const k = () => nextKey++;

/**
 * Edit a dish's recipe: ingredients (per ONE portion), numbered steps, times
 * and tips. The whole recipe is sent as one JSON field.
 */
export function RecipeEditor({ menuItemId, recipe, action }: {
  menuItemId: string;
  recipe: Recipe;
  action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction] = useActionState(action, null);
  const [rows, setRows] = useState<Row[]>(() =>
    recipe.ingredients.map((i) => ({ key: k(), name: i.name, qty: i.qty === null ? '' : String(i.qty), unit: i.unit || 'g', note: i.note ?? '' })));
  const [steps, setSteps] = useState<Step[]>(() => recipe.steps.map((t) => ({ key: k(), text: t })));
  const [prep, setPrep] = useState(recipe.prep_minutes?.toString() ?? '');
  const [cook, setCook] = useState(recipe.cook_minutes?.toString() ?? '');
  const [equipment, setEquipment] = useState(recipe.equipment ?? '');
  const [tips, setTips] = useState(recipe.tips ?? '');
  const [notes, setNotes] = useState(recipe.notes ?? '');

  const json = useMemo(() => {
    const n = (v: string) => (v.trim() === '' || Number.isNaN(Number(v)) ? null : Number(v));
    const opt = (v: string) => (v.trim() ? v.trim() : null);
    return JSON.stringify({
      ingredients: rows.filter((r) => r.name.trim()).map((r) => ({
        name: r.name.trim(), qty: r.unit === 'to taste' ? null : n(r.qty), unit: r.unit, ...(r.note.trim() && { note: r.note.trim() }),
      })),
      steps: steps.map((s) => s.text.trim()).filter(Boolean),
      prep_minutes: n(prep) === null ? null : Math.round(n(prep)!),
      cook_minutes: n(cook) === null ? null : Math.round(n(cook)!),
      equipment: opt(equipment), tips: opt(tips), notes: opt(notes),
    });
  }, [rows, steps, prep, cook, equipment, tips, notes]);

  const setRow = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const moveStep = (i: number, d: -1 | 1) => setSteps((ss) => {
    const out = [...ss];
    [out[i], out[i + d]] = [out[i + d], out[i]];
    return out;
  });

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="menu_item_id" value={menuItemId} />
      <input type="hidden" name="recipe" value={json} />

      <section>
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="font-heading font-bold text-sm text-gray-900">Ingredients <span className="font-medium text-gray-500">(for ONE portion)</span></h3>
          <span className="text-[11px] text-gray-500">The cook book multiplies these by the day&apos;s count.</span>
        </div>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.key} className="grid grid-cols-[1fr_5rem_6rem_auto] sm:grid-cols-[1.4fr_5rem_6rem_1fr_auto] gap-2 items-center">
              <input className={field} placeholder="Ingredient, e.g. Chicken breast (raw)" value={r.name} maxLength={80}
                onChange={(e) => setRow(r.key, { name: e.target.value })} aria-label="Ingredient" />
              <input className={cn(field, 'tabular-nums')} type="number" min={0} step="any" placeholder="Qty" value={r.qty}
                disabled={r.unit === 'to taste'} onChange={(e) => setRow(r.key, { qty: e.target.value })} aria-label="Quantity per portion" />
              <select className={field} value={r.unit} onChange={(e) => setRow(r.key, { unit: e.target.value })} aria-label="Unit">
                {RECIPE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                {!RECIPE_UNITS.includes(r.unit as never) && <option value={r.unit}>{r.unit}</option>}
              </select>
              <input className={cn(field, 'hidden sm:block')} placeholder="Note (optional)" value={r.note} maxLength={120}
                onChange={(e) => setRow(r.key, { note: e.target.value })} aria-label="Note" />
              <button type="button" className={iconBtn} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} aria-label="Remove ingredient">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setRows((rs) => [...rs, { key: k(), name: '', qty: '', unit: 'g', note: '' }])}
          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
          <Plus className="w-3.5 h-3.5" /> Add ingredient
        </button>
      </section>

      <section>
        <h3 className="font-heading font-bold text-sm text-gray-900 mb-2">Method</h3>
        <ol className="space-y-2">
          {steps.map((s, i) => (
            <li key={s.key} className="flex gap-2 items-start">
              <span className="w-7 h-7 mt-1 shrink-0 rounded-full bg-gray-900 text-white text-xs font-black inline-flex items-center justify-center">{i + 1}</span>
              <textarea className={cn(field, 'min-h-[44px]')} rows={2} maxLength={600} value={s.text} placeholder="What to do in this step"
                onChange={(e) => setSteps((ss) => ss.map((x) => (x.key === s.key ? { ...x, text: e.target.value } : x)))} aria-label={`Step ${i + 1}`} />
              <div className="flex flex-col gap-1">
                <button type="button" className={iconBtn} disabled={i === 0} onClick={() => moveStep(i, -1)} aria-label="Move step up"><ArrowUp className="w-4 h-4" /></button>
                <button type="button" className={iconBtn} disabled={i === steps.length - 1} onClick={() => moveStep(i, 1)} aria-label="Move step down"><ArrowDown className="w-4 h-4" /></button>
              </div>
              <button type="button" className={cn(iconBtn, 'mt-1')} onClick={() => setSteps((ss) => ss.filter((x) => x.key !== s.key))} aria-label="Remove step">
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => setSteps((ss) => [...ss, { key: k(), text: '' }])}
          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
          <Plus className="w-3.5 h-3.5" /> Add step
        </button>
      </section>

      <section className="grid sm:grid-cols-3 gap-3">
        <label className="block"><span className={label}>Prep / marinate (min)</span>
          <input className={field} type="number" min={0} max={1440} value={prep} onChange={(e) => setPrep(e.target.value)} /></label>
        <label className="block"><span className={label}>Cook (min)</span>
          <input className={field} type="number" min={0} max={1440} value={cook} onChange={(e) => setCook(e.target.value)} /></label>
        <label className="block"><span className={label}>Equipment</span>
          <input className={field} maxLength={300} placeholder="Grill pan, steamer…" value={equipment} onChange={(e) => setEquipment(e.target.value)} /></label>
      </section>

      <label className="block"><span className={label}>Tips &amp; checks</span>
        <textarea className={cn(field, 'min-h-24')} maxLength={2000} placeholder="e.g. Don't overcook or it dries out. Taste salt before packing."
          value={tips} onChange={(e) => setTips(e.target.value)} /></label>
      <label className="block"><span className={label}>Kitchen notes</span>
        <textarea className={cn(field, 'min-h-24')} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>

      <div className="flex items-center gap-3">
        <SubmitButton>Save recipe</SubmitButton>
        {state?.message && (
          <p role="status" className={cn('text-xs font-semibold rounded-lg px-3 py-2', state.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700')}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
