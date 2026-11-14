'use server';

import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseService } from '@/lib/supabase/admin';
import { fail, ok, staffAction, type ActionResult } from '@/lib/admin/actions';
import { BRAND } from '@/config/brand';
import { distanceKm, nearestNeighbourOrder, parseLatLng, type LatLng } from '@/lib/deliveries/geo';
import { loadRun, saveStops } from '@/lib/deliveries/route';

const STATUSES = ['locked', 'preparing', 'packed', 'out_for_delivery', 'delivered', 'failed'] as const;
const Slot = z.enum(['lunch', 'dinner']);
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function bulkUpdate(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const ids = z.array(z.string().uuid()).min(1).max(500).safeParse(fd.getAll('ids'));
  const status = z.enum(STATUSES).safeParse(fd.get('status'));
  const rider = z.string().uuid().or(z.literal('')).safeParse(fd.get('rider_id') ?? '');
  if (!ids.success) return fail('Select at least one delivery.');
  return staffAction('deliveries.write', async () => {
    const supabase = await getSupabaseServer();
    if (rider.success && rider.data) {
      const { error } = await supabase.rpc('assign_rider', { p_delivery_ids: ids.data, p_rider: rider.data });
      if (error) throw error;
    }
    if (status.success) {
      for (const id of ids.data) {
        const { error } = await supabase.rpc('update_delivery_status', { p_delivery: id, p_status: status.data });
        if (error) throw error;
      }
    }
    return ok(`Updated ${ids.data.length} deliveries.`);
  });
}

/** One delivery's status, from the pill or the "Delivered" button. */
export async function setDeliveryStatus(id: string, status: string, reason?: string): Promise<ActionResult> {
  const pid = z.string().uuid().safeParse(id);
  const st = z.enum(STATUSES).safeParse(status);
  if (!pid.success || !st.success) return fail('Invalid status.');
  return staffAction('deliveries.write', async () => {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.rpc('update_delivery_status', {
      p_delivery: pid.data, p_status: st.data, p_reason: reason?.slice(0, 200) || undefined,
    });
    if (error) throw error;
    return ok('Status saved.');
  });
}

/** Moves a stop one place up or down in its date + slot run. */
export async function moveStop(id: string, date: string, slot: string, dir: 'up' | 'down'): Promise<ActionResult> {
  const p = z.object({ id: z.string().uuid(), date: IsoDate, slot: Slot }).safeParse({ id, date, slot });
  if (!p.success) return fail('Invalid request.');
  return staffAction('deliveries.write', async () => {
    const ids = (await loadRun(p.data.date, p.data.slot)).map((r) => r.id);
    const i = ids.indexOf(p.data.id);
    const j = dir === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ids.length) return ok();
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await saveStops(ids);
    return ok('Order saved.');
  });
}

/** Nearest-next from the kitchen (straight line). Unpinned stops go last. */
export async function autoSortRun(date: string, slot: string): Promise<ActionResult> {
  const p = z.object({ date: IsoDate, slot: Slot }).safeParse({ date, slot });
  if (!p.success) return fail('Invalid request.');
  return staffAction('deliveries.write', async () => {
    const run = await loadRun(p.data.date, p.data.slot);
    const ordered = nearestNeighbourOrder(BRAND.kitchenLocation, run);
    await saveStops(ordered.map((r) => r.id));
    const unpinned = run.filter((r) => !r.pin).length;
    return ok(unpinned ? `Sorted. ${unpinned} without a pin are at the end. Add their location to include them.` : 'Sorted by distance.');
  });
}

const MAP_HOSTS = /^(maps\.app\.goo\.gl|goo\.gl|g\.co|maps\.google\.[a-z.]+|(www\.)?google\.[a-z.]+)$/i;

/** Follows a Google Maps short link (allow-listed hosts only) to the full URL. */
async function expandMapsLink(text: string): Promise<string> {
  let url: URL;
  try { url = new URL(text.trim()); } catch { return text; }
  for (let hop = 0; hop < 5; hop++) {
    if (url.protocol !== 'https:' || !MAP_HOSTS.test(url.hostname)) return url.toString();
    if (parseLatLng(url.toString())) return url.toString();
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(5000) }).catch(() => null);
    const next = res?.headers.get('location');
    if (!next) return url.toString();
    url = new URL(next, url);
  }
  return url.toString();
}

/** Saves a customer's pin from a pasted WhatsApp / Google Maps link or "lat, lng". */
export async function setDeliveryLocation(id: string, text: string): Promise<ActionResult> {
  const pid = z.string().uuid().safeParse(id);
  const input = z.string().trim().min(3).max(2000).safeParse(text);
  if (!pid.success || !input.success) return fail('Paste a Google Maps link or coordinates.');
  return staffAction('deliveries.write', async () => {
    const svc = getSupabaseService();
    const { data: d } = await svc.from('deliveries').select('address_id').eq('id', pid.data).maybeSingle();
    if (!d?.address_id) return fail('This delivery has no saved address to pin.');

    const pin: LatLng | null = parseLatLng(input.data) ?? parseLatLng(await expandMapsLink(input.data));
    if (!pin) return fail('Could not find a location in that. Paste the Google Maps link from WhatsApp, or "lat, lng".');
    const km = distanceKm(BRAND.kitchenLocation, pin);
    if (km > 40) return fail(`That pin is ${Math.round(km)} km from the kitchen. Check the link.`);

    const { error } = await svc.from('addresses').update({ lat: pin.lat, lng: pin.lng }).eq('id', d.address_id);
    if (error) throw error;
    return ok(`Location saved (${km.toFixed(1)} km from kitchen).`);
  });
}
