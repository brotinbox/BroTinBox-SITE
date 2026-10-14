'use server';

import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import { cleanText } from '@/lib/security/request';
import { fail, ok, staffAction, type ActionResult } from '@/lib/admin/actions';
import { uploadImage } from '@/lib/admin/upload';
import type { Json } from '@/types/database';

async function put(key: string, value: Json, userId: string) {
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from('site_settings').update({ value, updated_by: userId }).eq('key', key);
  if (error) throw error;
}

export async function savePayment(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const upi = cleanText(fd.get('upi_id'), 100);
  if (upi && !/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/.test(upi)) return fail('UPI ID looks wrong (expected name@bank).');
  const mode = z.enum(['cashfree', 'manual_upi']).safeParse(fd.get('mode'));
  if (!mode.success) return fail('Choose how customers pay.');
  return staffAction('settings.write', async (staff) => {
    const supabase = await getSupabaseServer();
    const { data: current } = await supabase.from('site_settings').select('value').eq('key', 'payment').maybeSingle();
    const prev = (current?.value ?? {}) as Record<string, Json>;
    let qr = prev.qr_image_url ?? null;
    const file = fd.get('qr');
    if (file instanceof File && file.size > 0) qr = await uploadImage(supabase, 'blog-images', file, 'payment');
    if (fd.get('remove_qr') === 'on') qr = null;
    await put('payment', {
      mode: mode.data,
      upi_id: upi,
      payee_name: cleanText(fd.get('payee_name'), 80) || 'BroTin Box',
      instructions: cleanText(fd.get('instructions'), 400),
      qr_image_url: qr,
    }, staff.profile.id);
    return ok('Payment details saved. Customers see them on the payment page.');
  }, { tags: ['settings'] });
}

export async function saveOrdering(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const cutoff = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).safeParse(fd.get('cutoff_time'));
  const pause = z.coerce.number().int().min(1).max(90).safeParse(fd.get('max_pause_days'));
  const wa = cleanText(fd.get('support_whatsapp'), 20);
  if (!cutoff.success) return fail('Cutoff must be a time like 21:00.');
  if (!pause.success) return fail('Maximum pause must be 1–90 days.');
  if (wa && !/^\+?\d{10,15}$/.test(wa)) return fail('WhatsApp number should be digits, e.g. +918248606711.');
  return staffAction('settings.write', async (staff) => {
    await put('ordering_open', fd.get('ordering_open') === 'on', staff.profile.id);
    await put('cutoff_time', cutoff.data, staff.profile.id);
    await put('max_pause_days', pause.data, staff.profile.id);
    if (wa) await put('support_whatsapp', wa, staff.profile.id);
    return ok('Ordering settings saved.');
  }, { tags: ['settings'] });
}

export async function saveAnnouncement(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const href = cleanText(fd.get('href'), 200);
  if (href && !/^(https:\/\/|\/)/.test(href)) return fail('Link must start with https:// or /');
  return staffAction('settings.write', async (staff) => {
    await put('announcement', {
      enabled: fd.get('enabled') === 'on',
      text: cleanText(fd.get('text'), 160),
      href: href || null,
    }, staff.profile.id);
    return ok('Announcement saved.');
  }, { tags: ['settings'] });
}

const FLAGS = ['google_login', 'whatsapp_otp', 'autopay', 'coupons', 'reviews', 'rider_app', 'referrals', 'wallet'] as const;

export async function saveFeatures(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return staffAction('settings.write', async (staff) => {
    await put('features', Object.fromEntries(FLAGS.map((f) => [f, fd.get(f) === 'on'])), staff.profile.id);
    return ok('Features saved.');
  }, { tags: ['settings'] });
}
