'use server';

import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import { cleanText } from '@/lib/security/request';
import { fail, ok, staffAction, type ActionResult } from '@/lib/admin/actions';
import { uploadImage } from '@/lib/admin/upload';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optId = z.string().uuid().or(z.literal('')).transform((v) => v || null);
const MENU_TAGS = ['menu'];

export async function saveOverride(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = z.object({
    menu_date: isoDate,
    diet: z.enum(['veg', 'non_veg']),
    slot: z.enum(['lunch', 'dinner']),
    main_id: optId, protein_side_id: optId, salad_id: optId, legume_id: optId, carb_id: optId,
  }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail('Check the date, diet and slot.');
  const v = parsed.data;
  if (![v.main_id, v.protein_side_id, v.salad_id, v.legume_id, v.carb_id].some(Boolean)) {
    return fail('Pick at least one dish to change.');
  }
  return staffAction('menu.write', async (staff) => {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.from('menu_overrides').upsert(
      { ...v, reason: cleanText(fd.get('reason'), 300) || null, created_by: staff.profile.id },
      { onConflict: 'kitchen_id,menu_date,diet,slot' }
    );
    if (error) throw error;
    return ok('Menu changed for that date. The website updates within a minute.');
  }, { tags: MENU_TAGS });
}

export async function removeOverride(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = z.string().uuid().safeParse(fd.get('id'));
  if (!id.success) return fail('Invalid change.');
  return staffAction('menu.write', async () => {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.from('menu_overrides').delete().eq('id', id.data);
    if (error) throw error;
    return ok('Back to the regular rotation for that date.');
  }, { tags: MENU_TAGS });
}

export async function addClosure(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const date = isoDate.safeParse(fd.get('closed_date'));
  const reason = cleanText(fd.get('reason'), 200);
  if (!date.success || !reason) return fail('Pick a date and give a reason.');
  return staffAction('menu.write', async (staff) => {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.from('kitchen_closures').insert({ closed_date: date.data, reason, created_by: staff.profile.id });
    if (error) throw error;
    return ok('Closure added. Existing meals on that date are not moved automatically; add meal credits if needed.');
  }, { tags: MENU_TAGS });
}

export async function removeClosure(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = z.string().uuid().safeParse(fd.get('id'));
  if (!id.success) return fail('Invalid closure.');
  return staffAction('menu.write', async () => {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.from('kitchen_closures').delete().eq('id', id.data);
    if (error) throw error;
    return ok('Closure removed.');
  }, { tags: MENU_TAGS });
}

const num = (min: number, max: number) => z.coerce.number().min(min).max(max);
const blankToUndef = (v: unknown) => (v === '' || v === null ? undefined : v);

export async function saveDish(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = z.object({
    id: z.string().uuid(),
    name: z.string().trim().min(2).max(120),
    description: z.string().max(600).optional(),
    grams: z.coerce.number().int().min(1).max(2000),
    cooked_state: z.string().max(120).optional(),
    calories: num(0, 3000), protein: num(0, 300), carbs: num(0, 500), fat: num(0, 300), fiber: num(0, 100),
    allergens: z.string().max(200).optional(),
    cost_per_portion: z.preprocess(blankToUndef, num(0, 5000).optional()),
    gas_cost: z.preprocess(blankToUndef, num(0, 500).optional()),
  }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail('Check the values: ' + parsed.error.issues.map((i) => i.path.join('.')).join(', '));
  const v = parsed.data;

  return staffAction('menu.write', async () => {
    const supabase = await getSupabaseServer();
    let image_url: string | undefined;
    const file = fd.get('image');
    if (file instanceof File && file.size > 0) {
      image_url = await uploadImage(supabase, 'menu-images', file, `dishes/${v.id}`);
    }
    const { error } = await supabase.from('menu_items').update({
      name: cleanText(v.name, 120),
      description: cleanText(v.description, 600) || null,
      grams: v.grams,
      cooked_state: cleanText(v.cooked_state, 120) || null,
      calories: v.calories, protein: v.protein, carbs: v.carbs, fat: v.fat, fiber: v.fiber,
      allergens: (v.allergens ?? '').split(',').map((a) => cleanText(a, 30)).filter(Boolean),
      is_active: fd.get('is_active') === 'on',
      ...(image_url ? { image_url } : {}),
    }).eq('id', v.id);
    if (error) throw error;
    if (v.cost_per_portion !== undefined) {
      const { error: cErr } = await supabase.from('menu_item_costs').upsert({
        menu_item_id: v.id, cost_per_portion: v.cost_per_portion, gas_cost: v.gas_cost ?? 0,
      });
      if (cErr) throw cErr;
    }
    return ok('Dish saved.');
  }, { tags: MENU_TAGS });
}
