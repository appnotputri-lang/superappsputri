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
    let res: Response;
    if (isEdit) {
      const endpoint = `/api/kbli/mapping/${encodeURIComponent(recordId)}`;
      res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // If PUT is not supported on older deployment (HTTP 405/404), fall back to POST upsert
      if (res.status === 405 || res.status === 404) {
        res = await fetch('/api/kbli/mapping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
    } else {
      res = await fetch('/api/kbli/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}: Gagal menyimpan Pemetaan KBLI ke database D1`);
    }

    const result = await res.json();
    return result.record || payload;
  },

  async deleteMappingRecord(id: string): Promise<boolean> {
    // Call D1 API
    let res = await fetch(`/api/kbli/mapping/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });

    // If DELETE with param is not supported (HTTP 405/404), fall back to query or POST action
    if (res.status === 405 || res.status === 404) {
      res = await fetch(`/api/kbli/mapping?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (res.status === 405 || res.status === 404) {
        res = await fetch('/api/kbli/mapping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id })
        });
      }
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}: Gagal menghapus Pemetaan KBLI dari database D1`);
    }

    // Remove from local storage
    try {
      const stored = localStorage.getItem('kbli_mapping_local_records');
      if (stored) {
        const parsed = JSON.parse(stored);
        const filtered = parsed.filter((item: any) => item.id !== id);
        localStorage.setItem('kbli_mapping_local_records', JSON.stringify(filtered));
      }
    } catch (e) {}

    return true;

    return true;
  },

  // ==========================================
  // KBLI SUGGESTIONS (D1 PERSISTENT STORAGE)
  // ==========================================
  async fetchSuggestionRecords(search?: string): Promise<KbliRecord[]> {
    let d1Records: KbliRecord[] = [];
    let d1Success = false;

    try {
      const url = new URL('/api/kbli/suggestions', window.location.origin);
      if (search) {
        url.searchParams.set('search', search);
      }
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.records)) {
          d1Records = data.records;
          d1Success = true;
          // Update local cache from D1 source of truth
          try {
            localStorage.setItem('kbli_suggestions_local_records', JSON.stringify(d1Records));
          } catch (_) {}
        }
      }
    } catch (e) {
      console.warn('[KbliService] D1 API fetch suggestions failed, falling back to local cache:', e);
    }

    // If D1 succeeded, check if there are legacy local records that need to be synced to D1
    if (d1Success) {
      try {
        const stored = localStorage.getItem('kbli_suggestions_local_records');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const existingIds = new Set(d1Records.map(r => r.id));
            const unsynced = parsed.filter((r: any) => r && r.id && !existingIds.has(r.id));
            if (unsynced.length > 0) {
              // Sync unsynced records to D1 in background
              Promise.all(unsynced.map((r: any) => this.saveSuggestionRecord(r, false))).catch((err) => {
                console.warn('[KbliService] Auto-sync legacy local records to D1 failed:', err);
              });
            }
          }
        }
      } catch (_) {}
      return d1Records;
    }

    // Fallback to local storage only if network / D1 API is unavailable
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

    // Call D1 API directly as primary persistent storage
    let res: Response;
    if (isEdit) {
      const endpoint = `/api/kbli/suggestions/${encodeURIComponent(recordId)}`;
      res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // If PUT is not supported on older deployment (HTTP 405/404), fall back to POST upsert
      if (res.status === 405 || res.status === 404) {
        res = await fetch('/api/kbli/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
    } else {
      res = await fetch('/api/kbli/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}: Gagal menyimpan Saran KBLI ke database D1`);
    }

    const result = await res.json();
    const savedRecord = result.record || payload;

    // Save to local cache as secondary backup
    try {
      const stored = localStorage.getItem('kbli_suggestions_local_records');
      const currentLocals = stored ? JSON.parse(stored) : [];
      const updatedLocals = [
        savedRecord,
        ...currentLocals.filter((item: any) => item.id !== recordId)
      ];
      localStorage.setItem('kbli_suggestions_local_records', JSON.stringify(updatedLocals));
    } catch (e) {
      console.warn('[KbliService] Error saving to localStorage cache:', e);
    }

    return savedRecord;
  },

  async deleteSuggestionRecord(id: string): Promise<boolean> {
    // Call D1 API
    let res = await fetch(`/api/kbli/suggestions/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });

    // If DELETE with param is not supported (HTTP 405/404), fall back to query or POST action
    if (res.status === 405 || res.status === 404) {
      res = await fetch(`/api/kbli/suggestions?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (res.status === 405 || res.status === 404) {
        res = await fetch('/api/kbli/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id })
        });
      }
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}: Gagal menghapus Saran KBLI dari database D1`);
    }

    // Remove from local cache
    try {
      const stored = localStorage.getItem('kbli_suggestions_local_records');
      if (stored) {
        const parsed = JSON.parse(stored);
        const filtered = parsed.filter((item: any) => item.id !== id);
        localStorage.setItem('kbli_suggestions_local_records', JSON.stringify(filtered));
      }
    } catch (e) {}

    return true;
  }
};
