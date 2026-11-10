'use client';

import { placeOrder, saveAddress } from '@/lib/checkout/actions';
import { startCashfreePayment } from '@/app/(site)/checkout/pay/[id]/actions';
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

/** Returned while the sign-in popup is open; callers show no error for it. */
export const SIGN_IN_PENDING = '__sign_in_pending__';

/** Errors that need a next step on screen travel as "CODE::message". */
type OrderErrorCode = 'TRIAL_USED' | 'VERIFY_PHONE';
const CODE_SEP = '::';

export function parseOrderError(error: string): { code?: OrderErrorCode; message: string } {
  const i = error.indexOf(CODE_SEP);
  const code = i > 0 ? error.slice(0, i) : '';
  if (code === 'TRIAL_USED' || code === 'VERIFY_PHONE') return { code, message: error.slice(i + CODE_SEP.length) };
  return { message: error };
}

const withCode = (r: { error: string; code?: string }) => (r.code ? `${r.code}${CODE_SEP}${r.error}` : r.error);

const DIET_LABEL: Record<string, string> = { veg: 'Veg', non_veg: 'Non-veg' };

/** One line for the lead list / Telegram: "Trial · Non-veg · 1 meal/day · lunch · 2026-11-06". */
function cartSummary(cart: Omit<Cart, 'addressId'>): string {
  const days = cart.days ?? [];
  const diets = [...new Set(days.map((d) => DIET_LABEL[d.diet] ?? d.diet))].join('/');
  const type = cart.type.charAt(0).toUpperCase() + cart.type.slice(1);
  const when = days.length > 1 ? `${days.length} days from ${days[0]?.date}` : days[0]?.date;
  return [type, diets, `${cart.mealsPerDay} meal${cart.mealsPerDay > 1 ? 's' : ''}/day`, cart.mealsPerDay === 1 ? cart.slot : null, when]
    .filter(Boolean)
    .join(' · ');
}

/**
 * One path for every order button on the site:
 *  signed out → the sign-in popup opens over the order with the address-form
 *  number prefilled and the WhatsApp code already sent; after sign-in,
 *  `onSignedIn` (usually the same pay handler) runs again with nothing lost.
 *  new address → saved first; then the server prices and creates the order
 *  and the customer goes to the payment page.
 * Returns an error message to show, SIGN_IN_PENDING, or null when it navigated away.
 */
export async function submitOrder(
  cart: Omit<Cart, 'addressId'> & { addressId?: string },
  opts: {
    newAddress?: NewAddressInput;
    navigate: (href: string) => void;
    onSignedIn?: () => void;
    /** The order exists (before payment opens): clear the cart / draft here. */
    onPlaced?: (orderId: string) => void;
    /** Called once the new address is saved, so a retry reuses it. */
    onAddressSaved?: (id: string) => void;
  }
): Promise<string | null> {
  const store = useAppStore.getState();
  if (!store.isLoggedIn) {
    const phone = (opts.newAddress?.phone ?? '').replace(/\D/g, '').slice(-10);
    store.openSignIn({
      title: 'Verify your number to place the order',
      phone,
      autoSend: /^[6-9]\d{9}$/.test(phone),
      onSignedIn: opts.onSignedIn,
      context: {
        flow: cart.type,
        summary: cartSummary(cart),
        area: opts.newAddress?.area,
        pincode: opts.newAddress?.pincode,
      },
    });
    return SIGN_IN_PENDING;
  }

  let addressId = cart.addressId;
  if (opts.newAddress || !addressId) {
    if (!opts.newAddress) return 'Add a delivery address.';
    const a = opts.newAddress;
    const saved = await saveAddress({ ...a, phone: a.phone.replace(/\D/g, '').slice(-10) });
    if (!saved.ok) return saved.error;
    if (!saved.deliverable) return `We don't deliver to ${a.pincode} yet. Please use a Coimbatore address in our delivery area.`;
    addressId = saved.id;
    opts.onAddressSaved?.(saved.id);
  }

  const result = await placeOrder({ ...cart, addressId } as Cart);
  if (!result.ok) return withCode(result);
  opts.onPlaced?.(result.orderId);
  // Straight to Cashfree (like Swiggy's one-tap pay). The payment page stays
  // as the fallback: manual UPI mode, SDK failure, or retrying later.
  if (result.payOnline && (await openCashfree(result.orderId))) return null;
  opts.navigate(`/checkout/pay/${result.orderId}`);
  return null;
}

/** Opens Cashfree's page in this tab (it returns to /checkout/pay/[id]?cf=1). False if it couldn't. */
async function openCashfree(orderId: string): Promise<boolean> {
  try {
    const r = await startCashfreePayment(orderId);
    if (!r.ok) return false;
    const { load } = await import('@cashfreepayments/cashfree-js');
    const cashfree = await load({ mode: r.mode });
    if (!cashfree) return false;
    const res = await cashfree.checkout({ paymentSessionId: r.sessionId, redirectTarget: '_self' });
    return !res?.error;
  } catch {
    return false;
  }
}

export const toDbDiet = (d: string): 'veg' | 'non_veg' => (d === 'veg' ? 'veg' : 'non_veg');
