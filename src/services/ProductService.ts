import { FirestoreService } from './FirestoreService';
import { Product } from '../../types';

export class ProductService extends FirestoreService {
  static subscribeProducts(onNext: (data: Product[]) => void): () => void {
    return this.listenToCollection<Product>('products', onNext);
  }

  static async getProducts(): Promise<Product[]> {
    return this.getCollectionData<Product>('products');
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
    return docId;
  }

  static async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    await this.updateDocument('products', id, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  }

  static async deleteProduct(id: string): Promise<void> {
    await this.deleteDocument('products', id);
  }
}
