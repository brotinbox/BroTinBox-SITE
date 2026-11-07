'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { BROTIN_REVEAL_BG, INTRO_ATTR, INTRO_DONE_EVENT, INTRO_SEEN_KEY as SEEN_KEY } from './intro';

// WebGL code stays out of the landing page's main bundle.
const BrotinGlassLogo = dynamic(() => import('./BrotinGlassLogo').then((m) => m.BrotinGlassLogo), { ssr: false });

const SPEED = 1.25; // the 3.5 s reveal plays in ~2.8 s
const FADE_MS = 500;
const SAFETY_MS = 7000; // never trap anyone behind the splash (slow network, no WebGL)

// Runs inline before the page paints, so a first-time visitor never sees the page flash first.
const BOOT = `try{if(!localStorage.getItem('${SEEN_KEY}')&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.setAttribute('${INTRO_ATTR}','')}catch(e){}`;

type Phase = 'idle' | 'playing' | 'fading' | 'done';

/**
 * First-visit intro for the landing page: the logo's glass reveal plays once (~3 s), then the
 * splash fades into the page. Tap or any key skips it. Returning visitors never see it.
 */
export function IntroSplash() {
  const [phase, setPhase] = useState<Phase>('idle');
  const finishing = useRef(false);

  const finish = useCallback(() => {
    if (finishing.current) return;
    finishing.current = true;
    setPhase('fading');
    window.setTimeout(() => {
      document.documentElement.removeAttribute(INTRO_ATTR);
      setPhase('done');
      window.dispatchEvent(new Event(INTRO_DONE_EVENT));
    }, FADE_MS);
  }, []);

  useEffect(() => {
    if (!document.documentElement.hasAttribute(INTRO_ATTR)) return;
    setPhase('playing');
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {}
    const safety = window.setTimeout(finish, SAFETY_MS);
    const onKey = () => finish();
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(safety);
      window.removeEventListener('keydown', onKey);
    };
  }, [finish]);

  if (phase === 'done') return null;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      <div
        className={cn(
          'intro-splash fixed inset-0 z-[1000] transition-opacity ease-out',
          phase === 'fading' && 'opacity-0 pointer-events-none',
        )}
        style={{ backgroundColor: BROTIN_REVEAL_BG, transitionDuration: `${FADE_MS}ms` }}
        onClick={finish}
        aria-hidden={phase === 'idle'}
      >
        {phase !== 'idle' && (
          <BrotinGlassLogo
            className="h-full w-full"
            loop={false}
            speed={SPEED}
            tileSize={300}
            onComplete={() => window.setTimeout(finish, 250)}
          />
        )}
      </div>
    </>
  );
}
