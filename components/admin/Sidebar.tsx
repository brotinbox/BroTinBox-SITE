'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Bike, CalendarDays, CalendarRange, ChefHat, ClipboardList, CupSoda, HelpCircle, History, Inbox, LayoutDashboard,
  LogOut, MapPin, Menu, Newspaper, Receipt, Settings, ShieldCheck, Star, Tags, Ticket, Users, Utensils, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminNavGroup } from '@/lib/admin/nav';

const ICONS = {
  Bike, CalendarDays, CalendarRange, ChefHat, ClipboardList, CupSoda, HelpCircle, History, Inbox, LayoutDashboard,
  MapPin, Newspaper, Receipt, Settings, ShieldCheck, Star, Tags, Ticket, Users, Utensils,
} as const;

export function AdminSidebar({ base, groups, userName, roleLabel, logoutAction }: {
  base: string;
  groups: AdminNavGroup[];
  userName: string;
  roleLabel: string;
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rel = pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname;

  const isActive = (href: string) =>
    href === '/' ? rel === '/' : rel === href || (rel.startsWith(`${href}/`) && !groups.some((g) =>
      g.items.some((i) => i.href !== href && i.href.startsWith(`${href}/`) && rel.startsWith(i.href))));

  const nav = (
    <nav className="space-y-5">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40">{g.label}</p>
          <div className="space-y-0.5">
            {g.items.map((item) => {
              const Icon = ICONS[item.icon as keyof typeof ICONS] ?? LayoutDashboard;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={`${base}${item.href === '/' ? '' : item.href}`}
                  onClick={() => setOpen(false)}
                  className={cn('flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-colors',
                    active ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/5')}
                >
                  <Icon className={cn('w-4 h-4', active ? 'text-lime-brand' : 'text-white/50')} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="pt-4 border-t border-white/10">
      <div className="px-3 mb-3">
        <p className="text-sm font-bold text-white truncate">{userName}</p>
        <p className="text-[11px] text-lime-brand/80 font-semibold">{roleLabel}</p>
      </div>
      <form action={logoutAction}>
        <button type="submit" className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-semibold text-white/70 hover:text-white hover:bg-white/5">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-ink-soft text-white">
        <span className="font-heading font-black">BroTin Box · Console</span>
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="p-2 -mr-2"><Menu className="w-5 h-5" /></button>
      </div>
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-ink-soft p-4 overflow-y-auto flex flex-col justify-between">
            <div>
              <div className="flex justify-end mb-2">
                <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-2 text-white"><X className="w-5 h-5" /></button>
              </div>
              {nav}
            </div>
            {footer}
          </aside>
        </div>
      )}
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-ink-soft p-4 flex-col justify-between overflow-y-auto">
        <div>
          <div className="px-3 mb-6">
            <p className="font-heading font-black text-white text-lg leading-tight">BroTin Box</p>
            <p className="text-[11px] text-white/50 font-semibold uppercase tracking-wider">Staff console</p>
          </div>
          {nav}
        </div>
        {footer}
      </aside>
    </>
  );
}
