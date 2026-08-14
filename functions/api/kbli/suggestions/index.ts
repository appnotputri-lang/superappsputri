import { createJsonResponse, createErrorResponse, handleOptions } from '../../../../src/runtime';
import {
  getAllKbliSuggestionsD1,
  createKbliSuggestionD1
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
    const result = await createKbliSuggestionD1(db, payload);
    return createJsonResponse(result, 201);
  } catch (error: any) {
    console.error("[CF KBLI Suggestions API] Error creating suggestion record:", error);
    return createErrorResponse(error?.message || "Failed to create KBLI suggestion record", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
