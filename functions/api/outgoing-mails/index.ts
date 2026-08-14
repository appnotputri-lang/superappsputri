import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import {
  getAllOutgoingMailsD1,
  createOutgoingMailD1
} from '../../../src/lib/d1OutgoingMailRepository';

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
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : undefined;
    const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!, 10) : undefined;
    const search = url.searchParams.get('search') || url.searchParams.get('q') || undefined;
    const order = (url.searchParams.get('order') || 'desc').toLowerCase() as 'asc' | 'desc';

    const result = await getAllOutgoingMailsD1(db, { year, month, limit, offset, search, order });
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Outgoing Mails API] Error fetching outgoing mails:", error);
    return createErrorResponse(error?.message || "Failed to fetch outgoing mails", 500);
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
    const result = await createOutgoingMailD1(db, payload);
    return createJsonResponse(result, 201);
  } catch (error: any) {
    console.error("[CF Outgoing Mails API] Error creating outgoing mail:", error);
    return createErrorResponse(error?.message || "Failed to create outgoing mail", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
