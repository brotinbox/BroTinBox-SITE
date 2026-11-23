import { pageMetadata } from '@/lib/seo/page-metadata';

// page.tsx is a client component, so its metadata lives here.
export const metadata = pageMetadata({
  title: 'Weekly Protein Meal Plan, Monday to Saturday',
  description: 'Plan a week of fresh high-protein lunch or dinner boxes in Coimbatore, a different box each day from Monday to Saturday. Pick your diet and days, then check out.',
  path: '/weekly',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
