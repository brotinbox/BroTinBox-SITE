'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useAppStore } from '@/store/useAppStore';

type Choice = 'accepted' | 'rejected';

const STORAGE_KEY = 'brotinbox-cookie-consent';
/** Bump when the analytics tools change, so everyone is asked again. */
const CONSENT_VERSION = 1;
const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const OPEN_EVENT = 'brotinbox:cookie-settings';

function readChoice(): Choice | null {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved?.version !== CONSENT_VERSION) return null;
    if (Date.now() - new Date(saved.at).getTime() > CONSENT_MAX_AGE_MS) return null;
    return saved.choice === 'accepted' || saved.choice === 'rejected' ? saved.choice : null;
  } catch {
    return null;
  }
}

function saveChoice(choice: Choice) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, version: CONSENT_VERSION, at: new Date().toISOString() }));
  } catch {
    // Storage blocked: the choice still applies to this page view.
  }
}

/** GA sets its cookies on the widest domain it can, so try each level of the hostname. */
function clearAnalyticsCookies() {
  const parts = window.location.hostname.split('.');
  const domains = [''];
  for (let i = 0; i < parts.length; i++) domains.push(`; domain=.${parts.slice(i).join('.')}`);

  document.cookie.split('; ').forEach((cookie) => {
    const name = cookie.split('=')[0];
    if (!name.startsWith('_ga')) return;
    domains.forEach((domain) => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
    });
  });
}

/** Reopens the banner, so withdrawing consent stays as easy as giving it. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      Cookie settings
    </button>
  );
}

/**
 * Google Analytics loads only after the visitor accepts. Pass measurementId as
 * null to show the banner without ever loading GA (local runs, previews).
 */
export function CookieConsent({ measurementId }: { measurementId: string | null }) {
  const { isNavDrawerOpen, isDetailsModalOpen } = useAppStore();
  // undefined until mounted: pages are cached HTML, so the choice is only known in the browser.
  const [choice, setChoice] = useState<Choice | null | undefined>(undefined);
  const [isReopened, setIsReopened] = useState(false);

  useEffect(() => {
    const saved = readChoice();
    setChoice(saved);
    // Removes cookies from before this choice was made, or from a choice that has expired.
    if (saved !== 'accepted') clearAnalyticsCookies();
    const reopen = () => setIsReopened(true);
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, []);

  const choose = (next: Choice) => {
    const isWithdrawing = choice === 'accepted' && next === 'rejected';
    saveChoice(next);
    setChoice(next);
    setIsReopened(false);

    if (isWithdrawing) {
      if (measurementId) (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = true;
      clearAnalyticsCookies();
      // The tag cannot be unloaded from a running page.
      window.location.reload();
    }
  };

  const isBannerVisible = (choice === null || isReopened) && !isNavDrawerOpen && !isDetailsModalOpen;

  return (
    <>
      {choice === 'accepted' && measurementId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
          <Script id="google-analytics" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}');`}
          </Script>
        </>
      )}

      {isBannerVisible && (
        <div
          role="dialog"
          aria-label="Cookie choices"
          className="fixed z-50 bottom-20 inset-x-3 md:bottom-6 md:left-6 md:right-auto md:max-w-md bg-white border border-gray-200 rounded-2xl shadow-lg shadow-black/15 p-4"
        >
          <p className="text-[13px] leading-relaxed text-gray-700">
            This site uses cookies to understand how it&apos;s used.{' '}
            <Link href="/privacy#cookies" className="font-semibold text-ink underline">Privacy Policy</Link>
          </p>
          {isReopened && choice && (
            <p className="mt-2 text-xs text-gray-500">Current choice: {choice}</p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => choose('rejected')}
              className="py-2.5 rounded-xl text-sm font-bold bg-white text-ink border border-ink hover:bg-gray-50 transition-colors"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => choose('accepted')}
              className="py-2.5 rounded-xl text-sm font-bold bg-ink text-white border border-ink hover:bg-ink-soft transition-colors"
            >
              Accept
            </button>
          </div>
        </div>
      )}
    </>
  );
}
