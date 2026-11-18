'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock } from 'lucide-react';
import { load } from '@cashfreepayments/cashfree-js';
import { startTestPayment } from './actions';

/** Creates a ₹1 Cashfree order and opens Cashfree's payment page in this tab. */
export function TestPayButton({ defaultPhone, live }: { defaultPhone: string; live: boolean }) {
  const [phone, setPhone] = useState(defaultPhone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const r = await startTestPayment(phone);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      const cashfree = await load({ mode: r.mode });
      if (!cashfree) throw new Error('sdk');
      const result = await cashfree.checkout({ paymentSessionId: r.sessionId, redirectTarget: '_self' });
      if (result?.error) setError(result.error.message || 'Could not open the Cashfree page.');
    } catch {
      setError('Could not open the Cashfree page. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="font-semibold">Your mobile (Cashfree needs one)</span>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="numeric"
          placeholder="10-digit mobile"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </label>
      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-ink hover:bg-ink-soft disabled:opacity-60 text-white font-heading font-black text-sm"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
        {busy ? 'Opening Cashfree…' : `Pay ₹1 test (${live ? 'LIVE: real ₹1' : 'TEST mode'})`}
      </button>
      {error && <p className="text-xs font-semibold text-rose-700">{error}</p>}
    </div>
  );
}

/** Re-renders the check page every 4 s (max ~80 s) while results are still arriving. */
export function AutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    let n = 0;
    const t = setInterval(() => {
      if (++n > 20) return clearInterval(t);
      router.refresh();
    }, 4000);
    return () => clearInterval(t);
  }, [active, router]);
  return active ? <p className="text-xs text-gray-500">Checking again every few seconds…</p> : null;
}
