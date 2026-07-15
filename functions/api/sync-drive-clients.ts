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

    const url = new URL(request.url);
    const clientTypeFilter = url.searchParams.get('clientType');

    console.log(`[Sync Drive Clients] Ensuring COMPANY PROFILE folder exists...`);
    const companyProfileId = await DriveFolderService.getOrCreateFolderByName("COMPANY PROFILE", rootFolderId, env);
    
    // 1. List all type folders inside COMPANY PROFILE in one request
    const qTypes = `'${companyProfileId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const typeFolders = await driveRest.listFiles(qTypes, 'files(id, name)', 100, env);
    
    const typeFoldersMapping = [
      { folder: 'PT', type: 'PT' },
      { folder: 'CV', type: 'CV' },
      { folder: 'YAYASAN', type: 'YAYASAN' },
      { folder: 'PERKUMPULAN', type: 'PERKUMPULAN' },
      { folder: 'KOPERASI', type: 'KOPERASI' },
      { folder: 'PERSEKUTUAN FIRMA', type: 'FIRMA' },
      { folder: 'PERSEKUTUAN PERDATA', type: 'PERDATA' },
      { folder: 'PMA', type: 'PMA' },
      { folder: 'PERORANGAN', type: 'PERORANGAN' },
      { folder: 'LAINNYA', type: 'LAINNYA' }
    ].filter(m => !clientTypeFilter || m.type === clientTypeFilter);

    let allFolders: any[] = [];
    for (const mapping of typeFoldersMapping) {
      let typeFolderId = typeFolders.find(f => f.name.toUpperCase() === mapping.folder.toUpperCase())?.id;
      
      if (!typeFolderId) {
        console.log(`[Sync Drive Clients] Type folder ${mapping.folder} not found, creating...`);
        typeFolderId = await DriveFolderService.getOrCreateFolderByName(mapping.folder, companyProfileId, env);
      }

      if (typeFolderId) {
        const q = `'${typeFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        const folders = await driveRest.listFiles(q, 'files(id, name, webViewLink)', 1000, env);
        allFolders.push(...folders.map(f => ({ ...f, clientType: mapping.type })));
      }
    }

    console.log(`[Sync Drive Clients] Found total ${allFolders.length} folders across all types.`);

    // Fetch existing clients (profiles collection)
    const { documents: existingProfiles } = await firestoreRest.listDocuments("profiles", 1000, undefined, env);
    
    // Duplicate detection using (Type + Normalized Name)
    const existingKeys = new Set(
      existingProfiles.map((p: any) => {
        const name = p.fields?.companyName?.stringValue || p.companyName || "";
        const type = p.fields?.clientType?.stringValue || p.clientType || "PT";
        return `${type}:${DriveFolderService.normalizeCompanyName(name)}`;
      })
    );

    const stripTypePrefix = (name: string, type: string): string => {
      let clean = name.toUpperCase().trim();
      const typePrefixMap: Record<string, string[]> = {
        'PT': ['PT ', 'PT.'],
        'CV': ['CV ', 'CV.'],
        'YAYASAN': ['YAYASAN '],
        'PERKUMPULAN': ['PERKUMPULAN '],
        'KOPERASI': ['KOPERASI '],
        'FIRMA': ['PERSEKUTUAN FIRMA ', 'FIRMA '],
        'PERDATA': ['PERSEKUTUAN PERDATA ', 'PERDATA '],
        'PMA': ['PMA '],
        'PERORANGAN': ['PERORANGAN ']
      };
      const prefixes = typePrefixMap[type] || [];
      for (const p of prefixes) {
        if (clean.startsWith(p)) {
          clean = clean.substring(p.length).trim();
          break;
        }
      }
      return clean;
    };

    const createdClients: string[] = [];
    const MAX_CREATION_PER_SYNC = 20; // Limit to avoid Cloudflare subrequest limits

    // Iterate through folders and create missing clients
    for (const folder of allFolders) {
      if (createdClients.length >= MAX_CREATION_PER_SYNC) break;

      const folderName = folder.name.trim();
      const clientType = folder.clientType;
      const cleanCompanyName = stripTypePrefix(folderName, clientType);
      const normFolderName = DriveFolderService.normalizeCompanyName(cleanCompanyName);
      const key = `${clientType}:${normFolderName}`;

      if (!existingKeys.has(key)) {
        const newId = crypto.randomUUID();
        
        // Pre-fill only companyName (Nama Perseroan) and basic default values
        const newProfile = {
          id: newId,
          companyName: cleanCompanyName,
          clientType: clientType,
          companyType: clientType === 'CV' ? 'CV' : 'SWASTA NASIONAL',
          documentType: 'CIRCULAR',
          duration: 'TIDAK TERBATAS',
          status: 'AKTIF',
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updatedBy: authResult.user?.email || 'System (Drive Sync)'
        };

        console.log(`[Sync Drive Clients] Creating new ${clientType} client profile: ${cleanCompanyName}`);
        await firestoreRest.setDocument("profiles", newId, newProfile, env);
        createdClients.push(`${clientType} ${cleanCompanyName}`);
        
        // Add to set to prevent duplicate creation
        existingKeys.add(key);
      }
    }

    return createJsonResponse({
      success: true,
      totalFoldersCount: allFolders.length,
      createdClients,
      createdCount: createdClients.length,
      message: createdClients.length === MAX_CREATION_PER_SYNC ? "Limit tercapai. Silakan klik lagi untuk sisa klien." : "Sinkronisasi selesai."
    });

  } catch (error: any) {
    console.error("[Sync Drive Clients] Error matching & syncing clients:", error);
    return createErrorResponse(error.message || "Failed to sync drive clients", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
