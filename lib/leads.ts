import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseService } from '@/lib/supabase/admin';
import { escapeHtml, sendTelegramMessage } from '@/lib/notifications/telegram';

/**
 * Phone leads (otp.phone_leads, service role only): numbers that asked for a login code, what
 * they were looking at, and how far they got. Every helper here is
 * best-effort: a failure is logged and never breaks sign-in or checkout.
 */

// phone_leads is not in the generated Database types yet.
const db = () => (getSupabaseService() as unknown as SupabaseClient).schema('otp');

/** For admin pages: call only after a staff permission check. */
export const leadsTable = () => db().from('phone_leads');

export type LeadContext = {
  flow?: string;      // trial | weekly | monthly | …
  summary?: string;   // human line, e.g. "Non-veg trial · lunch · 2026-11-06"
  area?: string;
  pincode?: string;
};

const clean = (v: unknown, max: number) =>
  typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max) || undefined : undefined;

/** Validates untrusted lead context from the browser. */
export function parseLeadContext(raw: unknown): LeadContext | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const ctx: LeadContext = {
    flow: clean(r.flow, 20),
    summary: clean(r.summary, 160),
    area: clean(r.area, 60),
    pincode: typeof r.pincode === 'string' && /^\d{6}$/.test(r.pincode) ? r.pincode : undefined,
  };
  return Object.values(ctx).some(Boolean) ? ctx : null;
}

export function parseSource(raw: unknown): string | null {
  return typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') ? raw.slice(0, 120) : null;
}

export async function trackLeadRequest(phone: string, source: string | null, context: LeadContext | null) {
  const { error } = await db().rpc('track_phone_lead', { p_phone: phone, p_source: source, p_context: context });
  if (error) console.error('[leads] track failed', error.message);
}

export async function markLeadVerified(phone: string, userId: string) {
  const { error } = await db()
    .from('phone_leads')
    .update({ user_id: userId, verified_at: new Date().toISOString() })
    .eq('phone', phone)
    .is('verified_at', null);
  if (error) console.error('[leads] verify mark failed', error.message);
}

export async function markLeadOrdered(userId: string, orderId: string) {
  const { error } = await db()
    .from('phone_leads')
    .update({ ordered_at: new Date().toISOString(), order_id: orderId })
    .eq('user_id', userId)
    .is('ordered_at', null);
  if (error) console.error('[leads] order mark failed', error.message);
}

/** Telegram ping for a brand-new account (phone or Google). */
export async function notifyNewSignup(opts: {
  method: 'phone' | 'google';
  phone?: string | null;
  email?: string | null;
  name?: string | null;
  source?: string | null;
  context?: LeadContext | null;
}) {
  const lines = [
    `🆕 <b>New signup</b> (${opts.method === 'phone' ? 'WhatsApp OTP' : 'Google'})`,
    opts.name ? `👤 ${escapeHtml(opts.name)}` : null,
    opts.phone ? `📱 ${escapeHtml(opts.phone)}` : null,
    opts.email && !opts.email.endsWith('.invalid') ? `✉️ ${escapeHtml(opts.email)}` : null,
    opts.source ? `📍 Started on ${escapeHtml(opts.source)}` : null,
    opts.context?.summary ? `🛒 ${escapeHtml(opts.context.summary)}` : null,
    opts.context?.area || opts.context?.pincode
      ? `🏠 ${escapeHtml([opts.context.area, opts.context.pincode].filter(Boolean).join(' '))}`
      : null,
  ].filter(Boolean);
  await sendTelegramMessage(lines.join('\n'));
}

/** Reads the stored lead row for a phone (source + context) for the signup ping. */
export async function getLead(phone: string): Promise<{ source: string | null; context: LeadContext | null } | null> {
  const { data } = await db().from('phone_leads').select('source, context').eq('phone', phone).maybeSingle();
  return data ? { source: data.source, context: data.context } : null;
}
