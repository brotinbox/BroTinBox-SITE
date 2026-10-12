'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { UserLocation } from '@/types';

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
        isDeliverable: true,
        deliveryFee: Number(z.delivery_fee ?? 0),
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

/** Active delivery zones, loaded once per page session and shared by all callers. */
export function useDeliveryZones() {
  const [zones, setZones] = useState<ZoneLocation[]>([]);
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

  const getZoneByPincode = useCallback(
    (pincode: string) => zones.find((z) => z.pincode === pincode.trim()),
    [zones]
  );

  return { zones, loading, getZoneByPincode };
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
