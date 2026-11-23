import { pageMetadata } from '@/lib/seo/page-metadata';

// page.tsx is a client component, so its metadata lives here.
export const metadata = pageMetadata({
  title: '26-Day Monthly Protein Meal Plan',
  description: 'Our lowest per-meal price: 26 delivery days of weighed high-protein boxes in Coimbatore. Pause or skip before 9 PM and missed meals become credits.',
  path: '/monthly',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
