import { createJsonResponse, createErrorResponse, handleOptions } from '../../../../src/runtime';
import {
  getKbliSuggestionByIdD1,
  updateKbliSuggestionD1,
  deleteKbliSuggestionD1
} from '../../../../src/lib/d1KbliRepository';

export const onRequestGet = async (context: any) => {
  const { env, params } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const id = params.id as string;
    const result = await getKbliSuggestionByIdD1(db, id);
    if (!result || !result.success) {
      return createErrorResponse(`Saran KBLI dengan ID '${id}' tidak ditemukan.`, 404);
    }
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF KBLI Suggestions API] Error fetching suggestion record by ID:", error);
    return createErrorResponse(error?.message || "Failed to fetch KBLI suggestion record", 500);
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
    const result = await updateKbliSuggestionD1(db, id, payload);
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF KBLI Suggestions API] Error updating suggestion record:", error);
    return createErrorResponse(error?.message || "Failed to update KBLI suggestion record", 500);
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
    const result = await deleteKbliSuggestionD1(db, id);
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF KBLI Suggestions API] Error deleting suggestion record:", error);
    return createErrorResponse(error?.message || "Failed to delete KBLI suggestion record", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
