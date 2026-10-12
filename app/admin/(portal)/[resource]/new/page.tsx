import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth/session';
import { adminHref } from '@/lib/admin/paths';
import { getResource } from '@/lib/admin/resources';
import { ButtonLink, Card, PageHeader } from '@/components/admin/ui';
import { ResourceForm } from '@/components/admin/ResourceForm';

export const metadata = { title: 'New' };

export default async function ResourceNewPage({ params }: { params: Promise<{ resource: string }> }) {
  const res = getResource((await params).resource);
  if (!res || !res.creatable) notFound();
  await requireStaff(res.writePermission);
  return (
    <>
      <PageHeader title={`New ${res.singular}`} actions={<ButtonLink href={adminHref(`/${res.key}`)} variant="secondary">← {res.label}</ButtonLink>} />
      <Card><ResourceForm res={res} row={null} canWrite canDelete={false} /></Card>
    </>
  );
}
