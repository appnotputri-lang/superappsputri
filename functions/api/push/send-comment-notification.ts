import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import { sendProjectCommentPushNotification } from '../../../src/services/pushBackend';
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

  try {
    const payload = await request.json().catch(() => ({}));
    const { projectId, commentId } = payload;

    if (!projectId || !commentId) {
      return createErrorResponse("projectId and commentId are required", 400);
    }

    const result = await sendProjectCommentPushNotification(
      {
        projectId,
        commentId,
        authenticatedUserId: authenticatedUid
      },
      env,
      db
    );

    if (!result.success) {
      return createErrorResponse(result.message || result.error || "Failed to process push notification", 400);
    }

    return createJsonResponse(result);
  } catch (error: any) {
    console.error("[CF Push API] Error sending project comment push notification:", error);
    return createErrorResponse(error?.message || "Failed to dispatch push notification", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
