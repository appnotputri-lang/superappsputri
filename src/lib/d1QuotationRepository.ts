import { Quotation } from '../types';
import { ensureD1TablesExist } from '../services/d1MigrationService';

export function formatD1RowToQuotation(row: any): Quotation {
  if (!row) return null as any;
  let base: any = {};
  if (row.raw_data) {
    try {
      base = JSON.parse(row.raw_data);
    } catch (e) {}
  }

  let items: any[] = [];
  try {
    if (typeof row.items === 'string') items = JSON.parse(row.items);
    else if (Array.isArray(row.items)) items = row.items;
  } catch (e) {
    items = base.items || [];
  }

  let projectIds: string[] | undefined = undefined;
  try {
    if (typeof row.project_ids === 'string') projectIds = JSON.parse(row.project_ids);
    else if (Array.isArray(row.project_ids)) projectIds = row.project_ids;
  } catch (e) {
    projectIds = base.projectIds;
  }

  let projectTitles: string[] | undefined = undefined;
  try {
    if (typeof row.project_titles === 'string') projectTitles = JSON.parse(row.project_titles);
    else if (Array.isArray(row.project_titles)) projectTitles = row.project_titles;
  } catch (e) {
    projectTitles = base.projectTitles;
  }

  return {
    ...base,
    id: String(row.id || base.id),
    quotationNumber: String(row.quotation_number || base.quotationNumber || ''),
    date: String(row.date || base.date || ''),
    validUntil: row.valid_until || base.validUntil || undefined,
    clientId: row.client_id || base.clientId || undefined,
    clientName: String(row.client_name || base.clientName || ''),
    clientAddress: row.client_address || base.clientAddress || undefined,
    clientPhone: row.client_phone || base.clientPhone || undefined,
    clientEmail: row.client_email || base.clientEmail || undefined,
    clientSource: (row.client_source || base.clientSource || 'local') as any,
    items,
    subtotal: Number(row.subtotal ?? base.subtotal ?? 0),
    taxAmount: Number(row.tax_amount ?? base.taxAmount ?? 0),
    taxRate: row.tax_rate != null ? Number(row.tax_rate) : (base.taxRate != null ? Number(base.taxRate) : undefined),
    discount: Number(row.discount ?? base.discount ?? 0),
    totalAmount: Number(row.total_amount ?? base.totalAmount ?? 0),
    status: String(row.status || base.status || 'DRAFT').toUpperCase() as any,
    notes: row.notes || base.notes || undefined,
    jobTitle: row.job_title || base.jobTitle || undefined,
    publicToken: row.public_token || base.publicToken || undefined,
    invoiceId: row.invoice_id || base.invoiceId || undefined,
    invoiceNumber: row.invoice_number || base.invoiceNumber || undefined,
    projectId: row.project_id || base.projectId || undefined,
    projectTitle: row.project_title || base.projectTitle || undefined,
    projectIds: projectIds || (base.projectIds ? base.projectIds : undefined),
    projectTitles: projectTitles || (base.projectTitles ? base.projectTitles : undefined),
    createdAt: row.created_at || base.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || base.updatedAt || new Date().toISOString(),
  };
}

export async function getAllQuotationsD1(db: any, params: {
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
}) {
  await ensureD1TablesExist(db);

  let limitVal = 100;
  if (typeof params.limit !== 'undefined') {
    const parsed = parseInt(String(params.limit), 10);
    if (!isNaN(parsed) && parsed > 0) {
      limitVal = Math.min(parsed, 500);
    }
  }

  const offsetVal = Math.max(0, parseInt(String(params.offset || '0'), 10));
  const searchVal = params.search ? String(params.search).trim() : '';
  const statusVal = params.status ? String(params.status).trim().toUpperCase() : 'ALL';

  let sql = `SELECT * FROM quotations`;
  let countSql = `SELECT COUNT(*) as total FROM quotations`;
  const conditions: string[] = [];
  const queryParams: any[] = [];

  if (statusVal && statusVal !== 'ALL') {
    conditions.push(`UPPER(status) = ?`);
    queryParams.push(statusVal);
  }

  if (searchVal) {
    const words = searchVal.toLowerCase().split(/\s+/).filter(Boolean);
    for (const word of words) {
      conditions.push(`(LOWER(quotation_number) LIKE ? OR LOWER(client_name) LIKE ?)`);
      queryParams.push(`%${word}%`, `%${word}%`);
    }
  }

  if (conditions.length > 0) {
    const whereClause = ` WHERE ` + conditions.join(' AND ');
    sql += whereClause;
    countSql += whereClause;
  }

  sql += ` ORDER BY created_at DESC, updated_at DESC LIMIT ? OFFSET ?`;
  const selectParams = [...queryParams, limitVal, offsetVal];

  const countStmt = db.prepare(countSql);
  const selectStmt = db.prepare(sql);

  const [countRes, selectRes] = await Promise.all([
    queryParams.length > 0 ? countStmt.bind(...queryParams).first() : countStmt.first(),
    selectStmt.bind(...selectParams).all()
  ]);

  const total = Number(countRes?.total || 0);
  const rows = selectRes?.results || [];
  const quotations = rows.map((r: any) => formatD1RowToQuotation(r));

  return {
    success: true,
    quotations,
    total
  };
}

export async function getQuotationByIdD1(db: any, id: string): Promise<Quotation | null> {
  await ensureD1TablesExist(db);
  try {
    const row = await db.prepare(`SELECT * FROM quotations WHERE id = ?`).bind(id).first();
    return row ? formatD1RowToQuotation(row) : null;
  } catch (err) {
    console.error('[d1QuotationRepository] Error in getQuotationByIdD1:', err);
    return null;
  }
}

export async function getQuotationByPublicTokenD1(db: any, publicToken: string): Promise<Quotation | null> {
  await ensureD1TablesExist(db);
  try {
    // 1. Try publicToken
    let row = await db.prepare(`SELECT * FROM quotations WHERE public_token = ?`).bind(publicToken).first();
    if (row) return formatD1RowToQuotation(row);

    // 2. Try document ID
    row = await db.prepare(`SELECT * FROM quotations WHERE id = ?`).bind(publicToken).first();
    if (row) return formatD1RowToQuotation(row);

    return null;
  } catch (err) {
    console.error('[d1QuotationRepository] Error in getQuotationByPublicTokenD1:', err);
    return null;
  }
}

export async function createQuotationD1(db: any, data: Quotation): Promise<any> {
  await ensureD1TablesExist(db);
  const now = new Date().toISOString();
  const id = data.id || `q_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const quotationNumber = data.quotationNumber || '';
  const date = data.date || now.split('T')[0];
  const validUntil = data.validUntil || null;
  const clientId = data.clientId || null;
  const clientName = data.clientName || '';
  const clientAddress = data.clientAddress || null;
  const clientPhone = data.clientPhone || null;
  const clientEmail = data.clientEmail || null;
  const clientSource = data.clientSource || 'local';
  const itemsJson = typeof data.items === 'string' ? data.items : JSON.stringify(data.items || []);
  const subtotal = Number(data.subtotal || 0);
  const taxAmount = Number(data.taxAmount || 0);
  const taxRate = typeof data.taxRate !== 'undefined' ? Number(data.taxRate) : null;
  const discount = Number(data.discount || 0);
  const totalAmount = Number(data.totalAmount || 0);
  const status = data.status || 'DRAFT';
  const notes = data.notes || null;
  const jobTitle = data.jobTitle || null;
  const publicToken = data.publicToken || id;
  const invoiceId = data.invoiceId || null;
  const invoiceNumber = data.invoiceNumber || null;
  const projectId = data.projectId || null;
  const projectTitle = data.projectTitle || null;
  const projectIds = data.projectIds ? (typeof data.projectIds === 'string' ? data.projectIds : JSON.stringify(data.projectIds)) : null;
  const projectTitles = data.projectTitles ? (typeof data.projectTitles === 'string' ? data.projectTitles : JSON.stringify(data.projectTitles)) : null;
  const createdAt = data.createdAt || now;
  const updatedAt = now;

  const rawData = JSON.stringify({
    ...data,
    id,
    publicToken,
    createdAt,
    updatedAt
  });

  await db.prepare(`
    INSERT INTO quotations (
      id, quotation_number, date, valid_until, client_id, client_name, client_address, client_phone, client_email, client_source,
      items, subtotal, tax_amount, tax_rate, discount, total_amount, status, notes, job_title, public_token,
      invoice_id, invoice_number, project_id, project_title, project_ids, project_titles, created_at, updated_at, raw_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `).bind(
    id, quotationNumber, date, validUntil, clientId, clientName, clientAddress, clientPhone, clientEmail, clientSource,
    itemsJson, subtotal, taxAmount, taxRate, discount, totalAmount, status, notes, jobTitle, publicToken,
    invoiceId, invoiceNumber, projectId, projectTitle, projectIds, projectTitles, createdAt, updatedAt, rawData
  ).run();

  return { success: true, id, publicToken };
}

export async function updateQuotationD1(db: any, id: string, data: Partial<Quotation>): Promise<any> {
  await ensureD1TablesExist(db);
  const now = new Date().toISOString();
  const existing = await getQuotationByIdD1(db, id);
  if (!existing) {
    throw new Error(`Quotation not found with id ${id}`);
  }

  const merged = { ...existing, ...data, id, updatedAt: now };
  const quotationNumber = merged.quotationNumber || '';
  const date = merged.date || '';
  const validUntil = merged.validUntil || null;
  const clientId = merged.clientId || null;
  const clientName = merged.clientName || '';
  const clientAddress = merged.clientAddress || null;
  const clientPhone = merged.clientPhone || null;
  const clientEmail = merged.clientEmail || null;
  const clientSource = merged.clientSource || 'local';
  const itemsJson = typeof merged.items === 'string' ? merged.items : JSON.stringify(merged.items || []);
  const subtotal = Number(merged.subtotal || 0);
  const taxAmount = Number(merged.taxAmount || 0);
  const taxRate = typeof merged.taxRate !== 'undefined' ? Number(merged.taxRate) : null;
  const discount = Number(merged.discount || 0);
  const totalAmount = Number(merged.totalAmount || 0);
  const status = merged.status || 'DRAFT';
  const notes = merged.notes || null;
  const jobTitle = merged.jobTitle || null;
  const publicToken = merged.publicToken || id;
  const invoiceId = merged.invoiceId || null;
  const invoiceNumber = merged.invoiceNumber || null;
  const projectId = merged.projectId || null;
  const projectTitle = merged.projectTitle || null;
  const projectIds = merged.projectIds ? (typeof merged.projectIds === 'string' ? merged.projectIds : JSON.stringify(merged.projectIds)) : null;
  const projectTitles = merged.projectTitles ? (typeof merged.projectTitles === 'string' ? merged.projectTitles : JSON.stringify(merged.projectTitles)) : null;
  const rawData = JSON.stringify(merged);

  await db.prepare(`
    UPDATE quotations SET
      quotation_number = ?, date = ?, valid_until = ?, client_id = ?, client_name = ?,
      client_address = ?, client_phone = ?, client_email = ?, client_source = ?,
      items = ?, subtotal = ?, tax_amount = ?, tax_rate = ?, discount = ?, total_amount = ?,
      status = ?, notes = ?, job_title = ?, public_token = ?, invoice_id = ?, invoice_number = ?,
      project_id = ?, project_title = ?, project_ids = ?, project_titles = ?, updated_at = ?, raw_data = ?
    WHERE id = ?
  `).bind(
    quotationNumber, date, validUntil, clientId, clientName,
    clientAddress, clientPhone, clientEmail, clientSource,
    itemsJson, subtotal, taxAmount, taxRate, discount, totalAmount,
    status, notes, jobTitle, publicToken, invoiceId, invoiceNumber,
    projectId, projectTitle, projectIds, projectTitles, now, rawData, id
  ).run();

  return { success: true };
}

export async function deleteQuotationD1(db: any, id: string): Promise<any> {
  await ensureD1TablesExist(db);
  await db.prepare(`DELETE FROM quotations WHERE id = ?`).bind(id).run();
  return { success: true };
}
