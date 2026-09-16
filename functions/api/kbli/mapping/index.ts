import { createJsonResponse, createErrorResponse, handleOptions } from '../../../../src/runtime';
import {
  getAllKbliMappingD1,
  createKbliMappingD1,
  deleteKbliMappingD1
} from '../../../../src/lib/d1KbliRepository';

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

    const result = await getAllKbliMappingD1(db, { limit, offset, search });
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF KBLI Mapping API] Error fetching mapping records:", error);
    return createErrorResponse(error?.message || "Failed to fetch KBLI mapping records", 500);
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
    if (payload?.action === 'delete' && payload?.id) {
      const result = await deleteKbliMappingD1(db, payload.id);
      return createJsonResponse(result);
    }
    const result = await createKbliMappingD1(db, payload);
    return createJsonResponse(result, 201);
  } catch (error: any) {
    console.error("[CF KBLI Mapping API] Error creating/updating mapping record:", error);
    return createErrorResponse(error?.message || "Failed to save KBLI mapping record", 500);
  }
};

export const onRequestDelete = async (context: any) => {
  const { request, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const url = new URL(request.url);
    let id = url.searchParams.get('id');
    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch (_) {}
    }
    if (!id) {
      return createErrorResponse("Record ID is required for deletion.", 400);
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
