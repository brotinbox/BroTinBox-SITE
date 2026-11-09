import { requireCustomer } from '@/lib/auth/session';
import { updateProfile } from '@/lib/customer/actions';
import { Btn, CustomerForm } from '@/components/account/forms';
import { SettingsScreen } from '@/components/account/SettingsList';

export const metadata = { title: 'WhatsApp notifications', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const p = await requireCustomer('/profile/notifications');
  return (
    <SettingsScreen title="WhatsApp notifications">
      <CustomerForm action={updateProfile} className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <input type="hidden" name="section" value="notifications" />
        <label className="flex items-start gap-3 text-sm text-gray-800">
          <input type="checkbox" name="whatsapp_opt_in" defaultChecked={p.whatsapp_opt_in} className="mt-1 w-4 h-4" />
          <span><span className="font-bold">Delivery updates</span><span className="block text-xs text-gray-500">Order confirmations and when your box is on the way.</span></span>
        </label>
        <label className="flex items-start gap-3 text-sm text-gray-800">
          <input type="checkbox" name="whatsapp_offers_opt_in" defaultChecked={p.whatsapp_offers_opt_in} className="mt-1 w-4 h-4" />
          <span><span className="font-bold">Offers and plan reminders</span><span className="block text-xs text-gray-500">A few messages at most. Tap &ldquo;Stop offers&rdquo; in any of them to stop.</span></span>
        </label>
        <Btn className="w-full py-3 text-sm">Save</Btn>
      </CustomerForm>
    </SettingsScreen>
  );
}
