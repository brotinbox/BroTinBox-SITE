import React from 'react';
import { getDrinks, getPlanTiers, getSides } from '@/lib/data/catalog';
import { HomeHero } from '@/components/home/HomeHero';
import { WeeklyCalendarStrip } from '@/components/home/WeeklyCalendarStrip';
import { AddASideSection } from '@/components/home/AddASideSection';
import { DrinksStrip } from '@/components/home/DrinksStrip';
import { HowItWorksSteps } from '@/components/home/HowItWorksSteps';
import { WhyUsSection } from '@/components/home/WhyUsSection';
import { PlansTeaser } from '@/components/home/PlansTeaser';
import { FaqAccordion } from '@/components/home/FaqAccordion';
import { FinalCtaBand } from '@/components/home/FinalCtaBand';

export default async function HomePage() {
  const [sides, addons, plans] = await Promise.all([getSides(), getDrinks(), getPlanTiers()]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Main Home Hero Section */}
      <HomeHero />

      {/* 2. Six Dedicated Protein Boxes (Mon-Sat rotating signature boxes) */}
      <WeeklyCalendarStrip />

      {/* 3. "Add a side" section (6 high-protein sides) */}
      <AddASideSection sides={sides} />

      {/* 5. Drinks strip (4 cold-pressed juices with natural sugar disclosures) */}
      <DrinksStrip addons={addons} />

      {/* 6. How it works in 3 steps */}
      <HowItWorksSteps />

      {/* 7. Why us & founder doctor note */}
      <WhyUsSection />

      {/* 8. Plans teaser with weekly/monthly toggle */}
      <PlansTeaser plans={plans} />

      {/* 11. FAQ accordion */}
      <FaqAccordion />

      {/* 12. Final CTA band */}
      <FinalCtaBand />
    </div>
  );
}
