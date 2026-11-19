'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { adminHref } from '@/lib/admin/paths';
import { getSupabaseServer } from '@/lib/supabase/server';
import { cleanText } from '@/lib/security/request';
import { fail, ok, staffAction, type ActionResult } from '@/lib/admin/actions';
import { uploadImage } from '@/lib/admin/upload';
import { recipeSchema, toRecipe } from '@/lib/recipes';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optId = z.string().uuid().or(z.literal('')).transform((v) => v || null);
const MENU_TAGS = ['menu'];

/**
 * Boxes locked at 9 PM carry a frozen copy of the menu (dashboard, Day plan,
 * food cost read it; the cook sheet reads the live menu). A change after the
 * lock re-freezes those boxes so everyone sees the dish actually cooked.
 */
async function refreshLocked(
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>,
  date: string, diet: 'veg' | 'non_veg', slot: 'lunch' | 'dinner',
): Promise<string> {
  const { data, error } = await supabase.rpc('refresh_locked_menu', { p_date: date, p_diet: diet, p_slot: slot });
  if (error) {
    console.error('[menu] refresh_locked_menu failed', error);
    return ' Boxes already locked for that slot could not be updated: re-save after migration 0055 runs.';
  }
  const n = Number(data ?? 0);
  return n ? ` ${n} box${n === 1 ? '' : 'es'} already locked for that slot now show the new dishes.` : '';
}

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
    const refrozen = await refreshLocked(supabase, v.menu_date, v.diet, v.slot);
    return ok(`Menu changed for that date. The website updates within a minute.${refrozen}`);
  }, { tags: MENU_TAGS });
}

export async function removeOverride(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = z.string().uuid().safeParse(fd.get('id'));
  if (!id.success) return fail('Invalid change.');
  return staffAction('menu.write', async () => {
    const supabase = await getSupabaseServer();
    const { data: gone, error } = await supabase.from('menu_overrides').delete().eq('id', id.data)
      .select('menu_date, diet, slot').maybeSingle();
    if (error) throw error;
    const refrozen = gone ? await refreshLocked(supabase, gone.menu_date, gone.diet, gone.slot) : '';
    return ok(`Back to the regular rotation for that date.${refrozen}`);
  }, { tags: MENU_TAGS });
}

/**
 * Rotation swap (migration 0048): from a date on, serve `new` wherever the
 * 30-day menu has `old`. The rotation itself is untouched, so removing the
 * swap brings the old dish back. One-date changes still win over swaps.
 */
export async function addSwap(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = z.object({
    old_item_id: z.string().uuid(),
    new_item_id: z.string().uuid(),
    effective_from: isoDate,
    diet: z.enum(['', 'veg', 'non_veg']).transform((v) => v || null),
    slot: z.enum(['', 'lunch', 'dinner']).transform((v) => v || null),
  }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail('Pick both dishes and a start date.');
  const v = parsed.data;
  if (v.old_item_id === v.new_item_id) return fail('Pick a different dish to bring in.');

  return staffAction('menu.write', async () => {
    const supabase = await getSupabaseServer();
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    if (v.effective_from < today) return fail('The start date cannot be in the past.');

    const [{ data: dishes, error: dErr }, { data: rot, error: rErr }, { data: prior, error: sErr }] = await Promise.all([
      supabase.from('menu_items').select('id, name, category, is_veg, is_active').in('id', [v.old_item_id, v.new_item_id]),
      supabase.from('menu_rotation').select('id').or(PARTS_OR(v.old_item_id)).limit(1),
      supabase.from('menu_swaps').select('id').eq('new_item_id', v.old_item_id).limit(1),
    ]);
    if (dErr || rErr || sErr) throw dErr ?? rErr ?? sErr;
    const oldD = dishes?.find((d) => d.id === v.old_item_id);
    const newD = dishes?.find((d) => d.id === v.new_item_id);
    if (!oldD || !newD) return fail('Dish not found.');
    if (oldD.category !== newD.category) return fail(`${newD.name} is a different kind of dish from ${oldD.name}. Pick one from the same group.`);
    if (!newD.is_active) return fail(`${newD.name} is hidden. Make it active first.`);
    if (!newD.is_veg && v.diet !== 'non_veg') return fail(`${newD.name} is non-veg, so set “Which boxes” to Non-veg only.`);
    if (!rot?.length && !prior?.length) return fail(`${oldD.name} is not in the 30-day menu. To serve ${newD.name} on a date, use “Change a dish for one date”.`);

    const { error } = await supabase.from('menu_swaps').insert({
      ...v, note: cleanText(fd.get('note'), 300) || null,
    });
    if (error) throw error;
    return ok(`From ${v.effective_from}, ${newD.name} replaces ${oldD.name}. Meals already locked keep the old dish.`);
  }, { tags: MENU_TAGS });
}

export async function removeSwap(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = z.string().uuid().safeParse(fd.get('id'));
  if (!id.success) return fail('Invalid swap.');
  return staffAction('menu.write', async () => {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.from('menu_swaps').delete().eq('id', id.data);
    if (error) throw error;
    return ok('Swap removed. Unlocked meals go back to the 30-day menu’s dish.');
  }, { tags: MENU_TAGS });
}

const PARTS_OR = (id: string) =>
  `main_id.eq.${id},protein_side_id.eq.${id},salad_id.eq.${id},legume_id.eq.${id},carb_id.eq.${id}`;

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

/** Code prefix per category, matching the workbook (NVM1, VM2, CD1, LG1, SL1, CB1). */
function codePrefix(category: string, isVeg: boolean): string {
  if (category === 'main') return isVeg ? 'VM' : 'NVM';
  return ({ protein_side: 'CD', legume: 'LG', salad: 'SL', carb: 'CB' } as Record<string, string>)[category];
}

/**
 * Adds a dish to the library. It is NOT placed in the 30-day rotation, so
 * nothing customers see changes until it is used in a date change on the
 * menu calendar (or the rotation is edited).
 */
export async function createDish(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = z.object({
    category: z.enum(['main', 'protein_side', 'legume', 'salad', 'carb']),
    diet: z.enum(['veg', 'non_veg']),
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
  const isVeg = v.diet === 'veg';

  const created = { id: "" };
  const result = await staffAction('menu.write', async () => {
    const supabase = await getSupabaseServer();
    const prefix = codePrefix(v.category, isVeg);
    const { data: existing, error: cErr } = await supabase.from('menu_items').select('code').like('code', `${prefix}%`);
    if (cErr) throw cErr;
    const re = new RegExp(`^${prefix}(\\d+)$`);
    const next = Math.max(0, ...(existing ?? []).map((r) => Number(re.exec(r.code)?.[1] ?? 0))) + 1;

    const { data: row, error } = await supabase.from('menu_items').insert({
      code: `${prefix}${next}`,
      category: v.category,
      name: cleanText(v.name, 120),
      description: cleanText(v.description, 600) || null,
      grams: v.grams,
      cooked_state: cleanText(v.cooked_state, 120) || null,
      calories: v.calories, protein: v.protein, carbs: v.carbs, fat: v.fat, fiber: v.fiber,
      allergens: (v.allergens ?? '').split(',').map((a) => cleanText(a, 30)).filter(Boolean),
      is_veg: isVeg,
      contains_egg: fd.get('contains_egg') === 'on',
      is_active: fd.get('is_active') === 'on',
    }).select('id').single();
    if (error) throw error;
    created.id = row.id;

    const file = fd.get('image');
    if (file instanceof File && file.size > 0) {
      const image_url = await uploadImage(supabase, 'menu-images', file, `dishes/${row.id}`);
      const { error: iErr } = await supabase.from('menu_items').update({ image_url }).eq('id', row.id);
      if (iErr) throw iErr;
    }
    if (v.cost_per_portion !== undefined) {
      const { error: kErr } = await supabase.from('menu_item_costs').upsert({
        menu_item_id: row.id, cost_per_portion: v.cost_per_portion, gas_cost: v.gas_cost ?? 0,
      });
      if (kErr) throw kErr;
    }
    return ok('Dish added.');
  }, { tags: MENU_TAGS });

  // redirect() throws, so it must run outside staffAction's try/catch.
  if (result.ok && created.id) redirect(adminHref(`/menu/dishes/${created.id}?created=1`));
  return result;
}

// ---------------------------------------------------------------------------
// Recipe workbook (migration 0038). The form sends the whole recipe as JSON.
// ---------------------------------------------------------------------------
export async function saveRecipe(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = z.string().uuid().safeParse(fd.get('menu_item_id'));
  if (!id.success) return fail('Invalid dish.');
  let raw: unknown;
  try {
    raw = JSON.parse(String(fd.get('recipe') ?? ''));
  } catch {
    return fail('Could not read the recipe. Refresh and try again.');
  }
  const parsed = recipeSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail(`Check the recipe (${first.path.join(' ')}: ${first.message}).`);
  }
  const r = parsed.data;
  return staffAction('menu.write', async () => {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.from('dish_recipes').upsert({
      menu_item_id: id.data,
      ingredients: r.ingredients.map((i) => ({
        name: cleanText(i.name, 80), qty: i.qty, unit: cleanText(i.unit, 12),
        ...(i.note && { note: cleanText(i.note, 120) }),
      })),
      steps: r.steps.map((s) => cleanText(s, 600)).filter(Boolean),
      prep_minutes: r.prep_minutes,
      cook_minutes: r.cook_minutes,
      equipment: cleanText(r.equipment, 300) || null,
      tips: cleanText(r.tips, 2000) || null,
      notes: cleanText(r.notes, 2000) || null,
    });
    if (error) throw error;
    return ok('Recipe saved. The kitchen sees it straight away.');
  });
}

/** Puts an older version back (the current one is kept as a version too). */
export async function restoreRecipeVersion(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = z.string().uuid().safeParse(fd.get('version_id'));
  if (!id.success) return fail('Invalid version.');
  return staffAction('menu.write', async () => {
    const supabase = await getSupabaseServer();
    const { data: v, error: vErr } = await supabase.from('dish_recipe_versions').select('menu_item_id, snapshot').eq('id', id.data).maybeSingle();
    if (vErr) throw vErr;
    if (!v) return fail('That version no longer exists.');
    const r = toRecipe(v.snapshot as Record<string, unknown>);
    const { error } = await supabase.from('dish_recipes').upsert({ menu_item_id: v.menu_item_id, ...r });
    if (error) throw error;
    return ok('Older version restored.');
  });
}

/** "Checked with mum": the recipe matches how the kitchen really cooks it (kitchen stock trusts it). */
export async function setRecipeVerified(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = z.string().uuid().safeParse(fd.get('menu_item_id'));
  if (!id.success) return fail('Invalid dish.');
  const on = fd.get('on') === '1';
  return staffAction('menu.write', async (staff) => {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase.from('dish_recipes')
      .update(on ? { verified_at: new Date().toISOString(), verified_by: staff.profile.id } : { verified_at: null, verified_by: null })
      .eq('menu_item_id', id.data).select('menu_item_id');
    if (error) throw error;
    if (!data?.length) return fail('Save the recipe first.');
    return ok(on ? 'Marked as checked with mum.' : 'Check removed.');
  });
}
