import { createJsonResponse, createErrorResponse, handleOptions } from '../../../../src/runtime';
import {
  getInvoiceByPublicTokenD1
} from '../../../../src/lib/d1InvoiceRepository';

export const onRequestGet = async (context: any) => {
  const { params, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const token = params.token;
    if (!token) {
      return createErrorResponse("Token is required", 400);
    }

    const result = await getInvoiceByPublicTokenD1(db, token);
    if (!result.success) {
      return createErrorResponse(result.error || "Invoice not found", 404);
    }

    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Invoices API] Error fetching invoice by public token:", error);
    return createErrorResponse(error?.message || "Failed to fetch invoice", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
