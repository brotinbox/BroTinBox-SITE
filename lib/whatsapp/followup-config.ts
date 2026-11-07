import 'server-only';
import { getSupabaseService } from '@/lib/supabase/admin';
import { normalizeIndianPhone } from '@/lib/auth/otp';
import defaults from '@/lib/whatsapp/templates.json';

/**
 * Trial follow-up settings, edited in admin → Settings → WhatsApp follow-ups
 * and stored in site_settings 'whatsapp_followups' (not public).
 *
 * Meta never lets an approved template's text change, so each edit of the
 * wording becomes a new version (trial_feedback, trial_feedback_v2, …). The
 * sender uses the newest version Meta has approved for each stage.
 */

export const SETTINGS_KEY = 'whatsapp_followups';
const GRAPH = 'https://graph.facebook.com/v21.0';

export type StageSpec = (typeof defaults.templates)[number];
export const STAGES: StageSpec[] = [...defaults.templates].sort((a, b) => a.stage - b.stage);

export type TemplateVersion = { name: string; body: string; footer: string; created_at: string; submitted_at?: string | null };
export type StageConfig = { stage: number; days_after_box: number; versions: TemplateVersion[] };
export type FollowupMode = 'off' | 'test' | 'on';
export type FollowupConfig = { mode: FollowupMode; test_numbers: string[]; waba_id: string; stages: StageConfig[] };

const envMode = (): FollowupMode => {
  const v = (process.env.TRIAL_FOLLOWUP_MODE || '').trim().toLowerCase();
  return v === 'on' || v === 'test' ? v : 'off';
};
export const tenDigits = (n: string) => normalizeIndianPhone(n.trim())?.slice(-10) ?? null;

/** Saved settings merged over the defaults (and the old env switches, until something is saved). */
export async function getFollowupConfig(): Promise<FollowupConfig> {
  const { data } = await getSupabaseService().from('site_settings').select('value').eq('key', SETTINGS_KEY).maybeSingle();
  const saved = (data?.value ?? null) as Partial<FollowupConfig> | null;
  const stages = STAGES.map((spec): StageConfig => {
    const s = saved?.stages?.find((x) => x.stage === spec.stage);
    return {
      stage: spec.stage,
      days_after_box: s?.days_after_box ?? spec.days_after_box,
      versions: s?.versions?.length
        ? s.versions
        : [{ name: spec.base, body: spec.body, footer: spec.footer, created_at: new Date(0).toISOString(), submitted_at: null }],
    };
  });
  return {
    mode: saved?.mode ?? envMode(),
    test_numbers: saved?.test_numbers
      ?? (process.env.PHONE_OTP_TEST_NUMBERS || '').split(',').map(tenDigits).filter((n): n is string => !!n),
    waba_id: saved?.waba_id ?? process.env.WHATSAPP_WABA_ID ?? '',
    stages,
  };
}

/** Meta's rules for a template body, checked before we save or submit. */
export function validateWording(spec: StageSpec, body: string, footer: string): string | null {
  const b = body.trim();
  if (b.length < 20) return 'The message is too short.';
  if (b.length > 1024) return 'The message must be 1024 characters or fewer.';
  const vars = [...b.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
  const need = spec.variables.length;
  for (let i = 1; i <= need; i++) {
    if (!vars.includes(i)) return `Keep {{${i}}} (${spec.variables[i - 1]}) in the message.`;
  }
  if (vars.some((v) => v < 1 || v > need)) return `Only {{1}} to {{${need}}} can be used.`;
  if (new Set(vars).size !== vars.length) return 'Use each {{number}} only once.';
  if (/\{\{[^}]*\}\}/.test(b.replace(/\{\{\d+\}\}/g, ''))) return 'Placeholders must look like {{1}}.';
  if (/^\{\{\d+\}\}/.test(b) || /\{\{\d+\}\}[.!?]?$/.test(b)) return "Meta rejects messages that start or end with a {{number}}. Add a word before/after it.";
  if (/\n{3,}/.test(b)) return 'Use at most one empty line between paragraphs.';
  const f = footer.trim();
  if (f.length > 60) return 'The footer must be 60 characters or fewer.';
  if (/\{\{/.test(f)) return 'The footer cannot contain {{numbers}}.';
  return null;
}

/** The template as Meta expects it on submission. */
export function metaComponents(spec: StageSpec, v: TemplateVersion) {
  const components: Record<string, unknown>[] = [
    { type: 'BODY', text: v.body.trim(), example: { body_text: [spec.example] } },
  ];
  if (v.footer.trim()) components.push({ type: 'FOOTER', text: v.footer.trim() });
  components.push({
    type: 'BUTTONS',
    buttons: spec.buttons.map((b) => (b.type === 'URL' ? { type: 'URL', text: b.text, url: b.url } : { type: 'QUICK_REPLY', text: b.text })),
  });
  return components;
}

/** Quick-reply payloads with their position among all buttons (they come back in the webhook). */
export function quickReplyPayloads(spec: StageSpec): { index: number; payload: string }[] {
  return spec.buttons.flatMap((b, index) => (b.type === 'QUICK_REPLY' && 'payload' in b && b.payload ? [{ index, payload: b.payload }] : []));
}

export type MetaTemplate = { name: string; status: string; category: string; rejected_reason?: string };

/** Our templates as Meta has them (status: APPROVED / PENDING / REJECTED / PAUSED / DISABLED). */
export async function listMetaTemplates(wabaId: string): Promise<{ ok: true; byName: Map<string, MetaTemplate> } | { ok: false; error: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) return { ok: false, error: 'WHATSAPP_ACCESS_TOKEN is not set on the server.' };
  if (!/^\d{5,25}$/.test(wabaId)) return { ok: false, error: 'Add the WhatsApp Business Account ID first.' };
  try {
    const res = await fetch(`${GRAPH}/${wabaId}/message_templates?fields=name,status,category,language,rejected_reason&limit=200`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const json = (await res.json()) as { data?: (MetaTemplate & { language: string })[]; error?: { message?: string } };
    if (json.error || !json.data) return { ok: false, error: json.error?.message ?? `Meta returned ${res.status}` };
    return { ok: true, byName: new Map(json.data.filter((t) => t.language === 'en').map((t) => [t.name, t])) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not reach Meta.' };
  }
}

export async function submitTemplate(wabaId: string, spec: StageSpec, v: TemplateVersion): Promise<{ ok: true; status: string; category: string } | { ok: false; error: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) return { ok: false, error: 'WHATSAPP_ACCESS_TOKEN is not set on the server.' };
  try {
    const res = await fetch(`${GRAPH}/${wabaId}/message_templates`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: v.name, language: spec.language, category: spec.category, components: metaComponents(spec, v) }),
    });
    const json = (await res.json()) as { status?: string; category?: string; error?: { message?: string; error_user_msg?: string } };
    if (json.error) return { ok: false, error: json.error.error_user_msg || json.error.message || 'Meta refused the template.' };
    return { ok: true, status: json.status ?? 'PENDING', category: json.category ?? spec.category };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not reach Meta.' };
  }
}

/** Newest version of a stage that Meta has approved (what the sender uses). */
export function activeVersion(stage: StageConfig, meta: Map<string, MetaTemplate> | null): TemplateVersion | null {
  for (let i = stage.versions.length - 1; i >= 0; i--) {
    const v = stage.versions[i];
    if (!meta) return v.submitted_at || i === 0 ? v : null; // Meta unreachable: best guess, send errors are retried
    if (meta.get(v.name)?.status === 'APPROVED') return v;
  }
  return null;
}

/** Fills the stage's {{n}} values in order. */
export function fillPreview(spec: StageSpec, v: TemplateVersion): string {
  return v.body.replace(/\{\{(\d+)\}\}/g, (_, n) => spec.example[Number(n) - 1] ?? `{{${n}}}`);
}
