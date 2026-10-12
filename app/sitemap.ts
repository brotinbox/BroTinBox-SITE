import type { MetadataRoute } from 'next';
import { BRAND } from '@/config/brand';
import { getPublishedPosts } from '@/lib/content/blog';

const PAGES = ['', '/menu', '/plans', '/pricing', '/weekly', '/monthly', '/tomorrow', '/delivery-areas', '/blog', '/faq', '/about', '/contact', '/terms', '/privacy', '/refund-policy', '/delivery-policy', '/food-safety', '/grievance'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = BRAND.siteUrl.replace(/\/$/, '');
  const posts = await getPublishedPosts().catch(() => []);
  return [
    ...PAGES.map((p) => ({ url: `${base}${p}`, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.7 })),
    ...posts.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.published_at ?? undefined, changeFrequency: 'monthly' as const, priority: 0.6 })),
  ];
}
