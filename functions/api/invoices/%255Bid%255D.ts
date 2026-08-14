import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import {
  getInvoiceByIdD1,
  updateInvoiceD1,
  deleteInvoiceD1
} from '../../../src/lib/d1InvoiceRepository';

export const onRequestGet = async (context: any) => {
  const { params, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const id = params.id;
    const res = await getInvoiceByIdD1(db, id);
    if (!res.success) {
      return createErrorResponse(res.error || "Invoice not found", 404);
    }
    return createJsonResponse(res);
  } catch (error: any) {
    console.error("[CF Invoices API] Error fetching invoice:", error);
    return createErrorResponse(error?.message || "Failed to fetch invoice", 500);
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
    const res = await updateInvoiceD1(db, id, payload);
    return createJsonResponse(res);
  } catch (error: any) {
    console.error("[CF Invoices API] Error updating invoice:", error);
    return createErrorResponse(error?.message || "Failed to update invoice", 500);
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
    const res = await deleteInvoiceD1(db, id);
    return createJsonResponse(res);
  } catch (error: any) {
    console.error("[CF Invoices API] Error deleting invoice:", error);
    return createErrorResponse(error?.message || "Failed to delete invoice", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
