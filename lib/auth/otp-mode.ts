import 'server-only';
import { normalizeIndianPhone } from '@/lib/auth/otp';

/**
 * Rollout switch for WhatsApp phone login (PHONE_OTP_MODE):
 *  - off  (default): form hidden, OTP routes return 404.
 *  - test: form shown only on /login?otp=1, and codes go only to PHONE_OTP_TEST_NUMBERS.
 *  - on:   open to every customer.
 */
export type PhoneOtpMode = 'off' | 'test' | 'on';

export function phoneOtpMode(): PhoneOtpMode {
  const v = (process.env.PHONE_OTP_MODE || '').trim().toLowerCase();
  return v === 'on' || v === 'test' ? v : 'off';
}

function testNumbers(): Set<string> {
  return new Set(
    (process.env.PHONE_OTP_TEST_NUMBERS || '')
      .split(',')
      .map((n) => normalizeIndianPhone(n.trim()))
      .filter((n): n is string => !!n),
  );
}

/** Whether this normalized (+91…) phone may use OTP login right now. */
export function phoneOtpAllowed(phone: string): boolean {
  const mode = phoneOtpMode();
  if (mode === 'on') return true;
  if (mode === 'test') return testNumbers().has(phone);
  return false;
}

/** Whether the login page should render the phone form. */
export function showPhoneOtpForm(otpParam?: string): boolean {
  const mode = phoneOtpMode();
  return mode === 'on' || (mode === 'test' && otpParam === '1');
}
