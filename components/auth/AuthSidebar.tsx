'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { signOutCustomer } from '@/lib/auth/customer';
import {
  X,
  ShieldCheck,
  Sparkles,
  Lock,
  User,
  LogOut,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

export function AuthSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthDrawerOpen, setAuthDrawerOpen, isLoggedIn, user } = useAppStore();

  const [mounted, setMounted] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scroll when sidebar is open
  useEffect(() => {
    document.body.style.overflow = isAuthDrawerOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isAuthDrawerOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthDrawerOpen) setAuthDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthDrawerOpen, setAuthDrawerOpen]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOutCustomer();
    setSigningOut(false);
    setAuthDrawerOpen(false);
    router.push('/');
    router.refresh();
  };

  if (!mounted || !isAuthDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={() => setAuthDrawerOpen(false)}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
      />

      {/* Slide-out Sidebar Panel */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl z-10 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
        <div>
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-ink to-ink-soft text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
                <Lock className="w-4 h-4 text-accent-soft" />
              </div>
              <div>
                <h3 className="font-heading font-black text-base tracking-tight leading-tight">
                  {isLoggedIn ? 'Your BroTin Box Account' : 'Sign In'}
                </h3>
                <p className="text-[11px] text-accent-soft/80">
                  Coimbatore Daily Macro Meals
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAuthDrawerOpen(false)}
              className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close login sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6">
            {isLoggedIn ? (
              /* Already Logged In State */
              <div className="space-y-5 animate-in fade-in">
                <div className="p-4 rounded-2xl bg-sand border border-ink/15 flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full bg-ink text-white flex items-center justify-center font-heading font-black text-lg">
                    {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-heading font-bold text-sm text-ink truncate">
                      {user?.fullName || user?.email || 'Your account'}
                    </h4>
                    <p className="text-xs text-gray-600 font-mono truncate">
                      {user?.phone ? `+91 ${user.phone}` : user?.email}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Link
                    href="/dashboard"
                    onClick={() => setAuthDrawerOpen(false)}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-xs sm:text-sm font-bold transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <User className="w-4 h-4 text-ink" />
                      <span>Member Dashboard & Meals</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                  </Link>

                  <Link
                    href="/orders"
                    onClick={() => setAuthDrawerOpen(false)}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-xs sm:text-sm font-bold transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-accent" />
                      <span>Track Active Orders & History</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                  </Link>

                  <Link
                    href="/my-plan"
                    onClick={() => setAuthDrawerOpen(false)}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-xs sm:text-sm font-bold transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <RotateCcw className="w-4 h-4 text-ink" />
                      <span>Meal Swaps & Pause Calendar</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-all tap-active"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sand text-ink text-[10px] font-extrabold uppercase tracking-wider mb-2">
                    <Sparkles className="w-3 h-3 text-accent" />
                    <span>One-tap sign in</span>
                  </div>
                  <h4 className="font-heading font-black text-lg text-gray-900 leading-tight">
                    Sign in to manage your meals
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Use your Google account. New customers get an account automatically and add
                    their phone number and address next.
                  </p>
                </div>
                <GoogleSignInButton next={pathname && pathname !== '/login' ? pathname : '/dashboard'} />
              </div>
            )}
          </div>
        </div>

        {/* Footer Trust Shield */}
        <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-center gap-2 text-[11px] text-gray-500 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Secure Google sign-in • We never see your password</span>
        </div>
      </div>
    </div>
  );
}
