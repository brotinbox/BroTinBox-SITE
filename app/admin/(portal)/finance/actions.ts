'use server';

import { z } from 'zod';
import { cleanText } from '@/lib/security/request';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseService } from '@/lib/supabase/admin';
import { fail, ok, staffAction, type ActionResult } from '@/lib/admin/actions';
import { ENTRY_CATEGORIES } from '@/lib/finance/shared';
import { addonCostsTable, entriesTable, financeSettingsTable, todayIst } from '@/lib/finance/server';

const PERM = 'finance.write';
const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => !Number.isNaN(Date.parse(s)));
const money = (max: number) => z.coerce.number().finite().min(0).max(max);
const categories = ENTRY_CATEGORIES.map((c) => c.value) as [string, ...string[]];

/** A bill, a refund sent by UPI, or money received outside the website. */
export async function addEntry(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const v = z.object({
    entry_date: date,
    category: z.enum(categories),
    amount: z.coerce.number().finite().gt(0).max(1000000),
  }).safeParse({ entry_date: fd.get('entry_date'), category: fd.get('category'), amount: fd.get('amount') });
  if (!v.success) return fail('Check the date, type and amount (more than ₹0).');
  if (v.data.entry_date > todayIst()) return fail('The date can’t be in the future.');
  return staffAction(PERM, async (staff) => {
    const { error } = await entriesTable().insert({
      ...v.data,
      vendor: cleanText(fd.get('vendor'), 80) || null,
      note: cleanText(fd.get('note'), 300) || null,
      created_by: staff.profile.id,
    });
    if (error) throw error;
    return ok(`Saved ₹${v.data.amount.toLocaleString('en-IN')}.`);
  });
}

export async function deleteEntry(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = uuid.safeParse(fd.get('id'));
  if (!id.success) return fail('Invalid entry.');
  return staffAction(PERM, async () => {
    const { error } = await entriesTable().delete().eq('id', id.data);
    if (error) throw error;
    return ok('Entry deleted.');
  });
}

export async function saveFinanceSettings(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const v = z.object({
    packaging_per_box: money(500),
    gateway_fee_pct: money(10),
    target_food_cost_pct: z.coerce.number().finite().min(1).max(100),
  }).safeParse({
    packaging_per_box: fd.get('packaging_per_box'),
    gateway_fee_pct: fd.get('gateway_fee_pct'),
    target_food_cost_pct: fd.get('target_food_cost_pct'),
  });
  if (!v.success) return fail('Packaging ₹0–500, fee 0–10 %, target 1–100 %.');
  return staffAction(PERM, async (staff) => {
    const { error } = await financeSettingsTable().upsert({ id: 1, ...v.data, updated_by: staff.profile.id, updated_at: new Date().toISOString() });
    if (error) throw error;
    return ok('Settings saved. Every chart uses them straight away.');
  });
}

/** Cost of one dish portion. Goes through the staff session so the history records who changed it. */
export async function saveDishCost(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const v = z.object({ id: uuid, cost: money(5000), gas: money(500) })
    .safeParse({ id: fd.get('id'), cost: fd.get('cost'), gas: fd.get('gas') || 0 });
  if (!v.success) return fail('Enter a cost between ₹0 and ₹5,000.');
  return staffAction(PERM, async () => {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.from('menu_item_costs')
      .upsert({ menu_item_id: v.data.id, cost_per_portion: v.data.cost, gas_cost: v.data.gas });
    if (error) throw error;
    return ok('Cost saved. Boxes locked from tonight use it.');
  });
}

const SCOPES = {
  non_veg_main: { label: 'non-veg mains', match: (i: Dish) => i.category === 'main' && !i.is_veg },
  veg_main: { label: 'veg mains', match: (i: Dish) => i.category === 'main' && i.is_veg },
  protein_side: { label: 'protein sides', match: (i: Dish) => i.category === 'protein_side' },
  salad: { label: 'salads', match: (i: Dish) => i.category === 'salad' },
  legume: { label: 'legumes', match: (i: Dish) => i.category === 'legume' },
  carb: { label: 'carbs', match: (i: Dish) => i.category === 'carb' },
  all: { label: 'all dishes', match: () => true },
} as const;
type Dish = { id: string; category: string; is_veg: boolean };

/** "Chicken went up 10 %": raise or lower a whole group of dish costs at once. */
export async function adjustDishCosts(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const scope = z.enum(Object.keys(SCOPES) as [keyof typeof SCOPES, ...(keyof typeof SCOPES)[]]).safeParse(fd.get('scope'));
  const pct = z.coerce.number().finite().min(-50).max(100).refine((n) => n !== 0).safeParse(fd.get('pct'));
  if (!scope.success || !pct.success) return fail('Pick a group and a change between −50 % and +100 % (not 0).');
  return staffAction(PERM, async () => {
    const supabase = await getSupabaseServer();
    const [{ data: items, error: ie }, { data: costs, error: ce }] = await Promise.all([
      supabase.from('menu_items').select('id, category, is_veg').eq('is_active', true),
      supabase.from('menu_item_costs').select('menu_item_id, cost_per_portion, gas_cost'),
    ]);
    if (ie || ce) throw ie ?? ce;
    const targets = new Set(((items ?? []) as Dish[]).filter(SCOPES[scope.data].match).map((i) => i.id));
    const rows = ((costs ?? []) as { menu_item_id: string; cost_per_portion: number; gas_cost: number }[])
      .filter((c) => targets.has(c.menu_item_id))
      .map((c) => ({
        menu_item_id: c.menu_item_id,
        cost_per_portion: Math.round(Number(c.cost_per_portion) * (1 + pct.data / 100) * 100) / 100,
        gas_cost: Number(c.gas_cost),
      }));
    if (!rows.length) return fail('No dishes with a cost in that group.');
    const { error } = await supabase.from('menu_item_costs').upsert(rows);
    if (error) throw error;
    return ok(`${pct.data > 0 ? 'Raised' : 'Lowered'} ${rows.length} ${SCOPES[scope.data].label} by ${Math.abs(pct.data)} %. Boxes locked from tonight use the new costs.`);
  });
}

export async function saveAddonCost(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const v = z.object({ id: uuid, cost: money(5000) }).safeParse({ id: fd.get('id'), cost: fd.get('cost') });
  if (!v.success) return fail('Enter a cost between ₹0 and ₹5,000.');
  return staffAction(PERM, async (staff) => {
    const { error } = await addonCostsTable().upsert({ addon_id: v.data.id, cost: v.data.cost, updated_by: staff.profile.id, updated_at: new Date().toISOString() });
    if (error) throw error;
    return ok('Add-on cost saved.');
  });
}

/**
 * Boxes keep the cost from the night they were locked. When a price change
 * should count for days already gone (e.g. the bill shows chicken was dearer
 * all week), this re-costs those boxes with today's dish costs.
 */
export async function recostBoxes(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const v = z.object({ from: date, to: date }).safeParse({ from: fd.get('from'), to: fd.get('to') });
  if (!v.success) return fail('Pick both dates.');
  const [from, to] = v.data.from <= v.data.to ? [v.data.from, v.data.to] : [v.data.to, v.data.from];
  if (to > todayIst()) return fail('Only days up to today can be re-costed.');
  return staffAction(PERM, async () => {
    // Clearing food_cost makes the deliveries trigger work it out again from today's dish costs.
    const { data, error } = await getSupabaseService().from('deliveries').update({ food_cost: null } as never)
      .gte('delivery_date', from).lte('delivery_date', to).not('menu_snapshot', 'is', null).select('id');
    if (error) throw error;
    return ok(`Re-costed ${data?.length ?? 0} boxes with today’s dish costs.`);
  });
}
