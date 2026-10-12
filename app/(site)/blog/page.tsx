import type { Metadata } from 'next';
import { BookOpen } from 'lucide-react';
import { BlogList } from './BlogList';
import { BRAND } from '@/config/brand';
import { getPublishedPosts } from '@/lib/content/blog';

export const metadata: Metadata = {
  title: 'Nutrition journal',
  description: `Articles on high-protein eating, measured nutrition and healthy routines from the ${BRAND.name} kitchen in Coimbatore.`,
};


export default async function BlogPage() {
  const posts = await getPublishedPosts();
  return (
    <div className="min-h-screen bg-[#FBFDF8] pb-24">
      <div className="max-w-6xl mx-auto px-4 pt-10">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#899545]"><BookOpen className="w-4 h-4" /> {BRAND.name} journal</span>
          <h1 className="font-heading font-black text-3xl sm:text-4xl text-[#124233] mt-2">Eat well, measured</h1>
          <p className="text-sm text-gray-600 mt-2">Practical articles on protein, portions and building routines that last.</p>
        </div>
        <BlogList posts={posts.map((p) => ({
          id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt, cover: p.cover_image_url,
          author: p.author_name, publishedAt: p.published_at, minutes: p.read_minutes,
          category: p.blog_categories ? { slug: p.blog_categories.slug, name: p.blog_categories.name } : null,
        }))} />
      </div>
    </div>
  );
}
