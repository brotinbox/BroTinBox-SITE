import type { Metadata } from 'next';
import { SingleBoxFlow } from '@/components/single/SingleBoxFlow';

export const metadata: Metadata = {
  title: 'Single Box · Same-Day Protein Meal Delivery in Coimbatore',
  description: 'Order one high-protein box any day, as often as you like. Order by 9:30 AM for lunch or 5 PM for dinner and get it the same day.',
  alternates: { canonical: '/single' },
};

/** Single box: full-page 2-step flow (same look as checkout), then /checkout. */
export default function SingleBoxPage() {
  return (
    <main className="min-h-[calc(100vh-70px)] bg-paper">
      <SingleBoxFlow />
    </main>
  );
}
