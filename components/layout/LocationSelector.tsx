'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  MapPin,
  ChevronDown,
  Check,
  Loader2,
  Search,
  Phone,
  BellRing,
  X,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useDeliveryZones, zoneToUserLocation, ZoneLocation, notifyMeLink, isPincode, locationFromPincode } from '@/lib/location';
import { cn } from '@/lib/utils';
import { BRAND } from '@/config/brand';
import { WhatsAppGlyph } from '@/components/ui/WhatsAppGlyph';

interface LocationSelectorProps {
  variant?: 'desktop' | 'mobile';
  className?: string;
}

export function LocationSelector({ variant = 'desktop', className }: LocationSelectorProps) {
  const { currentLocation, setCurrentLocation, locationConfirmed, setLocationPromptOpen } = useAppStore();
  const { zones, comingSoonZones, loading } = useDeliveryZones();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Full-screen sheet: slides in on open, slides out before unmounting.
  const [closing, setClosing] = useState(false);
  const open = () => { setClosing(false); setIsOpen(true); };
  const close = useCallback(() => {
    setClosing(true);
    window.setTimeout(() => {
      setIsOpen(false);
      setClosing(false);
      setSearchQuery('');
    }, 220);
  }, []);
  const toggle = () => (isOpen ? close() : open());

  // Lock page scroll and close on Escape while open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, close]);

  const handleSelectZone = (zone: ZoneLocation) => {
    setCurrentLocation(zoneToUserLocation(zone));
    close();
  };

  const filteredZones = zones.filter((z) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return z.area.toLowerCase().includes(q) || z.pincode.includes(q);
  });

  const filteredSoon = comingSoonZones.filter((z) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return z.area.toLowerCase().includes(q) || z.pincode.includes(q);
  });

  const areaRequestText = searchQuery.trim()
    ? `Hi ${BRAND.name}! I'd like delivery to my area: ${searchQuery.trim()} (pincode: ). Please let me know when you start delivering here.`
    : `Hi ${BRAND.name}! I'd like delivery to my area. Area: , Pincode: `;
  const areaRequestLink = `https://wa.me/${BRAND.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(areaRequestText)}`;

  // Until the visitor enters a pincode we show a prompt, not a guessed area.
  const displayPincode = locationConfirmed ? currentLocation.pincode : '';
  const displayArea = !locationConfirmed ? 'Enter pincode' : currentLocation.area || `Pincode ${currentLocation.pincode}`;
  const displaySub = !locationConfirmed
    ? 'Check delivery in Coimbatore'
    : currentLocation.isDeliverable
      ? `${displayPincode}, Coimbatore`
      : `${displayPincode} · Not delivering yet`;

  const openPincodePrompt = () => {
    setIsOpen(false);
    setClosing(false);
    setSearchQuery('');
    setLocationPromptOpen(true);
  };

  if (variant === 'mobile') {
    return (
      <div className={cn("relative z-50", className)}>
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-2 text-ink tap-active -ml-1 p-1 rounded-xl text-left"
        >
          <div className="w-8 h-8 rounded-full bg-ink/10 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-ink" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1 font-heading font-black text-sm text-ink">
              <span className="truncate max-w-[160px] sm:max-w-[200px]">{displayArea}</span>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 text-ink/70 transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </div>
            <span className={cn("text-[10px] font-semibold", locationConfirmed && !currentLocation.isDeliverable ? "text-amber-700" : "text-gray-500")}>{displaySub}</span>
          </div>
        </button>

        {isOpen && createPortal(renderDropdown(), document.body)}
      </div>
    );
  }

  return (
    <div className={cn("relative z-50", className)}>
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white hover:bg-sand/70 text-sm font-semibold text-ink transition-colors border border-ink/10"
      >
        <MapPin className="w-4 h-4 text-accent shrink-0" />
        <span className="truncate max-w-[160px] sm:max-w-[200px]">
          {locationConfirmed ? `${displayArea}${currentLocation.area ? `, ${displayPincode}` : ''}` : displayArea}
        </span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-ink/70 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && createPortal(renderDropdown(), document.body)}
    </div>
  );

  function renderDropdown() {
    const noMatches = !loading && filteredZones.length === 0 && filteredSoon.length === 0;
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Delivery location"
        className={cn(
          "fixed inset-0 z-[200] bg-paper flex flex-col duration-300 ease-out",
          closing
            ? "animate-out fade-out slide-out-to-top-6 fill-mode-forwards duration-200"
            : "animate-in fade-in slide-in-from-top-6"
        )}
      >
          {/* Header: same look as the order-flow step header */}
          <div className="bg-white border-b border-gray-200 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
            <div className="max-w-2xl mx-auto flex items-start justify-between gap-3">
              <div>
                <h4 className="font-heading font-black text-xl text-ink">Delivery location</h4>
                <p className="text-sm text-gray-600 mt-0.5">Dispatched fresh twice daily across Coimbatore</p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="shrink-0 w-10 h-10 rounded-full border border-gray-200 bg-white hover:border-ink flex items-center justify-center tap-active"
              >
                <X className="w-5 h-5 text-ink" />
              </button>
            </div>

            <div className="relative mt-3 max-w-2xl mx-auto">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search area or pincode"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink"
              />
            </div>
          </div>

          {/* Areas */}
          <div className="overflow-y-auto flex-1 min-h-0 p-4">
          <div className="max-w-2xl mx-auto space-y-3">
            {filteredZones.length > 0 && (
              <section className="bg-white rounded-2xl border border-gray-200 p-3 space-y-2">
                <h5 className="font-heading font-bold text-sm text-gray-900 px-0.5">Delivering now</h5>
                <div className="grid gap-2" role="radiogroup" aria-label="Delivery area">
                  {filteredZones.map((zone) => {
                    const isSelected = displayPincode === zone.pincode;
                    return (
                      <button
                        key={`${zone.pincode}-${zone.area}`}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => handleSelectZone(zone)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors tap-active",
                          isSelected ? "border-ink bg-paper ring-1 ring-ink" : "border-gray-200 bg-white hover:border-gray-300"
                        )}
                      >
                        <span className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0", isSelected ? "border-ink bg-ink text-white" : "border-gray-300")}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-heading font-bold text-sm text-gray-900">{zone.area}</span>
                          <span className="block text-xs text-gray-500 mt-0.5">
                            {zone.pincode} · {zone.distanceKm === 0 ? 'Our kitchen' : `${zone.distanceKm} km`}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs font-bold text-emerald-700">Free delivery</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {filteredSoon.length > 0 && (
              <section className="bg-white rounded-2xl border border-gray-200 p-3 space-y-2">
                <div className="px-0.5">
                  <h5 className="font-heading font-bold text-sm text-gray-900">Coming in our next batch</h5>
                  <p className="text-xs text-gray-500 mt-0.5">Tap yours and we&apos;ll message you the day we start.</p>
                </div>
                <div className="grid gap-2">
                  {filteredSoon.map((zone) => (
                    <a
                      key={`soon-${zone.pincode}-${zone.area}`}
                      href={notifyMeLink(BRAND.whatsappNumber, BRAND.name, zone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white px-3.5 py-3 text-left transition-colors hover:border-gray-400 tap-active"
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block font-heading font-bold text-sm text-gray-700">{zone.area}</span>
                        <span className="block text-xs text-gray-500 mt-0.5">{zone.pincode}</span>
                      </span>
                      <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-accent">
                        <BellRing className="w-3.5 h-3.5" />
                        Notify me
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {loading && (
              <div className="py-6 flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading delivery areas...</span>
              </div>
            )}

            {noMatches && (
              <section className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
                <p className="font-heading font-bold text-sm text-gray-900">
                  We don&apos;t deliver to &quot;{searchQuery.trim()}&quot; yet
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  We&apos;re expanding across Coimbatore. Send us your area and pincode below.
                </p>
                {isPincode(searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentLocation(locationFromPincode(searchQuery, zones, comingSoonZones));
                      close();
                    }}
                    className="mt-3 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-ink hover:border-ink"
                  >
                    Save {searchQuery.trim()} as my pincode
                  </button>
                )}
              </section>
            )}
          </div>

          </div>
          {/* Bottom bar: same as the flow's fixed bar */}
          <div className="bg-white border-t border-gray-200 px-4 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
            <div className="max-w-2xl mx-auto space-y-2">
            <button
              type="button"
              onClick={openPincodePrompt}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-ink hover:bg-ink-soft text-white font-heading font-black text-sm"
            >
              {locationConfirmed ? 'Change my pincode' : 'Enter my pincode'}
            </button>
            <p className="text-xs text-gray-500 text-center">Don&apos;t see your area?</p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={areaRequestLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 text-xs font-bold text-gray-900 tap-active"
              >
                <WhatsAppGlyph className="w-4 h-4 text-[#25D366]" />
                Request my area
              </a>
              <a
                href={`tel:${BRAND.whatsappNumber}`}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 text-xs font-bold text-gray-900 tap-active"
              >
                <Phone className="w-4 h-4" />
                Call kitchen
              </a>
            </div>
            </div>
          </div>
      </div>
    );
  }
}
