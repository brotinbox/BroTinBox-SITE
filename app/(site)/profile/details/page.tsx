import { requireCustomer } from '@/lib/auth/session';
import { updateProfile } from '@/lib/customer/actions';
import { Btn, CustomerForm } from '@/components/account/forms';
import { PhoneVerifyField } from '@/components/account/PhoneVerifyField';
import { SettingsScreen, fieldInput, fieldLabel } from '@/components/account/SettingsList';

export const metadata = { title: 'Personal details', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function DetailsPage() {
  const p = await requireCustomer('/profile/details');
  const email = p.email && !/@phone\.brotinbox\.invalid$/.test(p.email) ? p.email : null;
  return (
    <SettingsScreen title="Personal details">
      <CustomerForm action={updateProfile} className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
        <input type="hidden" name="section" value="details" />
        <label className="block"><span className={fieldLabel}>Full name</span>
          <input name="full_name" defaultValue={p.full_name ?? ''} required minLength={2} maxLength={80} className={fieldInput} />
        </label>
        <Btn className="w-full py-3 text-sm">Save name</Btn>
      </CustomerForm>

      <section id="phone" className="rounded-2xl border border-gray-200 bg-white p-5 space-y-2 scroll-mt-24">
        <span className={fieldLabel}>Mobile</span>
        <PhoneVerifyField phone={p.phone} verified={!!p.phone_verified} />
        <p className="text-[11px] text-gray-500">Verified on WhatsApp. You can sign in with this number.</p>
      </section>

      {email && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <span className={fieldLabel}>Email</span>
          <p className="text-sm text-gray-800">{email}</p>
          <p className="text-[11px] text-gray-500 mt-1">From your Google sign-in.</p>
        </section>
      )}
    </SettingsScreen>
  );
}
