import 'server-only';
import { unstable_cache } from 'next/cache';
import { getSupabasePublic } from '@/lib/supabase/server';

/** Published posts only (RLS also enforces this for the anon key). Cached; admin edits revalidate the 'blog' tag. */
export const getPublishedPosts = unstable_cache(
  async () => {
    const { data } = await getSupabasePublic()
      .from('blog_posts')
      .select('id, slug, title, excerpt, cover_image_url, author_name, author_role, read_minutes, macros_highlight, published_at, is_featured, tags, blog_categories(name, slug)')
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .order('is_featured', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(100);
    return data ?? [];
  },
  ['blog-list'],
  { tags: ['blog'], revalidate: 300 }
);

export const getPostBySlug = (slug: string) =>
  unstable_cache(
    async () => {
      const { data } = await getSupabasePublic()
        .from('blog_posts')
        .select('id, slug, title, excerpt, content, cover_image_url, author_name, author_role, read_minutes, macros_highlight, published_at, updated_at, seo_title, seo_description, og_image_url, tags, blog_categories(name, slug)')
        .eq('slug', slug)
        .eq('status', 'published')
        .lte('published_at', new Date().toISOString())
        .maybeSingle();
      return data;
    },
    ['blog-post', slug],
    { tags: ['blog'], revalidate: 300 }
  )();
