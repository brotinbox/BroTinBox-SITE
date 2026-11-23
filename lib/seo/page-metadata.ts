import type { Metadata } from 'next';
import { BRAND } from '@/config/brand';

/**
 * Per-page title, description, canonical and Open Graph for public pages.
 *
 * Next.js merges metadata shallowly, so a page's `openGraph` replaces the root
 * layout's whole object. This builds the full object each time, so og:url,
 * og:title and the share image always match the page instead of the homepage.
 */
export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
}: {
  /** Page title. Root layout appends " | BroTin Box" unless absoluteTitle. */
  title: string;
  description: string;
  /** Path from the site root, e.g. '/menu'. Used for the canonical and og:url. */
  path: string;
  absoluteTitle?: boolean;
}): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} | ${BRAND.name}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: 'en_IN',
      siteName: BRAND.name,
      url: path,
      title: fullTitle,
      description,
      images: [{ url: '/logo.png', width: 1200, height: 630, alt: `${BRAND.name} Fresh Healthy Meals` }],
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description },
  };
}
