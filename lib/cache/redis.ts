import 'server-only';
import { Redis } from '@upstash/redis';

/**
 * Small Upstash-backed cache for expensive, short-lived staff data
 * (dashboard KPIs). Falls back to no caching when Upstash isn't configured,
 * so correctness never depends on it.
 */
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null;
const PREFIX = 'brotin:cache:';

export async function cached<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  if (!redis) return load();
  try {
    const hit = await redis.get<T>(PREFIX + key);
    if (hit !== null && hit !== undefined) return hit;
  } catch {
    return load(); // Redis down → serve live data
  }
  const value = await load();
  redis.set(PREFIX + key, value, { ex: ttlSeconds }).catch(() => undefined);
  return value;
}

export async function invalidate(...keys: string[]) {
  if (!redis || !keys.length) return;
  await redis.del(...keys.map((k) => PREFIX + k)).catch(() => undefined);
}

/** Keys used by the staff console. */
export const CACHE_KEYS = {
  overview: 'admin:overview',
  revenue30: 'admin:revenue:30',
  forecast7: 'admin:forecast:7',
} as const;
