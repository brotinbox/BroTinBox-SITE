'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Lock, MapPin, Plus, ShieldCheck, Tag } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getQuote, type QuoteResult } from '@/lib/checkout/actions';
import type { Cart } from '@/lib/checkout/quote';
import { submitOrder, toDbDiet, type NewAddressInput } from '@/lib/checkout/submit';
import { cn } from '@/lib/utils';
import { OrderTerms } from '@/components/legal/OrderTerms';

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function CheckoutPage() {
  const router = useRouter();
  const { activeCheckoutType, trialOrder, monthlyOrder, addresses, selectedAddressId, setSelectedAddressId, isLoggedIn, authReady, user } = useAppStore();

  // Build the cart (what the customer chose) from the plan builder state.
  const cartBase = useMemo((): (Omit<Cart, 'addressId' | 'couponCode'> & { title: string }) | null => {
    if (activeCheckoutType === 'monthly' && monthlyOrder?.schedule?.length) {
      return {
        title: `Monthly plan · ${monthlyOrder.schedule.length} days`,
        type: 'monthly', mealsPerDay: monthlyOrder.mealsPerDay, slot: 'lunch',
        days: monthlyOrder.schedule.map((d) => ({ date: d.date, diet: toDbDiet(d.diet) })),
        addonIds: [], preferences: { isEggFree: false, skipLegume: false, dietVariation: monthlyOrder.dietVariation },
      };
    }
    if (activeCheckoutType === 'trial' && trialOrder) {
      return {
        title: `Daily trial · ${trialOrder.dayName}`,
        type: 'trial', mealsPerDay: trialOrder.mealsPerDay, slot: 'lunch',
        days: [{ date: trialOrder.dateStr, diet: toDbDiet(trialOrder.diet) }],
        addonIds: [...trialOrder.selectedSides, ...trialOrder.selectedDrinks], preferences: { isEggFree: false, skipLegume: false },
      };
    }
    return null;
  }, [activeCheckoutType, trialOrder, monthlyOrder]);

  const [useNew, setUseNew] = useState(false);
  const [addr, setAddr] = useState<NewAddressInput>({ recipientName: '', phone: '', flat: '', street: '', landmark: '', area: '', pincode: '' });
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<string | undefined>();
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setAddr((a) => ({ ...a, recipientName: a.recipientName || user.fullName, phone: a.phone || user.phone.replace(/^\+91/, '') }));
  }, [user.fullName, user.phone]);
  useEffect(() => { if (authReady && addresses.length === 0) setUseNew(true); }, [authReady, addresses.length]);

  const addressId = useNew ? undefined : (selectedAddressId || addresses[0]?.id);

  // Server quote whenever the inputs change (existing address only).
  useEffect(() => {
    if (!cartBase || !addressId || !isLoggedIn) { setQuote(null); return; }
    let cancelled = false;
    getQuote({ ...cartBase, addressId, couponCode: coupon }).then((q) => { if (!cancelled) setQuote(q); });
    return () => { cancelled = true; };
  }, [cartBase, addressId, coupon, isLoggedIn]);

  if (!cartBase) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-3">
          <h1 className="font-heading font-black text-2xl text-gray-900">Nothing to check out yet</h1>
          <p className="text-sm text-gray-600">Choose a plan first. Try a single day, or pick a weekly or monthly plan.</p>
          <div className="flex justify-center gap-2 pt-2">
            <Link href="/weekly" className="px-4 py-2.5 rounded-xl bg-ink text-white text-sm font-bold">Weekly plan</Link>
            <Link href="/monthly" className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-bold text-gray-800">Monthly plan</Link>
          </div>
        </div>
      </div>
    );
  }

  const handlePlace = async () => {
    setError('');
    setPlacing(true);
    const err = await submitOrder(
      { ...cartBase, addressId, couponCode: coupon },
      { newAddress: useNew ? addr : undefined, navigate: (h) => router.push(h) }
    );
    if (err) { setError(err); setPlacing(false); }
  };

  const q = quote?.ok ? quote : null;
  const newAddrValid = addr.recipientName.trim().length >= 2 && /^[6-9]\d{9}$/.test(addr.phone) && addr.flat.trim() && addr.street.trim().length >= 2 && addr.area.trim().length >= 2 && /^\d{6}$/.test(addr.pincode);

  return (
    <div className="min-h-screen bg-paper pb-24">
      <div className="bg-white border-b border-gray-200 py-4 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-xs font-bold text-gray-700"><ChevronLeft className="w-4 h-4" /> Back</button>
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700"><ShieldCheck className="w-4 h-4" /> Secure checkout</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <h1 className="font-heading font-black text-2xl text-ink">{cartBase.title}</h1>
        <p className="text-xs text-gray-500">{cartBase.mealsPerDay} meal{cartBase.mealsPerDay > 1 ? 's' : ''} a day · starts {cartBase.days[0]?.date}</p>

        {/* Address */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-heading font-bold text-sm text-gray-900 flex items-center gap-2"><MapPin className="w-4 h-4 text-ink" /> Delivery address</h2>
          {addresses.length > 0 && (
            <div className="space-y-2">
              {addresses.map((a) => (
                <label key={a.id} className={cn('flex gap-3 p-3 rounded-xl border cursor-pointer', !useNew && (selectedAddressId || addresses[0]?.id) === a.id ? 'border-ink bg-paper' : 'border-gray-200')}>
                  <input type="radio" name="addr" checked={!useNew && (selectedAddressId || addresses[0]?.id) === a.id} onChange={() => { setUseNew(false); setSelectedAddressId(a.id); }} className="mt-1" />
                  <span className="text-sm">
                    <b>{a.name}</b> · {a.phone}<br />
                    <span className="text-gray-600 text-xs">{a.flatNumber}, {a.street}{a.landmark ? `, ${a.landmark}` : ''}, {a.area} {a.pincode}</span>
                  </span>
                </label>
              ))}
              <button type="button" onClick={() => setUseNew(true)} className="flex items-center gap-1 text-xs font-bold text-ink"><Plus className="w-3.5 h-3.5" /> Add another address</button>
            </div>
          )}
          {useNew && (
            <div className="grid sm:grid-cols-2 gap-2">
              {([
                ['recipientName', 'Full name', 80], ['phone', '10-digit mobile', 10], ['flat', 'Flat / house no.', 120],
                ['street', 'Street', 160], ['landmark', 'Landmark (optional)', 120], ['area', 'Area', 80], ['pincode', 'Pincode', 6],
              ] as const).map(([k, label, max]) => (
                <input key={k} placeholder={label} maxLength={max} value={addr[k] ?? ''}
                  inputMode={k === 'phone' || k === 'pincode' ? 'numeric' : undefined}
                  onChange={(e) => setAddr({ ...addr, [k]: k === 'phone' || k === 'pincode' ? e.target.value.replace(/\D/g, '') : e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:bg-white focus:border-ink focus:outline-none" />
              ))}
            </div>
          )}
        </section>

        {/* Coupon */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2">
          <h2 className="font-heading font-bold text-sm text-gray-900 flex items-center gap-2"><Tag className="w-4 h-4 text-ink" /> Coupon</h2>
          <form onSubmit={(e) => { e.preventDefault(); setCoupon(couponInput.trim().toUpperCase() || undefined); }} className="flex gap-2">
            <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} maxLength={30} placeholder="Enter code"
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm uppercase focus:bg-white focus:border-ink focus:outline-none" />
            <button className="px-4 rounded-xl bg-gray-900 text-white text-xs font-bold">Apply</button>
          </form>
          {q?.couponMessage && <p className={cn('text-xs font-semibold', q.couponApplied ? 'text-emerald-700' : 'text-rose-700')}>{q.couponMessage}</p>}
          {useNew && coupon && <p className="text-xs text-gray-500">The coupon is checked when you place the order.</p>}
        </section>

        {/* Summary */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-heading font-bold text-sm text-gray-900 mb-3">Price</h2>
          {useNew ? (
            <p className="text-sm text-gray-600">Your exact price (including any delivery fee for your area) is shown on the next screen before you pay.</p>
          ) : !quote ? (
            <p className="text-sm text-gray-500">Calculating…</p>
          ) : !quote.ok ? (
            <p className="text-sm font-semibold text-rose-700">{quote.error}</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {quote.lines.map((l, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="text-gray-700">{l.name}{l.qty > 1 ? ` × ${l.qty}` : ''}</span>
                  <span className={l.total < 0 ? 'text-emerald-700' : ''}>{l.total < 0 ? `− ${inr(-l.total)}` : inr(l.total)}</span>
                </li>
              ))}
              <li className="flex justify-between pt-2 border-t border-gray-100 font-black text-base"><span>Total</span><span>{inr(quote.total)}</span></li>
            </ul>
          )}
        </section>

        {error && <p role="alert" className="text-sm font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</p>}

        <button
          type="button"
          onClick={handlePlace}
          disabled={placing || (useNew ? !newAddrValid : !q)}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-ink hover:bg-ink-soft disabled:opacity-50 text-white font-heading font-black text-sm shadow-lg"
        >
          <Lock className="w-4 h-4" />
          {placing ? 'Placing your order…' : q ? `Place order · ${inr(q.total)}` : 'Place order'}
        </button>
        <p className="text-center text-[11px] text-gray-500">You&apos;ll pay by UPI on the next screen. Meals are scheduled once payment is confirmed.</p>
        <OrderTerms className="text-center" />
      </div>
    </div>
  );
}
