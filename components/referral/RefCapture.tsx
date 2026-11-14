'use client';

import { useEffect } from 'react';
import { rememberReferral } from '@/lib/referral';

/** Saves ?ref=CODE from a shared link so checkout can apply it later. */
export function RefCapture() {
  useEffect(() => {
    rememberReferral(new URLSearchParams(window.location.search).get('ref'));
  }, []);
  return null;
}
