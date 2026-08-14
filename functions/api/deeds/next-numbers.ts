import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import { fetchLatestDeedNumbersD1 } from '../../../src/lib/d1DeedRepository';

export const onRequestGet = async (context: any) => {
  const { request, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
    const result = await fetchLatestDeedNumbersD1(db, date);
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Deeds API] Error calculating next deed numbers:", error);
    return createErrorResponse(error?.message || "Failed to calculate next deed numbers", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
