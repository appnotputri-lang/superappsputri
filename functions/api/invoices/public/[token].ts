import { createJsonResponse, createErrorResponse, handleOptions } from '../../../../src/runtime';
import { mapRowToInvoice } from '../../../../src/lib/invoiceD1Adapter';

export const onRequest = async (context: any) => {
  const { request, env, params } = context;
  const db = env.DB;
  const token = params.token;
  const method = request.method;

  if (method === 'OPTIONS') return handleOptions();

  if (method === 'GET') {
    const res = await db.prepare(`SELECT * FROM invoices WHERE public_token = ? OR legacy_public_url LIKE ?`).bind(token, `%${token}%`).first();
    if (!res) return createErrorResponse("Invoice not found", 404);
    return createJsonResponse({ success: true, invoice: mapRowToInvoice(res) });
  }

  return createErrorResponse("Method not allowed", 405);
};
