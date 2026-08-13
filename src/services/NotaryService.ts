import { FirestoreService } from './FirestoreService';
import { Deed, PrivateDeed, ProtestCheque, OutgoingMail, IncomingMail } from '../../types';
import { db, isQuotaExceeded } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';

export class NotaryService extends FirestoreService {
  // --- DEEDS (AKTA) ---
  /**
   * Subscribe ONLY to deeds in a specific month/year.
   * Uses date >= YYYY-MM-01 and date < YYYY-MM+1-01
   */
  static subscribeDeedsByMonth(year: number, month: number, onNext: (data: Deed[]) => void): () => void {
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const endStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    return this.listenToCollection<Deed>(
      'deeds',
      onNext,
      where('date', '>=', startStr),
      where('date', '<', endStr)
    );
  }

  /**
   * One-time fetch for deeds in a specific month/year.
   */
  static async getDeedsByMonth(year: number, month: number): Promise<Deed[]> {
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const endStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    return this.getCollectionData<Deed>(
      'deeds',
      where('date', '>=', startStr),
      where('date', '<', endStr)
    );
  }

  /**
   * One-time fetch for deeds in a specific year (used only when user explicitly triggers reordering/Rapikan No. Urut).
   */
  static async getDeedsByYear(year: number): Promise<Deed[]> {
    const startStr = `${year}-01-01`;
    const endStr = `${year + 1}-01-01`;

    return this.getCollectionData<Deed>(
      'deeds',
      where('date', '>=', startStr),
      where('date', '<', endStr)
    );
  }

  /**
   * One-time fetch for all deeds across all years (used only when user explicitly triggers reordering for ALL years).
   */
  static async getAllDeedsForReorder(): Promise<Deed[]> {
    return this.getCollectionData<Deed>('deeds');
  }

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
  static subscribePrivateDeedsByMonth(year: number, month: number, onNext: (data: PrivateDeed[]) => void): () => void {
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const endStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    return this.listenToCollection<PrivateDeed>(
      'private_deeds',
      onNext,
      where('registrationDate', '>=', startStr),
      where('registrationDate', '<', endStr)
    );
  }

  static async getPrivateDeedsByMonth(year: number, month: number): Promise<PrivateDeed[]> {
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const endStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    return this.getCollectionData<PrivateDeed>(
      'private_deeds',
      where('registrationDate', '>=', startStr),
      where('registrationDate', '<', endStr)
    );
  }

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
  static subscribeProtestChequesByMonth(year: number, month: number, onNext: (data: ProtestCheque[]) => void): () => void {
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const endStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    return this.listenToCollection<ProtestCheque>(
      'protest_cheques',
      onNext,
      where('protestDate', '>=', startStr),
      where('protestDate', '<', endStr)
    );
  }

  static async getProtestChequesByMonth(year: number, month: number): Promise<ProtestCheque[]> {
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const endStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    return this.getCollectionData<ProtestCheque>(
      'protest_cheques',
      where('protestDate', '>=', startStr),
      where('protestDate', '<', endStr)
    );
  }

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
  static subscribeOutgoingMailsByMonth(year: number, month: number, onNext: (data: OutgoingMail[]) => void): () => void {
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const endStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    return this.listenToCollection<OutgoingMail>(
      'outgoing_mails',
      onNext,
      where('date', '>=', startStr),
      where('date', '<', endStr)
    );
  }

  static async getOutgoingMailsByMonth(year: number, month: number): Promise<OutgoingMail[]> {
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const endStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    return this.getCollectionData<OutgoingMail>(
      'outgoing_mails',
      where('date', '>=', startStr),
      where('date', '<', endStr)
    );
  }

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
