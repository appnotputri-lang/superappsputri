import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import {
  getPrivateDeedByIdD1,
  updatePrivateDeedD1,
  deletePrivateDeedD1
} from '../../../src/lib/d1PrivateDeedRepository';

export const onRequestGet = async (context: any) => {
  const { env, params } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const id = params.id as string;
    const document = await getPrivateDeedByIdD1(db, id);
    if (!document) {
      return createErrorResponse(`Private deed with ID '${id}' not found.`, 404);
    }
    return createJsonResponse(document);
  } catch (error: any) {
    console.error("[CF Private Deeds API] Error fetching private deed by ID:", error);
    return createErrorResponse(error?.message || "Failed to fetch private deed", 500);
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
    const result = await updatePrivateDeedD1(db, id, payload);
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Private Deeds API] Error updating private deed:", error);
    return createErrorResponse(error?.message || "Failed to update private deed", 500);
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
    const result = await deletePrivateDeedD1(db, id);
    return createJsonResponse({ success: result });
  } catch (error: any) {
    console.error("[CF Private Deeds API] Error deleting private deed:", error);
    return createErrorResponse(error?.message || "Failed to delete private deed", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
