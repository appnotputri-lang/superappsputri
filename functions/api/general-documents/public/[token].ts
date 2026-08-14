import { createJsonResponse, createErrorResponse, handleOptions } from '../../../../src/runtime';
import { getGeneralDocumentByPublicTokenD1 } from '../../../../src/lib/d1GeneralDocumentRepository';

export const onRequestGet = async (context: any) => {
  const { env, params } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const token = params.token as string;
    if (!token) {
      return createErrorResponse("Token is required", 400);
    }

    const document = await getGeneralDocumentByPublicTokenD1(db, token);
    if (!document) {
      return createErrorResponse(`Public document with token '${token}' not found.`, 404);
    }

    return createJsonResponse(document);
  } catch (error: any) {
    console.error("[CF General Documents API] Error fetching public document by token:", error);
    return createErrorResponse(error?.message || "Failed to fetch public document", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
