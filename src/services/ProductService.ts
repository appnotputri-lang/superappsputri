import { Product } from '../types';

function getApiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (typeof window !== 'undefined') {
    return path;
  }
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

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

    // If we have cached data, fire immediately
    if (this.cache) {
      onNext(this.cache);
    } else {
      this.getProducts(true).then((data) => {
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
    if (this.cache && !forceRefresh) {
      return this.cache;
    }

    try {
      const res = await fetch(getApiUrl('/api/products?limit=500'));
      if (!res.ok) throw new Error('Failed to fetch products');
      const json = await res.json();
      if (json.success && Array.isArray(json.products)) {
        this.cache = json.products;
        this.notifyListeners();
        return json.products;
      }
      return [];
    } catch (error) {
      console.error('[ProductService] Error in getProducts:', error);
      return this.cache || [];
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

    // Refresh cache background
    await this.getProducts(true);

    return id;
  }

  static async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    const now = new Date().toISOString();
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

    // Refresh cache background
    await this.getProducts(true);
  }

  static async deleteProduct(id: string): Promise<void> {
    const res = await fetch(getApiUrl(`/api/products/${encodeURIComponent(id)}`), {
      method: 'DELETE'
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Failed to delete product (${res.status})`);
    }

    // Refresh cache background
    await this.getProducts(true);
  }
}
