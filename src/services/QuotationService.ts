import { Quotation } from '../types';

function getApiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (typeof window !== 'undefined') {
    return path;
  }
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function generateShortPublicToken(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join('');
}

export class QuotationService {
  private static listeners: Set<() => void> = new Set();

  public static notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('[QuotationService] Error in listener callback:', e);
      }
    });
  }

  static subscribeQuotations(onNext: (data: Quotation[]) => void, limitCount?: number): () => void {
    let active = true;

    const fetchQuotations = async () => {
      try {
        const limit = limitCount || 10;
        const res = await fetch(getApiUrl(`/api/quotations?limit=${limit}`));
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && Array.isArray(json.quotations) && active) {
          onNext(json.quotations);
        }
      } catch (err) {
        console.warn('[QuotationService] Error fetching quotations:', err);
      }
    };

    fetchQuotations();

    const listener = () => {
      fetchQuotations();
    };
    this.listeners.add(listener);

    return () => {
      active = false;
      this.listeners.delete(listener);
    };
  }

  static async getQuotationsPaginated(params: {
    page: number;
    pageSize: number | string;
    search?: string;
    status?: string;
  }): Promise<{ quotations: Quotation[]; total: number; success: boolean }> {
    try {
      const limit = params.pageSize === 'Semua' || params.pageSize === 'ALL' || params.pageSize === 0 ? 500 : Number(params.pageSize);
      const offset = (params.page - 1) * limit;
      const searchParam = params.search ? `&search=${encodeURIComponent(params.search)}` : '';
      const statusParam = params.status && params.status !== 'ALL' ? `&status=${encodeURIComponent(params.status)}` : '';

      const res = await fetch(getApiUrl(`/api/quotations?limit=${limit}&offset=${offset}${searchParam}${statusParam}`));
      if (!res.ok) throw new Error('Failed to fetch quotations');
      const json = await res.json();
      if (json.success && Array.isArray(json.quotations)) {
        return {
          success: true,
          quotations: json.quotations,
          total: typeof json.total !== 'undefined' ? json.total : json.quotations.length
        };
      }
      return { success: false, quotations: [], total: 0 };
    } catch (err) {
      console.error('[QuotationService] Error fetching paginated quotations:', err);
      return { success: false, quotations: [], total: 0 };
    }
  }

  static async getQuotationByPublicToken(publicToken: string): Promise<Quotation | null> {
    try {
      const res = await fetch(getApiUrl(`/api/quotations/${encodeURIComponent(publicToken)}`));
      if (!res.ok) return null;
      const json = await res.json();
      return json.success && json.quotation ? json.quotation : null;
    } catch (error) {
      console.error('[QuotationService] Error fetching quotation by public token:', error);
      return null;
    }
  }

  static async addQuotation(data: Omit<Quotation, 'id'>): Promise<string> {
    const docId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();
    const publicToken = data.publicToken || generateShortPublicToken();

    const payload: Quotation = {
      ...data,
      id: docId,
      publicToken,
      createdAt: data.createdAt || now,
      updatedAt: now
    };

    const res = await fetch(getApiUrl('/api/quotations'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Failed to add quotation (${res.status})`);
    }

    const resJson = await res.json();
    const createdId = resJson.id || docId;

    this.notifyListeners();
    return createdId;
  }

  static async updateQuotation(id: string, data: Partial<Quotation>): Promise<void> {
    const now = new Date().toISOString();
    const payload = {
      ...data,
      updatedAt: now
    };

    const res = await fetch(getApiUrl(`/api/quotations/${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Failed to update quotation (${res.status})`);
    }

    this.notifyListeners();
  }

  static async deleteQuotation(id: string): Promise<void> {
    const res = await fetch(getApiUrl(`/api/quotations/${encodeURIComponent(id)}`), {
      method: 'DELETE'
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Failed to delete quotation (${res.status})`);
    }

    this.notifyListeners();
  }
}
