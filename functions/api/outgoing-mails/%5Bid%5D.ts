import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import {
  getOutgoingMailByIdD1,
  updateOutgoingMailD1,
  deleteOutgoingMailD1
} from '../../../src/lib/d1OutgoingMailRepository';

export const onRequestGet = async (context: any) => {
  const { env, params } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const id = params.id as string;
    const document = await getOutgoingMailByIdD1(db, id);
    if (!document) {
      return createErrorResponse(`Outgoing mail with ID '${id}' not found.`, 404);
    }
    return createJsonResponse(document);
  } catch (error: any) {
    console.error("[CF Outgoing Mails API] Error fetching outgoing mail by ID:", error);
    return createErrorResponse(error?.message || "Failed to fetch outgoing mail", 500);
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
    const result = await updateOutgoingMailD1(db, id, payload);
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Outgoing Mails API] Error updating outgoing mail:", error);
    return createErrorResponse(error?.message || "Failed to update outgoing mail", 500);
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
    const result = await deleteOutgoingMailD1(db, id);
    return createJsonResponse({ success: result });
  } catch (error: any) {
    console.error("[CF Outgoing Mails API] Error deleting outgoing mail:", error);
    return createErrorResponse(error?.message || "Failed to delete outgoing mail", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
