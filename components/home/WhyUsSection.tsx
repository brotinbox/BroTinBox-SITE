'use client';

import React from 'react';
import { Scale, UtensilsCrossed, Sparkles, Clock, Quote } from 'lucide-react';
import { BRAND } from '@/config/brand';

export function WhyUsSection() {
  const points = [
    {
      icon: Scale,
      title: 'Digitally Weighed Portions',
      description: 'We never guess macros. Every ingredient is measured on digital commercial scales before cooking, so your protein and calories are accurate to the gram.',
    },
    {
      icon: UtensilsCrossed,
      title: 'Home-Style Kongu Flavours',
      description: 'Zero bland boiled meals. Cooked fresh with shallots, black pepper, moringa, and cold-pressed sesame oil—familiar comfort food that tastes like home.',
    },
    {
      icon: Sparkles,
      title: 'Designed for Steady Energy',
      description: 'Formulated by clinical health professionals for light digestion and sustained fullness—no afternoon sluggishness, food comas, or heavy bloating.',
    },
    {
      icon: Clock,
      title: 'Fresh & Punctual Delivery',
      description: 'Cooked fresh twice daily and delivered hot to your doorstep or office desk across Coimbatore, right on time for your lunch or dinner window.',
    },
  ];

  return (
    <section className="py-16 sm:py-20 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          {/* Left: Founder Note */}
          <div className="lg:col-span-5 bg-gradient-to-br from-ink-soft via-ink to-ink-deep text-white p-7 sm:p-10 rounded-3xl shadow-xl relative overflow-hidden flex flex-col justify-between">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
              <Quote className="w-28 h-28 text-white rotate-180" />
            </div>

            <div>
              <h3 className="font-heading font-black text-2xl sm:text-3xl text-white leading-snug tracking-tight">
                "Diet food fails when you can't stick to it for 6 months."
              </h3>

              <div className="space-y-3.5 mt-5 text-sm text-gray-200/90 leading-relaxed font-normal">
                <p>
                  Most health diets fail because they are impossible to maintain. You shouldn't have to punish yourself with bland, boiled food or wonder how many calories were actually in your meal.
                </p>
                <p>
                  We started {BRAND.name} to give Coimbatore clean, honest food: the comfort of rasam, millets, country chicken, and fresh paneer—with every single gram of protein and calorie clearly measured on your box.
                </p>
              </div>
            </div>

          </div>

          {/* Right: 4 Clean Value Pillars */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-accent">
                Why Choose Us
              </span>
              <h2 className="font-heading font-black text-2xl sm:text-4xl text-gray-900 mt-1 tracking-tight">
                Nutrition you can track. Food you enjoy.
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-2">
                Simple, honest, and scientifically balanced meals crafted for everyday life in Coimbatore.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pt-2">
              {points.map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.title}
                    className="p-5 sm:p-6 rounded-2xl bg-paper border border-gray-200/80 hover:border-ink/30 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-ink text-accent-muted flex items-center justify-center mb-3 shadow-2xs">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h4 className="font-heading font-bold text-base text-gray-900 tracking-tight">
                        {p.title}
                      </h4>
                      <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                        {p.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
