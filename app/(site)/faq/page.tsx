'use client';

import React, { useState } from 'react';
import { useFaqs } from '@/components/providers/CatalogProvider';
import { HelpCircle, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function FaqPage() {
  const faqsData = useFaqs();
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const filteredFaqs = faqsData.filter(
    (f) =>
      f.question.toLowerCase().includes(search.toLowerCase()) ||
      f.answer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <section className="bg-white border-b border-gray-200 py-12 md:py-16 text-center px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary-light px-3 py-1 rounded-full">
            Help Center
          </span>
          <h1 className="font-heading font-black text-3xl sm:text-5xl text-gray-900 mt-3">
            Frequently Asked Questions
          </h1>
          <p className="text-gray-600 text-sm mt-2 max-w-lg mx-auto">
            Everything you need to know about our measured meals, dietary safety, and Coimbatore deliveries.
          </p>

          <div className="mt-6 max-w-md mx-auto relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions (e.g. pause, reheat, delivery)..."
              className="w-full pl-9 pr-4 py-2.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-900 bg-gray-50 focus:bg-white focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-10">
        <div className="space-y-3">
          {filteredFaqs.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id}
                className={cn(
                  "border rounded-2xl transition-all duration-200 overflow-hidden",
                  isOpen ? "border-primary bg-primary-light/10 shadow-xs" : "border-gray-200 bg-white"
                )}
              >
                <button
                  onClick={() => setOpenId(isOpen ? null : faq.id)}
                  className="w-full py-4 px-5 text-left flex items-center justify-between gap-4 font-heading font-bold text-sm sm:text-base text-gray-900 tap-active"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={cn(
                      "w-5 h-5 text-primary shrink-0 transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-gray-600 leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center p-6 bg-white rounded-3xl border border-gray-200 shadow-xs">
          <h4 className="font-heading font-bold text-base text-gray-900">Still have questions?</h4>
          <p className="text-xs text-gray-500 mt-1">Our clinical nutrition team is available on WhatsApp daily.</p>
          <a
            href="https://wa.me/917604909848"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition-all"
          >
            <img
              src="https://img.icons8.com/color/480/whatsapp--v1.png"
              alt="WhatsApp"
              className="w-4 h-4 object-contain"
            />
          
          </a>
        </div>
      </section>
    </div>
  );
}
