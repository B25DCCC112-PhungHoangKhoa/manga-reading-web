import NodeCache from 'node-cache';

// Shared in-memory cache instance: default TTL of 10 minutes (600s), check period 120s
const cache = new NodeCache({
  stdTTL: 600,
  checkperiod: 120,
  useClones: false,
});

/**
 * Get an item from the cache, or execute the fetcher, store the result, and return it.
 *
 * @param key Unique cache key
 * @param ttlSeconds TTL in seconds for this specific item
 * @param fetcher Async function to fetch fresh data if cache missed
 */
export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== undefined) {
    return cached;
  }

  const fresh = await fetcher();
  if (fresh !== null && fresh !== undefined) {
    cache.set(key, fresh, ttlSeconds);
  }
  return fresh;
}

export function invalidateCache(key: string): void {
  cache.del(key);
}

export function getCacheStats() {
  return cache.getStats();
}

export default cache;

