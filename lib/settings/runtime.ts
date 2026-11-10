import 'server-only';
import { unstable_cache } from 'next/cache';
import { getSupabaseService } from '@/lib/supabase/admin';

/**
 * Switches that used to live in Vercel env vars and are now edited in
 * admin → Settings. Stored in site_settings as private rows (is_public = false),
 * read with the service client and cached under RUNTIME_SETTINGS_TAG.
 *
 * Order of precedence: value saved in admin → env var → safe default.
 * Secrets (tokens, keys) stay in env and never come through here.
 */

export const RUNTIME_SETTINGS_TAG = 'runtime-settings';
export const PHONE_OTP_KEY = 'phone_otp';
export const ALERTS_KEY = 'alerts';
export const CASHFREE_KEY = 'cashfree';

export type PhoneOtpMode = 'off' | 'test' | 'on';
export type PhoneOtpSettings = { mode: PhoneOtpMode; test_numbers: string[]; template: string; lang: string };
export type AlertSettings = { telegram_chat_id: string };
export type CashfreeMode = 'sandbox' | 'production';

/** 10-digit Indian mobile (6-9…), or null. */
export function tenDigitMobile(input: string): string | null {
  const m = input.replace(/[\s()-]/g, '').replace(/^\+/, '').match(/^(?:91|0)?([6-9][0-9]{9})$/);
  return m ? m[1] : null;
}

const asMode = (v: unknown): PhoneOtpMode | null => {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
  return s === 'on' || s === 'test' || s === 'off' ? s : null;
};

async function readRow(key: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await getSupabaseService().from('site_settings').select('value').eq('key', key).maybeSingle();
  if (error) throw error; // not cached; caller falls back to env
  const v = data?.value;
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

const readCached = unstable_cache(readRow, ['runtime-setting'], { tags: [RUNTIME_SETTINGS_TAG, 'settings'], revalidate: 3600 });

/** Saved row, or null if missing / unreadable. `fresh` skips the cache (admin screens). */
async function readSetting(key: string, fresh = false) {
  try {
    return await (fresh ? readRow(key) : readCached(key));
  } catch (e) {
    console.error(`[settings] could not read ${key}`, (e as { message?: string })?.message);
    return null;
  }
}

function envPhoneOtp(): PhoneOtpSettings {
  return {
    mode: asMode(process.env.PHONE_OTP_MODE) ?? 'off',
    test_numbers: (process.env.PHONE_OTP_TEST_NUMBERS || '').split(',').map((n) => tenDigitMobile(n)).filter((n): n is string => !!n),
    template: process.env.WHATSAPP_OTP_TEMPLATE || 'login_otp',
    lang: process.env.WHATSAPP_OTP_LANG || 'en',
  };
}

export async function getPhoneOtpSettings(opts: { fresh?: boolean } = {}): Promise<PhoneOtpSettings & { source: 'admin' | 'env' }> {
  const env = envPhoneOtp();
  const saved = await readSetting(PHONE_OTP_KEY, opts.fresh);
  if (!saved) return { ...env, source: 'env' };
  const nums = Array.isArray(saved.test_numbers)
    ? saved.test_numbers.map((n) => (typeof n === 'string' ? tenDigitMobile(n) : null)).filter((n): n is string => !!n)
    : env.test_numbers;
  return {
    mode: asMode(saved.mode) ?? env.mode,
    test_numbers: nums,
    template: typeof saved.template === 'string' && saved.template ? saved.template : env.template,
    lang: typeof saved.lang === 'string' && saved.lang ? saved.lang : env.lang,
    source: 'admin',
  };
}

export async function getAlertSettings(opts: { fresh?: boolean } = {}): Promise<AlertSettings & { source: 'admin' | 'env' }> {
  const env = process.env.TELEGRAM_CHAT_ID || '';
  const saved = await readSetting(ALERTS_KEY, opts.fresh);
  const id = typeof saved?.telegram_chat_id === 'string' ? saved.telegram_chat_id.trim() : '';
  return id ? { telegram_chat_id: id, source: 'admin' } : { telegram_chat_id: env, source: 'env' };
}

/**
 * Cashfree Test / Live switch. Admin value → NEXT_PUBLIC_CASHFREE_ENV → sandbox.
 * The keys themselves stay in Vercel (see lib/cashfree.ts).
 */
export async function getCashfreeSettings(opts: { fresh?: boolean } = {}): Promise<{ mode: CashfreeMode; source: 'admin' | 'env' }> {
  const saved = await readSetting(CASHFREE_KEY, opts.fresh);
  if (saved?.mode === 'production' || saved?.mode === 'sandbox') return { mode: saved.mode, source: 'admin' };
  return { mode: process.env.NEXT_PUBLIC_CASHFREE_ENV === 'production' ? 'production' : 'sandbox', source: 'env' };
}

/** Whether the WhatsApp sender credentials are present (they stay in Vercel). */
export function whatsappSenderConfigured(): boolean {
  return !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
}
