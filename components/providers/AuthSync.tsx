'use client';

import { useEffect } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { toAddress, toUserProfile } from '@/lib/auth/mapProfile';
import { useAppStore } from '@/store/useAppStore';

/**
 * Keeps the app store in sync with the real Supabase session: loads the
 * signed-in customer's profile and addresses, and clears them on sign-out.
 */
export function AuthSync() {
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    let cancelled = false;

    async function load(userId: string | null) {
      const store = useAppStore.getState();
      if (!userId) {
        store.setAuthProfile(null);
        return;
      }
      const [{ data: profile }, { data: addresses }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('addresses').select('*').eq('user_id', userId).order('is_default', { ascending: false }),
      ]);
      if (cancelled) return;
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

    supabase.auth.getUser().then(({ data }) => load(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        load(session?.user?.id ?? null);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
