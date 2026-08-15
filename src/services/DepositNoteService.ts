import { DepositNote } from '../types';

const listeners = new Set<() => void>();

function notifyChange() {
  listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error('[DepositNoteService] Error in listener:', e);
    }
  });
}

// In-memory cache for fast optimism
const cacheById = new Map<string, DepositNote>();

export class DepositNoteService {
  /**
   * Fetch deposit notes with server-side pagination and search.
   */
  static async getDepositNotes(options: {
    search?: string;
    clientId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ depositNotes: DepositNote[]; total: number; limit: number; offset: number }> {
    try {
      const queryParams = new URLSearchParams();
      if (options.search) queryParams.set('search', options.search.trim());
      if (options.clientId) queryParams.set('clientId', options.clientId);
      if (options.limit !== undefined) queryParams.set('limit', String(options.limit));
      if (options.offset !== undefined) queryParams.set('offset', String(options.offset));

      const res = await fetch(`/api/deposit-notes?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Gagal mengambil data titipan uang.`);
      }
      const json = await res.json();
      const depositNotes: DepositNote[] = json.depositNotes || json.data || [];

      // Update cache
      for (const dn of depositNotes) {
        if (dn.id) cacheById.set(dn.id, dn);
      }

      return {
        depositNotes,
        total: typeof json.total === 'number' ? json.total : depositNotes.length,
        limit: typeof json.limit === 'number' ? json.limit : (options.limit || 20),
        offset: typeof json.offset === 'number' ? json.offset : (options.offset || 0),
      };
    } catch (error) {
      console.error('[DepositNoteService] Error fetching deposit notes:', error);
      throw error;
    }
  }

  /**
   * Fetch single deposit note by ID. Checks cache first, or fetches from API.
   */
  static async getDepositNoteById(id: string, forceFetch = false): Promise<DepositNote> {
    if (!id) throw new Error('ID titipan tidak boleh kosong');

    if (!forceFetch && cacheById.has(id)) {
      return cacheById.get(id)!;
    }

    try {
      const res = await fetch(`/api/deposit-notes/${id}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Data titipan uang tidak ditemukan.`);
      }
      const json = await res.json();
      const depositNote: DepositNote = json.depositNote || json.data;
      if (depositNote && depositNote.id) {
        cacheById.set(depositNote.id, depositNote);
      }
      return depositNote;
    } catch (error) {
      console.error(`[DepositNoteService] Error fetching deposit note ${id}:`, error);
      throw error;
    }
  }

  /**
   * Fetch next deposit number for year.
   */
  static async getNextDepositNumber(year?: number): Promise<string> {
    try {
      const targetYear = year || new Date().getFullYear();
      const res = await fetch(`/api/deposit-notes/next-number?year=${targetYear}`);
      if (!res.ok) {
        throw new Error('Gagal mengambil nomor titipan berikutnya.');
      }
      const json = await res.json();
      return json.nextDepositNumber || `TTP/${targetYear}/001`;
    } catch (error) {
      console.error('[DepositNoteService] Error fetching next deposit number:', error);
      const targetYear = year || new Date().getFullYear();
      return `TTP/${targetYear}/001`;
    }
  }

  /**
   * Create new deposit note.
   */
  static async createDepositNote(payload: Partial<DepositNote>): Promise<DepositNote> {
    try {
      const res = await fetch('/api/deposit-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const jsonErr = await res.json().catch(() => ({}));
        throw new Error(jsonErr.error || `HTTP ${res.status}: Gagal menyimpan titipan uang.`);
      }
      const json = await res.json();
      const depositNote: DepositNote = json.depositNote || json.data;

      if (depositNote && depositNote.id) {
        cacheById.set(depositNote.id, depositNote);
      }
      notifyChange();
      return depositNote;
    } catch (error) {
      console.error('[DepositNoteService] Error creating deposit note:', error);
      throw error;
    }
  }

  /**
   * Update existing deposit note.
   */
  static async updateDepositNote(id: string, payload: Partial<DepositNote>): Promise<DepositNote> {
    try {
      const res = await fetch(`/api/deposit-notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const jsonErr = await res.json().catch(() => ({}));
        throw new Error(jsonErr.error || `HTTP ${res.status}: Gagal memperbarui titipan uang.`);
      }
      const json = await res.json();
      const depositNote: DepositNote = json.depositNote || json.data;

      if (depositNote && depositNote.id) {
        cacheById.set(depositNote.id, depositNote);
      }
      notifyChange();
      return depositNote;
    } catch (error) {
      console.error(`[DepositNoteService] Error updating deposit note ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete deposit note.
   */
  static async deleteDepositNote(id: string): Promise<void> {
    try {
      const res = await fetch(`/api/deposit-notes/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const jsonErr = await res.json().catch(() => ({}));
        throw new Error(jsonErr.error || `HTTP ${res.status}: Gagal menghapus titipan uang.`);
      }
      cacheById.delete(id);
      notifyChange();
    } catch (error) {
      console.error(`[DepositNoteService] Error deleting deposit note ${id}:`, error);
      throw error;
    }
  }

  static addChangeListener(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }
}
