import { FirestoreService } from './FirestoreService';
import { Product } from '../../types';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export class ProductService extends FirestoreService {
  private static cache: Product[] | null = null;
  private static unsub: (() => void) | null = null;
  private static listeners = new Set<(data: Product[]) => void>();

  static subscribeProducts(onNext: (data: Product[]) => void): () => void {
    this.listeners.add(onNext);
    
    // If we already have cached data, fire immediately
    if (this.cache) {
      console.log(`[ProductPerformance] Cache HIT - subscribeProducts returned ${this.cache.length} cached items.`);
      onNext(this.cache);
    }

    if (!this.unsub) {
      const startTime = performance.now();
      console.log(`[ProductPerformance] Cache MISS - starting realtime listener for "products"`);
      this.unsub = onSnapshot(
        collection(db, 'products'),
        (snapshot) => {
          const duration = (performance.now() - startTime).toFixed(2);
          const data: Product[] = [];
          snapshot.forEach(docSnap => {
            data.push({ id: docSnap.id, ...docSnap.data() } as Product);
          });
          ProductService.cache = data;
          console.log(`[ProductPerformance] Network READ - products listener updated: ${data.length} items. Time: ${duration}ms. Reads: ${data.length}. Status: SUCCESS`);
          ProductService.listeners.forEach(listener => listener(data));
        },
        (error) => {
          console.error(`[ProductPerformance] Network READ ERROR for products:`, error);
        }
      );
    }

    return () => {
      this.listeners.delete(onNext);
      if (this.listeners.size === 0 && this.unsub) {
        this.unsub();
        this.unsub = null;
      }
    };
  }

  static async getProducts(forceRefresh = false): Promise<Product[]> {
    if (this.cache && !forceRefresh) {
      console.log(`[ProductPerformance] Cache HIT - getProducts returned ${this.cache.length} cached items.`);
      return this.cache;
    }
    
    const startTime = performance.now();
    console.log(`[ProductPerformance] Cache MISS - getProducts fetching from network`);
    try {
      const data = await this.getCollectionData<Product>('products');
      const duration = (performance.now() - startTime).toFixed(2);
      this.cache = data;
      console.log(`[ProductPerformance] Network READ - getProducts loaded ${data.length} items. Time: ${duration}ms. Reads: ${data.length}. Status: SUCCESS`);
      return data;
    } catch (error) {
      console.error(`[ProductPerformance] Network READ ERROR for products:`, error);
      throw error;
    }
  }

  static async addProduct(data: Omit<Product, 'id'>): Promise<string> {
    const docId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();
    await this.setDocument('products', docId, {
      ...data,
      id: docId,
      createdAt: now,
      updatedAt: now
    });
    this.cache = null; // Invalidate cache
    return docId;
  }

  static async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    await this.updateDocument('products', id, {
      ...data,
      updatedAt: new Date().toISOString()
    });
    this.cache = null; // Invalidate cache
  }

  static async deleteProduct(id: string): Promise<void> {
    await this.deleteDocument('products', id);
    this.cache = null; // Invalidate cache
  }
}
