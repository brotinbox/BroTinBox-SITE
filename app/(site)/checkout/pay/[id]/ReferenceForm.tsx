'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { submitReference, type RefState } from './actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="w-full py-3 rounded-xl bg-ink hover:bg-ink-soft disabled:opacity-60 text-white font-heading font-black text-sm">
      {pending ? 'Sending…' : 'I have paid: send reference'}
    </button>
  );
}

export function ReferenceForm({ orderId, existing }: { orderId: string; existing?: string }) {
  const [state, action] = useActionState<RefState, FormData>(submitReference, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="order_id" value={orderId} />
      <label className="block">
        <span className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-1">UPI reference / UTR number</span>
        <input
          name="reference"
          defaultValue={existing}
          required
          minLength={6}
          maxLength={30}
          pattern="[A-Za-z0-9 ]{6,40}"
          inputMode="text"
          placeholder="e.g. 428917365012"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-mono font-bold focus:bg-white focus:border-ink focus:outline-none"
        />
        <span className="block text-[11px] text-gray-500 mt-1">Find it in your UPI app under the payment details (12 digits for most apps).</span>
      </label>
      {state?.error && <p className="text-xs font-semibold text-rose-700">{state.error}</p>}
      {state?.ok && <p className="text-xs font-semibold text-emerald-700">Thanks! We&apos;ll confirm your payment shortly and schedule your meals.</p>}
      <Submit />
    </form>
  );
}
