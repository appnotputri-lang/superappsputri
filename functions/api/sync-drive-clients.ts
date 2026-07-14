import { requireAuth } from '../_lib/authGuard';
import { driveRest } from '../../src/lib/drive-rest';
import { firestoreRest } from '../../src/lib/firestore-rest';
import { DriveFolderService } from '../../src/services/DriveFolderService';
import { getEnv, createErrorResponse, createJsonResponse, handleOptions } from '../../src/runtime';

export const onRequestPost = async (context: any) => {
  const { request, env } = context;

  // 1. Perform authentication
  const authResult = await requireAuth(request, env);
  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const rootFolderId = getEnv(env, 'GOOGLE_DRIVE_ROOT_FOLDER_ID');
    if (!rootFolderId) {
      return createErrorResponse("GOOGLE_DRIVE_ROOT_FOLDER_ID is not configured in settings.", 500);
    }

    console.log(`[Sync Drive Clients] Listing folders from Google Drive root: ${rootFolderId}...`);
    const q = `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const allFolders = await driveRest.listFiles(q, 'files(id, name, webViewLink)', 1000, env);

    // Filter folders starting with "PT " (case-insensitive) or "PT."
    const ptFolders = allFolders.filter(folder => {
      const name = folder.name || '';
      const upperName = name.toUpperCase().trim();
      return upperName.startsWith("PT ") || upperName.startsWith("PT.");
    });

    console.log(`[Sync Drive Clients] Found ${ptFolders.length} folders starting with "PT" prefix.`);

    // Fetch existing clients (profiles collection)
    const { documents: existingProfiles } = await firestoreRest.listDocuments("profiles", 500, undefined, env);
    
    // Use DriveFolderService.normalizeCompanyName to get a set of existing normalized names
    const existingNormalizedNames = new Set(
      existingProfiles.map(p => {
        const name = p.companyName || '';
        return DriveFolderService.normalizeCompanyName(name);
      })
    );

    const createdClients: string[] = [];

    // Iterate through folders and create missing clients
    for (const folder of ptFolders) {
      const folderName = folder.name.trim();
      const normFolderName = DriveFolderService.normalizeCompanyName(folderName);

      if (!existingNormalizedNames.has(normFolderName)) {
        const newId = crypto.randomUUID();
        
        // Pre-fill only companyName (Nama Perseroan) and basic default values
        const newProfile = {
          id: newId,
          companyName: folderName,
          companyType: 'SWASTA NASIONAL',
          documentType: 'CIRCULAR',
          duration: 'TIDAK TERBATAS',
          status: 'tertutup',
          kbliItems: [],
          oldManagementItems: [],
          newManagementItems: [],
          shareholders: [],
          shareTransfers: [],
          finalShareholders: [],
          guests: [],
          managementDismissals: [],
          shareTransfersNew: [],
          capitalSubscriptionsNew: [],
          updatedAt: new Date().toISOString(),
          updatedBy: authResult.user?.email || 'System (Drive Sync)'
        };

        console.log(`[Sync Drive Clients] Creating new client profile: ${folderName}`);
        await firestoreRest.setDocument("profiles", newId, newProfile, env);
        createdClients.push(folderName);
        
        // Add to set to prevent duplicate creation if there are multiple duplicate folder names in response
        existingNormalizedNames.add(normFolderName);
      }
    }

    return createJsonResponse({
      success: true,
      ptFoldersCount: ptFolders.length,
      createdClients,
      createdCount: createdClients.length
    });

  } catch (error: any) {
    console.error("[Sync Drive Clients] Error matching & syncing clients:", error);
    return createErrorResponse(error.message || "Failed to sync drive clients", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
