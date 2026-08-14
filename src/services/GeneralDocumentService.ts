import { GeneralDocumentData } from '../types';

const listeners = new Set<() => void>();

function notifyChange() {
  listeners.forEach(fn => {
    try { fn(); } catch (e) { console.error('Error in GeneralDocumentService listener:', e); }
  });
}

function generateShortPublicToken(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join('');
}

export class GeneralDocumentService {
  static subscribeGeneralDocuments(onNext: (data: GeneralDocumentData[]) => void): () => void {
    let active = true;
    const fetcher = async () => {
      try {
        const res = await fetch('/api/general-documents?limit=1000');
        if (res.ok && active) {
          const json = await res.json();
          const records = json.records || (Array.isArray(json) ? json : []);
          onNext(records);
        }
      } catch (err) {
        console.error('[GeneralDocumentService] Error subscribing to general documents:', err);
      }
    };

    fetcher();
    listeners.add(fetcher);

    return () => {
      active = false;
      listeners.delete(fetcher);
    };
  }

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

  static async addDocument(data: Omit<GeneralDocumentData, 'id'> & { id?: string }): Promise<string> {
    const docId = data.id || `doc_` + Date.now() + `_` + Math.random().toString(36).substr(2, 6);
    const now = new Date().toISOString();
    const publicToken = data.publicToken || generateShortPublicToken();
    const payload = {
      ...data,
      id: docId,
      publicToken,
      createdAt: now,
      updatedAt: now
    };

    const res = await fetch('/api/general-documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error('Failed to create general document in D1');
    }

    notifyChange();
    return docId;
  }

  static async updateDocumentData(id: string, data: Partial<GeneralDocumentData>): Promise<void> {
    const res = await fetch(`/api/general-documents/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      throw new Error(`Failed to update general document ${id} in D1`);
    }

    notifyChange();
  }

  static async deleteDocumentData(id: string): Promise<void> {
    const res = await fetch(`/api/general-documents/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      throw new Error(`Failed to delete general document ${id} from D1`);
    }

    notifyChange();
  }
}
