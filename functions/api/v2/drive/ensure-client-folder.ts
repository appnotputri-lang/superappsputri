import { requireAuth } from '../../../_lib/authGuard';
import { DriveFolderService } from '../../../../src/services/DriveFolderService';
import { firestoreRest } from '../../../../src/lib/firestore-rest';
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

  const { clientId, companyName } = body;
  if (!clientId || !companyName) {
    return createErrorResponse("Missing clientId or companyName", 400);
  }

  try {
    console.log(`[Drive API] Ensuring client folder for: ${companyName}`);
    const companyFolder = await DriveFolderService.ensureCompanyFolder(companyName, env);
    
    // Save driveFolderId and driveFolderUrl into the client document
    await firestoreRest.updateDocument('profiles', clientId, {
      driveFolderId: companyFolder.folderId,
      driveFolderUrl: companyFolder.folderUrl
    }, env);

    return createJsonResponse({ success: true, folderId: companyFolder.folderId, folderUrl: companyFolder.folderUrl });
  } catch (error: any) {
    console.error("[Drive API] Error ensuring client folder:", error);
    return createErrorResponse(error.message || "Failed to ensure client folder", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
