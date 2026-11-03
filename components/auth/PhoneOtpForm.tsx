'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';

export function PhoneOtpForm({ next }: { next?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function post(url: string, body: object) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { res, data } = await post('/api/auth/otp/send', { phone });
      if (!res.ok) {
        if (data.retryAfter) setCooldown(data.retryAfter);
        setError(data.error || 'Could not send the code.');
        if (data.retryAfter) setStep('code');
        return;
      }
      setStep('code');
      setCode('');
      setCooldown(30);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { res, data } = await post('/api/auth/otp/verify', { phone, code, next });
      if (!res.ok) {
        setError(data.error || 'Incorrect code.');
        setBusy(false);
        return;
      }
      router.replace(data.redirect || '/dashboard');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
      setBusy(false);
    }
  }

  const input = 'w-full border border-gray-300 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:border-gray-900';
  const button = 'w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-black disabled:opacity-60 text-white font-bold text-sm py-3.5 px-4 rounded-2xl transition-all tap-active';

  return (
    <div className="space-y-3">
      {step === 'phone' ? (
        <form onSubmit={sendCode} className="space-y-3">
          <div className="flex gap-2">
            <span className="flex items-center px-4 border border-gray-300 rounded-2xl text-sm font-bold text-gray-600">+91</span>
            <input
              type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="Mobile number"
              value={phone} onChange={(e) => setPhone(e.target.value)} className={input} required
            />
          </div>
          <button type="submit" disabled={busy} className={button}>
            <MessageCircle className="w-4 h-4" />
            {busy ? 'Sending…' : 'Get code on WhatsApp'}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <p className="text-xs text-gray-600 text-center">
            We sent a 6-digit code to <b>+91 {phone.replace(/\D/g, '').slice(-10)}</b> on WhatsApp.
          </p>
          <input
            type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••"
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className={`${input} text-center tracking-[0.5em] text-lg`} required autoFocus
          />
          <button type="submit" disabled={busy || code.length !== 6} className={button}>
            {busy ? 'Verifying…' : 'Verify & sign in'}
          </button>
          <div className="flex justify-between text-[11px] font-semibold text-gray-500">
            <button type="button" onClick={() => { setStep('phone'); setError(''); }} className="underline">Change number</button>
            <button type="button" disabled={cooldown > 0 || busy} onClick={() => sendCode()} className="underline disabled:no-underline disabled:opacity-60">
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}
      {error && <p className="text-xs text-rose-600 font-semibold text-center">{error}</p>}
    </div>
  );
}
