import { NextResponse, type NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { handleInbound, recordStatuses } from '@/lib/whatsapp/inbound';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Meta WhatsApp Cloud API webhook.
 * Callback URL: https://www.brotinbox.com/api/whatsapp/webhook
 * Verify token: WHATSAPP_WEBHOOK_VERIFY_TOKEN. Payloads are signed with WHATSAPP_APP_SECRET.
 *
 * Logs failed deliveries (e.g. 131042 payment issue, 131026 undeliverable) and
 * template/account status changes to the Vercel runtime logs. Message contents
 * are never logged.
 */

// GET: one-time subscription handshake from the Meta App Dashboard.
export function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (expected && p.get('hub.mode') === 'subscribe' && p.get('hub.verify_token') === expected) {
    return new NextResponse(p.get('hub.challenge') ?? '', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

function validSignature(raw: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith('sha256=')) return false;
  const expected = Buffer.from(createHmac('sha256', secret).update(raw).digest('hex'));
  const got = Buffer.from(header.slice(7));
  return got.length === expected.length && timingSafeEqual(got, expected);
}

const mask = (n?: string) => (n ? `${n.slice(0, 4)}****${n.slice(-2)}` : '?');

type Change = { field?: string; value?: Record<string, any> };

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get('x-hub-signature-256'))) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  let body: { object?: string; entry?: { id?: string; changes?: Change[] }[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse('Bad JSON', { status: 400 });
  }

  for (const entry of body.entry ?? []) {
    for (const { field, value } of entry.changes ?? []) {
      if (!value) continue;

      if (field === 'messages') {
        for (const s of value.statuses ?? []) {
          if (s.status === 'failed') {
            for (const e of s.errors ?? [{}]) {
              console.error('[whatsapp] delivery failed', {
                to: mask(s.recipient_id),
                code: e.code,
                title: e.title,
                details: e.error_data?.details,
                id: s.id,
              });
            }
          } else {
            console.info('[whatsapp] status', s.status, mask(s.recipient_id));
          }
        }
        if (value.messages?.length) {
          console.info('[whatsapp] inbound messages', value.messages.length);
        }
        // Follow-up bookkeeping and reply handling; never let it break the 200 to Meta.
        try {
          if (value.statuses?.length) await recordStatuses(value.statuses);
          if (value.messages?.length) await handleInbound(value.messages, value.contacts ?? []);
        } catch (e) {
          console.error('[whatsapp] webhook handling failed', e);
        }
      } else if (field === 'message_template_status_update') {
        console.warn('[whatsapp] template status', {
          name: value.message_template_name,
          event: value.event,
          reason: value.reason,
        });
      } else {
        console.warn('[whatsapp] event', field, JSON.stringify(value).slice(0, 500));
      }
    }
  }

  // Always 200 quickly; Meta retries non-2xx for days.
  return NextResponse.json({ ok: true });
}
