import { getApiUrl, getAuthHeaders } from '../lib/api';
import { Invoice, PaymentRecord } from '../../types';

export class InvoiceService {
  static subscribeInvoices(onNext: (data: Invoice[]) => void): () => void {
    const fetchAndNotify = async () => {
      try {
        const response = await fetch(getApiUrl('/api/invoices'), {
          headers: await getAuthHeaders()
        });
        if (!response.ok) {
           console.error('[InvoiceService] API Error:', response.status, await response.text());
           return;
        }
        const data = await response.json();
        if (data.success) {
          onNext(data.invoices);
        }
      } catch (error) {
        console.error('[InvoiceService] Error polling invoices:', error);
      }
    };
    fetchAndNotify();
    const timer = setInterval(fetchAndNotify, 30000);
    return () => clearInterval(timer);
  }

  static subscribeUnpaidInvoices(onNext: (data: Invoice[]) => void): () => void {
    const fetchAndNotify = async () => {
      try {
        const response = await fetch(getApiUrl('/api/invoices?status=UNPAID'), {
          headers: await getAuthHeaders()
        });
        if (!response.ok) {
           console.error('[InvoiceService] API Error:', response.status, await response.text());
           return;
        }
        const data = await response.json();
        if (data.success) {
          onNext(data.invoices);
        }
      } catch (error) {
        console.error('[InvoiceService] Error polling unpaid invoices:', error);
      }
    };
    fetchAndNotify();
    const timer = setInterval(fetchAndNotify, 30000);
    return () => clearInterval(timer);
  }

  static async getRecentInvoices(limitCount = 10): Promise<Invoice[]> {
    const response = await fetch(getApiUrl(`/api/invoices?limit=${limitCount}`), {
      headers: await getAuthHeaders()
    });
    const data = await response.json();
    return data.success ? data.invoices : [];
  }

  static async getInvoiceByPublicToken(publicToken: string): Promise<Invoice | null> {
    const response = await fetch(getApiUrl(`/api/invoices/public/${publicToken}`));
    const data = await response.json();
    return data.success ? data.invoice : null;
  }

  static async addInvoice(invoice: Partial<Invoice>): Promise<string> {
    const response = await fetch(getApiUrl('/api/invoices'), {
      method: 'POST',
      headers: { ...(await getAuthHeaders()), 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice),
    });
    const data = await response.json();
    if (!data.success) throw new Error('Failed to create invoice');
    return data.id;
  }

  static async updateInvoice(id: string, invoice: Partial<Invoice>): Promise<void> {
    const response = await fetch(getApiUrl(`/api/invoices/${id}`), {
      method: 'PUT',
      headers: { ...(await getAuthHeaders()), 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice),
    });
    const data = await response.json();
    if (!data.success) throw new Error('Failed to update invoice');
  }

  static async deleteInvoice(id: string): Promise<void> {
    const response = await fetch(getApiUrl(`/api/invoices/${id}`), {
      method: 'DELETE',
      headers: await getAuthHeaders()
    });
    const data = await response.json();
    if (!data.success) throw new Error('Failed to delete invoice');
  }

  static async addPayment(invoiceId: string, invoice: Invoice, payment: PaymentRecord): Promise<void> {
    const updatedInvoice = {
      ...invoice,
      paymentHistory: [...(invoice.paymentHistory || []), payment],
      paidAmount: (invoice.paidAmount || 0) + payment.amount,
      balanceDue: (invoice.balanceDue || 0) - payment.amount,
      status: ((invoice.balanceDue || 0) - payment.amount <= 0) ? 'PAID' : 'UNPAID',
      updatedAt: new Date().toISOString()
    };
    await this.updateInvoice(invoiceId, updatedInvoice);
  }
}
