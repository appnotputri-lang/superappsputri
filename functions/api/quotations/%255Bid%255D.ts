import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import {
  getQuotationByIdD1,
  getQuotationByPublicTokenD1,
  updateQuotationD1,
  deleteQuotationD1
} from '../../../src/lib/d1QuotationRepository';

export const onRequestGet = async (context: any) => {
  const { params, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const idOrToken = params.id;
    // First, try getting by public token or ID
    const quotation = await getQuotationByPublicTokenD1(db, idOrToken);
    if (!quotation) {
      return createErrorResponse("Quotation not found", 404);
    }
    return createJsonResponse({ success: true, quotation });
  } catch (error: any) {
    console.error("[CF Quotations API] Error fetching quotation:", error);
    return createErrorResponse(error?.message || "Failed to fetch quotation", 500);
  }
};

export const onRequestPut = async (context: any) => {
  const { request, params, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const id = params.id;
    const payload = await request.json();
    const result = await updateQuotationD1(db, id, payload);
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Quotations API] Error updating quotation:", error);
    return createErrorResponse(error?.message || "Failed to update quotation", 500);
  }
};

export const onRequestDelete = async (context: any) => {
  const { params, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const id = params.id;
    const result = await deleteQuotationD1(db, id);
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Quotations API] Error deleting quotation:", error);
    return createErrorResponse(error?.message || "Failed to delete quotation", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
