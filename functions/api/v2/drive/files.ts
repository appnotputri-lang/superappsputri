import { requireAuth } from '../../../_lib/authGuard';
import { driveRest } from '../../../../src/lib/drive-rest';
import { createErrorResponse, createJsonResponse, handleOptions } from '../../../../src/runtime';

export const onRequestGet = async (context: any) => {
  const { request, env } = context;

  // 1. Perform authentication
  const authResult = await requireAuth(request, env);
  if (authResult instanceof Response) {
    return authResult;
  }

  const urlObj = new URL(request.url);
  let q = urlObj.searchParams.get('q') || '';
  const fields = urlObj.searchParams.get('fields') || 'files(id, name, webViewLink)';

  // Automatically map hardcoded placeholder ID to the configured GOOGLE_DRIVE_REPORT_FOLDER_ID or GOOGLE_DRIVE_ROOT_FOLDER_ID
  const placeholderId = '0B-My1uo45zLiMy11WVdHVFJ4RU0';
  if (q.includes(placeholderId)) {
    const actualReportId = env.GOOGLE_DRIVE_REPORT_FOLDER_ID || env.GOOGLE_DRIVE_ROOT_FOLDER_ID || placeholderId;
    q = q.replace(new RegExp(placeholderId, 'g'), actualReportId);
  } else if (q.includes("'root' in parents") && env.GOOGLE_DRIVE_ROOT_FOLDER_ID) {
    const actualRootId = env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    q = q.replace(/'root' in parents/g, `'${actualRootId}' in parents`);
  }

  try {
    const files = await driveRest.listFiles(q, fields, 1000, env);
    return createJsonResponse({ success: true, files });
  } catch (error: any) {
    console.error("[Drive API] Error listing files:", error);
    return createErrorResponse(error.message || "Failed to list files", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
