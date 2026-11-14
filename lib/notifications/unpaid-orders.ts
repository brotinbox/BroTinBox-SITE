import 'server-only';
import { getSupabaseService } from '@/lib/supabase/admin';
import { escapeHtml, sendTelegramMessage } from '@/lib/notifications/telegram';

const inr = (n: number | string) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** Orders left unpaid this long get one Telegram nudge. */
const AFTER_MIN = 30;
/** Older than this is stale (expired or abandoned long ago): no alert. */
const WITHIN_HOURS = 24;

/**
 * "Signed in but didn't pay": one Telegram alert per order that has sat in
 * created / pending_payment for 30+ minutes with no UPI reference submitted.
 * Called every 10 minutes by pg_cron → /api/cron/unpaid-orders. Each order is
 * marked in orders.unpaid_alerted_at, so it is never alerted twice.
 */
export async function alertUnpaidOrders(): Promise<{ checked: number; alerted: number }> {
  const supabase = getSupabaseService();
  const now = Date.now();

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, user_id, type, total, metadata, address_snapshot, pricing_snapshot, created_at')
    .in('status', ['created', 'pending_payment'])
    .lte('created_at', new Date(now - AFTER_MIN * 60_000).toISOString())
    .gte('created_at', new Date(now - WITHIN_HOURS * 3_600_000).toISOString())
    .is('unpaid_alerted_at' as never, null)
    .is('metadata->>upi_reference', null)
    .order('created_at', { ascending: true })
    .limit(20);
  if (error) throw error;

  let alerted = 0;
  for (const o of orders ?? []) {
    // Claim first, so overlapping runs never double-alert. Only this column is
    // written, so a UPI reference submitted at the same moment is never lost.
    const { data: claimed } = await supabase
      .from('orders')
      .update({ unpaid_alerted_at: new Date().toISOString() } as never)
      .eq('id', o.id)
      .is('unpaid_alerted_at' as never, null)
      .select('id');
    if (!claimed?.length) continue;

    // Customer already paid a later order (or is mid-retry on a newer one): not
    // worth an alert. Stays claimed, so it leaves the queue instead of being re-checked.
    const { count: newer } = await supabase
      .from('orders').select('id', { count: 'exact', head: true })
      .eq('user_id', o.user_id).gt('created_at', o.created_at)
      .in('status', ['paid', 'created', 'pending_payment']);
    if ((newer ?? 0) > 0) continue;

    const { data: profile } = await supabase.from('profiles').select('full_name, phone, email').eq('id', o.user_id).maybeSingle();
    const addr = (o.address_snapshot ?? {}) as { recipient_name?: string; phone?: string; area?: string; pincode?: string };
    const name = addr.recipient_name || profile?.full_name || 'Customer';
    const phone = (addr.phone || profile?.phone || '').replace(/\D/g, '').slice(-10);
    const schedule = (o.pricing_snapshot as { schedule?: Array<{ date: string }> } | null)?.schedule ?? [];
    const mins = Math.round((now - new Date(o.created_at).getTime()) / 60_000);

    const waText = `Hi ${name.split(' ')[0]}! This is BroTin Box. Your order ${o.order_number} (${inr(o.total)}) is waiting for payment. Need any help finishing it?`;
    const lines = [
      `❌ <b>NOT PAID · ${mins} min</b> · ${escapeHtml(o.order_number)} · <b>${inr(o.total)}</b>`,
      '💳 Customer started checkout but hasn\'t paid. No deliveries are booked.',
      `🍱 ${escapeHtml(o.type)} plan${schedule[0]?.date ? ` · starts ${escapeHtml(schedule[0].date)}` : ''}${schedule.length > 1 ? ` · ${schedule.length} days` : ''}`,
      `👤 ${escapeHtml(name)}${phone ? ` · 📱 ${phone}` : ''}`,
      addr.area || addr.pincode ? `🏠 ${escapeHtml([addr.area, addr.pincode].filter(Boolean).join(' '))}` : null,
      phone ? `💬 <a href="https://wa.me/91${phone}?text=${encodeURIComponent(waText)}">Follow up on WhatsApp</a>` : null,
    ].filter(Boolean);

    if (await sendTelegramMessage(lines.join('\n'))) alerted++;
  }
  return { checked: orders?.length ?? 0, alerted };
}
