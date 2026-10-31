import { CookieConsent } from '@/components/layout/CookieConsent';
import { BRAND } from '@/config/brand';

/** Live site only, so local runs and Vercel previews stay out of the reports. */
const isLive = process.env.NODE_ENV === 'production' && (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'production');

export function GoogleAnalytics() {
  return <CookieConsent measurementId={isLive ? BRAND.gaMeasurementId : null} />;
}
