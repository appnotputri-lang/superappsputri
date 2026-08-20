import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import { sendTestPushNotification } from '../../../src/services/pushBackend';
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

  const authenticatedUid = authResult.user?.uid;
  if (!authenticatedUid) {
    return createErrorResponse("Unauthorized: Missing valid user ID in token", 401);
  }

  try {
    const result = await sendTestPushNotification(
      {
        userId: authenticatedUid,
        userName: authResult.user?.name || authResult.user?.email || 'Pengguna'
      },
      env,
      db
    );

    if (!result.success && result.subscriptionsFound === 0) {
      return createJsonResponse(result, 404);
    }

    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Push API] Error sending test push notification:", error);
    return createErrorResponse(error?.message || "Failed to dispatch test notification", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
