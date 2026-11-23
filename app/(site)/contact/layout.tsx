import { pageMetadata } from '@/lib/seo/page-metadata';

// page.tsx is a client component, so its metadata lives here.
export const metadata = pageMetadata({
  title: 'Contact Us in Coimbatore',
  description: 'Reach BroTin Box on WhatsApp, phone or email. Our kitchen is in Kuniyamuthur, Coimbatore, and we are open Monday to Saturday.',
  path: '/contact',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
