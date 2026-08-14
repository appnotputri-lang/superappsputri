import { createJsonResponse, createErrorResponse, handleOptions } from '../../../../src/runtime';
import {
  getKbliMappingByIdD1,
  updateKbliMappingD1,
  deleteKbliMappingD1
} from '../../../../src/lib/d1KbliRepository';

export const onRequestGet = async (context: any) => {
  const { params, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const id = params.id;
    if (!id) {
      return createErrorResponse("Record ID is required", 400);
    }

    const result = await getKbliMappingByIdD1(db, id);
    if (!result.success) {
      return createErrorResponse(result.error || "Mapping record not found", 404);
    }
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF KBLI Mapping API] Error fetching mapping record by ID:", error);
    return createErrorResponse(error?.message || "Failed to fetch KBLI mapping record", 500);
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
      return createErrorResponse("Record ID is required", 400);
    }

    const payload = await request.json();
    const result = await updateKbliMappingD1(db, id, payload);
    if (!result.success) {
      return createErrorResponse((result as any).error || "Failed to update record", 404);
    }
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF KBLI Mapping API] Error updating mapping record:", error);
    return createErrorResponse(error?.message || "Failed to update KBLI mapping record", 500);
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
      return createErrorResponse("Record ID is required", 400);
    }

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
