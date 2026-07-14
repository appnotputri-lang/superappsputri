import { requireAuth } from '../../../../_lib/authGuard';
import { driveRest } from '../../../../../src/lib/drive-rest';
import { createErrorResponse, createJsonResponse, handleOptions } from '../../../../../src/runtime';

export const onRequestDelete = async (context: any) => {
  const { request, env, params } = context;

  // 1. Perform authentication
  const authResult = await requireAuth(request, env);
  if (authResult instanceof Response) {
    return authResult;
  }

  const fileId = params.fileId;
  if (!fileId || typeof fileId !== 'string') {
    return createErrorResponse("Missing or invalid fileId parameter", 400);
  }

  try {
    await driveRest.deleteFile(fileId, env);
    return createJsonResponse({ success: true });
  } catch (error: any) {
    console.error("[Drive API] Error deleting file:", error);
    return createErrorResponse(error.message || "Failed to delete file", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
