'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu as MenuIcon } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { AccountButton } from '@/components/layout/AccountButton';
import { LocationSelector } from '@/components/layout/LocationSelector';

export function HomeHero() {
  const router = useRouter();
  const { setNavDrawerOpen } = useAppStore();

  const categoryCards = [
    {
      id: 'trial',
      title: 'DAILY TRIAL BOX',
      subtitle: 'JUST TRY IT',
      offer: 'FROM ₹289 (V) / ₹319 (NV)',
      mobileOffer: 'FROM ₹289 (V) / ₹319 (NV)',
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
    <section className="relative w-full overflow-visible bg-gradient-to-b from-[#E2ECBA] via-[#EDF5D3] to-[#F5F8EC] text-[#124233] pt-4 sm:pt-7 pb-0 select-none">
      {/* 1. Top Bar: Mobile Header (Location + Avatar) & Desktop Logo + Nav Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 sm:mb-16 relative z-50">
        {/* Mobile Header: Location on Left, Menu Slider on Right */}
        <div className="flex md:hidden items-center justify-between gap-3">
          <LocationSelector variant="mobile" />

          <button
            type="button"
            onClick={() => setNavDrawerOpen(true)}
            aria-label="Open menu"
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#124233] bg-white border border-[#124233]/15 shadow-xs shrink-0 active:scale-95 transition-all"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Desktop Header (Brand Logo + Clean Navigation Links + Login Button) */}
        <div className="hidden md:flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/logo.png"
              alt="BroTin Box"
              width={200}
              height={72}
              className="h-14 md:h-16 w-auto object-contain transition-transform group-hover:scale-105"
              priority
            />
          </Link>

          <nav className="flex items-center gap-6 lg:gap-8">
            <Link
              href="/menu"
              className="text-sm font-bold text-[#124233] hover:text-[#899545] transition-colors tracking-wide"
            >
              Menu
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-bold text-[#124233] hover:text-[#899545] transition-colors tracking-wide"
            >
              Pricing
            </Link>
            <Link
              href="/blog"
              className="text-sm font-bold text-[#124233] hover:text-[#899545] transition-colors tracking-wide flex items-center gap-1.5"
            >
              <span>Blog</span>
              <span className="text-[10px] font-bold bg-[#899545] text-white px-1.5 py-0.2 rounded-full">New</span>
            </Link>
            <Link
              href="/delivery-areas"
              className="text-sm font-bold text-[#124233] hover:text-[#899545] transition-colors tracking-wide"
            >
              Delivery Areas
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <LocationSelector variant="desktop" />

            <AccountButton variant="desktop" />
          </div>
        </div>
      </div>

      {/* 2. Main Hero Stage (Headline) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-4 sm:pt-8 lg:pt-14 pb-8 sm:pb-12 md:pb-16 flex flex-col items-center justify-center text-center">
        {/* Headline */}
        <div className="max-w-4xl mx-auto">
          <h1 className="font-heading font-[900] text-3xl sm:text-4xl lg:text-5xl text-[#124233] tracking-tight leading-tight sm:leading-snug">
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
                <h3 className="font-heading font-[900] text-[11px] sm:text-xs md:text-sm lg:text-base text-[#124233] tracking-tight group-hover:text-[#899545] transition-colors uppercase leading-tight line-clamp-1">
                  {card.title}
                </h3>
              </div>

              {/* Seamless Attached Mockup Image (Edge-to-Edge Sharp) */}
              <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#FAFAF8]">
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
