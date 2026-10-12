'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  ChevronDown,
  Check,
  Loader2,
  Search,
  Phone,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useDeliveryZones, zoneToUserLocation, ZoneLocation } from '@/lib/location';
import { cn } from '@/lib/utils';
import { BRAND } from '@/config/brand';

interface LocationSelectorProps {
  variant?: 'desktop' | 'mobile';
  className?: string;
}

export function LocationSelector({ variant = 'desktop', className }: LocationSelectorProps) {
  const { currentLocation, setCurrentLocation } = useAppStore();
  const { zones, loading } = useDeliveryZones();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset a saved location that is no longer an active zone (or an old "Ward 88" label)
  useEffect(() => {
    if (loading || zones.length === 0) return;
    const match = zones.find((z) => z.pincode === currentLocation?.pincode);
    if (!match || /ward/i.test(currentLocation.area)) {
      setCurrentLocation(zoneToUserLocation(match ?? zones[0]));
    }
  }, [loading, zones, currentLocation, setCurrentLocation]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectZone = (zone: ZoneLocation) => {
    setCurrentLocation(zoneToUserLocation(zone));
    setIsOpen(false);
    setSearchQuery('');
  };

  const filteredZones = zones.filter((z) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return z.area.toLowerCase().includes(q) || z.pincode.includes(q);
  });

  const areaRequestText = searchQuery.trim()
    ? `Hi ${BRAND.name}! I'd like delivery to my area: ${searchQuery.trim()} (pincode: ). Please let me know when you start delivering here.`
    : `Hi ${BRAND.name}! I'd like delivery to my area. Area: , Pincode: `;
  const areaRequestLink = `https://wa.me/${BRAND.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(areaRequestText)}`;

  const displayArea = currentLocation?.area || 'Kuniyamuthur';
  const displayPincode = currentLocation?.pincode || '641008';

  if (variant === 'mobile') {
    return (
      <div className={cn("relative z-50", className)} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-[#124233] tap-active -ml-1 p-1 rounded-xl text-left"
        >
          <div className="w-8 h-8 rounded-full bg-[#124233]/10 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-[#124233]" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1 font-heading font-black text-sm text-[#124233]">
              <span className="truncate max-w-[160px] sm:max-w-[200px]">{displayArea}</span>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 text-[#124233]/70 transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </div>
            <span className="text-[10px] text-gray-500 font-semibold">{displayPincode}, Coimbatore</span>
          </div>
        </button>

        {isOpen && renderDropdown(true)}
      </div>
    );
  }

  return (
    <div className={cn("relative z-50", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/85 hover:bg-white text-xs sm:text-sm font-bold text-[#124233] transition-all border border-[#124233]/10 shadow-xs hover:shadow-sm"
      >
        <MapPin className="w-4 h-4 text-[#899545] shrink-0" />
        <span className="truncate max-w-[160px] sm:max-w-[200px]">
          {displayArea}, {displayPincode}
        </span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-[#124233]/70 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && renderDropdown(false)}
    </div>
  );

  function renderDropdown(isMobile: boolean) {
    return (
      <>
        {/* Backdrop on mobile */}
        <div
          className="fixed inset-0 z-50 bg-black/20 sm:hidden"
          onClick={() => setIsOpen(false)}
        />
        <div
          className={cn(
            "absolute mt-2 w-[calc(100vw-1.5rem)] max-w-sm sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]",
            isMobile ? "left-0" : "right-0"
          )}
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-gray-100 bg-[#F5F8EC]/50">
            <h4 className="font-heading font-black text-sm text-[#124233]">
              Select Delivery Location
            </h4>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Dispatched fresh twice daily across Coimbatore
            </p>

            {/* Search Input */}
            <div className="relative mt-3">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search area or pincode (e.g. RS Puram, 641002)"
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:border-[#124233]"
              />
            </div>
          </div>

          {/* Zones Scrollable List */}
          <div className="overflow-y-auto max-h-64 divide-y divide-gray-100 flex-1 p-2 text-xs">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Available Delivery Areas
            </div>
            {filteredZones.map((zone) => {
              const isSelected = displayPincode === zone.pincode;
              return (
                <button
                  key={`${zone.pincode}-${zone.area}`}
                  type="button"
                  onClick={() => handleSelectZone(zone)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors",
                    isSelected
                      ? "bg-[#F5F8EC] text-[#124233] font-bold"
                      : "hover:bg-gray-50 text-gray-700"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <MapPin
                      className={cn(
                        "w-3.5 h-3.5 shrink-0",
                        isSelected ? "text-[#899545]" : "text-gray-400"
                      )}
                    />
                    <span className="font-semibold text-gray-900">{zone.area}</span>
                    <span className="text-[10px] font-mono text-gray-400">
                      ({zone.pincode})
                    </span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#124233] stroke-[3]" />}
                </button>
              );
            })}

            {loading && (
              <div className="py-6 flex items-center justify-center gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading delivery areas...</span>
              </div>
            )}

            {!loading && filteredZones.length === 0 && (
              <div className="py-6 text-center text-gray-500">
                <p className="font-bold">We don&apos;t deliver to &quot;{searchQuery.trim()}&quot; yet</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  We&apos;re expanding across Coimbatore. Send us your area and pincode below!
                </p>
              </div>
            )}
          </div>

          {/* Bottom WhatsApp / Call Order Assistance */}
          <div className="p-3.5 bg-[#F5F8EC] border-t border-[#124233]/10">
            <p className="text-[11px] font-bold text-[#124233] mb-2">
              Don&apos;t see your area? Tell us your area &amp; pincode and we&apos;ll reach out.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={areaRequestLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] active:scale-[0.98] text-white font-bold text-[11px] sm:text-xs whitespace-nowrap transition-all shadow-2xs"
              >
                <img
                  src="https://img.icons8.com/color/480/whatsapp--v1.png"
                  alt="WhatsApp"
                  className="w-3.5 h-3.5 shrink-0 object-contain"
                />
                <span>Request My Area</span>
              </a>
              <a
                href={`tel:${BRAND.whatsappNumber}`}
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-[#124233] hover:bg-[#0E3529] active:scale-[0.98] text-white font-bold text-[11px] sm:text-xs whitespace-nowrap transition-all shadow-2xs"
              >
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span>Call Kitchen</span>
              </a>
            </div>
          </div>
        </div>
      </>
    );
  }
}
