'use server';

import { z } from 'zod';
import { cleanText } from '@/lib/security/request';
import { fail, ok, staffAction, type ActionResult } from '@/lib/admin/actions';
import { getNextOperatingDay } from '@/lib/menu/next-operating-day';
import {
  addDays, getIngredients, getOnHand, getStartDate, lockedThrough, pendingUsage, postUsage, stockDb, todayIst,
} from '@/lib/stock/server';
import { EXTRA_CATEGORIES, STOCK_CATEGORIES, fmtQty, inputToBase, nameKey, type BaseUnit } from '@/lib/stock/units';

/**
 * Kitchen stock actions (migration 0053). Mum and kitchen staff hold stock.*,
 * admins have it by default. Writes go through the service role after the
 * permission check in staffAction.
 */
const PERM = 'stock.write';
const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => !Number.isNaN(Date.parse(s)));
const isAdmin = (role: string) => role === 'admin' || role === 'super_admin';

function parseJson(v: FormDataEntryValue | null): unknown {
  try {
    return JSON.parse(String(v ?? '[]'));
  } catch {
    return null;
  }
}

const qtyLine = z.object({ ingredient_id: uuid, qty: z.number().finite().min(0).max(1_000_000), unit: z.string().max(5) });

// ---------------------------------------------------------------------------
// Bills
// ---------------------------------------------------------------------------
const billSchema = z.object({
  purchase_date: date,
  lines: z.array(qtyLine.extend({ amount: z.number().finite().min(0).max(1_000_000) })).max(80),
  extras: z.array(z.object({
    label: z.string().trim().min(1).max(60),
    category: z.enum(EXTRA_CATEGORIES.map((c) => c.value) as [string, ...string[]]),
    amount: z.number().finite().gt(0).max(1_000_000),
  })).max(20),
});

export async function addPurchase(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const v = billSchema.safeParse({
    purchase_date: fd.get('purchase_date'),
    lines: parseJson(fd.get('lines')),
    extras: parseJson(fd.get('extras')),
  });
  if (!v.success) return fail('Check the bill: every item needs a quantity, and amounts can’t be negative.');
  const { purchase_date, extras } = v.data;
  const lines = v.data.lines.filter((l) => l.qty > 0);
  if (!lines.length && !extras.length) return fail('Add at least one item.');
  if (purchase_date > todayIst()) return fail('The date can’t be in the future.');
  if (purchase_date < addDays(todayIst(), -60)) return fail('That date is more than 60 days ago.');

  return staffAction(PERM, async (staff) => {
    const units = new Map((await getIngredients()).map((i) => [i.id, i.unit]));
    const base = [];
    for (const l of lines) {
      const u = units.get(l.ingredient_id);
      const q = u ? inputToBase(l.qty, l.unit, u) : null;
      if (q === null) return fail('One of the items has a unit that doesn’t fit it. Refresh and try again.');
      base.push({ ingredient_id: l.ingredient_id, qty: q, amount: l.amount });
    }
    const { error } = await stockDb().rpc('add_purchase', {
      p_date: purchase_date,
      p_vendor: cleanText(fd.get('vendor'), 80),
      p_note: cleanText(fd.get('note'), 300),
      p_lines: base,
      p_extras: extras.map((e) => ({ ...e, label: cleanText(e.label, 60) })),
      p_user: staff.profile.id,
    });
    if (error) throw error;
    // Bought it: clear any "running low" flag.
    if (base.length) {
      await stockDb().from('ingredients').update({ low_flag_at: null, low_flag_by: null })
        .in('id', base.map((b) => b.ingredient_id));
    }
    const total = base.reduce((s, b) => s + b.amount, 0) + extras.reduce((s, e) => s + e.amount, 0);
    return ok(`Bill saved: ${base.length + extras.length} item${base.length + extras.length === 1 ? '' : 's'}, ₹${total.toLocaleString('en-IN')}. Stock and Revenue & profit are updated.`);
  });
}

export async function deletePurchase(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = uuid.safeParse(fd.get('id'));
  if (!id.success) return fail('Invalid bill.');
  return staffAction(PERM, async (staff) => {
    const { data: bill, error: e1 } = await stockDb().from('purchases').select('created_by').eq('id', id.data).maybeSingle();
    if (e1) throw e1;
    if (!bill) return fail('That bill is already gone.');
    if (bill.created_by !== staff.profile.id && !isAdmin(staff.role)) return fail('Only the person who entered it, or an admin, can delete a bill.');
    // Its stock lines and finance entries go with it (on delete cascade).
    const { error } = await stockDb().from('purchases').delete().eq('id', id.data);
    if (error) throw error;
    return ok('Bill deleted. Its stock and its Revenue & profit entry are removed.');
  });
}

// ---------------------------------------------------------------------------
// Counts, waste, running low
// ---------------------------------------------------------------------------
export async function saveCount(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const items = z.array(qtyLine).max(200).safeParse(parseJson(fd.get('items')));
  if (!items.success) return fail('Check the counts: numbers only.');
  if (!items.data.length) return fail('Type what you counted for at least one item.');
  const cookedToday = fd.get('cooked_today') === 'yes';

  return staffAction(PERM, async (staff) => {
    const today = todayIst();
    const [ingredients, onHand, start] = await Promise.all([getIngredients(), getOnHand(), getStartDate()]);
    const byId = new Map(ingredients.map((i) => [i.id, i]));
    // Usage already taken off for cooking that hasn't happened yet is still on the shelf.
    const pending = start ? await pendingUsage(!cookedToday) : new Map<string, number>();
    const rows = [];
    for (const it of items.data) {
      const ing = byId.get(it.ingredient_id);
      const counted = ing ? inputToBase(it.qty, it.unit, ing.unit) : null;
      if (!ing || counted === null) continue;
      const target = counted - (pending.get(ing.id) ?? 0);
      const delta = Math.round((target - (onHand.get(ing.id) ?? 0)) * 1000) / 1000;
      rows.push({
        ingredient_id: ing.id, move_date: today, kind: 'count', qty: delta, counted,
        note: start ? null : 'Opening stock', created_by: staff.profile.id,
      });
    }
    if (!rows.length) return fail('Nothing to save.');
    const { error } = await stockDb().from('moves').insert(rows);
    if (error) throw error;
    await stockDb().from('ingredients').update({ low_flag_at: null, low_flag_by: null })
      .in('id', rows.map((r) => r.ingredient_id)).not('low_flag_at', 'is', null);

    if (!start) {
      // Opening count: usage is taken off from the first cooking not in this count.
      const first = cookedToday ? await getNextOperatingDay(today) : today;
      const { error: e2 } = await stockDb().from('settings').update({ start_date: first, updated_at: new Date().toISOString() }).eq('id', 1);
      if (e2) throw e2;
      return ok(`Opening stock saved for ${rows.length} items. From ${first}, each day’s cooking is taken off at 9 PM the night before.`);
    }
    const changed = rows.filter((r) => Math.abs(r.qty) > 0.001).length;
    return ok(`Count saved for ${rows.length} items${changed ? ` (${changed} corrected)` : ', all matched'}.`);
  });
}

export async function addWaste(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const v = z.object({ ingredient_id: uuid, qty: z.coerce.number().finite().gt(0).max(1_000_000), unit: z.string().max(5) })
    .safeParse({ ingredient_id: fd.get('ingredient_id'), qty: fd.get('qty'), unit: fd.get('unit') });
  if (!v.success) return fail('Pick the item and how much was thrown away.');
  return staffAction(PERM, async (staff) => {
    const ing = (await getIngredients()).find((i) => i.id === v.data.ingredient_id);
    const q = ing ? inputToBase(v.data.qty, v.data.unit, ing.unit) : null;
    if (!ing || q === null) return fail('That unit doesn’t fit this item.');
    const { error } = await stockDb().from('moves').insert({
      ingredient_id: ing.id, move_date: todayIst(), kind: 'waste', qty: -q,
      note: cleanText(fd.get('note'), 200) || null, created_by: staff.profile.id,
    });
    if (error) throw error;
    return ok(`${fmtQty(q, ing.unit)} ${ing.name} marked as wasted.`);
  });
}

export async function toggleLow(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = uuid.safeParse(fd.get('id'));
  if (!id.success) return fail('Invalid item.');
  const on = fd.get('on') === '1';
  return staffAction(PERM, async (staff) => {
    const { error } = await stockDb().from('ingredients')
      .update(on ? { low_flag_at: new Date().toISOString(), low_flag_by: staff.profile.id } : { low_flag_at: null, low_flag_by: null })
      .eq('id', id.data);
    if (error) throw error;
    return ok(on ? 'Marked as running low. It is on the buy list now.' : 'Running-low mark removed.');
  });
}

// ---------------------------------------------------------------------------
// Ingredients and recipe links
// ---------------------------------------------------------------------------
const ingredientSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(60),
  kind: z.enum(['fresh', 'pantry']),
  unit: z.enum(['g', 'ml', 'pcs']),
  category: z.enum(STOCK_CATEGORIES.map((c) => c.value) as [string, ...string[]]),
  pack_size: z.coerce.number().finite().min(0).max(1_000_000).optional(),
  pack_unit: z.string().max(5).optional(),
  min_stock: z.coerce.number().finite().min(0).max(1_000_000).optional(),
  min_unit: z.string().max(5).optional(),
  is_active: z.boolean(),
});

export async function saveIngredient(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const opt = (k: string) => (fd.get(k) === null || String(fd.get(k)).trim() === '' ? undefined : fd.get(k));
  const v = ingredientSchema.safeParse({
    id: opt('id'), name: fd.get('name'), kind: fd.get('kind'), unit: fd.get('unit'), category: fd.get('category'),
    pack_size: opt('pack_size'), pack_unit: opt('pack_unit'), min_stock: opt('min_stock'), min_unit: opt('min_unit'),
    is_active: fd.has('is_active') ? fd.getAll('is_active').includes('on') : true,
  });
  if (!v.success) return fail('Check the name, type, unit and numbers.');
  const d = v.data;
  const unit = d.unit as BaseUnit;
  const toBase = (q: number | undefined, u: string | undefined) => (q === undefined || q === 0 ? null : inputToBase(q, u ?? unit, unit));
  const pack = toBase(d.pack_size, d.pack_unit);
  const min = toBase(d.min_stock, d.min_unit);
  if ((d.pack_size && pack === null) || (d.min_stock && min === null)) return fail('The pack or minimum unit doesn’t fit the stock unit.');

  return staffAction(PERM, async () => {
    const row = {
      name: cleanText(d.name, 60), kind: d.kind, category: d.category, pack_size: pack, min_stock: min,
      is_active: d.is_active, note: cleanText(fd.get('note'), 200) || null,
    };
    if (d.id) {
      const { data: cur, error: e0 } = await stockDb().from('ingredients').select('unit').eq('id', d.id).maybeSingle();
      if (e0) throw e0;
      if (!cur) return fail('That item no longer exists.');
      if (cur.unit !== unit) {
        const { count } = await stockDb().from('moves').select('id', { count: 'exact', head: true }).eq('ingredient_id', d.id);
        if (count) return fail('The unit can’t change once stock was bought or counted in it.');
      }
      const { error } = await stockDb().from('ingredients').update({ ...row, unit }).eq('id', d.id);
      if (error) throw error;
      return ok(`${row.name} saved.`);
    }
    const { data: created, error } = await stockDb().from('ingredients').insert({ ...row, unit }).select('id').single();
    if (error) throw error;
    // Its own name links recipes that use exactly this name.
    await stockDb().from('aliases').upsert({ alias: nameKey(row.name), ingredient_id: created.id }, { onConflict: 'alias', ignoreDuplicates: true });
    return ok(`${row.name} added.`);
  });
}

/** Links a recipe ingredient name to a stock item ('ignore' = not tracked, '' = unlink). */
export async function linkAlias(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const alias = nameKey(cleanText(fd.get('alias'), 80));
  const target = String(fd.get('ingredient_id') ?? '');
  if (!alias) return fail('Invalid name.');
  if (target && target !== 'ignore' && !uuid.safeParse(target).success) return fail('Pick an item.');
  return staffAction(PERM, async () => {
    if (!target) {
      const { error } = await stockDb().from('aliases').delete().eq('alias', alias);
      if (error) throw error;
      return ok('Link removed.');
    }
    const { error } = await stockDb().from('aliases')
      .upsert({ alias, ingredient_id: target === 'ignore' ? null : target }, { onConflict: 'alias' });
    if (error) throw error;
    return ok(target === 'ignore' ? 'Marked as not tracked.' : 'Linked. The buy list counts it from now on.');
  });
}

/** Works a day's usage out again (after a recipe or link was fixed). Only days already posted. */
export async function repostUsage(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const day = date.safeParse(fd.get('day'));
  if (!day.success) return fail('Invalid day.');
  return staffAction(PERM, async (staff) => {
    if (!isAdmin(staff.role)) return fail('Only an admin can recalculate usage.');
    const start = await getStartDate();
    if (!start || day.data < start) return fail('Stock tracking hadn’t started on that day.');
    if (day.data > await lockedThrough()) return fail('That day isn’t locked yet. Its usage is taken off at 9 PM the night before.');
    const r = await postUsage(day.data, true);
    return ok(`Usage for ${day.data} worked out again: ${r.boxes} boxes, ${r.lines} items.`);
  });
}
