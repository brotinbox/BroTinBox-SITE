'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Lock, Mail } from 'lucide-react';
import { staffLogin, type LoginState } from './actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3 rounded-xl bg-ink-soft hover:bg-ink disabled:opacity-60 text-white font-heading font-black text-sm transition-colors"
    >
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState<LoginState, FormData>(staffLogin, null);
  return (
    <form action={action} className="space-y-4" autoComplete="on">
      <label className="block">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1">Email</span>
        <div className="relative">
          <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="username"
            className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-ink-soft focus:ring-2 focus:ring-ink-soft/15"
          />
        </div>
      </label>
      <label className="block">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1">Password</span>
        <div className="relative">
          <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="current-password"
            className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-ink-soft focus:ring-2 focus:ring-ink-soft/15"
          />
        </div>
      </label>
      {/* Honeypot: hidden from people, bots fill it in */}
      <input name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      {state?.error && (
        <p role="alert" className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      <Submit />
    </form>
  );
}
