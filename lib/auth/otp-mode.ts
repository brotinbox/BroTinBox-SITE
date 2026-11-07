import 'server-only';
import { getPhoneOtpSettings, tenDigitMobile, type PhoneOtpMode } from '@/lib/settings/runtime';

/**
 * Rollout switch for WhatsApp phone login, set in admin → Settings → Phone sign-in
 * (falls back to the PHONE_OTP_MODE env var until saved there):
 *  - off  (default): form hidden, OTP routes return 404.
 *  - test: form shown only on /login?otp=1, and codes go only to the test numbers.
 *  - on:   open to every customer.
 */
export type { PhoneOtpMode };

export async function phoneOtpMode(): Promise<PhoneOtpMode> {
  return (await getPhoneOtpSettings()).mode;
}

/** Whether this normalized (+91…) phone may use OTP login right now. */
export async function phoneOtpAllowed(phone: string): Promise<boolean> {
  const s = await getPhoneOtpSettings();
  if (s.mode === 'on') return true;
  if (s.mode === 'test') {
    const ten = tenDigitMobile(phone);
    return !!ten && s.test_numbers.includes(ten);
  }
  return false;
}

/** Whether the login page should render the phone form. */
export async function showPhoneOtpForm(otpParam?: string): Promise<boolean> {
  const mode = await phoneOtpMode();
  return mode === 'on' || (mode === 'test' && otpParam === '1');
}
