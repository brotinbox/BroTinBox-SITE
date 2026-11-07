'use client';

import { GlassIconReveal, type GlassIconRevealProps } from '@/components/ui/liquid-glass-logo-reveal';
import { BROTIN_REVEAL_BG } from './intro';

/** Speck-free copy of /logo.png made for the glass reveal (the effect magnifies stray pixels). */
export const BROTIN_REVEAL_LOGO = '/logo-reveal.png';

type Props = Omit<GlassIconRevealProps, 'logo'>;

/** The BroTin Box logo in the liquid-glass reveal, in its own brown and orange. */
export function BrotinGlassLogo({ tuning, ...props }: Props) {
  return (
    <GlassIconReveal
      logo={BROTIN_REVEAL_LOGO}
      label="BroTin Box"
      look="light"
      originalColors
      background={BROTIN_REVEAL_BG}
      logoScale={0.78}
      finalScale={0.82}
      {...props}
      tuning={{ startZoom: 2.3, shadow: 0.6, ...tuning }}
    />
  );
}
