'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Loader2 } from 'lucide-react';
import { OtpCodeInput } from '@/components/auth/OtpCodeInput';
import { syncAuth } from '@/components/providers/AuthSync';

const digits10 = (v: string) => v.replace(/\D/g, '').replace(/^(?:91|0)(?=[6-9]\d{9}$)/, '').slice(0, 10);
const pretty = (v: string) => `+91 ${v.slice(0, 5)} ${v.slice(5)}`;

/**
 * Mobile number that can only be saved after a WhatsApp code. Once verified,
 * WhatsApp sign-in with this number opens this same account.
 */
export function PhoneVerifyField({ phone: initial, verified: initialVerified, onVerified }: {
  phone?: string | null;
  verified: boolean;
  onVerified?: (phone: string) => void;
}) {
  const router = useRouter();
  const start = digits10(initial ?? '');
  const [verifiedPhone, setVerifiedPhone] = useState(initialVerified ? start : '');
  const [stage, setStage] = useState<'view' | 'edit' | 'code'>(initialVerified && start ? 'view' : 'edit');
  const [phone, setPhone] = useState(start);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function post(url: string, body: object) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { res, data: await res.json().catch(() => ({})) };
  }

  async function send() {
    setError('');
    if (!/^[6-9]\d{9}$/.test(phone)) return setError('Enter a valid 10-digit mobile number.');
    if (phone === verifiedPhone) return setStage('view');
    setBusy(true);
    try {
      const { res, data } = await post('/api/account/phone/send', { phone });
      if (!res.ok) {
        setError(data.error || 'Could not send the code.');
        if (data.retryAfter) { setCooldown(data.retryAfter); setStage('code'); }
        return;
      }
      setCode('');
      setCooldown(30);
      setStage('code');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function verify(value = code) {
    if (busy || value.length !== 6) return;
    setError('');
    setBusy(true);
    try {
      const { res, data } = await post('/api/account/phone/verify', { phone, code: value });
      if (!res.ok) {
        setError(data.error || 'That code is incorrect or expired.');
        if (res.status !== 409) { setCode(''); codeRef.current?.focus(); }
        return;
      }
      setVerifiedPhone(phone);
      setStage('view');
      await syncAuth();
      onVerified?.(phone);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:bg-white focus:border-ink focus:outline-none';
  const btn = 'shrink-0 rounded-xl bg-ink px-4 text-sm font-bold text-white disabled:opacity-40 inline-flex items-center gap-1.5';

  if (stage === 'view') {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2.5">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <BadgeCheck className="w-4 h-4 text-emerald-600" /> {pretty(verifiedPhone)}
          <span className="text-[11px] font-bold text-emerald-700">Verified</span>
        </span>
        <button type="button" onClick={() => { setStage('edit'); setPhone(''); setError(''); }} className="text-xs font-bold text-gray-600 underline underline-offset-2">
          Change
        </button>
      </div>
    );
  }

  if (stage === 'code') {
    return (
      <div className="space-y-2.5">
        <p className="text-xs text-gray-600">
          Enter the code sent on <span className="font-semibold text-[#128C7E]">WhatsApp</span> to <b>{pretty(phone)}</b>{' '}
          <button type="button" onClick={() => { setStage('edit'); setError(''); }} className="font-bold underline underline-offset-2">Change</button>
        </p>
        <OtpCodeInput ref={codeRef} value={code} onChange={(v) => { setCode(v); if (error) setError(''); }} onComplete={verify} disabled={busy} invalid={!!error} />
        {error && <p role="alert" className="text-xs font-semibold text-rose-600">{error}</p>}
        <div className="flex items-center justify-between text-xs">
          {busy ? <span className="inline-flex items-center gap-1.5 text-gray-500"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying…</span> : <span />}
          {cooldown > 0
            ? <span className="text-gray-400">Resend in 0:{String(cooldown).padStart(2, '0')}</span>
            : <button type="button" onClick={send} disabled={busy} className="font-bold text-ink underline underline-offset-2">Resend code</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <div className="flex flex-1 items-center rounded-xl border border-gray-200 bg-gray-50 focus-within:bg-white focus-within:border-ink">
          <span className="pl-3 pr-2 text-sm font-semibold text-gray-500">+91</span>
          <input
            type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="Mobile number"
            value={phone}
            onChange={(e) => { setPhone(digits10(e.target.value)); if (error) setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
            className={`${input} !border-0 !bg-transparent !px-1`}
          />
        </div>
        <button type="button" onClick={send} disabled={busy || phone.length !== 10} className={btn}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Verify
        </button>
      </div>
      {error
        ? <p role="alert" className="text-xs font-semibold text-rose-600">{error}</p>
        : <p className="text-[11px] text-gray-500">We&apos;ll send a code on WhatsApp. Then you can sign in with this number too.</p>}
      {verifiedPhone && (
        <button type="button" onClick={() => { setPhone(verifiedPhone); setStage('view'); setError(''); }} className="text-[11px] font-bold text-gray-500 underline">
          Keep {pretty(verifiedPhone)}
        </button>
      )}
    </div>
  );
}
