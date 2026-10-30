'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, X } from 'lucide-react';
import { usePricing, useRegularTrialPrice, useTrialOffer } from '@/components/providers/CatalogProvider';

const DISMISS_KEY = 'offer-bar-dismissed';
// Full-screen order flows already show the price.
const HIDDEN_ON = ['/checkout', '/tomorrow', '/weekly', '/monthly'];

/** Thin strip above the navbar while a trial offer runs (site_settings.trial_offer). */
export function OfferBar() {
  const pathname = usePathname();
  const offer = useTrialOffer();
  const PRICING = usePricing();
  const regular = useRegularTrialPrice();
  const [dismissed, setDismissed] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    try { setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1'); } catch {}
    if (offer) setDaysLeft(Math.ceil((offer.endsAt - Date.now()) / 864e5));
  }, [offer]);

  if (!offer || dismissed || HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const nv = PRICING.trial['non-veg'];
  const veg = PRICING.trial.veg;
  const price = nv === veg ? `₹${nv}` : `from ₹${Math.min(nv, veg)}`;
  const was = Math.max(regular['non-veg'], regular.veg);
  // Last day of the offer (ends_at is the moment it stops).
  const lastDay = new Date(offer.endsAt - 1).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch {}
  };

  return (
    <div className="relative bg-ink text-white">
      <Link
        href="/tomorrow"
        className="max-w-7xl mx-auto pl-4 pr-11 sm:px-12 py-2 flex items-center justify-center gap-x-2 gap-y-0.5 flex-wrap text-center text-[11px] sm:text-sm leading-snug"
      >
        <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider">
          {offer.label}
        </span>
        <span>
          Trial box <strong className="font-black">{price}</strong>{' '}
          <s className="text-white/50">₹{was}</s>
          <span className="text-white/70">
            {' · '}
            {daysLeft !== null && daysLeft <= 7 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : `till ${lastDay}`}
          </span>
        </span>
        <span className="inline-flex items-center gap-1 font-bold text-accent-bright">
          Order now <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hide offer"
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
