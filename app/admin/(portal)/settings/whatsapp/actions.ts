'use server';

import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import { cleanText } from '@/lib/security/request';
import { fail, ok, staffAction, type ActionResult } from '@/lib/admin/actions';
import type { Json } from '@/types/database';
import {
  SETTINGS_KEY, STAGES, getFollowupConfig, listMetaTemplates, submitTemplate, tenDigits, validateWording,
  type FollowupConfig,
} from '@/lib/whatsapp/followup-config';

/** Writes the whole settings row as the signed-in staff member (RLS: settings.write). */
async function save(cfg: FollowupConfig, userId: string) {
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from('site_settings')
    .upsert({ key: SETTINGS_KEY, value: cfg as unknown as Json, is_public: false, updated_by: userId }, { onConflict: 'key' });
  if (error) throw error;
}

export async function saveFollowupSending(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const mode = z.enum(['off', 'test', 'on']).safeParse(fd.get('mode'));
  if (!mode.success) return fail('Choose Off, Test or On.');
  const raw = String(fd.get('test_numbers') ?? '').split(/[\s,]+/).filter(Boolean);
  const numbers = raw.map(tenDigits);
  const bad = raw.filter((_, i) => !numbers[i]);
  if (bad.length) return fail(`Not a valid Indian mobile: ${bad.slice(0, 3).join(', ')}`);
  if (mode.data === 'test' && !numbers.length) return fail('Add at least one test number for Test mode.');
  const waba = cleanText(fd.get('waba_id'), 30).replace(/\D/g, '');
  if (waba && waba.length < 5) return fail('The WhatsApp Business Account ID is a long number.');

  return staffAction('settings.write', async (staff) => {
    const cfg = await getFollowupConfig();
    await save({ ...cfg, mode: mode.data, test_numbers: [...new Set(numbers as string[])].slice(0, 20), waba_id: waba }, staff.profile.id);
    return ok(mode.data === 'off' ? 'Saved. Follow-ups are off.' : mode.data === 'test' ? 'Saved. Only the test numbers will get follow-ups.' : 'Saved. Follow-ups are on for every eligible customer.');
  });
}

export async function saveFollowupWording(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const stageNo = z.coerce.number().int().safeParse(fd.get('stage'));
  const days = z.coerce.number().int().min(0).max(30).safeParse(fd.get('days_after_box'));
  const spec = STAGES.find((s) => s.stage === (stageNo.success ? stageNo.data : -1));
  if (!spec) return fail('Unknown message.');
  if (!days.success) return fail('Days after the box must be 0–30.');
  // Keep line breaks, strip control characters.
  const body = String(fd.get('body') ?? '').replace(/\r\n/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f]/g, '').trim();
  const footer = cleanText(fd.get('footer'), 60);
  const problem = validateWording(spec, body, footer);
  if (problem) return fail(problem);

  return staffAction('settings.write', async (staff) => {
    const cfg = await getFollowupConfig();
    const stage = cfg.stages.find((s) => s.stage === spec.stage)!;
    const latest = stage.versions[stage.versions.length - 1];
    const changed = latest.body.trim() !== body || latest.footer.trim() !== footer;
    let message = 'Saved.';
    if (changed) {
      if (!latest.submitted_at) {
        // Not at Meta yet: just edit it.
        stage.versions[stage.versions.length - 1] = { ...latest, body, footer };
        message = 'Wording saved. Submit it to Meta when ready.';
      } else {
        // Already at Meta (can't be edited there): new version.
        const used = new Set(stage.versions.map((v) => v.name));
        let n = stage.versions.length + 1;
        while (used.has(`${spec.base}_v${n}`)) n++;
        stage.versions.push({ name: `${spec.base}_v${n}`, body, footer, created_at: new Date().toISOString(), submitted_at: null });
        message = `Saved as a new version (${spec.base}_v${n}). Submit it to Meta; the current approved one keeps sending until it's approved.`;
      }
    }
    stage.days_after_box = days.data;
    stage.versions = stage.versions.slice(-10);
    await save(cfg, staff.profile.id);
    return ok(message);
  });
}

export async function submitFollowupTemplate(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const stageNo = z.coerce.number().int().safeParse(fd.get('stage'));
  const spec = STAGES.find((s) => s.stage === (stageNo.success ? stageNo.data : -1));
  if (!spec) return fail('Unknown message.');

  return staffAction('settings.write', async (staff) => {
    const cfg = await getFollowupConfig();
    const stage = cfg.stages.find((s) => s.stage === spec.stage)!;
    const latest = stage.versions[stage.versions.length - 1];
    const problem = validateWording(spec, latest.body, latest.footer);
    if (problem) return fail(problem);

    const meta = await listMetaTemplates(cfg.waba_id);
    if (!meta.ok) return fail(meta.error);
    if (meta.byName.has(latest.name)) {
      // Already at Meta (e.g. submitted earlier from elsewhere): just record it.
      latest.submitted_at = latest.submitted_at ?? new Date().toISOString();
      await save(cfg, staff.profile.id);
      return ok(`Meta already has ${latest.name} (${meta.byName.get(latest.name)!.status}).`);
    }
    const res = await submitTemplate(cfg.waba_id, spec, latest);
    if (!res.ok) return fail(`Meta: ${res.error}`);
    latest.submitted_at = new Date().toISOString();
    await save(cfg, staff.profile.id);
    const recat = res.category !== spec.category ? ` Meta classed it as ${res.category}.` : '';
    return ok(`Submitted ${latest.name} to Meta (${res.status}). Approval usually takes minutes, at most 24 hours.${recat}`);
  });
}
