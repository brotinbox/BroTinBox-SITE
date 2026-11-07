import Link from 'next/link';
import { requireStaff } from '@/lib/auth/session';
import { adminHref } from '@/lib/admin/paths';
import { Card, PageHeader, StatusBadge, fmtDate } from '@/components/admin/ui';
import { ActionForm, Field, Input, SubmitButton, Textarea } from '@/components/admin/forms';
import { STAGES, activeVersion, fillPreview, getFollowupConfig, listMetaTemplates } from '@/lib/whatsapp/followup-config';
import { saveFollowupSending, saveFollowupWording, submitFollowupTemplate } from './actions';

export const metadata = { title: 'WhatsApp follow-ups' };
export const dynamic = 'force-dynamic';

const META_BADGE: Record<string, { value: string; label: string }> = {
  APPROVED: { value: 'active', label: 'approved' },
  PENDING: { value: 'pending', label: 'waiting for Meta' },
  IN_APPEAL: { value: 'pending', label: 'in appeal' },
  REJECTED: { value: 'rejected', label: 'rejected' },
  PAUSED: { value: 'paused', label: 'paused by Meta' },
  DISABLED: { value: 'rejected', label: 'disabled by Meta' },
};

const MODES = [
  { value: 'off', label: 'Off', hint: 'Nothing is sent.' },
  { value: 'test', label: 'Test', hint: 'Only the test numbers below get messages.' },
  { value: 'on', label: 'On', hint: 'Every eligible trial customer.' },
];

export default async function WhatsAppFollowupsPage() {
  await requireStaff('settings.write');
  const cfg = await getFollowupConfig();
  const meta = await listMetaTemplates(cfg.waba_id);
  const byName = meta.ok ? meta.byName : null;

  return (
    <>
      <PageHeader
        title="WhatsApp follow-ups"
        description="Messages sent automatically after a trial box: a feedback ask, then up to two plan reminders for customers who opted in to offers. They stop when the customer buys a plan or taps Stop offers. Sent between 10:00 and 19:30."
        actions={<Link href={adminHref('/trials')} className="text-xs font-bold text-primary underline">See trials and who was messaged →</Link>}
      />

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <Card title="Sending">
          <ActionForm action={saveFollowupSending} className="space-y-4">
            <fieldset className="space-y-2">
              {MODES.map((m) => (
                <label key={m.value} className="flex items-start gap-2 text-sm cursor-pointer">
                  <input type="radio" name="mode" value={m.value} defaultChecked={cfg.mode === m.value} className="mt-1" />
                  <span><b>{m.label}</b> <span className="text-gray-500">· {m.hint}</span></span>
                </label>
              ))}
            </fieldset>
            <Field label="Test numbers" hint="10-digit mobiles, comma or new line separated. Used in Test mode.">
              <Textarea name="test_numbers" rows={3} defaultValue={cfg.test_numbers.join('\n')} placeholder="98XXXXXXXX" />
            </Field>
            <Field label="WhatsApp Business Account ID" hint="Meta app dashboard → WhatsApp → API Setup. Needed to submit and check templates.">
              <Input name="waba_id" inputMode="numeric" defaultValue={cfg.waba_id} maxLength={30} placeholder="1234567890…" />
            </Field>
            <SubmitButton className="w-full">Save</SubmitButton>
          </ActionForm>
          <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-600 space-y-1">
            <p>Now: <b>{cfg.mode === 'on' ? 'On' : cfg.mode === 'test' ? `Test (${cfg.test_numbers.length} number${cfg.test_numbers.length === 1 ? '' : 's'})` : 'Off'}</b></p>
            <p>Meta: {meta.ok ? <span className="text-emerald-700 font-semibold">connected</span> : <span className="text-rose-700">{meta.error}</span>}</p>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {STAGES.map((spec) => {
            const stage = cfg.stages.find((s) => s.stage === spec.stage)!;
            const latest = stage.versions[stage.versions.length - 1];
            const inUse = activeVersion(stage, byName);
            const latestAtMeta = byName?.get(latest.name);
            return (
              <Card
                key={spec.stage}
                title={`${spec.stage} · ${spec.label}`}
                actions={
                  <span className="text-[11px] text-gray-500">
                    {spec.consent === 'offers' ? 'Only customers who opted in to offers' : 'Customers with WhatsApp updates on'} · {spec.category.toLowerCase()}
                  </span>
                }
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <ActionForm action={saveFollowupWording} className="space-y-3">
                    <input type="hidden" name="stage" value={spec.stage} />
                    <Field label="Send this many days after the trial box">
                      <Input name="days_after_box" type="number" min={0} max={30} defaultValue={stage.days_after_box} />
                    </Field>
                    <Field
                      label="Message"
                      hint={`Keep ${spec.variables.map((v, i) => `{{${i + 1}}} = ${v}`).join(', ')}. Can't start or end with a {{number}}.`}
                    >
                      <Textarea name="body" rows={6} maxLength={1024} defaultValue={latest.body} required />
                    </Field>
                    <Field label="Footer (optional, grey small text)">
                      <Input name="footer" maxLength={60} defaultValue={latest.footer} />
                    </Field>
                    <p className="text-[11px] text-gray-500">
                      Buttons (fixed): {spec.buttons.map((b) => b.text).join(' · ')}
                    </p>
                    <SubmitButton variant="secondary">Save</SubmitButton>
                  </ActionForm>

                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Preview</p>
                      <div className="rounded-2xl bg-[#e7f6dc] border border-emerald-100 p-3 text-sm text-gray-900 whitespace-pre-line">
                        {fillPreview(spec, latest)}
                        {latest.footer && <p className="mt-1.5 text-[11px] text-gray-500">{latest.footer}</p>}
                      </div>
                      <div className="mt-1 grid gap-1">
                        {spec.buttons.map((b) => (
                          <span key={b.text} className="rounded-lg bg-white border border-gray-200 text-center text-xs font-semibold text-sky-700 py-1.5">{b.text}</span>
                        ))}
                      </div>
                    </div>

                    <div className="text-xs space-y-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Versions at Meta</p>
                      <ul className="space-y-1">
                        {[...stage.versions].reverse().map((v) => {
                          const m = byName?.get(v.name);
                          const badge = m ? META_BADGE[m.status] ?? { value: 'draft', label: m.status.toLowerCase() } : { value: 'draft', label: v.submitted_at ? 'submitted' : 'not submitted' };
                          return (
                            <li key={v.name} className="flex flex-wrap items-center gap-1.5">
                              <code className="text-[11px]">{v.name}</code>
                              <StatusBadge value={badge.value} label={badge.label} />
                              {inUse?.name === v.name && <StatusBadge value="converted" label="sending" />}
                              {m && m.category !== spec.category && <span className="text-[11px] text-amber-700">Meta: {m.category.toLowerCase()}</span>}
                              {m?.rejected_reason && m.rejected_reason !== 'NONE' && <span className="text-[11px] text-rose-700">{m.rejected_reason}</span>}
                              {v.submitted_at && <span className="text-[11px] text-gray-400">{fmtDate(v.submitted_at)}</span>}
                            </li>
                          );
                        })}
                      </ul>
                      {!inUse && <p className="text-amber-700">Nothing approved yet: this message waits until a version is approved.</p>}
                    </div>

                    {!latestAtMeta && (
                      <ActionForm action={submitFollowupTemplate}>
                        <input type="hidden" name="stage" value={spec.stage} />
                        <SubmitButton confirm={`Submit ${latest.name} to Meta for approval? The text can't be changed after approval (a later edit becomes a new version).`}>
                          Submit to Meta
                        </SubmitButton>
                      </ActionForm>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
