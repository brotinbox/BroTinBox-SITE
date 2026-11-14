'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useChrome } from '@/lib/layout/chrome';
import { ArrowRight, X } from 'lucide-react';
import { usePricing, useRegularTrialPrice, useTrialOffer } from '@/components/providers/CatalogProvider';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'offer-bar-dismissed';
const ROTATE_MS = 5500;

type Slide = { key: string; href: string; badge: string; body: ReactNode; cta: string };

/**
 * Thin strip above the navbar. Slides between the trial offer
 * (site_settings.trial_offer) and Refer & earn (features.referrals).
 */
export function OfferBar({ referralsOn = false }: { referralsOn?: boolean }) {
  const chrome = useChrome();
  const offer = useTrialOffer();
  const PRICING = usePricing();
  const regular = useRegularTrialPrice();
  const [dismissed, setDismissed] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    try { setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1'); } catch {}
    if (offer) setDaysLeft(Math.ceil((offer.endsAt - Date.now()) / 864e5));
  }, [offer]);

  const slides: Slide[] = [];
  if (offer) {
    const nv = PRICING.trial['non-veg'];
    const veg = PRICING.trial.veg;
    const was = Math.max(regular['non-veg'], regular.veg);
    // Last day of the offer (ends_at is the moment it stops).
    const lastDay = new Date(offer.endsAt - 1).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
    slides.push({
      key: 'trial',
      href: '/tomorrow',
      badge: offer.label,
      cta: 'Order now',
      body: (
        <>
          Get your first trial box {nv === veg ? 'at' : 'from'} <strong className="font-black">₹{Math.min(nv, veg)}</strong>{' '}
          <s className="text-white/50">₹{was}</s>
          <span className="text-white/70">
            {' · '}
            {daysLeft !== null && daysLeft <= 7 ? `Only ${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : `Limited time, till ${lastDay}`}
          </span>
        </>
      ),
    });
  }
  if (referralsOn) {
    slides.push({
      key: 'refer',
      href: '/refer',
      badge: 'Refer & earn',
      cta: 'Refer now',
      body: (
        <>
          Refer a friend and you <strong className="font-black">both get a free juice</strong>
          <span className="text-white/70"> · T&C apply</span>
        </>
      ),
    });
  }

  const count = slides.length;
  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(t);
  }, [count, paused]);

  if (!count || dismissed || !chrome.offerBar) return null;

  const active = index % count;
  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch {}
  };

  return (
    <div
      className="relative bg-ink text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Offers"
    >
      {/* Every slide sits in the same grid cell, so the bar keeps the height of the tallest one. */}
      <div className="grid">
        {slides.map((s, i) => (
          <Link
            key={s.key}
            href={s.href}
            aria-hidden={i !== active}
            tabIndex={i === active ? 0 : -1}
            className={cn(
              '[grid-area:1/1] max-w-7xl w-full mx-auto pr-11 sm:pr-12 py-2',
              count > 1 ? 'pl-12 sm:pl-16' : 'pl-4 sm:pl-12',
              'flex items-center justify-center gap-x-2 gap-y-0.5 flex-wrap text-center text-[11px] sm:text-sm leading-snug transition-all duration-500 motion-reduce:transition-none',
              i === active ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none',
            )}
          >
            <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider">
              {s.badge}
            </span>
            <span>{s.body}</span>
            <span className="inline-flex items-center gap-1 font-bold text-accent-bright">
              {s.cta} <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        ))}
      </div>

      {count > 1 && (
        <div className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {slides.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show offer ${i + 1} of ${count}`}
              aria-current={i === active}
              className="p-1 group"
            >
              <span className={cn('block h-1.5 rounded-full transition-all', i === active ? 'w-3.5 bg-accent' : 'w-1.5 bg-white/35 group-hover:bg-white/60')} />
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={dismiss}
        aria-label="Hide offers"
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
