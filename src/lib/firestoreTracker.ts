/**
 * Centralized Firestore Logger & In-Memory TTL Cache Utility
 * Standardized logging and caching for Minimal Read Architecture.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

class FirestoreTrackerClass {
  private startupReads = 0;
  private isStartupPhase = true;
  private cache = new Map<string, CacheEntry<any>>();
  private inFlightRequests = new Map<string, Promise<any>>();

  // ===== REQUEST DEDUPLICATION =====
  public async fetchDeduplicated<T>(
    key: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    if (this.inFlightRequests.has(key)) {
      console.log(`[FirestoreDeduplication] Joining in-flight request for key: ${key}`);
      return this.inFlightRequests.get(key) as Promise<T>;
    }

    const promise = (async () => {
      try {
        return await fetcher();
      } finally {
        this.inFlightRequests.delete(key);
      }
    })();

    this.inFlightRequests.set(key, promise);
    return promise;
  }

  // ===== STARTUP LOGGING =====
  public logStartupInit() {
    this.startupReads = 0;
    this.isStartupPhase = true;
    console.log('[FirestoreStartup] Initializing App...');
  }

  public logStartupAuth(uid: string) {
    console.log(`[FirestoreStartup] User Authenticated: ${uid}`);
  }

  public logStartupAuthProfile(reads: number = 1) {
    this.startupReads += reads;
    console.log(`[FirestoreStartup] Fetching Auth Profile (Reads: ${reads})`);
  }

  public logStartupComplete() {
    console.log(`[FirestoreStartup] App Startup Complete. TOTAL STARTUP READS: ${this.startupReads}`);
    this.isStartupPhase = false;
  }

  public getStartupReads(): number {
    return this.startupReads;
  }

  // ===== QUERY INSTRUMENTATION LOGGING =====
  public logQuery(params: {
    collectionName: string;
    operation: 'aggregation' | 'list' | 'doc' | 'listener';
    limit?: number | string;
    resultCount?: number;
    cacheStatus: 'HIT' | 'MISS';
    network: boolean;
  }) {
    console.log(
      `[FirestoreQuery] collection: ${params.collectionName} | operation: ${params.operation} | limit: ${params.limit ?? '-'} | resultCount: ${params.resultCount ?? '-'} | cache: ${params.cacheStatus} | network: ${params.network ? 'YES' : 'NO'}`
    );
  }

  // ===== MENU LOGGING =====
  public logMenuOpen(menuName: string, cacheStatus: 'HIT' | 'MISS', collectionName?: string, estimatedReads?: number, actualReads?: number) {
    console.log(`[FirestoreMenu] Opening Menu: ${menuName}`);
    console.log(`[FirestoreMenu] Cache Status: ${cacheStatus}`);
    if (cacheStatus === 'MISS' && collectionName) {
      console.log(`[FirestoreMenu] Executing Query: ${collectionName} (Estimated Reads: ${estimatedReads ?? 'unknown'})`);
    }
    if (actualReads !== undefined) {
      console.log(`[FirestoreMenu] Query Complete. Total Reads for ${menuName}: ${actualReads}`);
    }
  }

  // ===== LISTENER LOGGING =====
  public logListenerStart(collectionName: string) {
    console.log(`[FirestoreListener] Started listening on: ${collectionName}`);
  }

  public logListenerStop(collectionName: string) {
    console.log(`[FirestoreListener] Stopped listening on: ${collectionName}`);
  }

  // ===== CACHE LAYER =====
  public cacheSet<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttlMs
    });
  }

  public cacheGet<T>(key: string): { hit: boolean; data?: T } {
    const entry = this.cache.get(key);
    if (!entry) {
      return { hit: false };
    }
    if (Date.now() - entry.timestamp > entry.ttlMs) {
      this.cache.delete(key);
      return { hit: false };
    }
    return { hit: true, data: entry.data as T };
  }

  public cacheInvalidate(keyOrPrefix: string): void {
    for (const key of this.cache.keys()) {
      if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
        this.cache.delete(key);
      }
    }
  }

  public cacheClear(): void {
    this.cache.clear();
  }

  /**
   * Utility helper to execute query with cache check & logging.
   */
  public async fetchCached<T>(
    cacheKey: string,
    menuName: string,
    collectionName: string,
    fetcher: () => Promise<T>,
    ttlMs: number = 5 * 60 * 1000
  ): Promise<T> {
    const cached = this.cacheGet<T>(cacheKey);
    if (cached.hit && cached.data !== undefined) {
      this.logMenuOpen(menuName, 'HIT');
      return cached.data;
    }

    return this.fetchDeduplicated<T>(cacheKey, async () => {
      // Re-check cache inside deduplicated block in case a concurrent request just resolved
      const secondCheck = this.cacheGet<T>(cacheKey);
      if (secondCheck.hit && secondCheck.data !== undefined) {
        this.logMenuOpen(menuName, 'HIT');
        return secondCheck.data;
      }

      this.logMenuOpen(menuName, 'MISS', collectionName);
      const results = await fetcher();
      this.cacheSet(cacheKey, results, ttlMs);
      const actualCount = Array.isArray(results) ? results.length : 1;
      this.logMenuOpen(menuName, 'MISS', collectionName, undefined, actualCount);
      return results;
    });
  }
}

export const FirestoreTracker = new FirestoreTrackerClass();
