import 'server-only';
import { getSupabaseServer } from '@/lib/supabase/server';
import { menuFromSnapshot, resolveMenus, type ResolvedMenu } from '@/lib/menu/resolve';
import { todayIST } from '@/lib/menu/rotation';

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
  editable: boolean;
  menu: ResolvedMenu | null;
  addons: string[];
};

/** The signed-in customer's meals from today on, with dishes resolved. RLS limits rows to the owner. */
export async function getUpcomingMeals(limit = 60): Promise<UpcomingMeal[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('deliveries')
    .select('id, subscription_id, delivery_date, slot, status, diet, is_egg_free, skip_legume, is_make_up, menu_snapshot, delivery_addons(qty, addons(name))')
    .gte('delivery_date', todayIST())
    .neq('status', 'cancelled')
    .order('delivery_date')
    .order('slot')
    .limit(limit);
  const rows = data ?? [];
  const menus = await resolveMenus(supabase, rows.map((r) => ({ date: r.delivery_date, diet: r.diet, slot: r.slot })));

  // Editable = still before the cutoff (the DB re-checks on every change).
  const { data: cutoffs } = rows.length
    ? await supabase.rpc('earliest_bookable_date', {})
    : { data: null };
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
    editable: r.delivery_date >= earliest && (r.status === 'scheduled' || r.status === 'skipped'),
    menu: menuFromSnapshot(r.menu_snapshot) ?? menus.get(`${r.delivery_date}|${r.diet}|${r.slot}`) ?? null,
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
