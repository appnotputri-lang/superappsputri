import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import {
  getGeneralDocumentByIdD1,
  updateGeneralDocumentD1,
  deleteGeneralDocumentD1
} from '../../../src/lib/d1GeneralDocumentRepository';

export const onRequestGet = async (context: any) => {
  const { env, params } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const id = params.id as string;
    const document = await getGeneralDocumentByIdD1(db, id);
    if (!document) {
      return createErrorResponse(`General document with ID '${id}' not found.`, 404);
    }
    return createJsonResponse(document);
  } catch (error: any) {
    console.error("[CF General Documents API] Error fetching document by ID:", error);
    return createErrorResponse(error?.message || "Failed to fetch document", 500);
  }
};

export const onRequestPut = async (context: any) => {
  const { request, env, params } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const id = params.id as string;
    const payload = await request.json();
    const result = await updateGeneralDocumentD1(db, id, payload);
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF General Documents API] Error updating document:", error);
    return createErrorResponse(error?.message || "Failed to update document", 500);
  }
};

export const onRequestDelete = async (context: any) => {
  const { env, params } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const id = params.id as string;
    const result = await deleteGeneralDocumentD1(db, id);
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF General Documents API] Error deleting document:", error);
    return createErrorResponse(error?.message || "Failed to delete document", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
