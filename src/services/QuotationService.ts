import { FirestoreService } from './FirestoreService';
import { Quotation } from '../types';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export function generateShortPublicToken(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; // avoid confusing characters (0/O, 1/l/I)
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join('');
}

export class QuotationService extends FirestoreService {
  static subscribeQuotations(onNext: (data: Quotation[]) => void): () => void {
    return this.listenToCollection<Quotation>('quotations', onNext);
  }

  static async getQuotationByPublicToken(publicToken: string): Promise<Quotation | null> {
    try {
      const ref = collection(db, 'quotations');
      
      // 1. Try publicToken
      const q = query(ref, where('publicToken', '==', publicToken));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        return { id: docSnap.id, ...docSnap.data() } as Quotation;
      }

      // 2. Try document ID
      const qId = query(ref, where('id', '==', publicToken));
      const snapId = await getDocs(qId);
      if (!snapId.empty) {
        const docSnap = snapId.docs[0];
        return { id: docSnap.id, ...docSnap.data() } as Quotation;
      }

      return null;
    } catch (error) {
      console.error('[QuotationService] Error fetching quotation by public token:', error);
      return null;
    }
  }

  static async addQuotation(data: Omit<Quotation, 'id'>): Promise<string> {
    const docId = `q_` + Date.now() + `_` + Math.random().toString(36).substr(2, 6);
    const now = new Date().toISOString();
    const publicToken = data.publicToken || generateShortPublicToken();
    await this.setDocument('quotations', docId, {
      ...data,
      id: docId,
      publicToken,
      createdAt: now,
      updatedAt: now
    });
    return docId;
  }

  static async updateQuotation(id: string, data: Partial<Quotation>): Promise<void> {
    await this.updateDocument('quotations', id, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  }

  static async deleteQuotation(id: string): Promise<void> {
    await this.deleteDocument('quotations', id);
  }
}
