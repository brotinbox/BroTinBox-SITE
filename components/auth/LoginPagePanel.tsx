'use client';

import { SignInPanel } from '@/components/auth/SignInPanel';

/** /login page body: the same phone-first panel as the popup, without the popup. */
export function LoginPagePanel({ phoneEnabled, next }: { phoneEnabled: boolean; next: string }) {
  return <SignInPanel phoneEnabled={phoneEnabled} request={{ returnTo: next }} finish={(then) => then()} />;
}
