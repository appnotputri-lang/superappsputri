import { FirestoreService } from './FirestoreService';
import { Deed, PrivateDeed, ProtestCheque, OutgoingMail, IncomingMail } from '../../types';
import { db, isQuotaExceeded } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

export class NotaryService extends FirestoreService {
  // --- DEEDS (AKTA) ---
  static subscribeDeeds(onNext: (data: Deed[]) => void): () => void {
    return this.listenToCollection<Deed>('deeds', onNext);
  }

  static async getRecentDeeds(limitCount = 10): Promise<Deed[]> {
    try {
      const colRef = collection(db, 'deeds');
      const q = query(colRef, orderBy('createdAt', 'desc'), limit(limitCount));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Deed));
    } catch (err) {
      if (isQuotaExceeded(err)) {
        console.warn('[NotaryService] Quota exceeded on getRecentDeeds, skipping fallback');
        return [];
      }
      console.warn('[NotaryService] Error fetching recent deeds with orderBy, falling back:', err);
      const colRef = collection(db, 'deeds');
      const q = query(colRef, limit(limitCount));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Deed));
    }
  }

  static async addDeed(data: Omit<Deed, 'id'>): Promise<string> {
    const docId = `deed_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();
    await this.setDocument('deeds', docId, {
      ...data,
      id: docId,
      createdAt: now,
      updatedAt: now
    });
    return docId;
  }

  static async updateDeed(id: string, data: Partial<Deed>): Promise<void> {
    await this.updateDocument('deeds', id, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  }

  static async deleteDeed(id: string): Promise<void> {
    await this.deleteDocument('deeds', id);
  }

  // --- PRIVATE DEEDS (LEGALISASI & WAARMERKING) ---
  static subscribePrivateDeeds(onNext: (data: PrivateDeed[]) => void): () => void {
    return this.listenToCollection<PrivateDeed>('private_deeds', onNext);
  }

  static async addPrivateDeed(data: Omit<PrivateDeed, 'id'>): Promise<string> {
    const docId = `pdeed_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();
    await this.setDocument('private_deeds', docId, {
      ...data,
      id: docId,
      createdAt: now,
      updatedAt: now
    });
    return docId;
  }

  static async updatePrivateDeed(id: string, data: Partial<PrivateDeed>): Promise<void> {
    await this.updateDocument('private_deeds', id, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  }

  static async deletePrivateDeed(id: string): Promise<void> {
    await this.deleteDocument('private_deeds', id);
  }

  // --- PROTEST CHEQUES ---
  static subscribeProtestCheques(onNext: (data: ProtestCheque[]) => void): () => void {
    return this.listenToCollection<ProtestCheque>('protest_cheques', onNext);
  }

  static async addProtestCheque(data: Omit<ProtestCheque, 'id'>): Promise<string> {
    const docId = `cheque_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();
    await this.setDocument('protest_cheques', docId, {
      ...data,
      id: docId,
      createdAt: now,
      updatedAt: now
    });
    return docId;
  }

  static async updateProtestCheque(id: string, data: Partial<ProtestCheque>): Promise<void> {
    await this.updateDocument('protest_cheques', id, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  }

  static async deleteProtestCheque(id: string): Promise<void> {
    await this.deleteDocument('protest_cheques', id);
  }

  // --- OUTGOING MAILS ---
  static subscribeOutgoingMails(onNext: (data: OutgoingMail[]) => void): () => void {
    return this.listenToCollection<OutgoingMail>('outgoing_mails', onNext);
  }

  static async getRecentOutgoingMails(limitCount = 10): Promise<OutgoingMail[]> {
    try {
      const colRef = collection(db, 'outgoing_mails');
      const q = query(colRef, orderBy('createdAt', 'desc'), limit(limitCount));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as OutgoingMail));
    } catch (err) {
      if (isQuotaExceeded(err)) {
        console.warn('[NotaryService] Quota exceeded on getRecentOutgoingMails, skipping fallback');
        return [];
      }
      console.warn('[NotaryService] Error fetching recent outgoing mails with orderBy, falling back:', err);
      const colRef = collection(db, 'outgoing_mails');
      const q = query(colRef, limit(limitCount));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as OutgoingMail));
    }
  }

  static async addOutgoingMail(data: Omit<OutgoingMail, 'id'>): Promise<string> {
    const docId = `mail_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();
    await this.setDocument('outgoing_mails', docId, {
      ...data,
      id: docId,
      createdAt: now,
      updatedAt: now
    });
    return docId;
  }

  static async updateOutgoingMail(id: string, data: Partial<OutgoingMail>): Promise<void> {
    await this.updateDocument('outgoing_mails', id, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  }

  static async deleteOutgoingMail(id: string): Promise<void> {
    await this.deleteDocument('outgoing_mails', id);
  }

  // --- INCOMING MAILS ---
  static subscribeIncomingMails(onNext: (data: IncomingMail[]) => void): () => void {
    return this.listenToCollection<IncomingMail>('incoming_mails', onNext);
  }

  static async addIncomingMail(data: Omit<IncomingMail, 'id'>): Promise<string> {
    const docId = `inmail_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();
    await this.setDocument('incoming_mails', docId, {
      ...data,
      id: docId,
      createdAt: now,
      updatedAt: now
    });
    return docId;
  }

  static async updateIncomingMail(id: string, data: Partial<IncomingMail>): Promise<void> {
    await this.updateDocument('incoming_mails', id, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  }

  static async deleteIncomingMail(id: string): Promise<void> {
    await this.deleteDocument('incoming_mails', id);
  }
}
