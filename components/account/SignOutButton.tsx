'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { signOutCustomer } from '@/lib/auth/customer';

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => { setBusy(true); await signOutCustomer(); router.push('/'); router.refresh(); }}
      disabled={busy}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-sm font-bold"
    >
      <LogOut className="w-4 h-4" /> {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
