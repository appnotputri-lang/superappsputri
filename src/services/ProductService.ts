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

  static subscribeProducts(onNext: (data: Product[]) => void): () => void {
    this.listeners.add(onNext);

    // If we have cached data in memory or localStorage, fire immediately
    const cached = this.cache || d1ClientCache.get<Product[]>(CACHE_KEY);
    if (cached) {
      this.cache = cached;
      onNext(cached);
    }

    // Always trigger background revalidation
    this.getProducts(true).then((data) => {
      onNext(data);
    }).catch((err) => {
      console.error('[ProductService] Error fetching products in subscriber:', err);
    });

    return () => {
      this.listeners.delete(onNext);
    };
  }

  static async getProducts(forceRefresh = false): Promise<Product[]> {
    if (!forceRefresh) {
      if (this.cache) return this.cache;
      const cached = d1ClientCache.get<Product[]>(CACHE_KEY);
      if (cached) {
        this.cache = cached;
        return cached;
      }
    }

    try {
      const res = await fetch(getApiUrl('/api/products?limit=500'));
      if (!res.ok) throw new Error('Failed to fetch products');
      const json = await res.json();
      if (json.success && Array.isArray(json.products)) {
        this.cache = json.products;
        d1ClientCache.set(CACHE_KEY, json.products);
        this.notifyListeners();
        return json.products;
      }
      return [];
    } catch (error) {
      console.error('[ProductService] Error in getProducts:', error);
      const fallback = this.cache || d1ClientCache.get<Product[]>(CACHE_KEY) || [];
      return fallback;
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
