'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { UserLocation } from '@/types';
import { useAppStore } from '@/store/useAppStore';

/**
 * Delivery areas come from the `delivery_zones` table — the same table checkout
 * uses to price delivery. To launch a new area, add (or activate) a zone in
 * admin; the header picker, delivery-areas page and plan modals pick it up.
 */
export interface ZoneLocation {
  pincode: string;
  area: string;
  lat?: number;
  lng?: number;
  tier: 'core' | 'phase2';
  isDeliverable: boolean;
  deliveryFee: number;
  distanceKm: number;
  avgDeliveryMinutes: number;
  description: string;
}

let zonesPromise: Promise<ZoneLocation[]> | null = null;

function loadZones(): Promise<ZoneLocation[]> {
  if (!zonesPromise) {
    zonesPromise = Promise.resolve(
      getSupabaseBrowser()
        .from('delivery_zones')
        .select('pincode, area, tier, delivery_fee, distance_km, avg_minutes, lat, lng, description')
        .eq('is_active', true)
        .order('distance_km', { ascending: true, nullsFirst: false })
    ).then(({ data, error }) => {
      if (error) throw error;
      return (data ?? []).map((z) => ({
        pincode: z.pincode,
        area: z.area,
        lat: z.lat ?? undefined,
        lng: z.lng ?? undefined,
        tier: z.tier,
        // Only core zones take orders today; phase2 zones are "next batch" (listed, not orderable).
        isDeliverable: z.tier === 'core',
        deliveryFee: 0,
        distanceKm: Number(z.distance_km ?? 0),
        avgDeliveryMinutes: z.avg_minutes ?? 0,
        description: z.description ?? '',
      }));
    });
    // Allow a retry on the next mount if the request failed
    zonesPromise.catch(() => {
      zonesPromise = null;
    });
  }
  return zonesPromise;
}

/** Active delivery zones, loaded once per page session and shared by all callers.
 *  `zones` are the areas we deliver to now; `comingSoonZones` are the next-batch areas. */
export function useDeliveryZones() {
  const [allZones, setZones] = useState<ZoneLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    loadZones()
      .then((z) => alive && setZones(z))
      .catch((err) => console.warn('Could not load delivery zones:', err))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const zones = useMemo(() => allZones.filter((z) => z.isDeliverable), [allZones]);
  const comingSoonZones = useMemo(() => allZones.filter((z) => !z.isDeliverable), [allZones]);

  /** A zone we deliver to now. Next-batch pincodes return undefined. */
  const getZoneByPincode = useCallback(
    (pincode: string) => zones.find((z) => z.pincode === pincode.trim()),
    [zones]
  );

  /** A next-batch zone for this pincode, if any. */
  const getComingSoonZone = useCallback(
    (pincode: string) => comingSoonZones.find((z) => z.pincode === pincode.trim()),
    [comingSoonZones]
  );

  return { zones, comingSoonZones, loading, getZoneByPincode, getComingSoonZone };
}

export function zoneToUserLocation(zone: ZoneLocation): UserLocation {
  return {
    area: zone.area,
    pincode: zone.pincode,
    city: 'Coimbatore',
    lat: zone.lat,
    lng: zone.lng,
    distanceKm: zone.distanceKm,
    tier: zone.tier,
    deliveryFee: zone.deliveryFee,
    isDeliverable: zone.isDeliverable,
    formattedAddress: `${zone.area}, ${zone.pincode}, Coimbatore`,
  };
}

/** WhatsApp link asking to be told when we start delivering to a next-batch area. */
export function notifyMeLink(whatsappNumber: string, brandName: string, zone?: { area: string; pincode: string }) {
  const where = zone ? `${zone.area} (${zone.pincode})` : 'my area';
  const text = `Hi ${brandName}! Please let me know when you start delivering to ${where}.`;
  return `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}

/** A valid 6-digit Indian pincode. */
export const isPincode = (pin: string) => /^[1-9]\d{5}$/.test(pin.trim());

/**
 * The location for a typed pincode: a zone we deliver to, a next-batch zone
 * (saved but not orderable), or a pincode we don't cover yet.
 */
export function locationFromPincode(
  pincode: string,
  zones: ZoneLocation[],
  comingSoonZones: ZoneLocation[]
): UserLocation {
  const pin = pincode.trim();
  const zone = zones.find((z) => z.pincode === pin) ?? comingSoonZones.find((z) => z.pincode === pin);
  if (zone) return zoneToUserLocation(zone);
  return {
    area: '',
    pincode: pin,
    city: 'Coimbatore',
    tier: 'out-of-range',
    deliveryFee: 0,
    isDeliverable: false,
    formattedAddress: `${pin}, Coimbatore`,
  };
}

/** The pincode/area the visitor entered, for prefilling address forms. Empty until they set one. */
export function useSavedLocation() {
  const confirmed = useAppStore((s) => s.locationConfirmed);
  const loc = useAppStore((s) => s.currentLocation);
  return confirmed ? { pincode: loc.pincode, area: loc.area, isDeliverable: loc.isDeliverable } : { pincode: '', area: '', isDeliverable: false };
}
