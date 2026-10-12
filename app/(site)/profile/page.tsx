import Link from 'next/link';
import { requireCustomer } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { deleteAddress, makeDefaultAddress, updateProfile } from '@/lib/customer/actions';
import { AccountShell } from '@/components/account/AccountNav';
import { Btn, CustomerForm } from '@/components/account/forms';
import { AddAddressForm } from '@/components/account/AddAddressForm';
import { SignOutButton } from '@/components/account/SignOutButton';
import { ProfileProgress } from '@/components/account/ProfileProgress';
import { ageFromDob, profileCompletion } from '@/lib/customer/profile-completion';

export const metadata = { title: 'My profile', robots: { index: false } };
export const dynamic = 'force-dynamic';

const input = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:bg-white focus:border-ink focus:outline-none';
const label = 'block text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-1';
const Opt = () => <span className="normal-case font-semibold text-gray-400">(optional)</span>;

export default async function ProfilePage() {
  const p = await requireCustomer('/profile');
  const supabase = await getSupabaseServer();
  const { data: addresses } = await supabase.from('addresses').select('*').eq('user_id', p.id).order('is_default', { ascending: false });
  const done = profileCompletion(p, (addresses ?? []).length > 0);

  return (
    <AccountShell current="/profile" title="My profile" subtitle={p.email ?? undefined}>
      <div className="space-y-4">
        <ProfileProgress percent={done.percent} missing={done.missing} />

        <CustomerForm action={updateProfile} className="space-y-4">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
            <h2 className="font-heading font-bold text-gray-900">Basics</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <label><span className={label}>Full name</span><input name="full_name" defaultValue={p.full_name ?? ''} required maxLength={80} className={input} /></label>
              <label><span className={label}>Mobile <Opt /></span><input name="phone" defaultValue={(p.phone ?? '').replace(/^\+91/, '')} pattern="[6-9][0-9]{9}" maxLength={10} inputMode="numeric" className={input} /></label>
              <label><span className={label}>Goal</span>
                <select name="goal" defaultValue={p.goal ?? 'stay-fit'} className={input}>
                  <option value="fat-loss">Fat loss</option><option value="muscle-gain">Muscle gain</option>
                  <option value="stay-fit">Stay fit</option><option value="elderly-care">Elderly care</option>
                </select>
              </label>
              <label><span className={label}>Diet</span>
                <select name="diet_type" defaultValue={p.diet_type ?? 'non-veg'} className={input}>
                  <option value="non-veg">Non-veg</option><option value="veg">Veg</option><option value="eggetarian">Eggetarian</option>
                </select>
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" name="whatsapp_opt_in" defaultChecked={p.whatsapp_opt_in} /> WhatsApp delivery updates</label>
          </section>

          <section id="body" className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3 scroll-mt-24">
            <div>
              <h2 className="font-heading font-bold text-gray-900">Body &amp; targets <Opt /></h2>
              <p className="text-xs text-gray-500 mt-0.5">Add age, height and weight and we&apos;ll work out your daily calorie and protein targets.</p>
            </div>
            {p.target_calories ? (
              <p className="text-sm font-bold text-ink bg-accent-soft/60 rounded-xl px-3 py-2">
                Your target: {p.target_calories} kcal · {p.target_protein} g protein · {p.target_carbs} g carbs · {p.target_fat} g fat
              </p>
            ) : null}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <label><span className={label}>Gender</span>
                <select name="gender" defaultValue={p.gender ?? ''} className={input}>
                  <option value="">—</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                </select>
              </label>
              <label><span className={label}>Age</span><input name="age" type="number" min={18} max={100} defaultValue={ageFromDob(p.date_of_birth) ?? ''} className={input} /></label>
              <label><span className={label}>Height (cm)</span><input name="height_cm" type="number" step="0.1" min={100} max={250} defaultValue={p.height_cm ?? ''} className={input} /></label>
              <label><span className={label}>Weight (kg)</span><input name="weight_kg" type="number" step="0.1" min={25} max={300} defaultValue={p.weight_kg ?? ''} className={input} /></label>
              <label><span className={label}>Target weight (kg)</span><input name="target_weight_kg" type="number" step="0.1" min={25} max={300} defaultValue={p.target_weight_kg ?? ''} className={input} /></label>
              <label><span className={label}>Activity</span>
                <select name="activity_level" defaultValue={p.activity_level ?? ''} className={input}>
                  <option value="">—</option>
                  <option value="sedentary">Mostly sitting</option>
                  <option value="lightly-active">Light (1–2 workouts/wk)</option>
                  <option value="moderately-active">Moderate (3–5/wk)</option>
                  <option value="very-active">Very active (daily)</option>
                </select>
              </label>
              <label className="col-span-2 sm:col-span-3"><span className={label}>Allergies (comma separated)</span><input name="allergies" defaultValue={(p.allergies ?? []).join(', ')} maxLength={200} placeholder="e.g. peanuts, dairy" className={input} /></label>
            </div>
            <p className="text-[11px] text-gray-500">
              By saving these details you consent to us using them only to calculate your targets and keep allergens out of your meals.
              Clear any field to withdraw consent for it. See our <Link href="/privacy#data-we-collect" className="underline">Privacy Policy</Link>.
            </p>
          </section>

          <Btn>Save details</Btn>
        </CustomerForm>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
          <h2 className="font-heading font-bold text-gray-900">Delivery addresses</h2>
          {(addresses ?? []).map((a) => (
            <div key={a.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50/60 text-sm">
              <p className="font-bold">{a.label}{a.is_default && <span className="ml-2 text-[10px] font-bold text-ink">DEFAULT</span>}{!a.zone_id && <span className="ml-2 text-[10px] font-bold text-amber-700">NOT IN DELIVERY AREA</span>}</p>
              <p className="text-xs text-gray-600">{a.recipient_name} · {a.phone}<br />{a.flat}, {a.street}{a.landmark ? `, ${a.landmark}` : ''}, {a.area} {a.pincode}</p>
              <div className="flex gap-2 mt-2">
                {!a.is_default && (
                  <CustomerForm action={makeDefaultAddress}><input type="hidden" name="address_id" value={a.id} /><Btn variant="ghost">Make default</Btn></CustomerForm>
                )}
                <CustomerForm action={deleteAddress}><input type="hidden" name="address_id" value={a.id} /><Btn variant="danger" confirm="Remove this address?">Remove</Btn></CustomerForm>
              </div>
            </div>
          ))}
          <AddAddressForm />
        </section>

        <SignOutButton />
      </div>
    </AccountShell>
  );
}
