import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import { fetchNextDepositNumberD1 } from '../../../src/lib/d1DepositNoteRepository';

export const onRequestGet = async (context: any) => {
  const { request, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const url = new URL(request.url);
    const yearParam = url.searchParams.get('year');
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

    const result = await fetchNextDepositNumberD1(db, year);
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Deposit Notes API] Error fetching next deposit number:", error);
    return createErrorResponse(error?.message || "Failed to fetch next deposit number", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
