import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import {
  getIncomingMailByIdD1,
  updateIncomingMailD1,
  deleteIncomingMailD1
} from '../../../src/lib/d1IncomingMailRepository';

export const onRequestGet = async (context: any) => {
  const { env, params } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const id = params.id as string;
    const document = await getIncomingMailByIdD1(db, id);
    if (!document) {
      return createErrorResponse(`Incoming mail with ID '${id}' not found.`, 404);
    }
    return createJsonResponse(document);
  } catch (error: any) {
    console.error("[CF Incoming Mails API] Error fetching incoming mail by ID:", error);
    return createErrorResponse(error?.message || "Failed to fetch incoming mail", 500);
  }
};

export const onRequestPut = async (context: any) => {
  const { request, env, params } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const id = params.id as string;
    const payload = await request.json();
    const result = await updateIncomingMailD1(db, id, payload);
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Incoming Mails API] Error updating incoming mail:", error);
    return createErrorResponse(error?.message || "Failed to update incoming mail", 500);
  }
};

export const onRequestDelete = async (context: any) => {
  const { env, params } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const id = params.id as string;
    const result = await deleteIncomingMailD1(db, id);
    return createJsonResponse({ success: result });
  } catch (error: any) {
    console.error("[CF Incoming Mails API] Error deleting incoming mail:", error);
    return createErrorResponse(error?.message || "Failed to delete incoming mail", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
