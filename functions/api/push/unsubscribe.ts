import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import { deletePushSubscriptionD1 } from '../../../src/lib/d1PushSubscriptionRepository';
import { requireAuth } from '../../_lib/authGuard';

export const onRequestPost = async (context: any) => {
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
    const body = await request.json().catch(() => ({}));
    const { endpoint } = body;

    if (!endpoint) {
      return createErrorResponse("endpoint is required to unsubscribe", 400);
    }

    const result = await deletePushSubscriptionD1(db, { userId: authenticatedUid, endpoint });
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Push API] Error unsubscribing:", error);
    return createErrorResponse(error?.message || "Failed to unsubscribe", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
