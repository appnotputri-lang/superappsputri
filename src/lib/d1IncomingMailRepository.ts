import { IncomingMail } from '../types';
import { ensureD1TablesExist } from '../services/d1MigrationService';

export function formatD1RowToIncomingMail(row: any): IncomingMail {
  if (!row) return null as any;

  let base: any = {};
  if (row.raw_data) {
    try {
      base = JSON.parse(row.raw_data);
    } catch (e) {}
  }

  return {
    ...base,
    id: String(row.id || base.id),
    date: String(row.date ?? base.date ?? ''),
    mailNumber: String(row.mail_number ?? base.mailNumber ?? ''),
    sender: String(row.sender ?? base.sender ?? ''),
    subject: String(row.subject ?? base.subject ?? ''),
    notes: row.notes ?? base.notes ?? '',
    createdAt: row.created_at || base.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || base.updatedAt || new Date().toISOString(),
  };
}

export async function getAllIncomingMailsD1(
  db: any,
  options: {
    year?: number;
    month?: number;
    search?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
  } = {}
): Promise<{ records: IncomingMail[]; total: number; limit?: number; offset?: number }> {
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

  if (options.search) {
    whereConditions.push("(mail_number LIKE ? OR sender LIKE ? OR subject LIKE ? OR notes LIKE ?)");
    const pattern = `%${options.search.trim()}%`;
    params.push(pattern, pattern, pattern, pattern);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  // Count query
  const countSql = `SELECT COUNT(*) as total FROM incoming_mails ${whereClause}`;
  const countStmt = db.prepare(countSql);
  const countRes = params.length > 0 ? await countStmt.bind(...params).first() : await countStmt.first();
  const total = Number(countRes?.total || 0);

  let querySql = `SELECT * FROM incoming_mails ${whereClause}`;
  let queryParams = [...params];

  const order = options.order === 'asc' ? 'ASC' : 'DESC';
  querySql += ` ORDER BY date ${order}, created_at DESC`;

  if (typeof options.limit === 'number' && options.limit > 0) {
    const limit = options.limit;
    const offset = Math.max(0, options.offset || 0);
    querySql += ` LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);
  }

  const queryStmt = db.prepare(querySql);
  const queryRes = queryParams.length > 0 ? await queryStmt.bind(...queryParams).all() : await queryStmt.all();
  const rows = queryRes?.results || [];
  const records = rows.map(formatD1RowToIncomingMail);

  return {
    records,
    total,
    limit: options.limit,
    offset: options.offset,
  };
}

export async function getIncomingMailByIdD1(db: any, id: string): Promise<IncomingMail | null> {
  await ensureD1TablesExist(db);
  const stmt = db.prepare("SELECT * FROM incoming_mails WHERE id = ?");
  const row = await stmt.bind(id).first();
  if (!row) return null;
  return formatD1RowToIncomingMail(row);
}

export async function createIncomingMailD1(db: any, data: Partial<IncomingMail>): Promise<IncomingMail> {
  await ensureD1TablesExist(db);

  const id = data.id || `inmail_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  const fullData: IncomingMail = {
    ...data,
    id,
    date: data.date || '',
    mailNumber: data.mailNumber || '',
    sender: data.sender || '',
    subject: data.subject || '',
    notes: data.notes || '',
    createdAt: data.createdAt || now,
    updatedAt: now,
  };

  const rawDataJson = JSON.stringify(fullData);

  const sql = `
    INSERT INTO incoming_mails (
      id, date, mail_number, sender, subject, notes, created_at, updated_at, raw_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      date=excluded.date,
      mail_number=excluded.mail_number,
      sender=excluded.sender,
      subject=excluded.subject,
      notes=excluded.notes,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at,
      raw_data=excluded.raw_data
  `;

  await db.prepare(sql).bind(
    fullData.id,
    fullData.date || null,
    fullData.mailNumber || null,
    fullData.sender || null,
    fullData.subject || null,
    fullData.notes || null,
    String(fullData.createdAt),
    String(fullData.updatedAt),
    rawDataJson
  ).run();

  return fullData;
}

export async function updateIncomingMailD1(db: any, id: string, data: Partial<IncomingMail>): Promise<IncomingMail> {
  await ensureD1TablesExist(db);
  const existing = await getIncomingMailByIdD1(db, id);
  if (!existing) {
    throw new Error(`Incoming mail with ID ${id} not found`);
  }

  const now = new Date().toISOString();
  const merged: IncomingMail = {
    ...existing,
    ...data,
    id,
    updatedAt: now,
  };

  const rawDataJson = JSON.stringify(merged);

  const sql = `
    UPDATE incoming_mails SET
      date = ?,
      mail_number = ?,
      sender = ?,
      subject = ?,
      notes = ?,
      updated_at = ?,
      raw_data = ?
    WHERE id = ?
  `;

  await db.prepare(sql).bind(
    merged.date || null,
    merged.mailNumber || null,
    merged.sender || null,
    merged.subject || null,
    merged.notes || null,
    String(merged.updatedAt),
    rawDataJson,
    id
  ).run();

  return merged;
}

export async function deleteIncomingMailD1(db: any, id: string): Promise<boolean> {
  await ensureD1TablesExist(db);
  const stmt = db.prepare("DELETE FROM incoming_mails WHERE id = ?");
  const res = await stmt.bind(id).run();
  return (res?.meta?.changes ?? 1) > 0;
}
