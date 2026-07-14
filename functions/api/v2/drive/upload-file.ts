import { requireAuth } from '../../../_lib/authGuard';
import { driveRest } from '../../../../src/lib/drive-rest';
import { createErrorResponse, createJsonResponse, handleOptions } from '../../../../src/runtime';

export const onRequestPost = async (context: any) => {
  const { request, env } = context;

  // 1. Perform authentication
  const authResult = await requireAuth(request, env);
  if (authResult instanceof Response) {
    return authResult;
  }

  let body: any;
  try {
    body = await request.json();
  } catch (err) {
    return createErrorResponse('Invalid JSON body', 400);
  }

  const { fileName, mimeType, parentFolderId, base64 } = body;
  if (!fileName || !mimeType || !parentFolderId || !base64) {
    return createErrorResponse("Missing required fields", 400);
  }

  try {
    const result = await driveRest.uploadFile(fileName, mimeType, parentFolderId, base64, env);
    return createJsonResponse({ success: true, file: result });
  } catch (error: any) {
    console.error("[Drive API] Error uploading file:", error);
    return createErrorResponse(error.message || "Failed to upload file", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
