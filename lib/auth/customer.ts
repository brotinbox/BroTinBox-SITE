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

export async function signInWithGoogleIdToken(token: string) {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token,
  });
  if (error) throw error;

  if (data?.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_onboarded, is_blocked')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profile?.is_blocked) {
      await supabase.auth.signOut();
      useAppStore.getState().logout();
      throw new Error('This account has been suspended.');
    }

    return { ...data, profile };
  }

  return data;
}

export async function signOutCustomer() {
  await getSupabaseBrowser().auth.signOut();
  useAppStore.getState().logout();
}

