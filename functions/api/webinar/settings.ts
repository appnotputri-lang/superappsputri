import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import {
  getWebinarSettingsD1,
  updateWebinarSettingsD1
} from '../../../src/lib/d1WebinarRepository';

export const onRequestGet = async (context: any) => {
  const { request, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id') || 'default';
    const settings = await getWebinarSettingsD1(db, id);

    return createJsonResponse({
      success: true,
      settings
    });
  } catch (error: any) {
    console.error("[CF Webinar Settings API] Error fetching settings:", error);
    return createErrorResponse(error?.message || "Failed to fetch settings", 500);
  }
};

export const onRequestPut = async (context: any) => {
  const { request, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const body = await request.json();
    const id = body.id || 'default';
    const updated = await updateWebinarSettingsD1(db, id, body);

    return createJsonResponse({
      success: true,
      settings: updated
    });
  } catch (error: any) {
    console.error("[CF Webinar Update Settings API] Error:", error);
    return createErrorResponse(error?.message || "Failed to update settings", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
