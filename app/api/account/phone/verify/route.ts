import { NextResponse, type NextRequest } from 'next/server';
import { checkOtpCode, linkVerifiedPhone, normalizeIndianPhone } from '@/lib/auth/otp';
import { phoneOtpAllowed, phoneOtpMode } from '@/lib/auth/otp-mode';
import { leadsTable } from '@/lib/leads';
import { rateLimit, resetRateLimit } from '@/lib/security/ratelimit';
import { getSupabaseServer } from '@/lib/supabase/server';

/**
 * Signed-in customers: confirm the code and save the number as verified on
 * this account, so WhatsApp sign-in with it opens the same account.
 */
export async function POST(request: NextRequest) {
  if ((await phoneOtpMode()) === 'off') return NextResponse.json({ error: 'Phone verification is not available yet.' }, { status: 404 });

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const phone = typeof body?.phone === 'string' ? normalizeIndianPhone(body.phone) : null;
  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  if (!phone || !/^[0-9]{6}$/.test(code)) return NextResponse.json({ error: 'Enter the 6-digit code.' }, { status: 400 });
  if (!(await phoneOtpAllowed(phone))) return NextResponse.json({ error: 'That code is incorrect or expired.' }, { status: 400 });

  const [a, b] = await Promise.all([rateLimit('otpVerify', `user:${user.id}`), rateLimit('otpVerify', `ph:${phone}`)]);
  if (!a.success || !b.success) {
    return NextResponse.json({ error: 'Too many attempts. Please try again in a few minutes.' }, { status: 429 });
  }

  const checked = await checkOtpCode(phone, code);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
  await resetRateLimit('otpVerify', `ph:${phone}`);

  const linked = await linkVerifiedPhone(user.id, phone);
  if (!linked.ok) return NextResponse.json({ error: linked.error }, { status: 409 });

  // The lead row (if any) now belongs to this account.
  const { error } = await leadsTable().update({ user_id: user.id }).eq('phone', phone);
  if (error) console.error('[leads] relink failed', error.message);

  return NextResponse.json({ ok: true, phone });
}
