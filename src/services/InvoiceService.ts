import { Invoice, PaymentRecord } from '../../types';

function generateShortPublicToken(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join('');
}

function getApiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (typeof window !== 'undefined') {
    return path;
  }
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

export class InvoiceService {
  private static listeners: Set<() => void> = new Set();

  public static notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('[InvoiceService] Error in listener callback:', e);
      }
    });
  }

  static subscribeInvoices(onNext: (data: Invoice[]) => void): () => void {
    let active = true;

    const fetchInvoices = async () => {
      try {
        const res = await fetch(getApiUrl('/api/invoices?limit=500'));
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && Array.isArray(json.invoices) && active) {
          onNext(json.invoices);
        }
      } catch (err) {
        console.warn('[InvoiceService] Error polling invoices:', err);
      }
    };

    fetchInvoices();

    // Polling every 15 seconds (non-aggressive)
    const intervalId = setInterval(fetchInvoices, 15000);

    const listener = () => {
      fetchInvoices();
    };
    this.listeners.add(listener);

    return () => {
      active = false;
      clearInterval(intervalId);
      this.listeners.delete(listener);
    };
  }

  static subscribeUnpaidInvoices(onNext: (data: Invoice[]) => void): () => void {
    let active = true;

    const fetchUnpaid = async () => {
      try {
        const res = await fetch(getApiUrl('/api/invoices?status=UNPAID&limit=500'));
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && Array.isArray(json.invoices) && active) {
          onNext(json.invoices);
        }
      } catch (err) {
        console.warn('[InvoiceService] Error polling unpaid invoices:', err);
      }
    };

    fetchUnpaid();

    // Polling every 15 seconds (non-aggressive)
    const intervalId = setInterval(fetchUnpaid, 15000);

    const listener = () => {
      fetchUnpaid();
    };
    this.listeners.add(listener);

    return () => {
      active = false;
      clearInterval(intervalId);
      this.listeners.delete(listener);
    };
  }

  static async getRecentInvoices(limitCount = 10): Promise<Invoice[]> {
    try {
      const res = await fetch(getApiUrl(`/api/invoices?limit=${limitCount}`));
      if (!res.ok) return [];
      const json = await res.json();
      return json.success && Array.isArray(json.invoices) ? json.invoices : [];
    } catch (err) {
      console.warn('[InvoiceService] Error fetching recent invoices:', err);
      return [];
    }
  }

  static async getInvoiceByPublicToken(publicToken: string): Promise<Invoice | null> {
    try {
      const encodedToken = encodeURIComponent(publicToken);
      const res = await fetch(getApiUrl(`/api/invoices/public/${encodedToken}`));
      if (!res.ok) return null;
      const json = await res.json();
      return json.success && json.invoice ? json.invoice : null;
    } catch (error) {
      console.error('[InvoiceService] Error fetching invoice by public token:', error);
      return null;
    }
  }

  static async addInvoice(data: Omit<Invoice, 'id'>): Promise<string> {
    const docId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();
    const publicToken = data.publicToken || generateShortPublicToken();

    const payload: Invoice = {
      ...data,
      id: docId,
      publicToken,
      createdAt: data.createdAt || now,
      updatedAt: now
    };

    const res = await fetch(getApiUrl('/api/invoices'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Failed to add invoice (${res.status})`);
    }

    const resJson = await res.json();
    const createdId = resJson.id || docId;

    this.notifyListeners();
    return createdId;
  }

  static async updateInvoice(id: string, data: Partial<Invoice>): Promise<void> {
    const now = new Date().toISOString();
    const payload = {
      ...data,
      updatedAt: now
    };

    const res = await fetch(getApiUrl(`/api/invoices/${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Failed to update invoice (${res.status})`);
    }

    this.notifyListeners();
  }

  static async deleteInvoice(id: string): Promise<void> {
    const res = await fetch(getApiUrl(`/api/invoices/${encodeURIComponent(id)}`), {
      method: 'DELETE'
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Failed to delete invoice (${res.status})`);
    }

    this.notifyListeners();
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
