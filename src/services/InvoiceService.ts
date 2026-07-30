import { FirestoreService } from './FirestoreService';
import { Invoice, PaymentRecord } from '../../types';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export class InvoiceService extends FirestoreService {
  static subscribeInvoices(onNext: (data: Invoice[]) => void): () => void {
    return this.listenToCollection<Invoice>('invoices', onNext);
  }

  static async getInvoiceByPublicToken(publicToken: string): Promise<Invoice | null> {
    try {
      const ref = collection(db, 'invoices');
      const q = query(ref, where('publicToken', '==', publicToken));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        return { id: docSnap.id, ...docSnap.data() } as Invoice;
      }
      return null;
    } catch (error) {
      console.error('[InvoiceService] Error fetching invoice by public token:', error);
      return null;
    }
  }

  static async addInvoice(data: Omit<Invoice, 'id'>): Promise<string> {
    const docId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();
    const publicToken = data.publicToken || `inv_tok_${Math.random().toString(36).substring(2, 12)}${Date.now()}`;
    await this.setDocument('invoices', docId, {
      ...data,
      id: docId,
      publicToken,
      createdAt: now,
      updatedAt: now
    });
    return docId;
  }

  static async updateInvoice(id: string, data: Partial<Invoice>): Promise<void> {
    await this.updateDocument('invoices', id, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  }

  static async deleteInvoice(id: string): Promise<void> {
    await this.deleteDocument('invoices', id);
  }

  static async addPayment(invoiceId: string, currentInvoice: Invoice, payment: Omit<PaymentRecord, 'id'>): Promise<void> {
    const newPaymentRecord: PaymentRecord = {
      ...payment,
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    };

    const updatedHistory = [...(currentInvoice.paymentHistory || []), newPaymentRecord];
    const newPaidAmount = updatedHistory.reduce((sum, p) => sum + (p.amount || 0), 0);
    const newBalance = Math.max(0, currentInvoice.totalAmount - newPaidAmount);
    const newStatus: 'PAID' | 'UNPAID' = newBalance <= 0 ? 'PAID' : 'UNPAID';

    await this.updateInvoice(invoiceId, {
      paymentHistory: updatedHistory,
      paidAmount: newPaidAmount,
      balanceDue: newBalance,
      status: newStatus
    });
  }
}
