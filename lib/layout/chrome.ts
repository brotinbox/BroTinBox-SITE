'use client';

import { usePathname } from 'next/navigation';

/**
 * Which pieces of site chrome a page gets. One list for the whole site, so the
 * navbar, offer strip, footer, mobile dock, WhatsApp bubble, cart bar and
 * pincode popup always agree (they used to keep their own route lists).
 *
 *  full   marketing pages: everything.
 *  app    signed-in screens (dashboard, orders, profile…): navbar + dock, no
 *         marketing footer or offer strip, no pincode popup.
 *  legal  policy pages: like full, but no pincode popup over the text.
 *  flow   order wizards (trial, weekly, monthly, box page): like focus, but a
 *         first-time visitor is still asked for their pincode, so nobody plans
 *         a month only to learn at checkout that we don't deliver there.
 *  focus  one-job screens (forms, checkout, sign-in, settings sub-pages): only
 *         the page itself with its own back button on top. Nothing else
 *         renders, which also skips the footer/dock JS and their timers.
 */
export type ChromeMode = 'full' | 'app' | 'legal' | 'flow' | 'focus';

export type Chrome = {
  mode: ChromeMode;
  navbar: boolean;
  offerBar: boolean;
  footer: boolean;
  bottomNav: boolean;
  whatsapp: boolean;
  cartBar: boolean;
  pincodePrompt: boolean;
};

const under = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);
/** A page below the prefix, not the prefix itself (/profile/details but not /profile). */
const below = (path: string, prefix: string) => path.startsWith(`${prefix}/`);

const FLOW_UNDER = ['/tomorrow', '/weekly', '/monthly', '/box'];
const FOCUS_UNDER = ['/checkout', '/build-plan', '/login', '/onboarding', '/partners/apply'];
const FOCUS_BELOW = ['/profile', '/orders'];
const APP_UNDER = ['/dashboard', '/my-plan', '/subscription', '/orders', '/progress', '/profile', '/partner', '/refer'];
const LEGAL_UNDER = ['/privacy', '/terms', '/refund-policy', '/delivery-policy', '/grievance', '/food-safety', '/partner-terms'];

export function chromeModeFor(path: string): ChromeMode {
  if (FLOW_UNDER.some((p) => under(path, p))) return 'flow';
  if (FOCUS_UNDER.some((p) => under(path, p)) || FOCUS_BELOW.some((p) => below(path, p))) return 'focus';
  if (APP_UNDER.some((p) => under(path, p))) return 'app';
  if (LEGAL_UNDER.some((p) => under(path, p))) return 'legal';
  return 'full';
}

const CHROME: Record<ChromeMode, Omit<Chrome, 'mode'>> = {
  full: { navbar: true, offerBar: true, footer: true, bottomNav: true, whatsapp: true, cartBar: true, pincodePrompt: true },
  app: { navbar: true, offerBar: false, footer: false, bottomNav: true, whatsapp: true, cartBar: true, pincodePrompt: false },
  legal: { navbar: true, offerBar: true, footer: true, bottomNav: true, whatsapp: true, cartBar: true, pincodePrompt: false },
  flow: { navbar: false, offerBar: false, footer: false, bottomNav: false, whatsapp: false, cartBar: false, pincodePrompt: true },
  focus: { navbar: false, offerBar: false, footer: false, bottomNav: false, whatsapp: false, cartBar: false, pincodePrompt: false },
};

export function chromeFor(path: string): Chrome {
  const mode = chromeModeFor(path);
  return { mode, ...CHROME[mode] };
}

export function useChrome(): Chrome {
  return chromeFor(usePathname() ?? '/');
}
