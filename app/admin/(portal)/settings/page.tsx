import Image from 'next/image';
import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { Card, PageHeader } from '@/components/admin/ui';
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton, Textarea } from '@/components/admin/forms';
import { cashfreeMode, isCashfreeConfigured } from '@/lib/cashfree';
import { saveAnnouncement, saveFeatures, saveOrdering, savePayment } from './actions';

export const metadata = { title: 'Settings' };

const FEATURE_LABELS: Record<string, string> = {
  google_login: 'Google sign-in for customers',
  whatsapp_otp: 'WhatsApp OTP sign-in (needs a WhatsApp provider; not built yet)',
  autopay: 'UPI AutoPay renewals (needs Cashfree; not built yet)',
  coupons: 'Coupon codes at checkout',
  reviews: 'Customer reviews',
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

  return (
    <>
      <PageHeader title="Settings" description={canWrite ? 'Changes apply to the website immediately.' : 'Only a super admin can change settings.'} />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Payments">
          <ActionForm action={savePayment} className="space-y-3">
            <fieldset disabled={!canWrite} className="space-y-3">
              <Field
                label="How customers pay"
                hint={isCashfreeConfigured()
                  ? `Cashfree keys found (${cashfreeMode() === 'sandbox' ? 'TEST mode: no real money' : 'LIVE mode'}).`
                  : 'Cashfree keys are not set on the server, so customers see manual UPI whatever you choose here.'}
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
      </div>
    </>
  );
}
