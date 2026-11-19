import 'server-only';
import { getSupabaseService } from '@/lib/supabase/admin';
import { escapeHtml, sendTelegramMessage } from '@/lib/notifications/telegram';
import { todayIST } from '@/lib/menu/rotation';

/** Statuses that mean "this meal isn't finished yet". */
export const OPEN_DELIVERY_STATUSES = ['scheduled', 'paused', 'locked', 'preparing', 'packed', 'out_for_delivery'] as const;

/**
 * Meals dated before today that were never marked delivered / failed. They keep
 * their plan "active" forever (daily_housekeeping only completes a plan once
 * nothing is open), so the owner gets one Telegram list every morning until
 * they are closed on the Deliveries page. Nothing is auto-closed: delivered vs
 * failed changes meal credits and finance, so a person decides.
 */
export async function alertOpenDeliveries(): Promise<{ open: number; alerted: boolean }> {
  const supabase = getSupabaseService();
  const { data, error } = await supabase
    .from('deliveries')
    .select('delivery_date, slot, status, profiles!deliveries_user_id_fkey(full_name)')
    .lt('delivery_date', todayIST())
    .in('status', [...OPEN_DELIVERY_STATUSES])
    .order('delivery_date')
    .limit(30);
  if (error) throw error;
  const rows = (data ?? []) as unknown as { delivery_date: string; slot: string; status: string; profiles: { full_name: string | null } | null }[];
  if (!rows.length) return { open: 0, alerted: false };

  const lines = rows.map((r) =>
    `• ${r.delivery_date} ${r.slot} · ${escapeHtml(r.profiles?.full_name ?? 'Customer')} · <i>${r.status.replace(/_/g, ' ')}</i>`);
  const alerted = await sendTelegramMessage(
    `⚠️ <b>${rows.length}${rows.length === 30 ? '+' : ''} past meal${rows.length === 1 ? '' : 's'} not closed</b>\n` +
    `Mark them delivered or failed on Deliveries (pick the date). Until then the plan stays active.\n\n${lines.join('\n')}`,
  );
  return { open: rows.length, alerted };
}
