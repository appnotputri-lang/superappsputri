import { GeneralDocumentData, GeneralDocType } from '../types';

const listeners = new Set<() => void>();

function notifyChange() {
  listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error('[GeneralDocumentService] Error in change listener:', e);
    }
  });
}

function generateShortPublicToken(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join('');
}

export class GeneralDocumentService {
  /**
   * Fetch documents with server-side pagination, search, and type filtering from D1.
   */
  static async getDocuments(options: {
    type?: GeneralDocType;
    search?: string;
    limit?: number | 'all';
    offset?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
  } = {}): Promise<{ records: GeneralDocumentData[]; total: number; limit: number; offset: number }> {
    try {
      const queryParams = new URLSearchParams();
      if (options.type) queryParams.set('type', options.type);
      if (options.search) queryParams.set('search', options.search.trim());
      if (options.limit !== undefined) {
        queryParams.set('limit', String(options.limit));
      }
      if (options.offset !== undefined) {
        queryParams.set('offset', String(options.offset));
      }
      if (options.sortBy) queryParams.set('sortBy', options.sortBy);
      if (options.order) queryParams.set('order', options.order);

      const res = await fetch(`/api/general-documents?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Gagal mengambil data dokumen.`);
      }
      const json = await res.json();
      return {
        records: json.records || (Array.isArray(json) ? json : (json.data || [])),
        total: typeof json.total === 'number' ? json.total : (json.records?.length || 0),
        limit: typeof json.limit === 'number' ? json.limit : (options.limit === 'all' ? -1 : (options.limit || 10)),
        offset: typeof json.offset === 'number' ? json.offset : (options.offset || 0),
      };
    } catch (error) {
      console.error('[GeneralDocumentService] Error fetching documents with pagination:', error);
      throw error;
    }
  }

  /**
   * Listen for local/mutational updates
   */
  static addChangeListener(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }

  /**
   * Subscribe to general documents updates from D1.
   */
  static subscribeGeneralDocuments(
    onNext: (data: GeneralDocumentData[]) => void,
    type?: GeneralDocType
  ): () => void {
    let active = true;
    const fetcher = async () => {
      try {
        const queryParams = new URLSearchParams({ limit: '10' });
        if (type) {
          queryParams.set('type', type);
        }
        const res = await fetch(`/api/general-documents?${queryParams.toString()}`);
        if (res.ok && active) {
          const json = await res.json();
          const records: GeneralDocumentData[] = json.records || (Array.isArray(json) ? json : (json.data || []));
          onNext(records);
        }
      } catch (err) {
        console.error('[GeneralDocumentService] Error fetching general documents:', err);
      }
    };

    fetcher();
    listeners.add(fetcher);

    return () => {
      active = false;
      listeners.delete(fetcher);
    };
  }

  /**
   * Get a document by ID.
   */
  static async getDocumentById(id: string): Promise<GeneralDocumentData | null> {
    try {
      const res = await fetch(`/api/general-documents/${encodeURIComponent(id)}`);
      if (res.ok) {
        const json = await res.json();
        return json.data || json;
      }
      return null;
    } catch (error) {
      console.error('[GeneralDocumentService] Error fetching document by ID:', error);
      return null;
    }
  }

  /**
   * Get a document by public token with fallback to ID.
   */
  static async getDocumentByPublicToken(publicToken: string): Promise<GeneralDocumentData | null> {
    try {
      const res = await fetch(`/api/general-documents/public/${encodeURIComponent(publicToken)}`);
      if (res.ok) {
        const json = await res.json();
        return json.data || json;
      }

      // Fallback by ID
      const resId = await fetch(`/api/general-documents/${encodeURIComponent(publicToken)}`);
      if (resId.ok) {
        const jsonId = await resId.json();
        return jsonId.data || jsonId;
      }

      return null;
    } catch (error) {
      console.error('[GeneralDocumentService] Error fetching document by public token:', error);
      return null;
    }
  }

  /**
   * Add a new general document to Cloudflare D1.
   */
  static async addDocument(data: Omit<GeneralDocumentData, 'id'> & { id?: string }): Promise<string> {
    const docId = data.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();
    const publicToken = data.publicToken || generateShortPublicToken();
    const payload: GeneralDocumentData = {
      ...data,
      id: docId,
      docType: (data.docType || 'RECEIPT').toUpperCase() as GeneralDocType,
      publicToken,
      createdAt: data.createdAt || now,
      updatedAt: now,
    };

    console.log('[GeneralDocument] CREATE', {
      id: payload.id,
      docType: payload.docType,
      referenceNo: payload.referenceNo,
      clientName: payload.clientName,
      itemsCount: payload.items?.length || 0,
    });

    const res = await fetch('/api/general-documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    console.log('[GeneralDocument] response status', res.status);
    const resBody = await res.json().catch(() => ({}));
    console.log('[GeneralDocument] response body', {
      success: res.ok,
      status: res.status,
      id: resBody?.id || resBody?.data?.id || docId,
    });

    if (!res.ok) {
      const errorMsg = resBody?.error || resBody?.message || `HTTP ${res.status}: Gagal menyimpan dokumen.`;
      throw new Error(errorMsg);
    }

    const savedDoc = resBody.data || resBody;
    const finalId = savedDoc?.id || docId;

    return finalId;
  }

  /**
   * Update an existing general document in Cloudflare D1.
   */
  static async updateDocumentData(id: string, data: Partial<GeneralDocumentData>): Promise<GeneralDocumentData> {
    console.log('[GeneralDocument] UPDATE', {
      id,
      docType: data.docType,
      referenceNo: data.referenceNo,
      clientName: data.clientName,
    });

    const res = await fetch(`/api/general-documents/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    console.log('[GeneralDocument] response status', res.status);
    const resBody = await res.json().catch(() => ({}));
    console.log('[GeneralDocument] response body', {
      success: res.ok,
      status: res.status,
      id,
    });

    if (!res.ok) {
      const errorMsg = resBody?.error || resBody?.message || `HTTP ${res.status}: Gagal memperbarui dokumen.`;
      throw new Error(errorMsg);
    }

    return resBody.data || resBody;
  }

  /**
   * Delete a general document from Cloudflare D1.
   */
  static async deleteDocumentData(id: string): Promise<void> {
    console.log('[GeneralDocument] DELETE', { id });

    const res = await fetch(`/api/general-documents/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    console.log('[GeneralDocument] response status', res.status);
    const resBody = await res.json().catch(() => ({}));
    console.log('[GeneralDocument] response body', {
      success: res.ok,
      status: res.status,
      id,
    });

    if (!res.ok) {
      const errorMsg = resBody?.error || resBody?.message || `HTTP ${res.status}: Gagal menghapus dokumen.`;
      throw new Error(errorMsg);
    }
  }
}
