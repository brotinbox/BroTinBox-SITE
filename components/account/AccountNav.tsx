import Link from 'next/link';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/dashboard', label: 'Home' },
  { href: '/my-plan', label: 'My meals' },
  { href: '/subscription', label: 'My plan' },
  { href: '/orders', label: 'Orders' },
  { href: '/progress', label: 'Progress' },
  { href: '/profile', label: 'Profile' },
];

export function AccountNav({ current }: { current: string }) {
  return (
    <nav className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 mb-5" aria-label="Account">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href}
          className={cn('shrink-0 px-3.5 py-2 rounded-full text-xs font-bold border',
            current === t.href ? 'bg-ink text-white border-ink' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50')}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function AccountShell({ current, title, subtitle, children }: { current: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper pb-28">
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <h1 className="font-heading font-black text-2xl text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        <div className="mt-4"><AccountNav current={current} /></div>
        {children}
      </div>
    </div>
  );
}
