import { PpatCalculationRecord } from '../types/ppatCalculator';

const STORAGE_KEY = 'ppat_calculator_history_v1';

export class PpatCalculatorService {
  /**
   * Synchronous cached history from localStorage for instant initial render
   */
  static getHistorySync(): PpatCalculationRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('[PpatCalculatorService] Failed to read local cache:', e);
      return [];
    }
  }

  /**
   * Save array to localStorage
   */
  private static saveLocalCache(list: PpatCalculationRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('[PpatCalculatorService] Failed to write local cache:', e);
    }
  }

  /**
   * Fetch all calculations from D1 (with local fallback & cache update)
   */
  static async getCalculations(): Promise<PpatCalculationRecord[]> {
    try {
      const res = await fetch('/api/ppat-calculations');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.records)) {
          // If server returned records, update local cache
          this.saveLocalCache(json.records);
          return json.records;
        }
      }
    } catch (err) {
      console.warn('[PpatCalculatorService] Failed to fetch from D1, using local fallback:', err);
    }

    // Fallback to local storage
    return this.getHistorySync();
  }

  /**
   * Get single calculation by ID from D1 or local cache
   */
  static async getCalculationById(id: string): Promise<PpatCalculationRecord | null> {
    try {
      const res = await fetch(`/api/ppat-calculations/${encodeURIComponent(id)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.record) {
          return json.record;
        }
      }
    } catch (err) {
      console.warn('[PpatCalculatorService] Failed to fetch single record from D1:', err);
    }

    const localList = this.getHistorySync();
    return localList.find(item => item.id === id) || null;
  }

  /**
   * Save or Update a calculation in D1 and update local cache
   */
  static async saveCalculation(calc: PpatCalculationRecord, forceCreate: boolean = false): Promise<PpatCalculationRecord> {
    const isExistingId = Boolean(calc.id && !calc.id.startsWith('temp_') && !forceCreate);
    const id = (isExistingId && calc.id) ? calc.id : `calc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const recordToSave: PpatCalculationRecord = {
      ...calc,
      id,
      updatedAt: now,
      createdAt: (isExistingId && calc.createdAt) ? calc.createdAt : now
    };

    // 1. Optimistically update local cache
    const list = this.getHistorySync();
    const existingIndex = list.findIndex(item => item.id === id);
    if (existingIndex >= 0) {
      list[existingIndex] = recordToSave;
    } else {
      list.unshift(recordToSave);
    }
    this.saveLocalCache(list);

    // 2. Persist to D1 via API
    try {
      if (isExistingId) {
        // Try update first
        const putRes = await fetch(`/api/ppat-calculations/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recordToSave)
        });

        if (putRes.ok) {
          const json = await putRes.json();
          if (json.success && json.record) {
            this.updateItemInCache(json.record);
            return json.record;
          }
        }
      }

      // If new or PUT returned 404/failed, try POST create
      const postRes = await fetch('/api/ppat-calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordToSave)
      });

      if (postRes.ok) {
        const json = await postRes.json();
        if (json.success && json.record) {
          this.updateItemInCache(json.record);
          return json.record;
        }
      }
    } catch (err) {
      console.warn('[PpatCalculatorService] Server D1 write failed, saved to local cache:', err);
    }

    return recordToSave;
  }

  /**
   * Delete calculation from D1 and local cache
   */
  static async deleteCalculation(id: string): Promise<boolean> {
    // 1. Delete from local cache
    const list = this.getHistorySync().filter(item => item.id !== id);
    this.saveLocalCache(list);

    // 2. Delete from D1
    try {
      const res = await fetch(`/api/ppat-calculations/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const json = await res.json();
        return Boolean(json.success);
      }
    } catch (err) {
      console.warn('[PpatCalculatorService] D1 delete failed:', err);
    }

    return true;
  }

  /**
   * Helper to update a single item in local cache
   */
  private static updateItemInCache(record: PpatCalculationRecord): void {
    const list = this.getHistorySync();
    const idx = list.findIndex(i => i.id === record.id);
    if (idx >= 0) {
      list[idx] = record;
    } else {
      list.unshift(record);
    }
    this.saveLocalCache(list);
  }

  /**
   * Clear all (local only)
   */
  static clearAllLocal(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('[PpatCalculatorService] Failed to clear local history:', e);
    }
  }
}
