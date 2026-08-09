import { FirestoreService } from './FirestoreService';
import { GeneralDocumentData } from '../types';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

function generateShortPublicToken(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join('');
}

export class GeneralDocumentService extends FirestoreService {
  static subscribeGeneralDocuments(onNext: (data: GeneralDocumentData[]) => void): () => void {
    return this.listenToCollection<GeneralDocumentData>('general_documents', onNext);
  }

  static async getDocumentByPublicToken(publicToken: string): Promise<GeneralDocumentData | null> {
    try {
      const ref = collection(db, 'general_documents');
      
      // 1. Try publicToken
      const q = query(ref, where('publicToken', '==', publicToken));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        return { id: docSnap.id, ...docSnap.data() } as GeneralDocumentData;
      }

      // 2. Try document ID
      const qId = query(ref, where('id', '==', publicToken));
      const snapId = await getDocs(qId);
      if (!snapId.empty) {
        const docSnap = snapId.docs[0];
        return { id: docSnap.id, ...docSnap.data() } as GeneralDocumentData;
      }

      return null;
    } catch (error) {
      console.error('[GeneralDocumentService] Error fetching document by public token:', error);
      return null;
    }
  }

  static async addDocument(data: Omit<GeneralDocumentData, 'id'>): Promise<string> {
    const docId = `doc_` + Date.now() + `_` + Math.random().toString(36).substr(2, 6);
    const now = new Date().toISOString();
    const publicToken = data.publicToken || generateShortPublicToken();
    await this.setDocument('general_documents', docId, {
      ...data,
      id: docId,
      publicToken,
      createdAt: now,
      updatedAt: now
    });
    return docId;
  }

  static async updateDocumentData(id: string, data: Partial<GeneralDocumentData>): Promise<void> {
    await this.updateDocument('general_documents', id, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  }

  static async deleteDocumentData(id: string): Promise<void> {
    await this.deleteDocument('general_documents', id);
  }
}
