import 'server-only';
import { getSupabaseService } from '@/lib/supabase/admin';
import type { LatLng } from '@/lib/deliveries/geo';

/** Statuses that are on the day's run (after the 9 PM lock). */
export const RUN_EXCLUDED = '(skipped,paused,cancelled,scheduled)';

type RunRow = {
  id: string; slot: string; stop_no: number | null; address_id: string | null;
  address_snapshot: { area?: string; lat?: number | null; lng?: number | null } | null;
  delivery_zones?: { area?: string } | null;
};
export type Routed<T> = T & { pin: LatLng | null; stop: number | null };

/**
 * Adds each delivery's pin (live address row, so a pin saved today also fixes
 * already-locked boxes) and its stop number, falling back to the stop that
 * address had on its last run in the same slot. Returns rows sorted by slot,
 * then stop (unnumbered last, by area).
 */
export async function withRoute<T extends RunRow>(rows: T[], date: string): Promise<Routed<T>[]> {
  const svc = getSupabaseService();
  const addressIds = [...new Set(rows.map((r) => r.address_id).filter((x): x is string => !!x))];
  const pins = new Map<string, LatLng>();
  const remembered = new Map<string, number>();
  if (addressIds.length) {
    const [addr, past] = await Promise.all([
      svc.from('addresses').select('id, lat, lng').in('id', addressIds),
      svc.from('deliveries').select('address_id, slot, stop_no, delivery_date' as '*')
        .in('address_id', addressIds).lt('delivery_date', date).not('stop_no' as 'id', 'is', null)
        .order('delivery_date', { ascending: false }).limit(1000),
    ]);
    (addr.data ?? []).forEach((a) => {
      if (a.lat != null && a.lng != null) pins.set(a.id, { lat: Number(a.lat), lng: Number(a.lng) });
    });
    ((past.data ?? []) as unknown as { address_id: string; slot: string; stop_no: number }[]).forEach((p) => {
      const k = `${p.address_id}|${p.slot}`;
      if (!remembered.has(k)) remembered.set(k, p.stop_no);
    });
  }

  const out = rows.map((r) => {
    const snap = r.address_snapshot;
    const pin = (r.address_id && pins.get(r.address_id))
      || (snap?.lat != null && snap?.lng != null ? { lat: Number(snap.lat), lng: Number(snap.lng) } : null);
    const stop = r.stop_no ?? (r.address_id ? remembered.get(`${r.address_id}|${r.slot}`) ?? null : null);
    return { ...r, pin, stop };
  });
  const area = (r: RunRow) => r.delivery_zones?.area || r.address_snapshot?.area || '';
  return out.sort((a, b) =>
    a.slot.localeCompare(b.slot)
    || (a.stop ?? 9999) - (b.stop ?? 9999)
    || area(a).localeCompare(area(b)));
}

/** One slot's run for a date, in current stop order (service client; caller checks permission). */
export async function loadRun(date: string, slot: 'lunch' | 'dinner') {
  const { data, error } = await getSupabaseService()
    .from('deliveries')
    .select('id, slot, stop_no, address_id, address_snapshot, delivery_zones(area)' as '*')
    .eq('delivery_date', date).eq('slot', slot)
    .not('status', 'in', RUN_EXCLUDED);
  if (error) throw error;
  return withRoute((data ?? []) as unknown as RunRow[], date);
}

/** Saves stop numbers 1..n in the given order. */
export async function saveStops(ids: string[]) {
  const svc = getSupabaseService();
  const results = await Promise.all(ids.map((id, i) =>
    svc.from('deliveries').update({ stop_no: i + 1 } as never).eq('id', id)));
  const err = results.find((r) => r.error)?.error;
  if (err) throw err;
}
