'use server';

import { refresh } from 'next/cache';
import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseService } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/security/ratelimit';
import { cleanText } from '@/lib/security/request';
import { phoneOtpMode } from '@/lib/auth/otp-mode';
import { escapeHtml, sendTelegramMessage } from '@/lib/notifications/telegram';
import { PARTNER_TERMS_VERSION } from '@/lib/partners/program';
import { partnersTable } from '@/lib/partners/server';

export type PartnerActionResult = { ok: boolean; message?: string };

const fail = (message: string): PartnerActionResult => ({ ok: false, message });

/** Signed-in, not blocked; returns the profile fields the forms need. */
async function me() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('id, full_name, email, phone, phone_verified, is_blocked').eq('id', user.id).maybeSingle();
  if (!data || data.is_blocked) return null;
  return data;
}

const applySchema = z.object({
  fullName: z.string().min(2, 'Enter your full name.').max(80),
  email: z.string().email('Enter a valid email.').max(120),
  gymName: z.string().min(2, 'Enter your gym name.').max(100),
  zone: z.string().regex(/^\d{6}\|.{2,60}$/, 'Pick your gym area.'),
  mapsUrl: z.string().max(300).refine((v) => !v || /^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)\//i.test(v), 'Paste a Google Maps link, or leave it empty.'),
  instagram: z.string().max(60).refine((v) => !v || /^@?[A-Za-z0-9._]{1,30}$/.test(v), 'Enter just your Instagram handle, like @rahul.fit'),
  years: z.coerce.number().int().min(0).max(60),
  clients: z.coerce.number().int().min(0).max(2000),
  pitch: z.string().max(200),
  terms: z.literal('on', { message: 'Please accept the Partner Terms.' }),
});

/** "Become a partner" application. One per account; staff approve it. */
export async function applyAsPartner(_prev: PartnerActionResult | null, fd: FormData): Promise<PartnerActionResult> {
  const profile = await me();
  if (!profile) return fail('Please sign in to apply.');
  const rl = await rateLimit('customerAction', profile.id);
  if (!rl.success) return fail('Too many attempts. Wait a minute and try again.');

  if (!profile.phone) return fail('Add and verify your mobile number first.');
  if (!profile.phone_verified && (await phoneOtpMode()) !== 'off') return fail('Verify your mobile number first (above).');

  const parsed = applySchema.safeParse({
    fullName: cleanText(fd.get('fullName'), 80),
    email: cleanText(fd.get('email'), 120),
    gymName: cleanText(fd.get('gymName'), 100),
    zone: cleanText(fd.get('zone'), 80),
    mapsUrl: cleanText(fd.get('mapsUrl'), 300),
    instagram: cleanText(fd.get('instagram'), 60),
    years: fd.get('years'),
    clients: fd.get('clients'),
    pitch: cleanText(fd.get('pitch'), 200),
    terms: fd.get('terms'),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Please check the form.');
  const v = parsed.data;
  const [pincode, ...areaParts] = v.zone.split('|');
  const area = areaParts.join('|');

  // The area must be one we deliver to (or list as next batch).
  const { data: zone } = await getSupabaseService().from('delivery_zones').select('id').eq('pincode', pincode).eq('area', area).eq('is_active', true).limit(1).maybeSingle();
  if (!zone) return fail('Pick your gym area from the list.');

  const existing = await partnersTable().select('id, status').eq('profile_id', profile.id).maybeSingle();
  if (existing.error) return fail('Applications open shortly. Please message us on WhatsApp.');
  if (existing.data) return fail('You have already applied. We will message you on WhatsApp.');

  const { error } = await partnersTable().insert({
    profile_id: profile.id,
    full_name: v.fullName,
    phone: profile.phone,
    email: v.email,
    gym_name: v.gymName,
    gym_area: area,
    gym_pincode: pincode,
    gym_maps_url: v.mapsUrl || null,
    instagram: v.instagram ? v.instagram.replace(/^@/, '') : null,
    years_training: v.years,
    active_clients: v.clients,
    pitch: v.pitch || null,
    terms_version: PARTNER_TERMS_VERSION,
  });
  if (error) return fail(error.code === '23505' ? 'You have already applied.' : 'Could not send your application. Please try again.');

  await sendTelegramMessage(
    `🏋️ <b>New trainer partner application</b>\n${escapeHtml(v.fullName)} · ${escapeHtml(profile.phone)}\n${escapeHtml(v.gymName)}, ${escapeHtml(area)} ${pincode}\n${v.years} yrs · ~${v.clients} clients${v.instagram ? ` · IG @${escapeHtml(v.instagram.replace(/^@/, ''))}` : ''}\nReview in Admin › Partners.`
  ).catch(() => false);

  refresh();
  return { ok: true, message: 'Application sent.' };
}

const upiSchema = z.object({
  upiId: z.string().regex(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/, 'Enter a valid UPI ID, like name@okicici'),
  upiName: z.string().min(2, 'Enter the name on the UPI account.').max(80),
});

/** Approved (or paused) trainers set where their payouts go. */
export async function savePartnerUpi(_prev: PartnerActionResult | null, fd: FormData): Promise<PartnerActionResult> {
  const profile = await me();
  if (!profile) return fail('Please sign in again.');
  const rl = await rateLimit('customerAction', profile.id);
  if (!rl.success) return fail('Too many attempts. Wait a minute and try again.');

  const parsed = upiSchema.safeParse({ upiId: cleanText(fd.get('upiId'), 120), upiName: cleanText(fd.get('upiName'), 80) });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Please check the details.');

  const { data, error } = await partnersTable()
    .update({ upi_id: parsed.data.upiId.toLowerCase(), upi_name: parsed.data.upiName })
    .eq('profile_id', profile.id).in('status', ['approved', 'paused'])
    .select('id');
  if (error || !data?.length) return fail('Could not save. Please try again.');
  refresh();
  return { ok: true, message: 'UPI details saved.' };
}
