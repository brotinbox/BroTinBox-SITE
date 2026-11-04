import 'server-only';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseService } from '@/lib/supabase/admin';
import { getSupabaseServer } from '@/lib/supabase/server';

const OTP_TTL_MS = 5 * 60_000;
const RESEND_COOLDOWN_MS = 30_000;
const MAX_ATTEMPTS = 5;

// phone_otps is not in the generated Database types yet.
const db = () => getSupabaseService() as unknown as SupabaseClient;

/** Accepts 10-digit Indian mobiles (6-9…), with optional +91 / 91 / 0. Returns +91XXXXXXXXXX. */
export function normalizeIndianPhone(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, '').replace(/^\+/, '');
  const m = digits.match(/^(?:91|0)?([6-9][0-9]{9})$/);
  return m ? `+91${m[1]}` : null;
}

function hash(phone: string, code: string) {
  const secret = process.env.OTP_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createHmac('sha256', secret).update(`${phone}:${code}`).digest('hex');
}

async function sendWhatsApp(phone: string, code: string) {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!id || !token) {
    if (process.env.NODE_ENV === 'production') throw new Error('WhatsApp OTP is not configured');
    console.info(`[dev] WhatsApp OTP for ${phone}: ${code}`);
    return;
  }
  const template = process.env.WHATSAPP_OTP_TEMPLATE || 'login_otp';
  const lang = process.env.WHATSAPP_OTP_LANG || 'en';
  const res = await fetch(`https://graph.facebook.com/v21.0/${id}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone.replace('+', ''),
      type: 'template',
      template: {
        name: template,
        language: { code: lang },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: code }] },
          // Authentication templates with a copy-code button need the code here too.
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
        ],
      },
    }),
  });
  if (!res.ok) {
    console.error('WhatsApp send failed', res.status, await res.text().catch(() => ''));
    throw new Error('Could not send the code');
  }
}

export type SendResult = { ok: true } | { ok: false; error: string; retryAfter?: number };

export async function sendOtp(phone: string): Promise<SendResult> {
  const supabase = db();
  const { data: last } = await supabase
    .schema('otp')
    .from('phone_otps')
    .select('created_at')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last) {
    const wait = RESEND_COOLDOWN_MS - (Date.now() - new Date(last.created_at).getTime());
    if (wait > 0) return { ok: false, error: 'Please wait before requesting another code.', retryAfter: Math.ceil(wait / 1000) };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const { error } = await supabase.schema('otp').from('phone_otps').insert({
    phone,
    code_hash: hash(phone, code),
    channel: 'whatsapp',
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
  });
  if (error) return { ok: false, error: 'Could not send the code. Please try again.' };

  try {
    await sendWhatsApp(phone, code);
  } catch {
    return { ok: false, error: 'Could not send the code on WhatsApp. Please try again.' };
  }
  return { ok: true };
}

export type VerifyResult = { ok: true; userId: string; onboarded: boolean; isNew: boolean } | { ok: false; error: string };

export async function verifyOtp(phone: string, code: string): Promise<VerifyResult> {
  const supabase = db();
  const { data: row } = await supabase
    .schema('otp')
    .from('phone_otps')
    .select('id, code_hash, attempts, expires_at')
    .eq('phone', phone)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const invalid = { ok: false as const, error: 'That code is incorrect or expired.' };
  if (!row || new Date(row.expires_at).getTime() < Date.now() || row.attempts >= MAX_ATTEMPTS) return invalid;

  const expected = Buffer.from(row.code_hash, 'hex');
  const given = Buffer.from(hash(phone, code), 'hex');
  const match = expected.length === given.length && timingSafeEqual(expected, given);
  if (!match) {
    await supabase.schema('otp').from('phone_otps').update({ attempts: row.attempts + 1 }).eq('id', row.id);
    return invalid;
  }

  // Single use: only one concurrent verify can flip consumed_at.
  const { data: claimed } = await supabase
    .schema('otp')
    .from('phone_otps')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', row.id)
    .is('consumed_at', null)
    .select('id');
  if (!claimed?.length) return invalid;

  return signInPhoneUser(phone);
}

/**
 * Finds (or creates) the account for a verified phone and starts a Supabase
 * session on this response's cookies. Matches only profiles whose phone was
 * verified, so an unverified number typed into someone's profile can't hijack
 * a login. Existing Google accounts with a verified phone are reused.
 */
async function signInPhoneUser(phone: string): Promise<VerifyResult> {
  const supabase = db();
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, email, is_blocked, is_onboarded')
    .eq('phone', phone)
    .eq('phone_verified', true)
    .limit(1)
    .maybeSingle();

  let userId: string;
  let email: string;
  let onboarded = false;
  let isNew = false;

  if (existing) {
    if (existing.is_blocked) return { ok: false, error: 'This account has been suspended. Contact us on WhatsApp for help.' };
    userId = existing.id;
    email = existing.email;
    onboarded = !!existing.is_onboarded;
  } else {
    email = `${phone.replace('+', '')}@phone.brotinbox.invalid`;
    const { data: created, error } = await getSupabaseService().auth.admin.createUser({
      email,
      email_confirm: true,
      phone,
      phone_confirm: true,
    });
    if (error || !created.user) return { ok: false, error: 'Could not create your account. Please try again.' };
    userId = created.user.id;
    isNew = true;
    await supabase.from('profiles').update({ phone, phone_verified: true }).eq('id', userId);
  }

  const { data: link, error: linkErr } = await getSupabaseService().auth.admin.generateLink({ type: 'magiclink', email });
  const tokenHash = link?.properties?.hashed_token;
  if (linkErr || !tokenHash) return { ok: false, error: 'Could not sign you in. Please try again.' };

  const server = await getSupabaseServer();
  const { error: sessionErr } = await server.auth.verifyOtp({ type: 'magiclink', token_hash: tokenHash });
  if (sessionErr) return { ok: false, error: 'Could not sign you in. Please try again.' };

  return { ok: true, userId, onboarded, isNew };
}
