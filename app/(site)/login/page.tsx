import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { BRAND } from '@/config/brand';
import { FocusHeader } from '@/components/layout/FocusHeader';
import { LoginPagePanel } from '@/components/auth/LoginPagePanel';
import { getSessionUser } from '@/lib/auth/session';
import { getGoogleLoginEnabled } from '@/lib/data/catalog';
import { showPhoneOtpForm } from '@/lib/auth/otp-mode';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false },
};

const ERRORS: Record<string, string> = {
  auth_failed: 'Sign-in did not complete. Please try again.',
  missing_code: 'Sign-in link was incomplete. Please try again.',
  blocked: 'This account has been suspended. Contact us on WhatsApp for help.',
};

function safeNext(next?: string) {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/dashboard';
  return next;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; otp?: string }>;
}) {
  const { next, error, otp } = await searchParams;
  const destination = safeNext(next);
  const phoneEnabled = await showPhoneOtpForm(otp);
  const googleEnabled = (await getGoogleLoginEnabled()) || !phoneEnabled;

  if (await getSessionUser()) redirect(destination);

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <FocusHeader backLabel="Back" />
      <div className="flex-1 flex flex-col justify-center py-8 px-4">
      <div className="mx-auto w-full max-w-[460px]">
        <Link href="/" className="flex justify-center mb-6">
          <Image src="/logo.png" alt={BRAND.name} width={180} height={60} className="h-14 w-auto object-contain" priority />
        </Link>

        <div className="bg-white rounded-[28px] border border-gray-200 shadow-xl px-6 sm:px-10 py-9 space-y-4">
          {error && ERRORS[error] && (
            <p className="text-xs text-rose-700 font-semibold bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 text-center">
              {ERRORS[error]}
            </p>
          )}
          <LoginPagePanel phoneEnabled={phoneEnabled} googleEnabled={googleEnabled} next={destination} />
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Secure sign-in • No passwords to remember</span>
        </div>
      </div>
      </div>
    </div>
  );
}
