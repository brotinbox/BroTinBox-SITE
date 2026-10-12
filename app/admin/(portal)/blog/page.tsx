import Link from 'next/link';
import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { adminHref } from '@/lib/admin/paths';
import { ButtonLink, Card, DataTable, EmptyState, PageHeader, StatusBadge, fmtDate } from '@/components/admin/ui';

export const metadata = { title: 'Blog' };

export default async function BlogAdminPage() {
  const staff = await requireStaff('blog.read');
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from('blog_posts')
    .select('id, title, slug, status, published_at, views, is_featured, updated_at, blog_categories(name)')
    .order('updated_at', { ascending: false });

  return (
    <>
      <PageHeader
        title="Blog"
        description="Write and publish articles. Published posts appear at /blog immediately."
        actions={
          <>
            <ButtonLink href={adminHref('/blog-categories')} variant="secondary">Categories</ButtonLink>
            {staff.can('blog.write') && <ButtonLink href={adminHref('/blog/new')}>+ New post</ButtonLink>}
          </>
        }
      />
      <Card padded={false}>
        <DataTable
          rows={(data ?? []) as any[]}
          rowKey={(r) => r.id}
          empty={<EmptyState title="No posts yet" description="Write your first article." />}
          columns={[
            { header: 'Title', cell: (r) => <Link href={adminHref(`/blog/${r.id}`)} className="block"><p className="font-bold text-primary">{r.title}</p><p className="text-xs text-gray-500">/blog/{r.slug}</p></Link> },
            { header: 'Category', cell: (r) => r.blog_categories?.name ?? <span className="text-gray-400">—</span> },
            { header: 'Status', cell: (r) => <div className="flex gap-1"><StatusBadge value={r.status} />{r.is_featured && <StatusBadge value="approved" label="featured" />}</div> },
            { header: 'Publish', cell: (r) => <span className="text-xs">{fmtDate(r.published_at, true)}</span> },
            { header: 'Views', cell: (r) => r.views, className: 'text-right' },
            { header: 'Updated', cell: (r) => <span className="text-xs text-gray-500">{fmtDate(r.updated_at, true)}</span> },
          ]}
        />
      </Card>
    </>
  );
}
