import { firestoreRest } from '../../src/lib/firestore-rest';
import { driveRest } from '../../src/lib/drive-rest';
import { DriveFolderService } from '../../src/services/DriveFolderService';
import { createErrorResponse, createJsonResponse, handleOptions } from '../../src/runtime';

export const onRequestPost = async (context: any) => {
  const { request, env } = context;

  let body: any;
  try {
    body = await request.json();
  } catch (err) {
    return createErrorResponse('Invalid JSON body', 400);
  }

  const { projectId, name, fileName, fileType, base64, uploadedBy } = body;

  if (!projectId || !name || !fileName || !fileType || !base64) {
    return createErrorResponse('Missing required fields: projectId, name, fileName, fileType, base64', 400);
  }

  try {
    // 1. Get project document from Firestore REST
    const project = await firestoreRest.getDocument("office_projects", projectId, env);
    if (!project) {
      return createErrorResponse('Project not found', 404);
    }

    // 2. Ensure Google Drive folders exist on-demand
    let driveFolderId = project.metadata?.driveFolderId;
    if (!driveFolderId) {
      console.log(`[Upload API] Project ${projectId} does not have a Google Drive folder. Creating on-demand...`);
      await DriveFolderService.handleNewProject(project, env);
      
      // Fetch the updated project to get the newly created driveFolderId
      const updatedProject = await firestoreRest.getDocument("office_projects", projectId, env);
      driveFolderId = updatedProject?.metadata?.driveFolderId;
      
      if (!driveFolderId) {
        throw new Error("Failed to ensure Google Drive folder for this project. Please check service account configuration.");
      }
    }

    // 3. Upload file to Google Drive
    console.log(`[Upload API] Uploading ${fileName} (${fileType}) to Google Drive folder: ${driveFolderId}...`);
    const uploadResult = await driveRest.uploadFile(fileName, fileType, driveFolderId, base64, env);
    const driveFileUrl = uploadResult.webViewLink;

    if (!driveFileUrl) {
      throw new Error("Google Drive did not return a webViewLink.");
    }

    // 4. Save metadata back to Firestore documents subcollection for this project
    const docId = crypto.randomUUID();
    const now = new Date();
    
    const newDoc = {
      id: docId,
      name: name,
      type: fileName.split('.').pop() || 'other',
      url: driveFileUrl,
      uploadedBy: uploadedBy || "staff_notaris",
      uploadedAt: now.toISOString()
    };

    console.log(`[Upload API] Registering document ${docId} in Firestore...`);
    await firestoreRest.setDocument("office_projects", `${projectId}/documents/${docId}`, newDoc, env);

    // 5. Add a timeline entry for auditing
    const timelineId = crypto.randomUUID();
    const timelineDoc = {
      id: timelineId,
      title: "Dokumen Administrasi Diunggah",
      description: `Dokumen "${name}" (${fileName}) berhasil diunggah ke Google Drive.`,
      createdBy: uploadedBy || "staff_notaris",
      createdAt: now.toISOString()
    };
    await firestoreRest.setDocument("office_projects", `${projectId}/timelines/${timelineId}`, timelineDoc, env);

    return createJsonResponse({ success: true, document: newDoc });
  } catch (error: any) {
    console.error("[Upload API] Error uploading document:", error);
    return createErrorResponse(error.message || "Failed to upload document", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
