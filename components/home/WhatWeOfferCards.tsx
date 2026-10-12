'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Utensils, Scale, Calendar, PlusCircle } from 'lucide-react';

interface OfferCard {
  id: string;
  number: string;
  tag: string;
  verticalTitle: string;
  simpleTitle: string;
  description: string;
  highlight: string;
  bgColor: string;
  accentColor: string;
  textColor: string;
  image: string;
  link: string;
  linkText: string;
  icon: React.ElementType;
}

const OFFERS: OfferCard[] = [
  {
    id: 'daily-boxes',
    number: '01',
    tag: 'DAILY COOK',
    verticalTitle: 'DAILY LUNCH BOX',
    simpleTitle: 'Fresh Cooked Lunch',
    description:
      'Cooked fresh every morning from scratch. Country chicken, farm paneer, or tawa fish with soft chapatis or millets. Delivered hot before 1 PM.',
    highlight: 'Cooked Daily • Never Frozen',
    bgColor: 'bg-[#182338]', // Deep Navy like Reference
    accentColor: 'text-sky-300',
    textColor: 'text-white',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    link: '#weekly-menu',
    linkText: 'View 6 Daily Boxes',
    icon: Utensils,
  },
  {
    id: 'weighed-macros',
    number: '02',
    tag: 'ZERO GUESSWORK',
    verticalTitle: 'WEIGHED MACROS',
    simpleTitle: 'Exact Food Weight',
    description:
      'No guessing your diet. Every portion is weighed on a digital kitchen scale before packing. Exact grams of protein, carbs, fat & calories printed on the lid.',
    highlight: 'Real Grams • Kitchen Scales',
    bgColor: 'bg-[#3A1A0D]', // Deep Forest Green like Reference
    accentColor: 'text-emerald-300',
    textColor: 'text-white',
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80',
    link: '#live-scale-demo',
    linkText: 'See Scale Breakdown',
    icon: Scale,
  },
  {
    id: 'weekly-plans',
    number: '03',
    tag: 'ROUTINE',
    verticalTitle: 'WEEKLY PLANS',
    simpleTitle: 'Doorstep Delivery',
    description:
      'Subscribe for 6 days (Mon to Sat) or full month. Lunch reaches your office desk or home across Coimbatore. Pause or swap days anytime with one tap.',
    highlight: 'Mon–Sat • Free Delivery',
    bgColor: 'bg-[#2E1A33]', // Deep Plum/Wine like Reference
    accentColor: 'text-fuchsia-300',
    textColor: 'text-white',
    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
    link: '/build-plan',
    linkText: 'Build Your Plan',
    icon: Calendar,
  },
  {
    id: 'protein-extras',
    number: '04',
    tag: 'HIGH PROTEIN',
    verticalTitle: 'PROTEIN EXTRAS',
    simpleTitle: 'Extra Protein Add-ons',
    description:
      'Going heavy in the gym and need 70g–100g+ protein? Add boiled farm eggs, extra grilled chicken breast, fresh curd, or spiced buttermilk to any meal.',
    highlight: 'From ₹35 • Eggs, Chicken, Curd',
    bgColor: 'bg-[#18181B]', // Charcoal Black like Reference
    accentColor: 'text-amber-300',
    textColor: 'text-white',
    image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=800&q=80',
    link: '#add-a-side',
    linkText: 'See Protein Extras',
    icon: PlusCircle,
  },
];

export function WhatWeOfferCards() {
  return (
    <section className="py-16 sm:py-20 md:py-24 bg-paper text-gray-900 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Simple Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary font-black text-xs px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider">
            <span>What We Offer</span>
          </div>
          <h2 className="font-heading font-black text-3xl sm:text-4xl lg:text-5xl text-gray-950 tracking-tight">
            Everything we do in 4 simple things.
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mt-3 leading-relaxed">
            No complicated fitness terms, no fake diet promises. Just honest, weighed homestyle South Indian food cooked fresh every day.
          </p>
        </div>

        {/* 4 Tall Columns Showcase matching the reference style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {OFFERS.map((offer) => {
            const Icon = offer.icon;
            return (
              <Link
                key={offer.id}
                href={offer.link}
                className={`group relative rounded-[28px] overflow-hidden ${offer.bgColor} text-white flex flex-col justify-between p-6 sm:p-7 min-h-[520px] lg:h-[580px] shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5`}
              >
                {/* Top Row: Icon + Number Tag */}
                <div className="flex items-center justify-between z-10">
                  <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-black tracking-widest text-white/50 uppercase">
                    {offer.number}
                  </span>
                </div>

                {/* Giant Vertical Typography running along the edge */}
                <div className="my-auto py-6 flex items-center justify-end overflow-hidden pointer-events-none">
                  <span
                    className="font-heading font-black text-2xl sm:text-3xl lg:text-[34px] tracking-tight text-white/80 group-hover:text-white uppercase select-none transition-colors"
                    style={{
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                    }}
                  >
                    {offer.verticalTitle}
                  </span>
                </div>

                {/* Bottom Content Area: Description + Photo */}
                <div className="z-10 mt-auto space-y-3">
                  {/* Tag Pill */}
                  <div className="inline-block">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/10 border border-white/15 ${offer.accentColor}`}>
                      {offer.highlight}
                    </span>
                  </div>

                  {/* Simple human explanation */}
                  <p className="text-xs sm:text-sm text-white/85 leading-relaxed font-medium line-clamp-3">
                    {offer.description}
                  </p>

                  {/* Bottom Image Slice with smooth zoom on hover */}
                  <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden mt-3 shadow-md border border-white/10">
                    <Image
                      src={offer.image}
                      alt={offer.simpleTitle}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                    {/* Bottom Link indicator */}
                    <div className="absolute bottom-2.5 right-2.5 w-7 h-7 rounded-full bg-white text-gray-900 flex items-center justify-center shadow group-hover:bg-primary group-hover:text-white transition-colors">
                      <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
