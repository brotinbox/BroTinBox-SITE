import 'server-only';

/**
 * WhatsApp Cloud API: send an approved template, or a free-form text reply
 * (free-form only works within 24 hours of the customer's last message).
 */

const GRAPH = 'https://graph.facebook.com/v21.0';

export type WaSendResult = { ok: true; id: string } | { ok: false; code?: number; title: string };

function config() {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  return id && token ? { id, token } : null;
}

/** "9876543210" / "+919876543210" → "919876543210" (WhatsApp's format). */
export const toWaId = (phone: string) => `91${phone.replace(/\D/g, '').slice(-10)}`;

async function post(payload: Record<string, unknown>): Promise<WaSendResult> {
  const cfg = config();
  if (!cfg) return { ok: false, title: 'WhatsApp is not configured' };
  try {
    const res = await fetch(`${GRAPH}/${cfg.id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
    });
    const json = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { code?: number; message?: string } };
    const id = json.messages?.[0]?.id;
    if (res.ok && id) return { ok: true, id };
    return { ok: false, code: json.error?.code, title: (json.error?.message ?? `HTTP ${res.status}`).slice(0, 200) };
  } catch (e) {
    return { ok: false, title: e instanceof Error ? e.message.slice(0, 200) : 'network error' };
  }
}

export function sendTemplate(phone: string, name: string, language: string, opts: {
  body?: string[];
  /** Payloads for the template's quick-reply buttons, in button order (they come back in the webhook). */
  quickReplies?: { index: number; payload: string }[];
}): Promise<WaSendResult> {
  const components: Record<string, unknown>[] = [];
  if (opts.body?.length) components.push({ type: 'body', parameters: opts.body.map((text) => ({ type: 'text', text })) });
  for (const q of opts.quickReplies ?? []) {
    components.push({ type: 'button', sub_type: 'quick_reply', index: String(q.index), parameters: [{ type: 'payload', payload: q.payload }] });
  }
  return post({
    to: toWaId(phone),
    type: 'template',
    template: { name, language: { code: language }, ...(components.length && { components }) },
  });
}

export function sendText(phone: string, text: string): Promise<WaSendResult> {
  return post({ to: toWaId(phone), type: 'text', text: { body: text.slice(0, 4000), preview_url: false } });
}
