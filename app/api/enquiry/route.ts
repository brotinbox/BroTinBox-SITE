import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { BRAND } from '@/config/brand';
import { getSupabaseService } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/security/ratelimit';
import { cleanText, isSameOrigin } from '@/lib/security/request';

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(20),
  area: z.string().max(120).optional(),
  goal: z.string().max(120).optional(),
  diet: z.string().max(40).optional(),
  mealPlan: z.string().max(80).optional(),
  preferredSlot: z.string().max(80).optional(),
  note: z.string().max(2000).optional(),
  website: z.string().max(0).optional(), // honeypot
});

// Telegram Markdown: escape characters that would change formatting.
const md = (s: string) => s.replace(/([_*`[\]])/g, '\\$1');

/**
 * Website enquiry form. Rate limited per IP, validated, stored in
 * public.enquiries (visible in admin › Enquiries) and forwarded to Telegram.
 */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0';
  const rl = await rateLimit('publicForm', ip);
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many enquiries from this network. Please WhatsApp us instead.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Name and a valid phone number are required.' }, { status: 400 });
  const v = parsed.data;
  if (v.website) return NextResponse.json({ success: true }); // bot: pretend success

  const phoneDigits = v.phone.replace(/\D/g, '').slice(-10);
  if (!/^[6-9]\d{9}$/.test(phoneDigits)) {
    return NextResponse.json({ error: 'Please enter a valid 10-digit mobile number.' }, { status: 400 });
  }

  const lead = {
    name: cleanText(v.name, 120),
    phone: `+91${phoneDigits}`,
    area: cleanText(v.area, 120) || null,
    goal: cleanText(v.goal, 120) || null,
    diet: cleanText(v.diet, 40) || null,
    plan_interest: cleanText(v.mealPlan, 80) || null,
    preferred_slot: cleanText(v.preferredSlot, 80) || null,
    note: cleanText(v.note, 2000) || null,
    source: 'website',
    ip_hash: createHash('sha256').update(ip).digest('hex').slice(0, 32),
  };

  const { error } = await getSupabaseService().from('enquiries').insert(lead);
  if (error) {
    console.error('Enquiry insert failed:', error.code);
    return NextResponse.json({ error: 'Could not send your enquiry. Please WhatsApp us.' }, { status: 500 });
  }

  // Telegram notification (best effort; the lead is already saved).
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  let delivered = false;
  if (botToken && chatId) {
    const when = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
    const text = [
      `🥗 *New enquiry · ${md(BRAND.name)}*`,
      `👤 ${md(lead.name)}`,
      `📱 ${lead.phone}`,
      `📍 ${md(lead.area ?? 'Not given')}`,
      lead.goal ? `🎯 ${md(lead.goal)}` : null,
      `🥦 ${md(lead.diet ?? '—')} · 📦 ${md(lead.plan_interest ?? '—')} · ⏰ ${md(lead.preferred_slot ?? '—')}`,
      lead.note ? `📝 ${md(lead.note)}` : null,
      `💬 https://wa.me/91${phoneDigits}`,
      `🕒 ${when} IST`,
    ].filter(Boolean).join('\n');
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', disable_web_page_preview: true }),
        signal: AbortSignal.timeout(5000),
      });
      delivered = res.ok;
    } catch {
      delivered = false;
    }
  }

  return NextResponse.json({ success: true, delivered });
}
