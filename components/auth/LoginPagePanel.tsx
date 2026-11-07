'use client';

import { SignInPanel } from '@/components/auth/SignInPanel';

/** /login page body: the same phone-first panel as the popup, without the popup. */
export function LoginPagePanel({ phoneEnabled, googleEnabled = true, next }: { phoneEnabled: boolean; googleEnabled?: boolean; next: string }) {
  return <SignInPanel phoneEnabled={phoneEnabled} googleEnabled={googleEnabled} request={{ returnTo: next }} finish={(then) => then()} />;
}
