import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BRAND } from '@/config/brand';
import { LEGAL, hasFssai } from '@/config/legal';
import { LEGAL_PAGES } from '@/components/legal/LegalPage';
import { MapPin, Phone, Mail, ShieldCheck, Heart, Instagram, MessageCircle, Twitter } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[#052e16] text-white pt-16 pb-28 md:pb-12 border-t border-primary/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/10">
          {/* Brand Intro */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-block group">
              <div className="bg-white rounded-2xl p-2 px-3 shadow-md inline-flex items-center transition-transform group-hover:scale-105">
                <Image
                  src="/logo.png"
                  alt={BRAND.name}
                  width={150}
                  height={50}
                  className="h-11 w-auto object-contain"
                />
              </div>
            </Link>
            <p className="text-sm text-gray-300 max-w-sm leading-relaxed">
              {BRAND.tagline} {BRAND.shortDescription}
            </p>

            <div className="space-y-2 text-xs text-gray-300">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-lime-brand shrink-0 mt-0.5" />
                <span>{BRAND.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-lime-brand shrink-0" />
                <span>{BRAND.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-lime-brand shrink-0" />
                <span>{BRAND.supportEmail}</span>
              </div>
            </div>

            {/* FSSAI badge: shown only once a real licence number is set in config/legal.ts */}
            {hasFssai() && (
              <div className="inline-flex items-center gap-2.5 bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl text-xs">
                <ShieldCheck className="w-5 h-5 text-lime-brand" />
                <div>
                  <p className="font-semibold text-white">FSSAI {LEGAL.fssai.licenseType || 'Licence'}</p>
                  <p className="text-[11px] text-gray-400">Lic. No. {LEGAL.fssai.licenseNumber}</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-lime-brand mb-4">
              Explore
            </h3>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li>
                <Link href="/menu" className="hover:text-white transition-colors">
                  Daily Menu & Macros
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  Pricing & Subscriptions
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <span>Nutrition & Health Blog</span>
                  <span className="text-[10px] font-bold bg-[#899545] text-white px-1.5 py-0.2 rounded-sm">NEW</span>
                </Link>
              </li>
              <li>
                <Link href="/delivery-areas" className="hover:text-white transition-colors">
                  Coimbatore Pincodes
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer & App */}
          <div>
            <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-lime-brand mb-4">
              Subscribers
            </h3>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  My Dashboard
                </Link>
              </li>
              <li>
                <Link href="/my-plan" className="hover:text-white transition-colors">
                  Weekly Planner & Swaps
                </Link>
              </li>
              <li>
                <Link href="/subscription" className="hover:text-white transition-colors">
                  Manage Subscription
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-white transition-colors">
                  Order Tracking
                </Link>
              </li>
              <li>
                <Link href="/progress" className="hover:text-white transition-colors">
                  Weight & Macro Progress
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust & Policies */}
          <div>
            <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-lime-brand mb-4">
              Company
            </h3>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About Our Founder & Kitchen
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">
                  Clinical & Nutrition Blog
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Support
                </Link>
              </li>
              {LEGAL_PAGES.map((p) => (
                <li key={p.href}>
                  <Link href={p.href} className="hover:text-white transition-colors">
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <p>© {new Date().getFullYear()} {LEGAL.entityName || BRAND.name}. All rights reserved.</p>
          <p className="flex items-center gap-1 text-gray-400">
            Cooked with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" /> in Coimbatore, Tamil Nadu
          </p>
          <div className="flex items-center gap-4">
            <a
              href={BRAND.socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-lime-brand transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              href={BRAND.socials.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-lime-brand transition-colors"
              aria-label="WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
            <a
              href={BRAND.socials.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-lime-brand transition-colors"
              aria-label="Twitter"
            >
              <Twitter className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
