import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { adminHref } from '@/lib/admin/paths';
import { ButtonLink, Card, PageHeader } from '@/components/admin/ui';
import { BlogForm } from '../BlogForm';

export const metadata = { title: 'New post' };

export default async function NewBlogPostPage() {
  await requireStaff('blog.write');
  const supabase = await getSupabaseServer();
  const { data: categories } = await supabase.from('blog_categories').select('id, name').order('sort_order');
  return (
    <>
      <PageHeader title="New post" actions={<ButtonLink href={adminHref('/blog')} variant="secondary">← All posts</ButtonLink>} />
      <Card><BlogForm post={null} categories={categories ?? []} canWrite /></Card>
    </>
  );
}
