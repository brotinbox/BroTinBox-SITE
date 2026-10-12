'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Review } from '@/types';
import { Star, ChevronLeft, ChevronRight, Quote, Info, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestimonialsCounterProps {
  reviews: Review[];
}

export function TestimonialsCounter({ reviews }: TestimonialsCounterProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // CLEARLY MARKED PLACEHOLDERS FOR DEVELOPMENT DEMONSTRATION ONLY
  const impactCounters = [
    { value: "[Telemetry Pending]", label: "Grams of Weighed Protein", subtitle: "Awaiting Live Production Aggregations" },
    { value: "[Telemetry Pending]", label: "Boxes Dispatched in Coimbatore", subtitle: "Cutoff Locked At 9:00 PM" },
    { value: "[Telemetry Pending]", label: "Customer Satisfaction Index", subtitle: "Post-Pilot Feedback Pending" },
    { value: "[Telemetry Pending]", label: "On-Time Dispatch Rate", subtitle: "7:00 AM & 7:00 PM Clusters" },
  ];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === reviews.length - 1 ? 0 : prev + 1));
  };

  const currentReview = reviews[currentIndex] || reviews[0];

  return (
    <section className="py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Milestone Impact Counters Strip - Explicitly Marked as Placeholders */}
        <div className="bg-primary rounded-3xl p-6 sm:p-10 text-white shadow-xl mb-16 relative overflow-hidden">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-xs font-extrabold uppercase tracking-wider text-lime-brand">
              Production Telemetry
            </span>
            <h3 className="font-heading font-black text-2xl sm:text-3xl text-white mt-2">
              Kitchen Operational Metrics
            </h3>
            <p className="text-xs text-lime-brand/80 mt-1 font-mono">
              [Placeholder Notice: Production database aggregation counters will activate upon commercial launch]
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
            {impactCounters.map((item, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="font-heading font-black text-lg sm:text-xl text-lime-brand font-mono">
                  {item.value}
                </p>
                <p className="text-xs font-bold text-white mt-1">
                  {item.label}
                </p>
                <p className="text-[10px] text-gray-300 mt-0.5 opacity-80">
                  {item.subtitle}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Testimonials Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
            Early Pilot Feedback
          </span>
          <h2 className="font-heading font-black text-3xl sm:text-4xl text-gray-900 mt-2">
            Beta Tester Observations
          </h2>
          <p className="text-xs text-gray-500 mt-1 font-mono">
            [Placeholder Note: Early access qualitative feedback from initial RS Puram tasting cohort]
          </p>
        </div>

        {/* Testimonial Card */}
        {currentReview && (
          <div className="max-w-3xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-gray-200/90 shadow-xl relative">
            <Quote className="w-12 h-12 text-primary/10 absolute top-6 right-6 pointer-events-none" />

            <div className="flex items-center gap-1 text-amber-400 mb-4">
              {[...Array(currentReview.rating)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400" />
              ))}
            </div>

            <p className="text-base sm:text-lg text-gray-800 italic leading-relaxed">
              "{currentReview.comment}"
            </p>

            <div className="pt-6 mt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-primary/20">
                  <Image
                    src={currentReview.avatar}
                    alt={currentReview.userName}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-base text-gray-900">
                    {currentReview.userName}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>{currentReview.area}</span>
                    <span>•</span>
                    <span className="font-semibold text-emerald-700">{currentReview.goal}</span>
                  </div>
                </div>
              </div>

              {/* Slider controls */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={handlePrev}
                  className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 tap-active shadow-sm"
                  aria-label="Previous review"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-xs font-semibold text-gray-500 px-1">
                  {currentIndex + 1} / {reviews.length}
                </span>
                <button
                  onClick={handleNext}
                  className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 tap-active shadow-sm"
                  aria-label="Next review"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
