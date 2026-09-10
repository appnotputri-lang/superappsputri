import { Holiday } from '../types/ppat';
import { OFFICIAL_INDONESIAN_HOLIDAYS } from '../data/indonesianHolidays';

export async function getAllHolidaysD1(db: any, year?: number): Promise<Holiday[]> {
  let query = 'SELECT * FROM holidays';
  const params: any[] = [];

  if (year) {
    query += ' WHERE year = ?';
    params.push(year);
  }

  query += ' ORDER BY date ASC';

  const rows = await db.prepare(query).bind(...params).all();
  const list = (rows.results || []).map((r: any) => ({
    id: r.id,
    date: r.date,
    name: r.name,
    type: r.type || 'NATIONAL',
    year: Number(r.year),
    source: r.source || 'OFFICIAL',
    isActive: r.is_active === 1 || r.is_active === true,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));

  // If table is empty and a specific year is requested, auto-seed with official holidays
  if (list.length === 0 && year) {
    const defaultForYear = OFFICIAL_INDONESIAN_HOLIDAYS.filter(h => h.year === year);
    if (defaultForYear.length > 0) {
      for (const h of defaultForYear) {
        const id = `hol_${h.date.replace(/-/g, '')}_${Math.random().toString(36).substr(2, 5)}`;
        const now = new Date().toISOString();
        await db.prepare(`
          INSERT OR IGNORE INTO holidays (id, date, name, type, year, source, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(id, h.date, h.name, h.type, h.year, h.source, h.isActive ? 1 : 0, now, now).run();
      }
      return getAllHolidaysD1(db, year);
    }
  }

  return list;
}

export async function createHolidayD1(db: any, holiday: Partial<Holiday>): Promise<Holiday> {
  const id = holiday.id || `hol_${holiday.date?.replace(/-/g, '') || Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const now = new Date().toISOString();
  const year = holiday.year || (holiday.date ? parseInt(holiday.date.split('-')[0], 10) : new Date().getFullYear());

  await db.prepare(`
    INSERT INTO holidays (id, date, name, type, year, source, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    holiday.date || '',
    holiday.name || '',
    holiday.type || 'NATIONAL',
    year,
    holiday.source || 'MANUAL',
    holiday.isActive !== false ? 1 : 0,
    now,
    now
  ).run();

  return {
    id,
    date: holiday.date || '',
    name: holiday.name || '',
    type: (holiday.type || 'NATIONAL') as any,
    year,
    source: (holiday.source || 'MANUAL') as any,
    isActive: holiday.isActive !== false,
    createdAt: now,
    updatedAt: now
  };
}

export async function updateHolidayD1(db: any, id: string, holiday: Partial<Holiday>): Promise<Holiday | null> {
  const now = new Date().toISOString();
  const year = holiday.year || (holiday.date ? parseInt(holiday.date.split('-')[0], 10) : undefined);

  let query = 'UPDATE holidays SET updated_at = ?';
  const params: any[] = [now];

  if (holiday.date) { query += ', date = ?'; params.push(holiday.date); }
  if (holiday.name) { query += ', name = ?'; params.push(holiday.name); }
  if (holiday.type) { query += ', type = ?'; params.push(holiday.type); }
  if (year) { query += ', year = ?'; params.push(year); }
  if (holiday.source) { query += ', source = ?'; params.push(holiday.source); }
  if (typeof holiday.isActive !== 'undefined') { query += ', is_active = ?'; params.push(holiday.isActive ? 1 : 0); }

  query += ' WHERE id = ?';
  params.push(id);

  await db.prepare(query).bind(...params).run();

  const row = await db.prepare('SELECT * FROM holidays WHERE id = ?').bind(id).first();
  if (!row) return null;

  return {
    id: row.id,
    date: row.date,
    name: row.name,
    type: row.type,
    year: Number(row.year),
    source: row.source,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function deleteHolidayD1(db: any, id: string): Promise<boolean> {
  await db.prepare('DELETE FROM holidays WHERE id = ?').bind(id).run();
  return true;
}

export async function seedOfficialHolidaysD1(db: any, year: number): Promise<number> {
  const defaults = OFFICIAL_INDONESIAN_HOLIDAYS.filter(h => h.year === year);
  let count = 0;
  const now = new Date().toISOString();

  for (const h of defaults) {
    const existing = await db.prepare('SELECT id FROM holidays WHERE date = ?').bind(h.date).first();
    if (!existing) {
      const id = `hol_${h.date.replace(/-/g, '')}_${Math.random().toString(36).substr(2, 5)}`;
      await db.prepare(`
        INSERT INTO holidays (id, date, name, type, year, source, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(id, h.date, h.name, h.type, h.year, h.source, 1, now, now).run();
      count++;
    }
  }

  return count;
}
