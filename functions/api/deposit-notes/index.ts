import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import {
  getAllDepositNotesD1,
  createDepositNoteD1
} from '../../../src/lib/d1DepositNoteRepository';

export const onRequestGet = async (context: any) => {
  const { request, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : 20;
    const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!, 10) : 0;
    const search = url.searchParams.get('search') || url.searchParams.get('q') || undefined;
    const clientId = url.searchParams.get('clientId') || undefined;

    const result = await getAllDepositNotesD1(db, { limit, offset, search, clientId });
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Deposit Notes API] Error fetching deposit notes:", error);
    return createErrorResponse(error?.message || "Failed to fetch deposit notes", 500);
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
    const result = await createDepositNoteD1(db, payload);
    return createJsonResponse(result, 201);
  } catch (error: any) {
    console.error("[CF Deposit Notes API] Error creating deposit note:", error);
    return createErrorResponse(error?.message || "Failed to create deposit note", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
