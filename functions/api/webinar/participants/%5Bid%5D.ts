import { createJsonResponse, createErrorResponse, handleOptions } from '../../../../src/runtime';
import {
  getWebinarParticipantByIdD1,
  updateWebinarParticipantD1,
  deleteWebinarParticipantD1
} from '../../../../src/lib/d1WebinarRepository';

export const onRequestGet = async (context: any) => {
  const { params, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  const id = params.id;
  try {
    const participant = await getWebinarParticipantByIdD1(db, id);
    if (!participant) {
      return createErrorResponse("Participant not found", 404);
    }
    return createJsonResponse({ success: true, participant });
  } catch (error: any) {
    return createErrorResponse(error?.message || "Failed to fetch participant", 500);
  }
};

export const onRequestPatch = async (context: any) => {
  const { params, request, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  const id = params.id;
  try {
    const body = await request.json();
    const updated = await updateWebinarParticipantD1(db, id, body);
    if (!updated) {
      return createErrorResponse("Participant not found", 404);
    }
    return createJsonResponse({ success: true, participant: updated });
  } catch (error: any) {
    return createErrorResponse(error?.message || "Failed to update participant", 500);
  }
};

export const onRequestDelete = async (context: any) => {
  const { params, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  const id = params.id;
  try {
    const success = await deleteWebinarParticipantD1(db, id);
    return createJsonResponse({ success });
  } catch (error: any) {
    return createErrorResponse(error?.message || "Failed to delete participant", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
