import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import { reconcileAllDeedsOrderNumbersD1 } from '../../../src/lib/d1DeedRepository';

export const onRequestPost = async (context: any) => {
  const { env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const result = await reconcileAllDeedsOrderNumbersD1(db);
    return createJsonResponse({ success: true, ...result });
  } catch (error: any) {
    console.error("[CF Deeds API] Error reconciling deed order numbers:", error);
    return createErrorResponse(error?.message || "Failed to reconcile deed order numbers", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
