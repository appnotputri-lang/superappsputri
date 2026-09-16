import { createJsonResponse, createErrorResponse, handleOptions } from '../../../../src/runtime';
import {
  getAllKbliSuggestionsD1,
  createKbliSuggestionD1,
  deleteKbliSuggestionD1
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

    const result = await getAllKbliSuggestionsD1(db, { limit, offset, search });
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF KBLI Suggestions API] Error fetching suggestion records:", error);
    return createErrorResponse(error?.message || "Failed to fetch KBLI suggestion records", 500);
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
      const result = await deleteKbliSuggestionD1(db, payload.id);
      return createJsonResponse(result);
    }
    const result = await createKbliSuggestionD1(db, payload);
    return createJsonResponse(result, 201);
  } catch (error: any) {
    console.error("[CF KBLI Suggestions API] Error creating/updating suggestion record:", error);
    return createErrorResponse(error?.message || "Failed to save KBLI suggestion record", 500);
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
