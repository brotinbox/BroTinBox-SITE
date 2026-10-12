'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  ArrowUpRight,
  BadgePercent,
  CalendarRange,
  ChevronDown,
  Repeat,
  SlidersHorizontal,
  Sunrise,
  Utensils,
} from 'lucide-react';
import { BRAND } from '@/config/brand';
import { cn } from '@/lib/utils';
import { LocationSelector } from '@/components/layout/LocationSelector';
import { AccountButton } from '@/components/layout/AccountButton';

const PLAN_TILES = [
  { href: '/tomorrow', icon: Sunrise, title: 'Daily Trial Box', desc: 'One box, delivered tomorrow. The easiest way to try us.' },
  { href: '/weekly', icon: Repeat, title: 'Weekly Plan', desc: 'A week of measured meals, planned around your goal.' },
  { href: '/monthly', icon: CalendarRange, title: 'Monthly Plan', desc: 'Our best value. A full month of protein, sorted.' },
  { href: '/custom', icon: SlidersHorizontal, title: 'Build Your Own', desc: 'Dial your own protein grams and compartments. Coming soon.' },
  { href: '/menu', icon: Utensils, title: "This Week's Menu", desc: 'Every box with photos, macros and ingredients.' },
  { href: '/pricing', icon: BadgePercent, title: 'Compare Pricing', desc: 'Trial vs weekly vs monthly, side by side.' },
];

const PLAN_PATHS = PLAN_TILES.map((t) => t.href);

const LINKS = [
  { href: '/menu', label: 'Menu' },
  { href: '/blog', label: 'Blog' },
  { href: '/delivery-areas', label: 'Delivery Areas' },
];

const isActive = (pathname: string | null, href: string) =>
  pathname === href || (href !== '/' && !!pathname?.startsWith(`${href}/`));

/** Desktop header: logo, pill nav with a "Plans" mega-menu, location, account and trial CTA. */
export function DesktopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const openNow = () => {
    cancelClose();
    setOpen(true);
  };
  // Small delay so moving the pointer from the trigger into the panel doesn't flicker it shut.
  const closeSoon = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => () => cancelClose(), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const plansActive = PLAN_PATHS.some((p) => p !== '/menu' && isActive(pathname, p));

  return (
    <div ref={rootRef} className="relative hidden md:flex items-center justify-between gap-6">
      <div className="flex items-center gap-6 lg:gap-8">
        <Link href="/" className="flex items-center shrink-0" aria-label={`${BRAND.name} home`}>
          <Image
            src="/logo.png"
            alt={BRAND.name}
            width={200}
            height={72}
            className="h-12 w-auto object-contain"
            priority
          />
        </Link>

        <nav className="flex items-center gap-1" aria-label="Main">
          <div onMouseEnter={openNow} onMouseLeave={closeSoon}>
            <button
              ref={triggerRef}
              type="button"
              onClick={() => (open ? setOpen(false) : openNow())}
              aria-expanded={open}
              aria-controls="plans-menu"
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors',
                open || plansActive ? 'bg-sand text-ink' : 'text-ink/70 hover:text-ink hover:bg-sand/70'
              )}
            >
              Plans
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', open && 'rotate-180')} />
            </button>
          </div>

          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link.href) ? 'page' : undefined}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-semibold transition-colors',
                isActive(pathname, link.href) ? 'bg-sand text-ink' : 'text-ink/70 hover:text-ink hover:bg-sand/70'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2.5">
        <LocationSelector variant="desktop" />
        <AccountButton variant="desktop" />
        <Link
          href="/tomorrow"
          className="group inline-flex items-center gap-2 pl-4 pr-1.5 py-1.5 rounded-full bg-ink hover:bg-ink-soft text-white text-sm font-semibold transition-colors"
        >
          Try a box
          <span className="w-7 h-7 rounded-full bg-accent flex items-center justify-center">
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </Link>
      </div>

      {open && (
        <div
          id="plans-menu"
          onMouseEnter={openNow}
          onMouseLeave={closeSoon}
          className="absolute inset-x-0 top-full pt-3 z-50"
        >
          <div className="rounded-3xl bg-white border border-ink/5 shadow-menu p-6 lg:p-7 animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/45 mb-4">Choose your plan</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {PLAN_TILES.map(({ href, icon: Icon, title, desc }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group flex flex-col rounded-2xl p-5 transition-colors',
                      active ? 'bg-accent-soft' : 'bg-paper hover:bg-accent-soft'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-5 h-5 stroke-[1.75] transition-colors',
                        active ? 'text-accent' : 'text-ink/50 group-hover:text-accent'
                      )}
                    />
                    <div className="mt-10">
                      <h3 className="font-heading text-lg font-bold text-ink tracking-tight">{title}</h3>
                      <p className="mt-1 text-sm text-ink/55 leading-snug">{desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
