'use server';

import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/security/ratelimit';
import { cleanText } from '@/lib/security/request';

/**
 * Quick start: goal and diet only, both optional. Body stats, allergies and
 * the delivery address are collected later (profile page / checkout), so a
 * new customer reaches the menu and payment in one screen.
 */
const schema = z.object({
  fullName: z.string().trim().max(80).optional(),
  phone: z.string().regex(/^([6-9]\d{9})?$/, 'Enter a 10-digit Indian mobile number').optional(),
  goal: z.enum(['fat-loss', 'muscle-gain', 'stay-fit', 'elderly-care']).optional(),
  dietType: z.enum(['veg', 'non-veg', 'eggetarian']).optional(),
});

export type QuickStartInput = z.infer<typeof schema>;
export type QuickStartResult = { ok: true } | { ok: false; error: string };

export async function quickStart(input: QuickStartInput): Promise<QuickStartResult> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Please sign in again.' };

  const rl = await rateLimit('customerAction', user.id);
  if (!rl.success) return { ok: false, error: 'Too many attempts. Wait a minute and try again.' };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check your details.' };
  const v = parsed.data;

  const name = cleanText(v.fullName, 80);
  const { error } = await supabase.from('profiles').update({
    ...(name.length >= 2 && { full_name: name }),
    ...(v.phone && { phone: `+91${v.phone}`, whatsapp_opt_in: true }),
    ...(v.goal && { goal: v.goal }),
    ...(v.dietType && { diet_type: v.dietType }),
    is_onboarded: true,
  }).eq('id', user.id);
  if (error) return { ok: false, error: 'Could not save. Please try again.' };
  return { ok: true };
}
