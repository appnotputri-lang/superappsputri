import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import { mapRowToInvoice, mapInvoiceToRow } from '../../../src/lib/invoiceD1Adapter';

export const onRequest = async (context: any) => {
  const { request, env, params } = context;
  const db = env.DB;
  const id = params.id;
  const method = request.method;

  if (method === 'OPTIONS') return handleOptions();

  if (method === 'GET') {
    const res = await db.prepare(`SELECT * FROM invoices WHERE id = ?`).bind(id).first();
    if (!res) return createErrorResponse("Invoice not found", 404);
    return createJsonResponse({ success: true, invoice: mapRowToInvoice(res) });
  }

  if (method === 'PUT') {
    const body = await request.json();
    body.updatedAt = new Date().toISOString();
    const invoice = mapInvoiceToRow({ ...body, id });
    
    await db.prepare(`
        UPDATE invoices SET 
        invoice_number = ?, client_id = ?, client_name = ?, client_source = ?, client_email = ?, client_phone = ?, client_address = ?, issue_date = ?, due_date = ?, status = ?, items = ?, subtotal = ?, tax_amount = ?, tax_rate = ?, discount = ?, total_amount = ?, paid_amount = ?, balance_due = ?, currency = ?, project_id = ?, project_title = ?, project_ids = ?, project_titles = ?, quotation_id = ?, quotation_number = ?, language = ?, notes = ?, terms = ?, bank_details = ?, payment_history = ?, public_token = ?, legacy_public_url = ?, updated_at = ?, raw_data = ?
        WHERE id = ?
    `).bind(
        invoice.invoice_number, invoice.client_id, invoice.client_name, invoice.client_source, invoice.client_email, invoice.client_phone, invoice.client_address, invoice.issue_date, invoice.due_date, invoice.status, invoice.items, invoice.subtotal, invoice.tax_amount, invoice.tax_rate, invoice.discount, invoice.total_amount, invoice.paid_amount, invoice.balance_due, invoice.currency, invoice.project_id, invoice.project_title, invoice.project_ids, invoice.project_titles, invoice.quotation_id, invoice.quotation_number, invoice.language, invoice.notes, invoice.terms, invoice.bank_details, invoice.payment_history, invoice.public_token, invoice.legacy_public_url, invoice.updated_at, invoice.raw_data, id
    ).run();
    return createJsonResponse({ success: true });
  }

  if (method === 'DELETE') {
    await db.prepare(`DELETE FROM invoices WHERE id = ?`).bind(id).run();
    return createJsonResponse({ success: true });
  }

  return createErrorResponse("Method not allowed", 405);
};
