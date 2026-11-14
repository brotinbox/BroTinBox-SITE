'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { myTrialStatus } from '@/lib/checkout/actions';
import type { MyTrialStatus } from '@/lib/checkout/trial';
import { DailyTrialStepModal } from '@/components/trial/DailyTrialStepModal';
import { TrialStatusCard } from '@/components/trial/TrialStatusCard';
import { FocusHeader } from '@/components/layout/FocusHeader';

// Remembered per tab, so coming back to /tomorrow doesn't wait on the server again.
const cache = new Map<string, MyTrialStatus | null>();
/** Call after an order is placed: the customer's trial status has changed. */
export const forgetTrialStatus = () => cache.clear();

/**
 * /tomorrow: signed-in customers who already booked or used their one trial
 * see their trial status and the plans instead of the booking steps.
 *
 * Nothing is shown until we know which one it is (sign-in loaded, and for a
 * signed-in customer the trial check answered), so the booking steps never
 * flash up and then vanish. Signed-out visitors get the steps as soon as the
 * session check finishes; checkout checks again after sign-in.
 */
export function TrialGate() {
  const { isLoggedIn, authReady, user } = useAppStore();
  const key = isLoggedIn ? user?.id ?? '' : '';
  const [status, setStatus] = useState<MyTrialStatus | null | undefined>(() => (key && cache.has(key) ? cache.get(key) : undefined));
  const [rebook, setRebook] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (!isLoggedIn || !key) { setStatus(null); return; }
    if (cache.has(key)) { setStatus(cache.get(key)); return; }
    let cancelled = false;
    setStatus(undefined);
    myTrialStatus()
      .then((s) => { cache.set(key, s); if (!cancelled) setStatus(s); })
      .catch(() => { if (!cancelled) setStatus(null); }); // can't tell: let them book, checkout re-checks
    return () => { cancelled = true; };
  }, [authReady, isLoggedIn, key]);

  // Still checking: hold the space with a quiet placeholder.
  if (!authReady || status === undefined) {
    return (
      <><FocusHeader title="Trial box" /><div className="w-full max-w-2xl mx-auto px-4 py-6"><div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4" aria-busy="true" aria-label="Checking your trial">
        <div className="h-3 w-32 rounded-full bg-gray-100 animate-pulse" />
        <div className="h-6 w-56 rounded-full bg-gray-100 animate-pulse" />
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
          <div className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
      </div></div></>
    );
  }

  if (status && status.state !== 'available' && !(status.state === 'pending' && rebook)) {
    return (
      <>
        {/* Not the booking steps, so no FlowShell: give it the same back bar as other focus screens. */}
        <FocusHeader title="Your trial box" />
        <div className="w-full max-w-2xl mx-auto px-4 py-6">
          <TrialStatusCard status={status} onRebook={status.state === 'pending' ? () => setRebook(true) : undefined} />
        </div>
      </>
    );
  }
  return <DailyTrialStepModal />;
}
