'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronLeft, Clock, Loader2, Lock, MapPin, Minus, Plus, ShieldCheck, Tag, Trash2 } from 'lucide-react';
import { useAppStore, MAX_ADDON_QTY, type CartPlan } from '@/store/useAppStore';
import { getCheckoutAddons, getQuote, type CheckoutAddon, type QuoteResult } from '@/lib/checkout/actions';
import type { Cart } from '@/lib/checkout/quote';
import { SIGN_IN_PENDING, submitOrder, type NewAddressInput } from '@/lib/checkout/submit';
import { clearDraft } from '@/lib/checkout/draft';
import { OrderErrorNotice } from '@/components/checkout/OrderErrorNotice';
import { AddonRail } from '@/components/checkout/AddonRail';
import { FreeJuiceCard } from '@/components/checkout/FreeJuiceCard';
import { PlanDetails } from '@/components/checkout/PlanDetails';
import { PlanPicks } from '@/components/checkout/PlanPicks';
import { forgetTrialStatus } from '@/components/trial/TrialGate';
import { PincodeStatus } from '@/components/delivery/PincodeStatus';
import { OrderTerms } from '@/components/legal/OrderTerms';
import { cn } from '@/lib/utils';
import { useSavedLocation } from '@/lib/location';
import { SLOT_TIME } from '@/lib/meal-display';

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

/** Where to change the plan itself. */
const PLAN_EDIT_HREF: Record<CartPlan['type'], string> = { trial: '/tomorrow', weekly: '/weekly', monthly: '/monthly' };

export default function CheckoutPage() {
  const router = useRouter();
  const {
    cartPlan, cartAddons, setCartAddonQty, addCartAddon, clearCart,
    addresses, selectedAddressId, setSelectedAddressId, addAddress, isLoggedIn, authReady, user,
  } = useAppStore();

  // ----- address (Swiggy-style card: saved one pre-selected, form only when needed)
  const [useNew, setUseNew] = useState(false);
  const [showAddressList, setShowAddressList] = useState(false);
  const [addr, setAddr] = useState<NewAddressInput>({ recipientName: '', phone: '', flat: '', street: '', landmark: '', area: '', pincode: '' });
  const saved = useSavedLocation();
  useEffect(() => {
    setAddr((a) => ({
      ...a,
      recipientName: a.recipientName || user.fullName,
      phone: a.phone || user.phone.replace(/^\+91/, ''),
      area: a.area || saved.area,
      pincode: a.pincode || saved.pincode,
    }));
  }, [user.fullName, user.phone, saved.area, saved.pincode]);
  useEffect(() => { if (authReady && addresses.length === 0) setUseNew(true); }, [authReady, addresses.length]);

  const enteringNew = useNew || !isLoggedIn || addresses.length === 0;
  const savedAddress = addresses.find((a) => a.id === selectedAddressId) ?? addresses.find((a) => a.isDefault) ?? addresses[0];
  const addressId = enteringNew ? undefined : savedAddress?.id;
  const pincode = enteringNew ? addr.pincode : savedAddress?.pincode ?? '';
  const newAddrValid = addr.recipientName.trim().length >= 2 && /^[6-9]\d{9}$/.test(addr.phone) && !!addr.flat.trim()
    && addr.street.trim().length >= 2 && addr.area.trim().length >= 2 && /^\d{6}$/.test(addr.pincode);

  // ----- live sides & juices (admin prices / availability)
  const [catalog, setCatalog] = useState<CheckoutAddon[]>([]);
  useEffect(() => { getCheckoutAddons().then(setCatalog).catch(() => {}); }, []);

  // ----- coupon, offers consent
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<string | undefined>();
  const [offersOptIn, setOffersOptIn] = useState(false);
  // ----- poster offers: free-juice picks and the referral code
  const [freePicks, setFreePicks] = useState<Record<string, { juice: string; day: number }>>({});
  const [showReferral, setShowReferral] = useState(false);
  const [referralInput, setReferralInput] = useState('');
  const [referral, setReferral] = useState<string | undefined>();

  // ----- server quote (debounced; works signed out from the pincode)
  const cart = useMemo((): (Omit<Cart, 'addressId'> & { addressId?: string }) | null => {
    if (!cartPlan) return null;
    return {
      type: cartPlan.type, mealsPerDay: cartPlan.mealsPerDay, boxSize: cartPlan.boxSize ?? 'regular', slot: cartPlan.slot, days: cartPlan.days,
      preferences: cartPlan.preferences,
      addons: cartAddons.map((a) => ({ id: a.id, qty: a.qty })), addonIds: [],
      addressId, pincode: /^\d{6}$/.test(pincode) ? pincode : undefined, couponCode: coupon,
      freeJuices: Object.entries(freePicks).map(([key, p]) => ({ key, ...p })), referralCode: referral,
      whatsappOffers: offersOptIn || undefined,
    };
  }, [cartPlan, cartAddons, addressId, pincode, coupon, freePicks, referral, offersOptIn]);

  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoting, setQuoting] = useState(false);
  const quoteKey = cart && (cart.addressId || cart.pincode) ? JSON.stringify({ ...cart, whatsappOffers: undefined }) : '';
  useEffect(() => {
    if (!quoteKey || !cart) { setQuote(null); return; }
    let cancelled = false;
    setQuoting(true);
    const t = setTimeout(() => {
      getQuote(cart as Cart)
        .then((q) => { if (!cancelled) setQuote(q); })
        .finally(() => { if (!cancelled) setQuoting(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey]);

  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  // Order created by an attempt whose payment couldn't open: the retry pays it
  // instead of placing a second order. A changed cart means a new order.
  const [placed, setPlaced] = useState<{ id: string; key: string } | null>(null);
  const placedOrderId = placed && placed.key === quoteKey ? placed.id : null;
  const [leaving, setLeaving] = useState(false);
  const [billOpen, setBillOpen] = useState(true);

  const q = quote?.ok ? quote : null;
  const days = cartPlan?.days.length ?? 0;
  const addonsEstimate = cartAddons.reduce((s, a) => s + a.price * a.qty * Math.max(days, 1), 0);
  const estimate = (cartPlan?.estimate ?? 0) + addonsEstimate;
  const total = q ? q.total : estimate;
  const allVeg = !!cartPlan && cartPlan.days.every((d) => d.diet === 'veg');
  const planLinesTotal = q ? q.lines.filter((l) => l.item_type === 'meal').reduce((s, l) => s + l.total, 0) : cartPlan?.estimate ?? 0;
  const addonSlotLabel = cartPlan ? (cartPlan.mealsPerDay === 2 || cartPlan.slot === 'lunch' ? 'lunch' : 'dinner') : 'lunch';

  const handlePlace = async () => {
    if (!cart) return;
    setError('');
    setPlacing(true);
    const key = quoteKey;
    const snapshot = { cartPlan, cartAddons };
    const err = await submitOrder(
      { ...cart, addressId },
      {
        newAddress: enteringNew ? addr : undefined,
        navigate: (h) => router.push(h),
        onSignedIn: () => { handlePlace(); },
        onAddressSaved: (id) => {
          addAddress({ id, name: addr.recipientName, phone: addr.phone, tag: 'Home', flatNumber: addr.flat, street: addr.street, landmark: addr.landmark, area: addr.area, pincode: addr.pincode, city: 'Coimbatore', isDefault: addresses.length === 0 });
          setSelectedAddressId(id);
          setUseNew(false);
        },
        placedOrderId: placedOrderId ?? undefined,
        onPlaced: (id) => setPlaced({ id, key }),
        onLeaving: () => { setLeaving(true); clearCart(); clearDraft('trial'); clearDraft('weekly'); forgetTrialStatus(); },
      }
    );
    if (err) {
      // Cashfree refused after the cart was cleared: put it back for the retry.
      if (!useAppStore.getState().cartPlan && snapshot.cartPlan) useAppStore.setState(snapshot);
      setLeaving(false);
      setError(err === SIGN_IN_PENDING ? '' : err);
      setPlacing(false);
    }
  };

  // Cart was just cleared because Cashfree is opening: don't flash "empty cart".
  if (leaving) {
    return (
      <div className="min-h-[70vh] bg-paper flex flex-col items-center justify-center gap-3 px-4">
        <Loader2 className="w-6 h-6 animate-spin text-ink" />
        <p className="font-heading font-bold text-sm text-ink">Opening secure payment…</p>
      </div>
    );
  }

  // ----- empty states
  if (!cartPlan) {
    return (
      <div className="min-h-[70vh] bg-paper px-4 py-10">
        <div className="max-w-md mx-auto space-y-4">
          <h1 className="font-heading font-black text-2xl text-ink text-center">
            {cartAddons.length ? 'Pick a box for your extras' : 'Your cart is empty'}
          </h1>
          <p className="text-sm text-gray-600 text-center">
            {cartAddons.length
              ? `Sides and juices come in the same bag as your box. Choose a box and your ${cartAddons.length === 1 ? 'extra stays' : `${cartAddons.length} extras stay`} in the cart.`
              : 'Choose a box first: a single day to try us, or a weekly or monthly plan.'}
          </p>
          <PlanPicks />
          {cartAddons.length > 0 && (
            <ul className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
              {cartAddons.map((a) => (
                <li key={a.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-gray-800">{a.name}{a.qty > 1 ? ` × ${a.qty}` : ''}</span>
                  <button type="button" onClick={() => setCartAddonQty(a.id, 0)} aria-label={`Remove ${a.name}`} className="p-1 text-gray-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  const canPay = !placing && (enteringNew ? newAddrValid : !!addressId) && !(quote && !quote.ok);

  return (
    <div className="min-h-screen bg-paper pb-40">
      <div className="bg-white border-b border-gray-200 py-3.5 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-xs font-bold text-gray-700"><ChevronLeft className="w-4 h-4" /> Back</button>
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700"><ShieldCheck className="w-4 h-4" /> Secure checkout</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">
        {/* ---------- Deliver to ---------- */}
        <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-ink shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              {!enteringNew && savedAddress ? (
                <>
                  <p className="font-heading font-bold text-sm text-gray-900">Deliver to {savedAddress.tag} · {savedAddress.area}</p>
                  <p className="text-xs text-gray-600 truncate">{savedAddress.flatNumber}, {savedAddress.street}{savedAddress.landmark ? `, ${savedAddress.landmark}` : ''}, {savedAddress.pincode}</p>
                  <p className="text-[11px] text-gray-400">{savedAddress.name} · {savedAddress.phone}</p>
                </>
              ) : (
                <p className="font-heading font-bold text-sm text-gray-900">Where should we deliver?</p>
              )}
            </div>
            {isLoggedIn && addresses.length > 0 && (
              <button type="button" onClick={() => { setShowAddressList((v) => !v); }} className="text-xs font-black text-accent uppercase shrink-0">
                {showAddressList ? 'Close' : 'Change'}
              </button>
            )}
          </div>

          {showAddressList && (
            <div className="space-y-2">
              {addresses.map((a) => (
                <button key={a.id} type="button"
                  onClick={() => { setSelectedAddressId(a.id); setUseNew(false); setShowAddressList(false); }}
                  className={cn('w-full text-left p-3 rounded-xl border text-xs', !enteringNew && savedAddress?.id === a.id ? 'border-ink bg-paper' : 'border-gray-200')}>
                  <b className="text-gray-900">{a.tag} · {a.area}</b><br />
                  <span className="text-gray-600">{a.flatNumber}, {a.street}, {a.pincode}</span>
                </button>
              ))}
              <button type="button" onClick={() => { setUseNew(true); setShowAddressList(false); }} className="flex items-center gap-1 text-xs font-bold text-ink">
                <Plus className="w-3.5 h-3.5" /> Add a new address
              </button>
            </div>
          )}

          {enteringNew && (
            <div className="grid grid-cols-2 gap-2">
              <Field className="col-span-2" placeholder="Flat / house no., building" value={addr.flat} max={120} onChange={(v) => setAddr({ ...addr, flat: v })} autoFocus={!!addr.pincode} />
              <Field className="col-span-2" placeholder="Street" value={addr.street} max={160} onChange={(v) => setAddr({ ...addr, street: v })} />
              <Field className="col-span-2" placeholder="Landmark (optional)" value={addr.landmark ?? ''} max={120} onChange={(v) => setAddr({ ...addr, landmark: v })} />
              <Field placeholder="Area" value={addr.area} max={80} onChange={(v) => setAddr({ ...addr, area: v })} />
              <Field placeholder="Pincode" value={addr.pincode} max={6} numeric onChange={(v) => setAddr({ ...addr, pincode: v })} />
              <div className="col-span-2 -mt-1"><PincodeStatus pincode={addr.pincode} /></div>
              <Field placeholder="Your name" value={addr.recipientName} max={80} onChange={(v) => setAddr({ ...addr, recipientName: v })} />
              <Field placeholder="10-digit mobile" value={addr.phone} max={10} numeric onChange={(v) => setAddr({ ...addr, phone: v })} />
              {isLoggedIn && addresses.length > 0 && (
                <button type="button" onClick={() => setUseNew(false)} className="col-span-2 text-left text-xs font-bold text-ink">Use a saved address</button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-gray-600 border-t border-gray-100 pt-2.5">
            <Clock className="w-4 h-4 text-ink shrink-0" />
            <span>
              {cartPlan.mealsPerDay === 2 ? `Lunch ${SLOT_TIME.lunch} & dinner ${SLOT_TIME.dinner}` : `${cartPlan.slot === 'dinner' ? 'Dinner' : 'Lunch'} ${SLOT_TIME[cartPlan.slot]}`}
              {' · '}{days > 1 ? `from ${shortDate(cartPlan.days[0].date)}` : shortDate(cartPlan.days[0].date)}
              {' · '}<b className="text-emerald-700">Free delivery</b>
            </span>
          </div>
        </section>

        {/* ---------- Items ---------- */}
        <section className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-heading font-black text-sm text-gray-900">{cartPlan.title}</p>
                <p className="text-xs text-gray-500">
                  {days} day{days > 1 ? 's' : ''} · {cartPlan.mealsPerDay} meal{cartPlan.mealsPerDay > 1 ? 's' : ''} a day
                </p>
              </div>
              <span className="font-heading font-black text-sm text-gray-900 shrink-0">{inr(planLinesTotal)}</span>
            </div>
            <PlanDetails plan={cartPlan} editHref={PLAN_EDIT_HREF[cartPlan.type]} />
          </div>

          {cartAddons.map((a) => (
            <div key={a.id} className="p-4 flex items-center gap-3">
              {a.image ? <img src={a.image} alt="" className="w-11 h-11 rounded-xl object-cover bg-gray-100 shrink-0" /> : <div className="w-11 h-11 rounded-xl bg-gray-100 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{a.name}</p>
                <p className="text-[11px] text-gray-500">
                  {inr(a.price)} each · with your {addonSlotLabel} box{days > 1 ? `, every day (${days} days)` : ''}
                </p>
              </div>
              <Stepper qty={a.qty} onChange={(n) => setCartAddonQty(a.id, n)} label={a.name} />
              <span className="w-16 text-right text-sm font-bold text-gray-900 shrink-0">{inr(a.price * a.qty * Math.max(days, 1))}</span>
            </div>
          ))}
        </section>

        {/* ---------- Poster offers: free juices ---------- */}
        {q && (
          <FreeJuiceCard
            offers={q.offers}
            dates={cartPlan.days.map((d) => d.date)}
            onPick={(key, pick) => setFreePicks((p) => ({ ...p, [key]: pick }))}
          />
        )}

        {/* ---------- Complete your meal ---------- */}
        <AddonRail
          catalog={catalog.filter((c) => !(allVeg && !c.isVeg))}
          inCart={new Set(cartAddons.map((a) => a.id))}
          days={days}
          onAdd={(c) => addCartAddon({ id: c.id, name: c.name, price: c.price, image: c.image, type: c.type })}
        />

        {/* ---------- Coupon ---------- */}
        <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
          <form onSubmit={(e) => { e.preventDefault(); setCoupon(couponInput.trim().toUpperCase() || undefined); }} className="flex gap-2 items-center">
            <Tag className="w-4 h-4 text-ink shrink-0" />
            <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} maxLength={30} placeholder="Coupon code"
              className="flex-1 min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm uppercase focus:bg-white focus:border-ink focus:outline-none" />
            <button className="px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold">Apply</button>
          </form>
          {q?.couponMessage && <p className={cn('text-xs font-semibold', q.couponApplied ? 'text-emerald-700' : 'text-rose-700')}>{q.couponMessage}</p>}
          {q?.offers.referralOn && cartPlan.type !== 'trial' && (
            showReferral ? (
              <form onSubmit={(e) => { e.preventDefault(); setReferral(referralInput.trim().toUpperCase() || undefined); }} className="flex gap-2 items-center pt-1">
                <span className="w-4 shrink-0" />
                <input value={referralInput} onChange={(e) => setReferralInput(e.target.value)} maxLength={20} placeholder="Friend's referral code" autoFocus
                  className="flex-1 min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm uppercase focus:bg-white focus:border-ink focus:outline-none" />
                <button className="px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold">Apply</button>
              </form>
            ) : (
              <button type="button" onClick={() => setShowReferral(true)} className="pl-6 text-xs font-bold text-accent hover:underline underline-offset-2">
                Have a referral code?
              </button>
            )
          )}
          {referral && q?.offers.referral && (
            <p className={cn('pl-6 text-xs font-semibold', q.offers.referral.applied ? 'text-emerald-700' : 'text-rose-700')}>{q.offers.referral.message}</p>
          )}
        </section>

        {/* ---------- Bill ---------- */}
        <section className="bg-white rounded-2xl border border-gray-200 p-4">
          <button type="button" onClick={() => setBillOpen((v) => !v)} className="w-full flex items-center justify-between">
            <span className="font-heading font-bold text-sm text-gray-900">Bill details</span>
            <ChevronDown className={cn('w-4 h-4 text-gray-500 transition-transform', billOpen && 'rotate-180')} />
          </button>
          {quote && !quote.ok ? (
            <OrderErrorNotice className="mt-3" error={quote.code ? `${quote.code}::${quote.error}` : quote.error} />
          ) : (
            <>
              {billOpen && (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {q ? q.lines.map((l, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span className="text-gray-600">{l.name}{l.item_type === 'meal' && l.qty > 1 ? ` × ${l.qty}` : ''}</span>
                      <span className={l.total <= 0 ? 'text-emerald-700 font-semibold' : 'text-gray-900'}>{l.total < 0 ? `− ${inr(-l.total)}` : l.total === 0 ? 'FREE' : inr(l.total)}</span>
                    </li>
                  )) : (
                    <li className="text-xs text-gray-500">{pincode.length === 6 ? 'Calculating…' : 'Enter your pincode to see the exact price.'}</li>
                  )}
                  <li className="flex justify-between gap-3"><span className="text-gray-600">Delivery</span><span className="text-emerald-700 font-semibold">FREE</span></li>
                </ul>
              )}
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between font-heading font-black text-base">
                <span>To pay</span>
                <span className={cn(quoting && 'opacity-50')}>{inr(total)}</span>
              </div>
            </>
          )}
        </section>

        {cartPlan.type === 'trial' && (
          <label className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer px-1">
            <input type="checkbox" checked={offersOptIn} onChange={(e) => setOffersOptIn(e.target.checked)} className="mt-0.5 accent-ink" />
            <span>WhatsApp me plan offers after my trial. A few messages at most, stop anytime.</span>
          </label>
        )}
        {cartAddons.length > 0 && (
          <p className="text-[11px] text-gray-500 px-1">Sides and juices come in the same bag as your box. To change them later, WhatsApp us before 9 PM the day before.</p>
        )}
        {error && <OrderErrorNotice error={error} />}
        <OrderTerms className="text-center" />
      </div>

      {/* ---------- Sticky pay bar ---------- */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)]">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="min-w-0">
            <p className={cn('font-heading font-black text-lg text-ink leading-none', quoting && 'opacity-50')}>{inr(total)}</p>
            <button type="button" onClick={() => { setBillOpen(true); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }} className="text-[11px] font-bold text-accent">View bill</button>
          </div>
          <button
            type="button"
            onClick={handlePlace}
            disabled={!canPay}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-ink hover:bg-ink-soft disabled:opacity-50 text-white font-heading font-black text-sm"
          >
            <Lock className="w-4 h-4" />
            {placing ? (placedOrderId ? 'Opening payment…' : 'Placing your order…') : !isLoggedIn ? 'Verify number & pay' : placedOrderId ? 'Try payment again' : 'Place order & pay'}
          </button>
        </div>
        {enteringNew && !newAddrValid && (
          <p className="max-w-2xl mx-auto mt-1.5 text-[11px] text-gray-500">Fill in your address above to continue.</p>
        )}
      </div>
    </div>
  );
}

function Field({ placeholder, value, onChange, max, numeric, className, autoFocus }: {
  placeholder: string; value: string; onChange: (v: string) => void; max: number; numeric?: boolean; className?: string; autoFocus?: boolean;
}) {
  return (
    <input
      placeholder={placeholder} aria-label={placeholder} maxLength={max} value={value} autoFocus={autoFocus}
      inputMode={numeric ? 'numeric' : undefined}
      onChange={(e) => onChange(numeric ? e.target.value.replace(/\D/g, '') : e.target.value)}
      className={cn('w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:bg-white focus:border-ink focus:outline-none', className)}
    />
  );
}

function Stepper({ qty, onChange, label }: { qty: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex items-center rounded-lg border border-ink text-ink shrink-0">
      <button type="button" onClick={() => onChange(qty - 1)} aria-label={`One less ${label}`} className="p-1.5"><Minus className="w-3.5 h-3.5" /></button>
      <span className="w-5 text-center text-sm font-black">{qty}</span>
      <button type="button" onClick={() => onChange(qty + 1)} disabled={qty >= MAX_ADDON_QTY} aria-label={`One more ${label}`} className="p-1.5 disabled:opacity-40"><Plus className="w-3.5 h-3.5" /></button>
    </div>
  );
}
