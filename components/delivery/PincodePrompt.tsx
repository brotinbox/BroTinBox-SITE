'use client';

import { useEffect, useRef, useState } from 'react';
import { useChrome } from '@/lib/layout/chrome';
import { BellRing, Check, Loader2, MapPin, ShieldCheck, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { BRAND } from '@/config/brand';
import { INTRO_ATTR, INTRO_DONE_EVENT } from '@/components/brand/intro';
import { UserLocation } from '@/types';
import {
  isPincode,
  locationFromPincode,
  notifyMeLink,
  useDeliveryZones,
  zoneToUserLocation,
} from '@/lib/location';

/** "Skip for now" lasts for this browser session; the popup asks again on the next visit. */
const SKIP_KEY = 'brotin-pincode-skipped';
/**
 * Pages where the popup would get in the way: checkout / payment (the address
 * form there has the pincode) and legal / policy reading.
 */

function readSkipped() {
  try {
    return sessionStorage.getItem(SKIP_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Asks for the visitor's pincode when they land (we don't use GPS), saves it in
 * the persisted store and keeps it in sync with the live delivery zones.
 * Mounted once in the site layout; the header picker reopens it.
 */
export function PincodePrompt() {
  // Policy pages, account screens and forms never get the first-visit ask (lib/layout/chrome.ts).
  const askHere = useChrome().pincodePrompt;
  const { zones, comingSoonZones, loading } = useDeliveryZones();
  const locationConfirmed = useAppStore((s) => s.locationConfirmed);
  const currentLocation = useAppStore((s) => s.currentLocation);
  const setCurrentLocation = useAppStore((s) => s.setCurrentLocation);
  const isOpen = useAppStore((s) => s.isLocationPromptOpen);
  const setOpen = useAppStore((s) => s.setLocationPromptOpen);
  const signInOpen = useAppStore((s) => !!s.signIn);
  const authReady = useAppStore((s) => s.authReady);
  const savedPincode = useAppStore((s) => {
    if (!s.isLoggedIn) return '';
    const a = s.addresses.find((x) => x.isDefault) ?? s.addresses[0];
    return a?.pincode ?? '';
  });

  const [hydrated, setHydrated] = useState(false);
  const [pin, setPin] = useState('');
  const [result, setResult] = useState<UserLocation | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // The store rehydrates from localStorage after the first render.
  useEffect(() => {
    if (useAppStore.persist.hasHydrated()) setHydrated(true);
    return useAppStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  // Signed-in customer with a saved address: use its pincode, never ask.
  useEffect(() => {
    if (!hydrated || locationConfirmed || !isPincode(savedPincode) || loading) return;
    setCurrentLocation(locationFromPincode(savedPincode, zones, comingSoonZones));
    setOpen(false);
  }, [hydrated, locationConfirmed, savedPincode, loading, zones, comingSoonZones, setCurrentLocation, setOpen]);

  // First visit: ask once the page has painted (and we know the visitor has
  // no saved address to take the pincode from).
  useEffect(() => {
    if (!hydrated || !authReady || locationConfirmed || isPincode(savedPincode) || readSkipped()) return;
    if (!askHere) return;
    // While the first-visit intro splash is up, wait for it to go before asking.
    let t: ReturnType<typeof setTimeout> | undefined;
    const ask = () => { t = setTimeout(() => setOpen(true), 600); };
    const introUp = document.documentElement.hasAttribute(INTRO_ATTR);
    if (introUp) window.addEventListener(INTRO_DONE_EVENT, ask, { once: true });
    else ask();
    return () => {
      clearTimeout(t);
      window.removeEventListener(INTRO_DONE_EVENT, ask);
    };
  }, [hydrated, authReady, locationConfirmed, savedPincode, askHere, setOpen]);

  // Keep a saved pincode in step with the zones (e.g. a next-batch area that has since launched).
  useEffect(() => {
    if (!hydrated || !locationConfirmed || loading || zones.length + comingSoonZones.length === 0) return;
    const fresh = locationFromPincode(currentLocation.pincode, zones, comingSoonZones);
    if (
      fresh.tier !== currentLocation.tier ||
      fresh.isDeliverable !== currentLocation.isDeliverable ||
      (fresh.area && fresh.area !== currentLocation.area)
    ) {
      setCurrentLocation(fresh);
    }
  }, [hydrated, locationConfirmed, loading, zones, comingSoonZones, currentLocation, setCurrentLocation]);

  // Fresh form each time it opens, prefilled with the saved pincode.
  useEffect(() => {
    if (!isOpen) return;
    setPin(locationConfirmed ? currentLocation.pincode : '');
    setResult(null);
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Check as soon as six digits are in (and the zones have loaded).
  useEffect(() => {
    if (!isOpen || !isPincode(pin) || loading) {
      setResult(null);
      return;
    }
    const loc = locationFromPincode(pin, zones, comingSoonZones);
    setResult(loc);
    setCurrentLocation(loc);
  }, [isOpen, pin, loading, zones, comingSoonZones, setCurrentLocation]);

  if (!isOpen || signInOpen) return null;

  const close = () => {
    if (!useAppStore.getState().locationConfirmed) {
      try {
        sessionStorage.setItem(SKIP_KEY, '1');
      } catch {
        /* private mode: it may ask again on the next page, which is fine */
      }
    }
    setOpen(false);
  };

  const comingSoon = result && !result.isDeliverable && result.tier === 'phase2';
  const notCovered = result && !result.isDeliverable && result.tier !== 'phase2';
  const waLink = result
    ? notifyMeLink(BRAND.whatsappNumber, BRAND.name, { area: result.area || 'my area', pincode: result.pincode })
    : '';

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Enter your delivery pincode">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={close} aria-hidden="true" />

      <div className="relative w-full sm:max-w-[440px] max-h-[92dvh] overflow-y-auto bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 sm:zoom-in-95 fade-in duration-300 pb-[env(safe-area-inset-bottom)]">
        <div className="sm:hidden flex justify-center pt-2.5">
          <span className="h-1 w-10 rounded-full bg-gray-200" />
        </div>

        <div className="px-6 sm:px-8 pt-4 sm:pt-7 pb-7 sm:pb-8">
          <div className="flex items-start justify-between gap-3">
            <div className="w-11 h-11 rounded-2xl bg-accent/10 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-accent" />
            </div>
            <button
              type="button"
              onClick={close}
              className="p-2 -mr-2 -mt-1 rounded-full text-gray-400 hover:text-ink hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h2 className="mt-3 font-heading font-black text-xl sm:text-2xl text-ink tracking-tight">
            Where should we deliver?
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Enter your pincode to check delivery. Delivery is free in every area we serve.
          </p>

          <form
            className="mt-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (result?.isDeliverable) setOpen(false);
            }}
          >
            <label htmlFor="pincode-prompt" className="sr-only">Pincode</label>
            <div className="relative">
              <input
                id="pincode-prompt"
                ref={inputRef}
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit pincode, e.g. 641008"
                className="w-full rounded-2xl border-2 border-gray-200 focus:border-ink focus:outline-none px-4 py-3.5 text-lg font-bold tracking-[0.2em] text-ink placeholder:text-sm placeholder:font-medium placeholder:tracking-normal placeholder:text-gray-400"
              />
              {loading && isPincode(pin) && (
                <Loader2 className="w-5 h-5 animate-spin text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
              )}
            </div>
            {pin.length > 0 && pin.length < 6 && (
              <p className="mt-1.5 text-[11px] font-semibold text-gray-400">{6 - pin.length} more digit{pin.length === 5 ? '' : 's'}</p>
            )}

            {result?.isDeliverable && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-800">
                  <ShieldCheck className="w-4 h-4" />
                  We deliver to {result.area}!
                </p>
                <p className="mt-0.5 text-xs text-emerald-700">Free delivery, lunch and dinner runs.</p>
                <button
                  type="submit"
                  className="mt-3 w-full rounded-xl bg-ink hover:bg-ink-soft text-white font-bold text-sm py-3 transition-colors"
                >
                  Continue
                </button>
              </div>
            )}

            {(comingSoon || notCovered) && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <p className="text-sm font-bold">
                  {comingSoon
                    ? `${result!.area} is in our next delivery batch.`
                    : `We don't deliver to ${result!.pincode} yet.`}
                </p>
                <p className="mt-0.5 text-xs">
                  We&apos;ll message you on WhatsApp the day we start. You can still look around the menu.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs py-2.5"
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    Notify me
                  </a>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl bg-white border border-amber-300 font-bold text-xs py-2.5 hover:bg-amber-100"
                  >
                    Browse menu
                  </button>
                </div>
              </div>
            )}
          </form>

          {zones.length > 0 && !result?.isDeliverable && (
            <div className="mt-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Or pick your area</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {zones.map((z) => {
                  const selected = locationConfirmed && currentLocation.pincode === z.pincode;
                  return (
                    <button
                      key={`${z.pincode}-${z.area}`}
                      type="button"
                      onClick={() => {
                        setCurrentLocation(zoneToUserLocation(z));
                        setOpen(false);
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-ink/15 bg-sand/60 hover:bg-sand px-3 py-1.5 text-xs font-semibold text-ink"
                    >
                      {selected && <Check className="w-3 h-3" />}
                      {z.area}
                      <span className="font-mono text-[10px] text-gray-500">{z.pincode}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!locationConfirmed && (
            <button
              type="button"
              onClick={close}
              className="mt-5 w-full text-center text-xs font-semibold text-gray-400 hover:text-ink"
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
