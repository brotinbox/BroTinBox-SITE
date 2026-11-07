'use client';

import Link from 'next/link';
import { parseOrderError } from '@/lib/checkout/submit';

/**
 * Shows an order/price error. Two cases get a next step instead of red text:
 *  - trial already used → Weekly / Monthly plan buttons
 *  - mobile not verified → link to verify it on the profile page
 */
export function OrderErrorNotice({ error, className = '' }: { error: string; className?: string }) {
  const { code, message } = parseOrderError(error);

  if (code === 'TRIAL_USED') {
    return (
      <div role="alert" className={`rounded-2xl border border-orange-200 bg-orange-50 p-3 sm:p-4 ${className}`}>
        <p className="text-sm font-bold text-ink">{message}</p>
        <p className="mt-0.5 text-xs text-gray-700">
          Trial boxes are one per person. Our Weekly and Monthly plans cost less per meal, so you get a better deal from here.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/weekly" className="px-4 py-2.5 rounded-xl bg-ink text-white text-sm font-bold">Weekly plan</Link>
          <Link href="/monthly" className="px-4 py-2.5 rounded-xl border border-ink/20 bg-white text-sm font-bold text-ink">Monthly plan</Link>
        </div>
      </div>
    );
  }

  if (code === 'VERIFY_PHONE') {
    return (
      <div role="alert" className={`rounded-2xl border border-orange-200 bg-orange-50 p-3 sm:p-4 ${className}`}>
        <p className="text-sm font-bold text-ink">{message}</p>
        <p className="mt-0.5 text-xs text-gray-700">It takes a few seconds. We&apos;ll send a code to your WhatsApp.</p>
        <Link href="/profile#phone" className="mt-3 inline-block px-4 py-2.5 rounded-xl bg-ink text-white text-sm font-bold">Verify my number</Link>
      </div>
    );
  }

  return (
    <p role="alert" className={`text-sm font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 ${className}`}>
      {message}
    </p>
  );
}
