import Link from 'next/link';
import { adminHref } from '@/lib/admin/paths';
import { cn } from '@/lib/utils';
import { Card, EmptyState } from '@/components/admin/ui';

const TABS = [
  ['/stock', 'Buy list'],
  ['/stock/levels', 'Stock & count'],
  ['/stock/bills', 'Bills'],
  ['/stock/ingredients', 'Items & recipe links'],
] as const;

/** Tabs across the kitchen stock pages. */
export function StockNav({ active }: { active: (typeof TABS)[number][0] }) {
  return (
    <nav className="flex gap-1.5 flex-wrap mb-4 print:hidden" aria-label="Kitchen stock">
      {TABS.map(([href, label]) => (
        <Link key={href} href={adminHref(href)} aria-current={href === active ? 'page' : undefined}
          className={cn('px-3.5 py-2 rounded-xl text-xs font-bold border', href === active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50')}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Shown when migration 0053 hasn't been run yet. */
export function StockNotReady() {
  return (
    <Card>
      <EmptyState title="Kitchen stock isn’t set up yet" description="Run migration 20261118000053_stock.sql in Supabase, add “stock” to Settings › API › Exposed schemas, then reload this page." />
    </Card>
  );
}

/** True for "table/function doesn't exist" errors (migration not run). */
export function isMissingTable(e: unknown): boolean {
  const code = (e as { code?: string } | null)?.code;
  return ['42P01', '3F000', '42703', 'PGRST106', 'PGRST202', 'PGRST205'].includes(code ?? '');
}
