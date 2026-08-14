import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import {
  getAllPrivateDeedsD1,
  createPrivateDeedD1
} from '../../../src/lib/d1PrivateDeedRepository';

export const onRequestGet = async (context: any) => {
  const { request, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const url = new URL(request.url);
    const year = url.searchParams.get('year') ? parseInt(url.searchParams.get('year')!, 10) : undefined;
    const month = url.searchParams.get('month') ? parseInt(url.searchParams.get('month')!, 10) : undefined;
    const type = url.searchParams.get('type') || undefined;
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : undefined;
    const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!, 10) : undefined;
    const search = url.searchParams.get('search') || url.searchParams.get('q') || undefined;
    const order = (url.searchParams.get('order') || 'desc').toLowerCase() as 'asc' | 'desc';

    const result = await getAllPrivateDeedsD1(db, { year, month, type, limit, offset, search, order });
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Private Deeds API] Error fetching private deeds:", error);
    return createErrorResponse(error?.message || "Failed to fetch private deeds", 500);
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
    const result = await createPrivateDeedD1(db, payload);
    return createJsonResponse(result, 201);
  } catch (error: any) {
    console.error("[CF Private Deeds API] Error creating private deed:", error);
    return createErrorResponse(error?.message || "Failed to create private deed", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
