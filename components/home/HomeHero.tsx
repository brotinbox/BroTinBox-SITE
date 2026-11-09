'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePricing, useTrialOffer } from '@/components/providers/CatalogProvider';
import { fromPrice } from '@/lib/pricing';

export function HomeHero() {
  const PRICING = usePricing();
  const trialOffer = useTrialOffer();
  const trialFrom = Math.min(PRICING.trial.veg, PRICING.trial['non-veg']);
  const weeklyFromText = `FROM ₹${fromPrice(PRICING, 'weekly')}/MEAL`;
  const trialPriceText = trialOffer
    ? `${trialOffer.label.toUpperCase()} ₹${trialFrom}`
    : `FROM ₹${PRICING.trial.veg} (V) / ₹${PRICING.trial['non-veg']} (NV)`;
  const categoryCards = [
    {
      id: 'trial',
      title: 'DAILY TRIAL BOX',
      subtitle: 'JUST TRY IT',
      offer: trialPriceText,
      mobileOffer: trialOffer ? `NOW ₹${trialFrom}` : `FROM ₹${trialFrom}`,
      href: '/tomorrow',
      image: '/daily.png',
      imageAlt: 'BroTin Box Daily Trial Box meal',
    },
    {
      id: 'weekly',
      title: 'WEEKLY PLAN',
      subtitle: 'SMALL CHANGE MATTERS',
      offer: weeklyFromText,
      mobileOffer: weeklyFromText,
      href: '/weekly',
      image: '/weekly.png',
      imageAlt: 'BroTin Box Weekly 6-day protein meal plan boxes',
    },
    {
      id: 'monthly',
      title: 'MONTHLY PLAN',
      subtitle: 'WE GOT YOU',
      offer: 'HABIT ON AUTOPILOT',
      mobileOffer: 'HABIT ON AUTOPILOT',
      href: '/monthly',
      image: '/monthly.png',
      imageAlt: 'BroTin Box Monthly lifestyle meal plan stack',
    },
  ];

  return (
    <section className="relative w-full overflow-visible bg-gradient-to-b from-accent-soft via-paper to-sand text-ink pt-6 sm:pt-10 lg:pt-12 pb-0 select-none">
      {/* Main Hero Stage (Headline) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-4 sm:pt-6 lg:pt-8 pb-8 sm:pb-12 md:pb-16 flex flex-col items-center justify-center text-center">
        {/* Headline */}
        <div className="max-w-4xl mx-auto">
          <h1 className="font-heading font-[900] text-3xl sm:text-4xl lg:text-5xl text-ink tracking-tight leading-tight sm:leading-snug">
            Fresh daily protein meals.
          </h1>
        </div>
      </div>

      {/* Full-Bleed 1-to-1 Attached Images Strip (Left to Right Edge, 0 Gaps, Sharp Corners, No Buttons) */}
      <div className="w-full relative z-10 border-t border-black/10 bg-white shadow-2xl">
        {/* Mobile: trial box full-width on top, weekly + monthly side by side below.
            Desktop: three equal columns. */}
        <div className="w-full grid grid-cols-2 md:grid-cols-3 gap-0">
          {categoryCards.map((card, i) => (
            <Link
              key={card.id}
              href={card.href}
              className={`group relative flex flex-col bg-white overflow-hidden border-black/10 md:border-b-0 md:border-r md:last:border-r-0 transition-all duration-300 tap-active ${
                i === 0 ? 'col-span-2 md:col-span-1 border-b' : i === 1 ? 'border-r' : ''
              }`}
            >
              {/* Clean Title Bar (Sharp corners, no buttons) */}
              <div className="py-2.5 sm:py-3.5 px-2 sm:px-4 text-center bg-white border-b border-black/5">
                <h3 className="font-heading font-[900] text-[11px] sm:text-xs md:text-sm lg:text-base text-ink tracking-tight group-hover:text-accent transition-colors uppercase leading-tight line-clamp-1">
                  {card.title}
                </h3>
              </div>

              {/* Seamless Attached Mockup Image (Edge-to-Edge Sharp) */}
              <div className={`relative w-full overflow-hidden bg-paper ${i === 0 ? 'aspect-[16/9] md:aspect-[4/3]' : 'aspect-[4/3]'}`}>
                <Image
                  src={card.image}
                  alt={card.imageAlt}
                  fill
                  sizes={i === 0 ? '(max-width: 768px) 100vw, 33vw' : '(max-width: 768px) 50vw, 33vw'}
                  className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  priority={card.id === 'trial'}
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
