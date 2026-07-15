import { firestoreRest } from '../lib/firestore-rest';
import { driveRest } from '../lib/drive-rest';
import { getEnv } from '../runtime/env';

export class DriveFolderService {
  static normalizeCompanyName(name: string): string {
    if (!name) return 'unknown';
    return name
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/pt\.\s+/g, 'pt ')
      .replace(/pt\./g, 'pt')
      .trim();
  }

  private static companyFolderPromises = new Map<string, Promise<{ folderId: string; folderUrl: string }>>();
  private static subFolderPromises = new Map<string, Promise<{ folderId: string; folderUrl: string }>>();

  static async ensureCompanyFolder(companyName: string, clientType: string = 'PT', env: any = {}): Promise<{ folderId: string; folderUrl: string }> {
    const normalized = this.normalizeCompanyName(companyName);
    
    // Key for promise tracking should probably include clientType if we want to be safe, 
    // but normalized company name is usually unique enough for active requests.
    const promiseKey = `${clientType}:${normalized}`;

    let activePromise = this.companyFolderPromises.get(promiseKey);
    if (!activePromise) {
      activePromise = this._ensureCompanyFolderInternal(companyName, clientType, normalized, env);
      this.companyFolderPromises.set(promiseKey, activePromise);
      activePromise.finally(() => {
        this.companyFolderPromises.delete(promiseKey);
      });
    }
    
    return activePromise;
  }

  private static async _ensureCompanyFolderInternal(companyName: string, clientType: string, normalized: string, env: any = {}): Promise<{ folderId: string; folderUrl: string }> {
    const rootDriveFolderId = getEnv(env, 'GOOGLE_DRIVE_ROOT_FOLDER_ID');

    // 1. Check Firestore cache first
    const mapDoc = await firestoreRest.getDocument('drive_folder_map', normalized, env);
    if (mapDoc && mapDoc.driveFolderId) {
      return { folderId: mapDoc.driveFolderId, folderUrl: mapDoc.driveFolderUrl };
    }

    // 2. Ensure "COMPANY PROFILE" exists under rootDriveFolderId
    const companyProfileFolderId = await this.getOrCreateFolderByName("COMPANY PROFILE", rootDriveFolderId || 'root', env);

    // 3. Ensure Client Type folder exists under "COMPANY PROFILE"
    // Map clientType to pretty folder name
    const typeFolderMap: Record<string, string> = {
      'PT': 'PT',
      'CV': 'CV',
      'YAYASAN': 'YAYASAN',
      'PERKUMPULAN': 'PERKUMPULAN',
      'PERSEKUTUAN_FIRMA': 'PERSEKUTUAN FIRMA',
      'PERSEKUTUAN_PERDATA': 'PERSEKUTUAN PERDATA',
      'KOPERASI': 'KOPERASI',
      'PMA': 'PMA',
      'PERORANGAN': 'PERORANGAN'
    };
    const typeFolderName = typeFolderMap[clientType] || 'LAINNYA';
    const typeFolderId = await this.getOrCreateFolderByName(typeFolderName, companyProfileFolderId, env);

    // 4. Search for existing company folder under the type folder
    const q = `'${typeFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const allFolders = await driveRest.listFiles(q, 'files(id, name, webViewLink)', 1000, env);
    const existing = allFolders.find(f => this.normalizeCompanyName(f.name) === normalized);

    if (existing) {
      const result = { folderId: existing.id!, folderUrl: existing.webViewLink! };
      await firestoreRest.setDocument('drive_folder_map', normalized, { 
        companyName, 
        clientType,
        driveFolderId: result.folderId, 
        driveFolderUrl: result.folderUrl, 
        createdAt: new Date()
      }, env);
      return result;
    }

    // 5. Create new folder if not found
    const folder = await driveRest.createFolder(companyName, [typeFolderId], env);
    const result = { folderId: folder.id!, folderUrl: folder.webViewLink! };

    await firestoreRest.setDocument('drive_folder_map', normalized, { 
      companyName, 
      clientType,
      driveFolderId: result.folderId, 
      driveFolderUrl: result.folderUrl, 
      createdAt: new Date()
    }, env);

    return result;
  }

  /**
   * Helper to find or create a folder by name in a specific parent
   */
  public static async getOrCreateFolderByName(name: string, parentId: string, env: any): Promise<string> {
    const q = `'${parentId}' in parents and name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const folders = await driveRest.listFiles(q, 'files(id, name)', 10, env);
    
    if (folders && folders.length > 0) {
      return folders[0].id!;
    }

    const newFolder = await driveRest.createFolder(name, [parentId], env);
    return newFolder.id!;
  }

  static async ensureSubFolder(parentFolderId: string, subFolderName: string, env: any = {}): Promise<{ folderId: string; folderUrl: string }> {
    const key = `${parentFolderId}:${subFolderName.toLowerCase().replace(/\s+/g, ' ').trim()}`;
    
    let activePromise = this.subFolderPromises.get(key);
    if (!activePromise) {
      activePromise = this._ensureSubFolderInternal(parentFolderId, subFolderName, env);
      this.subFolderPromises.set(key, activePromise);
      activePromise.finally(() => {
        this.subFolderPromises.delete(key);
      });
    }
    
    return activePromise;
  }

  private static async _ensureSubFolderInternal(parentFolderId: string, subFolderName: string, env: any = {}): Promise<{ folderId: string; folderUrl: string }> {
    const q = `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const allSubFolders = await driveRest.listFiles(q, 'files(id, name, webViewLink)', 1000, env);
    
    const targetNormalized = subFolderName.toLowerCase().replace(/\s+/g, ' ').trim();
    
    const existing = allSubFolders.find(f => {
      const nameNormalized = f.name.toLowerCase().replace(/\s+/g, ' ').trim();
      return nameNormalized === targetNormalized;
    });

    if (existing) {
      return { folderId: existing.id!, folderUrl: existing.webViewLink! };
    }

    const folder = await driveRest.createFolder(subFolderName, [parentFolderId], env);
    return { folderId: folder.id!, folderUrl: folder.webViewLink! };
  }

  static buildSubFolderName(jobType: string, date: Date): string {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    
    const typeLabels: Record<string, string> = {
      'rups_lb': 'RUPS LB',
      'rups_t': 'RUPST',
      'pendirian_pt': 'Akta Pendirian',
      'pendirian': 'Akta Pendirian',
      'rupslb': 'RUPS LB',
      'rupst': 'RUPST',
      'rupst_public': 'RUPST Terbuka'
    };

    const label = typeLabels[jobType] || 'Project';
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${label} ${month} ${year}`;
  }

  static async handleNewProject(projectData: any, env: any = {}) {
    const projectId = projectData.id || projectData.projectId;
    const clientId = projectData.clientId;
    const jobType = projectData.jobType;

    if (!clientId) {
      console.warn(`[DriveService] Project ${projectId} has no clientId, skipping.`);
      return;
    }

    try {
      // 1. Get Company Name from profiles
      const profileData = await firestoreRest.getDocument('profiles', clientId, env);
      if (!profileData) {
        console.warn(`[DriveService] Profile ${clientId} not found for project ${projectId}`);
        return;
      }

      const companyName = profileData.companyName || 'Unknown Company';
      const clientType = profileData.clientType || 'PT';
      
      // 2. Ensure Company Folder
      const companyFolder = await this.ensureCompanyFolder(companyName, clientType, env);

      // 3. Ensure Subfolder
      const subFolderName = this.buildSubFolderName(jobType, new Date());
      const subFolder = await this.ensureSubFolder(companyFolder.folderId, subFolderName, env);

      // 4. Update Project metadata via REST (auth via OAuth token)
      await firestoreRest.updateDocument('office_projects', projectId, {
        'metadata': {
          ...(projectData.metadata || {}),
          'driveFolderId': subFolder.folderId,
          'driveFolderUrl': subFolder.folderUrl,
          'updatedAt': new Date().toISOString()
        }
      }, env);

      console.log(`[DriveService] Successfully linked Drive folder for project ${projectId}: ${subFolder.folderUrl}`);
    } catch (error) {
      console.error(`[DriveService] Error processing project ${projectId}:`, error);
    }
  }
}
