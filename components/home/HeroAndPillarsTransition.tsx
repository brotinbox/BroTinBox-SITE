'use client';

import { AccountButton } from '@/components/layout/AccountButton';
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  X,
  ChevronDown,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';

type TabType = 'plans' | 'people';

interface CardItem {
  id: string;
  number: string;
  title: string;
  tag: string;
  dayBadge: string;
  description: string;
  priceNote: string;
  bgColor: string;
  accentColor: string;
  image: string;
  recommendedBoxes?: {
    name: string;
    day: string;
    protein: string;
    calories: string;
    description: string;
    slug: string;
    image: string;
    price: number;
  }[];
}

const FOUR_PLANS_DATA: CardItem[] = [
  {
    id: 'per-day',
    number: '01',
    title: 'Per Day Trial',
    tag: 'SINGLE BOX',
    dayBadge: 'TODAY',
    description:
      'Try a single box today. Hot homestyle lunch cooked fresh this morning and delivered to your desk or home before 1 PM.',
    priceNote: 'Starting at ₹269 • No commitment',
    bgColor: 'bg-[#182338]', // Deep Navy
    accentColor: 'text-sky-300',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    recommendedBoxes: [
      {
        name: 'Power Chicken Box',
        day: 'Mon',
        protein: '60g',
        calories: '695 kcal',
        description: 'Kongu black pepper spiced country chicken, soft whole wheat chapatis & brown channa sundal.',
        slug: 'power-chicken-box',
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
        price: 299,
      },
      {
        name: 'Paneer Balance Box',
        day: 'Tue',
        protein: '42g',
        calories: '685 kcal',
        description: 'Fresh farm paneer bhurji with turmeric and ginger, mineral-rich ragi dosas & channa.',
        slug: 'paneer-balance-box',
        image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80',
        price: 269,
      },
    ],
  },
  {
    id: 'per-week',
    number: '02',
    title: 'Per Week Routine',
    tag: '6 DAYS • MON TO SAT',
    dayBadge: '6 DAYS',
    description:
      'Our most popular routine. 6 different protein meals from Monday to Saturday. Never repeat dishes, skip with one tap.',
    priceNote: '₹1,532 / week • Free Delivery',
    bgColor: 'bg-[#3A1A0D]', // Deep Forest Green
    accentColor: 'text-emerald-300',
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80',
    recommendedBoxes: [
      {
        name: '6-Day Balanced Rotation',
        day: 'Mon–Sat',
        protein: '42g–60g / day',
        calories: '680–720 kcal',
        description: 'Chicken, Fish, Paneer & Soya rotation. Weighed portions with zero kitchen waste.',
        slug: 'power-chicken-box',
        image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80',
        price: 1532,
      },
    ],
  },
  {
    id: 'per-month',
    number: '03',
    title: 'Per Month Lifestyle',
    tag: '24 DAYS • FULL COMMITMENT',
    dayBadge: '24 DAYS',
    description:
      '24 daily lunch deliveries for serious body transformations. Priority kitchen batch, free protein add-ons & nutritionist support.',
    priceNote: '₹5,899 / month • Best Value',
    bgColor: 'bg-[#2E1A33]', // Deep Plum
    accentColor: 'text-fuchsia-300',
    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
    recommendedBoxes: [
      {
        name: '24-Day Transformation Plan',
        day: '4 Weeks',
        protein: '50g+ Daily Avg',
        calories: 'Clean Macros',
        description: 'Complete month of weighed nutrition. Pause or reschedule anytime without losing money.',
        slug: 'lean-fish-box',
        image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80',
        price: 5899,
      },
    ],
  },
  {
    id: 'custom-plan',
    number: '04',
    title: 'Custom Macro Builder',
    tag: 'FLEXIBLE • DIETITIAN',
    dayBadge: 'CUSTOM',
    description:
      'Build your exact calorie & protein targets. Custom portions weighed to the gram on digital scales every morning in Coimbatore.',
    priceNote: 'Tailored Macros • Digital Scale',
    bgColor: 'bg-[#18181B]', // Deep Charcoal
    accentColor: 'text-amber-300',
    image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=800&q=80',
    recommendedBoxes: [
      {
        name: 'Personalized Macro Box',
        day: 'Daily Custom',
        protein: 'Target Configured',
        calories: 'Exact Grams',
        description: 'Digitally measured ingredients matched to your fitness targets with zero guessing.',
        slug: 'power-chicken-box',
        image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=400&q=80',
        price: 319,
      },
    ],
  },
];

const FOUR_PEOPLE_DATA: CardItem[] = [
  {
    id: 'fitness',
    number: '01',
    title: 'Fitness & Fat Loss',
    tag: 'LEAN MUSCLE',
    dayBadge: 'LEAN',
    description:
      'For gym-goers and active professionals aiming for sustainable fat loss. High fiber, controlled complex carbs & pure protein.',
    priceNote: '~650 kcal • Clean Fiber & Greens',
    bgColor: 'bg-[#182338]',
    accentColor: 'text-sky-300',
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80',
    recommendedBoxes: [
      {
        name: 'Paneer Balance Box',
        day: 'Tuesday',
        protein: '42g',
        calories: '685 kcal',
        description: 'Fresh farm paneer bhurji with turmeric and ginger, mineral-rich ragi dosas & channa.',
        slug: 'paneer-balance-box',
        image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80',
        price: 269,
      },
    ],
  },
  {
    id: 'athletes',
    number: '02',
    title: 'Athletes & Heavy Lifters',
    tag: 'MAX RECOVERY',
    dayBadge: '60G+',
    description:
      'Heavy strength training, crossfit, or sports conditioning. Double chicken cuts, boiled farm eggs, and clean carbs.',
    priceNote: '~720 kcal • 60g+ High Protein',
    bgColor: 'bg-[#3A1A0D]',
    accentColor: 'text-emerald-300',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    recommendedBoxes: [
      {
        name: 'Power Chicken Box',
        day: 'Monday',
        protein: '60g',
        calories: '695 kcal',
        description: 'Kongu black pepper spiced country chicken with 2 boiled farm eggs and chapatis.',
        slug: 'power-chicken-box',
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
        price: 299,
      },
    ],
  },
  {
    id: 'elderly',
    number: '03',
    title: 'Elderly & Gentle Digestion',
    tag: 'GENTLE MACROS',
    dayBadge: 'MILLETS',
    description:
      'Specially calibrated for parents and seniors. Low sodium, soft traditional millets, steamed greens, and gentle proteins.',
    priceNote: 'Soft Traditional Cooking',
    bgColor: 'bg-[#2E1A33]',
    accentColor: 'text-fuchsia-300',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'professionals',
    number: '04',
    title: 'Desk & Office Fit',
    tag: 'PEAK FOCUS',
    dayBadge: 'LIGHT',
    description:
      'Zero post-lunch food coma. Slower-digesting ancient millets, fresh salads, and lean protein designed for all-day focus.',
    priceNote: '~550 kcal • Zero Sugar Spikes',
    bgColor: 'bg-[#18181B]',
    accentColor: 'text-amber-300',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    recommendedBoxes: [
      {
        name: 'Lean Fish Box',
        day: 'Wednesday',
        protein: '56g',
        calories: '695 kcal',
        description: 'Pan-seared tawa masala sea fish fillet, steamed brown rice & live sprout salad.',
        slug: 'lean-fish-box',
        image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80',
        price: 279,
      },
    ],
  },
];

export function HeroAndPillarsTransition() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('plans');
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);
  const { setNavDrawerOpen } = useAppStore();

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const totalDistance = containerRef.current.offsetHeight - window.innerHeight;
            if (totalDistance > 0) {
              const scrolled = -rect.top;
              const p = Math.min(1, Math.max(0, scrolled / totalDistance));
              setScrollProgress(p);
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const marqueeItems = [1, 2, 3, 4];
  const currentCards = activeTab === 'plans' ? FOUR_PLANS_DATA : FOUR_PEOPLE_DATA;

  // Shrink calculation:
  // Starts at full width (scale 1, translateY 0, rounded 0)
  // Shrinks down to the width of the 2 middle cards (~52% width)
  // Translates down to the bottom so that only its top half is visible at the bottom edge!
  const heroScale = 1 - scrollProgress * 0.48; // scales down to 0.52 (width of 2 center cards)
  const heroTranslateY = scrollProgress * 76; // moves down to bottom edge in % of screen height
  const heroBorderRadius = scrollProgress * 36; // smoothly rounds corners to 36px

  // Background pillars layer
  const pillarsOpacity = Math.min(1, 0.4 + scrollProgress * 0.9);

  const handleHeroTrayClick = () => {
    if (scrollProgress > 0.4) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[220vh] sm:h-[240vh] bg-paper"
    >
      {/* Pinned Sticky Stage */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between">
        {/* Layer 1 (Behind): Second Section - 4 Category Cards ('How would you like your food?') */}
        <div
          className="absolute inset-0 z-10 w-full h-full flex flex-col justify-start pt-4 sm:pt-6 pb-28 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto select-none"
          style={{ opacity: pillarsOpacity }}
        >
          {/* Section Header */}
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto shrink-0 mb-3 sm:mb-4">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-ink/80 mb-1 bg-primary/10 px-3 py-0.5 rounded-full">
              Choose Your Fit
            </span>

            <h2 className="font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-gray-950 tracking-tight">
              How would you like your food?
            </h2>

            {/* Switcher Pill */}
            <div className="mt-2.5 inline-flex items-center p-1 bg-gray-200/80 rounded-full border border-gray-300/80 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab('plans')}
                className={`px-5 sm:px-6 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === 'plans'
                    ? 'bg-gray-950 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-950'
                }`}
              >
                PLANS
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('people')}
                className={`px-5 sm:px-6 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === 'people'
                    ? 'bg-gray-950 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-950'
                }`}
              >
                PEOPLE
              </button>
            </div>
          </div>

          {/* 4 Category Pillar Cards (Side-by-side, Normal horizontal typography, Notch image button) */}
          <div className="w-full flex-1 max-h-[62vh] sm:max-h-[64vh]">
            {/* Desktop: 4 Columns | Mobile: Horizontal Snap Carousel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 lg:gap-4 h-full overflow-x-auto sm:overflow-visible flex-nowrap sm:flex-wrap pb-2 sm:pb-0 no-scrollbar snap-x sm:snap-none">
              {currentCards.map((card) => {
                return (
                  <div
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    className={`group relative rounded-2xl sm:rounded-3xl overflow-hidden ${card.bgColor} text-white flex flex-col justify-between p-4 sm:p-5 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer border border-white/10 shrink-0 w-[80vw] sm:w-auto snap-center`}
                  >
                    {/* Top Content: Clean Number + Normal Horizontal Text (No Sideways, No Icons) */}
                    <div className="z-10 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold tracking-widest text-white/50">
                          {card.number}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/10 border border-white/15 ${card.accentColor}`}
                        >
                          {card.tag}
                        </span>
                      </div>

                      <h3 className="font-heading font-black text-lg sm:text-xl lg:text-2xl text-white tracking-tight uppercase leading-tight pt-1">
                        {card.title}
                      </h3>

                      <p className="text-[11px] sm:text-xs text-white/75 mt-1 line-clamp-2 leading-relaxed">
                        {card.description}
                      </p>

                      <p className="text-[10px] font-bold text-white/50 pt-0.5">
                        {card.priceNote}
                      </p>
                    </div>

                    {/* Bottom Image with Notched Cutout Button & Day Pill (Reference Style) */}
                    <div className="relative aspect-[16/11] w-full rounded-2xl overflow-hidden mt-3 shadow-md border border-white/15 group/img">
                      <Image
                        src={card.image}
                        alt={card.title}
                        fill
                        sizes="(max-width: 768px) 80vw, 25vw"
                        className="object-cover group-hover/img:scale-105 transition-transform duration-500 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                      {/* Top Right Day Pill Badge (like TUE badge in reference) */}
                      <div className="absolute top-2.5 right-2.5 z-10">
                        <span className="bg-[#B91C1C] text-white border border-amber-300/80 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-md">
                          {card.dayBadge}
                        </span>
                      </div>

                      {/* Bottom-Right Inverted Curved Notch Cutout */}
                      <div className="absolute bottom-0 right-0 z-10">
                        {/* Vector concave fillet mask matching the card background */}
                        <svg
                          width="58"
                          height="58"
                          viewBox="0 0 58 58"
                          fill="none"
                          className={`absolute bottom-0 right-0 pointer-events-none ${
                            card.id === 'per-day'
                              ? 'text-[#182338]'
                              : card.id === 'per-week'
                              ? 'text-[#3A1A0D]'
                              : card.id === 'per-month'
                              ? 'text-[#2E1A33]'
                              : 'text-[#18181B]'
                          }`}
                        >
                          <path
                            d="M 58 0 C 58 8, 50 16, 42 16 L 24 16 C 14 16, 14 26, 14 36 L 14 42 C 14 50, 8 58, 0 58 L 58 58 Z"
                            fill="currentColor"
                          />
                        </svg>

                        {/* Circular Action Button nested in the notch */}
                        <div className="relative w-12 h-12 flex items-end justify-end p-1">
                          <div className="w-9 h-9 rounded-full bg-[#0F172A] text-white flex items-center justify-center shadow-lg group-hover:bg-ink transition-all transform group-hover:scale-110">
                            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Layer 2 (Foreground): Hero Section */}
        {/* On scroll: Shrinks to width of middle 2 cards, translates down, and sits half-shown at bottom */}
        <div
          onClick={handleHeroTrayClick}
          className={`absolute z-20 bg-gradient-to-b from-sand via-sand to-sand-deep text-ink flex flex-col justify-between py-4 sm:py-6 select-none border border-sand-deep shadow-[0_25px_70px_rgba(0,0,0,0.35)] origin-bottom ${
            scrollProgress > 0.3 ? 'cursor-pointer' : ''
          }`}
          style={{
            // When scrolled down, shrinks to center two cards width and translates down to sit half-shown at bottom
            width: '100%',
            height: '100%',
            top: 0,
            left: 0,
            borderRadius: `${heroBorderRadius}px`,
            transform: `translate3d(0, ${heroTranslateY}vh, 0) scale(${heroScale})`,
            willChange: 'transform, border-radius',
          }}
        >
          {/* Background ambient radial highlight */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white/70 via-transparent to-transparent pointer-events-none" />

          {/* Top Bar directly inside Hero Section: Logo centered, Profile picture circle on right */}
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between z-30 shrink-0">
            {/* Left symmetrical spacer / city badge */}
            <div className="w-10 sm:w-11 shrink-0 flex items-center">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-ink/75 bg-white/40 backdrop-blur-xs px-2.5 py-1 rounded-full border border-ink/15">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Coimbatore
              </span>
            </div>

            {/* Center Brand Logo with KNOWGRAMS */}
            <div className="flex flex-col items-center justify-center">
              <Link
                href="/"
                className="flex items-center justify-center group"
                onClick={(e) => e.stopPropagation()}
              >
                <Image
                  src="/logo.png"
                  alt="BroTin Box"
                  width={200}
                  height={72}
                  className="h-14 md:h-16 w-auto object-contain transition-transform group-hover:scale-105"
                  priority
                />
              </Link>
             
            </div>

            {/* Right: account (avatar when signed in, sign-in button otherwise) */}
            <div className="shrink-0 flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
              <AccountButton variant="mobile" />
            </div>
          </div>

          {/* Main Stage: Center 4:3 Image (Halved size) with Slow Looping Marquee Moving Behind */}
          <div className="relative my-auto flex items-center justify-center py-2 sm:py-4">
            {/* Infinite Looping Text Marquee */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden pointer-events-none z-0">
              <div className="animate-marquee-slow-loop flex items-center">
                {marqueeItems.map((idx) => (
                  <div key={`group1-${idx}`} className="flex items-center shrink-0">
                    <span className="font-heading font-black text-ink uppercase tracking-tight text-5xl sm:text-7xl md:text-8xl lg:text-[135px] xl:text-[150px] leading-none whitespace-nowrap">
                      YOUR DAILY PROTEIN. SORTED.
                    </span>
                    <span className="mx-6 sm:mx-10 lg:mx-16 inline-flex items-center justify-center shrink-0">
                      <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded-full bg-ink shadow-xs inline-block" />
                    </span>
                  </div>
                ))}

                {marqueeItems.map((idx) => (
                  <div key={`group2-${idx}`} className="flex items-center shrink-0">
                    <span className="font-heading font-black text-ink uppercase tracking-tight text-5xl sm:text-7xl md:text-8xl lg:text-[135px] xl:text-[150px] leading-none whitespace-nowrap">
                      YOUR DAILY PROTEIN. SORTED.
                    </span>
                    <span className="mx-6 sm:mx-10 lg:mx-16 inline-flex items-center justify-center shrink-0">
                      <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded-full bg-ink shadow-xs inline-block" />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Center 4:3 Image (Halved size, borderless) */}
            <div className="relative z-10 w-[50vw] max-w-[190px] sm:max-w-[240px] md:max-w-[280px] lg:max-w-[320px] aspect-[4/3] shrink-0 rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_20px_50px_-10px_rgba(20,83,45,0.25)] group transition-transform duration-75 ease-out">
              <Image
                src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=85"
                alt="Freshly weighed high protein balanced bowl"
                fill
                priority
                sizes="(max-width: 768px) 50vw, 320px"
                className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Bottom Content Area - fades out as hero shrinks to bottom */}
          <div
            className="w-full max-w-7xl mx-auto px-4 sm:px-8 z-10 pt-2 sm:pt-4 shrink-0 transition-opacity duration-150"
            style={{ opacity: Math.max(0, 1 - scrollProgress * 3.5) }}
          >
            <div className="text-center space-y-3 max-w-xl mx-auto">
              <p className="text-xs sm:text-sm text-ink/85 font-medium leading-relaxed">
                Fresh homestyle meals cooked every morning in Coimbatore
                <br className="hidden sm:inline" /> digitally weighed for exact calories and protein.
              </p>

              <div>
                <Link
                  href="/plans"
                  className="inline-block border-2 border-ink hover:bg-ink text-ink hover:text-white px-6 sm:px-8 py-2 rounded-none text-xs sm:text-sm font-bold tracking-[0.25em] uppercase transition-all shadow-sm bg-white/40 backdrop-blur-xs"
                >
                  STARTING FROM ₹269 / DAY
                </Link>
              </div>
            </div>

            {/* Bottom Corner Anchors */}
            <div className="flex items-center justify-between pt-4 sm:pt-6 text-xs text-ink/60 tracking-wider">
              <span className="font-mono text-[11px] sm:text-xs tracking-widest text-ink/70 flex items-center gap-1">
                <span>(Scroll)</span>
                <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
              </span>

              <div className="flex items-center gap-2">
                <Link
                  href="/menu"
                  className="inline-flex items-center gap-2 border border-ink/30 hover:border-ink bg-white/70 hover:bg-white text-ink px-3.5 py-1.5 rounded-sm text-xs font-semibold tracking-wide transition-all shadow-xs"
                >
                  <span>Our Menu</span>
                  <span className="text-ink font-mono text-[10px]">⸬</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Card Modal Detail Drawer */}
      <AnimatePresence>
        {selectedCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col"
            >
              {/* Modal Top Header with Card's Brand Color */}
              <div className={`p-6 ${selectedCard.bgColor} text-white relative`}>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-white/20">
                    {selectedCard.number} • {selectedCard.tag}
                  </span>
                </div>

                <h3 className="font-heading font-black text-2xl sm:text-3xl text-white">
                  {selectedCard.title}
                </h3>
                <p className="text-xs sm:text-sm text-white/80 mt-1">
                  {selectedCard.priceNote}
                </p>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {selectedCard.description}
                </p>

                {selectedCard.recommendedBoxes && selectedCard.recommendedBoxes.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Sample Weighed Meals in This Plan
                    </h4>

                    {selectedCard.recommendedBoxes.map((box, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100"
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden relative shrink-0">
                          <Image
                            src={box.image}
                            alt={box.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-sm text-gray-900 truncate">
                              {box.name}
                            </h5>
                            <span className="text-xs font-bold text-primary font-heading">
                              {formatCurrency(box.price)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                            {box.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] font-semibold text-gray-600">
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                              {box.protein} Protein
                            </span>
                            <span>•</span>
                            <span>{box.calories}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer CTA */}
              <div className="p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
                <button
                  onClick={() => setSelectedCard(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                <Link
                  href="/build-plan"
                  onClick={() => setSelectedCard(null)}
                  className="flex items-center gap-2 bg-cta hover:bg-cta-hover text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl shadow-md transition-all tap-active"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Choose This Plan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
