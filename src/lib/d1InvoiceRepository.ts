import { Invoice, PaymentRecord } from '../types';
import { ensureD1TablesExist } from '../services/d1MigrationService';

function generateShortPublicToken(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join('');
}

export function formatD1RowToInvoice(row: any): Invoice {
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

  let bankDetails: any = undefined;
  try {
    if (typeof row.bank_details === 'string') bankDetails = JSON.parse(row.bank_details);
    else if (typeof row.bank_details === 'object' && row.bank_details !== null) bankDetails = row.bank_details;
  } catch (e) {
    bankDetails = base.bankDetails;
  }

  let paymentHistory: PaymentRecord[] = [];
  try {
    if (typeof row.payment_history === 'string') paymentHistory = JSON.parse(row.payment_history);
    else if (Array.isArray(row.payment_history)) paymentHistory = row.payment_history;
  } catch (e) {
    paymentHistory = base.paymentHistory || [];
  }

  return {
    ...base,
    id: String(row.id || base.id),
    invoiceNumber: String(row.invoice_number || base.invoiceNumber || ''),
    clientName: String(row.client_name || base.clientName || ''),
    clientId: row.client_id || base.clientId || undefined,
    clientSource: (row.client_source || base.clientSource || 'local') as any,
    clientEmail: row.client_email || base.clientEmail || undefined,
    clientPhone: row.client_phone || base.clientPhone || undefined,
    clientAddress: row.client_address || base.clientAddress || undefined,
    issueDate: String(row.issue_date || base.issueDate || ''),
    dueDate: row.due_date || base.dueDate || undefined,
    status: String(row.status || base.status || 'UNPAID').toUpperCase() as any,
    items,
    subtotal: Number(row.subtotal ?? base.subtotal ?? 0),
    taxAmount: Number(row.tax_amount ?? base.taxAmount ?? 0),
    taxRate: row.tax_rate != null ? Number(row.tax_rate) : (base.taxRate != null ? Number(base.taxRate) : undefined),
    discount: Number(row.discount ?? base.discount ?? 0),
    totalAmount: Number(row.total_amount ?? base.totalAmount ?? 0),
    paidAmount: Number(row.paid_amount ?? base.paidAmount ?? 0),
    balanceDue: Number(row.balance_due ?? base.balanceDue ?? 0),
    currency: row.currency || base.currency || 'IDR',
    projectId: row.project_id || base.projectId || undefined,
    projectTitle: row.project_title || base.projectTitle || undefined,
    projectIds: projectIds || (base.projectIds ? base.projectIds : undefined),
    projectTitles: projectTitles || (base.projectTitles ? base.projectTitles : undefined),
    quotationId: row.quotation_id || base.quotationId || undefined,
    quotationNumber: row.quotation_number || base.quotationNumber || undefined,
    language: (row.language || base.language || 'id') as any,
    notes: row.notes || base.notes || undefined,
    terms: row.terms || base.terms || undefined,
    bankDetails: bankDetails || base.bankDetails,
    paymentHistory,
    publicToken: row.public_token || base.publicToken || undefined,
    legacyPublicUrl: row.legacy_public_url || base.legacyPublicUrl || undefined,
    createdAt: row.created_at || base.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || base.updatedAt || new Date().toISOString(),
  };
}

export function formatInvoiceToD1Params(data: Partial<Invoice> & { id: string }, nowIso: string) {
  const invNum = String(data.invoiceNumber || 'INV-0000');
  const clientName = String(data.clientName || 'Unknown Client');
  const clientId = data.clientId || null;
  const clientSource = String(data.clientSource || 'local');
  const clientEmail = data.clientEmail || null;
  const clientPhone = data.clientPhone || null;
  const clientAddress = data.clientAddress || null;
  const issueDate = String(data.issueDate || nowIso.split('T')[0]);
  const dueDate = data.dueDate || null;
  const status = String(data.status || 'UNPAID').toUpperCase();
  const itemsJson = typeof data.items === 'string' ? data.items : JSON.stringify(data.items || []);
  const subtotal = Number(data.subtotal || 0);
  const taxAmount = Number(data.taxAmount || 0);
  const taxRate = typeof data.taxRate !== 'undefined' && data.taxRate !== null ? Number(data.taxRate) : null;
  const discount = Number(data.discount || 0);
  const totalAmount = Number(data.totalAmount || 0);
  const paidAmount = Number(data.paidAmount || 0);
  const balanceDue = Number(typeof data.balanceDue !== 'undefined' && data.balanceDue !== null ? data.balanceDue : (totalAmount - paidAmount));
  const currency = String(data.currency || 'IDR');
  const projectId = data.projectId || null;
  const projectTitle = data.projectTitle || null;
  const projectIds = data.projectIds ? (typeof data.projectIds === 'string' ? data.projectIds : JSON.stringify(data.projectIds)) : null;
  const projectTitles = data.projectTitles ? (typeof data.projectTitles === 'string' ? data.projectTitles : JSON.stringify(data.projectTitles)) : null;
  const quotationId = data.quotationId || null;
  const quotationNumber = data.quotationNumber || null;
  const language = String(data.language || 'id');
  const notes = data.notes || null;
  const terms = data.terms || null;
  const bankDetails = data.bankDetails ? (typeof data.bankDetails === 'string' ? data.bankDetails : JSON.stringify(data.bankDetails)) : null;
  const paymentHistory = data.paymentHistory ? (typeof data.paymentHistory === 'string' ? data.paymentHistory : JSON.stringify(data.paymentHistory)) : null;
  const publicToken = data.publicToken || generateShortPublicToken();
  const legacyPublicUrl = data.legacyPublicUrl || null;
  const createdAt = String(data.createdAt || nowIso);
  const updatedAt = nowIso;
  const rawData = JSON.stringify({
    ...data,
    id: data.id,
    publicToken,
    createdAt,
    updatedAt
  });

  return {
    id: data.id,
    invoice_number: invNum,
    client_id: clientId,
    client_name: clientName,
    client_source: clientSource,
    client_email: clientEmail,
    client_phone: clientPhone,
    client_address: clientAddress,
    issue_date: issueDate,
    due_date: dueDate,
    status,
    items: itemsJson,
    subtotal,
    tax_amount: taxAmount,
    tax_rate: taxRate,
    discount,
    total_amount: totalAmount,
    paid_amount: paidAmount,
    balance_due: balanceDue,
    currency,
    project_id: projectId,
    project_title: projectTitle,
    project_ids: projectIds,
    project_titles: projectTitles,
    quotation_id: quotationId,
    quotation_number: quotationNumber,
    language,
    notes,
    terms,
    bank_details: bankDetails,
    payment_history: paymentHistory,
    public_token: publicToken,
    legacy_public_url: legacyPublicUrl,
    created_at: createdAt,
    updated_at: updatedAt,
    raw_data: rawData
  };
}

export async function getAllInvoicesD1(db: any, params: {
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
    } else if (params.limit === 0 || String(params.limit).toUpperCase() === 'ALL') {
      limitVal = 500;
    }
  }

  const offsetVal = Math.max(0, parseInt(String(params.offset || '0'), 10));
  const searchVal = params.search ? String(params.search).trim() : '';
  const statusVal = params.status ? String(params.status).trim().toUpperCase() : 'ALL';

  let sql = `SELECT * FROM invoices`;
  let countSql = `SELECT COUNT(*) as total FROM invoices`;
  const conditions: string[] = [];
  const queryParams: any[] = [];

  if (statusVal && statusVal !== 'ALL') {
    if (statusVal === 'CANCELLED' || statusVal === 'DIBATALKAN') {
      conditions.push(`(UPPER(status) = 'CANCELLED' OR UPPER(status) = 'DIBATALKAN')`);
    } else {
      conditions.push(`UPPER(status) = ?`);
      queryParams.push(statusVal);
    }
  }

  if (searchVal) {
    const words = searchVal.toLowerCase().split(/\s+/).filter(Boolean);
    for (const word of words) {
      conditions.push(`(LOWER(invoice_number) LIKE ? OR LOWER(client_name) LIKE ?)`);
      queryParams.push(`%${word}%`, `%${word}%`);
    }
  }

  if (conditions.length > 0) {
    const whereClause = ` WHERE ` + conditions.join(' AND ');
    sql += whereClause;
    countSql += whereClause;
  }

  // Get total count first
  let total = 0;
  try {
    const countRes = await db.prepare(countSql).bind(...queryParams).first();
    total = countRes?.total || 0;
  } catch (err) {
    console.warn('[d1InvoiceRepository] Error counting invoices:', err);
  }

  sql += ` ORDER BY created_at DESC, updated_at DESC LIMIT ? OFFSET ?`;
  const selectParams = [...queryParams, limitVal, offsetVal];

  const res = await db.prepare(sql).bind(...selectParams).all();
  const rows = res.results || [];
  const invoices = rows.map((r: any) => formatD1RowToInvoice(r));

  return {
    success: true,
    count: invoices.length,
    total,
    limit: limitVal,
    offset: offsetVal,
    invoices
  };
}

export async function getInvoiceByIdD1(db: any, id: string) {
  await ensureD1TablesExist(db);

  const row = await db.prepare(`SELECT * FROM invoices WHERE id = ? LIMIT 1`).bind(id).first();
  if (!row) {
    return { success: false, error: 'Invoice not found', invoice: null };
  }

  return {
    success: true,
    invoice: formatD1RowToInvoice(row)
  };
}

export async function getInvoiceByPublicTokenD1(db: any, token: string) {
  await ensureD1TablesExist(db);

  const cleanToken = String(token || '').trim();
  if (!cleanToken) {
    return { success: false, error: 'Token is required', invoice: null };
  }

  // 1. Try public_token
  let row = await db.prepare(`SELECT * FROM invoices WHERE public_token = ? LIMIT 1`).bind(cleanToken).first();
  if (row) {
    return { success: true, invoice: formatD1RowToInvoice(row) };
  }

  // 2. Try legacy_public_url
  const decoded = decodeURIComponent(cleanToken);
  const possibleUrls = [
    `https://notarisputri.web.id/INV/${cleanToken}`,
    `https://notarisputri.web.id/INV/${decoded}`,
    `http://notarisputri.web.id/INV/${cleanToken}`,
    `http://notarisputri.web.id/INV/${decoded}`
  ];

  for (const url of possibleUrls) {
    row = await db.prepare(`SELECT * FROM invoices WHERE legacy_public_url = ? LIMIT 1`).bind(url).first();
    if (row) {
      return { success: true, invoice: formatD1RowToInvoice(row) };
    }
  }

  // 3. Try ID fallback
  row = await db.prepare(`SELECT * FROM invoices WHERE id = ? LIMIT 1`).bind(cleanToken).first();
  if (row) {
    return { success: true, invoice: formatD1RowToInvoice(row) };
  }

  return { success: false, error: 'Invoice not found', invoice: null };
}

export async function createInvoiceD1(db: any, payload: any) {
  await ensureD1TablesExist(db);

  const nowIso = new Date().toISOString();
  const id = String(payload.id || payload._id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
  const fullData = {
    ...payload,
    id
  };

  const p = formatInvoiceToD1Params(fullData, nowIso);

  const sql = `
    INSERT INTO invoices (
      id, invoice_number, client_id, client_name, client_source, client_email, client_phone, client_address,
      issue_date, due_date, status, items, subtotal, tax_amount, tax_rate, discount, total_amount, paid_amount, balance_due,
      currency, project_id, project_title, project_ids, project_titles, quotation_id, quotation_number,
      language, notes, terms, bank_details, payment_history, public_token, legacy_public_url, created_at, updated_at, raw_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      invoice_number=excluded.invoice_number,
      client_id=excluded.client_id,
      client_name=excluded.client_name,
      client_source=excluded.client_source,
      client_email=excluded.client_email,
      client_phone=excluded.client_phone,
      client_address=excluded.client_address,
      issue_date=excluded.issue_date,
      due_date=excluded.due_date,
      status=excluded.status,
      items=excluded.items,
      subtotal=excluded.subtotal,
      tax_amount=excluded.tax_amount,
      tax_rate=excluded.tax_rate,
      discount=excluded.discount,
      total_amount=excluded.total_amount,
      paid_amount=excluded.paid_amount,
      balance_due=excluded.balance_due,
      currency=excluded.currency,
      project_id=excluded.project_id,
      project_title=excluded.project_title,
      project_ids=excluded.project_ids,
      project_titles=excluded.project_titles,
      quotation_id=excluded.quotation_id,
      quotation_number=excluded.quotation_number,
      language=excluded.language,
      notes=excluded.notes,
      terms=excluded.terms,
      bank_details=excluded.bank_details,
      payment_history=excluded.payment_history,
      public_token=excluded.public_token,
      legacy_public_url=excluded.legacy_public_url,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at,
      raw_data=excluded.raw_data
  `;

  await db.prepare(sql).bind(
    p.id, p.invoice_number, p.client_id, p.client_name, p.client_source, p.client_email, p.client_phone, p.client_address,
    p.issue_date, p.due_date, p.status, p.items, p.subtotal, p.tax_amount, p.tax_rate, p.discount, p.total_amount, p.paid_amount, p.balance_due,
    p.currency, p.project_id, p.project_title, p.project_ids, p.project_titles, p.quotation_id, p.quotation_number,
    p.language, p.notes, p.terms, p.bank_details, p.payment_history, p.public_token, p.legacy_public_url, p.created_at, p.updated_at, p.raw_data
  ).run();

  const createdRow = await db.prepare(`SELECT * FROM invoices WHERE id = ? LIMIT 1`).bind(id).first();
  return {
    success: true,
    id,
    invoice: formatD1RowToInvoice(createdRow)
  };
}

export async function updateInvoiceD1(db: any, id: string, payload: any) {
  await ensureD1TablesExist(db);

  const existingRes = await getInvoiceByIdD1(db, id);
  if (!existingRes.success || !existingRes.invoice) {
    return { success: false, error: 'Invoice not found', invoice: null };
  }

  const merged = {
    ...existingRes.invoice,
    ...payload,
    id
  };

  const nowIso = new Date().toISOString();
  const p = formatInvoiceToD1Params(merged, nowIso);

  const sql = `
    UPDATE invoices SET
      invoice_number=?, client_id=?, client_name=?, client_source=?, client_email=?, client_phone=?, client_address=?,
      issue_date=?, due_date=?, status=?, items=?, subtotal=?, tax_amount=?, tax_rate=?, discount=?, total_amount=?,
      paid_amount=?, balance_due=?, currency=?, project_id=?, project_title=?, project_ids=?, project_titles=?,
      quotation_id=?, quotation_number=?, language=?, notes=?, terms=?, bank_details=?, payment_history=?,
      public_token=?, legacy_public_url=?, updated_at=?, raw_data=?
    WHERE id=?
  `;

  await db.prepare(sql).bind(
    p.invoice_number, p.client_id, p.client_name, p.client_source, p.client_email, p.client_phone, p.client_address,
    p.issue_date, p.due_date, p.status, p.items, p.subtotal, p.tax_amount, p.tax_rate, p.discount, p.total_amount,
    p.paid_amount, p.balance_due, p.currency, p.project_id, p.project_title, p.project_ids, p.project_titles,
    p.quotation_id, p.quotation_number, p.language, p.notes, p.terms, p.bank_details, p.payment_history,
    p.public_token, p.legacy_public_url, p.updated_at, p.raw_data,
    id
  ).run();

  const updatedRow = await db.prepare(`SELECT * FROM invoices WHERE id = ? LIMIT 1`).bind(id).first();
  return {
    success: true,
    id,
    invoice: formatD1RowToInvoice(updatedRow)
  };
}

export async function deleteInvoiceD1(db: any, id: string) {
  await ensureD1TablesExist(db);

  await db.prepare(`DELETE FROM invoices WHERE id = ?`).bind(id).run();
  return {
    success: true,
    id,
    message: 'Invoice deleted successfully'
  };
}
