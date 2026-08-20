import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import { savePushSubscriptionD1, deletePushSubscriptionD1 } from '../../../src/lib/d1PushSubscriptionRepository';
import { requireAuth } from '../../_lib/authGuard';

export const onRequestPost = async (context: any) => {
  const { request, env } = context;
  const db = env?.DB;

  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  // 1. Authenticate user from Firebase ID Token (Bearer Token)
  const authResult = await requireAuth(request, env);
  if (authResult instanceof Response) {
    return authResult;
  }

  const authenticatedUid = authResult.user.uid;
  if (!authenticatedUid) {
    return createErrorResponse("Unauthorized: Missing valid user ID in token", 401);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { subscription, platform, userAgent } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return createErrorResponse("Valid push subscription object with keys (p256dh, auth) is required", 400);
    }

    const result = await savePushSubscriptionD1(db, {
      userId: authenticatedUid,
      subscription,
      platform: platform || 'Web',
      userAgent: userAgent || ''
    });

    return createJsonResponse(result, 201);
  } catch (error: any) {
    console.error("[CF Push API] Error saving subscription:", error);
    return createErrorResponse(error?.message || "Failed to save push subscription", 500);
  }
};

export const onRequestDelete = async (context: any) => {
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
    let endpoint = url.searchParams.get('endpoint') || undefined;

    if (!endpoint) {
      const body = await request.json().catch(() => ({}));
      endpoint = body.endpoint;
    }

    if (!endpoint) {
      return createErrorResponse("endpoint is required to unsubscribe", 400);
    }

    const result = await deletePushSubscriptionD1(db, { userId: authenticatedUid, endpoint });
    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Push API] Error deleting subscription:", error);
    return createErrorResponse(error?.message || "Failed to delete push subscription", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
