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
        const res = await fetch(getApiUrl('/api/invoices?limit=10'));
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && Array.isArray(json.invoices) && active) {
          onNext(json.invoices);
        }
      } catch (err) {
        console.warn('[InvoiceService] Error fetching invoices:', err);
      }
    };

    fetchInvoices();

    const listener = () => {
      fetchInvoices();
    };
    this.listeners.add(listener);

    return () => {
      active = false;
      this.listeners.delete(listener);
    };
  }

  static subscribeUnpaidInvoices(onNext: (data: Invoice[]) => void): () => void {
    let active = true;

    const fetchUnpaid = async () => {
      try {
        const res = await fetch(getApiUrl('/api/invoices?status=UNPAID&limit=10'));
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && Array.isArray(json.invoices) && active) {
          onNext(json.invoices);
        }
      } catch (err) {
        console.warn('[InvoiceService] Error fetching unpaid invoices:', err);
      }
    };

    fetchUnpaid();

    const listener = () => {
      fetchUnpaid();
    };
    this.listeners.add(listener);

    return () => {
      active = false;
      this.listeners.delete(listener);
    };
  }

  static async getInvoicesPaginated(params: {
    page: number;
    pageSize: number | string;
    search?: string;
    status?: string;
  }): Promise<{ invoices: Invoice[]; total: number; success: boolean }> {
    try {
      const limit = params.pageSize === 'Semua' || params.pageSize === 'ALL' || params.pageSize === 0 ? 500 : Number(params.pageSize);
      const offset = (params.page - 1) * limit;
      const searchParam = params.search ? `&search=${encodeURIComponent(params.search)}` : '';
      const statusParam = params.status && params.status !== 'ALL' ? `&status=${encodeURIComponent(params.status)}` : '';
      
      const res = await fetch(getApiUrl(`/api/invoices?limit=${limit}&offset=${offset}${searchParam}${statusParam}`));
      if (!res.ok) throw new Error('Failed to fetch invoices');
      const json = await res.json();
      if (json.success && Array.isArray(json.invoices)) {
        return {
          success: true,
          invoices: json.invoices,
          total: typeof json.total !== 'undefined' ? json.total : (json.count || json.invoices.length)
        };
      }
      return { success: false, invoices: [], total: 0 };
    } catch (err) {
      console.error('[InvoiceService] Error fetching paginated invoices:', err);
      return { success: false, invoices: [], total: 0 };
    }
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

  /**
   * Authoritative next invoice number for a given year, computed server-side
   * from the actual D1 `invoices` table (highest existing INV/{year}/{seq}
   * in use, +1). Throws on failure instead of falling back to a guessed
   * number — the caller must decide how to handle a failed lookup rather
   * than silently offering a number that was never actually verified.
   */
  static async getNextInvoiceNumber(year: number): Promise<string> {
    const res = await fetch(getApiUrl(`/api/invoices/next-number?year=${encodeURIComponent(String(year))}`));
    if (!res.ok) {
      throw new Error(`Gagal mengambil nomor invoice terbaru dari server (status ${res.status}).`);
    }
    const json = await res.json();
    if (!json || !json.nextInvoiceNumber) {
      throw new Error('Respon nomor invoice terbaru dari server tidak lengkap.');
    }
    return json.nextInvoiceNumber;
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

  static async addInvoice(data: Omit<Invoice, 'id'>): Promise<{ id: string; publicToken: string }> {
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
    // Prefer whatever publicToken the server actually persisted (it echoes
    // back the created row) — falls back to the one we generated above,
    // which is what actually got sent, so this should always be defined.
    const createdPublicToken = resJson.invoice?.publicToken || publicToken;

    this.notifyListeners();
    return { id: createdId, publicToken: createdPublicToken };
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