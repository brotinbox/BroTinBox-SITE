import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseService } from '@/lib/supabase/admin';
import { normaliseRows, type DayRow } from '@/lib/finance/shared';

/**
 * Finance data (own `finance` schema, service role only, migration 0049).
 * Callers check `finance.read` / `finance.write` first (super admin only).
 */

const service = () => getSupabaseService() as unknown as SupabaseClient;
const db = () => service().schema('finance');
export const entriesTable = () => db().from('entries');
export const financeSettingsTable = () => db().from('settings');
export const addonCostsTable = () => db().from('addon_costs');
export const dishCostHistoryTable = () => db().from('dish_cost_history');

export type FinanceSettings = { packaging_per_box: number; gateway_fee_pct: number; target_food_cost_pct: number; updated_at: string | null };
export type Entry = { id: string; entry_date: string; category: string; amount: number; vendor: string | null; note: string | null; created_at: string };

export const FIRST_DAY = '2026-10-01';

export const todayIst = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export function addDays(d: string, n: number) {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}

export const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5) + 1;

export const RANGES = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'mtd', label: 'This month' },
  { value: 'lm', label: 'Last month' },
  { value: 'all', label: 'Since launch' },
] as const;

const isDate = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/** Turns ?range= / ?from=&to= into a date span (max 366 days, never before launch). */
export function resolveRange(sp: { range?: string; from?: string; to?: string }) {
  const today = todayIst();
  let from: string;
  let to = today;
  let key = sp.range ?? '30d';
  if (key === 'custom' && isDate(sp.from) && isDate(sp.to)) {
    from = sp.from <= sp.to ? sp.from : sp.to;
    to = sp.from <= sp.to ? sp.to : sp.from;
  } else {
    if (key === 'custom') key = '30d';
    switch (key) {
      case '7d': from = addDays(today, -6); break;
      case '90d': from = addDays(today, -89); break;
      case 'mtd': from = `${today.slice(0, 7)}-01`; break;
      case 'lm': {
        const first = `${today.slice(0, 7)}-01`;
        to = addDays(first, -1);
        from = `${to.slice(0, 7)}-01`;
        break;
      }
      case 'all': from = FIRST_DAY; break;
      default: key = '30d'; from = addDays(today, -29);
    }
  }
  if (from < FIRST_DAY) from = FIRST_DAY;
  if (to < from) to = from;
  if (daysBetween(from, to) > 366) from = addDays(to, -365);
  return { key, from, to, days: daysBetween(from, to) };
}

export async function getDaily(from: string, to: string): Promise<{ rows: DayRow[]; error: string | null }> {
  const { data, error } = await db().rpc('daily', { p_from: from, p_to: to });
  if (error) return { rows: [], error: error.message };
  return { rows: normaliseRows((data ?? []) as Record<string, unknown>[]), error: null };
}

export async function getBoxCosts(from: string, to: string) {
  const { data } = await db().rpc('box_costs', { p_from: from, p_to: to });
  return ((data ?? []) as { box: string; diet: string; box_size: string; boxes: number; avg_cost: number }[])
    .map((r) => ({ ...r, avg_cost: Number(r.avg_cost) }));
}

export async function getFinanceSettings(): Promise<FinanceSettings> {
  const { data } = await financeSettingsTable().select('*').eq('id', 1).maybeSingle();
  const s = (data ?? {}) as Partial<Record<keyof FinanceSettings, unknown>>;
  return {
    packaging_per_box: Number(s.packaging_per_box ?? 0),
    gateway_fee_pct: Number(s.gateway_fee_pct ?? 0),
    target_food_cost_pct: Number(s.target_food_cost_pct ?? 35),
    updated_at: (s.updated_at as string | null) ?? null,
  };
}

export async function listEntries(from: string, to: string): Promise<Entry[]> {
  const { data } = await entriesTable().select('id, entry_date, category, amount, vendor, note, created_at')
    .gte('entry_date', from).lte('entry_date', to)
    .order('entry_date', { ascending: false }).order('created_at', { ascending: false }).limit(500);
  return ((data ?? []) as Entry[]).map((e) => ({ ...e, amount: Number(e.amount) }));
}

export type DishCost = { id: string; code: string; name: string; category: string; is_veg: boolean; grams: number; cost: number | null; gas: number | null; updated_at: string | null };

export async function listDishCosts(): Promise<DishCost[]> {
  const sb = service();
  const [items, costs] = await Promise.all([
    sb.from('menu_items').select('id, code, name, category, is_veg, grams').eq('is_active', true).order('category').order('code'),
    sb.from('menu_item_costs').select('menu_item_id, cost_per_portion, gas_cost, updated_at'),
  ]);
  const byId = new Map(((costs.data ?? []) as { menu_item_id: string; cost_per_portion: number; gas_cost: number; updated_at: string }[])
    .map((c) => [c.menu_item_id, c]));
  return ((items.data ?? []) as Omit<DishCost, 'cost' | 'gas' | 'updated_at'>[]).map((i) => {
    const c = byId.get(i.id);
    return { ...i, cost: c ? Number(c.cost_per_portion) : null, gas: c ? Number(c.gas_cost) : null, updated_at: c?.updated_at ?? null };
  });
}

export type AddonCost = { id: string; name: string; type: string; price: number; is_active: boolean; cost: number | null };

export async function listAddonCosts(): Promise<AddonCost[]> {
  const [addons, costs] = await Promise.all([
    service().from('addons').select('id, name, type, price, is_active').order('type').order('sort_order'),
    addonCostsTable().select('addon_id, cost'),
  ]);
  const byId = new Map(((costs.data ?? []) as { addon_id: string; cost: number }[]).map((c) => [c.addon_id, Number(c.cost)]));
  return ((addons.data ?? []) as Omit<AddonCost, 'cost'>[]).map((a) => ({ ...a, price: Number(a.price), cost: byId.get(a.id) ?? null }));
}

export async function recentCostChanges(limit = 15) {
  const { data } = await dishCostHistoryTable().select('id, menu_item_id, cost_per_portion, gas_cost, changed_at, note')
    .order('changed_at', { ascending: false }).limit(limit);
  return ((data ?? []) as { id: number; menu_item_id: string; cost_per_portion: number; gas_cost: number; changed_at: string; note: string | null }[]);
}
