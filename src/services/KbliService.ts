export interface KbliRecord {
  id: string;
  nama: string;
  kelompokUsaha?: string;
  selectedItems: any[];
  updatedAt: string;
  createdAt?: string;
  userId?: string | null;
  type: 'mapping' | 'suggestion';
  [key: string]: any;
}

export const KbliService = {
  // ==========================================
  // KBLI MAPPING
  // ==========================================
  async fetchMappingRecords(search?: string): Promise<KbliRecord[]> {
    try {
      const url = new URL('/api/kbli/mapping', window.location.origin);
      if (search) {
        url.searchParams.set('search', search);
      }
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.records)) {
          return data.records;
        }
      }
    } catch (e) {
      console.warn('[KbliService] D1 API fetch mapping failed, falling back to local cache:', e);
    }

    // Fallback to local storage
    try {
      const stored = localStorage.getItem('kbli_mapping_local_records');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
          return parsed;
        }
      }
    } catch (e) {}
    return [];
  },

  async saveMappingRecord(payload: any, isEdit = false): Promise<KbliRecord> {
    const recordId = payload.id;
    
    // Save to local storage as fallback
    try {
      const stored = localStorage.getItem('kbli_mapping_local_records');
      const currentLocals = stored ? JSON.parse(stored) : [];
      const updatedLocals = [
        payload,
        ...currentLocals.filter((item: any) => item.id !== recordId)
      ];
      localStorage.setItem('kbli_mapping_local_records', JSON.stringify(updatedLocals));
    } catch (e) {
      console.warn('[KbliService] Error saving to localStorage:', e);
    }

    // Call D1 API
    const endpoint = isEdit ? `/api/kbli/mapping/${encodeURIComponent(recordId)}` : '/api/kbli/mapping';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}: Failed to save KBLI mapping to D1`);
    }

    const result = await res.json();
    return result.record || payload;
  },

  async deleteMappingRecord(id: string): Promise<boolean> {
    // Remove from local storage
    try {
      const stored = localStorage.getItem('kbli_mapping_local_records');
      if (stored) {
        const parsed = JSON.parse(stored);
        const filtered = parsed.filter((item: any) => item.id !== id);
        localStorage.setItem('kbli_mapping_local_records', JSON.stringify(filtered));
      }
    } catch (e) {}

    // Call D1 API
    const res = await fetch(`/api/kbli/mapping/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}: Failed to delete KBLI mapping from D1`);
    }

    return true;
  },

  // ==========================================
  // KBLI SUGGESTIONS
  // ==========================================
  async fetchSuggestionRecords(search?: string): Promise<KbliRecord[]> {
    try {
      const url = new URL('/api/kbli/suggestions', window.location.origin);
      if (search) {
        url.searchParams.set('search', search);
      }
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.records)) {
          return data.records;
        }
      }
    } catch (e) {
      console.warn('[KbliService] D1 API fetch suggestions failed, falling back to local cache:', e);
    }

    // Fallback to local storage
    try {
      const stored = localStorage.getItem('kbli_suggestions_local_records');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
          return parsed;
        }
      }
    } catch (e) {}
    return [];
  },

  async saveSuggestionRecord(payload: any, isEdit = false): Promise<KbliRecord> {
    const recordId = payload.id;

    // Save to local storage as fallback
    try {
      const stored = localStorage.getItem('kbli_suggestions_local_records');
      const currentLocals = stored ? JSON.parse(stored) : [];
      const updatedLocals = [
        payload,
        ...currentLocals.filter((item: any) => item.id !== recordId)
      ];
      localStorage.setItem('kbli_suggestions_local_records', JSON.stringify(updatedLocals));
    } catch (e) {
      console.warn('[KbliService] Error saving to localStorage:', e);
    }

    // Call D1 API
    const endpoint = isEdit ? `/api/kbli/suggestions/${encodeURIComponent(recordId)}` : '/api/kbli/suggestions';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}: Failed to save KBLI suggestion to D1`);
    }

    const result = await res.json();
    return result.record || payload;
  },

  async deleteSuggestionRecord(id: string): Promise<boolean> {
    // Remove from local storage
    try {
      const stored = localStorage.getItem('kbli_suggestions_local_records');
      if (stored) {
        const parsed = JSON.parse(stored);
        const filtered = parsed.filter((item: any) => item.id !== id);
        localStorage.setItem('kbli_suggestions_local_records', JSON.stringify(filtered));
      }
    } catch (e) {}

    // Call D1 API
    const res = await fetch(`/api/kbli/suggestions/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}: Failed to delete KBLI suggestion from D1`);
    }

    return true;
  }
};
