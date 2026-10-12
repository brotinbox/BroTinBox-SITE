'use client';

import { placeOrder, saveAddress } from '@/lib/checkout/actions';
import type { Cart } from '@/lib/checkout/quote';
import { useAppStore } from '@/store/useAppStore';

export type NewAddressInput = {
  recipientName: string;
  phone: string;
  flat: string;
  street: string;
  landmark?: string;
  area: string;
  pincode: string;
};

/**
 * One path for every order button on the site:
 *  signed out → open the sign-in drawer; new address → saved first; then the server prices and creates the order
 *  and the customer goes to the UPI payment page.
 * Returns an error message to show, or null when it navigated away.
 */
export async function submitOrder(
  cart: Omit<Cart, 'addressId'> & { addressId?: string },
  opts: { newAddress?: NewAddressInput; navigate: (href: string) => void }
): Promise<string | null> {
  const store = useAppStore.getState();
  if (!store.isLoggedIn) {
    store.setAuthDrawerOpen(true);
    return 'Please sign in to place your order.';
  }

  let addressId = cart.addressId;
  if (opts.newAddress || !addressId) {
    if (!opts.newAddress) return 'Add a delivery address.';
    const a = opts.newAddress;
    const saved = await saveAddress({ ...a, phone: a.phone.replace(/\D/g, '').slice(-10) });
    if (!saved.ok) return saved.error;
    if (!saved.deliverable) return `We don't deliver to ${a.pincode} yet. Please use a Coimbatore address in our delivery area.`;
    addressId = saved.id;
  }

  const result = await placeOrder({ ...cart, addressId } as Cart);
  if (!result.ok) return result.error;
  opts.navigate(`/checkout/pay/${result.orderId}`);
  return null;
}

export const toDbDiet = (d: string): 'veg' | 'non_veg' => (d === 'veg' ? 'veg' : 'non_veg');
