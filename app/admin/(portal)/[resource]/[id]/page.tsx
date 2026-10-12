import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { adminHref } from '@/lib/admin/paths';
import { getResource } from '@/lib/admin/resources';
import { ButtonLink, Card, PageHeader, fmtDate } from '@/components/admin/ui';
import { ResourceForm } from '@/components/admin/ResourceForm';

export const metadata = { title: 'Edit' };

export default async function ResourceEditPage({ params }: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await params;
  const res = getResource(resource);
  if (!res || !z.string().uuid().safeParse(id).success) notFound();
  const staff = await requireStaff(res.readPermission);

  const supabase = await getSupabaseServer();
  const { data: row } = await (supabase.from(res.table) as any).select('*').eq('id', id).maybeSingle();
  if (!row) notFound();

  return (
    <>
      <PageHeader
        title={res.title(row)}
        description={row.created_at ? `Created ${fmtDate(row.created_at, true)}${row.updated_at ? ` · updated ${fmtDate(row.updated_at, true)}` : ''}` : undefined}
        actions={<ButtonLink href={adminHref(`/${res.key}`)} variant="secondary">← {res.label}</ButtonLink>}
      />
      <Card>
        <ResourceForm
          res={res}
          row={row}
          canWrite={staff.can(res.writePermission)}
          canDelete={!!res.deletePermission && staff.can(res.deletePermission)}
        />
      </Card>
    </>
  );
}
