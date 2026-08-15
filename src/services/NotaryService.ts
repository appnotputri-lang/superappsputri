import { Deed, PrivateDeed, ProtestCheque, OutgoingMail, IncomingMail } from '../../types';
import { d1ClientCache } from '../lib/d1ClientCache';

// Event emitter to notify subscribers of changes across notary modules without Firestore
const listeners: { [key: string]: Set<() => void> } = {
  deeds: new Set(),
  private_deeds: new Set(),
  incoming_mails: new Set(),
  outgoing_mails: new Set(),
  protest_cheques: new Set(),
};

function notifyChange(collection: string) {
  d1ClientCache.invalidateByPrefix(collection);
  if (listeners[collection]) {
    listeners[collection].forEach(fn => {
      try { fn(); } catch (e) { console.error(`Error in listener for ${collection}:`, e); }
    });
  }
}

export class NotaryService {
  // --- DEEDS (AKTA) ---

  static subscribeDeedsByMonth(year: number, month: number, onNext: (data: Deed[]) => void): () => void {
    let active = true;
    const fetcher = async () => {
      try {
        const data = await this.getDeedsByMonth(year, month);
        if (active) onNext(data);
      } catch (err) {
        console.error('[NotaryService] Error fetching deeds by month:', err);
      }
    };

    fetcher();
    listeners.deeds.add(fetcher);

    return () => {
      active = false;
      listeners.deeds.delete(fetcher);
    };
  }

  static async getDeedsByMonth(year: number, month: number): Promise<Deed[]> {
    const res = await fetch(`/api/deeds?year=${year}&month=${month}&limit=1000`);
    if (!res.ok) {
      throw new Error(`Failed to fetch deeds for ${year}-${month}`);
    }
    const json = await res.json();
    return json.records || (Array.isArray(json) ? json : []);
  }

  static async getDeedsPaginated(params: {
    page: number;
    pageSize: number | string;
    search?: string;
    year?: string | number;
  }): Promise<{ records: Deed[]; total: number; success: boolean }> {
    const limit = params.pageSize === 'Semua' || params.pageSize === 'ALL' || params.pageSize === 0 ? 500 : Number(params.pageSize);
    const offset = (params.page - 1) * limit;
    const searchParam = params.search ? `&search=${encodeURIComponent(params.search)}` : '';
    const yearParam = params.year && params.year !== 'ALL' ? `&year=${encodeURIComponent(params.year)}` : '';
    const cacheKey = `deeds:p${params.page}_s${limit}_q${params.search || ''}_y${params.year || ''}`;

    const cached = d1ClientCache.get<{ records: Deed[]; total: number; success: boolean }>(cacheKey);

    const fetcher = async () => {
      const res = await fetch(`/api/deeds?limit=${limit}&offset=${offset}${searchParam}${yearParam}`);
      if (!res.ok) throw new Error('Failed to fetch deeds');
      const json = await res.json();
      const result = {
        success: true,
        records: json.records || [],
        total: typeof json.total !== 'undefined' ? json.total : (json.records?.length || 0)
      };
      d1ClientCache.set(cacheKey, result);
      return result;
    };

    if (cached) {
      // Background revalidation
      fetcher().catch(() => {});
      return cached;
    }

    try {
      return await fetcher();
    } catch (err) {
      console.error('[NotaryService] Error fetching paginated deeds:', err);
      return { success: false, records: [], total: 0 };
    }
  }

  static async getDeedsByYear(year: number): Promise<Deed[]> {
    const res = await fetch(`/api/deeds?year=${year}&limit=5000`);
    if (!res.ok) {
      throw new Error(`Failed to fetch deeds for year ${year}`);
    }
    const json = await res.json();
    return json.records || (Array.isArray(json) ? json : []);
  }

  static async getAllDeedsForReorder(): Promise<Deed[]> {
    const res = await fetch(`/api/deeds?limit=10000`);
    if (!res.ok) {
      throw new Error(`Failed to fetch all deeds for reordering`);
    }
    const json = await res.json();
    return json.records || (Array.isArray(json) ? json : []);
  }

  static subscribeDeeds(onNext: (data: Deed[]) => void): () => void {
    let active = true;
    const fetcher = async () => {
      try {
        const res = await fetch(`/api/deeds?limit=1000`);
        if (res.ok && active) {
          const json = await res.json();
          onNext(json.records || (Array.isArray(json) ? json : []));
        }
      } catch (err) {
        console.error('[NotaryService] Error subscribing to deeds:', err);
      }
    };

    fetcher();
    listeners.deeds.add(fetcher);

    return () => {
      active = false;
      listeners.deeds.delete(fetcher);
    };
  }

  static async getDeedById(id: string): Promise<Deed | null> {
    try {
      const res = await fetch(`/api/deeds/${encodeURIComponent(id)}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || json.deed || json;
    } catch (err) {
      console.error('[NotaryService] Error fetching deed by ID:', err);
      return null;
    }
  }

  static async getRecentDeeds(limitCount = 10): Promise<Deed[]> {
    const res = await fetch(`/api/deeds?limit=${limitCount}&order=desc`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.records || (Array.isArray(json) ? json : []);
  }

  static async addDeed(data: Omit<Deed, 'id'> & { id?: string }): Promise<string> {
    const docId = data.id || `deed_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const res = await fetch('/api/deeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, id: docId })
    });
    if (!res.ok) {
      throw new Error('Failed to create deed in D1');
    }
    notifyChange('deeds');
    return docId;
  }

  static async updateDeed(id: string, data: Partial<Deed>): Promise<void> {
    const res = await fetch(`/api/deeds/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw new Error(`Failed to update deed ${id} in D1`);
    }
    notifyChange('deeds');
  }

  static async deleteDeed(id: string): Promise<void> {
    const url = `/api/deeds/${encodeURIComponent(id)}`;
    console.log(`[D1 DELETE REQUEST]\nurl: ${url}\nid: ${id}`);
    
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'DELETE'
      });
    } catch (netErr: any) {
      console.error('[D1 DELETE NETWORK ERROR]', netErr);
      throw new Error(`Koneksi jaringan gagal: ${netErr?.message || 'Network error'}`);
    }

    let responseBody = '';
    try {
      responseBody = await res.text();
    } catch (_) {}

    console.log(`[D1 DELETE RESPONSE]\nstatus: ${res.status}\nbody: ${responseBody}`);

    if (!res.ok) {
      let detailedMsg = `HTTP ${res.status}`;
      try {
        const json = JSON.parse(responseBody);
        if (json?.error) detailedMsg = json.error;
      } catch (_) {
        if (responseBody) detailedMsg = responseBody.slice(0, 200);
      }
      throw new Error(`D1 delete gagal (${res.status}): ${detailedMsg}`);
    }

    try {
      const json = JSON.parse(responseBody);
      if (json && json.success === false) {
        throw new Error(json.error || 'Server melaporkan penghapusan gagal.');
      }
    } catch (parseErr: any) {
      if (responseBody.trim().startsWith('<')) {
        throw new Error('Endpoint API mengembalikan respon HTML (route tidak ditemukan di worker/server).');
      }
    }

    notifyChange('deeds');
  }

  // --- PRIVATE DEEDS (LEGALISASI & WAARMERKING) ---

  static subscribePrivateDeedsByMonth(year: number, month: number, onNext: (data: PrivateDeed[]) => void): () => void {
    let active = true;
    const fetcher = async () => {
      try {
        const data = await this.getPrivateDeedsByMonth(year, month);
        if (active) onNext(data);
      } catch (err) {
        console.error('[NotaryService] Error fetching private deeds by month:', err);
      }
    };

    fetcher();
    listeners.private_deeds.add(fetcher);

    return () => {
      active = false;
      listeners.private_deeds.delete(fetcher);
    };
  }

  static async getPrivateDeedsByMonth(year: number, month: number): Promise<PrivateDeed[]> {
    const res = await fetch(`/api/private-deeds?year=${year}&month=${month}&limit=1000`);
    if (!res.ok) {
      throw new Error(`Failed to fetch private deeds for ${year}-${month}`);
    }
    const json = await res.json();
    return json.records || (Array.isArray(json) ? json : []);
  }

  static async getPrivateDeedsPaginated(params: {
    page: number;
    pageSize: number | string;
    search?: string;
    year?: string | number;
  }): Promise<{ records: PrivateDeed[]; total: number; success: boolean }> {
    const limit = params.pageSize === 'Semua' || params.pageSize === 'ALL' || params.pageSize === 0 ? 500 : Number(params.pageSize);
    const offset = (params.page - 1) * limit;
    const searchParam = params.search ? `&search=${encodeURIComponent(params.search)}` : '';
    const yearParam = params.year && params.year !== 'ALL' ? `&year=${encodeURIComponent(params.year)}` : '';
    const cacheKey = `private-deeds:p${params.page}_s${limit}_q${params.search || ''}_y${params.year || ''}`;

    const cached = d1ClientCache.get<{ records: PrivateDeed[]; total: number; success: boolean }>(cacheKey);

    const fetcher = async () => {
      const res = await fetch(`/api/private-deeds?limit=${limit}&offset=${offset}${searchParam}${yearParam}`);
      if (!res.ok) throw new Error('Failed to fetch private deeds');
      const json = await res.json();
      const result = {
        success: true,
        records: json.records || [],
        total: typeof json.total !== 'undefined' ? json.total : (json.records?.length || 0)
      };
      d1ClientCache.set(cacheKey, result);
      return result;
    };

    if (cached) {
      fetcher().catch(() => {});
      return cached;
    }

    try {
      return await fetcher();
    } catch (err) {
      console.error('[NotaryService] Error fetching paginated private deeds:', err);
      return { success: false, records: [], total: 0 };
    }
  }

  static async getPrivateDeedById(id: string): Promise<PrivateDeed | null> {
    try {
      const res = await fetch(`/api/private-deeds/${encodeURIComponent(id)}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || json.record || json;
    } catch (err) {
      console.error('[NotaryService] Error fetching private deed by ID:', err);
      return null;
    }
  }

  static subscribePrivateDeeds(onNext: (data: PrivateDeed[]) => void): () => void {
    let active = true;
    const fetcher = async () => {
      try {
        const res = await fetch(`/api/private-deeds?limit=1000`);
        if (res.ok && active) {
          const json = await res.json();
          onNext(json.records || (Array.isArray(json) ? json : []));
        }
      } catch (err) {
        console.error('[NotaryService] Error subscribing to private deeds:', err);
      }
    };

    fetcher();
    listeners.private_deeds.add(fetcher);

    return () => {
      active = false;
      listeners.private_deeds.delete(fetcher);
    };
  }

  static async addPrivateDeed(data: Omit<PrivateDeed, 'id'> & { id?: string }): Promise<string> {
    const docId = data.id || `pdeed_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const res = await fetch('/api/private-deeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, id: docId })
    });
    if (!res.ok) {
      throw new Error('Failed to create private deed in D1');
    }
    notifyChange('private_deeds');
    return docId;
  }

  static async updatePrivateDeed(id: string, data: Partial<PrivateDeed>): Promise<void> {
    const res = await fetch(`/api/private-deeds/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw new Error(`Failed to update private deed ${id} in D1`);
    }
    notifyChange('private_deeds');
  }

  static async deletePrivateDeed(id: string): Promise<void> {
    const res = await fetch(`/api/private-deeds/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error(`Failed to delete private deed ${id} from D1`);
    }
    notifyChange('private_deeds');
  }

  // --- PROTEST CHEQUES ---

  static subscribeProtestChequesByMonth(year: number, month: number, onNext: (data: ProtestCheque[]) => void): () => void {
    let active = true;
    const fetcher = async () => {
      try {
        const data = await this.getProtestChequesByMonth(year, month);
        if (active) onNext(data);
      } catch (err) {
        console.error('[NotaryService] Error fetching protest cheques by month:', err);
      }
    };

    fetcher();
    listeners.protest_cheques.add(fetcher);

    return () => {
      active = false;
      listeners.protest_cheques.delete(fetcher);
    };
  }

  static async getProtestChequesByMonth(year: number, month: number): Promise<ProtestCheque[]> {
    return [];
  }

  static subscribeProtestCheques(onNext: (data: ProtestCheque[]) => void): () => void {
    let active = true;
    const fetcher = async () => {
      if (active) onNext([]);
    };
    fetcher();
    return () => { active = false; };
  }

  static async addProtestCheque(data: Omit<ProtestCheque, 'id'> & { id?: string }): Promise<string> {
    const docId = data.id || `cheque_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    notifyChange('protest_cheques');
    return docId;
  }

  static async updateProtestCheque(id: string, data: Partial<ProtestCheque>): Promise<void> {
    notifyChange('protest_cheques');
  }

  static async deleteProtestCheque(id: string): Promise<void> {
    notifyChange('protest_cheques');
  }

  // --- OUTGOING MAILS ---

  static subscribeOutgoingMailsByMonth(year: number, month: number, onNext: (data: OutgoingMail[]) => void): () => void {
    let active = true;
    const fetcher = async () => {
      try {
        const data = await this.getOutgoingMailsByMonth(year, month);
        if (active) onNext(data);
      } catch (err) {
        console.error('[NotaryService] Error fetching outgoing mails by month:', err);
      }
    };

    fetcher();
    listeners.outgoing_mails.add(fetcher);

    return () => {
      active = false;
      listeners.outgoing_mails.delete(fetcher);
    };
  }

  static async getOutgoingMailsByMonth(year: number, month: number): Promise<OutgoingMail[]> {
    const res = await fetch(`/api/outgoing-mails?year=${year}&month=${month}&limit=1000`);
    if (!res.ok) {
      throw new Error(`Failed to fetch outgoing mails for ${year}-${month}`);
    }
    const json = await res.json();
    return json.records || (Array.isArray(json) ? json : []);
  }

  static subscribeOutgoingMails(onNext: (data: OutgoingMail[]) => void): () => void {
    let active = true;
    const fetcher = async () => {
      try {
        const res = await fetch(`/api/outgoing-mails?limit=1000`);
        if (res.ok && active) {
          const json = await res.json();
          onNext(json.records || (Array.isArray(json) ? json : []));
        }
      } catch (err) {
        console.error('[NotaryService] Error subscribing to outgoing mails:', err);
      }
    };

    fetcher();
    listeners.outgoing_mails.add(fetcher);

    return () => {
      active = false;
      listeners.outgoing_mails.delete(fetcher);
    };
  }

  static async getRecentOutgoingMails(limitCount = 10): Promise<OutgoingMail[]> {
    const res = await fetch(`/api/outgoing-mails?limit=${limitCount}&order=desc`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.records || (Array.isArray(json) ? json : []);
  }

  static async getOutgoingMailsPaginated(params: {
    page: number;
    pageSize: number | string;
    search?: string;
    year?: string | number;
  }): Promise<{ records: OutgoingMail[]; total: number; success: boolean }> {
    const limit = params.pageSize === 'Semua' || params.pageSize === 'ALL' || params.pageSize === 0 ? 500 : Number(params.pageSize);
    const offset = (params.page - 1) * limit;
    const searchParam = params.search ? `&search=${encodeURIComponent(params.search)}` : '';
    const yearParam = params.year && params.year !== 'ALL' ? `&year=${encodeURIComponent(params.year)}` : '';
    const cacheKey = `outgoing-mails:p${params.page}_s${limit}_q${params.search || ''}_y${params.year || ''}`;

    const cached = d1ClientCache.get<{ records: OutgoingMail[]; total: number; success: boolean }>(cacheKey);

    const fetcher = async () => {
      const res = await fetch(`/api/outgoing-mails?limit=${limit}&offset=${offset}${searchParam}${yearParam}`);
      if (!res.ok) throw new Error('Failed to fetch outgoing mails');
      const json = await res.json();
      const result = {
        success: true,
        records: json.records || [],
        total: typeof json.total !== 'undefined' ? json.total : (json.records?.length || 0)
      };
      d1ClientCache.set(cacheKey, result);
      return result;
    };

    if (cached) {
      fetcher().catch(() => {});
      return cached;
    }

    try {
      return await fetcher();
    } catch (err) {
      console.error('[NotaryService] Error fetching paginated outgoing mails:', err);
      return { success: false, records: [], total: 0 };
    }
  }

  static async getOutgoingMailById(id: string): Promise<OutgoingMail | null> {
    try {
      const res = await fetch(`/api/outgoing-mails/${encodeURIComponent(id)}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || json.record || json;
    } catch (err) {
      console.error('[NotaryService] Error fetching outgoing mail by ID:', err);
      return null;
    }
  }

  static async addOutgoingMail(data: Omit<OutgoingMail, 'id'> & { id?: string }): Promise<string> {
    const docId = data.id || `mail_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const res = await fetch('/api/outgoing-mails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, id: docId })
    });
    if (!res.ok) {
      throw new Error('Failed to create outgoing mail in D1');
    }
    notifyChange('outgoing_mails');
    return docId;
  }

  static async updateOutgoingMail(id: string, data: Partial<OutgoingMail>): Promise<void> {
    const res = await fetch(`/api/outgoing-mails/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw new Error(`Failed to update outgoing mail ${id} in D1`);
    }
    notifyChange('outgoing_mails');
  }

  static async deleteOutgoingMail(id: string): Promise<void> {
    const res = await fetch(`/api/outgoing-mails/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error(`Failed to delete outgoing mail ${id} from D1`);
    }
    notifyChange('outgoing_mails');
  }

  // --- INCOMING MAILS ---

  static subscribeIncomingMails(onNext: (data: IncomingMail[]) => void): () => void {
    let active = true;
    const fetcher = async () => {
      try {
        const res = await fetch(`/api/incoming-mails?limit=1000`);
        if (res.ok && active) {
          const json = await res.json();
          onNext(json.records || (Array.isArray(json) ? json : []));
        }
      } catch (err) {
        console.error('[NotaryService] Error subscribing to incoming mails:', err);
      }
    };

    fetcher();
    listeners.incoming_mails.add(fetcher);

    return () => {
      active = false;
      listeners.incoming_mails.delete(fetcher);
    };
  }

  static async getIncomingMailsPaginated(params: {
    page: number;
    pageSize: number | string;
    search?: string;
    year?: string | number;
  }): Promise<{ records: IncomingMail[]; total: number; success: boolean }> {
    const limit = params.pageSize === 'Semua' || params.pageSize === 'ALL' || params.pageSize === 0 ? 500 : Number(params.pageSize);
    const offset = (params.page - 1) * limit;
    const searchParam = params.search ? `&search=${encodeURIComponent(params.search)}` : '';
    const yearParam = params.year && params.year !== 'ALL' ? `&year=${encodeURIComponent(params.year)}` : '';
    const cacheKey = `incoming-mails:p${params.page}_s${limit}_q${params.search || ''}_y${params.year || ''}`;

    const cached = d1ClientCache.get<{ records: IncomingMail[]; total: number; success: boolean }>(cacheKey);

    const fetcher = async () => {
      const res = await fetch(`/api/incoming-mails?limit=${limit}&offset=${offset}${searchParam}${yearParam}`);
      if (!res.ok) throw new Error('Failed to fetch incoming mails');
      const json = await res.json();
      const result = {
        success: true,
        records: json.records || [],
        total: typeof json.total !== 'undefined' ? json.total : (json.records?.length || 0)
      };
      d1ClientCache.set(cacheKey, result);
      return result;
    };

    if (cached) {
      fetcher().catch(() => {});
      return cached;
    }

    try {
      return await fetcher();
    } catch (err) {
      console.error('[NotaryService] Error fetching paginated incoming mails:', err);
      return { success: false, records: [], total: 0 };
    }
  }

  static async getIncomingMailById(id: string): Promise<IncomingMail | null> {
    try {
      const res = await fetch(`/api/incoming-mails/${encodeURIComponent(id)}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || json.record || json;
    } catch (err) {
      console.error('[NotaryService] Error fetching incoming mail by ID:', err);
      return null;
    }
  }

  static async addIncomingMail(data: Omit<IncomingMail, 'id'> & { id?: string }): Promise<string> {
    const docId = data.id || `inmail_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const res = await fetch('/api/incoming-mails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, id: docId })
    });
    if (!res.ok) {
      throw new Error('Failed to create incoming mail in D1');
    }
    notifyChange('incoming_mails');
    return docId;
  }

  static async updateIncomingMail(id: string, data: Partial<IncomingMail>): Promise<void> {
    const res = await fetch(`/api/incoming-mails/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw new Error(`Failed to update incoming mail ${id} in D1`);
    }
    notifyChange('incoming_mails');
  }

  static async deleteIncomingMail(id: string): Promise<void> {
    const res = await fetch(`/api/incoming-mails/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error(`Failed to delete incoming mail ${id} from D1`);
    }
    notifyChange('incoming_mails');
  }
}
