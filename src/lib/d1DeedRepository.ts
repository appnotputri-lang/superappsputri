import { Deed, DeedAppearer, DeedGrantor } from '../types';
import { ensureD1TablesExist } from '../services/d1MigrationService';

export function parseDeedNumber(val: any): { num: number; suffix: string; raw: string } {
  const raw = String(val ?? '').trim();
  if (!raw) return { num: 0, suffix: '', raw: '' };

  const match = raw.match(/^(\d+)(.*)$/);
  if (match) {
    return {
      num: parseInt(match[1], 10) || 0,
      suffix: match[2].trim().toLowerCase(),
      raw
    };
  }

  const digits = raw.match(/\d+/);
  if (digits) {
    return {
      num: parseInt(digits[0], 10) || 0,
      suffix: raw,
      raw
    };
  }

  return { num: 0, suffix: raw, raw };
}

export function compareDeedsChronologically(
  a: { date?: string; number?: string; deedNumber?: string; createdAt?: string | number; id?: string },
  b: { date?: string; number?: string; deedNumber?: string; createdAt?: string | number; id?: string }
): number {
  const dateA = (a.date || '').trim();
  const dateB = (b.date || '').trim();

  if (dateA !== dateB) {
    return dateA.localeCompare(dateB);
  }

  const numA = parseDeedNumber(a.number ?? a.deedNumber);
  const numB = parseDeedNumber(b.number ?? b.deedNumber);

  if (numA.num !== numB.num) {
    return numA.num - numB.num;
  }

  if (numA.suffix !== numB.suffix) {
    return numA.suffix.localeCompare(numB.suffix);
  }

  const createdA = String(a.createdAt || '');
  const createdB = String(b.createdAt || '');
  if (createdA !== createdB) {
    return createdA.localeCompare(createdB);
  }

  return String(a.id || '').localeCompare(String(b.id || ''));
}

export function formatD1RowToDeed(row: any): Deed {
  if (!row) return null as any;

  let base: any = {};
  if (row.raw_data) {
    try {
      base = JSON.parse(row.raw_data);
    } catch (e) {}
  }

  let appearers: DeedAppearer[] = [];
  try {
    if (typeof row.appearers === 'string') appearers = JSON.parse(row.appearers);
    else if (Array.isArray(row.appearers)) appearers = row.appearers;
  } catch (e) {
    appearers = base.appearers || [];
  }

  let grantors: DeedGrantor[] = [];
  try {
    if (typeof row.grantors === 'string') grantors = JSON.parse(row.grantors);
    else if (Array.isArray(row.grantors)) grantors = row.grantors;
  } catch (e) {
    grantors = base.grantors || [];
  }

  const deedNum = row.number ?? base.number ?? base.deedNumber ?? '';
  const deedDt = row.date ?? base.date ?? base.deedDate ?? '';
  const deedTt = row.title ?? base.title ?? base.deedTitle ?? '';

  return {
    ...base,
    id: String(row.id || base.id),
    orderNumber: row.order_number ?? base.orderNumber ?? '',
    number: deedNum,
    deedNumber: deedNum,
    date: deedDt,
    deedDate: deedDt,
    title: deedTt,
    deedTitle: deedTt,
    category: row.category ?? base.category ?? '',
    clientId: row.client_id ?? base.clientId ?? '',
    clientName: row.client_name ?? base.clientName ?? '',
    jobName: row.job_name ?? base.jobName ?? '',
    picName: row.pic_name ?? base.picName ?? '',
    notes: row.notes ?? base.notes ?? '',
    appearers,
    grantors,
    createdAt: row.created_at || base.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || base.updatedAt || new Date().toISOString(),
  };
}

export async function reconcileAllDeedsOrderNumbersD1(db: any): Promise<{
  totalDeeds: number;
  updatedCount: number;
  baseStartOrder: number;
  maxOrderNumber: number;
}> {
  await ensureD1TablesExist(db);

  const res = await db.prepare("SELECT * FROM deeds").all();
  const rows = res?.results || [];
  if (rows.length === 0) {
    return {
      totalDeeds: 0,
      updatedCount: 0,
      baseStartOrder: 1300,
      maxOrderNumber: 1300
    };
  }

  const deeds: Deed[] = rows.map(formatD1RowToDeed);
  deeds.sort(compareDeedsChronologically);

  // Tentukan baseStartOrder
  let minExistingOrder = 0;
  for (const d of deeds) {
    if (d.orderNumber) {
      const parsed = parseInt(String(d.orderNumber).replace(/\D/g, ''), 10);
      if (!isNaN(parsed) && parsed > 0) {
        if (minExistingOrder === 0 || parsed < minExistingOrder) {
          minExistingOrder = parsed;
        }
      }
    }
  }

  const earliestDate = deeds[0].date || '';
  let baseStartOrder = 1300;
  if (earliestDate && earliestDate >= '2025-11-01') {
    baseStartOrder = (minExistingOrder >= 1300 ? minExistingOrder : 1300);
  } else if (minExistingOrder > 0) {
    baseStartOrder = minExistingOrder;
  } else {
    baseStartOrder = 1;
  }

  let updatedCount = 0;
  for (let i = 0; i < deeds.length; i++) {
    const expectedOrder = String(baseStartOrder + i);
    const deed = deeds[i];
    if (String(deed.orderNumber).trim() !== expectedOrder) {
      deed.orderNumber = expectedOrder;
      const rawDataJson = JSON.stringify(deed);
      await db.prepare(
        "UPDATE deeds SET order_number = ?, raw_data = ?, updated_at = ? WHERE id = ?"
      ).bind(expectedOrder, rawDataJson, new Date().toISOString(), deed.id).run();
      updatedCount++;
    }
  }

  return {
    totalDeeds: deeds.length,
    updatedCount,
    baseStartOrder,
    maxOrderNumber: baseStartOrder + deeds.length - 1
  };
}

export async function getAllDeedsD1(
  db: any,
  options: {
    year?: number;
    month?: number;
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
  } = {}
): Promise<{ records: Deed[]; total: number; limit?: number; offset?: number }> {
  await ensureD1TablesExist(db);

  let whereConditions: string[] = [];
  let params: any[] = [];

  if (options.year && options.month) {
    const startStr = `${options.year}-${String(options.month).padStart(2, '0')}-01`;
    const nextYear = options.month === 12 ? options.year + 1 : options.year;
    const nextMonth = options.month === 12 ? 1 : options.month + 1;
    const endStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    whereConditions.push("date >= ? AND date < ?");
    params.push(startStr, endStr);
  } else if (options.year) {
    const startStr = `${options.year}-01-01`;
    const endStr = `${options.year + 1}-01-01`;
    whereConditions.push("date >= ? AND date < ?");
    params.push(startStr, endStr);
  }

  if (options.category && options.category !== 'ALL' && options.category !== 'Semua') {
    whereConditions.push("category = ?");
    params.push(options.category);
  }

  if (options.search) {
    whereConditions.push("(number LIKE ? OR title LIKE ? OR client_name LIKE ? OR order_number LIKE ? OR notes LIKE ? OR raw_data LIKE ?)");
    const pattern = `%${options.search.trim()}%`;
    params.push(pattern, pattern, pattern, pattern, pattern, pattern);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  let querySql = `SELECT * FROM deeds ${whereClause}`;
  let queryParams = [...params];

  // Sorting
  const sortBy = options.sortBy || 'date';
  const order = options.order === 'asc' ? 'ASC' : 'DESC';

  if (sortBy === 'orderNumber' || sortBy === 'order_number') {
    querySql += ` ORDER BY CAST(order_number AS INTEGER) ${order}, date ${order}, created_at DESC`;
  } else if (sortBy === 'number') {
    querySql += ` ORDER BY CAST(number AS INTEGER) ${order}, date ${order}`;
  } else {
    querySql += ` ORDER BY date ${order}, CAST(number AS INTEGER) ${order}, created_at DESC`;
  }

  if (typeof options.limit === 'number' && options.limit > 0) {
    const limit = options.limit;
    const offset = Math.max(0, options.offset || 0);
    querySql += ` LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);
  }

  const countSql = `SELECT COUNT(*) as total FROM deeds ${whereClause}`;
  const countStmt = db.prepare(countSql);
  const queryStmt = db.prepare(querySql);

  const [countRes, queryRes] = await Promise.all([
    params.length > 0 ? countStmt.bind(...params).first() : countStmt.first(),
    queryParams.length > 0 ? queryStmt.bind(...queryParams).all() : queryStmt.all()
  ]);

  const total = Number((countRes as any)?.total || 0);
  const rows = queryRes?.results || [];
  const records = rows.map(formatD1RowToDeed);

  return {
    records,
    total,
    limit: options.limit,
    offset: options.offset,
  };
}

export async function getDeedByIdD1(db: any, id: string): Promise<Deed | null> {
  await ensureD1TablesExist(db);
  const stmt = db.prepare("SELECT * FROM deeds WHERE id = ?");
  const row = await stmt.bind(id).first();
  if (!row) return null;
  return formatD1RowToDeed(row);
}

export async function createDeedD1(db: any, data: Partial<Deed>): Promise<Deed> {
  await ensureD1TablesExist(db);

  const id = data.id || `deed_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  const deedNum = data.number ?? data.deedNumber ?? '';
  const deedDt = data.date ?? data.deedDate ?? '';
  const deedTt = data.title ?? data.deedTitle ?? '';

  const fullData: Deed = {
    ...data,
    id,
    orderNumber: data.orderNumber || '',
    number: deedNum,
    deedNumber: deedNum,
    date: deedDt,
    deedDate: deedDt,
    title: deedTt,
    deedTitle: deedTt,
    category: data.category || '',
    clientId: data.clientId || '',
    clientName: data.clientName || '',
    jobName: data.jobName || '',
    picName: data.picName || '',
    notes: data.notes || '',
    appearers: data.appearers || [],
    grantors: data.grantors || [],
    createdAt: data.createdAt || now,
    updatedAt: now,
  };

  const rawDataJson = JSON.stringify(fullData);
  const appearersJson = JSON.stringify(fullData.appearers || []);
  const grantorsJson = JSON.stringify(fullData.grantors || []);

  const sql = `
    INSERT INTO deeds (
      id, order_number, number, date, title, category, client_id, client_name, job_name,
      pic_name, notes, appearers, grantors, created_at, updated_at, raw_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      order_number=excluded.order_number,
      number=excluded.number,
      date=excluded.date,
      title=excluded.title,
      category=excluded.category,
      client_id=excluded.client_id,
      client_name=excluded.client_name,
      job_name=excluded.job_name,
      pic_name=excluded.pic_name,
      notes=excluded.notes,
      appearers=excluded.appearers,
      grantors=excluded.grantors,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at,
      raw_data=excluded.raw_data
  `;

  await db.prepare(sql).bind(
    fullData.id,
    fullData.orderNumber || null,
    fullData.number || null,
    fullData.date || null,
    fullData.title || null,
    fullData.category || null,
    fullData.clientId || null,
    fullData.clientName || null,
    fullData.jobName || null,
    fullData.picName || null,
    fullData.notes || null,
    appearersJson,
    grantorsJson,
    String(fullData.createdAt),
    String(fullData.updatedAt),
    rawDataJson
  ).run();

  // Otomatis lakukan rekonsiliasi nomor urut kronologis secara global
  await reconcileAllDeedsOrderNumbersD1(db);

  const refreshed = await getDeedByIdD1(db, id);
  return refreshed || fullData;
}

export async function updateDeedD1(db: any, id: string, data: Partial<Deed>): Promise<Deed> {
  await ensureD1TablesExist(db);
  const existing = await getDeedByIdD1(db, id);
  if (!existing) {
    throw new Error(`Deed with ID ${id} not found`);
  }

  const now = new Date().toISOString();
  const merged: Deed = {
    ...existing,
    ...data,
    id,
    updatedAt: now,
  };

  if (data.number !== undefined) merged.deedNumber = data.number;
  if (data.deedNumber !== undefined) merged.number = data.deedNumber;
  if (data.date !== undefined) merged.deedDate = data.date;
  if (data.deedDate !== undefined) merged.date = data.deedDate;
  if (data.title !== undefined) merged.deedTitle = data.title;
  if (data.deedTitle !== undefined) merged.title = data.deedTitle;

  const rawDataJson = JSON.stringify(merged);
  const appearersJson = JSON.stringify(merged.appearers || []);
  const grantorsJson = JSON.stringify(merged.grantors || []);

  const sql = `
    UPDATE deeds SET
      order_number = ?,
      number = ?,
      date = ?,
      title = ?,
      category = ?,
      client_id = ?,
      client_name = ?,
      job_name = ?,
      pic_name = ?,
      notes = ?,
      appearers = ?,
      grantors = ?,
      updated_at = ?,
      raw_data = ?
    WHERE id = ?
  `;

  await db.prepare(sql).bind(
    merged.orderNumber || null,
    merged.number || null,
    merged.date || null,
    merged.title || null,
    merged.category || null,
    merged.clientId || null,
    merged.clientName || null,
    merged.jobName || null,
    merged.picName || null,
    merged.notes || null,
    appearersJson,
    grantorsJson,
    String(merged.updatedAt),
    rawDataJson,
    id
  ).run();

  // Otomatis rekonsiliasi nomor urut kronologis secara global
  await reconcileAllDeedsOrderNumbersD1(db);

  const refreshed = await getDeedByIdD1(db, id);
  return refreshed || merged;
}

export async function deleteDeedD1(db: any, id: string): Promise<boolean> {
  await ensureD1TablesExist(db);
  const stmt = db.prepare("DELETE FROM deeds WHERE id = ?");
  const res = await stmt.bind(id).run();
  const changes = (res?.meta?.changes ?? 1) > 0;
  if (changes) {
    await reconcileAllDeedsOrderNumbersD1(db);
  }
  return changes;
}

export async function fetchLatestDeedNumbersD1(db: any, targetDate: string): Promise<{
  maxDeedNumber: number;
  maxOrderNumber: number;
  nextDeedNumber: string;
  nextOrderNumber: string;
  countInMonth: number;
}> {
  await ensureD1TablesExist(db);

  let targetYear = new Date().getFullYear();
  let targetMonth = new Date().getMonth() + 1;

  if (targetDate) {
    if (targetDate.includes('-')) {
      const parts = targetDate.split('-');
      if (parts.length >= 2) {
        targetYear = parseInt(parts[0], 10);
        targetMonth = parseInt(parts[1], 10);
      }
    } else if (targetDate.includes('/')) {
      const parts = targetDate.split('/');
      if (parts.length >= 3) {
        targetYear = parseInt(parts[2], 10);
        targetMonth = parseInt(parts[1], 10);
      }
    }
  }

  if (isNaN(targetYear)) targetYear = new Date().getFullYear();
  if (isNaN(targetMonth)) targetMonth = new Date().getMonth() + 1;

  const startStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
  const nextYear = targetMonth === 12 ? targetYear + 1 : targetYear;
  const nextMonth = targetMonth === 12 ? 1 : targetMonth + 1;
  const endStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  // Fetch month deeds & all deeds to calculate exact chronological order
  const [monthDeedsRes, allDeedsRes] = await Promise.all([
    db.prepare(
      "SELECT number, raw_data FROM deeds WHERE date >= ? AND date < ?"
    ).bind(startStr, endStr).all(),
    db.prepare(
      "SELECT id, order_number, number, date, title, raw_data, created_at FROM deeds"
    ).all()
  ]);

  const monthRows = monthDeedsRes?.results || [];
  let maxDeedNumber = 0;
  for (const row of monthRows) {
    let deedNum = row.number;
    if (!deedNum && row.raw_data) {
      try {
        const parsed = JSON.parse(row.raw_data);
        deedNum = parsed.deedNumber || parsed.number;
      } catch (e) {}
    }
    if (deedNum) {
      const parsed = parseDeedNumber(deedNum);
      if (parsed.num > maxDeedNumber) {
        maxDeedNumber = parsed.num;
      }
    }
  }

  const nextDeed = maxDeedNumber + 1;
  const nextDeedNumber = nextDeed < 10 ? `0${nextDeed}` : `${nextDeed}`;

  const allRows = allDeedsRes?.results || [];
  const existingDeeds: Deed[] = allRows.map(formatD1RowToDeed);
  existingDeeds.sort(compareDeedsChronologically);

  // Tentukan baseStartOrder
  let minExistingOrder = 0;
  for (const d of existingDeeds) {
    if (d.orderNumber) {
      const parsed = parseInt(String(d.orderNumber).replace(/\D/g, ''), 10);
      if (!isNaN(parsed) && parsed > 0) {
        if (minExistingOrder === 0 || parsed < minExistingOrder) {
          minExistingOrder = parsed;
        }
      }
    }
  }

  const earliestDate = existingDeeds.length > 0 ? (existingDeeds[0].date || '') : targetDate;
  let baseStartOrder = 1300;
  if (earliestDate && earliestDate >= '2025-11-01') {
    baseStartOrder = (minExistingOrder >= 1300 ? minExistingOrder : 1300);
  } else if (minExistingOrder > 0) {
    baseStartOrder = minExistingOrder;
  } else {
    baseStartOrder = 1;
  }

  // Hitung posisi kronologis akta baru jika disisipkan di targetDate
  const dummyCandidate: Partial<Deed> = {
    id: '__simulated_next__',
    date: targetDate,
    number: nextDeedNumber,
    createdAt: new Date().toISOString()
  };

  const simulationList = [...existingDeeds, dummyCandidate as Deed];
  simulationList.sort(compareDeedsChronologically);

  const insertIndex = simulationList.findIndex(d => d.id === '__simulated_next__');
  const nextOrderNumber = String(baseStartOrder + (insertIndex >= 0 ? insertIndex : existingDeeds.length));

  return {
    maxDeedNumber,
    maxOrderNumber: baseStartOrder + existingDeeds.length,
    nextDeedNumber,
    nextOrderNumber,
    countInMonth: monthRows.length
  };
}
