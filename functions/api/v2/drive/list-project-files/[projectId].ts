import { requireAuth } from '../../../../_lib/authGuard';
import { firestoreRest } from '../../../../../src/lib/firestore-rest';
import { driveRest } from '../../../../../src/lib/drive-rest';
import { createErrorResponse, createJsonResponse, handleOptions } from '../../../../../src/runtime';

export const onRequestGet = async (context: any) => {
  const { request, env, params } = context;

  // 1. Perform authentication
  const authResult = await requireAuth(request, env);
  if (authResult instanceof Response) {
    return authResult;
  }

  const projectId = params.projectId;
  if (!projectId) {
    return createErrorResponse("Missing projectId parameter", 400);
  }

  try {
    const project = await firestoreRest.getDocument("office_projects", String(projectId), env);
    if (!project) {
      return createErrorResponse("Project not found", 404);
    }

    const driveFolderId = project.metadata?.driveFolderId;
    if (!driveFolderId) {
      // Return empty files array if the folder doesn't exist yet
      return createJsonResponse({ success: true, files: [] });
    }

    const q = `'${driveFolderId}' in parents and trashed = false`;
    const fields = 'files(id, name, mimeType, size, modifiedTime, webViewLink, webContentLink, iconLink, parents)';
    const files = await driveRest.listFiles(q, fields, 1000, env);

    return createJsonResponse({ success: true, files });
  } catch (error: any) {
    console.error("[Drive API] Error listing project files:", error);
    return createErrorResponse(error.message || "Failed to list project files", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
