import { pageMetadata } from '@/lib/seo/page-metadata';

// page.tsx is a client component, so its metadata lives here.
export const metadata = pageMetadata({
  title: 'FAQ: Delivery, Plans, Allergens and Nutrition',
  description: 'Answers about delivery slots, pausing a plan, allergens, containers and how the calories and protein on every box are calculated.',
  path: '/faq',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
