'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { BRAND } from '@/config/brand';
import { useAppStore } from '@/store/useAppStore';
import {
  X,
  Home,
  MapPin,
  Sparkles,
  Utensils,
  Calendar,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
  MessageCircle,
  User as UserIcon,
  LogOut,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LocationSelector } from '@/components/layout/LocationSelector';
import { AccountButton } from '@/components/layout/AccountButton';
import { UserAvatar } from '@/components/layout/UserAvatar';
import { signOutCustomer } from '@/lib/auth/customer';
import { Menu as MenuIcon, LayoutDashboard, CalendarDays, Receipt } from 'lucide-react';
import { BookOpen } from 'lucide-react';
import { hasFssai } from '@/config/legal';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { isLoggedIn, authReady, user, isNavDrawerOpen, setNavDrawerOpen, setAuthDrawerOpen } = useAppStore();
  const [isMobileNavVisible, setIsMobileNavVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  const isHomePage = pathname === '/';

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
      if (e.key === 'Escape') setNavDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setNavDrawerOpen]);

  const navLinks = [
    { label: 'Home', href: '/', icon: Home, desc: 'BroTin Box daily protein overview' },
    { label: 'Weekly Menu', href: '/menu', icon: Utensils, desc: 'Rotating 6-day box menu with photos' },
    { label: 'Pricing Plans', href: '/pricing', icon: Sparkles, badge: 'Save up to 16%', desc: 'Transparent breakdown: Trial vs Weekly vs Monthly' },
    { label: 'Nutrition Blog', href: '/blog', icon: BookOpen, badge: 'New', desc: 'Clinical insights, macros & kitchen secrets' },
    { label: 'Delivery Areas', href: '/delivery-areas', icon: MapPin, desc: 'Coimbatore coverage & pincodes' },
    { label: 'FAQ & Support', href: '/faq', icon: HelpCircle, desc: 'Questions about meal rotation & billing' },
  ];

  return (
    <>
      {/* Top Navbar for non-home pages (Desktop matches the clean home hero navbar) */}
      {!isHomePage && (
        <header
          className={cn(
            "sticky top-0 z-50 w-full bg-[#E8F1D4] sm:bg-[#E8F1D4]/95 backdrop-blur-md transition-transform duration-300 ease-in-out will-change-transform border-b border-[#124233]/10",
            !isMobileNavVisible ? "-translate-y-full md:translate-y-0" : "translate-y-0"
          )}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
            {/* Desktop Navbar (Hidden on mobile) */}
            <div className="hidden md:flex items-center justify-between">
              {/* Left Brand Logo */}
              <Link href="/" className="flex items-center gap-2 group">
                <Image
                  src="/logo.png"
                  alt={BRAND.name}
                  width={200}
                  height={72}
                  className="h-14 md:h-16 w-auto object-contain transition-transform group-hover:scale-105"
                  priority
                />
              </Link>

              {/* Center Clean Typography Navigation Links */}
              <nav className="flex items-center gap-6 lg:gap-8">
                <Link
                  href="/menu"
                  className={cn(
                    "text-sm font-bold tracking-wide transition-colors",
                    pathname === '/menu'
                      ? "text-[#899545]"
                      : "text-[#124233] hover:text-[#899545]"
                  )}
                >
                  Menu
                </Link>
                <Link
                  href="/pricing"
                  className={cn(
                    "text-sm font-bold tracking-wide transition-colors",
                    pathname === '/pricing'
                      ? "text-[#899545]"
                      : "text-[#124233] hover:text-[#899545]"
                  )}
                >
                  Pricing
                </Link>
                <Link
                  href="/blog"
                  className={cn(
                    "text-sm font-bold tracking-wide transition-colors flex items-center gap-1.5",
                    pathname === '/blog'
                      ? "text-[#899545]"
                      : "text-[#124233] hover:text-[#899545]"
                  )}
                >
                  <span>Blog</span>
                  <span className="text-[10px] font-bold bg-[#899545] text-white px-1.5 py-0.2 rounded-full">New</span>
                </Link>
                <Link
                  href="/delivery-areas"
                  className={cn(
                    "text-sm font-bold tracking-wide transition-colors",
                    pathname === '/delivery-areas'
                      ? "text-[#899545]"
                      : "text-[#124233] hover:text-[#899545]"
                  )}
                >
                  Delivery Areas
                </Link>
              </nav>

              {/* Right Profile & Login & Location Selector */}
              <div className="flex items-center gap-3">
                <LocationSelector variant="desktop" />

                <AccountButton variant="desktop" />
              </div>
            </div>

            {/* Mobile Header (Location on Left, Menu Slider on Right) */}
            <div className="flex md:hidden items-center justify-between gap-3">
              <LocationSelector variant="mobile" />

              <button
                type="button"
                onClick={() => setNavDrawerOpen(true)}
                aria-label="Open menu"
                className="w-10 h-10 rounded-full flex items-center justify-center text-[#124233] bg-white border border-[#124233]/15 shadow-xs shrink-0 active:scale-95 transition-all"
              >
                <MenuIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Slide-out Drawer & Overlay */}

      {/* Slide-out Drawer & Overlay */}
      {isNavDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            onClick={() => setNavDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative w-full max-w-sm sm:max-w-md bg-white h-full shadow-2xl z-10 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div>
              <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                {/* User Profile Card Summary */}
                {mounted && authReady && isLoggedIn ? (
                  <Link
                    href="/dashboard"
                    onClick={() => setNavDrawerOpen(false)}
                    className="flex items-center gap-3 min-w-0 group cursor-pointer"
                  >
                    <UserAvatar size={48} className="border-2 border-primary/20 shadow-sm group-hover:scale-105 transition-transform" />
                    <div className="min-w-0">
                      <h3 className="font-heading font-bold text-gray-900 text-sm sm:text-base leading-tight truncate group-hover:text-primary transition-colors">
                        {user?.fullName || 'My account'}
                      </h3>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {user?.email || 'View dashboard →'}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setNavDrawerOpen(false);
                      setAuthDrawerOpen(true);
                    }}
                    className="flex items-center gap-3 min-w-0 text-left group cursor-pointer"
                  >
                    <span className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center shrink-0 group-hover:bg-primary-light transition-colors">
                      <UserIcon className="w-5 h-5 text-gray-500 group-hover:text-primary transition-colors" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-heading font-bold text-gray-900 text-sm sm:text-base leading-tight truncate">
                        Welcome
                      </h3>
                      <p className="text-xs text-[#124233] font-bold truncate mt-0.5">
                        Sign in / Sign up →
                      </p>
                    </div>
                  </button>
                )}

                {/* Close Button */}
                <button
                  onClick={() => setNavDrawerOpen(false)}
                  className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-200/80 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Prominent Quick Action Button */}
              <div className="p-4 sm:p-5 pb-2">
                <Link
                  href="/tomorrow"
                  onClick={() => setNavDrawerOpen(false)}
                  className="w-full flex items-center justify-center gap-2 bg-cta hover:bg-cta-hover text-white text-sm font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-cta/25 hover:shadow-lg transition-all tap-active"
                >
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>Order Tomorrow’s Daily Trial Box</span>
                </Link>
              </div>

              {/* Navigation Items */}
              <div className="p-4 sm:p-5 space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-3 pb-1">
                  Navigation
                </p>

                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setNavDrawerOpen(false)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-2xl transition-all group tap-active",
                        isActive
                          ? "bg-primary-light text-primary font-bold"
                          : "text-gray-700 hover:bg-gray-50 hover:text-primary"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                            isActive
                              ? "bg-primary text-white"
                              : "bg-gray-100 text-gray-600 group-hover:bg-primary-light group-hover:text-primary"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold flex items-center gap-2">
                            <span>{link.label}</span>
                            {link.badge && (
                              <span className="text-[10px] font-bold bg-cta text-white px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                                {link.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 group-hover:text-gray-500 font-normal">
                            {link.desc}
                          </p>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  );
                })}
              </div>

              {/* Account / Dashboard Section */}
              <div className="px-4 sm:px-5 pb-4">
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-2 pb-1">
                    Account & Orders
                  </p>

                  {mounted && isLoggedIn ? (
                    <>
                      {[
                        { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
                        { href: '/my-plan', label: 'My meals', Icon: CalendarDays },
                        { href: '/orders', label: 'Orders', Icon: Receipt },
                        { href: '/profile', label: 'Profile', Icon: UserIcon },
                      ].map(({ href, label, Icon }) => (
                        <Link key={href} href={href} onClick={() => setNavDrawerOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl text-sm font-semibold text-gray-800 hover:bg-white hover:text-primary transition-all">
                          <div className="flex items-center gap-2.5"><Icon className="w-4 h-4 text-primary" /><span>{label}</span></div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </Link>
                      ))}
                      <button
                        type="button"
                        onClick={async () => { setNavDrawerOpen(false); await signOutCustomer(); router.push('/'); router.refresh(); }}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-sm font-semibold text-rose-700 hover:bg-white transition-all text-left"
                      >
                        <LogOut className="w-4 h-4" /><span>Sign out</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setNavDrawerOpen(false); setAuthDrawerOpen(true); }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl text-sm font-semibold text-gray-800 hover:bg-white hover:text-primary transition-all text-left"
                    >
                      <div className="flex items-center gap-2.5"><UserIcon className="w-4 h-4 text-primary" /><span>Sign in / Sign up</span></div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                  )}

                  <Link
                    href="/delivery-areas"
                    onClick={() => setNavDrawerOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-xl text-sm font-semibold text-gray-800 hover:bg-white hover:text-primary transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span>Delivery Areas (Coimbatore)</span>
                    </div>
                    <span className="text-xs font-semibold text-primary bg-primary-light px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Drawer Footer: Support & FSSAI Trust */}
            <div className="p-5 border-t border-gray-100 bg-gray-50/50 space-y-3">
              <a
                href="https://wa.me/917604909848?text=Hi%20BroTin%20Box%20Team,%20I%20have%20a%20question%20about%20your%20meal%20boxes"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all"
              >
                <img
                  src="https://img.icons8.com/color/480/whatsapp--v1.png"
                  alt="WhatsApp"
                  className="w-4 h-4 object-contain"
                />
                <span>Chat with Nutritionist on WhatsApp</span>
              </a>

              <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>100% Digitally Weighed{hasFssai() ? ' • FSSAI Licensed Kitchen' : ''}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
