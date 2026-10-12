'use client';

import React, { useState, useEffect } from 'react';
import { Lottie } from 'lottie-react';
import { BRAND } from '@/config/brand';

export function HowItWorksSteps() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const steps = [
    {
      step: '01',
      animationSrc: '/animation/Writing in Navy.json',
      title: 'Tell us your goal',
      description: 'Pick Fat Loss, Muscle Gain, or Stay Fit. Set your meals per day (Lunch, Dinner, or both) and list any allergies.',
      highlight: 'Takes 60 seconds',
    },
    {
      step: '02',
      animationSrc: '/animation/Cooking imagery.json',
      title: 'We cook & weigh every gram',
      description: 'Our central kitchen in Coimbatore prepares your food daily using cold-pressed oils, fresh poultry/paneer, and millets. Every portion is digitally weighed.',
      highlight: 'Zero food wastage',
    },
    {
      step: '03',
      animationSrc: '/animation/Delivery Riding.json',
      title: 'Delivered fresh to your door',
      description: 'Piping hot insulated deliveries reach your desk or home in RS Puram, Peelamedu, Race Course and across Coimbatore right on time.',
      highlight: 'Free daily delivery',
    },
  ];

  return (
    <section className="py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
            Simple 3-Step Routine
          </span>
          <h2 className="font-heading font-black text-3xl sm:text-4xl text-gray-900 mt-2">
            How {BRAND.name} Works
          </h2>
          <p className="text-gray-600 text-sm mt-2">
            No grocery runs. No cooking. No guesswork on nutrition.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((item) => {
            return (
              <div
                key={item.step}
                className="bg-white rounded-3xl p-7 border border-gray-200/90 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between relative group"
              >
                {/* Step Number on Left & Animation on Right */}
                <div className="flex items-start justify-between mb-4">
                  <span className="font-heading font-black text-3xl sm:text-4xl text-gray-200 group-hover:text-primary-light transition-colors select-none">
                    {item.step}
                  </span>
                  <div className="w-28 h-28 sm:w-32 sm:h-32 -mr-2 -mt-2 flex items-center justify-center">
                    {mounted ? (
                      <Lottie
                        src={item.animationSrc}
                        loop={true}
                        autoplay={true}
                        className="w-full h-full object-contain pointer-events-none select-none"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-heading font-extrabold text-xl text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-primary bg-primary-light/60 px-2.5 py-1 rounded-md">
                    {item.highlight}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
