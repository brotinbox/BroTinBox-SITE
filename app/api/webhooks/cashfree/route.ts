import { NextResponse, type NextRequest } from 'next/server';
import { verifyWebhookSignature } from '@/lib/cashfree';
import { syncOrderFromCashfree } from '@/lib/payments/cashfree-checkout';
import { getSupabaseService } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cashfree PG webhook (payment success / failed / user dropped, refunds).
 * The payload only tells us WHICH order changed; the status is re-read from
 * the Cashfree API, so a replayed or reordered webhook can't do harm.
 * Non-2xx makes Cashfree retry, so only real processing errors return 500.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const timestamp = req.headers.get('x-webhook-timestamp');
  if (!verifyWebhookSignature(raw, timestamp, req.headers.get('x-webhook-signature'))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let payload: { type?: string; data?: { order?: { order_id?: string }; payment?: { cf_payment_id?: string | number }; refund?: { cf_refund_id?: string | number } } };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  const type = payload.type ?? 'unknown';
  const cfOrderId = payload.data?.order?.order_id;
  const ref = payload.data?.payment?.cf_payment_id ?? payload.data?.refund?.cf_refund_id ?? timestamp;
  const eventId = `${type}:${cfOrderId ?? '-'}:${ref}`;
  const db = getSupabaseService();

  const { error: insertError } = await db.from('webhook_events').insert({
    provider: 'cashfree', event_id: eventId, event_type: type, payload: payload as Json,
  });
  if (insertError) {
    if (insertError.code !== '23505') {
      console.error('[Cashfree webhook] store failed', insertError);
      return NextResponse.json({ error: 'store failed' }, { status: 500 });
    }
    // Seen before: skip if it was handled, otherwise retry the processing.
    const { data: seen } = await db.from('webhook_events').select('processed_at')
      .eq('provider', 'cashfree').eq('event_id', eventId).maybeSingle();
    if (seen?.processed_at) return NextResponse.json({ ok: true, duplicate: true });
  }

  const finish = (error: string | null) =>
    db.from('webhook_events').update({ processed_at: error ? null : new Date().toISOString(), error })
      .eq('provider', 'cashfree').eq('event_id', eventId);

  // Dashboard test events and orders from other systems: acknowledge and stop.
  const { data: order } = cfOrderId
    ? await db.from('orders').select('id').eq('cf_order_id', cfOrderId).maybeSingle()
    : { data: null };
  if (!order) {
    await finish(null);
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    await syncOrderFromCashfree(order.id);
    await finish(null);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[Cashfree webhook] processing failed', e);
    await finish(e instanceof Error ? e.message.slice(0, 500) : 'processing failed');
    return NextResponse.json({ error: 'processing failed' }, { status: 500 });
  }
}
