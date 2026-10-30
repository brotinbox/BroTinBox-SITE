import React from 'react';
import Link from 'next/link';
import { BRAND } from '@/config/brand';
import { ArrowRight, MessageCircle } from 'lucide-react';

export function FinalCtaBand() {
  const whatsAppUrl = `https://wa.me/${BRAND.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
    BRAND.whatsappMessage
  )}`;

  return (
    <section className="py-12 sm:py-16 bg-gradient-to-b from-ink via-ink-soft to-ink-deep text-white relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-accent/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 relative z-10 text-center">
        <h2 className="font-heading font-black text-2xl sm:text-3xl md:text-4xl tracking-tight leading-tight">
          Ready to stop guessing & start measuring?
        </h2>
        <p className="text-gray-300 text-sm mt-2">
          Pick your meals online, or message us and we&apos;ll set it up for you.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-cta hover:bg-cta-hover text-white font-bold text-sm shadow-lg transition-all tap-active"
          >
            <span>Choose your meals</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href={whatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-sm transition-all tap-active"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Order on WhatsApp</span>
          </a>
        </div>

        <p className="text-xs text-gray-400 mt-5">
          Questions?{' '}
          <Link href="/faq" className="text-accent-soft font-bold hover:underline underline-offset-4">
            Read the FAQs
          </Link>{' '}
          or{' '}
          <Link href="/about" className="text-accent-soft font-bold hover:underline underline-offset-4">
            meet the team
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
