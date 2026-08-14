import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import {
  getAllGeneralDocumentsD1,
  createGeneralDocumentD1
} from '../../../src/lib/d1GeneralDocumentRepository';

export const onRequestGet = async (context: any) => {
  const { request, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    let limit: number | undefined = undefined;
    if (limitParam !== null && limitParam !== undefined) {
      const lower = limitParam.toLowerCase();
      if (lower === 'all' || lower === '-1' || lower === '0' || lower === 'semua') {
        limit = -1;
      } else {
        const parsed = parseInt(limitParam, 10);
        limit = isNaN(parsed) ? 10 : parsed;
      }
    }
    const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!, 10) : 0;
    const search = url.searchParams.get('search') || url.searchParams.get('q') || undefined;
    const type = url.searchParams.get('type') || url.searchParams.get('docType') || undefined;
    const sortBy = url.searchParams.get('sortBy') || undefined;
    const order = (url.searchParams.get('order') || 'desc').toLowerCase() as 'asc' | 'desc';

    const result = await getAllGeneralDocumentsD1(db, { limit, offset, search, type, sortBy, order });
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF General Documents API] Error fetching general documents:", error);
    return createErrorResponse(error?.message || "Failed to fetch general documents", 500);
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
    const result = await createGeneralDocumentD1(db, payload);
    return createJsonResponse(result, 201);
  } catch (error: any) {
    console.error("[CF General Documents API] Error creating general document:", error);
    return createErrorResponse(error?.message || "Failed to create general document", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
