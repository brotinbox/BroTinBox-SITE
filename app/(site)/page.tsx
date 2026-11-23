import React from 'react';
import { getDrinks, getSides } from '@/lib/data/catalog';
import { HomeHero } from '@/components/home/HomeHero';
import { IntroSplash } from '@/components/brand/IntroSplash';
import { WeeklyCalendarStrip } from '@/components/home/WeeklyCalendarStrip';
import { LiteBoxStrip } from '@/components/home/LiteBoxStrip';
import { AddASideSection } from '@/components/home/AddASideSection';
import { DrinksStrip } from '@/components/home/DrinksStrip';
import { HowItWorksSteps } from '@/components/home/HowItWorksSteps';
import { PlansTeaser } from '@/components/home/PlansTeaser';
import { CustomerReviews } from '@/components/home/CustomerReviews';
import { getReviews } from '@/lib/api/reviews';
import { pageMetadata } from '@/lib/seo/page-metadata';

export const metadata = pageMetadata({
  title: 'BroTin Box | High-Protein Meal Delivery in Coimbatore',
  description:
    'Weighed, high-protein lunch and dinner boxes delivered fresh across Coimbatore, Monday to Saturday. Calories and protein shown for every dish. Try a single box first.',
  path: '/',
  absoluteTitle: true,
});

export default async function HomePage() {
  const [sides, addons, reviews] = await Promise.all([getSides(), getDrinks(), getReviews().catch(() => [])]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* First-visit logo reveal, fades into the page */}
      <IntroSplash />

      {/* 1. Main Home Hero Section */}
      <HomeHero />

      {/* 2. Six Dedicated Protein Boxes (Mon-Sat rotating signature boxes) */}
      <WeeklyCalendarStrip />
      <LiteBoxStrip />

      {/* 3. "Add a side" section (6 high-protein sides) */}
      <AddASideSection sides={sides} />

      {/* 5. Drinks strip (4 cold-pressed juices with natural sugar disclosures) */}
      <DrinksStrip addons={addons} />

      {/* 6. How it works in 3 steps */}
      <HowItWorksSteps />

      {/* 7. Real customer reviews (hidden until one is approved) */}
      <CustomerReviews reviews={reviews} />

      {/* 8. Plans teaser with weekly/monthly toggle */}
      <PlansTeaser />

    </div>
  );
}
