import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import {
  getDeedByIdD1,
  updateDeedD1,
  deleteDeedD1
} from '../../../src/lib/d1DeedRepository';

export const onRequestGet = async (context: any) => {
  const { env, params } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const id = params.id as string;
    const document = await getDeedByIdD1(db, id);
    if (!document) {
      return createErrorResponse(`Deed with ID '${id}' not found.`, 404);
    }
    return createJsonResponse(document);
  } catch (error: any) {
    console.error("[CF Deeds API] Error fetching deed by ID:", error);
    return createErrorResponse(error?.message || "Failed to fetch deed", 500);
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
    const result = await updateDeedD1(db, id, payload);
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Deeds API] Error updating deed:", error);
    return createErrorResponse(error?.message || "Failed to update deed", 500);
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
    const result = await deleteDeedD1(db, id);
    return createJsonResponse({ success: result });
  } catch (error: any) {
    console.error("[CF Deeds API] Error deleting deed:", error);
    return createErrorResponse(error?.message || "Failed to delete deed", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
