'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';

function initials(name: string, email?: string) {
  const src = name.trim() || email?.split('@')[0] || '';
  const parts = src.split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'U';
}

/**
 * The signed-in customer's photo (from Google), or their initials when there
 * is no photo or it fails to load. Never shows a placeholder person.
 */
export function UserAvatar({ size = 36, className }: { size?: number; className?: string }) {
  const user = useAppStore((s) => s.user);
  const [broken, setBroken] = useState(false);
  const showPhoto = !!user.avatarUrl && !broken;

  return (
    <span
      className={cn('relative inline-flex items-center justify-center rounded-full overflow-hidden bg-[#124233] text-white font-heading font-black select-none shrink-0', className)}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) }}
      aria-hidden="true"
    >
      {showPhoto ? (
        // Plain <img>: Google photo URLs are per-user and tiny; no-referrer avoids 403s from Google's CDN.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt=""
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        initials(user.fullName, user.email)
      )}
    </span>
  );
}
