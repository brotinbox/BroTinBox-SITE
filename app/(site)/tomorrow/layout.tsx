import { pageMetadata } from '@/lib/seo/page-metadata';

// page.tsx is a client component, so its metadata lives here.
export const metadata = pageMetadata({
  title: 'Trial Box: Try One Protein Meal First',
  description: 'Order a single trial protein box for lunch or dinner in Coimbatore before choosing a plan. Weighed portions, with calories and protein for every dish.',
  path: '/tomorrow',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
