import { Product } from '../types';
import { d1ClientCache } from '../lib/d1ClientCache';

function getApiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (typeof window !== 'undefined') {
    return path;
  }
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

const CACHE_KEY = 'products:all';

export class ProductService {
  private static cache: Product[] | null = null;
  private static listeners: Set<(data: Product[]) => void> = new Set();
  private static lastFetchTime: number = 0;
  private static inFlightFetch: Promise<Product[]> | null = null;
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  // Server-side search cache (query::limit -> { products, timestamp })
  private static searchCache: Map<string, { products: Product[]; timestamp: number }> = new Map();
  private static readonly SEARCH_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

  public static notifyListeners() {
    if (this.cache) {
      this.listeners.forEach((listener) => {
        try {
          listener(this.cache!);
        } catch (e) {
          console.error('[ProductService] Error in listener callback:', e);
        }
      });
    }
  }

  public static clearSearchCache() {
    this.searchCache.clear();
  }

  static subscribeProducts(onNext: (data: Product[]) => void): () => void {
    this.listeners.add(onNext);

    // If we have cached data in memory or localStorage, fire immediately
    const cached = this.cache || d1ClientCache.get<Product[]>(CACHE_KEY);
    if (cached && cached.length > 0) {
      this.cache = cached;
      onNext(cached);
    }

    // Only trigger background revalidation if cache is missing or stale
    const isStale = !this.cache || (Date.now() - this.lastFetchTime >= this.CACHE_TTL_MS);
    if (isStale) {
      this.getProducts(false).then((data) => {
        onNext(data);
      }).catch((err) => {
        console.error('[ProductService] Error fetching products in subscriber:', err);
      });
    }

    return () => {
      this.listeners.delete(onNext);
    };
  }

  static async getProducts(forceRefresh = false): Promise<Product[]> {
    const isFresh = Boolean(this.cache && (Date.now() - this.lastFetchTime < this.CACHE_TTL_MS));
    if (!forceRefresh && isFresh) {
      return this.cache!;
    }

    if (!forceRefresh && !this.cache) {
      const cached = d1ClientCache.get<Product[]>(CACHE_KEY);
      if (cached && cached.length > 0) {
        this.cache = cached;
        return cached;
      }
    }

    // Return active in-flight request if already running
    if (this.inFlightFetch) {
      return this.inFlightFetch;
    }

    this.inFlightFetch = (async () => {
      try {
        const res = await fetch(getApiUrl('/api/products?limit=500'));
        if (!res.ok) throw new Error('Failed to fetch products');
        const json = await res.json();
        if (json.success && Array.isArray(json.products)) {
          this.cache = json.products;
          this.lastFetchTime = Date.now();
          d1ClientCache.set(CACHE_KEY, json.products);
          this.notifyListeners();
          return json.products;
        }
        return this.cache || [];
      } catch (error) {
        console.error('[ProductService] Error in getProducts:', error);
        return this.cache || d1ClientCache.get<Product[]>(CACHE_KEY) || [];
      } finally {
        this.inFlightFetch = null;
      }
    })();

    return this.inFlightFetch;
  }

  /**
   * Fast server-side product search with client-side caching and abortable requests.
   * Returns top matched results (default 25-30) without loading all products.
   */
  static async searchProducts(
    query: string,
    options?: { limit?: number; signal?: AbortSignal; forceRefresh?: boolean }
  ): Promise<Product[]> {
    const limit = options?.limit || 25;
    const trimmed = (query || '').trim();

    // 1. Empty query: return initial cached items or lightweight fetch
    if (!trimmed) {
      const existing = this.cache || d1ClientCache.get<Product[]>(CACHE_KEY);
      if (existing && existing.length > 0) {
        return existing.slice(0, limit);
      }
      try {
        const res = await fetch(getApiUrl(`/api/products?limit=${limit}`), { signal: options?.signal });
        if (!res.ok) throw new Error('Failed to fetch initial products');
        const json = await res.json();
        if (json.success && Array.isArray(json.products)) {
          return json.products;
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') throw err;
      }
      return [];
    }

    // 2. Check query search cache
    const cacheKey = `${trimmed.toLowerCase()}::${limit}`;
    const now = Date.now();
    const cached = this.searchCache.get(cacheKey);

    if (!options?.forceRefresh && cached && (now - cached.timestamp < this.SEARCH_CACHE_TTL_MS)) {
      return cached.products;
    }

    // 3. Perform server-side search
    try {
      const url = getApiUrl(`/api/products?search=${encodeURIComponent(trimmed)}&limit=${limit}`);
      const res = await fetch(url, { signal: options?.signal });
      if (!res.ok) throw new Error(`Search failed with status ${res.status}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.products)) {
        const results = json.products;
        this.searchCache.set(cacheKey, { products: results, timestamp: now });
        return results;
      }
      return [];
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw err;
      }
      console.warn('[ProductService] Server search failed, falling back to local memory cache:', err);
      // Offline fallback: filter from client cache
      const all = this.cache || d1ClientCache.get<Product[]>(CACHE_KEY) || [];
      const lower = trimmed.toLowerCase();
      return all.filter(p => 
        (p.name && p.name.toLowerCase().includes(lower)) ||
        (p.description && p.description.toLowerCase().includes(lower)) ||
        (p.id && p.id.toLowerCase().includes(lower)) ||
        (p.category && p.category.toLowerCase().includes(lower))
      ).slice(0, limit);
    }
  }

  static async getProductById(id: string): Promise<Product | null> {
    if (this.cache) {
      const found = this.cache.find(p => p.id === id);
      if (found) return found;
    }
    const cached = d1ClientCache.get<Product[]>(CACHE_KEY);
    if (cached) {
      const found = cached.find(p => p.id === id);
      if (found) return found;
    }
    try {
      const res = await fetch(getApiUrl(`/api/products/${encodeURIComponent(id)}`));
      if (!res.ok) return null;
      const json = await res.json();
      return json.success && json.product ? json.product : (json.product || null);
    } catch (err) {
      console.error('[ProductService] Error in getProductById:', err);
      return null;
    }
  }

  static async addProduct(data: Omit<Product, 'id'>): Promise<string> {
    const docId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();
    const payload: Product = {
      ...data,
      id: docId,
      createdAt: now,
      updatedAt: now
    };

    // 1. Snapshot previous state for rollback
    const previous = this.cache ? [...this.cache] : [];

    // 2. Optimistic UI update
    this.cache = [payload, ...previous];
    this.clearSearchCache();
    this.lastFetchTime = 0;
    d1ClientCache.set(CACHE_KEY, this.cache);
    this.notifyListeners();

    try {
      const res = await fetch(getApiUrl('/api/products'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to add product (${res.status})`);
      }

      const resJson = await res.json();
      const id = resJson.id || docId;

      // Silent background revalidation
      this.getProducts(true).catch(() => {});

      return id;
    } catch (err) {
      // 3. Rollback on failure
      this.cache = previous;
      d1ClientCache.set(CACHE_KEY, this.cache);
      this.notifyListeners();
      throw err;
    }
  }

  static async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    const now = new Date().toISOString();
    const previous = this.cache ? [...this.cache] : [];

    // Optimistic UI update
    if (this.cache) {
      this.cache = this.cache.map(p => p.id === id ? { ...p, ...data, updatedAt: now } : p);
      this.clearSearchCache();
      this.lastFetchTime = 0;
      d1ClientCache.set(CACHE_KEY, this.cache);
      this.notifyListeners();
    }

    try {
      const payload = {
        ...data,
        updatedAt: now
      };

      const res = await fetch(getApiUrl(`/api/products/${encodeURIComponent(id)}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to update product (${res.status})`);
      }

      // Silent background revalidation
      this.getProducts(true).catch(() => {});
    } catch (err) {
      // Rollback on failure
      this.cache = previous;
      d1ClientCache.set(CACHE_KEY, this.cache);
      this.notifyListeners();
      throw err;
    }
  }

  static async deleteProduct(id: string): Promise<void> {
    const previous = this.cache ? [...this.cache] : [];

    // Optimistic UI update (immediate row removal)
    if (this.cache) {
      this.cache = this.cache.filter(p => p.id !== id);
      this.clearSearchCache();
      this.lastFetchTime = 0;
      d1ClientCache.set(CACHE_KEY, this.cache);
      this.notifyListeners();
    }

    try {
      const res = await fetch(getApiUrl(`/api/products/${encodeURIComponent(id)}`), {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to delete product (${res.status})`);
      }

      // Silent background revalidation
      this.getProducts(true).catch(() => {});
    } catch (err) {
      // Rollback on failure
      this.cache = previous;
      d1ClientCache.set(CACHE_KEY, this.cache);
      this.notifyListeners();
      throw err;
    }
  }
}
