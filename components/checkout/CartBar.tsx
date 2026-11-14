'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useChrome } from '@/lib/layout/chrome';
import { useAppStore } from '@/store/useAppStore';
import { getMyOpenOrder, type OpenOrder } from '@/lib/checkout/actions';
import { cn } from '@/lib/utils';

const PLAN_NAME: Record<string, string> = { trial: 'Trial box', weekly: 'Weekly plan', monthly: 'Monthly plan', custom: 'Meal plan' };

/**
 * Swiggy-style sticky bar. A saved cart (kept in the browser, so it survives
 * leaving the site, signed in or not) shows "Continue booking". With no cart,
 * a signed-in customer's unpaid order shows "Complete payment" instead.
 */
export function CartBar() {
  const chrome = useChrome();
  const pathname = usePathname();
  const { cartPlan, cartAddons, isDetailsModalOpen, isLoggedIn } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [openOrder, setOpenOrder] = useState<OpenOrder | null>(null);
  useEffect(() => setMounted(true), []);

  const hasCart = !!cartPlan || cartAddons.length > 0;
  // Re-checked on each page change, so it disappears once the order is paid.
  useEffect(() => {
    if (!isLoggedIn || hasCart || !chrome.cartBar) { setOpenOrder(null); return; }
    let cancelled = false;
    getMyOpenOrder().then((o) => { if (!cancelled) setOpenOrder(o); }).catch(() => {});
    return () => { cancelled = true; };
  }, [isLoggedIn, hasCart, chrome.cartBar, pathname]);

  if (!mounted || isDetailsModalOpen) return null;
  // Focus screens (wizards, checkout, forms) have their own bottom controls.
  if (!chrome.cartBar) return null;

  if (!hasCart) {
    if (!openOrder) return null;
    return (
      <Bar href={`/checkout/pay/${openOrder.id}`} cta="Complete payment ›" bottomNav={chrome.bottomNav}>
        <span className="block text-[11px] font-semibold text-white/90 truncate">
          {PLAN_NAME[openOrder.type] ?? 'Your order'} · {openOrder.orderNumber} · waiting for payment
        </span>
        <span className="block font-heading font-black text-base leading-tight">₹{openOrder.total.toLocaleString('en-IN')}</span>
      </Bar>
    );
  }

  const days = Math.max(cartPlan?.days.length ?? 1, 1);
  const extras = cartAddons.reduce((n, a) => n + a.qty, 0);
  const total = (cartPlan?.estimate ?? 0) + cartAddons.reduce((s, a) => s + a.price * a.qty * days, 0);
  const label = cartPlan
    ? `${cartPlan.title}${extras ? ` + ${extras} extra${extras > 1 ? 's' : ''}` : ''}`
    : `${extras} extra${extras > 1 ? 's' : ''} · pick a box`;

  return (
    <Bar href="/checkout" cta={cartPlan ? 'Continue booking ›' : 'View cart ›'} bottomNav={chrome.bottomNav}>
      <span className="block text-[11px] font-semibold text-white/90 truncate">{label}</span>
      {cartPlan && <span className="block font-heading font-black text-base leading-tight">₹{total.toLocaleString('en-IN')}</span>}
    </Bar>
  );
}

function Bar({ href, cta, bottomNav, children }: { href: string; cta: string; bottomNav: boolean; children: ReactNode }) {
  return (
    <div className={cn(
      'fixed inset-x-0 z-40 px-4 flex justify-center pointer-events-none',
      bottomNav ? 'bottom-[88px] md:bottom-6' : 'bottom-4'
    )}>
      <Link
        href={href}
        className="pointer-events-auto relative overflow-hidden w-full max-w-md flex items-center gap-3 rounded-2xl px-5 py-3 text-white shadow-lg shadow-black/20 bg-gradient-to-r from-accent-hover via-accent to-accent-bright transition-transform active:scale-[0.99]"
      >
        {/* Paper grain over the gradient, same tile as the page background */}
        <span aria-hidden="true" className="absolute inset-0 bg-grain opacity-25 mix-blend-overlay pointer-events-none" />
        <span className="relative flex-1 min-w-0">{children}</span>
        <span className="relative font-heading font-black text-sm shrink-0">{cta}</span>
      </Link>
    </div>
  );
}
