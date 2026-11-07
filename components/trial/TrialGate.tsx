'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { myTrialStatus } from '@/lib/checkout/actions';
import type { MyTrialStatus } from '@/lib/checkout/trial';
import { DailyTrialStepModal } from '@/components/trial/DailyTrialStepModal';
import { TrialStatusCard } from '@/components/trial/TrialStatusCard';

/**
 * /tomorrow: signed-in customers who already booked or used their one trial
 * see their trial status and the plans instead of the booking steps.
 * Visitors who aren't signed in get the booking steps straight away (no server
 * call); checkout checks again after sign-in.
 */
export function TrialGate() {
  const { isLoggedIn, authReady, user } = useAppStore();
  const [status, setStatus] = useState<MyTrialStatus | null>(null);
  const [rebook, setRebook] = useState(false);

  useEffect(() => {
    if (!authReady || !isLoggedIn) { setStatus(null); return; }
    let cancelled = false;
    myTrialStatus().then((s) => { if (!cancelled) setStatus(s); }).catch(() => {});
    return () => { cancelled = true; };
  }, [authReady, isLoggedIn, user?.id]);

  if (status && status.state !== 'available' && !(status.state === 'pending' && rebook)) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <TrialStatusCard status={status} onRebook={status.state === 'pending' ? () => setRebook(true) : undefined} />
      </div>
    );
  }
  return <DailyTrialStepModal />;
}
