'use client';

import { getSupabaseBrowser } from '@/lib/supabase/client';
import { useAppStore } from '@/store/useAppStore';

/** Only same-site relative paths are allowed as post-login destinations. */
export function safeNext(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}

export async function signInWithGoogle(next?: string) {
  const supabase = getSupabaseBrowser();
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext(next))}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, queryParams: { prompt: 'select_account' } },
  });
  if (error) throw error;
}

export async function signOutCustomer() {
  await getSupabaseBrowser().auth.signOut();
  useAppStore.getState().logout();
}
