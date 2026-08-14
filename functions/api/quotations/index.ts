import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import {
  getAllQuotationsD1,
  createQuotationD1
} from '../../../src/lib/d1QuotationRepository';

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

    const result = await getAllQuotationsD1(db, { limit, offset, search, status });
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Quotations API] Error fetching quotations:", error);
    return createErrorResponse(error?.message || "Failed to fetch quotations", 500);
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
    const result = await createQuotationD1(db, payload);
    return createJsonResponse(result, 201);
  } catch (error: any) {
    console.error("[CF Quotations API] Error creating quotation:", error);
    return createErrorResponse(error?.message || "Failed to create quotation", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
