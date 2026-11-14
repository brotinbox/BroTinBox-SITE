'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { X, Menu as MenuIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LocationSelector } from '@/components/layout/LocationSelector';
import { DesktopNav } from '@/components/layout/DesktopNav';
import { UserAvatar } from '@/components/layout/UserAvatar';
import { signOutCustomer } from '@/lib/auth/customer';
import { SIGN_OUT_CONFIRM, useConfirm } from '@/components/ui/ConfirmDialog';
import { fssaiAdjective, hasFssai } from '@/config/legal';
import { WhatsAppGlyph } from '@/components/ui/WhatsAppGlyph';
import { useChrome } from '@/lib/layout/chrome';

export function Navbar() {
  const router = useRouter();
  const confirm = useConfirm();
  const pathname = usePathname();
  const chrome = useChrome();
  const [mounted, setMounted] = useState(false);
  const { isLoggedIn, authReady, user, isNavDrawerOpen, setNavDrawerOpen, setAuthDrawerOpen } = useAppStore();
  const [isMobileNavVisible, setIsMobileNavVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const [drawerClosing, setDrawerClosing] = useState(false);
  const closeDrawer = useCallback(() => {
    setDrawerClosing(true);
    window.setTimeout(() => {
      setNavDrawerOpen(false);
      setDrawerClosing(false);
    }, 200);
  }, [setNavDrawerOpen]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset navbar visibility on page navigation
  useEffect(() => {
    setIsMobileNavVisible(true);
    lastScrollYRef.current = typeof window !== 'undefined' ? window.scrollY : 0;
  }, [pathname]);

  // Keep navbar visible if drawer is open
  useEffect(() => {
    if (isNavDrawerOpen) {
      setIsMobileNavVisible(true);
    }
  }, [isNavDrawerOpen]);

  // Mobile navbar scroll direction auto-hide (up on scroll down, down on scroll up)
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        // If an input is focused (e.g. searching dishes), keep navbar visible
        if (document.activeElement?.tagName === 'INPUT') {
          setIsMobileNavVisible(true);
          ticking = false;
          return;
        }

        const currentScrollY = window.scrollY;
        const lastScrollY = lastScrollYRef.current;
        const diff = currentScrollY - lastScrollY;

        // If at the top of the page, always show navbar
        if (currentScrollY <= 30) {
          setIsMobileNavVisible(true);
          lastScrollYRef.current = currentScrollY;
          ticking = false;
          return;
        }

        // Avoid rubber-banding jitter at bottom of page
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = window.innerHeight;
        if (currentScrollY + clientHeight >= scrollHeight - 20) {
          ticking = false;
          return;
        }

        // Only trigger on intentional scroll delta (> 6px)
        if (Math.abs(diff) > 6) {
          if (diff > 0 && currentScrollY > 50) {
            // Scrolling down -> slide mobile navbar up
            setIsMobileNavVisible(false);
          } else if (diff < 0) {
            // Scrolling up -> slide mobile navbar back down
            setIsMobileNavVisible(true);
          }
          lastScrollYRef.current = currentScrollY;
        }

        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent background scroll when menu drawer is open
  useEffect(() => {
    if (isNavDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isNavDrawerOpen]);

  // Close menu on route change or Escape key
  useEffect(() => {
    setNavDrawerOpen(false);
  }, [pathname, setNavDrawerOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeDrawer]);

  // Focus/flow screens draw their own back bar (FocusHeader / FlowShell) instead.
  if (!chrome.navbar) return null;

  const navLinks = [
    { label: 'Home', href: '/', desc: 'BroTin Box daily protein overview' },
    { label: 'Weekly Menu', href: '/menu', desc: 'Rotating 6-day box menu with photos' },
    { label: 'Monthly Subscription', href: '/monthly', badge: 'Best value', desc: '26 boxes a month, delivered Mon–Sat' },
    { label: 'Pricing Plans', href: '/pricing', badge: 'Save up to 16%', desc: 'Transparent breakdown: Trial vs Weekly vs Monthly' },
    { label: 'Nutrition Blog', href: '/blog', badge: 'New', desc: 'Clinical insights, macros & kitchen secrets' },
    { label: 'Delivery Areas', href: '/delivery-areas', desc: 'Coimbatore coverage & pincodes' },
  ];

  return (
    <>
      {/* Top Navbar */}
      <header
        className={cn(
          "sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md transition-transform duration-300 ease-in-out will-change-transform border-b border-ink/5",
          !isMobileNavVisible ? "-translate-y-full md:translate-y-0" : "translate-y-0"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
          <DesktopNav />

          {/* Mobile Header (Location on Left, Menu Slider on Right) */}
          <div className="flex md:hidden items-center justify-between gap-3">
            <LocationSelector variant="mobile" />

            <button
              type="button"
              onClick={() => setNavDrawerOpen(true)}
              aria-label="Open menu"
              className="w-10 h-10 rounded-full flex items-center justify-center text-ink bg-white border border-ink/15 shadow-xs shrink-0 active:scale-95 transition-all"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Slide-out Drawer & Overlay */}
      {isNavDrawerOpen && (
        <div
          className={cn(
            "fixed inset-0 z-50 flex justify-end duration-200",
            drawerClosing ? "animate-out fade-out fill-mode-forwards" : "animate-in fade-in"
          )}
        >
          {/* Backdrop */}
          <div onClick={closeDrawer} className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

          {/* Drawer */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className={cn(
              "relative z-10 w-full max-w-sm sm:max-w-md h-full bg-paper shadow-2xl flex flex-col ease-out",
              drawerClosing
                ? "animate-out slide-out-to-right fill-mode-forwards duration-200"
                : "animate-in slide-in-from-right duration-300"
            )}
          >
            {/* Header: account + close */}
            <div className="bg-white border-b border-gray-200 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 flex items-center justify-between gap-3">
              {mounted && authReady && isLoggedIn ? (
                <Link href="/dashboard" onClick={closeDrawer} className="flex items-center gap-3 min-w-0">
                  <UserAvatar size={44} className="shadow-sm" />
                  <div className="min-w-0">
                    <p className="font-heading font-black text-base text-ink leading-tight truncate">
                      {user?.fullName || 'My account'}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email || 'View dashboard'}</p>
                  </div>
                </Link>
              ) : (
                <div className="min-w-0">
                  <p className="font-heading font-black text-xl text-ink leading-tight">Welcome</p>
                  <button
                    type="button"
                    onClick={() => { closeDrawer(); setAuthDrawerOpen(true); }}
                    className="text-sm font-bold text-accent mt-0.5"
                  >
                    Sign in / Sign up
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Close menu"
                className="shrink-0 w-10 h-10 rounded-full border border-gray-200 bg-white hover:border-ink flex items-center justify-center tap-active"
              >
                <X className="w-5 h-5 text-ink" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              <Link
                href="/tomorrow"
                onClick={closeDrawer}
                className="block w-full text-center py-3.5 rounded-2xl bg-ink hover:bg-ink-soft text-white font-heading font-black text-sm tap-active"
              >
                Order tomorrow&apos;s trial box
              </Link>

              <section className="bg-white rounded-2xl border border-gray-200 p-2">
                <h2 className="font-heading font-bold text-sm text-gray-900 px-3 pt-2 pb-1">Explore</h2>
                <nav className="divide-y divide-gray-100">
                  {navLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={closeDrawer}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          "relative block px-3 py-3 rounded-xl transition-colors tap-active",
                          isActive ? "bg-paper" : "hover:bg-gray-50"
                        )}
                      >
                        {isActive && <span className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-ink" aria-hidden="true" />}
                        <span className="flex items-center gap-2">
                          <span className={cn("font-heading text-sm text-gray-900", isActive ? "font-black" : "font-bold")}>
                            {link.label}
                          </span>
                          {link.badge && (
                            <span className="text-[11px] font-bold text-accent">{link.badge}</span>
                          )}
                        </span>
                        <span className="block text-xs text-gray-500 mt-0.5">{link.desc}</span>
                      </Link>
                    );
                  })}
                </nav>
              </section>

              {mounted && isLoggedIn && (
                <section className="bg-white rounded-2xl border border-gray-200 p-2">
                  <h2 className="font-heading font-bold text-sm text-gray-900 px-3 pt-2 pb-1">Your account</h2>
                  <nav className="divide-y divide-gray-100">
                    {[
                      { href: '/dashboard', label: 'Dashboard' },
                      { href: '/my-plan', label: 'My meals' },
                      { href: '/orders', label: 'Orders' },
                      { href: '/profile', label: 'Profile' },
                    ].map(({ href, label }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={closeDrawer}
                        aria-current={pathname === href ? 'page' : undefined}
                        className={cn(
                          "block px-3 py-3 rounded-xl font-heading text-sm text-gray-900 transition-colors tap-active",
                          pathname === href ? "bg-paper font-black" : "font-bold hover:bg-gray-50"
                        )}
                      >
                        {label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={async () => { if (!(await confirm(SIGN_OUT_CONFIRM))) return; setNavDrawerOpen(false); await signOutCustomer(); router.push('/'); router.refresh(); }}
                      className="w-full text-left px-3 py-3 rounded-xl font-heading font-bold text-sm text-rose-700 hover:bg-gray-50"
                    >
                      Sign out
                    </button>
                  </nav>
                </section>
              )}
            </div>

            {/* Footer: support + trust line */}
            <div className="bg-white border-t border-gray-200 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2">
              <a
                href={`https://wa.me/918248606711?text=${encodeURIComponent("Hi BroTin Box! I'd like to place an order.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 py-3 rounded-2xl bg-[#25D366] hover:bg-[#1EBE5D] text-sm font-bold text-white shadow-sm tap-active"
              >
                <WhatsAppGlyph className="w-5 h-5" />
                Order on WhatsApp
              </a>
              <p className="text-center text-xs text-gray-500">
                100% digitally weighed{hasFssai() ? ` · FSSAI ${fssaiAdjective()} kitchen` : ''}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
