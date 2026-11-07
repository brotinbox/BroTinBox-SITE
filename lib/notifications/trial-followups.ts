import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseService } from '@/lib/supabase/admin';
import { getPricingMatrix } from '@/lib/data/catalog';
import { mealPrice } from '@/lib/pricing';
import { sendTemplate } from '@/lib/whatsapp/cloud';
import {
  STAGES, activeVersion, getFollowupConfig, listMetaTemplates, quickReplyPayloads,
  type FollowupMode, type StageSpec,
} from '@/lib/whatsapp/followup-config';

/**
 * WhatsApp follow-ups after a trial box (run by /api/cron/trial-followups).
 *
 * Mode, test numbers, timing and wording: admin → Settings → WhatsApp follow-ups.
 *   off → nothing is sent · test → only the test numbers · on → everyone eligible
 * Each stage uses the newest template version Meta has approved; a stage with
 * no approved version waits (nothing is skipped or lost).
 * Rules:
 *   - stage n is due `days_after_box` days after the box; sent between 10:00 and 19:30 IST
 *   - at least 36 h after the previous follow-up (automatic or staff "Mark messaged")
 *   - more than 3 days late → skipped, never sent stale (so old trials are not messaged
 *     when this is first switched on)
 *   - stops when they buy a weekly/monthly plan, opt out, or are blocked
 *   - stage 1 needs WhatsApp updates on; stages 2–3 need the offers opt-in
 */

const MAX_STAGE = STAGES.length;
const MAX_PER_RUN = 40;
const LATE_DAYS = 3;
const GAP_MS = 36 * 3600_000;
// Template missing / not approved / paused, or bad parameters: a setup problem on our side,
// not the customer's. Leave the stage untouched so it goes out once the template is fixed.
const SETUP_ERRORS = new Set([132000, 132001, 132005, 132007, 132012, 132015, 132016, 190, 10, 200]);

const crm = () => (getSupabaseService() as unknown as SupabaseClient).schema('crm');

const istNow = () => new Date(Date.now() + 5.5 * 3600_000);
const istToday = () => istNow().toISOString().slice(0, 10);
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400_000).toISOString().slice(0, 10);
const dayLabel = (d: string) =>
  new Date(`${d}T00:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
const rupees = (n: number) => `₹${Math.round(n)}`;

function inSendWindow(): boolean {
  const t = istNow();
  const mins = t.getUTCHours() * 60 + t.getUTCMinutes();
  return mins >= 10 * 60 && mins <= 19 * 60 + 30;
}

type Claim = { id: string; user_id: string; order_id: string; followup_stage: number; followup_sent_at: string | null };
type Profile = {
  id: string; full_name: string | null; phone: string | null; phone_verified: boolean; is_blocked: boolean;
  whatsapp_opt_in: boolean; whatsapp_offers_opt_in: boolean;
};

export type FollowupRun = { mode: FollowupMode; window: boolean; checked: number; sent: number; skipped: number; failed: number; note?: string };

export async function runTrialFollowups(opts: { ignoreWindow?: boolean } = {}): Promise<FollowupRun> {
  const cfg = await getFollowupConfig();
  const mode = cfg.mode;
  const window = inSendWindow();
  const result: FollowupRun = { mode, window, checked: 0, sent: 0, skipped: 0, failed: 0 };
  if (mode === 'off' || (!window && !opts.ignoreWindow)) return result;

  // Which template version each stage sends: newest approved at Meta.
  const meta = await listMetaTemplates(cfg.waba_id);
  if (!meta.ok) result.note = `Meta template check failed: ${meta.error}`;
  const plan = new Map(STAGES.map((spec) => {
    const stageCfg = cfg.stages.find((x) => x.stage === spec.stage)!;
    return [spec.stage, { spec, days: stageCfg.days_after_box, version: activeVersion(stageCfg, meta.ok ? meta.byName : null) }];
  }));

  const db = getSupabaseService();
  const { data: claimRows, error } = await crm().from('trial_claims')
    .select('id, user_id, order_id, followup_stage, followup_sent_at')
    .eq('status', 'used').eq('followup_opt_out', false).lt('followup_stage', MAX_STAGE)
    .order('claimed_at').limit(500);
  if (error) throw error;
  const claims = (claimRows ?? []) as Claim[];
  if (!claims.length) return result;

  const userIds = [...new Set(claims.map((c) => c.user_id))];
  const [{ data: orders }, { data: people }, { data: plans }, pricing, { data: earliest }] = await Promise.all([
    db.from('orders').select('id, subscriptions(start_date, diet)').in('id', claims.map((c) => c.order_id)),
    db.from('profiles').select('id, full_name, phone, phone_verified, is_blocked, whatsapp_opt_in, whatsapp_offers_opt_in').in('id', userIds),
    db.from('orders').select('user_id').in('user_id', userIds).in('type', ['weekly', 'monthly']).in('status', ['paid', 'refunded', 'partially_refunded']),
    getPricingMatrix(),
    db.rpc('earliest_bookable_date', {}),
  ]);
  const boxByOrder = new Map((orders ?? []).map((o) => {
    const s = (o as unknown as { subscriptions?: { start_date?: string; diet?: string } | null }).subscriptions;
    return [o.id, { date: s?.start_date ?? null, diet: s?.diet === 'veg' ? 'veg' as const : 'non-veg' as const }];
  }));
  const profileById = new Map(((people ?? []) as Profile[]).map((p) => [p.id, p]));
  const subscribed = new Set((plans ?? []).map((o) => o.user_id));
  const testers = mode === 'test' ? new Set(cfg.test_numbers) : null;
  const today = istToday();

  for (const c of claims) {
    if (result.sent >= MAX_PER_RUN) break;
    const p = profileById.get(c.user_id);
    const box = boxByOrder.get(c.order_id);
    const phone = (p?.phone ?? '').replace(/\D/g, '').slice(-10);
    if (!p || !box?.date || phone.length !== 10) continue;
    if (testers && !testers.has(phone)) continue;      // test mode: leave everyone else untouched
    if (subscribed.has(c.user_id) || p.is_blocked || !p.phone_verified) continue;
    result.checked++;

    const stage = c.followup_stage + 1;
    const step = plan.get(stage);
    if (!step) continue;
    const tpl = step.spec;
    const due = addDays(box.date, step.days);
    if (today < due) continue;
    if (c.followup_sent_at && Date.now() - Date.parse(c.followup_sent_at) < GAP_MS) continue;

    const consented = tpl.consent === 'offers' ? p.whatsapp_offers_opt_in : p.whatsapp_opt_in;
    const late = today > addDays(due, LATE_DAYS);
    if (!consented || late) {
      await logAndAdvance(c, stage, phone, tpl.base, 'skipped', late ? 'too late to send' : 'no WhatsApp consent');
      result.skipped++;
      continue;
    }
    if (!step.version) continue; // no approved wording for this stage yet: wait, don't skip
    const templateName = step.version.name;

    const name = (p.full_name ?? '').trim().split(/\s+/)[0] || 'there';
    const body = bodyParams(tpl, { name, boxDate: box.date, diet: box.diet, pricing, startFrom: (earliest as string | null) ?? addDays(today, 1) });
    // Reserve this stage first, so a parallel run can't send it twice.
    const { data: row, error: insErr } = await crm().from('whatsapp_messages')
      .insert({ claim_id: c.id, user_id: c.user_id, phone, template: templateName, stage, status: 'queued' })
      .select('id').single();
    if (insErr || !row) continue;

    const res = await sendTemplate(phone, templateName, tpl.language, { body, quickReplies: quickReplyPayloads(tpl) });
    if (!res.ok && (res.code === undefined || SETUP_ERRORS.has(res.code))) {
      // Release the reservation and stop this run; it is retried on the next one.
      await crm().from('whatsapp_messages').delete().eq('id', row.id);
      console.error('[trial-followups] setup error, stopping run', templateName, res.code, res.title);
      result.failed++;
      break;
    }
    await crm().from('whatsapp_messages').update(res.ok
      ? { status: 'sent', wa_message_id: res.id }
      : { status: 'failed', error_code: res.code ?? null, error_title: res.title }).eq('id', row.id);
    // Move on either way: a failed message is not retried (avoids repeats on a bad number).
    await crm().from('trial_claims').update({ followup_stage: stage, ...(res.ok && { followup_sent_at: new Date().toISOString() }) }).eq('id', c.id);
    if (res.ok) result.sent++; else result.failed++;
  }
  return result;
}

function bodyParams(tpl: StageSpec, v: { name: string; boxDate: string; diet: 'veg' | 'non-veg'; pricing: Awaited<ReturnType<typeof getPricingMatrix>>; startFrom: string }): string[] {
  switch (tpl.base) {
    case 'trial_feedback': return [v.name, dayLabel(v.boxDate)];
    case 'trial_plan_offer': return [v.name, rupees(mealPrice(v.pricing, 'weekly', v.diet)), rupees(mealPrice(v.pricing, 'monthly', v.diet))];
    case 'trial_last_reminder': return [v.name, dayLabel(v.startFrom), rupees(mealPrice(v.pricing, 'monthly', v.diet))];
    default: return [v.name];
  }
}

async function logAndAdvance(c: Claim, stage: number, phone: string, template: string, status: 'skipped', reason: string) {
  await crm().from('whatsapp_messages')
    .insert({ claim_id: c.id, user_id: c.user_id, phone, template, stage, status, error_title: reason });
  await crm().from('trial_claims').update({ followup_stage: stage }).eq('id', c.id);
}
