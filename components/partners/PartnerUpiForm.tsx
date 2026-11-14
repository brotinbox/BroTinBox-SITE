'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { savePartnerUpi } from '@/lib/partners/actions';
import { cn } from '@/lib/utils';

const field = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-ink focus:outline-none';

function Save() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="h-10 px-4 rounded-xl bg-ink text-white text-xs font-bold disabled:opacity-60">
      {pending ? 'Saving…' : 'Save UPI'}
    </button>
  );
}

/** Where payouts go. Shown as a summary once saved, with an Edit button. */
export function PartnerUpiForm({ upiId, upiName }: { upiId: string | null; upiName: string | null }) {
  const [editing, setEditing] = useState(!upiId);
  const [state, action] = useActionState(async (prev: Awaited<ReturnType<typeof savePartnerUpi>> | null, fd: FormData) => {
    const r = await savePartnerUpi(prev, fd);
    if (r.ok) setEditing(false);
    return r;
  }, null);

  if (!editing && upiId) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Paid to</p>
          <p className="text-sm font-semibold text-ink truncate">{upiId}{upiName ? ` · ${upiName}` : ''}</p>
          {state?.ok && <p className="text-[11px] text-emerald-700 font-semibold">{state.message}</p>}
        </div>
        <button type="button" onClick={() => setEditing(true)} className="text-xs font-bold text-accent underline underline-offset-2 shrink-0">Edit</button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-2">
      {!upiId && <p className="text-sm font-semibold text-ink">Add your UPI ID so we can pay you</p>}
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input name="upiId" required defaultValue={upiId ?? ''} placeholder="UPI ID, e.g. name@okicici" autoCapitalize="none" className={field} />
        <input name="upiName" required defaultValue={upiName ?? ''} placeholder="Name on the account" className={field} />
        <Save />
      </div>
      {state?.message && !state.ok && <p className={cn('text-xs font-semibold text-rose-700')}>{state.message}</p>}
    </form>
  );
}
