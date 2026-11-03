import { NextResponse, type NextRequest } from 'next/server';
import { normalizeIndianPhone, sendOtp } from '@/lib/auth/otp';
import { rateLimit } from '@/lib/security/ratelimit';

function clientIp(request: NextRequest) {
  return request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0';
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const phone = typeof body?.phone === 'string' ? normalizeIndianPhone(body.phone) : null;
  if (!phone) return NextResponse.json({ error: 'Enter a valid 10-digit mobile number.' }, { status: 400 });

  const [ip, ph] = await Promise.all([
    rateLimit('otpSendIp', clientIp(request)),
    rateLimit('otpSendPhone', phone),
  ]);
  if (!ip.success || !ph.success) {
    return NextResponse.json({ error: 'Too many attempts. Please try again in a few minutes.' }, { status: 429 });
  }

  const result = await sendOtp(phone);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, retryAfter: result.retryAfter }, { status: result.retryAfter ? 429 : 502 });
  }
  return NextResponse.json({ ok: true });
}
