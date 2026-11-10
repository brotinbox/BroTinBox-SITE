'use server';

import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import { cleanText } from '@/lib/security/request';
import { fail, ok, staffAction, type ActionResult } from '@/lib/admin/actions';
import { uploadImage } from '@/lib/admin/upload';
import type { Json } from '@/types/database';
import { updateTag } from 'next/cache';
import { sendOtp } from '@/lib/auth/otp';
import { escapeHtml, sendTelegramMessage } from '@/lib/notifications/telegram';
import { cashfreeKeys } from '@/lib/cashfree';
import { ALERTS_KEY, CASHFREE_KEY, PHONE_OTP_KEY, RUNTIME_SETTINGS_TAG, tenDigitMobile, whatsappSenderConfigured } from '@/lib/settings/runtime';

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

// whatsapp_otp moved to its own card (savePhoneOtp below).
const FLAGS = ['google_login', 'autopay', 'coupons', 'reviews', 'rider_app', 'referrals', 'wallet'] as const;

export async function saveFeatures(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return staffAction('settings.write', async (staff) => {
    await put('features', Object.fromEntries(FLAGS.map((f) => [f, fd.get(f) === 'on'])), staff.profile.id);
    return ok('Features saved.');
  }, { tags: ['settings'] });
}

/** Private runtime settings (not readable by customers); takes effect on the next request. */
async function putPrivate(key: string, value: Json, userId: string) {
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from('site_settings')
    .upsert({ key, value, is_public: false, updated_by: userId }, { onConflict: 'key' });
  if (error) throw error;
  updateTag(RUNTIME_SETTINGS_TAG);
}

const OTP_TEMPLATE_RE = /^[a-z0-9_]{1,512}$/;
const LANG_RE = /^[a-z]{2,3}(_[A-Z]{2})?$/;

export async function savePhoneOtp(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const mode = z.enum(['off', 'test', 'on']).safeParse(fd.get('mode'));
  if (!mode.success) return fail('Choose Off, Test or Live.');
  const raw = String(fd.get('test_numbers') ?? '').split(/[\s,]+/).filter(Boolean);
  const numbers = raw.map(tenDigitMobile);
  const bad = raw.filter((_, i) => !numbers[i]);
  if (bad.length) return fail(`Not a valid Indian mobile: ${bad.slice(0, 3).join(', ')}`);
  if (mode.data === 'test' && !numbers.length) return fail('Add at least one test number for Test mode.');
  const template = cleanText(fd.get('template'), 512) || 'login_otp';
  if (!OTP_TEMPLATE_RE.test(template)) return fail('Template name: lowercase letters, numbers and _ only (as in WhatsApp Manager).');
  const lang = cleanText(fd.get('lang'), 10) || 'en';
  if (!LANG_RE.test(lang)) return fail('Language code looks wrong (e.g. en or en_US).');
  if (mode.data !== 'off' && !whatsappSenderConfigured()) {
    return fail('WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN are not set in Vercel, so codes cannot be sent. Keep it Off until they are.');
  }

  return staffAction('settings.write', async (staff) => {
    await putPrivate(PHONE_OTP_KEY, {
      mode: mode.data,
      test_numbers: [...new Set(numbers as string[])].slice(0, 20),
      template,
      lang,
    }, staff.profile.id);
    return ok(mode.data === 'on'
      ? 'Saved. Phone sign-in is live for every customer.'
      : mode.data === 'test'
        ? 'Saved. Only the test numbers can sign in with a code (on /login?otp=1).'
        : 'Saved. Phone sign-in is off; customers use Google.');
  });
}

/** Sends a real login code to a number, using the saved template, to check WhatsApp delivery. */
export async function sendTestOtp(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ten = tenDigitMobile(String(fd.get('phone') ?? ''));
  if (!ten) return fail('Enter a valid 10-digit mobile.');
  if (!whatsappSenderConfigured()) return fail('WhatsApp sender is not configured in Vercel.');
  return staffAction('settings.write', async () => {
    const r = await sendOtp(`+91${ten}`);
    if (!r.ok) return fail(r.error);
    return ok(`Code sent to ${ten} on WhatsApp. If it does not arrive, check the template name and that it is approved.`);
  });
}

/** Cashfree Test / Live switch. Keys stay in Vercel; this only picks which pair is used. */
export async function saveCashfreeMode(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const mode = z.enum(['sandbox', 'production']).safeParse(fd.get('mode'));
  if (!mode.success) return fail('Choose Test or Live.');
  if (!cashfreeKeys(mode.data)) {
    return fail(mode.data === 'production'
      ? 'Live keys are not set in Vercel (CASHFREE_APP_ID + CASHFREE_SECRET_KEY from Cashfree Production mode). Add them and redeploy first.'
      : 'Test keys are not set in Vercel (CASHFREE_TEST_APP_ID + CASHFREE_TEST_SECRET_KEY). Add them and redeploy first.');
  }
  return staffAction('settings.write', async (staff) => {
    await putPrivate(CASHFREE_KEY, { mode: mode.data }, staff.profile.id);
    return ok(mode.data === 'production'
      ? 'Saved. Cashfree is LIVE: customers are charged real money.'
      : 'Saved. Cashfree is in TEST mode: no real money is charged.');
  });
}

export async function saveAlerts(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const chat = cleanText(fd.get('telegram_chat_id'), 64);
  if (chat && !/^(-?\d{5,20}|@[A-Za-z0-9_]{5,32})$/.test(chat)) {
    return fail('Telegram chat ID is a number like -1001234567890 (groups start with -), or @channelname.');
  }
  return staffAction('settings.write', async (staff) => {
    await putPrivate(ALERTS_KEY, { telegram_chat_id: chat }, staff.profile.id);
    return ok(chat ? 'Saved. New alerts go to this chat.' : 'Cleared. Alerts use TELEGRAM_CHAT_ID from Vercel.');
  });
}

export async function sendTestAlert(_p: ActionResult | null, _fd: FormData): Promise<ActionResult> {
  return staffAction('settings.write', async (staff) => {
    const sent = await sendTelegramMessage(`✅ <b>Test alert</b>\nSent from admin settings by ${escapeHtml(staff.profile.full_name || 'staff')}.`);
    return sent ? ok('Test alert sent. Check the Telegram chat.') : fail('Could not send. Check the chat ID, and that the bot is a member of that chat.');
  });
}
