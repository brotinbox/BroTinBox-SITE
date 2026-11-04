'use client';

import { useEffect } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { toAddress, toUserProfile } from '@/lib/auth/mapProfile';
import { useAppStore } from '@/store/useAppStore';

async function load(userId: string | null, isCancelled: () => boolean = () => false) {
  const supabase = getSupabaseBrowser();
  const store = useAppStore.getState();
  if (!userId) {
    store.setAuthProfile(null);
    return;
  }
  const [{ data: profile }, { data: addresses }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('addresses').select('*').eq('user_id', userId).order('is_default', { ascending: false }),
  ]);
  if (isCancelled()) return;
  if (!profile || profile.is_blocked) {
    store.setAuthProfile(null);
    return;
  }
  store.setAuthProfile(toUserProfile(profile));
  const mapped = (addresses ?? []).map(toAddress);
  useAppStore.setState({
    addresses: mapped,
    selectedAddressId: mapped.find((a) => a.isDefault)?.id ?? mapped[0]?.id ?? '',
  });
}

/**
 * Re-reads the session from cookies and loads the profile into the store.
 * Call after a server-side sign-in (WhatsApp OTP) so the page updates without
 * a reload. Returns true when a customer is signed in.
 */
export async function syncAuth(): Promise<boolean> {
  const { data } = await getSupabaseBrowser().auth.getUser();
  await load(data.user?.id ?? null);
  return useAppStore.getState().isLoggedIn;
}

/**
 * Keeps the app store in sync with the real Supabase session: loads the
 * signed-in customer's profile and addresses, and clears them on sign-out.
 */
export function AuthSync() {
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    let cancelled = false;
    const isCancelled = () => cancelled;

    supabase.auth.getUser().then(({ data }) => load(data.user?.id ?? null, isCancelled));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        load(session?.user?.id ?? null, isCancelled);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
