import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Shown beside every "Place order" button so acceptance of the policies is explicit at the point of purchase. */
export function OrderTerms({ className }: { className?: string }) {
  return (
    <p className={cn('text-[11px] text-gray-500 leading-relaxed', className)}>
      By placing this order you agree to our <Link href="/terms" target="_blank" className="underline">Terms</Link>,{' '}
      <Link href="/refund-policy" target="_blank" className="underline">Refund &amp; Cancellation</Link> and{' '}
      <Link href="/delivery-policy" target="_blank" className="underline">Delivery</Link> policies, and confirm you have read our{' '}
      <Link href="/food-safety" target="_blank" className="underline">allergen information</Link>.
    </p>
  );
}
