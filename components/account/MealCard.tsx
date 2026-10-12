import { Leaf, Drumstick, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { customiseMeal, skipMeal } from '@/lib/customer/actions';
import { dateLabel, type UpcomingMeal } from '@/lib/customer/data';
import { Btn, CustomerForm } from './forms';

const STATUS_TEXT: Record<string, string> = {
  scheduled: 'Scheduled', skipped: 'Skipped', paused: 'Paused', locked: 'Being prepared', preparing: 'Being prepared',
  packed: 'Packed', out_for_delivery: 'Out for delivery', delivered: 'Delivered', failed: 'Delivery issue',
};

export function MealCard({ meal, showCustomise = false }: { meal: UpcomingMeal; showCustomise?: boolean }) {
  const off = meal.status === 'skipped' || meal.status === 'paused';
  const veg = meal.diet === 'veg';
  return (
    <div className={cn('rounded-2xl border p-4 bg-white', off ? 'border-gray-200 opacity-70' : 'border-ink/15')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
            {dateLabel(meal.delivery_date)} · {meal.slot === 'lunch' ? 'Morning (7–9 AM)' : 'Dinner (7–9 PM)'}
          </p>
          <p className="font-heading font-black text-base text-gray-900 mt-0.5 flex items-center gap-1.5">
            {veg ? <Leaf className="w-4 h-4 text-emerald-600" /> : <Drumstick className="w-4 h-4 text-orange-600" />}
            {meal.menu?.dishes[0]?.name ?? (veg ? 'Veg box' : 'Non-veg box')}
          </p>
        </div>
        <span className={cn('shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full border',
          off ? 'bg-gray-100 text-gray-600 border-gray-200' : meal.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-sand text-ink border-ink/15')}>
          {STATUS_TEXT[meal.status] ?? meal.status}
        </span>
      </div>

      {meal.menu && (
        <p className="text-xs text-gray-600 mt-2 leading-relaxed">
          {meal.menu.dishes.slice(1).map((d) => d.name).join(' · ')}
        </p>
      )}
      <p className="text-xs mt-1.5">
        {meal.menu && <span className="font-bold text-gray-900">{meal.menu.calories} kcal · {meal.menu.protein} g protein</span>}
        {meal.is_egg_free && <span className="text-gray-500"> · egg-free</span>}
        {meal.skip_legume && <span className="text-gray-500"> · no legume</span>}
        {meal.is_make_up && <span className="text-gray-500"> · make-up meal</span>}
        {meal.addons.length > 0 && <span className="text-gray-500"> · + {meal.addons.join(', ')}</span>}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {meal.editable ? (
          <>
            <CustomerForm action={skipMeal}>
              <input type="hidden" name="delivery_id" value={meal.id} />
              <input type="hidden" name="undo" value={meal.status === 'skipped' ? 'true' : 'false'} />
              <Btn variant={meal.status === 'skipped' ? 'primary' : 'ghost'}
                confirm={meal.status === 'skipped' ? undefined : 'Skip this meal? It moves to the end of your plan.'}>
                {meal.status === 'skipped' ? 'Undo skip' : 'Skip this meal'}
              </Btn>
            </CustomerForm>
            {showCustomise && meal.status === 'scheduled' && (
              <CustomerForm action={customiseMeal} className="flex flex-wrap items-center gap-3">
                <input type="hidden" name="delivery_id" value={meal.id} />
                {!veg && (
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-700">
                    <input type="checkbox" name="is_egg_free" defaultChecked={meal.is_egg_free} className="w-4 h-4" /> Egg-free
                  </label>
                )}
                <label className="inline-flex items-center gap-1.5 text-xs text-gray-700">
                  <input type="checkbox" name="skip_legume" defaultChecked={meal.skip_legume} className="w-4 h-4" /> No legume
                </label>
                <Btn variant="ghost">Save</Btn>
              </CustomerForm>
            )}
          </>
        ) : (
          !off && meal.status !== 'delivered' && (
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-500"><Lock className="w-3 h-3" /> Locked: changes close at 9 PM the night before</span>
          )
        )}
      </div>
    </div>
  );
}
