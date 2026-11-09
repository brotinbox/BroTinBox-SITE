import { requireCustomer } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { deleteAddress, makeDefaultAddress } from '@/lib/customer/actions';
import { Btn, CustomerForm } from '@/components/account/forms';
import { AddAddressForm } from '@/components/account/AddAddressForm';
import { SettingsScreen } from '@/components/account/SettingsList';

export const metadata = { title: 'Delivery addresses', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AddressesPage() {
  const p = await requireCustomer('/profile/addresses');
  const supabase = await getSupabaseServer();
  const { data: addresses } = await supabase.from('addresses').select('*').eq('user_id', p.id).order('is_default', { ascending: false });

  return (
    <SettingsScreen title="Delivery addresses" description="The phone number on each address is who we call at the door.">
      {(addresses ?? []).length === 0 && <p className="text-sm text-gray-600">No saved addresses yet.</p>}
      {(addresses ?? []).map((a) => (
        <div key={a.id} className="rounded-2xl border border-gray-200 bg-white p-4 text-sm">
          <p className="font-bold">{a.label}{a.is_default && <span className="ml-2 text-[10px] font-bold text-ink">DEFAULT</span>}{!a.zone_id && <span className="ml-2 text-[10px] font-bold text-amber-700">NOT IN DELIVERY AREA</span>}</p>
          <p className="text-xs text-gray-600 mt-0.5">{a.recipient_name} · {a.phone}<br />{a.flat}, {a.street}{a.landmark ? `, ${a.landmark}` : ''}, {a.area} {a.pincode}</p>
          <div className="flex gap-2 mt-3">
            {!a.is_default && (
              <CustomerForm action={makeDefaultAddress}><input type="hidden" name="address_id" value={a.id} /><Btn variant="ghost">Make default</Btn></CustomerForm>
            )}
            <CustomerForm action={deleteAddress}><input type="hidden" name="address_id" value={a.id} /><Btn variant="danger" confirm={{ eyebrow: 'Remove address', tone: 'danger', title: 'Remove this address?', message: 'You can add it again any time.', confirmLabel: 'Remove', cancelLabel: 'Keep it' }}>Remove</Btn></CustomerForm>
          </div>
        </div>
      ))}
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-4"><AddAddressForm /></div>
    </SettingsScreen>
  );
}
