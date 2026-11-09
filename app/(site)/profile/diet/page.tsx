import { requireCustomer } from '@/lib/auth/session';
import { updateProfile } from '@/lib/customer/actions';
import { Btn, CustomerForm } from '@/components/account/forms';
import { SettingsScreen, fieldInput, fieldLabel } from '@/components/account/SettingsList';

export const metadata = { title: 'Diet & goal', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function DietPage() {
  const p = await requireCustomer('/profile/diet');
  return (
    <SettingsScreen title="Diet & goal" description="Your goal sets your calorie and protein targets.">
      <CustomerForm action={updateProfile} className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
        <input type="hidden" name="section" value="diet" />
        <label className="block"><span className={fieldLabel}>Goal</span>
          <select name="goal" defaultValue={p.goal ?? 'stay-fit'} className={fieldInput}>
            <option value="fat-loss">Fat loss</option><option value="muscle-gain">Muscle gain</option>
            <option value="stay-fit">Stay fit</option><option value="elderly-care">Elderly care</option>
          </select>
        </label>
        <label className="block"><span className={fieldLabel}>Diet</span>
          <select name="diet_type" defaultValue={p.diet_type ?? 'non-veg'} className={fieldInput}>
            <option value="non-veg">Non-veg</option><option value="veg">Veg</option><option value="eggetarian">Eggetarian</option>
          </select>
        </label>
        <Btn className="w-full py-3 text-sm">Save</Btn>
      </CustomerForm>
    </SettingsScreen>
  );
}
