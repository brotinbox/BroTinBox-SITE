import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { adminHref } from '@/lib/admin/paths';
import { renderMarkdown } from '@/lib/content/markdown';
import { ButtonLink, Card, PageHeader, StatusBadge } from '@/components/admin/ui';
import { BlogForm } from '../BlogForm';

export const metadata = { title: 'Edit post' };

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff('blog.read');
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const supabase = await getSupabaseServer();
  const [{ data: post }, { data: categories }] = await Promise.all([
    supabase.from('blog_posts').select('*').eq('id', id).maybeSingle(),
    supabase.from('blog_categories').select('id, name').order('sort_order'),
  ]);
  if (!post) notFound();

  return (
    <>
      <PageHeader
        title={post.title}
        description={`${post.views} views`}
        actions={
          <>
            <StatusBadge value={post.status} />
            {post.status === 'published' && <Link href={`/blog/${post.slug}`} target="_blank" className="text-xs font-bold text-primary self-center">View live ↗</Link>}
            <ButtonLink href={adminHref('/blog')} variant="secondary">← All posts</ButtonLink>
          </>
        }
      />
      <Card><BlogForm post={post} categories={categories ?? []} canWrite={staff.can('blog.write')} /></Card>
      <Card title="Preview" className="mt-4">
        <article className="prose-blog max-w-3xl" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />
      </Card>
    </>
  );
}
