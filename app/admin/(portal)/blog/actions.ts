'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import { cleanText } from '@/lib/security/request';
import { fail, ok, staffAction, type ActionResult } from '@/lib/admin/actions';
import { uploadImage } from '@/lib/admin/upload';
import { readingMinutes } from '@/lib/content/markdown';
import { adminHref } from '@/lib/admin/paths';
import type { Database } from '@/types/database';

type BlogRow = Database['public']['Tables']['blog_posts']['Insert'];

const schema = z.object({
  id: z.string().uuid().optional().or(z.literal('')),
  title: z.string().trim().min(3).max(200),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug: lowercase letters, numbers and dashes').max(120),
  excerpt: z.string().max(400).optional(),
  content: z.string().max(60000),
  category_id: z.string().uuid().or(z.literal('')).optional(),
  tags: z.string().max(400).optional(),
  author_name: z.string().max(80).optional(),
  author_role: z.string().max(120).optional(),
  macros_highlight: z.string().max(120).optional(),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']),
  published_at: z.string().optional(),
  seo_title: z.string().max(70).optional(),
  seo_description: z.string().max(170).optional(),
});

export async function saveBlogPost(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the form.');
  const v = parsed.data;

  let publishedAt: string | null = null;
  if (v.published_at && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v.published_at)) {
    publishedAt = new Date(`${v.published_at}:00+05:30`).toISOString();
  }
  if (v.status === 'published' && !publishedAt) publishedAt = new Date().toISOString();
  if (v.status === 'scheduled' && (!publishedAt || new Date(publishedAt) <= new Date())) {
    return fail('Scheduled posts need a future publish time.');
  }

  let createdId: string | null = null;
  const result = await staffAction('blog.write', async (staff) => {
    const supabase = await getSupabaseServer();
    const row: Omit<BlogRow, 'slug' | 'title'> & { slug: string; title: string } = {
      title: cleanText(v.title, 200),
      slug: v.slug,
      excerpt: cleanText(v.excerpt, 400) || null,
      content: v.content.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''),
      category_id: v.category_id || null,
      tags: (v.tags ?? '').split(',').map((t) => cleanText(t, 40)).filter(Boolean).slice(0, 12),
      author_name: cleanText(v.author_name, 80) || staff.profile.full_name,
      author_role: cleanText(v.author_role, 120) || null,
      macros_highlight: cleanText(v.macros_highlight, 120) || null,
      status: v.status,
      published_at: publishedAt,
      seo_title: cleanText(v.seo_title, 70) || null,
      seo_description: cleanText(v.seo_description, 170) || null,
      is_featured: fd.get('is_featured') === 'on',
      read_minutes: readingMinutes(v.content),
    };
    const cover = fd.get('cover');
    if (cover instanceof File && cover.size > 0) {
      row.cover_image_url = await uploadImage(supabase, 'blog-images', cover, 'covers');
    }
    if (v.id) {
      const { error } = await supabase.from('blog_posts').update(row).eq('id', v.id);
      if (error) throw error;
      return ok(v.status === 'published' ? 'Saved and live on the blog.' : 'Saved.');
    }
    const { data, error } = await supabase.from('blog_posts').insert({ ...row, author_id: staff.profile.id }).select('id').single();
    if (error) throw error;
    createdId = data.id;
    return ok('Post created.');
  }, { tags: ['blog'] });

  if (createdId) redirect(adminHref(`/blog/${createdId}`));
  return result;
}

export async function deleteBlogPost(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = z.string().uuid().safeParse(fd.get('id'));
  if (!id.success) return fail('Invalid post.');
  let done = false;
  const result = await staffAction('blog.write', async () => {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.from('blog_posts').delete().eq('id', id.data);
    if (error) throw error;
    done = true;
    return ok('Deleted.');
  }, { tags: ['blog'] });
  if (done) redirect(adminHref('/blog'));
  return result;
}
