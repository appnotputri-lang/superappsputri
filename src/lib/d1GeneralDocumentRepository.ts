import { GeneralDocumentData, GeneralDocumentItem, GeneralDocType } from '../types';
import { ensureD1TablesExist } from '../services/d1MigrationService';

function generateShortPublicToken(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join('');
}

export function formatD1RowToGeneralDocument(row: any): GeneralDocumentData {
  if (!row) return null as any;

  let base: any = {};
  if (row.raw_data) {
    try {
      base = JSON.parse(row.raw_data);
    } catch (e) {}
  }

  let items: GeneralDocumentItem[] = [];
  try {
    if (typeof row.items === 'string') items = JSON.parse(row.items);
    else if (Array.isArray(row.items)) items = row.items;
  } catch (e) {
    items = base.items || [];
  }

  return {
    ...base,
    id: String(row.id || base.id),
    docType: (row.doc_type || base.docType || 'RECEIPT') as GeneralDocType,
    referenceNo: String(row.reference_no ?? base.referenceNo ?? ''),
    date: String(row.date ?? base.date ?? ''),
    clientId: row.client_id || base.clientId || '',
    clientName: String(row.client_name ?? base.clientName ?? ''),
    clientSource: (row.client_source || base.clientSource || 'local') as 'local' | 'superapps',
    clientPic: row.client_pic ?? base.clientPic ?? '',
    clientAddress: row.client_address ?? base.clientAddress ?? '',
    clientContact: row.client_contact ?? base.clientContact ?? '',
    officerName: String(row.officer_name ?? base.officerName ?? ''),
    destination: row.destination ?? base.destination ?? '',
    deliveryMethod: row.delivery_method ?? base.deliveryMethod ?? '',
    trackingNumber: row.tracking_number ?? base.trackingNumber ?? '',
    notes: row.notes ?? base.notes ?? '',
    items,
    publicToken: row.public_token || base.publicToken || undefined,
    createdAt: row.created_at || base.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || base.updatedAt || new Date().toISOString(),
  };
}

export async function getAllGeneralDocumentsD1(
  db: any,
  options: {
    type?: string;
    search?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
  } = {}
): Promise<{ records: GeneralDocumentData[]; total: number; limit: number; offset: number }> {
  await ensureD1TablesExist(db);

  const isAll = options.limit === -1 || options.limit === 0 || (options.limit !== undefined && options.limit >= 10000);
  let limit = isAll ? 10000 : (options.limit !== undefined && options.limit > 0 ? Math.min(options.limit, 1000) : 10);
  let offset = options.offset ? Math.max(0, options.offset) : 0;
  let docType = options.type ? options.type.toUpperCase() : undefined;
  let search = options.search ? options.search.trim() : undefined;
  let sortBy = options.sortBy === 'referenceNo' ? 'reference_no' : 'date';
  let order = options.order === 'asc' ? 'ASC' : 'DESC';

  let whereConditions: string[] = [];
  let params: any[] = [];

  if (docType) {
    whereConditions.push("UPPER(doc_type) = ?");
    params.push(docType);
  }

  if (search) {
    whereConditions.push("(reference_no LIKE ? OR client_name LIKE ? OR client_pic LIKE ? OR officer_name LIKE ? OR delivery_method LIKE ? OR notes LIKE ? OR items LIKE ? OR raw_data LIKE ?)");
    const pattern = `%${search}%`;
    params.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  // Parallelize count and query
  const countSql = `SELECT COUNT(*) as total FROM general_documents ${whereClause}`;
  const querySql = `SELECT * FROM general_documents ${whereClause} ORDER BY ${sortBy} ${order}, created_at DESC LIMIT ? OFFSET ?`;

  const countStmt = db.prepare(countSql);
  const queryStmt = db.prepare(querySql);
  const queryParams = [...params, limit, offset];

  const [countRes, queryRes] = await Promise.all([
    params.length > 0 ? countStmt.bind(...params).first() : countStmt.first(),
    queryStmt.bind(...queryParams).all()
  ]);

  const total = Number((countRes as any)?.total || 0);
  const rows = queryRes?.results || [];
  const records = rows.map(formatD1RowToGeneralDocument);

  return {
    records,
    total,
    limit: isAll ? total : limit,
    offset,
  };
}

export async function getGeneralDocumentByIdD1(db: any, id: string): Promise<GeneralDocumentData | null> {
  await ensureD1TablesExist(db);
  const stmt = db.prepare("SELECT * FROM general_documents WHERE id = ?");
  const row = await stmt.bind(id).first();
  if (!row) return null;
  return formatD1RowToGeneralDocument(row);
}

export async function getGeneralDocumentByPublicTokenD1(db: any, token: string): Promise<GeneralDocumentData | null> {
  await ensureD1TablesExist(db);
  const stmt = db.prepare("SELECT * FROM general_documents WHERE public_token = ? OR id = ?");
  const row = await stmt.bind(token, token).first();
  if (!row) return null;
  return formatD1RowToGeneralDocument(row);
}

export async function createGeneralDocumentD1(db: any, data: Partial<GeneralDocumentData>): Promise<GeneralDocumentData> {
  await ensureD1TablesExist(db);

  const id = data.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();
  const publicToken = data.publicToken || generateShortPublicToken();

  const fullData: GeneralDocumentData = {
    id,
    docType: data.docType || 'RECEIPT',
    referenceNo: data.referenceNo || '',
    date: data.date || '',
    clientId: data.clientId || '',
    clientName: data.clientName || '',
    clientSource: data.clientSource || 'local',
    clientPic: data.clientPic || '',
    clientAddress: data.clientAddress || '',
    clientContact: data.clientContact || '',
    officerName: data.officerName || '',
    destination: data.destination || '',
    deliveryMethod: data.deliveryMethod || '',
    trackingNumber: data.trackingNumber || '',
    notes: data.notes || '',
    items: data.items || [],
    publicToken,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };

  const rawDataJson = JSON.stringify(fullData);
  const itemsJson = JSON.stringify(fullData.items);

  const sql = `
    INSERT INTO general_documents (
      id, doc_type, reference_no, date, client_id, client_name, client_source,
      client_pic, client_address, client_contact, officer_name, destination,
      delivery_method, tracking_number, notes, items, public_token, created_at, updated_at, raw_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      doc_type = excluded.doc_type,
      reference_no = excluded.reference_no,
      date = excluded.date,
      client_id = excluded.client_id,
      client_name = excluded.client_name,
      client_source = excluded.client_source,
      client_pic = excluded.client_pic,
      client_address = excluded.client_address,
      client_contact = excluded.client_contact,
      officer_name = excluded.officer_name,
      destination = excluded.destination,
      delivery_method = excluded.delivery_method,
      tracking_number = excluded.tracking_number,
      notes = excluded.notes,
      items = excluded.items,
      public_token = excluded.public_token,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      raw_data = excluded.raw_data
  `;

  await db.prepare(sql).bind(
    fullData.id,
    fullData.docType,
    fullData.referenceNo,
    fullData.date,
    fullData.clientId,
    fullData.clientName,
    fullData.clientSource,
    fullData.clientPic,
    fullData.clientAddress,
    fullData.clientContact,
    fullData.officerName,
    fullData.destination,
    fullData.deliveryMethod,
    fullData.trackingNumber,
    fullData.notes,
    itemsJson,
    fullData.publicToken,
    fullData.createdAt,
    fullData.updatedAt,
    rawDataJson
  ).run();

  return fullData;
}

export async function updateGeneralDocumentD1(db: any, id: string, data: Partial<GeneralDocumentData>): Promise<GeneralDocumentData> {
  const existing = await getGeneralDocumentByIdD1(db, id);
  if (!existing) {
    throw new Error(`General document with id ${id} not found.`);
  }

  const updated: GeneralDocumentData = {
    ...existing,
    ...data,
    id,
    updatedAt: new Date().toISOString(),
  };

  return createGeneralDocumentD1(db, updated);
}

export async function deleteGeneralDocumentD1(db: any, id: string): Promise<{ success: boolean; id: string }> {
  await ensureD1TablesExist(db);
  const stmt = db.prepare("DELETE FROM general_documents WHERE id = ?");
  await stmt.bind(id).run();
  return { success: true, id };
}
