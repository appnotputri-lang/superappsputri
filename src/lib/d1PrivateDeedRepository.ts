import { PrivateDeed } from '../types';
import { ensureD1TablesExist } from '../services/d1MigrationService';

export function formatD1RowToPrivateDeed(row: any): PrivateDeed {
  if (!row) return null as any;

  let base: any = {};
  if (row.raw_data) {
    try {
      base = JSON.parse(row.raw_data);
    } catch (e) {}
  }

  let parties: string[] = [];
  try {
    if (typeof row.parties === 'string') parties = JSON.parse(row.parties);
    else if (Array.isArray(row.parties)) parties = row.parties;
  } catch (e) {
    parties = base.parties || [];
  }

  return {
    ...base,
    id: String(row.id || base.id),
    number: String(row.number ?? base.number ?? ''),
    registrationDate: String(row.registration_date ?? base.registrationDate ?? ''),
    type: String(row.type ?? base.type ?? 'Legalisasi'),
    description: String(row.description ?? base.description ?? ''),
    parties,
    picName: row.pic_name ?? base.picName ?? '',
    notes: row.notes ?? base.notes ?? '',
    createdAt: row.created_at || base.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || base.updatedAt || new Date().toISOString(),
  };
}

export async function getAllPrivateDeedsD1(
  db: any,
  options: {
    year?: number;
    month?: number;
    type?: string;
    search?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
  } = {}
): Promise<{ records: PrivateDeed[]; total: number; limit?: number; offset?: number }> {
  await ensureD1TablesExist(db);

  let whereConditions: string[] = [];
  let params: any[] = [];

  if (options.year && options.month) {
    const startStr = `${options.year}-${String(options.month).padStart(2, '0')}-01`;
    const nextYear = options.month === 12 ? options.year + 1 : options.year;
    const nextMonth = options.month === 12 ? 1 : options.month + 1;
    const endStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    whereConditions.push("registration_date >= ? AND registration_date < ?");
    params.push(startStr, endStr);
  } else if (options.year) {
    const startStr = `${options.year}-01-01`;
    const endStr = `${options.year + 1}-01-01`;
    whereConditions.push("registration_date >= ? AND registration_date < ?");
    params.push(startStr, endStr);
  }

  if (options.type) {
    whereConditions.push("type = ?");
    params.push(options.type);
  }

  if (options.search) {
    whereConditions.push("(number LIKE ? OR description LIKE ? OR parties LIKE ? OR notes LIKE ?)");
    const pattern = `%${options.search.trim()}%`;
    params.push(pattern, pattern, pattern, pattern);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  // Count query
  const countSql = `SELECT COUNT(*) as total FROM private_deeds ${whereClause}`;
  const countStmt = db.prepare(countSql);
  const countRes = params.length > 0 ? await countStmt.bind(...params).first() : await countStmt.first();
  const total = Number(countRes?.total || 0);

  let querySql = `SELECT * FROM private_deeds ${whereClause}`;
  let queryParams = [...params];

  const order = options.order === 'asc' ? 'ASC' : 'DESC';
  querySql += ` ORDER BY registration_date ${order}, CAST(number AS INTEGER) ${order}, created_at DESC`;

  if (typeof options.limit === 'number' && options.limit > 0) {
    const limit = options.limit;
    const offset = Math.max(0, options.offset || 0);
    querySql += ` LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);
  }

  const queryStmt = db.prepare(querySql);
  const queryRes = queryParams.length > 0 ? await queryStmt.bind(...queryParams).all() : await queryStmt.all();
  const rows = queryRes?.results || [];
  const records = rows.map(formatD1RowToPrivateDeed);

  return {
    records,
    total,
    limit: options.limit,
    offset: options.offset,
  };
}

export async function getPrivateDeedByIdD1(db: any, id: string): Promise<PrivateDeed | null> {
  await ensureD1TablesExist(db);
  const stmt = db.prepare("SELECT * FROM private_deeds WHERE id = ?");
  const row = await stmt.bind(id).first();
  if (!row) return null;
  return formatD1RowToPrivateDeed(row);
}

export async function createPrivateDeedD1(db: any, data: Partial<PrivateDeed>): Promise<PrivateDeed> {
  await ensureD1TablesExist(db);

  const id = data.id || `pdeed_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  const fullData: PrivateDeed = {
    ...data,
    id,
    number: data.number || '',
    registrationDate: data.registrationDate || '',
    type: data.type || 'Legalisasi',
    description: data.description || '',
    parties: data.parties || [],
    picName: data.picName || '',
    notes: data.notes || '',
    createdAt: data.createdAt || now,
    updatedAt: now,
  };

  const rawDataJson = JSON.stringify(fullData);
  const partiesJson = JSON.stringify(fullData.parties || []);

  const sql = `
    INSERT INTO private_deeds (
      id, number, registration_date, type, description, parties, pic_name, notes, created_at, updated_at, raw_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      number=excluded.number,
      registration_date=excluded.registration_date,
      type=excluded.type,
      description=excluded.description,
      parties=excluded.parties,
      pic_name=excluded.pic_name,
      notes=excluded.notes,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at,
      raw_data=excluded.raw_data
  `;

  await db.prepare(sql).bind(
    fullData.id,
    fullData.number || null,
    fullData.registrationDate || null,
    fullData.type || null,
    fullData.description || null,
    partiesJson,
    fullData.picName || null,
    fullData.notes || null,
    String(fullData.createdAt),
    String(fullData.updatedAt),
    rawDataJson
  ).run();

  return fullData;
}

export async function updatePrivateDeedD1(db: any, id: string, data: Partial<PrivateDeed>): Promise<PrivateDeed> {
  await ensureD1TablesExist(db);
  const existing = await getPrivateDeedByIdD1(db, id);
  if (!existing) {
    throw new Error(`Private deed with ID ${id} not found`);
  }

  const now = new Date().toISOString();
  const merged: PrivateDeed = {
    ...existing,
    ...data,
    id,
    updatedAt: now,
  };

  const rawDataJson = JSON.stringify(merged);
  const partiesJson = JSON.stringify(merged.parties || []);

  const sql = `
    UPDATE private_deeds SET
      number = ?,
      registration_date = ?,
      type = ?,
      description = ?,
      parties = ?,
      pic_name = ?,
      notes = ?,
      updated_at = ?,
      raw_data = ?
    WHERE id = ?
  `;

  await db.prepare(sql).bind(
    merged.number || null,
    merged.registrationDate || null,
    merged.type || null,
    merged.description || null,
    partiesJson,
    merged.picName || null,
    merged.notes || null,
    String(merged.updatedAt),
    rawDataJson,
    id
  ).run();

  return merged;
}

export async function deletePrivateDeedD1(db: any, id: string): Promise<boolean> {
  await ensureD1TablesExist(db);
  const stmt = db.prepare("DELETE FROM private_deeds WHERE id = ?");
  const res = await stmt.bind(id).run();
  return (res?.meta?.changes ?? 1) > 0;
}
