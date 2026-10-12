'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { signInWithGoogleIdToken } from '@/lib/auth/customer';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: (
            notification?: (notification: {
              isNotDisplayed: () => boolean;
              getNotDisplayedReason: () => string;
              isSkippedMoment: () => boolean;
              getSkippedReason: () => string;
              isDismissedMoment: () => boolean;
              getDismissedReason: () => string;
            }) => void
          ) => void;
          cancel: () => void;
        };
      };
    };
  }
}

const ORDER_PATHS = ['/checkout', '/tomorrow', '/weekly', '/monthly', '/custom', '/build-plan', '/box/'];

export function GoogleOneTap() {
  const router = useRouter();
  const pathname = usePathname();
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);
  const isInitialized = useRef(false);

  const initOneTap = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google?.accounts?.id || isLoggedIn || isInitialized.current) {
      return;
    }

    isInitialized.current = true;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential?: string }) => {
          if (!response?.credential) return;

          try {
            const res = await signInWithGoogleIdToken(response.credential);
            
            // Redirect based on onboarding state
            if (res && 'profile' in res && res.profile && !res.profile.is_onboarded) {
              const currentPath = window.location.pathname;
              const isOrder = ORDER_PATHS.some((p) => currentPath.startsWith(p));
              if (!isOrder) {
                router.push(`/onboarding?next=${encodeURIComponent(currentPath)}`);
                return;
              }
            }

            if (pathname === '/login') {
              router.push('/dashboard');
            } else {
              router.refresh();
            }
          } catch (err) {
            console.error('Failed to sign in with Google One Tap:', err);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true,
      });

      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          console.debug('Google One Tap not displayed:', notification.getNotDisplayedReason());
        }
      });
    } catch (err) {
      console.warn('Google One Tap initialization error:', err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      isInitialized.current = false;
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.cancel();
        } catch {}
      }
      return;
    }

    if (window.google?.accounts?.id) {
      initOneTap();
    }
  }, [isLoggedIn, pathname]);

  // If already logged in, do not render or prompt
  if (isLoggedIn) return null;

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
      onLoad={initOneTap}
    />
  );
}
