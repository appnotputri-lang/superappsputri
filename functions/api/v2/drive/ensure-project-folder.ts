import { requireAuth } from '../../../_lib/authGuard';
import { DriveFolderService } from '../../../../src/services/DriveFolderService';
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

  const { project } = body;
  if (!project || (!project.id && !project.projectId) || !project.clientId) {
    return createErrorResponse("Missing valid project object", 400);
  }

  try {
    console.log(`[Drive API] Ensuring project folder for project ID: ${project.id || project.projectId}`);
    await DriveFolderService.handleNewProject(project, env);

    return createJsonResponse({ success: true, message: "Project folder ensured successfully" });
  } catch (error: any) {
    console.error("[Drive API] Error ensuring project folder:", error);
    return createErrorResponse(error.message || "Failed to ensure project folder", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
