'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFaqs } from '@/components/providers/CatalogProvider';
import { ChevronDown, HelpCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FaqAccordion() {
  const faqsData = useFaqs();
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section className="py-16 bg-white border-y border-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
            Got Questions?
          </span>
          <h2 className="font-heading font-black text-3xl sm:text-4xl text-gray-900 mt-2">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-600 text-sm mt-2">
            Everything you need to know about our food, macro measurements, and delivery.
          </p>
        </div>

        <div className="space-y-3">
          {faqsData.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className={cn(
                  "border rounded-2xl transition-all duration-200 overflow-hidden",
                  isOpen ? "border-primary bg-primary-light/10 shadow-sm" : "border-gray-200 bg-white"
                )}
              >
                <button
                  onClick={() => toggle(item.id)}
                  className="w-full py-4 px-5 text-left flex items-center justify-between gap-4 font-heading font-bold text-base text-gray-900 tap-active"
                  aria-expanded={isOpen}
                >
                  <span className="flex-1">{item.question}</span>
                  <ChevronDown
                    className={cn(
                      "w-5 h-5 text-primary shrink-0 transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed animate-in fade-in duration-200">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Have a unique medical diet or specific question?{' '}
            <Link href="/faq" className="font-bold text-primary hover:underline">
              View all FAQs
            </Link>{' '}
            or{' '}
            <Link href="/contact" className="font-bold text-primary hover:underline">
              chat with our clinical team
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
