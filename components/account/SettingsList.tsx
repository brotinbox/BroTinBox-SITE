import Link from 'next/link';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FocusHeader } from '@/components/layout/FocusHeader';

/**
 * Instagram-style settings: the profile page is a list of rows, each opening
 * its own screen to edit. Rows show the current value so most people never
 * need to open them.
 */

export function SettingsGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section>
      {title && <h2 className="px-1 mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">{title}</h2>}
      <div className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">{children}</div>
    </section>
  );
}

export function SettingsRow({ href, icon: Icon, label, value, badge, external, tone }: {
  href: string; icon: LucideIcon; label: string; value?: string | null; badge?: string; external?: boolean; tone?: 'danger';
}) {
  const body = (
    <>
      <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', tone === 'danger' ? 'bg-rose-50 text-rose-700' : 'bg-sand text-ink')}>
        <Icon className="w-4 h-4" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">{label}</span>
          {badge && <span className="text-[10px] font-extrabold uppercase tracking-wide text-amber-800 bg-amber-100 rounded-full px-2 py-0.5">{badge}</span>}
        </span>
        {value && <span className="block text-xs text-gray-500 truncate mt-0.5">{value}</span>}
      </span>
      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
    </>
  );
  const cls = 'flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors';
  return external
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{body}</a>
    : <Link href={href} className={cls}>{body}</Link>;
}

/** One settings screen: back arrow to the list, title, then the form. */
export function SettingsScreen({ title, description, back = '/profile', children }: {
  title: string; description?: string; back?: string; children: React.ReactNode;
}) {
  return (
    // Focus screen (lib/layout/chrome.ts): no navbar, dock or footer, so no dock padding either.
    <div className="min-h-screen bg-paper pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <FocusHeader title={title} back={back} backLabel="Back to profile" />
      <div className="max-w-xl mx-auto px-4 pt-4">
        {description && <p className="text-sm text-gray-600 mb-1">{description}</p>}
        <div className="mt-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}

export const fieldInput = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm focus:border-ink focus:outline-none';
export const fieldLabel = 'block text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-1';
