import { BRAND } from '@/config/brand';

/**
 * Refer & earn: a friend's first weekly or monthly plan gets 1 free juice,
 * and so does the person who referred them (lib/checkout/offers.ts). These
 * helpers build the share link and remember a code that arrived via ?ref=.
 */

const STORAGE_KEY = 'brotin-ref';
/** A remembered code is used for up to 30 days. */
const MAX_AGE_MS = 30 * 864e5;
const CODE_RE = /^[A-Z0-9]{4,20}$/;

export const cleanCode = (raw: string | null | undefined) => {
  const c = (raw ?? '').trim().toUpperCase();
  return CODE_RE.test(c) ? c : null;
};

export const referralLink = (code: string) => `${BRAND.siteUrl.replace(/\/$/, '')}/?ref=${encodeURIComponent(code)}`;

export const referralMessage = (code: string) =>
  `I order high-protein meals from ${BRAND.name}. Use my code ${code} on your first weekly or monthly plan and we both get a free juice: ${referralLink(code)}`;

export const whatsappShareUrl = (code: string) => `https://wa.me/?text=${encodeURIComponent(referralMessage(code))}`;

/** Browser only: keep a code from ?ref= so checkout can fill it in later. */
export function rememberReferral(raw: string | null) {
  const code = cleanCode(raw);
  if (!code) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ code, at: Date.now() })); } catch {}
}

/** Browser only: the remembered code, if it is still fresh. */
export function storedReferral(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as { code?: string; at?: number } | null;
    if (!v?.code || !v.at || Date.now() - v.at > MAX_AGE_MS) return null;
    return cleanCode(v.code);
  } catch { return null; }
}

export function forgetReferral() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

/** Trainer partners share the same ?ref= link; their message talks to clients. */
export const partnerMessage = (code: string) =>
  `I recommend ${BRAND.name} for high-protein meal boxes delivered in ${BRAND.city}. Use my code ${code} on your first weekly or monthly plan for free juices: ${referralLink(code)}`;

export const partnerWhatsappUrl = (code: string) => `https://wa.me/?text=${encodeURIComponent(partnerMessage(code))}`;
