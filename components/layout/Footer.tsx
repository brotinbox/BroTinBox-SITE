import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BRAND } from '@/config/brand';
import { LEGAL, fssaiAbbr, hasFssai } from '@/config/legal';
import { MapPin, Phone, Mail, ShieldCheck, Heart, Instagram } from 'lucide-react';

/** WhatsApp's own logo: lucide-react has no brand icon for it. */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="bg-ink-deep text-white pt-16 pb-28 md:pb-12 border-t border-primary/40">
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
                  <p className="text-[11px] text-gray-400">{fssaiAbbr()} No. {LEGAL.fssai.licenseNumber}</p>
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
                  <span className="text-[10px] font-bold bg-accent text-white px-1.5 py-0.2 rounded-sm">NEW</span>
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
                  About
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <div className="flex flex-col sm:flex-row items-center gap-x-4 gap-y-2 text-center">
            <p>© {new Date().getFullYear()} {LEGAL.entityName || BRAND.name}. All rights reserved.</p>
            <nav aria-label="Legal" className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            </nav>
          </div>
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
              <WhatsAppIcon className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
