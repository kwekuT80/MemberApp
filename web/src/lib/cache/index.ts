/**
 * Client-side caching utility with stale-while-revalidate pattern.
 * Uses localStorage for persistence and implements a simple TTL-based cache.
 */

const CACHE_PREFIX = 'memberapp_';

// Cache durations in milliseconds
export const CACHE_TTL = {
  MEMBER: 5 * 60,        // 5 minutes — member data changes frequently
  SEARCH_RESULTS: 30,    // Search results stale after 30s (frequent searches)
  AUTH_TOKEN: 3540,      // Auth token TTL slightly under 5 min cache window
  MEMBER_COUNT: 300,     // Member count — changes infrequently
};

/**
 * Generate a deterministic cache key from function name and arguments.
 */
function makeKey(name: string, args: any[]): string {
  return `${CACHE_PREFIX}${name}_${JSON.stringify(args)}`;
}

/**
 * Check if cached data is still fresh (within TTL).
 */
export function isCachedValid(key: string, ttlMs = 300_000): boolean {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return false;

    // Try to parse as JSON with expiry
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || !parsed?.expiresAt) return false;

    // Cache is valid if current time is before the expiry timestamp
    return Date.now() < new Date(parsed.expiresAt).getTime();
  } catch {
    // On error (e.g., localStorage unavailable), fall through to fetch
    return false;
  }
}

/**
 * Store data in cache with expiry timestamp.
 */
export function setCache(key: string, data: any, ttlMs = 300_000): void {
  try {
    const cacheKey = CACHE_PREFIX + key;
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
      data,
      expiresAt: Date.now() + (ttlMs || 300_000),
    }));
  } catch {
    // On error (e.g., localStorage unavailable), fall through to fetch
  }
}

/**
 * Read data from cache. Returns null if not found or expired.
 */
export function getCache(key: string): any {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;

    // Try to parse as JSON with expiry
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || !parsed?.expiresAt) return null;

    // Check if cache is still fresh
    return Date.now() < (parsed.expiresAt || 0);
  } catch {
    // On error (e.g., localStorage unavailable), fall through to fetch
    return null;
  }
}

/**
 * Invalidate a specific cache key or all keys matching a pattern.
 */
export function invalidateCache(pattern: string): void {
  const prefix = `${CACHE_PREFIX}`;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (typeof key === 'string' && key.startsWith(`${CACHE_PREFIX}${pattern}`)) {
      localStorage.removeItem(key);
    }
  }
}

/**
 * Invalidate all cached data. Call on page refresh or auth change.
 */
export function clearCache(): void {
  Object.keys(localStorage).forEach((key) => {
    if (typeof key === 'string' && (
      key.startsWith(`${CACHE_PREFIX}`) ||
      key.includes('_search') ||
      key === `${CACHE_PREFIX}_auth_cache`
    )) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * Cache wrapper for async server functions.
 * Uses stale-while-revalidate: returns cached data immediately if available,
 * then re-fetches in background to refresh the cache.
 */
export function withCache<T>(
  fn: (...args: any[]) => Promise<any>,
  ttlMs = 300_000 // 5 minutes default TTL
): typeof fn {
  return async function cachedFn(...args: any[]): Promise<T> {
    const cacheKey = `${typeof fn}:${JSON.stringify(args)}`;

    // Try to get from cache first (stale)
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // localStorage not available — proceed with fresh fetch
    }

    // Fetch fresh data and update cache
    const result = await fn(...args);

    // Cache the result
    try {
      setCache(cacheKey, result, ttlMs);
    } catch {
      // Silently fail on cache write errors
    }

    return result;
  };
}
