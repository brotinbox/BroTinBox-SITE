// @cashfreepayments/cashfree-js ships without type definitions.
declare module '@cashfreepayments/cashfree-js' {
  export type CashfreeMode = 'sandbox' | 'production';
  export interface CheckoutOptions {
    paymentSessionId: string;
    redirectTarget?: '_self' | '_blank' | '_top' | '_modal' | HTMLElement;
    returnUrl?: string;
  }
  export interface CheckoutResult {
    error?: { message?: string; code?: string; type?: string };
    redirect?: boolean;
    paymentDetails?: { paymentMessage?: string };
  }
  export interface Cashfree {
    checkout(options: CheckoutOptions): Promise<CheckoutResult>;
  }
  export function load(options: { mode: CashfreeMode }): Promise<Cashfree | null>;
}
