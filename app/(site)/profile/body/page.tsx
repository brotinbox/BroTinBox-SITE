import Link from 'next/link';
import { requireCustomer } from '@/lib/auth/session';
import { updateProfile } from '@/lib/customer/actions';
import { Btn, CustomerForm } from '@/components/account/forms';
import { SettingsScreen, fieldInput, fieldLabel } from '@/components/account/SettingsList';
import { ageFromDob } from '@/lib/customer/profile-completion';

export const metadata = { title: 'Body & targets', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function BodyPage() {
  const p = await requireCustomer('/profile/body');
  return (
    <SettingsScreen title="Body & targets" description="Optional. Add age, height and weight and we'll work out your daily calorie and protein targets.">
      {p.target_calories ? (
        <p className="text-sm font-bold text-ink bg-accent-soft/60 rounded-xl px-3 py-2.5">
          Your target: {p.target_calories} kcal · {p.target_protein} g protein · {p.target_carbs} g carbs · {p.target_fat} g fat
        </p>
      ) : null}
      <CustomerForm action={updateProfile} className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
        <input type="hidden" name="section" value="body" />
        <div className="grid grid-cols-2 gap-3">
          <label><span className={fieldLabel}>Gender</span>
            <select name="gender" defaultValue={p.gender ?? ''} className={fieldInput}>
              <option value="">—</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </label>
          <label><span className={fieldLabel}>Age</span><input name="age" type="number" inputMode="numeric" min={18} max={100} defaultValue={ageFromDob(p.date_of_birth) ?? ''} className={fieldInput} /></label>
          <label><span className={fieldLabel}>Height (cm)</span><input name="height_cm" type="number" inputMode="decimal" step="0.1" min={100} max={250} defaultValue={p.height_cm ?? ''} className={fieldInput} /></label>
          <label><span className={fieldLabel}>Weight (kg)</span><input name="weight_kg" type="number" inputMode="decimal" step="0.1" min={25} max={300} defaultValue={p.weight_kg ?? ''} className={fieldInput} /></label>
          <label><span className={fieldLabel}>Target weight (kg)</span><input name="target_weight_kg" type="number" inputMode="decimal" step="0.1" min={25} max={300} defaultValue={p.target_weight_kg ?? ''} className={fieldInput} /></label>
          <label><span className={fieldLabel}>Activity</span>
            <select name="activity_level" defaultValue={p.activity_level ?? ''} className={fieldInput}>
              <option value="">—</option>
              <option value="sedentary">Mostly sitting</option>
              <option value="lightly-active">Light (1–2 workouts/wk)</option>
              <option value="moderately-active">Moderate (3–5/wk)</option>
              <option value="very-active">Very active (daily)</option>
            </select>
          </label>
          <label className="col-span-2"><span className={fieldLabel}>Allergies (comma separated)</span>
            <input name="allergies" defaultValue={(p.allergies ?? []).join(', ')} maxLength={200} placeholder="e.g. peanuts, dairy" className={fieldInput} />
          </label>
        </div>
        <p className="text-[11px] text-gray-500">
          By saving these details you consent to us using them only to calculate your targets and keep allergens out of your meals.
          Clear any field to withdraw consent for it. See our <Link href="/privacy#data-we-collect" className="underline">Privacy Policy</Link>.
        </p>
        <Btn className="w-full py-3 text-sm">Save</Btn>
      </CustomerForm>
    </SettingsScreen>
  );
}
