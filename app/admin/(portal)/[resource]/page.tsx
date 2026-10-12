import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { adminHref } from '@/lib/admin/paths';
import { getResource, type FieldDef } from '@/lib/admin/resources';
import { ButtonLink, Card, DataTable, EmptyState, PageHeader, Pagination, StatusBadge, fmtDate, inr } from '@/components/admin/ui';
import { FilterBar, likePattern } from '@/components/admin/FilterBar';

const PAGE = 30;

function Cell({ f, v }: { f: FieldDef | undefined; v: any }) {
  if (v === null || v === undefined || v === '') return <span className="text-gray-400">—</span>;
  if (!f) return <>{String(v)}</>;
  if (f.type === 'boolean') return f.name === 'is_active' ? <StatusBadge value={v ? 'active' : 'draft'} label={v ? 'active' : 'off'} /> : <>{v ? 'Yes' : 'No'}</>;
  if (f.type === 'image') return <Image src={v} alt="" width={36} height={36} className="w-9 h-9 rounded-lg object-cover" unoptimized={String(v).startsWith('/')} />;
  if (f.type === 'datetime') return <span className="text-xs whitespace-nowrap">{fmtDate(v, true)}</span>;
  if (f.type === 'tags' || f.type === 'lines') return <span className="text-xs">{(v as string[]).join(', ')}</span>;
  if (f.type === 'select' && f.name === 'status') return <StatusBadge value={v} />;
  if (f.type === 'number' && /price|fee|value|order|discount/.test(f.name) && f.name !== 'sort_order') return <>{inr(v)}</>;
  if (f.type === 'textarea') return <span className="text-xs line-clamp-2 max-w-md block">{v}</span>;
  return <>{String(v)}</>;
}

export async function generateMetadata({ params }: { params: Promise<{ resource: string }> }) {
  return { title: getResource((await params).resource)?.label ?? 'Not found' };
}

export default async function ResourceListPage({ params, searchParams }: {
  params: Promise<{ resource: string }>;
  searchParams: Promise<{ q?: string; page?: string; f?: string }>;
}) {
  const res = getResource((await params).resource);
  if (!res) notFound();
  const staff = await requireStaff(res.readPermission);
  const sp = await searchParams;
  const q = (sp.q ?? '').trim().slice(0, 100);
  const page = Math.max(1, Number(sp.page) || 1);
  const filterVal = res.filter?.options.some((o) => o.value === sp.f) ? sp.f : '';

  const supabase = await getSupabaseServer();
  let query = (supabase.from(res.table) as any)
    .select('*', { count: 'exact' })
    .order(res.order.column, { ascending: res.order.ascending, nullsFirst: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (q && res.search?.length) query = query.or(res.search.map((c) => `${c}.ilike.${likePattern(q)}`).join(','));
  if (filterVal && res.filter) query = query.eq(res.filter.column, filterVal);
  const { data, count } = await query;

  const fieldMap = new Map(res.fields.map((f) => [f.name, f]));
  const base = adminHref(`/${res.key}`);

  return (
    <>
      <PageHeader
        title={res.label}
        description={res.description}
        actions={
          <>
            {res.links?.map((l) => <ButtonLink key={l.href} href={adminHref(l.href)} variant="secondary">{l.label}</ButtonLink>)}
            {res.creatable && staff.can(res.writePermission) && <ButtonLink href={`${base}/new`}>+ New {res.singular}</ButtonLink>}
          </>
        }
      />
      {(res.search || res.filter) && (
        <FilterBar
          action={base}
          q={q}
          param="f"
          current={filterVal}
          searchPlaceholder={res.search ? `Search ${res.label.toLowerCase()}` : undefined}
          tabs={res.filter ? [{ value: '', label: 'All' }, ...res.filter.options] : undefined}
        />
      )}
      <Card padded={false}>
        <DataTable
          rows={(data ?? []) as Record<string, any>[]}
          rowKey={(r) => r.id}
          empty={<EmptyState title={`No ${res.label.toLowerCase()} yet`} />}
          columns={[
            ...res.listColumns.map((c, i) => ({
              header: c === 'created_at' ? 'Received' : fieldMap.get(c)?.label ?? c,
              cell: (r: Record<string, any>) => i === 0 || (i === 1 && fieldMap.get(res.listColumns[0])?.type === 'image')
                ? <Link href={`${base}/${r.id}`} className="font-bold text-primary">{c === 'created_at' ? fmtDate(r[c], true) : <Cell f={fieldMap.get(c)} v={r[c]} />}</Link>
                : c === 'created_at' ? <span className="text-xs">{fmtDate(r[c], true)}</span> : <Cell f={fieldMap.get(c)} v={r[c]} />,
            })),
          ]}
        />
        <Pagination page={page} pageSize={PAGE} total={count ?? 0}
          hrefFor={(p) => `${base}?${new URLSearchParams({ ...(q ? { q } : {}), ...(filterVal ? { f: filterVal } : {}), page: String(p) })}`} />
      </Card>
    </>
  );
}
