'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock } from 'lucide-react';
import { load } from '@cashfreepayments/cashfree-js';
import { startCashfreePayment } from './actions';

const MODE = process.env.NEXT_PUBLIC_CASHFREE_ENV === 'production' ? 'production' : 'sandbox';

export function CashfreeButton({ orderId, amountLabel }: { orderId: string; amountLabel: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const r = await startCashfreePayment(orderId);
      if (!r.ok) {
        setError(r.error);
        if (r.paid) router.refresh();
        return;
      }
      const cashfree = await load({ mode: MODE });
      if (!cashfree) throw new Error('sdk');
      // Opens Cashfree's page in this tab; it returns to /checkout/pay/[id]?cf=1.
      const result = await cashfree.checkout({ paymentSessionId: r.sessionId, redirectTarget: '_self' });
      if (result?.error) setError(result.error.message || 'Could not open the payment page. Please try again.');
    } catch {
      setError('Could not open the payment page. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#124233] hover:bg-[#0E3529] disabled:opacity-60 text-white font-heading font-black text-sm"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
        {busy ? 'Opening secure payment…' : `Pay ${amountLabel}`}
      </button>
      {error && <p className="text-xs font-semibold text-rose-700 text-center">{error}</p>}
    </div>
  );
}
