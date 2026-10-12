import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BRAND } from '@/config/brand';
import { getPostBySlug, getPublishedPosts } from '@/lib/content/blog';
import { renderMarkdown } from '@/lib/content/markdown';
import { ViewCounter } from './ViewCounter';

// Published posts are pre-rendered and cached; new ones render on first visit
// and are then cached too. Publishing clears the 'blog' tag.
export const dynamicParams = true;
export async function generateStaticParams() {
  const posts = await getPublishedPosts().catch(() => []);
  return posts.map((p) => ({ slug: p.slug }));
}

const validSlug = (s: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 120;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!validSlug(slug)) return {};
  const post = await getPostBySlug(slug);
  if (!post) return { title: 'Article not found' };
  const image = post.og_image_url || post.cover_image_url || undefined;
  return {
    title: post.seo_title || post.title,
    description: post.seo_description || post.excerpt || undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.seo_title || post.title,
      description: post.seo_description || post.excerpt || undefined,
      publishedTime: post.published_at ?? undefined,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!validSlug(slug)) notFound();
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    url: `${BRAND.siteUrl}/blog/${post.slug}`,
    mainEntityOfPage: `${BRAND.siteUrl}/blog/${post.slug}`,
    description: post.excerpt,
    image: post.cover_image_url ? [post.cover_image_url] : undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: post.author_name ? { '@type': 'Person', name: post.author_name } : { '@type': 'Organization', name: BRAND.name },
    publisher: { '@type': 'Organization', name: BRAND.name },
  };

  return (
    <article className="min-h-screen bg-paper pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <ViewCounter slug={post.slug} />
      <div className="max-w-3xl mx-auto px-4 pt-8">
        <Link href="/blog" className="text-xs font-bold text-ink">← All articles</Link>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {post.blog_categories && (
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-accent">
              {post.blog_categories.name}
            </span>
          )}
          {post.macros_highlight && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-ink/10 text-ink">
              ⚡ {post.macros_highlight}
            </span>
          )}
        </div>
        <h1 className="font-heading font-black text-3xl sm:text-4xl text-gray-900 mt-2 leading-tight">{post.title}</h1>
        {post.excerpt && <p className="text-base text-gray-600 mt-3">{post.excerpt}</p>}
        <p className="text-xs text-gray-500 mt-4">
          {post.author_name && <><b className="text-gray-800">{post.author_name}</b>{post.author_role ? `, ${post.author_role}` : ''} · </>}
          {post.published_at && new Date(post.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })} · {post.read_minutes} min read
        </p>
        {post.cover_image_url && (
          <div className="relative aspect-[16/9] mt-6 rounded-3xl overflow-hidden">
            <Image src={post.cover_image_url} alt={post.title} fill sizes="(min-width: 768px) 768px, 100vw" className="object-cover" priority />
          </div>
        )}
        <div className="prose-blog mt-8" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />
        {post.tags && post.tags.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200 flex flex-wrap gap-2 items-center">
            <span className="text-xs font-bold text-gray-400">Pillars:</span>
            {post.tags.map((tag: string) => (
              <span key={tag} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600">
                #{tag}
              </span>
            ))}
          </div>
        )}
        <div className="mt-12 p-6 rounded-3xl bg-ink text-white text-center">
          <p className="font-heading font-black text-xl">Try measured meals for a day</p>
          <p className="text-sm text-white/80 mt-1">Every box weighed, delivered fresh in Coimbatore.</p>
          <Link href="/tomorrow" className="inline-block mt-4 px-5 py-3 rounded-xl bg-lime-brand text-ink font-black text-sm">Order a trial box</Link>
        </div>
      </div>
    </article>
  );
}
