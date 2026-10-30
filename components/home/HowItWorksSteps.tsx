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
      description: 'Pick your goal, meals per day and any allergies.',
      highlight: 'Takes 60 seconds',
    },
    {
      step: '02',
      animationSrc: '/animation/Cooking imagery.json',
      title: 'We cook & weigh every gram',
      description: 'Cooked fresh daily in our Coimbatore kitchen, every portion weighed.',
      highlight: 'Zero food wastage',
    },
    {
      step: '03',
      animationSrc: '/animation/Delivery Riding.json',
      title: 'Delivered fresh to your door',
      description: 'Hot, on time, to your home or office.',
      highlight: 'Free daily delivery',
    },
  ];

  return (
    <section className="py-12 sm:py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
            Simple 3-Step Routine
          </span>
          <h2 className="font-heading font-black text-lg sm:text-4xl text-gray-900 mt-1">
            How {BRAND.name} Works
          </h2>
          <p className="text-gray-600 text-sm mt-2">
            No grocery runs. No cooking. No guesswork on nutrition.
          </p>
        </div>

        <div className="flex md:grid md:grid-cols-3 gap-4 md:gap-8 overflow-x-auto md:overflow-visible snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 pb-2 [scrollbar-width:none]">
          {steps.map((item) => {
            return (
              <div
                key={item.step}
                className="shrink-0 w-[62%] sm:w-[60%] md:w-auto snap-start bg-white rounded-3xl p-4 sm:p-7 border border-gray-200/90 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between relative group"
              >
                {/* Step Number on Left & Animation on Right */}
                <div className="flex items-start justify-between mb-4">
                  <span className="font-heading font-black text-2xl sm:text-4xl text-gray-200 group-hover:text-primary-light transition-colors select-none">
                    {item.step}
                  </span>
                  <div className="w-14 h-14 sm:w-32 sm:h-32 -mr-2 -mt-2 flex items-center justify-center">
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
                  <h3 className="font-heading font-extrabold text-sm sm:text-xl text-gray-900 mb-1 sm:mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
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
