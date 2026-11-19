'use server';

import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import { fail, ok, staffAction, type ActionResult } from '@/lib/admin/actions';

/**
 * One form for every capacity change:
 *  - date blank  → the everyday default for that slot
 *  - capacity blank on a date → remove that date's change (back to the default)
 */
export async function setCapacity(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = z.object({
    slot: z.enum(['lunch', 'dinner']),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')).optional(),
    capacity: z.union([z.literal(''), z.coerce.number().int().min(0).max(500)]).optional(),
  }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail('Enter a number from 0 to 500.');
  const { slot } = parsed.data;
  const date = parsed.data.date || null;
  const capacity = parsed.data.capacity === '' || parsed.data.capacity === undefined ? null : parsed.data.capacity;
  if (!date && capacity === null) return fail('Enter a number for the everyday capacity.');

  return staffAction('menu.write', async () => {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.rpc('set_slot_capacity', { p_slot: slot, p_date: date, p_capacity: capacity });
    if (error) throw error;
    const label = slot === 'lunch' ? 'Lunch' : 'Dinner';
    if (!date) return ok(`${label}: ${capacity} boxes every day.`);
    return ok(capacity === null ? `${label} on ${date} is back to the everyday number.` : `${label} on ${date}: ${capacity} boxes.`);
  });
}

/**
 * Same-day spares (migration 0052), one form for every change:
 *  - date blank  → the every-day number for that slot + diet
 *  - spares blank on a date → remove that date's change
 */
export async function setSpares(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = z.object({
    slot: z.enum(['lunch', 'dinner']),
    diet: z.enum(['veg', 'non_veg']),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')).optional(),
    spares: z.union([z.literal(''), z.coerce.number().int().min(0).max(100)]).optional(),
  }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail('Enter a number from 0 to 100.');
  const { slot, diet } = parsed.data;
  const date = parsed.data.date || null;
  const spares = parsed.data.spares === '' || parsed.data.spares === undefined ? null : parsed.data.spares;
  if (!date && spares === null) return fail('Enter a number for the every-day spares.');

  return staffAction('menu.write', async () => {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.rpc('set_same_day_spares', { p_slot: slot, p_diet: diet, p_date: date, p_spares: spares });
    if (error) throw error;
    const label = `${slot === 'lunch' ? 'Lunch' : 'Dinner'} ${diet === 'veg' ? 'veg' : 'non-veg'}`;
    if (!date) return ok(`${label}: ${spares} spare boxes every day.`);
    return ok(spares === null ? `${label} on ${date} is back to the every-day number.` : `${label} on ${date}: ${spares} spare boxes.`);
  });
}
