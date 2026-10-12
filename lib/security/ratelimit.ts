import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Sliding-window rate limits backed by Upstash Redis.
 * Without Upstash credentials (local dev) an in-memory window is used; it is
 * per-instance only, so production must have UPSTASH_REDIS_REST_URL/TOKEN set.
 */
type Window = `${number} ${'s' | 'm' | 'h'}`;

export const LIMITS = {
  global: { tokens: 120, window: '1 m' },          // any /api or action, per IP
  staffLogin: { tokens: 5, window: '15 m' },       // per IP and per email
  customerAuth: { tokens: 10, window: '10 m' },    // per IP
  publicForm: { tokens: 5, window: '1 h' },        // enquiry / waitlist / review, per IP
  checkout: { tokens: 10, window: '1 m' },         // per user
  customerAction: { tokens: 30, window: '1 m' },   // skip/pause/profile edits, per user
  adminMutation: { tokens: 120, window: '1 m' },   // per staff user
  upload: { tokens: 20, window: '10 m' },          // per staff user
} as const satisfies Record<string, { tokens: number; window: Window }>;

export type LimitName = keyof typeof LIMITS;

const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const redis = hasUpstash ? Redis.fromEnv() : null;
const limiters = new Map<LimitName, Ratelimit>();

function limiter(name: LimitName) {
  let l = limiters.get(name);
  if (!l && redis) {
    const { tokens, window } = LIMITS[name];
    l = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(tokens, window), prefix: `brotin:rl:${name}`, analytics: false });
    limiters.set(name, l);
  }
  return l;
}

const memory = new Map<string, number[]>();
function windowMs(w: Window) {
  const [n, unit] = w.split(' ') as [string, 's' | 'm' | 'h'];
  return Number(n) * { s: 1_000, m: 60_000, h: 3_600_000 }[unit];
}

export type RateResult = { success: boolean; remaining: number; reset: number };

export async function rateLimit(name: LimitName, key: string): Promise<RateResult> {
  const l = limiter(name);
  if (l) {
    const r = await l.limit(key);
    return { success: r.success, remaining: r.remaining, reset: r.reset };
  }
  const { tokens, window } = LIMITS[name];
  const ms = windowMs(window);
  const now = Date.now();
  const k = `${name}:${key}`;
  const hits = (memory.get(k) ?? []).filter((t) => now - t < ms);
  const success = hits.length < tokens;
  if (success) hits.push(now);
  memory.set(k, hits);
  return { success, remaining: Math.max(0, tokens - hits.length), reset: (hits[0] ?? now) + ms };
}

/** Clears a key after a successful login so honest users are not locked out. */
export async function resetRateLimit(name: LimitName, key: string) {
  const l = limiter(name);
  if (l) await l.resetUsedTokens(key);
  else memory.delete(`${name}:${key}`);
}
