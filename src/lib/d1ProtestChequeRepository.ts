import { ProtestCheque } from '../types';
import { ensureD1TablesExist } from '../services/d1MigrationService';

export function formatD1RowToProtestCheque(row: any): ProtestCheque {
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
    number: String(row.number ?? base.number ?? ''),
    protestDate: String(row.protest_date ?? base.protestDate ?? ''),
    bankName: String(row.bank_name ?? base.bankName ?? ''),
    chequeNumber: String(row.cheque_number ?? base.chequeNumber ?? ''),
    amount: typeof row.amount === 'number' ? row.amount : (base.amount ?? 0),
    applicantName: String(row.applicant_name ?? base.applicantName ?? ''),
    drawerName: String(row.drawer_name ?? base.drawerName ?? ''),
    reason: row.reason ?? base.reason ?? '',
    notes: row.notes ?? base.notes ?? '',
    createdAt: row.created_at || base.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || base.updatedAt || new Date().toISOString(),
  };
}

export async function getAllProtestChequesD1(
  db: any,
  options: {
    year?: number;
    month?: number;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ records: ProtestCheque[]; total: number }> {
  await ensureD1TablesExist(db);

  let whereConditions: string[] = [];
  let params: any[] = [];

  if (options.year && options.month) {
    const startStr = `${options.year}-${String(options.month).padStart(2, '0')}-01`;
    const nextYear = options.month === 12 ? options.year + 1 : options.year;
    const nextMonth = options.month === 12 ? 1 : options.month + 1;
    const endStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    whereConditions.push("protest_date >= ? AND protest_date < ?");
    params.push(startStr, endStr);
  }

  if (options.search) {
    whereConditions.push("(number LIKE ? OR bank_name LIKE ? OR cheque_number LIKE ? OR applicant_name LIKE ? OR drawer_name LIKE ?)");
    const pattern = `%${options.search.trim()}%`;
    params.push(pattern, pattern, pattern, pattern, pattern);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  let querySql = `SELECT * FROM protest_cheques ${whereClause} ORDER BY protest_date DESC, created_at DESC`;
  let queryParams = [...params];

  if (typeof options.limit === 'number' && options.limit > 0) {
    querySql += ` LIMIT ? OFFSET ?`;
    queryParams.push(options.limit, options.offset || 0);
  }

  const countSql = `SELECT COUNT(*) as total FROM protest_cheques ${whereClause}`;
  const countStmt = db.prepare(countSql);
  const queryStmt = db.prepare(querySql);

  const [countRes, queryRes] = await Promise.all([
    params.length > 0 ? countStmt.bind(...params).first() : countStmt.first(),
    queryParams.length > 0 ? queryStmt.bind(...queryParams).all() : queryStmt.all()
  ]);

  const total = Number((countRes as any)?.total || 0);
  const rows = queryRes?.results || [];

  return {
    records: rows.map(formatD1RowToProtestCheque),
    total
  };
}

export async function createProtestChequeD1(db: any, data: Partial<ProtestCheque>): Promise<ProtestCheque> {
  await ensureD1TablesExist(db);
  const id = data.id || `cheque_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  const fullData: ProtestCheque = {
    ...data,
    id,
    number: data.number || '',
    protestDate: data.protestDate || '',
    bankName: data.bankName || '',
    chequeNumber: data.chequeNumber || '',
    amount: data.amount || 0,
    applicantName: data.applicantName || '',
    drawerName: data.drawerName || '',
    reason: data.reason || '',
    notes: data.notes || '',
    createdAt: data.createdAt || now,
    updatedAt: now,
  };

  const rawDataJson = JSON.stringify(fullData);

  const sql = `
    INSERT INTO protest_cheques (
      id, number, protest_date, bank_name, cheque_number, amount, applicant_name, drawer_name, reason, notes, created_at, updated_at, raw_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      number=excluded.number,
      protest_date=excluded.protest_date,
      bank_name=excluded.bank_name,
      cheque_number=excluded.cheque_number,
      amount=excluded.amount,
      applicant_name=excluded.applicant_name,
      drawer_name=excluded.drawer_name,
      reason=excluded.reason,
      notes=excluded.notes,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at,
      raw_data=excluded.raw_data
  `;

  await db.prepare(sql).bind(
    fullData.id,
    fullData.number || null,
    fullData.protestDate || null,
    fullData.bankName || null,
    fullData.chequeNumber || null,
    fullData.amount || 0,
    fullData.applicantName || null,
    fullData.drawerName || null,
    fullData.reason || null,
    fullData.notes || null,
    String(fullData.createdAt),
    String(fullData.updatedAt),
    rawDataJson
  ).run();

  return fullData;
}

export async function updateProtestChequeD1(db: any, id: string, data: Partial<ProtestCheque>): Promise<void> {
  await ensureD1TablesExist(db);
  const now = new Date().toISOString();
  const rawDataJson = JSON.stringify({ ...data, id, updatedAt: now });

  const sql = `
    UPDATE protest_cheques SET
      number = COALESCE(?, number),
      protest_date = COALESCE(?, protest_date),
      bank_name = COALESCE(?, bank_name),
      cheque_number = COALESCE(?, cheque_number),
      amount = COALESCE(?, amount),
      applicant_name = COALESCE(?, applicant_name),
      drawer_name = COALESCE(?, drawer_name),
      reason = COALESCE(?, reason),
      notes = COALESCE(?, notes),
      updated_at = ?,
      raw_data = ?
    WHERE id = ?
  `;

  await db.prepare(sql).bind(
    data.number ?? null,
    data.protestDate ?? null,
    data.bankName ?? null,
    data.chequeNumber ?? null,
    data.amount ?? null,
    data.applicantName ?? null,
    data.drawerName ?? null,
    data.reason ?? null,
    data.notes ?? null,
    now,
    rawDataJson,
    id
  ).run();
}

export async function deleteProtestChequeD1(db: any, id: string): Promise<boolean> {
  await ensureD1TablesExist(db);
  const stmt = db.prepare("DELETE FROM protest_cheques WHERE id = ?");
  const res = await stmt.bind(id).run();
  return (res?.meta?.changes ?? 1) > 0;
}
