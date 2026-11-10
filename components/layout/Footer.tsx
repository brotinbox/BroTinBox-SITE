'use client';

import { usePathname } from 'next/navigation';
import PushpinTearFooter, { type FooterColumn, type IconLink, type TearField } from '@/components/ui/pushpin-tear-footer';
import { BRAND } from '@/config/brand';
import { LEGAL, fssaiAbbr, hasFssai } from '@/config/legal';
import { useAppStore } from '@/store/useAppStore';
import { isPincode, locationFromPincode, notifyMeLink, useDeliveryZones } from '@/lib/location';

/**
 * Site footer: a black poster pinned with an orange pushpin and torn to show the
 * sand paper underneath. Layout and motion live in components/ui/pushpin-tear-footer.tsx;
 * this file only decides what goes where.
 *
 *  sheet  ─ back to top · Instagram · WhatsApp | copy support email
 *           "Do we deliver to you?" pincode check
 *           Cooked in Coimbatore (desktop) | live IST clock (desktop)
 *           Explore column → order.     |  Company column → talk. (WhatsApp)
 *  paper  ─ tagline + WhatsApp bubble, BroTin Box wordmark, privacy / terms,
 *           © line · FSSAI number · @brotinbox
 */

// Brand tokens (tailwind.config.ts): the component takes raw colours.
const INK = '#121212';
const SAND = '#F3F1EE';
const ACCENT = '#EA580C';
const WHITE = '#FFFFFF';

const SOCIALS: IconLink[] = [
  { icon: 'ig', label: 'Instagram', href: BRAND.socials.instagram },
  { icon: 'whatsapp', label: 'WhatsApp', href: BRAND.socials.whatsapp },
];

const COLUMNS: FooterColumn[] = [
  {
    title: 'explore',
    links: [
      { label: 'Daily Menu & Macros', href: '/menu' },
      { label: 'Pricing & Plans', href: '/pricing' },
      { label: 'Delivery Areas', href: '/delivery-areas' },
      { label: 'My Dashboard', href: '/dashboard' },
    ],
    cta: { label: 'order.', href: '/menu' },
  },
  {
    title: 'company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Contact', href: '/contact' },
      { label: 'Nutrition Blog', href: '/blog' },
    ],
    cta: { label: 'talk.', href: BRAND.socials.whatsapp },
  },
];

const SIDE_LINKS: IconLink[] = [
  { icon: 'shield', label: 'privacy', href: '/privacy' },
  { icon: 'doc', label: 'terms', href: '/terms' },
];

// Signed-in dashboard pages: app-like screens, no marketing footer.
const ACCOUNT_PREFIXES = ['/dashboard', '/my-plan', '/subscription', '/orders', '/progress', '/profile', '/onboarding'];
const isAccountPage = (path: string) => ACCOUNT_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

export function Footer() {
  const pathname = usePathname() ?? '';
  const { zones, comingSoonZones } = useDeliveryZones();
  const setCurrentLocation = useAppStore((s) => s.setCurrentLocation);
  if (isAccountPage(pathname)) return null;

  // The design's newsletter pill becomes our pincode check; the answer replaces its label.
  const pincodeField: TearField = {
    label: 'Do we deliver to you? Check your pincode',
    placeholder: 'Your 6-digit pincode',
    inputMode: 'numeric',
    maxLength: 6,
    submitLabel: 'Check pincode',
    clean: (v) => v.replace(/\D/g, '').slice(0, 6),
    onSubmit: (pin) => {
      if (!isPincode(pin)) return 'That doesn’t look like a 6-digit pincode';
      const loc = locationFromPincode(pin, zones, comingSoonZones);
      setCurrentLocation(loc); // same as the pincode popup: remembered across the site
      if (loc.isDeliverable) return `Yes! We deliver to ${loc.area || pin}, lunch and dinner.`;
      if (loc.tier === 'phase2') {
        return (
          <>
            {loc.area} is in our next batch.{' '}
            <a href={notifyMeLink(BRAND.whatsappNumber, BRAND.name, { area: loc.area, pincode: pin })} target="_blank" rel="noopener noreferrer">
              Notify me
            </a>
          </>
        );
      }
      return (
        <>
          Not in {pin} yet.{' '}
          <a href={notifyMeLink(BRAND.whatsappNumber, BRAND.name, { area: pin, pincode: pin })} target="_blank" rel="noopener noreferrer">
            Request your area
          </a>
        </>
      );
    },
  };

  const year = new Date().getFullYear();

  return (
    // The mobile dock (BottomNav) floats over the last ~6rem: pad below in the paper colour.
    <div className="bg-sand bg-grain pb-24 md:pb-0">
      <PushpinTearFooter
        brand="BroTin Box"
        name="Every gram counted."
        logo={false}
        socials={SOCIALS}
        email={BRAND.supportEmail}
        field={pincodeField}
        status={null}
        mark="Cooked in Coimbatore · Mon–Sat"
        timeZone="Asia/Kolkata"
        timeLabel="IST"
        columns={COLUMNS}
        chat={{ label: 'order on WhatsApp', href: BRAND.socials.whatsapp }}
        sideLinks={SIDE_LINKS}
        copyright={`© ${year} ${LEGAL.entityName || BRAND.name}`}
        credit={
          <>
            {/* Chicken comes from a halal supplier (matches the printed posters). */}
            <span className="tpf-halal" title="All our chicken is halal">
              <span lang="ar" dir="rtl">حلال</span>Halal
            </span>
            <span>{hasFssai() ? `FSSAI ${fssaiAbbr()} No. ${LEGAL.fssai.licenseNumber}` : 'Cooked in Coimbatore, Tamil Nadu'}</span>
          </>
        }
        handle={{ label: '@brotinbox', href: BRAND.socials.instagram }}
        sheet={INK}
        pinColor={ACCENT}
        sheetInk={WHITE}
        paper={SAND}
        paperInk={INK}
        seed={11}
        height="100svh"
        fontSans="'Plus Jakarta Sans', 'Inter', system-ui, sans-serif"
      />
    </div>
  );
}
