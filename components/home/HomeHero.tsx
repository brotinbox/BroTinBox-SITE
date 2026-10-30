'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePricing, useTrialOffer } from '@/components/providers/CatalogProvider';

export function HomeHero() {
  const PRICING = usePricing();
  const trialOffer = useTrialOffer();
  const trialFrom = Math.min(PRICING.trial.veg, PRICING.trial['non-veg']);
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
      offer: 'FROM ₹259/DAY',
      mobileOffer: 'FROM ₹259/DAY',
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
    {
      id: 'custom',
      title: 'BUILD YOUR OWN BOX',
      subtitle: 'COMING SOON',
      offer: 'CUSTOMIZE EVERY GRAM',
      mobileOffer: 'CUSTOMIZE EVERY GRAM',
      href: '/custom',
      image: '/custom.png',
      imageAlt: 'BroTin Box Custom digitally measured diet box',
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

      {/* 3. Full-Bleed 1-to-1 Attached Images Strip (Left to Right Edge, 0 Gaps, Sharp Corners, No Buttons) */}
      <div className="w-full relative z-10 border-t border-black/10 bg-white shadow-2xl">
        <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-0">
          {categoryCards.map((card) => (
            <Link
              key={card.id}
              href={card.href}
              className="group relative flex flex-col bg-white overflow-hidden border-r border-b md:border-b-0 border-black/10 [&:nth-child(2n)]:border-r-0 md:[&:nth-child(2n)]:border-r md:last:border-r-0 transition-all duration-300 tap-active"
            >
              {/* Clean Title Bar (Sharp corners, no buttons) */}
              <div className="py-2.5 sm:py-3.5 px-2 sm:px-4 text-center bg-white border-b border-black/5">
                <h3 className="font-heading font-[900] text-[11px] sm:text-xs md:text-sm lg:text-base text-ink tracking-tight group-hover:text-accent transition-colors uppercase leading-tight line-clamp-1">
                  {card.title}
                </h3>
              </div>

              {/* Seamless Attached Mockup Image (Edge-to-Edge Sharp) */}
              <div className="relative w-full aspect-[4/3] overflow-hidden bg-paper">
                <Image
                  src={card.image}
                  alt={card.imageAlt}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
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
