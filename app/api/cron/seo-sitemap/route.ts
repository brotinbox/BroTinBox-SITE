import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { timingSafeEqual } from 'crypto';
import { BRAND } from '@/config/brand';
import { getSupabasePublic } from '@/lib/supabase/server';
import { searchConsoleConfigured, submitSitemap } from '@/lib/seo/search-console';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Called daily at 09:10 IST by pg_cron (see migration 20261115000044) with
 * "Authorization: Bearer <CRON_SECRET>", just after scheduled blog posts go live at 09:00.
 *
 * 1. Expires the blog cache so the new post, /blog and /sitemap.xml show up at once.
 * 2. If a post went live in the last 26 hours, resubmits the sitemap to Search Console.
 */
function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get('authorization') ?? '';
  if (!secret || secret.length < 32) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return new NextResponse('Unauthorized', { status: 401 });

  revalidateTag('blog', { expire: 0 });
  revalidatePath('/blog');
  revalidatePath('/sitemap.xml');

  const now = new Date();
  const since = new Date(now.getTime() - 26 * 3600_000);
  const { data: fresh, error } = await getSupabasePublic()
    .from('blog_posts')
    .select('slug')
    .eq('status', 'published')
    .gt('published_at', since.toISOString())
    .lte('published_at', now.toISOString());
  if (error) {
    console.error('[cron] seo-sitemap query failed', error);
    return NextResponse.json({ error: 'query failed' }, { status: 500 });
  }

  const slugs = (fresh ?? []).map((p) => p.slug);
  if (!slugs.length) return NextResponse.json({ newPosts: 0, submitted: false });
  if (!searchConsoleConfigured()) return NextResponse.json({ newPosts: slugs, submitted: false, reason: 'GSC_SERVICE_ACCOUNT_* not set' });

  const base = BRAND.siteUrl.replace(/\/$/, '');
  const sitemapUrl = `${base}/sitemap.xml`;
  try {
    // Regenerate the sitemap before Google is told to fetch it.
    const xml = await fetch(sitemapUrl, { cache: 'no-store' }).then((r) => r.text());
    const missing = slugs.filter((s) => !xml.includes(`/blog/${s}<`));
    await submitSitemap(sitemapUrl);
    return NextResponse.json({ newPosts: slugs, submitted: true, missingFromSitemap: missing });
  } catch (e) {
    console.error('[cron] seo-sitemap submit failed', e);
    return NextResponse.json({ newPosts: slugs, submitted: false, error: e instanceof Error ? e.message : 'failed' }, { status: 500 });
  }
}
