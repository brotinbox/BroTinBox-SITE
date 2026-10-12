import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Console', template: '%s · Console' },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50 text-gray-900">{children}</div>;
}
