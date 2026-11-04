'use client';

import { useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { SignInPanel } from '@/components/auth/SignInPanel';
import { BRAND } from '@/config/brand';

const HISTORY_FLAG = '__brotinSignIn';

/**
 * Sign-in popup for signed-out visitors: a bottom sheet on phones, a centered
 * card on desktop. Opened via useAppStore().openSignIn(...) — the old
 * setAuthDrawerOpen(true) calls route here too when signed out.
 *
 * While open it adds one history entry (same URL), so the phone's Back button
 * closes the popup instead of leaving the page. Next's own history state is
 * kept in that entry so the App Router treats Back as a no-op.
 */
export function SignInModal({ phoneEnabled }: { phoneEnabled: boolean }) {
  const request = useAppStore((s) => s.signIn);
  const closeSignIn = useAppStore((s) => s.closeSignIn);
  const open = !!request;
  const poppedRef = useRef(false);

  // Back button closes the popup.
  useEffect(() => {
    if (!open) return;
    poppedRef.current = false;
    window.history.pushState({ ...window.history.state, [HISTORY_FLAG]: true }, '');
    const onPop = () => {
      poppedRef.current = true;
      closeSignIn();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [open, closeSignIn]);

  /** Close, drop our history entry, then run `then` once the URL has settled. */
  const close = useCallback((then?: () => void) => {
    closeSignIn();
    if (!poppedRef.current && window.history.state?.[HISTORY_FLAG]) {
      poppedRef.current = true;
      let done = false;
      const run = () => { if (!done) { done = true; window.removeEventListener('popstate', run); then?.(); } };
      window.addEventListener('popstate', run);
      setTimeout(run, 350); // fallback if popstate never fires
      window.history.back();
    } else {
      then?.();
    }
  }, [closeSignIn]);

  // Escape + scroll lock.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Sign in">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={() => close()} aria-hidden="true" />

      <div className="relative w-full sm:max-w-[460px] max-h-[92dvh] overflow-y-auto bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 sm:zoom-in-95 fade-in duration-300 pb-[env(safe-area-inset-bottom)]">
        {/* Grab handle (phones) */}
        <div className="sm:hidden flex justify-center pt-2.5">
          <span className="h-1 w-10 rounded-full bg-gray-200" />
        </div>

        <div className="flex items-center justify-between px-6 sm:px-10 pt-4 sm:pt-8">
          <Image src="/logo.png" alt={BRAND.name} width={120} height={40} className="h-12 w-auto object-contain" />
          <button
            type="button"
            onClick={() => close()}
            className="p-2 -mr-2 rounded-full text-gray-400 hover:text-ink hover:bg-gray-100 transition-colors"
            aria-label="Close sign in"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 sm:px-10 pt-6 pb-8 sm:pb-10">
          {/* key: a fresh request (e.g. new autoSend number) resets the panel */}
          <SignInPanel key={JSON.stringify({ p: request.phone, r: request.returnTo, t: request.title })} phoneEnabled={phoneEnabled} request={request} finish={close} />
        </div>
      </div>
    </div>
  );
}
