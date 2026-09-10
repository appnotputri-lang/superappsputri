import { PpatDeed, Holiday, PpatProfileConfig } from '../types/ppat';
import { d1ClientCache } from '../lib/d1ClientCache';

const listeners: {
  deeds: Set<() => void>;
  holidays: Set<() => void>;
  settings: Set<() => void>;
} = {
  deeds: new Set(),
  holidays: new Set(),
  settings: new Set()
};

function notifyChange(scope: 'deeds' | 'holidays' | 'settings') {
  d1ClientCache.invalidateByPrefix(scope);
  listeners[scope]?.forEach(fn => {
    try { fn(); } catch (e) { console.error(`[PpatService] Error in ${scope} listener:`, e); }
  });
}

export class PpatService {
  // ==========================================
  // PPAT DEEDS
  // ==========================================

  static subscribePpatDeedsByMonth(year: number, month: number, onNext: (data: PpatDeed[]) => void): () => void {
    let active = true;
    const fetcher = async () => {
      try {
        const data = await this.getPpatDeedsByMonth(year, month);
        if (active) onNext(data);
      } catch (err) {
        console.error('[PpatService] Error fetching deeds by month:', err);
      }
    };

    fetcher();
    listeners.deeds.add(fetcher);

    return () => {
      active = false;
      listeners.deeds.delete(fetcher);
    };
  }

  static async getPpatDeedsByMonth(year: number, month: number): Promise<PpatDeed[]> {
    const cacheKey = `ppat_deeds_${year}_${month}`;
    const cached = d1ClientCache.get<PpatDeed[]>(cacheKey);

    const fetcher = async () => {
      const res = await fetch(`/api/ppat-deeds?year=${year}&month=${month}`);
      if (!res.ok) throw new Error('Failed to fetch PPAT deeds');
      const json = await res.json();
      const records = json.records || [];
      d1ClientCache.set(cacheKey, records);
      return records;
    };

    if (cached) {
      fetcher().catch(() => {});
      return cached;
    }

    return fetcher();
  }

  static async createPpatDeed(data: Partial<PpatDeed>): Promise<PpatDeed> {
    const res = await fetch('/api/ppat-deeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create PPAT deed');
    const json = await res.json();
    notifyChange('deeds');
    return json.record;
  }

  static async updatePpatDeed(id: string, data: Partial<PpatDeed>): Promise<PpatDeed> {
    const res = await fetch(`/api/ppat-deeds/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update PPAT deed');
    const json = await res.json();
    notifyChange('deeds');
    return json.record;
  }

  static async deletePpatDeed(id: string): Promise<boolean> {
    const res = await fetch(`/api/ppat-deeds/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete PPAT deed');
    const json = await res.json();
    notifyChange('deeds');
    return json.success;
  }

  // ==========================================
  // HOLIDAYS
  // ==========================================

  static subscribeHolidays(year: number, onNext: (data: Holiday[]) => void): () => void {
    let active = true;
    const fetcher = async () => {
      try {
        const data = await this.getHolidaysByYear(year);
        if (active) onNext(data);
      } catch (err) {
        console.error('[PpatService] Error fetching holidays:', err);
      }
    };

    fetcher();
    listeners.holidays.add(fetcher);

    return () => {
      active = false;
      listeners.holidays.delete(fetcher);
    };
  }

  static async getHolidaysByYear(year: number): Promise<Holiday[]> {
    const cacheKey = `holidays_${year}`;
    const cached = d1ClientCache.get<Holiday[]>(cacheKey);

    const fetcher = async () => {
      const res = await fetch(`/api/holidays?year=${year}`);
      if (!res.ok) throw new Error('Failed to fetch holidays');
      const json = await res.json();
      const records = json.records || [];
      d1ClientCache.set(cacheKey, records);
      return records;
    };

    if (cached) {
      fetcher().catch(() => {});
      return cached;
    }

    return fetcher();
  }

  static async createHoliday(data: Partial<Holiday>): Promise<Holiday> {
    const res = await fetch('/api/holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create holiday');
    const json = await res.json();
    notifyChange('holidays');
    return json.record;
  }

  static async updateHoliday(id: string, data: Partial<Holiday>): Promise<Holiday> {
    const res = await fetch(`/api/holidays/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update holiday');
    const json = await res.json();
    notifyChange('holidays');
    return json.record;
  }

  static async deleteHoliday(id: string): Promise<boolean> {
    const res = await fetch(`/api/holidays/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete holiday');
    const json = await res.json();
    notifyChange('holidays');
    return json.success;
  }

  static async seedHolidays(year: number): Promise<Holiday[]> {
    const res = await fetch('/api/holidays/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year })
    });
    if (!res.ok) throw new Error('Failed to seed holidays');
    const json = await res.json();
    notifyChange('holidays');
    return json.records || [];
  }

  // ==========================================
  // PPAT SETTINGS & PROFILE
  // ==========================================

  static async getPpatSettings(): Promise<PpatProfileConfig> {
    const cacheKey = 'ppat_settings_config';
    const cached = d1ClientCache.get<PpatProfileConfig>(cacheKey);

    const fetcher = async () => {
      const res = await fetch('/api/ppat-settings');
      if (!res.ok) throw new Error('Failed to fetch PPAT settings');
      const json = await res.json();
      const config = json.config || {
        ppatName: 'PUTRI, S.H., M.Kn.',
        skNumber: 'SK Kepala BPN RI No. 12-X-2020',
        workingArea: 'Kabupaten Sleman',
        officeAddress: 'Jl. Kaliurang Km 5.5 No. 88, Sleman, D.I. Yogyakarta',
        city: 'Sleman',
        phone: '0274-889900'
      };
      d1ClientCache.set(cacheKey, config);
      return config;
    };

    if (cached) {
      fetcher().catch(() => {});
      return cached;
    }

    return fetcher();
  }

  static async savePpatSettings(config: Partial<PpatProfileConfig>): Promise<PpatProfileConfig> {
    const res = await fetch('/api/ppat-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (!res.ok) throw new Error('Failed to save PPAT settings');
    const json = await res.json();
    notifyChange('settings');
    return json.config;
  }
}
