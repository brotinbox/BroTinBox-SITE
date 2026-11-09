'use client';

import { TrialGate } from '@/components/trial/TrialGate';

/** Trial box: full-page 2-step flow (same look as checkout), then /checkout. */
export default function TomorrowMenuPage() {
  return (
    <main className="min-h-[calc(100vh-70px)] bg-paper">
      <TrialGate />
    </main>
  );
}
