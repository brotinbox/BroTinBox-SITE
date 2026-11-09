'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

// Pages with their own bottom controls (wizards, checkout, payment, admin).
const HIDDEN = ['/checkout', '/tomorrow', '/weekly', '/monthly', '/admin', '/login', '/onboarding'];
// Pages where the mobile bottom dock is hidden, so the bar can sit lower.
const NO_DOCK = ['/checkout', '/tomorrow', '/weekly', '/monthly'];

/** Swiggy-style sticky cart bar: "Weekly plan + 2 extras · ₹1,960 · View cart". */
export function CartBar() {
  const pathname = usePathname();
  const { cartPlan, cartAddons, isDetailsModalOpen } = useAppStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || isDetailsModalOpen) return null;
  if (HIDDEN.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  if (!cartPlan && cartAddons.length === 0) return null;

  const days = Math.max(cartPlan?.days.length ?? 1, 1);
  const extras = cartAddons.reduce((n, a) => n + a.qty, 0);
  const total = (cartPlan?.estimate ?? 0) + cartAddons.reduce((s, a) => s + a.price * a.qty * days, 0);
  const label = cartPlan
    ? `${cartPlan.title}${extras ? ` + ${extras} extra${extras > 1 ? 's' : ''}` : ''}`
    : `${extras} extra${extras > 1 ? 's' : ''} · pick a box`;

  return (
    <div className={cn(
      'fixed inset-x-0 z-40 px-4 flex justify-center pointer-events-none',
      NO_DOCK.includes(pathname) ? 'bottom-4' : 'bottom-[88px] md:bottom-6'
    )}>
      <Link
        href="/checkout"
        className="pointer-events-auto relative overflow-hidden w-full max-w-md flex items-center gap-3 rounded-2xl px-5 py-3 text-white shadow-lg shadow-black/20 bg-gradient-to-r from-accent-hover via-accent to-accent-bright transition-transform active:scale-[0.99]"
      >
        {/* Paper grain over the gradient, same tile as the page background */}
        <span aria-hidden="true" className="absolute inset-0 bg-grain opacity-25 mix-blend-overlay pointer-events-none" />
        <span className="relative flex-1 min-w-0">
          <span className="block text-[11px] font-semibold text-white/90 truncate">{label}</span>
          {cartPlan && <span className="block font-heading font-black text-base leading-tight">₹{total.toLocaleString('en-IN')}</span>}
        </span>
        <span className="relative font-heading font-black text-sm shrink-0">View cart ›</span>
      </Link>
    </div>
  );
}
