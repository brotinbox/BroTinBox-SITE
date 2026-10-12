'use server';

import { refresh } from 'next/cache';
import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/security/ratelimit';
import { cleanText } from '@/lib/security/request';
import { ageFromDob, targetsFor } from '@/lib/customer/profile-completion';

/**
 * Customer self-service. Every change goes through the same security-definer
 * database functions staff use, which check ownership, the 9 PM cutoff and
 * the meal-credit rules. Nothing here trusts the browser.
 */
export type CustomerResult = { ok: boolean; message?: string } | null;

const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function me() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const rl = await rateLimit('customerAction', user.id);
  if (!rl.success) return 'limited' as const;
  return { supabase, userId: user.id };
}

function friendly(msg: string | undefined) {
  if (!msg) return 'Something went wrong. Please try again.';
  if (/cutoff passed/i.test(msg)) return 'Too late to change this day. Changes close at 9 PM the night before.';
  if (/not allowed/i.test(msg)) return 'You cannot change this.';
  if (msg.length < 160 && !/relation|column|syntax/i.test(msg)) return msg;
  return 'Something went wrong. Please try again.';
}

async function run(fn: (ctx: { supabase: Awaited<ReturnType<typeof getSupabaseServer>>; userId: string }) => Promise<string>): Promise<CustomerResult> {
  const ctx = await me();
  if (!ctx) return { ok: false, message: 'Please sign in again.' };
  if (ctx === 'limited') return { ok: false, message: 'Too many changes. Wait a minute and try again.' };
  try {
    const message = await fn(ctx);
    refresh();
    return { ok: true, message };
  } catch (e) {
    return { ok: false, message: friendly((e as { message?: string }).message) };
  }
}

export async function skipMeal(_p: CustomerResult, fd: FormData): Promise<CustomerResult> {
  const id = uuid.safeParse(fd.get('delivery_id'));
  const undo = fd.get('undo') === 'true';
  if (!id.success) return { ok: false, message: 'Invalid meal.' };
  return run(async ({ supabase }) => {
    const { data, error } = undo
      ? await supabase.rpc('unskip_delivery', { p_delivery: id.data })
      : await supabase.rpc('skip_delivery', { p_delivery: id.data });
    if (error) throw error;
    return undo ? 'Meal restored.' : `Skipped. We added a make-up meal on ${(data as { make_up_date?: string })?.make_up_date ?? 'the end of your plan'}.`;
  });
}

export async function customiseMeal(_p: CustomerResult, fd: FormData): Promise<CustomerResult> {
  const id = uuid.safeParse(fd.get('delivery_id'));
  if (!id.success) return { ok: false, message: 'Invalid meal.' };
  return run(async ({ supabase }) => {
    const { error } = await supabase.rpc('customise_delivery', {
      p_delivery: id.data,
      p_is_egg_free: fd.get('is_egg_free') === 'on',
      p_skip_legume: fd.get('skip_legume') === 'on',
    });
    if (error) throw error;
    return 'Saved for this meal.';
  });
}

export async function pausePlan(_p: CustomerResult, fd: FormData): Promise<CustomerResult> {
  const sub = uuid.safeParse(fd.get('subscription_id'));
  const from = isoDate.safeParse(fd.get('from'));
  const until = isoDate.safeParse(fd.get('until'));
  if (!sub.success || !from.success || !until.success) return { ok: false, message: 'Choose the first and last day of your pause.' };
  return run(async ({ supabase }) => {
    const { data, error } = await supabase.rpc('pause_subscription', { p_sub: sub.data, p_from: from.data, p_until: until.data });
    if (error) throw error;
    return `Paused. ${(data as { paused_meals?: number })?.paused_meals ?? 0} meals moved to the end of your plan.`;
  });
}

export async function resumePlan(_p: CustomerResult, fd: FormData): Promise<CustomerResult> {
  const sub = uuid.safeParse(fd.get('subscription_id'));
  if (!sub.success) return { ok: false, message: 'Invalid plan.' };
  return run(async ({ supabase }) => {
    const { error } = await supabase.rpc('resume_subscription', { p_sub: sub.data });
    if (error) throw error;
    return 'Welcome back! Your meals are scheduled again.';
  });
}

export async function cancelPlan(_p: CustomerResult, fd: FormData): Promise<CustomerResult> {
  const sub = uuid.safeParse(fd.get('subscription_id'));
  const reason = cleanText(fd.get('reason'), 500);
  if (!sub.success) return { ok: false, message: 'Invalid plan.' };
  if (!reason) return { ok: false, message: 'Tell us briefly why you are cancelling.' };
  return run(async ({ supabase }) => {
    const { error } = await supabase.rpc('cancel_subscription', { p_sub: sub.data, p_reason: reason });
    if (error) throw error;
    return 'Your plan is cancelled. Our team will contact you about any unused meals.';
  });
}

// Blank form fields arrive as '' — treat them as "not provided".
const blank = (v: unknown) => (v === '' || v == null ? undefined : v);
const optNum = (min: number, max: number) => z.preprocess(blank, z.coerce.number().min(min).max(max).optional());

const profileSchema = z.object({
  full_name: z.string().trim().min(2).max(80),
  phone: z.preprocess(blank, z.string().regex(/^[6-9]\d{9}$/, 'Enter a 10-digit mobile number').optional()),
  goal: z.enum(['fat-loss', 'muscle-gain', 'stay-fit', 'elderly-care']),
  diet_type: z.enum(['veg', 'non-veg', 'eggetarian']),
  gender: z.preprocess(blank, z.enum(['male', 'female', 'other']).optional()),
  age: z.preprocess(blank, z.coerce.number().int().min(18, 'You must be 18 or older to use BroTin Box.').max(100).optional()),
  weight_kg: optNum(25, 300),
  target_weight_kg: optNum(25, 300),
  height_cm: optNum(100, 250),
  activity_level: z.preprocess(blank, z.enum(['sedentary', 'lightly-active', 'moderately-active', 'very-active']).optional()),
  allergies: z.string().max(200).optional(),
});

export async function updateProfile(_p: CustomerResult, fd: FormData): Promise<CustomerResult> {
  const v = profileSchema.safeParse(Object.fromEntries(fd));
  if (!v.success) return { ok: false, message: v.error.issues[0]?.message ?? 'Check your details.' };
  const d = v.data;
  return run(async ({ supabase, userId }) => {
    const { data: current } = await supabase.from('profiles').select('date_of_birth').eq('id', userId).maybeSingle();
    // Keep the stored birth date if the age it implies hasn't changed.
    const dob = d.age == null ? null
      : ageFromDob(current?.date_of_birth ?? null) === d.age ? current!.date_of_birth
      : `${new Date().getFullYear() - d.age}-07-01`; // age only is collected; mid-year keeps it accurate to ±6 months
    const targets = targetsFor({
      goal: d.goal, gender: d.gender ?? null, age: d.age ?? null,
      heightCm: d.height_cm ?? null, weightKg: d.weight_kg ?? null, activityLevel: d.activity_level ?? null,
    });
    const { error } = await supabase.from('profiles').update({
      full_name: cleanText(d.full_name, 80),
      phone: d.phone ? `+91${d.phone}` : null,
      goal: d.goal,
      diet_type: d.diet_type,
      gender: d.gender ?? null,
      date_of_birth: dob,
      weight_kg: d.weight_kg ?? null,
      target_weight_kg: d.target_weight_kg ?? null,
      height_cm: d.height_cm ?? null,
      activity_level: d.activity_level ?? null,
      allergies: (d.allergies ?? '').split(',').map((a) => cleanText(a, 30)).filter(Boolean).slice(0, 12),
      whatsapp_opt_in: fd.get('whatsapp_opt_in') === 'on',
      target_calories: targets?.target_calories ?? null,
      target_protein: targets?.target_protein ?? null,
      target_carbs: targets?.target_carbs ?? null,
      target_fat: targets?.target_fat ?? null,
      is_onboarded: true,
    }).eq('id', userId);
    if (error) throw error;
    return targets
      ? `Saved. Your daily target: ${targets.target_calories} kcal · ${targets.target_protein} g protein.`
      : 'Saved. Add age, height and weight to get your calorie and protein targets.';
  });
}

export async function deleteAddress(_p: CustomerResult, fd: FormData): Promise<CustomerResult> {
  const id = uuid.safeParse(fd.get('address_id'));
  if (!id.success) return { ok: false, message: 'Invalid address.' };
  return run(async ({ supabase }) => {
    const { error } = await supabase.from('addresses').delete().eq('id', id.data);
    if (error) throw new Error('This address is used by a plan, so it cannot be removed. Add a new one and make it default instead.');
    return 'Address removed.';
  });
}

export async function makeDefaultAddress(_p: CustomerResult, fd: FormData): Promise<CustomerResult> {
  const id = uuid.safeParse(fd.get('address_id'));
  if (!id.success) return { ok: false, message: 'Invalid address.' };
  return run(async ({ supabase, userId }) => {
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId);
    const { error } = await supabase.from('addresses').update({ is_default: true }).eq('id', id.data);
    if (error) throw error;
    return 'Default address updated. Future plans use it.';
  });
}

export async function logWeight(_p: CustomerResult, fd: FormData): Promise<CustomerResult> {
  const weight = z.coerce.number().min(25).max(300).safeParse(fd.get('weight_kg'));
  const date = isoDate.safeParse(fd.get('log_date'));
  if (!weight.success || !date.success) return { ok: false, message: 'Enter your weight (25–300 kg) and the date.' };
  return run(async ({ supabase, userId }) => {
    const { error } = await supabase.from('progress_logs').upsert(
      { user_id: userId, log_date: date.data, weight_kg: weight.data, note: cleanText(fd.get('note'), 200) || null },
      { onConflict: 'user_id,log_date' }
    );
    if (error) throw error;
    return 'Logged.';
  });
}
