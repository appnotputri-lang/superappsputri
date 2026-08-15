/**
 * Universal D1 Client Cache Utility
 * Provides instant Memory + LocalStorage caching with TTL, background revalidation,
 * and prefix-based invalidation for all Cloudflare D1-backed modules.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes default
const MAX_LOCAL_STORAGE_ENTRIES = 50;
const STORAGE_PREFIX = 'd1_cache:';

class D1ClientCacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();

  /**
   * Retrieve cached data if valid (checks Memory first, then LocalStorage)
   */
  get<T>(key: string): T | null {
    const now = Date.now();

    // 1. Check Memory Cache
    const memEntry = this.memoryCache.get(key);
    if (memEntry) {
      if (now - memEntry.timestamp < memEntry.ttl) {
        return memEntry.data as T;
      }
      this.memoryCache.delete(key);
    }

    // 2. Check LocalStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem(STORAGE_PREFIX + key);
        if (stored) {
          const parsed = JSON.parse(stored) as CacheEntry<T>;
          if (parsed && typeof parsed.timestamp === 'number') {
            if (now - parsed.timestamp < (parsed.ttl || DEFAULT_TTL_MS)) {
              // Populate memory cache for faster subsequent reads
              this.memoryCache.set(key, parsed);
              return parsed.data;
            }
            localStorage.removeItem(STORAGE_PREFIX + key);
          }
        }
      } catch (err) {
        console.warn(`[D1ClientCache] Failed to read localStorage key: ${key}`, err);
      }
    }

    return null;
  }

  /**
   * Save data into Memory and LocalStorage cache
   */
  set<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: ttlMs
    };

    // 1. Set Memory
    this.memoryCache.set(key, entry);

    // 2. Set LocalStorage with quota protection
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        this.pruneLocalStorage();
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
      } catch (err) {
        console.warn(`[D1ClientCache] Failed to write localStorage key: ${key}`, err);
      }
    }
  }

  /**
   * Invalidate a single key
   */
  invalidate(key: string): void {
    this.memoryCache.delete(key);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(STORAGE_PREFIX + key);
      } catch (err) {}
    }
  }

  /**
   * Invalidate all keys matching a prefix (e.g. "invoices", "deeds", "quotations")
   */
  invalidateByPrefix(prefix: string): void {
    const cleanPrefix = prefix.toLowerCase();

    // 1. Memory keys
    for (const key of Array.from(this.memoryCache.keys())) {
      if (key.toLowerCase().startsWith(cleanPrefix) || key.toLowerCase().includes(`:${cleanPrefix}:`)) {
        this.memoryCache.delete(key);
      }
    }

    // 2. LocalStorage keys
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const fullPrefix = STORAGE_PREFIX + cleanPrefix;
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith(fullPrefix) || k.includes(`:${cleanPrefix}:`) || k.startsWith(`${STORAGE_PREFIX}${cleanPrefix}`))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (err) {}
    }
  }

  /**
   * Clear all D1 cache entries
   */
  clearAll(): void {
    this.memoryCache.clear();
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(STORAGE_PREFIX)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (err) {}
    }
  }

  /**
   * Stale-While-Revalidate execution helper
   * 1. Returns cached value immediately (stale) if available.
   * 2. Triggers asynchronous background fetch and calls onFresh when fresh data is ready.
   */
  async staleWhileRevalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: {
      ttlMs?: number;
      onStale?: (cachedData: T) => void;
      onFresh?: (freshData: T) => void;
    }
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      if (options?.onStale) {
        options.onStale(cached);
      }

      // Background revalidation
      fetcher()
        .then((fresh) => {
          this.set(key, fresh, options?.ttlMs);
          if (options?.onFresh) {
            options.onFresh(fresh);
          }
        })
        .catch((err) => {
          console.warn(`[D1ClientCache] Background revalidation failed for ${key}:`, err);
        });

      return cached;
    }

    // No cache: perform direct fetch
    const fresh = await fetcher();
    this.set(key, fresh, options?.ttlMs);
    if (options?.onFresh) {
      options.onFresh(fresh);
    }
    return fresh;
  }

  /**
   * Prune oldest localStorage entries if count exceeds limit
   */
  private pruneLocalStorage(): void {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) {
          keys.push(k);
        }
      }

      if (keys.length > MAX_LOCAL_STORAGE_ENTRIES) {
        // Remove oldest entries
        keys.slice(0, keys.length - MAX_LOCAL_STORAGE_ENTRIES + 5).forEach((k) => {
          localStorage.removeItem(k);
        });
      }
    } catch (err) {}
  }
}

export const d1ClientCache = new D1ClientCacheManager();
