'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { BRAND } from '@/config/brand';
import { UserAvatar } from '@/components/layout/UserAvatar';
import { LiquidNavbar, NimbusIcons, type LiquidNavItem } from '@/components/ui/liquid-glass-navbar';
import { User as UserIcon } from 'lucide-react';

type TabId = 'home' | 'menu' | 'order' | 'pricing' | 'account';

// Order of the dock: Home · Menu · [Order on WhatsApp] · Pricing · Profile
const TAB_ORDER: TabId[] = ['home', 'menu', 'order', 'pricing', 'account'];

function getActiveTabId(pathname: string, isDrawerOpen: boolean): TabId {
  if (isDrawerOpen) return 'account';
  if (pathname === '/menu' || pathname === '/tomorrow' || pathname === '/box') return 'menu';
  if (pathname === '/pricing' || pathname === '/weekly' || pathname === '/monthly' || pathname === '/plans') return 'pricing';
  if (pathname === '/profile' || pathname === '/dashboard' || pathname === '/orders' || pathname === '/progress' || pathname === '/login') return 'account';
  return 'home';
}

const ORDER_MESSAGE = "Hi BroTin Box! I'd like to place an order.";

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.66-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.48.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.93.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.24-9.43 9.44-9.43 2.52 0 4.89.98 6.67 2.77a9.37 9.37 0 0 1 2.76 6.67c0 5.2-4.23 9.43-9.44 9.43m8.03-17.46A11.27 11.27 0 0 0 12.05.7C5.8.7.7 5.78.7 12.04c0 2 .52 3.95 1.52 5.67L.6 23.6l6.04-1.58a11.33 11.33 0 0 0 5.4 1.38h.01c6.25 0 11.34-5.09 11.34-11.34 0-3.03-1.18-5.88-3.32-8.02" />
    </svg>
  );
}

// Brand tokens (tailwind.config.ts) — framer-motion needs raw values to tween between them.
const INK = '#121212';
const ACCENT_BRIGHT = '#FB923C';
const WHATSAPP_GREEN = '#25D366';

const CTA_STEPS = [
  // "ORDER" — brand black capsule, white word
  { bg: INK, glow: '0 8px 18px -8px rgba(18,18,18,0.65)', hold: 1000 },
  // "on" — still black, the word lights up orange
  { bg: INK, glow: '0 8px 18px -8px rgba(234,88,12,0.55)', hold: 800 },
  // WhatsApp logo — the capsule floods green as the payoff
  { bg: WHATSAPP_GREEN, glow: '0 8px 20px -6px rgba(37,211,102,0.75)', hold: 1700 },
] as const;

/**
 * The centre CTA reads as a tiny sentence: "ORDER" → "on" → WhatsApp logo.
 * It rests in brand black and only turns WhatsApp-green when the logo lands,
 * with a light streak sweeping across at the start of each loop.
 */
function OrderOnWhatsApp() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [loop, setLoop] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => {
      setStep((s) => {
        const next = (s + 1) % CTA_STEPS.length;
        if (next === 0) setLoop((l) => l + 1);
        return next;
      });
    }, CTA_STEPS[step].hold);
    return () => clearTimeout(t);
  }, [step, reduce]);

  const shown = reduce ? 2 : step;
  const look = CTA_STEPS[shown];

  return (
    <motion.span
      className="relative flex items-center justify-center w-[76px] h-[42px] rounded-full text-white overflow-hidden"
      initial={false}
      animate={{ backgroundColor: look.bg, boxShadow: `${look.glow}, inset 0 1px 1px rgba(255,255,255,0.28), inset 0 -2px 4px rgba(0,0,0,0.25)` }}
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* glass sheen on the top half */}
      <span
        className="pointer-events-none absolute inset-x-2 top-[3px] h-[45%] rounded-full bg-gradient-to-b from-white/25 to-transparent"
        aria-hidden="true"
      />
      {/* light streak that sweeps across once per loop */}
      {!reduce && (
        <motion.span
          key={loop}
          className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent"
          initial={{ x: '-60%' }}
          animate={{ x: '320%' }}
          transition={{ duration: 0.9, ease: 'easeInOut', delay: 0.15 }}
          aria-hidden="true"
        />
      )}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={shown}
          initial={{ y: 14, opacity: 0, filter: 'blur(4px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: -14, opacity: 0, filter: 'blur(4px)' }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          className="relative flex items-center justify-center font-heading font-black leading-none"
          aria-hidden="true"
        >
          {shown === 0 && <span className="text-[12.5px] uppercase tracking-[0.06em]">Order</span>}
          {shown === 1 && (
            <span className="text-[15px] italic lowercase tracking-tight" style={{ color: ACCENT_BRIGHT }}>
              on
            </span>
          )}
          {shown === 2 && (
            <motion.span
              initial={{ rotate: -20, scale: 0.7 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 14 }}
              className="flex"
            >
              <WhatsAppGlyph className="w-[22px] h-[22px]" />
            </motion.span>
          )}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { setNavDrawerOpen, isNavDrawerOpen, isDetailsModalOpen, isLoggedIn, setAuthDrawerOpen } = useAppStore();
  const [activeTabId, setActiveTabId] = useState<TabId>(() => getActiveTabId(pathname, isNavDrawerOpen));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setActiveTabId(getActiveTabId(pathname, isNavDrawerOpen));
  }, [pathname, isNavDrawerOpen]);

  if (!mounted) return null;

  // Hide on checkout, tomorrow trial modal, weekly plan modal, monthly plan page, and admin routes
  if (pathname === '/checkout' || pathname === '/tomorrow' || pathname === '/weekly' || pathname === '/monthly' || pathname.startsWith('/admin')) {
    return null;
  }

  const whatsappUrl = `https://wa.me/${BRAND.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(ORDER_MESSAGE)}`;
  const accountActive = activeTabId === 'account';

  const items: LiquidNavItem[] = [
    { label: 'Home', href: '/', icon: NimbusIcons.home, fx: 'glow', ariaLabel: 'BroTin Box Home' },
    { label: 'Menu', href: '/menu', icon: NimbusIcons.menu, fx: 'pop', ariaLabel: 'Weekly Menu' },
    {
      label: 'Order on WhatsApp',
      href: whatsappUrl,
      target: '_blank',
      rel: 'noopener noreferrer',
      action: true,
      fx: 'none',
      className: '!px-1 !flex-none',
      content: <OrderOnWhatsApp />,
    },
    { label: 'Pricing', href: '/pricing', icon: NimbusIcons.tag, fx: 'pop', ariaLabel: 'Pricing Plans' },
    {
      label: 'Profile',
      ariaLabel: isLoggedIn ? 'Your account' : 'Sign in',
      fx: 'wave',
      icon: (
        <span
          className={cn(
            'relative inline-flex w-7 h-7 rounded-full overflow-hidden transition-all duration-200',
            accountActive ? 'ring-2 ring-ink shadow-xs' : 'ring-1 ring-white/70 opacity-80'
          )}
        >
          {isLoggedIn ? (
            <UserAvatar size={28} />
          ) : (
            <span className="w-full h-full flex items-center justify-center bg-white/70 text-ink">
              <UserIcon className="w-4 h-4" />
            </span>
          )}
        </span>
      ),
      onClick: () => {
        if (isLoggedIn) setNavDrawerOpen(true);
        else setAuthDrawerOpen(true);
      },
    },
  ];

  return (
    <div
      className={cn(
        'md:hidden fixed bottom-4 inset-x-0 z-40 flex justify-center px-4 pointer-events-none select-none transition-all duration-300 ease-in-out',
        (isNavDrawerOpen || isDetailsModalOpen)
          ? 'translate-y-28 opacity-0 pointer-events-none'
          : 'translate-y-0 opacity-100'
      )}
    >
      <LiquidNavbar
        // Stretch the dock across the screen (up to 400px) and share the width between tabs
        className="pointer-events-auto w-full max-w-[400px] [&>.nimbus-item]:flex-1 [&>.nimbus-item]:min-w-0"
        aria-label="Mobile Floating Navigation Dock"
        tone="light"
        compact
        items={items}
        linkComponent={Link}
        active={TAB_ORDER.indexOf(activeTabId)}
        onChange={(i) => setActiveTabId(TAB_ORDER[i])}
      />
    </div>
  );
}
