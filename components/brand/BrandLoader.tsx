'use client';

import { BrotinGlassLogo } from './BrotinGlassLogo';

/**
 * Route loading screen: the logo's glass reveal on a loop. It fades in after a short delay, so a
 * route that loads quickly never flashes it.
 */
export function BrandLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div
      className="brand-loader min-h-[70vh] w-full flex flex-col items-center justify-center bg-paper pb-28"
      aria-busy="true"
      aria-live="polite"
    >
      <BrotinGlassLogo className="h-[260px] w-full max-w-[420px]" tileSize={130} speed={1.35} hold={0.35} />
      <p className="mt-1 text-sm font-medium text-ink/50">{label}…</p>
    </div>
  );
}

export default BrandLoader;
