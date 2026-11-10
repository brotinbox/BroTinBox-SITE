import { NextResponse, type NextRequest } from 'next/server';
import { after } from 'next/server';
import { normalizeIndianPhone, verifyOtp } from '@/lib/auth/otp';
import { rateLimit, resetRateLimit } from '@/lib/security/ratelimit';
import { phoneOtpAllowed, phoneOtpMode } from '@/lib/auth/otp-mode';
import { getLead, markLeadVerified, notifyNewSignup } from '@/lib/leads';

const ORDER_PATHS = ['/checkout', '/tomorrow', '/weekly', '/monthly', '/build-plan', '/box/'];

function safeNext(next: unknown): string {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/dashboard';
  return next;
}

function clientIp(request: NextRequest) {
  return request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0';
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const phone = typeof body?.phone === 'string' ? normalizeIndianPhone(body.phone) : null;
  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  if ((await phoneOtpMode()) === 'off') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!phone || !/^[0-9]{6}$/.test(code)) {
    return NextResponse.json({ error: 'Enter the 6-digit code.' }, { status: 400 });
  }
  if (!(await phoneOtpAllowed(phone))) return NextResponse.json({ error: 'That code is incorrect or expired.' }, { status: 400 });

  const ip = clientIp(request);
  const [a, b] = await Promise.all([rateLimit('otpVerify', `ip:${ip}`), rateLimit('otpVerify', `ph:${phone}`)]);
  if (!a.success || !b.success) {
    return NextResponse.json({ error: 'Too many attempts. Please try again in a few minutes.' }, { status: 429 });
  }

  const result = await verifyOtp(phone, code);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  await resetRateLimit('otpVerify', `ph:${phone}`);

  const { userId, isNew } = result;
  after(async () => {
    await markLeadVerified(phone, userId);
    if (isNew) {
      const lead = await getLead(phone);
      await notifyNewSignup({ method: 'phone', phone, source: lead?.source, context: lead?.context });
    }
  });

  const next = safeNext(body?.next);
  // Mid-order sign-ins go straight back to the order; onboarding can wait.
  const redirect = !result.onboarded && !ORDER_PATHS.some((p) => next.startsWith(p))
    ? `/onboarding?next=${encodeURIComponent(next)}`
    : next;
  return NextResponse.json({ ok: true, redirect, isNew });
}
