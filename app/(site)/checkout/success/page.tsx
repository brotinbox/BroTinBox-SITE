import { redirect } from 'next/navigation';

// Payment now happens on /checkout/pay/[id]; old links land on the order list.
export default function CheckoutSuccessPage() {
  redirect('/orders');
}
