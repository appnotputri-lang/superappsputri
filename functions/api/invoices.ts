import { createJsonResponse, createErrorResponse, handleOptions } from '../../src/runtime';
import { mapRowToInvoice, mapInvoiceToRow } from '../../src/lib/invoiceD1Adapter';

export const onRequest = async (context: any) => {
  const { request, env } = context;
  const db = env.DB;
  
  console.log('[Invoice API] DB binding:', !!db);
  if (!db) return createErrorResponse("Database configuration error", 500);

  const url = new URL(request.url);
  const method = request.method;

  if (method === 'OPTIONS') return handleOptions();

  if (method === 'GET') {
    try {
      const limit = Math.min(Math.max(1, parseInt(url.searchParams.get('limit') || '50')), 100);
      const status = url.searchParams.get('status'); // ALL, UNPAID, PAID
      const search = url.searchParams.get('search') || '';
      
      let sql = `SELECT * FROM invoices`;
      const conditions: string[] = [];
      const params: any[] = [];
      
      if (status && status !== 'ALL') {
        conditions.push(`status = ?`);
        params.push(status);
      }
      
      if (search) {
        conditions.push(`(invoice_number LIKE ? OR client_name LIKE ?)`);
        params.push(`%${search}%`, `%${search}%`);
      }
      
      if (conditions.length > 0) sql += ` WHERE ` + conditions.join(' AND ');
      sql += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(limit);
      
      console.log('[Invoice API] Executing SQL:', sql, params);
      const res = await db.prepare(sql).bind(...params).all();
      console.log('[Invoice API] Query result count:', res.results?.length);
      
      const invoices = (res.results || []).map(mapRowToInvoice);
      
      return createJsonResponse({ success: true, invoices });
    } catch (e: any) {
      console.error('[Invoice API] GET Error:', e);
      return createErrorResponse(e.message, 500);
    }
  }
  
  if (method === 'POST') {
    try {
      const body = await request.json();
      const invoice = mapInvoiceToRow(body);
      
      await db.prepare(`
        INSERT INTO invoices (id, invoice_number, client_id, client_name, client_source, client_email, client_phone, client_address, issue_date, due_date, status, items, subtotal, tax_amount, tax_rate, discount, total_amount, paid_amount, balance_due, currency, project_id, project_title, project_ids, project_titles, quotation_id, quotation_number, language, notes, terms, bank_details, payment_history, public_token, legacy_public_url, created_at, updated_at, raw_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        invoice.id, invoice.invoice_number, invoice.client_id, invoice.client_name, invoice.client_source, invoice.client_email, invoice.client_phone, invoice.client_address, invoice.issue_date, invoice.due_date, invoice.status, invoice.items, invoice.subtotal, invoice.tax_amount, invoice.tax_rate, invoice.discount, invoice.total_amount, invoice.paid_amount, invoice.balance_due, invoice.currency, invoice.project_id, invoice.project_title, invoice.project_ids, invoice.project_titles, invoice.quotation_id, invoice.quotation_number, invoice.language, invoice.notes, invoice.terms, invoice.bank_details, invoice.payment_history, invoice.public_token, invoice.legacy_public_url, invoice.created_at, invoice.updated_at, invoice.raw_data
      ).run();
      
      return createJsonResponse({ success: true, id: invoice.id });
    } catch (e: any) {
      console.error('[Invoice API] POST Error:', e);
      return createErrorResponse(e.message, 500);
    }
  }

  return createErrorResponse("Method not allowed", 405);
};
