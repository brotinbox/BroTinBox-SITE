import Link from 'next/link';
import { adminHref } from '@/lib/admin/paths';
import Image from 'next/image';
import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { Card, PageHeader } from '@/components/admin/ui';
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton, Textarea } from '@/components/admin/forms';
import { cashfreeKeys } from '@/lib/cashfree';
import { getAlertSettings, getCashfreeSettings, getPhoneOtpSettings, whatsappSenderConfigured } from '@/lib/settings/runtime';
import { saveAlerts, saveAnnouncement, saveCashfreeMode, saveFeatures, saveOrdering, savePayment, savePhoneOtp, sendTestAlert, sendTestOtp } from './actions';

export const metadata = { title: 'Settings' };

const OTP_MODES = [
  { value: 'off', label: 'Off', hint: 'Customers sign in with Google only.' },
  { value: 'test', label: 'Test', hint: 'Only the test numbers below, on /login?otp=1.' },
  { value: 'on', label: 'Live', hint: 'Every customer can sign in with a WhatsApp code.' },
];

const FEATURE_LABELS: Record<string, string> = {
  google_login: 'Google sign-in for customers',
  autopay: 'UPI AutoPay renewals (needs Cashfree; not built yet)',
  coupons: 'Coupon codes at checkout (switch not connected yet: active coupons always work)',
  reviews: 'Customer reviews (not shown on the website yet)',
  rider_app: 'Rider app (not built yet)',
  referrals: 'Referral rewards (not built yet)',
  wallet: 'Wallet (not built yet)',
};

export default async function SettingsPage() {
  const staff = await requireStaff('settings.read');
  const canWrite = staff.can('settings.write');
  const supabase = await getSupabaseServer();
  const { data } = await supabase.from('site_settings').select('key, value');
  const s = Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) as Record<string, any>;
  const payment = s.payment ?? {};
  const announcement = s.announcement ?? {};
  const features = s.features ?? {};
  const [otp, alerts, cf] = await Promise.all([getPhoneOtpSettings({ fresh: true }), getAlertSettings({ fresh: true }), getCashfreeSettings({ fresh: true })]);
  const cfKeys = { production: !!cashfreeKeys('production'), sandbox: !!cashfreeKeys('sandbox') };
  const cfReady = cfKeys[cf.mode];
  const waReady = whatsappSenderConfigured();
  const tgReady = !!process.env.TELEGRAM_BOT_TOKEN;

  return (
    <>
      <PageHeader title="Settings" description={canWrite ? 'Changes apply to the website immediately.' : 'Only a super admin can change settings.'} />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Payments">
          <ActionForm action={savePayment} className="space-y-3">
            <fieldset disabled={!canWrite} className="space-y-3">
              <Field
                label="How customers pay"
                hint={cfReady
                  ? `Cashfree is in ${cf.mode === 'sandbox' ? 'TEST mode: no real money' : 'LIVE mode'} (switch it in the Cashfree card).`
                  : `No Cashfree ${cf.mode === 'sandbox' ? 'test' : 'live'} keys on the server, so customers see manual UPI whatever you choose here.`}
              >
                <Select name="mode" defaultValue={payment.mode === 'manual_upi' ? 'manual_upi' : 'cashfree'} options={[
                  { value: 'cashfree', label: 'Online via Cashfree (confirmed automatically)' },
                  { value: 'manual_upi', label: 'Manual UPI (staff confirm each payment)' },
                ]} />
              </Field>
              <p className="text-xs text-gray-600">Manual UPI: customers pay to this UPI ID and enter their reference number. Confirm each payment in Orders.</p>
              <Field label="UPI ID"><Input name="upi_id" defaultValue={payment.upi_id ?? ''} placeholder="brotinbox@okhdfcbank" maxLength={100} /></Field>
              <Field label="Payee name"><Input name="payee_name" defaultValue={payment.payee_name ?? ''} maxLength={80} /></Field>
              <Field label="Instructions shown to customers"><Textarea name="instructions" defaultValue={payment.instructions ?? ''} maxLength={400} className="min-h-16" /></Field>
              <Field label="UPI QR code image" hint="Optional. JPG/PNG/WebP up to 5 MB.">
                {payment.qr_image_url && <Image src={payment.qr_image_url} alt="UPI QR" width={140} height={140} className="mb-2 rounded-lg border" />}
                <Input type="file" name="qr" accept="image/jpeg,image/png,image/webp" />
              </Field>
              {payment.qr_image_url && <Checkbox name="remove_qr" label="Remove the current QR image" />}
            </fieldset>
            {canWrite && <SubmitButton>Save payment details</SubmitButton>}
          </ActionForm>
        </Card>

        <Card title="Cashfree: Test or Live">
          <ActionForm action={saveCashfreeMode} className="space-y-4">
            <fieldset disabled={!canWrite} className="space-y-2">
              {([
                { value: 'sandbox', label: 'Test', hint: 'Sandbox. No real money; use Cashfree test UPI/cards.' },
                { value: 'production', label: 'Live', hint: 'Real payments to your bank account.' },
              ] as const).map((m) => (
                <label key={m.value} className="flex items-start gap-2 text-sm cursor-pointer">
                  <input type="radio" name="mode" value={m.value} defaultChecked={cf.mode === m.value} className="mt-1" />
                  <span>
                    <b>{m.label}</b> <span className="text-gray-500">· {m.hint}</span>{' '}
                    <span className={cfKeys[m.value] ? 'text-emerald-700' : 'text-rose-700'}>{cfKeys[m.value] ? '· keys found' : '· keys missing in Vercel'}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <p className="text-xs text-gray-600">
              Now: <b>{cf.mode === 'production' ? 'LIVE' : 'TEST'}</b>{cf.source === 'env' ? ' (from NEXT_PUBLIC_CASHFREE_ENV; not saved here yet)' : ''}.
              Webhook URL for the Cashfree dashboard: <code className="break-all">https://www.brotinbox.com/api/webhooks/cashfree</code>
            </p>
            {canWrite && <SubmitButton>Save Cashfree mode</SubmitButton>}
          </ActionForm>
        </Card>

        <Card title="Ordering">
          <ActionForm action={saveOrdering} className="space-y-3">
            <fieldset disabled={!canWrite} className="space-y-3">
              <Checkbox name="ordering_open" label="Accept new orders" defaultChecked={s.ordering_open !== false} />
              <Field label="Daily cutoff (IST)" hint="Skips, pauses and changes for a day close at this time the night before.">
                <Input type="time" name="cutoff_time" defaultValue={s.cutoff_time ?? '21:00'} required />
              </Field>
              <Field label="Maximum pause length (days)"><Input type="number" name="max_pause_days" min={1} max={90} defaultValue={s.max_pause_days ?? 30} /></Field>
              <Field label="Support WhatsApp number"><Input name="support_whatsapp" defaultValue={s.support_whatsapp ?? ''} maxLength={20} /></Field>
            </fieldset>
            {canWrite && <SubmitButton>Save ordering settings</SubmitButton>}
          </ActionForm>
        </Card>

        <Card title="Site announcement banner">
          <ActionForm action={saveAnnouncement} className="space-y-3">
            <fieldset disabled={!canWrite} className="space-y-3">
              <Checkbox name="enabled" label="Show banner" defaultChecked={!!announcement.enabled} />
              <Field label="Text"><Input name="text" defaultValue={announcement.text ?? ''} maxLength={160} placeholder="Kitchen closed on Pongal, 14 Jan" /></Field>
              <Field label="Link (optional)"><Input name="href" defaultValue={announcement.href ?? ''} maxLength={200} placeholder="/menu" /></Field>
            </fieldset>
            {canWrite && <SubmitButton>Save banner</SubmitButton>}
          </ActionForm>
        </Card>

        <Card title="Features">
          <ActionForm action={saveFeatures} className="space-y-2">
            <fieldset disabled={!canWrite} className="space-y-2">
              {Object.entries(FEATURE_LABELS).map(([k, label]) => (
                <div key={k}><Checkbox name={k} label={label} defaultChecked={!!features[k]} /></div>
              ))}
            </fieldset>
            {canWrite && <SubmitButton>Save features</SubmitButton>}
          </ActionForm>
        </Card>

        <Card title="Phone sign-in (WhatsApp code)">
          <ActionForm action={savePhoneOtp} className="space-y-4">
            <fieldset disabled={!canWrite} className="space-y-4">
              <div className="space-y-2">
                {OTP_MODES.map((m) => (
                  <label key={m.value} className="flex items-start gap-2 text-sm cursor-pointer">
                    <input type="radio" name="mode" value={m.value} defaultChecked={otp.mode === m.value} className="mt-1" />
                    <span><b>{m.label}</b> <span className="text-gray-500">· {m.hint}</span></span>
                  </label>
                ))}
              </div>
              <Field label="Test numbers" hint="10-digit mobiles, comma or new line separated. Used in Test mode.">
                <Textarea name="test_numbers" rows={2} defaultValue={otp.test_numbers.join('\n')} placeholder="98XXXXXXXX" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Template name" hint="Approved Authentication template.">
                  <Input name="template" defaultValue={otp.template} maxLength={512} placeholder="login_otp" />
                </Field>
                <Field label="Language"><Input name="lang" defaultValue={otp.lang} maxLength={10} placeholder="en" /></Field>
              </div>
            </fieldset>
            {canWrite && <SubmitButton>Save phone sign-in</SubmitButton>}
          </ActionForm>
          <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-600 space-y-1">
            <p>Now: <b>{otp.mode === 'on' ? 'Live' : otp.mode === 'test' ? `Test (${otp.test_numbers.length} number${otp.test_numbers.length === 1 ? '' : 's'})` : 'Off'}</b>{otp.source === 'env' && ' · from Vercel (PHONE_OTP_MODE) until you save here'}</p>
            <p>WhatsApp sender: {waReady ? <span className="text-emerald-700 font-semibold">configured</span> : <span className="text-rose-700">WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN missing in Vercel</span>}</p>
          </div>
          {canWrite && waReady && (
            <ActionForm action={sendTestOtp} className="mt-3 flex gap-2 items-end">
              <div className="flex-1"><Field label="Send a test code to"><Input name="phone" inputMode="numeric" maxLength={14} placeholder="98XXXXXXXX" required /></Field></div>
              <SubmitButton>Send</SubmitButton>
            </ActionForm>
          )}
        </Card>

        <Card title="Staff alerts (Telegram)">
          <ActionForm action={saveAlerts} className="space-y-3">
            <fieldset disabled={!canWrite} className="space-y-3">
              <Field label="Telegram chat ID" hint="Where order, sign-up and enquiry alerts go. Groups start with -100…. Leave empty to use TELEGRAM_CHAT_ID from Vercel.">
                <Input name="telegram_chat_id" defaultValue={alerts.source === 'admin' ? alerts.telegram_chat_id : ''} maxLength={64} placeholder={alerts.source === 'env' && alerts.telegram_chat_id ? `${alerts.telegram_chat_id} (from Vercel)` : '-1001234567890'} />
              </Field>
            </fieldset>
            {canWrite && <SubmitButton>Save alerts</SubmitButton>}
          </ActionForm>
          <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-600 space-y-2">
            <p>Bot token: {tgReady ? <span className="text-emerald-700 font-semibold">set in Vercel</span> : <span className="text-rose-700">TELEGRAM_BOT_TOKEN missing in Vercel</span>}</p>
            {canWrite && tgReady && (
              <ActionForm action={sendTestAlert}><SubmitButton>Send a test alert</SubmitButton></ActionForm>
            )}
          </div>
        </Card>

        <Card title="WhatsApp follow-ups">
          <p className="text-sm text-gray-600">
            Automatic messages after a trial box: switch them off, test or on, choose test numbers, edit the wording and submit it to Meta.
          </p>
          <Link href={adminHref('/settings/whatsapp')} className="inline-block mt-3 text-sm font-bold text-primary underline">Open WhatsApp follow-ups →</Link>
        </Card>
      </div>
    </>
  );
}
