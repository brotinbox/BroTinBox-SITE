import { pageMetadata } from '@/lib/seo/page-metadata';

// page.tsx is a client component, so its metadata lives here.
export const metadata = pageMetadata({
  title: 'Delivery Areas and Pincodes in Coimbatore',
  description: 'Check if we deliver to your area in Coimbatore. See the areas and pincodes we serve for lunch and dinner, and join the list for areas opening next.',
  path: '/delivery-areas',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
