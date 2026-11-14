import { Bell, CalendarDays, FileText, HeartPulse, MapPin, MessageCircle, Receipt, Shield, TrendingUp, User, UtensilsCrossed, Wallet } from 'lucide-react';
import { requireCustomer } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { AccountShell } from '@/components/account/AccountNav';
import { SignOutButton } from '@/components/account/SignOutButton';
import { ProfileProgress } from '@/components/account/ProfileProgress';
import { SettingsGroup, SettingsRow } from '@/components/account/SettingsList';
import { ageFromDob, profileCompletion } from '@/lib/customer/profile-completion';
import { BRAND } from '@/config/brand';
import { getReferralsEnabled } from '@/lib/data/catalog';
import { ReferralShare } from '@/components/referral/ReferralShare';

export const metadata = { title: 'My profile', robots: { index: false } };
export const dynamic = 'force-dynamic';

const GOAL: Record<string, string> = { 'fat-loss': 'Fat loss', 'muscle-gain': 'Muscle gain', 'stay-fit': 'Stay fit', 'elderly-care': 'Elderly care' };
const DIET: Record<string, string> = { 'non-veg': 'Non-veg', veg: 'Veg', eggetarian: 'Eggetarian' };
const isPlaceholderEmail = (e: string | null) => !e || /@phone\.brotinbox\.invalid$/.test(e);

export default async function ProfilePage() {
  const p = await requireCustomer('/profile');
  const supabase = await getSupabaseServer();
  const [{ data: addresses }, referralsOn] = await Promise.all([
    supabase.from('addresses').select('area, pincode, is_default').eq('user_id', p.id).order('is_default', { ascending: false }),
    getReferralsEnabled(),
  ]);
  const done = profileCompletion(p, (addresses ?? []).length > 0);

  const email = isPlaceholderEmail(p.email) ? null : p.email;
  const initial = (p.full_name?.trim() || p.phone || '?').replace('+91', '').charAt(0).toUpperCase();
  const age = ageFromDob(p.date_of_birth);
  const body = [age && `${age} yrs`, p.height_cm && `${p.height_cm} cm`, p.weight_kg && `${p.weight_kg} kg`].filter(Boolean).join(' · ');
  const def = addresses?.[0];
  const notif = [p.whatsapp_opt_in && 'Delivery updates', p.whatsapp_offers_opt_in && 'Offers'].filter(Boolean).join(' · ');

  return (
    <AccountShell current="/profile" title="My profile">
      <div className="space-y-5">
        <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4">
          <span className="w-14 h-14 rounded-full bg-ink text-white font-heading font-black text-xl flex items-center justify-center shrink-0">{initial}</span>
          <div className="min-w-0">
            <p className="font-heading font-black text-lg text-ink truncate">{p.full_name || 'Add your name'}</p>
            <p className="text-xs text-gray-600 truncate">{[p.phone, email].filter(Boolean).join(' · ') || 'No contact details yet'}</p>
            {p.target_calories ? <p className="text-xs font-bold text-ink mt-1">{p.target_calories} kcal · {p.target_protein} g protein a day</p> : null}
          </div>
        </div>

        <ProfileProgress percent={done.percent} missing={done.missing} href="/profile/body" />

        {referralsOn && p.referral_code && <ReferralShare code={p.referral_code} compact />}

        <SettingsGroup title="Account">
          <SettingsRow href="/profile/details" icon={User} label="Personal details"
            value={[p.full_name, p.phone].filter(Boolean).join(' · ') || 'Name and mobile'}
            badge={!p.phone_verified ? 'Verify mobile' : undefined} />
          <SettingsRow href="/profile/diet" icon={UtensilsCrossed} label="Diet & goal"
            value={[DIET[p.diet_type ?? ''], GOAL[p.goal ?? '']].filter(Boolean).join(' · ') || 'Not set'} />
          <SettingsRow href="/profile/body" icon={HeartPulse} label="Body & targets"
            value={body || 'Add age, height and weight for your targets'} />
          <SettingsRow href="/profile/addresses" icon={MapPin} label="Delivery addresses"
            value={def ? `${def.area} ${def.pincode}${(addresses?.length ?? 0) > 1 ? ` · +${addresses!.length - 1} more` : ''}` : 'No address yet'} />
          <SettingsRow href="/profile/notifications" icon={Bell} label="WhatsApp notifications" value={notif || 'Off'} />
        </SettingsGroup>

        <SettingsGroup title="Your BroTin Box">
          <SettingsRow href="/subscription" icon={Wallet} label="My plan" />
          <SettingsRow href="/my-plan" icon={CalendarDays} label="My meals" />
          <SettingsRow href="/orders" icon={Receipt} label="Orders & payments" />
          <SettingsRow href="/progress" icon={TrendingUp} label="Progress" />
        </SettingsGroup>

        <SettingsGroup title="Help & legal">
          <SettingsRow href={BRAND.socials.whatsapp} external icon={MessageCircle} label="Chat with us on WhatsApp" />
          <SettingsRow href="/privacy" icon={Shield} label="Privacy policy" />
          <SettingsRow href="/terms" icon={FileText} label="Terms & refund policy" />
        </SettingsGroup>

        <SignOutButton />
      </div>
    </AccountShell>
  );
}
