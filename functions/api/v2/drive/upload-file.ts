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

  let { fileName, mimeType, parentFolderId, base64 } = body;
  if (!fileName || !mimeType || !parentFolderId || !base64) {
    return createErrorResponse("Missing required fields", 400);
  }

  if (parentFolderId === '0B-My1uo45zLiMy11WVdHVFJ4RU0') {
    parentFolderId = env.GOOGLE_DRIVE_REPORT_FOLDER_ID || env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '0B-My1uo45zLiMy11WVdHVFJ4RU0';
  } else if (parentFolderId === 'root') {
    parentFolderId = env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'root';
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
