import { createJsonResponse, createErrorResponse, handleOptions } from '../../../../src/runtime';
import { getInvoiceByPublicTokenD1 } from '../../../../src/lib/d1InvoiceRepository';

// This route was missing entirely — the frontend (PublicInvoiceViewer /
// InvoiceService.getInvoiceByPublicToken) has always called
// /api/invoices/public/{token}, but there was no functions/api/invoices/public/
// handler to serve it (only functions/api/invoices/[id].ts, which only
// matches the single-segment /api/invoices/{id} path). Every public invoice
// link — new short-token format or legacy /INV/{slug} format — was getting
// Cloudflare's own 404 before it ever reached our D1 lookup logic, no
// matter how correct that lookup logic was.
export const onRequestGet = async (context: any) => {
  const { env, params } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const token = params.token as string;
    if (!token) {
      return createErrorResponse("Token is required", 400);
    }

    const result = await getInvoiceByPublicTokenD1(db, token);
    if (!result.success) {
      return createErrorResponse(result.error || `Public invoice with token '${token}' not found.`, 404);
    }

    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Invoices API] Error fetching public invoice by token:", error);
    return createErrorResponse(error?.message || "Failed to fetch public invoice", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
