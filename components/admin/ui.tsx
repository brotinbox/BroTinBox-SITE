import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/* Shared building blocks for every admin page. Server-component safe. */

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="font-heading font-black text-2xl text-gray-900 tracking-tight">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className, padded = true }: {
  title?: string; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean;
}) {
  return (
    <section className={cn('bg-white rounded-2xl border border-gray-200 shadow-sm', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-gray-100">
          {title && <h2 className="font-heading font-bold text-sm text-gray-900">{title}</h2>}
          {actions}
        </div>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, tone = 'default' }: {
  label: string; value: ReactNode; hint?: string; tone?: 'default' | 'good' | 'warn' | 'bad';
}) {
  const tones = {
    default: 'text-gray-900',
    good: 'text-emerald-700',
    warn: 'text-amber-700',
    bad: 'text-rose-700',
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
      <p className={cn('font-heading font-black text-2xl mt-1', tones[tone])}>{value}</p>
      {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
    </div>
  );
}

const BADGE: Record<string, string> = {
  // orders
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending_payment: 'bg-amber-50 text-amber-800 border-amber-200',
  created: 'bg-amber-50 text-amber-800 border-amber-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
  refunded: 'bg-violet-50 text-violet-700 border-violet-200',
  partially_refunded: 'bg-violet-50 text-violet-700 border-violet-200',
  // subscriptions
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paused: 'bg-sky-50 text-sky-700 border-sky-200',
  completed: 'bg-gray-100 text-gray-700 border-gray-200',
  expired: 'bg-gray-100 text-gray-500 border-gray-200',
  // deliveries
  scheduled: 'bg-sky-50 text-sky-700 border-sky-200',
  skipped: 'bg-gray-100 text-gray-600 border-gray-200',
  locked: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  preparing: 'bg-amber-50 text-amber-800 border-amber-200',
  packed: 'bg-amber-50 text-amber-800 border-amber-200',
  out_for_delivery: 'bg-lime-50 text-lime-800 border-lime-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  // content / leads / roles
  published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  new: 'bg-sky-50 text-sky-700 border-sky-200',
  contacted: 'bg-amber-50 text-amber-800 border-amber-200',
  converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  lost: 'bg-gray-100 text-gray-600 border-gray-200',
  super_admin: 'bg-ink-soft text-white border-ink-soft',
  admin: 'bg-primary-light text-primary border-green-200',
};

export function StatusBadge({ value, label }: { value: string | null | undefined; label?: string }) {
  const v = value ?? 'unknown';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-bold whitespace-nowrap',
      BADGE[v] ?? 'bg-gray-50 text-gray-700 border-gray-200')}>
      {label ?? v.replace(/_/g, ' ')}
    </span>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-12 px-4">
      <p className="font-heading font-bold text-gray-900">{title}</p>
      {description && <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export type Column<T> = { header: string; cell: (row: T) => ReactNode; className?: string };

export function DataTable<T>({ columns, rows, rowKey, empty }: {
  columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; empty?: ReactNode;
}) {
  if (rows.length === 0) return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
            {columns.map((c) => (
              <th key={c.header} className={cn('px-4 py-2.5 font-bold whitespace-nowrap', c.className)}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={rowKey(r)} className="hover:bg-gray-50/60">
              {columns.map((c) => (
                <td key={c.header} className={cn('px-4 py-3 align-top', c.className)}>{c.cell(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, pageSize, total, hrefFor }: {
  page: number; pageSize: number; total: number; hrefFor: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-600">
      <span>Page {page} of {pages} · {total} total</span>
      <div className="flex gap-2">
        {page > 1 && <Link className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 font-bold" href={hrefFor(page - 1)}>Previous</Link>}
        {page < pages && <Link className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 font-bold" href={hrefFor(page + 1)}>Next</Link>}
      </div>
    </div>
  );
}

export function ButtonLink({ href, children, variant = 'primary' }: { href: string; children: ReactNode; variant?: 'primary' | 'secondary' }) {
  return (
    <Link
      href={href}
      className={cn('inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors',
        variant === 'primary' ? 'bg-primary text-white hover:bg-primary-hover' : 'bg-white border border-gray-200 text-gray-800 hover:bg-gray-50')}
    >
      {children}
    </Link>
  );
}

export const inr = (n: number | string | null | undefined) =>
  `₹${Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const fmtDate = (d: string | null | undefined, withTime = false) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric', month: 'short', year: 'numeric',
        ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
      })
    : '—';
