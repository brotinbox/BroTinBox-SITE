import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { BRAND } from '@/config/brand';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { getSessionUser } from '@/lib/auth/session';

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
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const destination = safeNext(next);

  if (await getSessionUser()) redirect(destination);

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <Link href="/" className="inline-flex items-center justify-center mb-6 group">
          <Image
            src="/logo.png"
            alt={BRAND.name}
            width={180}
            height={60}
            className="h-16 w-auto object-contain transition-transform group-hover:scale-105"
            priority
          />
        </Link>

        <h2 className="font-heading font-black text-2xl sm:text-3xl text-gray-900">Sign in to {BRAND.name}</h2>
        <p className="mt-2 text-xs text-gray-500">
          Manage your meal plan, skip or pause days, and track deliveries in Coimbatore.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-gray-200 shadow-xl space-y-5">
          {error && ERRORS[error] && (
            <p className="text-xs text-rose-700 font-semibold bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 text-center">
              {ERRORS[error]}
            </p>
          )}

          <GoogleSignInButton next={destination} />

          <p className="text-[11px] text-gray-500 text-center leading-relaxed">
            New here? Signing in with Google creates your account. You&apos;ll add your phone number
            and delivery address next.
          </p>

          <div className="pt-1 text-center">
            <span className="text-[11px] text-gray-400">
              By continuing you agree to {BRAND.name}&apos;s{' '}
              <Link href="/terms" className="underline hover:text-gray-600">Terms</Link> and{' '}
              <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
            </span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Secure Google sign-in • We never see your password</span>
        </div>
      </div>
    </div>
  );
}
