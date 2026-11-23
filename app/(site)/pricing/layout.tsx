import { pageMetadata } from '@/lib/seo/page-metadata';

// page.tsx is a client component, so its metadata lives here.
export const metadata = pageMetadata({
  title: 'Meal Plan Prices in Coimbatore: Weekly and Monthly',
  description: 'Compare weekly and monthly meal plan prices, the trial box and the per-meal cost for veg and non-veg boxes. Free delivery across our Coimbatore areas.',
  path: '/pricing',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
