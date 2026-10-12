/** @type {import('next').NextConfig} */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : '';
const r2Url = process.env.CLOUDFLARE_R2_PUBLIC_URL || '';
const r2Host = r2Url ? new URL(r2Url).host : '';
const isDev = process.env.NODE_ENV !== 'production';

// Cashfree checkout SDK (loaded from sdk.cashfree.com) and its hosted payment pages.
const cashfree = 'https://sdk.cashfree.com https://sandbox.cashfree.com https://api.cashfree.com https://payments.cashfree.com https://payments-test.cashfree.com';

// Next.js needs inline scripts for hydration; 'unsafe-eval' only in dev (React refresh).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://sdk.cashfree.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  `img-src 'self' data: blob: https://images.unsplash.com https://plus.unsplash.com https://img.icons8.com https://lh3.googleusercontent.com${supabaseHost ? ` https://${supabaseHost}` : ''}${r2Host ? ` https://${r2Host}` : ''}`,
  `connect-src 'self'${supabaseHost ? ` https://${supabaseHost} wss://${supabaseHost}` : ''} https://api.bigdatacloud.net ${cashfree}`,
  `frame-src https://maps.google.com https://www.google.com ${cashfree}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  `form-action 'self'${supabaseHost ? ` https://${supabaseHost}` : ''} ${cashfree}`,
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), payment=(), usb=(), geolocation=(self)' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
];

const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      ...(supabaseHost ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }] : []),
      ...(r2Host ? [{ protocol: 'https', hostname: r2Host }] : []),
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: '6mb' },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
