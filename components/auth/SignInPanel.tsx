'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { OtpCodeInput } from '@/components/auth/OtpCodeInput';
import { syncAuth } from '@/components/providers/AuthSync';
import type { SignInRequest } from '@/store/useAppStore';
import { BRAND } from '@/config/brand';

const digits10 = (v: string) => v.replace(/\D/g, '').replace(/^(?:91|0)(?=[6-9]\d{9}$)/, '').slice(0, 10);
const validPhone = (v: string) => /^[6-9]\d{9}$/.test(v);
const pretty = (v: string) => `+91 ${v.slice(0, 5)} ${v.slice(5)}`;

/** Where to land after sign-in: an explicit returnTo, else stay here (home/login → dashboard). */
function resolveTarget(req: SignInRequest): string {
  if (req.returnTo) return req.returnTo;
  const { pathname, search } = window.location;
  if (pathname === '/' || pathname === '/login') return '/dashboard';
  return pathname + search;
}

/**
 * Phone-first sign-in: number → 6-digit WhatsApp code → signed in.
 * Google is a small secondary option. Used by the popup and the /login page.
 *
 * `finish` runs the post-sign-in step: the popup closes itself first, the
 * /login page runs it directly.
 */
export function SignInPanel({ phoneEnabled, request, finish, onBeforeGoogle }: {
  phoneEnabled: boolean;
  request: SignInRequest;
  finish: (then: () => void) => void;
  onBeforeGoogle?: () => void;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<'phone' | 'code' | 'done'>('phone');
  const [phone, setPhone] = useState(digits10(request.phone ?? ''));
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const autoSent = useRef(false);
  // Not rendered into the DOM (only used on click), so no hydration mismatch.
  const [target] = useState(() => (typeof window === 'undefined' ? request.returnTo ?? '/dashboard' : resolveTarget(request)));

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

  async function sendCode(number = phone) {
    setError('');
    if (!validPhone(number)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    setBusy(true);
    try {
      const { res, data } = await post('/api/auth/otp/send', {
        phone: number,
        source: window.location.pathname,
        context: request.context,
      });
      if (!res.ok) {
        setError(data.error || 'Could not send the code. Please try again.');
        // A recent code is still valid: let them type it.
        if (data.retryAfter) {
          setCooldown(data.retryAfter);
          setStage('code');
        }
        return;
      }
      setCode('');
      setStage('code');
      setCooldown(30);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  // Mid-order: the number from the address form, code sent straight away.
  useEffect(() => {
    if (phoneEnabled && request.autoSend && validPhone(phone) && !autoSent.current) {
      autoSent.current = true;
      sendCode(phone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verify(value = code) {
    if (busy || value.length !== 6) return;
    setError('');
    setBusy(true);
    try {
      const { res, data } = await post('/api/auth/otp/verify', { phone, code: value, next: target });
      if (!res.ok) {
        setError(data.error || 'That code is incorrect or expired.');
        setCode('');
        setBusy(false);
        codeRef.current?.focus();
        return;
      }
      await syncAuth();
      setStage('done');
      const dest = target;
      const here = window.location.pathname + window.location.search;
      setTimeout(() => {
        finish(() => {
          if (request.onSignedIn) return request.onSignedIn();
          if (data.redirect && data.redirect !== dest) router.push(data.redirect); // new customer → onboarding
          else if (dest !== here) router.push(dest);
          else router.refresh();
        });
      }, 650);
    } catch {
      setError('Network error. Please try again.');
      setBusy(false);
    }
  }

  if (stage === 'done') {
    return (
      <div className="py-10 flex flex-col items-center text-center gap-3 animate-in fade-in zoom-in-95 duration-200">
        <CheckCircle2 className="w-14 h-14 text-emerald-600" />
        <p className="font-heading font-black text-xl text-ink">You&apos;re signed in</p>
        <p className="text-xs text-gray-500">{request.onSignedIn ? 'Placing your order…' : 'Taking you back…'}</p>
      </div>
    );
  }

  const primary =
    'w-full flex items-center justify-center gap-2 bg-ink hover:bg-black disabled:opacity-40 text-white font-semibold text-base py-3.5 px-4 rounded-xl transition-all tap-active';
  const welcome = (
    <p className="text-[15px] text-gray-500">
      Welcome to <span className="font-semibold text-gray-700">{BRAND.name}</span>
    </p>
  );
  const heading = 'font-heading font-black text-[28px] sm:text-[32px] leading-[1.15] tracking-tight text-ink mt-2';
  const divider = (
    <div className="flex items-center gap-4 text-sm text-gray-400">
      <span className="h-px flex-1 bg-gray-200" />or<span className="h-px flex-1 bg-gray-200" />
    </div>
  );

  if (!phoneEnabled) {
    return (
      <div className="flex flex-col">
        {welcome}
        <h2 className={heading}>{request.title ?? 'Sign in to continue'}</h2>
        <p className="text-sm text-gray-500 mt-2">New here? Your account is created automatically.</p>
        <div className="mt-7">
          <GoogleSignInButton next={target} onBeforeRedirect={onBeforeGoogle} />
        </div>
        <Terms />
      </div>
    );
  }

  if (stage === 'code') {
    const change = () => { setStage('phone'); setError(''); setCode(''); };
    return (
      <div className="flex flex-col">
        <button type="button" onClick={change} className="self-start -ml-1 inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-ink">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h2 className={heading}>Enter the code</h2>
        <p className="text-[15px] text-gray-500 mt-2">
          Sent on <span className="font-semibold text-[#128C7E]">WhatsApp</span> to{' '}
          <span className="font-semibold text-ink whitespace-nowrap">{pretty(phone)}</span>{' '}
          <button type="button" onClick={change} className="font-semibold text-ink underline underline-offset-2">Change</button>
        </p>

        <div className="mt-7">
          <OtpCodeInput ref={codeRef} value={code} onChange={(v) => { setCode(v); if (error) setError(''); }} onComplete={verify} disabled={busy} invalid={!!error} />
          {error && <p role="alert" className="text-sm text-rose-600 font-medium mt-2">{error}</p>}
        </div>

        <button type="button" onClick={() => verify()} disabled={busy || code.length !== 6} className={`${primary} mt-6`}>
          {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : 'Verify & continue'}
        </button>

        <p className="text-center text-sm text-gray-500 mt-5">
          Didn&apos;t get it?{' '}
          {cooldown > 0 ? (
            <span className="text-gray-400">Resend in 0:{String(cooldown).padStart(2, '0')}</span>
          ) : (
            <button type="button" onClick={() => sendCode()} disabled={busy} className="font-semibold text-ink underline underline-offset-2">
              Resend code
            </button>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {welcome}
      <h2 className={heading}>{request.title ?? 'Get started with your phone number'}</h2>

      <form onSubmit={(e) => { e.preventDefault(); sendCode(); }} className="mt-7">
        <label className="block">
          <span className="sr-only">Mobile number</span>
          <div className={`flex items-center rounded-xl border bg-white transition-colors focus-within:border-ink focus-within:ring-1 focus-within:ring-ink ${error ? 'border-rose-400' : 'border-gray-300'}`}>
            <span className="pl-4 pr-2.5 text-base text-gray-500">+91</span>
            <span className="h-6 w-px bg-gray-200" />
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              autoFocus
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => { setPhone(digits10(e.target.value)); if (error) setError(''); }}
              className="flex-1 min-w-0 bg-transparent px-3 py-3.5 text-base text-ink placeholder:text-gray-400 focus:outline-none"
            />
          </div>
        </label>
        {error ? (
          <p role="alert" className="text-sm text-rose-600 font-medium mt-2">{error}</p>
        ) : (
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" /> We&apos;ll send a one-time code on WhatsApp
          </p>
        )}
        <button type="submit" disabled={busy || phone.length !== 10} className={`${primary} mt-5`}>
          {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending code…</> : 'Continue'}
        </button>
      </form>

      <div className="my-6">{divider}</div>

      <GoogleSignInButton next={target} onBeforeRedirect={onBeforeGoogle} />

      <Terms />
    </div>
  );
}

function Terms() {
  return (
    <p className="text-sm text-gray-500 leading-relaxed mt-10">
      By continuing you agree to our{' '}
      <Link href="/privacy" className="font-medium text-ink underline underline-offset-2">privacy policy</Link> &amp;{' '}
      <Link href="/terms" className="font-medium text-ink underline underline-offset-2">terms of use</Link>.
    </p>
  );
}
