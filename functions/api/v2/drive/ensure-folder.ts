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

  let { name, parentId } = body;
  if (!name || !parentId) {
    return createErrorResponse("Missing required fields: name, parentId", 400);
  }

  // Automatically map hardcoded placeholder ID or 'root' to the configured GOOGLE_DRIVE_REPORT_FOLDER_ID or GOOGLE_DRIVE_ROOT_FOLDER_ID
  if (parentId === '0B-My1uo45zLiMy11WVdHVFJ4RU0') {
    parentId = env.GOOGLE_DRIVE_REPORT_FOLDER_ID || env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '0B-My1uo45zLiMy11WVdHVFJ4RU0';
  } else if (parentId === 'root') {
    parentId = env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'root';
  }

  try {
    const q = `'${parentId}' in parents and name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const existing = await driveRest.listFiles(q, 'files(id, name, webViewLink)', 10, env);
    if (existing && existing.length > 0) {
      return createJsonResponse({ success: true, folder: existing[0] });
    }

    const created = await driveRest.createFolder(name, parentId, env);
    return createJsonResponse({ success: true, folder: created });
  } catch (error: any) {
    console.error("[Drive API] Error ensuring folder:", error);
    return createErrorResponse(error.message || "Failed to ensure folder", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
