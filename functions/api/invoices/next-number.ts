import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import { fetchNextInvoiceNumberD1 } from '../../../src/lib/d1InvoiceRepository';

export const onRequestGet = async (context: any) => {
  const { request, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const url = new URL(request.url);
    const yearParam = url.searchParams.get('year');
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
    if (isNaN(year)) {
      return createErrorResponse("Invalid year parameter.", 400);
    }
    const result = await fetchNextInvoiceNumberD1(db, year);
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Invoices API] Error calculating next invoice number:", error);
    return createErrorResponse(error?.message || "Failed to calculate next invoice number", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
