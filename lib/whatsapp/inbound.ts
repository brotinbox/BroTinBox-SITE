import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseService } from '@/lib/supabase/admin';
import { escapeHtml, sendTelegramMessage } from '@/lib/notifications/telegram';
import { sendText } from '@/lib/whatsapp/cloud';

/**
 * Webhook side of WhatsApp follow-ups:
 *  - delivery statuses → crm.whatsapp_messages
 *  - "Stop offers" button / STOP text → offers opt-out + no more trial follow-ups
 *  - "Not for me" button → no more trial follow-ups
 *  - every customer reply is forwarded to the team on Telegram (messages to the
 *    Cloud API number don't appear in a phone's WhatsApp app)
 */

const crm = () => (getSupabaseService() as unknown as SupabaseClient).schema('crm');

type WaStatus = { id?: string; status?: string; recipient_id?: string; errors?: { code?: number; title?: string }[] };
type WaMessage = {
  from?: string;
  type?: string;
  text?: { body?: string };
  button?: { payload?: string; text?: string };
  interactive?: { button_reply?: { id?: string; title?: string } };
};
type WaContact = { wa_id?: string; profile?: { name?: string } };

const STATUS_RANK: Record<string, number> = { queued: 0, sent: 1, delivered: 2, read: 3, failed: 4 };
const STOP_WORDS = /^\s*(stop|unsubscribe|stop offers)\s*[.!]*\s*$/i;

export async function recordStatuses(statuses: WaStatus[]) {
  for (const s of statuses) {
    if (!s.id || !s.status || !(s.status in STATUS_RANK)) continue;
    const { data: row } = await crm().from('whatsapp_messages').select('id, status').eq('wa_message_id', s.id).maybeSingle();
    if (!row) continue; // not one of ours (e.g. a login code)
    // Statuses can arrive out of order; never move backwards (read → delivered).
    if (s.status !== 'failed' && (STATUS_RANK[row.status] ?? 0) >= STATUS_RANK[s.status]) continue;
    const e = s.errors?.[0];
    await crm().from('whatsapp_messages').update({
      status: s.status,
      ...(s.status === 'failed' && { error_code: e?.code ?? null, error_title: (e?.title ?? '').slice(0, 200) || null }),
    }).eq('id', row.id);
  }
}

export async function handleInbound(messages: WaMessage[], contacts: WaContact[]) {
  const db = getSupabaseService();
  for (const m of messages) {
    const phone10 = (m.from ?? '').replace(/\D/g, '').slice(-10);
    if (phone10.length !== 10) continue;

    const payload = m.button?.payload ?? m.interactive?.button_reply?.id ?? '';
    const text = (m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? '').trim();
    const stopOffers = payload === 'STOP_OFFERS' || STOP_WORDS.test(text);
    const notForMe = payload === 'NOT_FOR_ME';

    const { data: profile } = await db.from('profiles').select('id, full_name')
      .in('phone', [`+91${phone10}`, `91${phone10}`, phone10]).eq('phone_verified', true).limit(1).maybeSingle();

    if ((stopOffers || notForMe) && profile) {
      await crm().from('trial_claims').update({ followup_opt_out: true }).eq('user_id', profile.id);
      if (stopOffers) {
        await db.from('profiles').update({ whatsapp_offers_opt_in: false, whatsapp_offers_opt_in_at: null }).eq('id', profile.id);
      }
    }
    // The customer just wrote to us, so a plain reply is allowed (24-hour window).
    if (stopOffers) {
      await sendText(phone10, "Done, you won't get offers from us any more. You'll still get updates about your orders and deliveries.");
    } else if (notForMe) {
      await sendText(phone10, "Thanks for trying us and for telling us. If you have a moment, reply with what we could do better. It really helps.");
    }

    const name = profile?.full_name || contacts.find((c) => c.wa_id?.endsWith(phone10))?.profile?.name || 'Customer';
    const what = stopOffers ? '🚫 Stopped offers' : notForMe ? '👎 Not for me' : payload === 'LOVED_IT' ? '😍 Loved it' : payload === 'IT_WAS_OKAY' ? '🙂 It was okay' : null;
    const adminBase = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.brotinbox.com'}/${process.env.ADMIN_PATH || 'admin'}`;
    await sendTelegramMessage([
      `💬 <b>WhatsApp reply</b> from ${escapeHtml(name)} (+91 ${phone10})`,
      what ? `<b>${what}</b>` : '',
      text && !what ? `“${escapeHtml(text.slice(0, 500))}”` : '',
      m.type && !['text', 'button', 'interactive'].includes(m.type) ? `<i>(${escapeHtml(m.type)} message)</i>` : '',
      profile ? `🔗 <a href="${adminBase}/customers/${profile.id}">Customer in admin</a>` : '',
      `↩️ Reply within 24 h from WhatsApp Manager or the Cloud API inbox.`,
    ].filter(Boolean).join('\n')).catch(() => false);
  }
}
