'use client';

import React, { useState } from 'react';
import { MapPin, ArrowRight, ShieldCheck, Navigation, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDeliveryZones, zoneToUserLocation, ZoneLocation } from '@/lib/location';
import { BRAND } from '@/config/brand';
import { useAppStore } from '@/store/useAppStore';

export default function DeliveryAreasPage() {
  const { currentLocation, setCurrentLocation } = useAppStore();
  const { zones, loading } = useDeliveryZones();
  const [selectedPincode, setSelectedPincode] = useState(currentLocation.pincode);
  const selectedArea = zones.find((z) => z.pincode === selectedPincode) ?? zones[0];

  const coreZones = zones.filter((z) => z.tier === 'core');
  const phase2Zones = zones.filter((z) => z.tier === 'phase2');
  const phase2Fee = phase2Zones[0]?.deliveryFee ?? 35;

  const mapUrl = selectedArea
    ? `https://maps.google.com/maps?q=${encodeURIComponent(
        `${selectedArea.area}, Coimbatore, Tamil Nadu`
      )}&t=m&z=14&ie=UTF8&iwloc=&output=embed`
    : '';

  const areaRequestLink = `https://wa.me/${BRAND.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
    `Hi ${BRAND.name}! Please launch delivery in my area. Area: , Pincode: `
  )}`;

  const handleApplyZone = (zone: ZoneLocation) => {
    setSelectedPincode(zone.pincode);
    setCurrentLocation(zoneToUserLocation(zone));
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-8 sm:pt-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Simple Heading */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Coimbatore 10km Kitchen Delivery Network</span>
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-4xl text-gray-900 tracking-tight">
            Delivery Coverage &amp; Pincodes
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-2 max-w-2xl mx-auto">
            Dispatched hot twice daily from our central kitchen in Semmozhi Nagar, Kuniyamuthur.
            Core hub routes enjoy <strong>Free Delivery</strong>, while Phase 2 routes within our 10km radius have a nominal <strong>₹{phase2Fee} delivery charge</strong>.
          </p>
        </div>

        {loading && (
          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading delivery areas...</span>
          </div>
        )}

        {/* Section 1: Core Kitchen Hubs */}
        <div className="mt-8">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Core Kitchen Hub (0 - 4 km) • Free Delivery
            </h2>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              ₹0 Delivery Fee
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {coreZones.map((area) => {
              const isSelected = selectedArea?.pincode === area.pincode;
              return (
                <button
                  key={`${area.pincode}-${area.area}`}
                  type="button"
                  onClick={() => handleApplyZone(area)}
                  className={cn(
                    "px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all tap-active flex items-center gap-2 cursor-pointer border shadow-xs",
                    isSelected
                      ? "bg-[#124233] text-white border-[#124233] shadow-md scale-105"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <MapPin className={cn("w-3.5 h-3.5", isSelected ? "text-[#899545]" : "text-emerald-600")} />
                  <span>{area.area}</span>
                  <span className={cn("text-[11px] font-mono", isSelected ? "text-white/80" : "text-gray-400")}>
                    ({area.pincode})
                  </span>
                  {area.distanceKm === 0 ? (
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full font-black tracking-wider bg-emerald-500 text-white">
                      Hub
                    </span>
                  ) : (
                    <span className={cn("text-[10px]", isSelected ? "text-white/80" : "text-gray-400")}>
                      {area.distanceKm} km
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Phase 2 Extended Delivery Routes (<= 10km) */}
        <div className="mt-8">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-amber-600" />
              Phase 2 Routes (4 - 10 km) • Deliverable
            </h2>
            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              +₹{phase2Fee} Delivery Fee Applicable
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {phase2Zones.map((area) => {
              const isSelected = selectedArea?.pincode === area.pincode;
              return (
                <button
                  key={`${area.pincode}-${area.area}`}
                  type="button"
                  onClick={() => handleApplyZone(area)}
                  className={cn(
                    "px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all tap-active flex items-center gap-2 cursor-pointer border shadow-xs",
                    isSelected
                      ? "bg-[#124233] text-white border-[#124233] shadow-md scale-105"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <MapPin className={cn("w-3.5 h-3.5", isSelected ? "text-[#899545]" : "text-amber-600")} />
                  <span>{area.area}</span>
                  <span className={cn("text-[11px] font-mono", isSelected ? "text-white/80" : "text-gray-400")}>
                    ({area.pincode})
                  </span>
                  <span className={cn("text-[10px]", isSelected ? "text-white/80" : "text-gray-400")}>
                    {area.distanceKm} km
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* The Clean Google Map Preview */}
        {selectedArea && (
        <div className="mt-8 rounded-3xl overflow-hidden border border-gray-200 shadow-xl bg-white relative">
          <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#124233]" />
              <span className="font-bold text-gray-900">
                Viewing: {selectedArea.area} ({selectedArea.pincode})
              </span>
              <span className="text-gray-500">• {selectedArea.distanceKm} km from Kuniyamuthur Kitchen Hub</span>
            </div>
            <div className="flex items-center gap-2 font-bold">
              {selectedArea.tier === 'core' && (
                <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Core Zone • Free Delivery
                </span>
              )}
              {selectedArea.tier === 'phase2' && (
                <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                  Phase 2 • ₹{selectedArea.deliveryFee} Delivery Fee
                </span>
              )}
            </div>
          </div>
          <iframe
            title={`Delivery Map - ${selectedArea.area}`}
            src={mapUrl}
            className="w-full h-[400px] sm:h-[480px] border-0"
            loading="lazy"
            allowFullScreen
          />
        </div>
        )}

        {/* Minimal Footer Notice */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-gray-500">
          <span>Need delivery in another area of Coimbatore?</span>
          <a
            href={areaRequestLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[#124233] hover:underline inline-flex items-center gap-1"
          >
            <span>Request your area on WhatsApp</span>
            <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
