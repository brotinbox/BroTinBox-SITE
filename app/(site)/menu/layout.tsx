import { pageMetadata } from '@/lib/seo/page-metadata';

// page.tsx is a client component, so its metadata lives here.
export const metadata = pageMetadata({
  title: "This Week's Menu: Protein Boxes with Calories and Macros",
  description: "See this week's veg and non-veg protein boxes in Coimbatore, with calories, protein, carbs, fat and gram weights listed for every dish.",
  path: '/menu',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
