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
    if (!id) {
      return createErrorResponse("Invoice ID is required", 400);
    }

    const result = await getInvoiceByIdD1(db, id);
    if (!result.success) {
      return createErrorResponse(result.error || "Invoice not found", 404);
    }

    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Invoices API] Error fetching invoice by ID:", error);
    return createErrorResponse(error?.message || "Failed to fetch invoice", 500);
  }
};

export const onRequestPut = async (context: any) => {
  const { params, request, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const id = params.id;
    if (!id) {
      return createErrorResponse("Invoice ID is required", 400);
    }

    const payload = await request.json();
    const result = await updateInvoiceD1(db, id, payload);
    if (!result.success) {
      return createErrorResponse(result.error || "Invoice not found", 404);
    }

    return createJsonResponse(result);
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
    if (!id) {
      return createErrorResponse("Invoice ID is required", 400);
    }

    const result = await deleteInvoiceD1(db, id);
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Invoices API] Error deleting invoice:", error);
    return createErrorResponse(error?.message || "Failed to delete invoice", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
