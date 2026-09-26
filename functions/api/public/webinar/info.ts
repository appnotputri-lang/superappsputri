import { createJsonResponse, createErrorResponse, handleOptions } from '../../../../src/runtime';
import { getWebinarPublicInfoD1 } from '../../../../src/lib/d1WebinarRepository';

export const onRequestGet = async (context: any) => {
  const { env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const info = await getWebinarPublicInfoD1(db, 'default');
    return createJsonResponse({
      success: true,
      settings: info.settings,
      materialUrl: info.materialUrl
    });
  } catch (error: any) {
    console.error("[CF Webinar Public API] Error fetching webinar info:", error);
    return createErrorResponse(error?.message || "Failed to fetch webinar info", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
