import { requireStaff } from '@/lib/auth/session';
import { adminHref } from '@/lib/admin/paths';
import { PageHeader } from '@/components/admin/ui';
import { GuideSearch } from '@/components/admin/GuideSearch';
import { GUIDE_TOPICS } from '@/lib/admin/guide';

export const metadata = { title: 'Guide' };

/**
 * Staff handbook: how the website and this console fit together, page by
 * page, with a search box. Content lives in lib/admin/guide.ts; add a topic
 * there whenever a page or routine changes.
 */
export default async function GuidePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff();
  const q = ((await searchParams).q ?? '').slice(0, 80);

  return (
    <>
      <PageHeader
        title="Guide"
        description="How to use the console: daily routines, every page, what statuses mean and where to change things. Search with any words, or press / to jump to the search box."
      />
      <GuideSearch topics={GUIDE_TOPICS} base={adminHref('')} initialQuery={q} />
    </>
  );
}
