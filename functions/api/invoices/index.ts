import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import {
  getAllInvoicesD1,
  createInvoiceD1
} from '../../../src/lib/d1InvoiceRepository';

export const onRequestGet = async (context: any) => {
  const { request, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : undefined;
    const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!, 10) : undefined;
    const search = url.searchParams.get('search') || url.searchParams.get('q') || undefined;
    const status = url.searchParams.get('status') || undefined;

    const result = await getAllInvoicesD1(db, { limit, offset, search, status });
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Invoices API] Error fetching invoices:", error);
    return createErrorResponse(error?.message || "Failed to fetch invoices", 500);
  }
};

export const onRequestPost = async (context: any) => {
  const { request, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const payload = await request.json();
    const result = await createInvoiceD1(db, payload);
    return createJsonResponse(result, 201);
  } catch (error: any) {
    console.error("[CF Invoices API] Error creating invoice:", error);
    return createErrorResponse(error?.message || "Failed to create invoice", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
