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

    console.log(`[Sync Drive Clients] Ensuring COMPANY PROFILE folder exists...`);
    const companyProfileId = await DriveFolderService.getOrCreateFolderByName("COMPANY PROFILE", rootFolderId, env);
    
    const typeFoldersMapping = [
      { folder: 'PT', type: 'PT' },
      { folder: 'CV', type: 'CV' },
      { folder: 'YAYASAN', type: 'YAYASAN' },
      { folder: 'PERKUMPULAN', type: 'PERKUMPULAN' },
      { folder: 'KOPERASI', type: 'KOPERASI' },
      { folder: 'PERSEKUTUAN FIRMA', type: 'FIRMA' },
      { folder: 'PERSEKUTUAN PERDATA', type: 'PERDATA' }
    ];

    let allFolders: any[] = [];
    for (const mapping of typeFoldersMapping) {
      console.log(`[Sync Drive Clients] Syncing type: ${mapping.type} from folder: ${mapping.folder}`);
      const typeFolderId = await DriveFolderService.getOrCreateFolderByName(mapping.folder, companyProfileId, env);
      const q = `'${typeFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const folders = await driveRest.listFiles(q, 'files(id, name, webViewLink)', 1000, env);
      allFolders.push(...folders.map(f => ({ ...f, clientType: mapping.type })));
    }

    console.log(`[Sync Drive Clients] Found total ${allFolders.length} folders across all types.`);

    // Fetch existing clients (profiles collection)
    const { documents: existingProfiles } = await firestoreRest.listDocuments("profiles", 1000, undefined, env);
    
    // Use DriveFolderService.normalizeCompanyName to get a set of existing normalized names
    const existingNormalizedNames = new Set(
      existingProfiles.map(p => {
        const name = p.companyName || '';
        return DriveFolderService.normalizeCompanyName(name);
      })
    );

    const createdClients: string[] = [];

    // Iterate through folders and create missing clients
    for (const folder of allFolders) {
      const folderName = folder.name.trim();
      const normFolderName = DriveFolderService.normalizeCompanyName(folderName);

      if (!existingNormalizedNames.has(normFolderName)) {
        const newId = crypto.randomUUID();
        const clientType = folder.clientType;
        
        // Ensure company name starts with type prefix if needed
        let finalCompanyName = folderName.toUpperCase().trim();
        const prefix = clientType.toUpperCase();
        if (!finalCompanyName.startsWith(prefix + ' ') && !finalCompanyName.startsWith(prefix + '.')) {
          finalCompanyName = `${prefix} ${finalCompanyName}`;
        }

        // Pre-fill only companyName (Nama Perseroan) and basic default values
        const newProfile = {
          id: newId,
          companyName: finalCompanyName,
          clientType: clientType,
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

        console.log(`[Sync Drive Clients] Creating new ${clientType} client profile: ${finalCompanyName}`);
        await firestoreRest.setDocument("profiles", newId, newProfile, env);
        createdClients.push(finalCompanyName);
        
        // Add to set to prevent duplicate creation
        existingNormalizedNames.add(normFolderName);
      }
    }

    return createJsonResponse({
      success: true,
      totalFoldersCount: allFolders.length,
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
