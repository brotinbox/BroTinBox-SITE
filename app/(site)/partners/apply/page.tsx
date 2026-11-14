import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { FocusHeader } from '@/components/layout/FocusHeader';
import { requireCustomer } from '@/lib/auth/session';
import { getPartnerByProfile } from '@/lib/partners/server';
import { getSupabaseService } from '@/lib/supabase/admin';
import { phoneOtpMode } from '@/lib/auth/otp-mode';
import { PhoneVerifyField } from '@/components/account/PhoneVerifyField';
import { PartnerApplyForm } from '@/components/partners/PartnerApplyForm';

export const metadata: Metadata = {
  title: 'Apply: trainer partner',
  robots: { index: false },
};

export default async function PartnerApplyPage() {
  const profile = await requireCustomer('/partners/apply');
  const [existing, otpMode, zones] = await Promise.all([
    getPartnerByProfile(profile.id),
    phoneOtpMode(),
    getSupabaseService().from('delivery_zones').select('area, pincode, tier').eq('is_active', true).order('area'),
  ]);
  if (existing) redirect('/partner');

  const needsPhone = !profile.phone || (!profile.phone_verified && otpMode !== 'off');
  const seen = new Set<string>();
  const areas = (zones.data ?? [])
    .map((z) => ({ value: `${z.pincode}|${z.area}`, label: `${z.area} · ${z.pincode}` }))
    .filter((z) => (seen.has(z.value) ? false : (seen.add(z.value), true)));

  return (
    <div className="min-h-screen bg-paper pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <FocusHeader title="Partner programme" titleTag="p" back="/partners" backLabel="Back to the partner programme" />
      <div className="max-w-xl mx-auto px-4 pt-6 space-y-6">
        <header>
          <p className="text-xs font-extrabold uppercase tracking-wider text-accent">Trainer partner</p>
          <h1 className="font-heading font-black text-3xl text-ink mt-1">Apply to partner with us</h1>
          <p className="text-gray-600 mt-2 text-sm">Two minutes. We check every trainer personally and reply on WhatsApp, usually within 2 days.</p>
        </header>

        {needsPhone ? (
          <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
            <p className="font-heading font-bold text-ink">First, verify your mobile number</p>
            <p className="text-sm text-gray-600">We use it to contact you about your application and payouts.</p>
            <PhoneVerifyField phone={profile.phone} verified={!!profile.phone_verified} />
          </section>
        ) : (
          <PartnerApplyForm
            phone={profile.phone!}
            defaults={{ fullName: profile.full_name ?? '', email: profile.email ?? '' }}
            areas={areas}
          />
        )}
      </div>
    </div>
  );
}
