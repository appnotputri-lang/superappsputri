import { requireAuth } from '../../../../_lib/authGuard';
import { driveRest } from '../../../../../src/lib/drive-rest';
import { createErrorResponse, createJsonResponse, handleOptions } from '../../../../../src/runtime';

export const onRequestPost = async (context: any) => {
  const { request, env, params } = context;

  const authResult = await requireAuth(request, env);
  if (authResult instanceof Response) {
    return authResult;
  }

  const folderId = params.folderId;
  if (!folderId || typeof folderId !== 'string') {
    return createErrorResponse("Missing or invalid folderId parameter", 400);
  }

  try {
    await driveRest.trashFile(folderId, env);
    return createJsonResponse({ success: true });
  } catch (error: any) {
    console.error("[Drive API] Error trashing folder:", error);
    if (error.message && /404|not found/i.test(error.message)) {
      return createJsonResponse({ success: true, alreadyGone: true });
    }
    return createErrorResponse(error.message || "Failed to trash folder", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
