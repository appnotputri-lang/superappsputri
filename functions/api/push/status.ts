import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import { getPushSubscriptionStatusD1 } from '../../../src/lib/d1PushSubscriptionRepository';
import { requireAuth } from '../../_lib/authGuard';

export const onRequestGet = async (context: any) => {
  const { request, env } = context;
  const db = env?.DB;

  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  const authResult = await requireAuth(request, env);
  if (authResult instanceof Response) {
    return authResult;
  }

  const authenticatedUid = authResult.user.uid;

  try {
    const url = new URL(request.url);
    const endpoint = url.searchParams.get('endpoint') || undefined;

    const result = await getPushSubscriptionStatusD1(db, { userId: authenticatedUid, endpoint });
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Push API] Error checking push status:", error);
    return createErrorResponse(error?.message || "Failed to check push status", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
