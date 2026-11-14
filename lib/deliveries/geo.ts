/**
 * Small geo helpers for the Deliveries page. No map API: pins come from
 * WhatsApp / Google Maps links pasted by staff, and navigation opens the
 * Google Maps app through a plain URL.
 */
export type LatLng = { lat: number; lng: number };

const NUM = String.raw`(-?\d{1,3}\.\d+)`;
const PATTERNS = [
  new RegExp(String.raw`!3d${NUM}!4d${NUM}`),                                   // place pin (most exact)
  new RegExp(String.raw`[?&](?:q|query|ll|destination|daddr|center)=(?:loc:)?${NUM},\s*\+?${NUM}`),
  new RegExp(String.raw`/(?:search|place|dir)/${NUM},\s*\+?${NUM}`),
  new RegExp(String.raw`@${NUM},${NUM}`),                                       // map centre
  new RegExp(String.raw`^\s*${NUM}\s*,\s*${NUM}\s*$`),                          // "10.96, 76.93"
];

/** Pulls coordinates out of a Google Maps URL or a "lat, lng" pair. */
export function parseLatLng(text: string): LatLng | null {
  let s = text.trim();
  try { s = decodeURIComponent(s); } catch { /* keep raw */ }
  for (const re of PATTERNS) {
    const m = s.match(re);
    if (!m) continue;
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
  }
  return null;
}

/** Straight-line distance in km (not road distance). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

type Dest = LatLng | string;
const point = (d: Dest) => (typeof d === 'string' ? d : `${d.lat},${d.lng}`);

/** Opens turn-by-turn directions in Google Maps (app on phones). */
export function directionsUrl(dest: Dest, origin?: Dest): string {
  const p = new URLSearchParams({ api: '1', destination: point(dest), travelmode: 'two-wheeler' });
  if (origin) p.set('origin', point(origin));
  return `https://www.google.com/maps/dir/?${p.toString()}`;
}

/**
 * Multi-stop route links from the kitchen. Google Maps URLs take at most 9
 * waypoints, so longer runs are split into parts (each starts where the last ended).
 */
export function routeUrls(kitchen: LatLng, stops: Dest[]): string[] {
  const urls: string[] = [];
  let origin: Dest = kitchen;
  for (let i = 0; i < stops.length; i += 10) {
    const chunk = stops.slice(i, i + 10);
    const dest = chunk[chunk.length - 1];
    const p = new URLSearchParams({ api: '1', origin: point(origin), destination: point(dest), travelmode: 'two-wheeler' });
    const waypoints = chunk.slice(0, -1).map(point);
    if (waypoints.length) p.set('waypoints', waypoints.join('|'));
    urls.push(`https://www.google.com/maps/dir/?${p.toString()}`);
    origin = dest;
  }
  return urls;
}

/** Nearest-next ordering from the kitchen by straight-line distance. */
export function nearestNeighbourOrder<T extends { pin: LatLng | null }>(start: LatLng, items: T[]): T[] {
  const left = items.filter((i) => i.pin);
  const out: T[] = [];
  let here = start;
  while (left.length) {
    let best = 0;
    left.forEach((it, i) => { if (distanceKm(here, it.pin!) < distanceKm(here, left[best].pin!)) best = i; });
    const [next] = left.splice(best, 1);
    out.push(next);
    here = next.pin!;
  }
  return [...out, ...items.filter((i) => !i.pin)];
}
