import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ChevronDown, Gift, Share2, ShoppingBag } from 'lucide-react';
import { getCurrentProfile } from '@/lib/auth/session';
import { getReferralsEnabled } from '@/lib/data/catalog';
import { ReferralShare } from '@/components/referral/ReferralShare';
import { BRAND } from '@/config/brand';

export const metadata: Metadata = {
  title: 'Refer & earn',
  description: `Share your ${BRAND.name} code. When a friend takes their first weekly or monthly plan, you both get a free juice.`,
  alternates: { canonical: '/refer' },
};

const STEPS = [
  { icon: Share2, title: 'Share your link' },
  { icon: ShoppingBag, title: 'Friend takes a plan' },
  { icon: Gift, title: 'You both get a juice' },
];

export default async function ReferPage() {
  const [profile, enabled] = await Promise.all([getCurrentProfile(), getReferralsEnabled()]);
  const code = profile?.referral_code ?? null;

  return (
    <div className="max-w-xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      <header className="text-center">
        <p className="text-xs font-extrabold uppercase tracking-wider text-accent">Refer & earn</p>
        <h1 className="font-heading font-black text-3xl sm:text-4xl text-ink mt-1 text-balance">Share good food, get a free juice</h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">Know someone who wants to eat better? Send them your link.</p>
      </header>

      {!enabled ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-5 text-center text-sm text-gray-600">Referral rewards are paused right now. Check back soon.</p>
      ) : code ? (
        <ReferralShare code={code} />
      ) : (
        <div className="rounded-2xl bg-ink text-white p-5 text-center">
          <p className="font-heading font-black text-lg">Sign in to get your code</p>
          <Link href="/login?next=/refer" className="mt-4 inline-flex h-11 px-5 rounded-xl bg-accent hover:bg-accent-bright font-bold text-sm items-center gap-2">
            Sign in <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      <ol className="grid grid-cols-3 gap-2">
        {STEPS.map((s, i) => (
          <li key={s.title} className="rounded-2xl border border-gray-200 bg-white p-3 text-center">
            <span className="mx-auto w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center"><s.icon className="w-4 h-4" /></span>
            <p className="text-[10px] font-bold text-gray-400 mt-2">STEP {i + 1}</p>
            <p className="font-heading font-bold text-xs sm:text-sm text-ink leading-tight mt-0.5">{s.title}</p>
          </li>
        ))}
      </ol>

      <details id="terms" className="group scroll-mt-24 rounded-2xl border border-gray-200 bg-white">
        <summary className="flex items-center justify-between cursor-pointer list-none px-4 py-3 text-sm font-bold text-ink [&::-webkit-details-marker]:hidden">
          Terms & conditions
          <ChevronDown className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="px-4 pb-4 space-y-1.5 text-xs text-gray-600 list-disc pl-8">
          <li>Valid on your friend&apos;s <strong>first weekly or monthly plan</strong>, not on trial boxes.</li>
          <li>One code per friend. You can&apos;t use your own code.</li>
          <li>Your juice is added to your next box once your friend&apos;s plan is paid. If you have no box scheduled, it comes with your next plan.</li>
          <li>You get the same juice your friend picks. ABC juice is not included.</li>
          <li>Free juices have no cash value and can&apos;t be exchanged or refunded. Rewards may be withdrawn if your friend&apos;s plan is refunded.</li>
          <li>Genuine referrals only: rewards from duplicate or fake accounts are cancelled (see our <Link href="/terms#acceptable-use" className="underline">Terms</Link>).</li>
          <li>We may change or end this offer at any time. Rewards already earned are honoured.</li>
        </ul>
      </details>
    </div>
  );
}
