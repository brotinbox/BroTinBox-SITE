import 'server-only';
import { getSupabaseServer } from '@/lib/supabase/server';
import { menuFromSnapshot, resolveMenus, type ResolvedMenu } from '@/lib/menu/resolve';
import { todayIST } from '@/lib/menu/rotation';
import { liteFactor } from '@/lib/lite-box';

export type UpcomingMeal = {
  id: string;
  subscription_id: string;
  delivery_date: string;
  slot: 'lunch' | 'dinner';
  status: string;
  diet: 'veg' | 'non_veg';
  is_egg_free: boolean;
  skip_legume: boolean;
  is_make_up: boolean;
  box_size: 'regular' | 'lite';
  editable: boolean;
  menu: ResolvedMenu | null;
  addons: string[];
};

/** The signed-in customer's meals from today on, with dishes resolved. RLS limits rows to the owner. */
export async function getUpcomingMeals(limit = 60): Promise<UpcomingMeal[]> {
  const supabase = await getSupabaseServer();
  // Meals and the booking cutoff are independent, so fetch them together.
  const [{ data }, { data: cutoffs }] = await Promise.all([
    supabase
      .from('deliveries')
      .select('id, subscription_id, delivery_date, slot, status, diet, is_egg_free, skip_legume, is_make_up, box_size, menu_snapshot, delivery_addons(qty, addons(name))')
      .gte('delivery_date', todayIST())
      .neq('status', 'cancelled')
      .order('delivery_date')
      .order('slot')
      .limit(limit),
    supabase.rpc('earliest_bookable_date', {}),
  ]);
  const rows = data ?? [];
  const menus = await resolveMenus(supabase, rows.map((r) => ({ date: r.delivery_date, diet: r.diet, slot: r.slot })));

  // Editable = still before the cutoff (the DB re-checks on every change).
  const earliest = (cutoffs as string | null) ?? '9999-12-31';

  return rows.map((r) => ({
    id: r.id,
    subscription_id: r.subscription_id,
    delivery_date: r.delivery_date,
    slot: r.slot,
    status: r.status,
    diet: r.diet,
    is_egg_free: r.is_egg_free,
    skip_legume: r.skip_legume,
    is_make_up: r.is_make_up,
    box_size: r.box_size,
    editable: r.delivery_date >= earliest && (r.status === 'scheduled' || r.status === 'skipped'),
    menu: forSize(menuFromSnapshot(r.menu_snapshot) ?? menus.get(`${r.delivery_date}|${r.diet}|${r.slot}`) ?? null, r.box_size, r.diet === 'veg'),
    addons: ((r.delivery_addons ?? []) as { qty: number; addons: { name: string } | null }[]).map((a) => `${a.qty}× ${a.addons?.name ?? ''}`),
  }));
}

export async function getMySubscriptions() {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('subscriptions')
    .select('id, type, diet, meals_per_day, slots, status, start_date, end_date, meals_total, meals_delivered, meals_skipped, meal_credits_issued, paused_from, paused_until, created_at, plans(name), preferences')
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getMyPendingOrders() {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('orders')
    .select('id, order_number, total, status, metadata, created_at')
    .in('status', ['created', 'pending_payment'])
    .order('created_at', { ascending: false });
  return data ?? [];
}

export const dateLabel = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

export const inr = (n: number | string) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** A Lite box has the main, salad and carb (veg: also the curd cup), in smaller portions (lib/lite-box.ts). */
function forSize(menu: ResolvedMenu | null, size: 'regular' | 'lite', veg = false): ResolvedMenu | null {
  if (!menu || size !== 'lite') return menu;
  const dishes = menu.dishes
    .map((d) => ({ d, f: liteFactor(d.category, d.grams, d.name, veg) }))
    .filter(({ f }) => f > 0)
    .map(({ d, f }) => ({ ...d, grams: Math.round(d.grams * f), calories: d.calories * f, protein: d.protein * f, carbs: d.carbs * f, fat: d.fat * f }));
  return {
    ...menu,
    dishes,
    calories: Math.round(dishes.reduce((s, d) => s + d.calories, 0)),
    protein: Math.round(dishes.reduce((s, d) => s + d.protein, 0) * 10) / 10,
  };
}

/** "Today", "Tomorrow", else "Wed, 12 Nov" (IST). */
export function dayWord(date: string) {
  const today = todayIST();
  const tomorrow = new Date(new Date(`${today}T12:00:00Z`).getTime() + 864e5).toISOString().slice(0, 10);
  return date === today ? 'Today' : date === tomorrow ? 'Tomorrow' : dateLabel(date);
}
