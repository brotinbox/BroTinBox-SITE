import type { MetadataRoute } from 'next';
import { BRAND } from '@/config/brand';

// The staff console path is intentionally NOT listed here: robots.txt is
// public and would reveal it. The console sends X-Robots-Tag: noindex instead.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/', '/checkout', '/dashboard', '/profile', '/orders', '/subscription', '/my-plan', '/progress', '/onboarding', '/login'],
      },
      {
        userAgent: ['GPTBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended'],
        allow: ['/', '/blog', '/blog/*', '/menu', '/plans'],
        disallow: ['/api/', '/dashboard', '/profile', '/orders', '/subscription', '/checkout'],
      },
    ],
    sitemap: `${BRAND.siteUrl}/sitemap.xml`,
  };
}
