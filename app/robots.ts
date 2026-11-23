import type { MetadataRoute } from 'next';
import { BRAND } from '@/config/brand';

// The staff console path is intentionally NOT listed here: robots.txt is
// public and would reveal it. The console sends X-Robots-Tag: noindex instead.
// A bot with its own group ignores the '*' group, so both share this list.
const PRIVATE_PATHS = ['/api/', '/auth/', '/checkout', '/dashboard', '/profile', '/orders', '/subscription', '/my-plan', '/progress', '/onboarding', '/login'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: ['GPTBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended'],
        allow: ['/', '/blog', '/blog/*', '/menu', '/weekly'],
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${BRAND.siteUrl}/sitemap.xml`,
  };
}
