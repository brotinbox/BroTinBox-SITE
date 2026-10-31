import Script from 'next/script';
import { BRAND } from '@/config/brand';

/** Live site only, so local runs and Vercel previews stay out of the reports. */
const isLive = process.env.NODE_ENV === 'production' && (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'production');

export function GoogleAnalytics() {
  if (!isLive) return null;
  const id = BRAND.gaMeasurementId;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');`}
      </Script>
    </>
  );
}
