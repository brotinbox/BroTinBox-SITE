'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

// Counts in-app page changes, so Back knows whether there is a page of ours to go back to.
let inAppNavs = 0;
let lastPath: string | null = null;

/** Mounted once in the site layout. */
export function RouteMemory() {
  const pathname = usePathname();
  useEffect(() => {
    if (lastPath !== null && lastPath !== pathname) inAppNavs += 1;
    lastPath = pathname;
  }, [pathname]);
  return null;
}

/** Previous in-app page if there is one, else the fallback (deep links, new tabs). */
export function useBack(fallback: string) {
  const router = useRouter();
  return () => {
    if (inAppNavs > 0) router.back();
    else router.push(fallback);
  };
}

/**
 * Top bar for focus screens (forms, sub-pages): back button + title, nothing
 * else. Pages in focus mode get no navbar, dock or footer (lib/layout/chrome.ts).
 */
export function FocusHeader({ title, titleTag: Title = 'h1', back = '/', backLabel = 'Back', right }: {
  title?: ReactNode;
  /** 'p' when the page has its own <h1> below the bar. */
  titleTag?: 'h1' | 'p';
  /** Where Back goes when the visitor landed straight on this page. */
  back?: string;
  backLabel?: string;
  right?: ReactNode;
}) {
  const goBack = useBack(back);
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 pt-[env(safe-area-inset-top)]">
      <div className="max-w-2xl mx-auto h-14 px-2 sm:px-4 flex items-center gap-1">
        <button
          type="button"
          onClick={goBack}
          aria-label={backLabel}
          className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-ink hover:bg-black/5 active:scale-95 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        {title && <Title className="flex-1 min-w-0 truncate font-heading font-black text-base sm:text-lg text-ink">{title}</Title>}
        {right && <div className="ml-auto shrink-0 pr-2">{right}</div>}
      </div>
    </header>
  );
}
