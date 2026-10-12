import 'server-only';
import { headers } from 'next/headers';

/** Best-effort client IP (Vercel sets x-forwarded-for / x-real-ip). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get('x-real-ip') ||
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '0.0.0.0'
  );
}

export async function userAgent(): Promise<string> {
  return ((await headers()).get('user-agent') || '').slice(0, 300);
}

/**
 * Rejects cross-site POSTs to route handlers. Server Actions already get this
 * check from Next.js; route handlers must call it themselves.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Strips control characters and trims; keeps normal punctuation and Indic text. */
export function cleanText(v: unknown, max = 500): string {
  return String(v ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);
}
