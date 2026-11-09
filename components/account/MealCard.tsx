import { Lock } from 'lucide-react';
import { SLOT_TIME } from '@/lib/meal-display';
import { cn } from '@/lib/utils';
import { customiseMeal, skipMeal } from '@/lib/customer/actions';
import type { UpcomingMeal } from '@/lib/customer/data';
import { DietMark } from '@/components/trial/DietMark';
import { Btn, CustomerForm } from './forms';

const STATUS: Record<string, { text: string; cls: string }> = {
  scheduled: { text: 'Scheduled', cls: 'bg-sand text-ink border-ink/15' },
  skipped: { text: 'Skipped', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  paused: { text: 'Paused', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  locked: { text: 'Being cooked', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  preparing: { text: 'Being cooked', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  packed: { text: 'Packed', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  out_for_delivery: { text: 'On the way', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  delivered: { text: 'Delivered', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed: { text: 'Delivery issue', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

/** One meal, food-app style: photo, dish, time, macros, and the actions still open for it. */
export function MealCard({ meal, showCustomise = false }: { meal: UpcomingMeal; showCustomise?: boolean }) {
  const off = meal.status === 'skipped' || meal.status === 'paused';
  const veg = meal.diet === 'veg';
  const st = STATUS[meal.status] ?? { text: meal.status, cls: STATUS.scheduled.cls };
  const img = meal.menu?.dishes[0]?.image_url;
  const name = meal.menu?.dishes[0]?.name ?? (veg ? 'Veg box' : 'Non-veg box');
  const sides = meal.menu?.dishes.slice(1).map((d) => d.name).join(' · ');
  const extras = [meal.is_egg_free && 'Egg-free', meal.skip_legume && 'No legume', meal.is_make_up && 'Make-up meal', meal.box_size === 'lite' && 'Lite box'].filter(Boolean) as string[];

  return (
    <div className={cn('rounded-2xl border border-gray-200 bg-white p-3', off && 'opacity-60')}>
      <div className="flex gap-3">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={name} loading="lazy" className={cn('w-20 h-20 rounded-xl object-cover bg-gray-100 shrink-0', off && 'grayscale')} />
        ) : (
          <span className="w-20 h-20 rounded-xl bg-sand flex items-center justify-center shrink-0"><DietMark kind={veg ? 'veg' : 'non-veg'} /></span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-bold text-gray-500">{meal.slot === 'lunch' ? 'Lunch' : 'Dinner'} · {SLOT_TIME[meal.slot]}</p>
            <span className={cn('shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border', st.cls)}>{st.text}</span>
          </div>
          <p className={cn('font-heading font-black text-sm text-gray-900 mt-0.5 flex items-center gap-1.5', off && 'line-through')}>
            <DietMark kind={veg ? 'veg' : 'non-veg'} size="sm" /> <span className="truncate">{name}</span>
          </p>
          {sides && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{sides}</p>}
          {meal.menu && (
            <p className="text-xs mt-1">
              <span className="font-bold text-gray-900">{meal.menu.calories} kcal</span>
              <span className="text-gray-400"> · </span>
              <span className="font-bold text-ink">{Math.round(meal.menu.protein)} g protein</span>
            </p>
          )}
        </div>
      </div>

      {(extras.length > 0 || meal.addons.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {extras.map((e) => <span key={e} className="text-[11px] font-bold rounded-full bg-gray-100 text-gray-700 px-2.5 py-0.5">{e}</span>)}
          {meal.addons.map((a) => <span key={a} className="text-[11px] font-bold rounded-full bg-accent-soft text-ink px-2.5 py-0.5">+ {a}</span>)}
        </div>
      )}

      {meal.editable ? (
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
          <CustomerForm action={skipMeal}>
            <input type="hidden" name="delivery_id" value={meal.id} />
            <input type="hidden" name="undo" value={meal.status === 'skipped' ? 'true' : 'false'} />
            <Btn variant={meal.status === 'skipped' ? 'primary' : 'ghost'}
              confirm={meal.status === 'skipped' ? undefined : { eyebrow: 'Skip meal', title: 'Skip this meal?', message: 'It moves to the end of your plan, so you don’t lose it. You can undo until 9 PM the night before.', confirmLabel: 'Skip it', cancelLabel: 'Keep this meal' }}>
              {meal.status === 'skipped' ? 'Undo skip' : 'Skip'}
            </Btn>
          </CustomerForm>
          {showCustomise && meal.status === 'scheduled' && (
            <details className="group">
              <summary className="list-none cursor-pointer inline-flex items-center px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 hover:bg-gray-50">Customise</summary>
              <CustomerForm action={customiseMeal} className="mt-2 flex flex-wrap items-center gap-3">
                <input type="hidden" name="delivery_id" value={meal.id} />
                {!veg && (
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-700">
                    <input type="checkbox" name="is_egg_free" defaultChecked={meal.is_egg_free} className="w-4 h-4" /> Egg-free
                  </label>
                )}
                <label className="inline-flex items-center gap-1.5 text-xs text-gray-700">
                  <input type="checkbox" name="skip_legume" defaultChecked={meal.skip_legume} className="w-4 h-4" /> No legume
                </label>
                <Btn variant="primary">Save</Btn>
              </CustomerForm>
            </details>
          )}
        </div>
      ) : !off && meal.status === 'scheduled' ? (
        <p className="mt-2.5 inline-flex items-center gap-1 text-[11px] text-gray-500"><Lock className="w-3 h-3" /> Changes closed at 9 PM the night before</p>
      ) : null}
    </div>
  );
}
