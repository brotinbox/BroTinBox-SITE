'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronDown, HelpCircle, LayoutDashboard, LogOut, MapPin, Receipt, Sparkles, User as UserIcon, UserPlus } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { signOutCustomer } from '@/lib/auth/customer';
import { cn } from '@/lib/utils';
import { UserAvatar } from './UserAvatar';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/my-plan', label: 'My meals', icon: CalendarDays },
  { href: '/subscription', label: 'My plan', icon: Sparkles },
  { href: '/orders', label: 'Orders', icon: Receipt },
  { href: '/profile', label: 'Profile', icon: UserIcon },
  { href: '/delivery-areas', label: 'Delivery areas', icon: MapPin },
  { href: '/faq', label: 'Help & FAQ', icon: HelpCircle },
];

/**
 * Header account control.
 *  · checking session → neutral skeleton (no flash of the wrong state)
 *  · signed out       → "Sign in" button (opens the sign-in drawer)
 *  · signed in        → the customer's avatar with an account menu
 */
export function AccountButton({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' }) {
  const router = useRouter();
  const { isLoggedIn, authReady, user, setAuthDrawerOpen } = useAppStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const size = variant === 'mobile' ? 32 : 38;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!authReady) {
    return <span className="inline-block rounded-full bg-ink/10 animate-pulse" style={{ width: variant === 'mobile' ? 72 : 96, height: size }} aria-hidden="true" />;
  }

  if (!isLoggedIn) {
    return (
      <button
        type="button"
        onClick={() => setAuthDrawerOpen(true)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full transition-all active:scale-95',
          variant === 'mobile'
            ? 'px-3 py-1.5 text-[11px] font-bold bg-ink hover:bg-ink-soft text-white shadow-xs'
            : 'px-4 py-2 text-sm font-semibold bg-sand hover:bg-sand-deep text-ink'
        )}
      >
        {variant === 'mobile' && <UserPlus className="w-3 h-3" />}
        <span>Sign in</span>
      </button>
    );
  }

  return (
    <div ref={ref} className="relative z-50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Your account"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 p-0.5 rounded-full ring-2 ring-ink/20 hover:ring-ink focus:outline-none focus-visible:ring-ink transition-all"
      >
        <UserAvatar size={size} />
        {variant === 'desktop' && <ChevronDown className={cn('w-3.5 h-3.5 text-ink mr-1 transition-transform', open && 'rotate-180')} />}
      </button>

      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-gray-200 shadow-xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-3 p-4 bg-gray-50 border-b border-gray-100">
            <UserAvatar size={40} />
            <div className="min-w-0">
              <p className="font-heading font-bold text-sm text-gray-900 truncate">{user.fullName || 'My account'}</p>
              {user.email && <p className="text-xs text-gray-500 truncate">{user.email}</p>}
            </div>
          </div>
          <div className="p-1.5">
            {LINKS.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} role="menuitem" onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-ink">
                <Icon className="w-4 h-4" /> {label}
              </Link>
            ))}
            <button
              type="button"
              role="menuitem"
              onClick={async () => { setOpen(false); await signOutCustomer(); router.push('/'); router.refresh(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-rose-700 hover:bg-rose-50"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
