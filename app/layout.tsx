import type { Metadata, Viewport } from 'next';
import './globals.css';
import { BRAND } from '@/config/brand';
import { Analytics } from '@vercel/analytics/next';
import { INTRO_BOOT_SCRIPT } from '@/components/brand/intro';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} - Calorie & Protein Measured Meals in Coimbatore`,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.shortDescription,
  manifest: '/manifest.json',
  metadataBase: new URL(BRAND.siteUrl),
  keywords: [
    'meal subscription Coimbatore',
    'protein food Coimbatore',
    'calorie counted meals',
    'healthy food delivery RS Puram',
    'diet food Peelamedu',
    'gym diet Coimbatore',
    'high protein lunch box',
  ],
  authors: [{ name: BRAND.name }],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: BRAND.siteUrl,
    title: `${BRAND.name} - Every Gram Counted`,
    description: BRAND.tagline,
    siteName: BRAND.name,
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: `${BRAND.name} Fresh Healthy Meals`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: BRAND.name,
    description: BRAND.tagline,
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#121212',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@600;700;800;900&display=swap"
          rel="stylesheet"
        />
        {/* First-visit splash on the home page, decided before first paint so the page never flashes.
            Plain inline script in the (server) root layout: it is in the HTML and runs synchronously,
            and the root layout never re-renders on the client, so React never creates it there. */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-gray-900 antialiased selection:bg-accent/20 selection:text-primary">
        <ConfirmProvider>{children}</ConfirmProvider>
        <Analytics />
      </body>
    </html>
  );
}
