'use client';

import { WeeklyPlanStepModal } from '@/components/weekly/WeeklyPlanStepModal';

/** Weekly plan: full-page 2-step flow (same look as checkout), then /checkout. */
export default function WeeklyPlanPage() {
  return (
    <main className="min-h-[calc(100vh-70px)] bg-paper">
      <WeeklyPlanStepModal />
    </main>
  );
}
