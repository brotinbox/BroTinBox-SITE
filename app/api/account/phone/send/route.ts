import { NextResponse, type NextRequest } from 'next/server';
import { normalizeIndianPhone, sendOtp } from '@/lib/auth/otp';
import { phoneOtpAllowed, phoneOtpMode } from '@/lib/auth/otp-mode';
import { rateLimit } from '@/lib/security/ratelimit';
import { getSupabaseServer } from '@/lib/supabase/server';

/** Signed-in customers: send a WhatsApp code to verify (or change) their mobile number. */
export async function POST(request: NextRequest) {
  if (phoneOtpMode() === 'off') return NextResponse.json({ error: 'Phone verification is not available yet.' }, { status: 404 });

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const phone = typeof body?.phone === 'string' ? normalizeIndianPhone(body.phone) : null;
  if (!phone) return NextResponse.json({ error: 'Enter a valid 10-digit mobile number.' }, { status: 400 });
  if (!phoneOtpAllowed(phone)) {
    return NextResponse.json({ error: 'Phone verification is coming soon.' }, { status: 403 });
  }

  const [byUser, byPhone] = await Promise.all([
    rateLimit('otpSendIp', `user:${user.id}`),
    rateLimit('otpSendPhone', phone),
  ]);
  if (!byUser.success || !byPhone.success) {
    return NextResponse.json({ error: 'Too many attempts. Please try again in a few minutes.' }, { status: 429 });
  }

  const result = await sendOtp(phone);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, retryAfter: result.retryAfter }, { status: result.retryAfter ? 429 : 502 });
  }
  return NextResponse.json({ ok: true });
}
