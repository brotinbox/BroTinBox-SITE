'use client';

import { AlertTriangle, BellRing, ShieldCheck } from 'lucide-react';
import { BRAND } from '@/config/brand';
import { notifyMeLink, useDeliveryZones } from '@/lib/location';

/**
 * Pincode feedback under an address form: delivering now (free), next batch
 * (notify me on WhatsApp), or not a pincode we know yet.
 */
export function PincodeStatus({ pincode }: { pincode: string }) {
  const { getZoneByPincode, getComingSoonZone } = useDeliveryZones();
  const pin = pincode.trim();
  if (pin.length !== 6) {
    return (
      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-amber-600 font-semibold">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Enter valid 6-digit Coimbatore pincode (641xxx)</span>
      </div>
    );
  }

  const zone = getZoneByPincode(pin);
  if (zone) {
    return (
      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-700 font-semibold">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Delivery available: {zone.area} • Free delivery</span>
      </div>
    );
  }

  const soon = getComingSoonZone(pin);
  return (
    <div className="mt-1.5 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">
      <p className="font-semibold">
        {soon
          ? `${soon.area} is in our next delivery batch. We're not delivering there just yet.`
          : `We don't deliver to ${pin} yet.`}
      </p>
      <a
        href={notifyMeLink(BRAND.whatsappNumber, BRAND.name, soon ?? { area: 'my area', pincode: pin })}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1.5 inline-flex items-center gap-1 font-bold text-amber-900 underline underline-offset-2"
      >
        <BellRing className="w-3.5 h-3.5" />
        Notify me on WhatsApp when you start
      </a>
    </div>
  );
}
