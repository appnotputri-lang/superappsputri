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

  static async ensureCompanyFolder(companyName: string, env: any = {}): Promise<{ folderId: string; folderUrl: string }> {
    const normalized = this.normalizeCompanyName(companyName);
    
    let activePromise = this.companyFolderPromises.get(normalized);
    if (!activePromise) {
      activePromise = this._ensureCompanyFolderInternal(companyName, normalized, env);
      this.companyFolderPromises.set(normalized, activePromise);
      activePromise.finally(() => {
        this.companyFolderPromises.delete(normalized);
      });
    }
    
    return activePromise;
  }

  private static async _ensureCompanyFolderInternal(companyName: string, normalized: string, env: any = {}): Promise<{ folderId: string; folderUrl: string }> {
    const rootFolderId = getEnv(env, 'GOOGLE_DRIVE_ROOT_FOLDER_ID');

    // Use simple GET/SET instead of complex transaction for Cloudflare simplicity
    // in production, you might want more robust locking if many requests hit at once
    const mapDoc = await firestoreRest.getDocument('drive_folder_map', normalized, env);

    if (mapDoc && mapDoc.driveFolderId) {
      return { folderId: mapDoc.driveFolderId, folderUrl: mapDoc.driveFolderUrl };
    }

    // Not found in cache, check Drive API using case and space-insensitive matching in JS
    let existing: any = null;
    if (rootFolderId) {
      const q = `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const allFolders = await driveRest.listFiles(q, 'files(id, name, webViewLink)', 1000, env);
      existing = allFolders.find(f => this.normalizeCompanyName(f.name) === normalized);
    } else {
      // Fallback search with contains to limit search size
      const q = `name contains '${companyName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const matchingFolders = await driveRest.listFiles(q, 'files(id, name, webViewLink)', 1000, env);
      existing = matchingFolders.find(f => this.normalizeCompanyName(f.name) === normalized);
    }

    if (existing) {
      const result = { folderId: existing.id!, folderUrl: existing.webViewLink! };
      await firestoreRest.setDocument('drive_folder_map', normalized, { 
        companyName, 
        driveFolderId: result.folderId, 
        driveFolderUrl: result.folderUrl, 
        createdAt: new Date()
      }, env);
      return result;
    }

    // Create new folder
    const folder = await driveRest.createFolder(companyName, rootFolderId ? [rootFolderId] : [], env);
    const result = { folderId: folder.id!, folderUrl: folder.webViewLink! };

    await firestoreRest.setDocument('drive_folder_map', normalized, { 
      companyName, 
      driveFolderId: result.folderId, 
      driveFolderUrl: result.folderUrl, 
      createdAt: new Date()
    }, env);

    return result;
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
    const projectId = projectData.id;
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
      
      // 2. Ensure Company Folder
      const companyFolder = await this.ensureCompanyFolder(companyName, env);

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
