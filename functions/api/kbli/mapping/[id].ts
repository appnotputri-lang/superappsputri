import { createJsonResponse, createErrorResponse, handleOptions } from '../../../../src/runtime';
import {
  getKbliMappingByIdD1,
  updateKbliMappingD1,
  deleteKbliMappingD1
} from '../../../../src/lib/d1KbliRepository';

export const onRequestGet = async (context: any) => {
  const { env, params } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const id = params.id as string;
    const result = await getKbliMappingByIdD1(db, id);
    if (!result || !result.success) {
      return createErrorResponse(`Pemetaan KBLI dengan ID '${id}' tidak ditemukan.`, 404);
    }
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF KBLI Mapping API] Error fetching mapping record by ID:", error);
    return createErrorResponse(error?.message || "Failed to fetch KBLI mapping record", 500);
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
    const result = await updateKbliMappingD1(db, id, payload);
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF KBLI Mapping API] Error updating mapping record:", error);
    return createErrorResponse(error?.message || "Failed to update KBLI mapping record", 500);
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
    const result = await deleteKbliMappingD1(db, id);
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF KBLI Mapping API] Error deleting mapping record:", error);
    return createErrorResponse(error?.message || "Failed to delete KBLI mapping record", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
