import { getGoogleAccessToken } from '../src/lib/google-auth';
import { firestoreRest } from '../src/lib/firestore-rest';

const BASE_URL = 'https://www.googleapis.com/drive/v3';

async function listFolderChildren(folderId: string) {
  const token = await getGoogleAccessToken();
  const q = `'${folderId}' in parents and trashed = false`;
  const url = `${BASE_URL}/files?q=${encodeURIComponent(q)}&includeItemsFromAllDrives=true&supportsAllDrives=true&fields=files(id,name,mimeType)&pageSize=1000`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!response.ok) {
    const err = await response.json() as any;
    throw new Error(`Failed to list children of folder ${folderId}: ${JSON.stringify(err)}`);
  }
  const data = await response.json() as any;
  return data.files || [];
}

async function moveFile(fileId: string, addParents: string, removeParents: string) {
  const token = await getGoogleAccessToken();
  const url = `${BASE_URL}/files/${fileId}?addParents=${encodeURIComponent(addParents)}&removeParents=${encodeURIComponent(removeParents)}&supportsAllDrives=true`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: '{}'
  });
  
  if (!response.ok) {
    const err = await response.json() as any;
    throw new Error(`Failed to move file ${fileId}: ${JSON.stringify(err)}`);
  }
}

async function trashFile(fileId: string) {
  const token = await getGoogleAccessToken();
  const url = `${BASE_URL}/files/${fileId}?supportsAllDrives=true`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ trashed: true })
  });
  
  if (!response.ok) {
    const err = await response.json() as any;
    throw new Error(`Failed to trash file ${fileId}: ${JSON.stringify(err)}`);
  }
}

async function renameFile(fileId: string, newName: string) {
  const token = await getGoogleAccessToken();
  const url = `${BASE_URL}/files/${fileId}?supportsAllDrives=true`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: newName })
  });
  
  if (!response.ok) {
    const err = await response.json() as any;
    throw new Error(`Failed to rename file ${fileId}: ${JSON.stringify(err)}`);
  }
}

async function mergeDuplicates() {
  const token = await getGoogleAccessToken();
  console.log('Scanning all folders to detect and merge duplicate folders...');

  const q = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
  let pageToken: string | undefined = undefined;
  let allFolders: any[] = [];

  do {
    const url = `${BASE_URL}/files?q=${encodeURIComponent(q)}&includeItemsFromAllDrives=true&supportsAllDrives=true&fields=nextPageToken,files(id,name,parents,webViewLink)&pageSize=100${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await response.json() as any;
    if (!response.ok) {
      console.error('Failed to list folders:', data);
      return;
    }

    allFolders = allFolders.concat(data.files || []);
    pageToken = data.nextPageToken;
  } while (pageToken);

  console.log(`Total folders scanned: ${allFolders.length}`);

  // Find folders that end with (1) or (2), etc.
  const suffixPattern = /\s*\(\d+\)$/;
  const duplicateFolders = allFolders.filter(f => suffixPattern.test(f.name));

  if (duplicateFolders.length === 0) {
    console.log('No folders ending in (1), (2), etc. found on Google Drive.');
    return;
  }

  console.log(`Found ${duplicateFolders.length} folders that appear to be duplicates.`);

  for (const dupFolder of duplicateFolders) {
    const cleanName = dupFolder.name.replace(suffixPattern, '').trim();
    const parentId = dupFolder.parents?.[0];

    console.log(`\nProcessing duplicate folder: "${dupFolder.name}" (ID: ${dupFolder.id})`);
    console.log(`Target main folder name: "${cleanName}"`);

    // Find the main folder in the same parent directory
    const mainFolder = allFolders.find(f => 
      f.name.trim().toLowerCase() === cleanName.toLowerCase() && 
      f.id !== dupFolder.id &&
      (!parentId || f.parents?.includes(parentId))
    );

    if (mainFolder) {
      console.log(`Found matching main folder: "${mainFolder.name}" (ID: ${mainFolder.id})`);
      
      // 1. Move all children from duplicate folder to main folder
      try {
        const children = await listFolderChildren(dupFolder.id);
        console.log(`Found ${children.length} items inside the duplicate folder.`);
        
        for (const child of children) {
          console.log(`  Moving item "${child.name}" (${child.id}) to main folder...`);
          await moveFile(child.id, mainFolder.id, dupFolder.id);
        }

        // 2. Trash the duplicate folder
        console.log(`  Trashing duplicate folder "${dupFolder.name}"...`);
        await trashFile(dupFolder.id);

        // 3. Update Firestore mapping if it pointed to the duplicate folder
        const normalized = cleanName.toLowerCase().replace(/\s+/g, ' ').replace(/pt\.\s+/g, 'pt ').replace(/pt\./g, 'pt').trim();
        const mapDoc = await firestoreRest.getDocument('drive_folder_map', normalized);
        if (mapDoc && mapDoc.driveFolderId === dupFolder.id) {
          console.log(`  Updating Firestore drive_folder_map for "${normalized}" to point to main folder...`);
          await firestoreRest.setDocument('drive_folder_map', normalized, {
            ...mapDoc,
            driveFolderId: mainFolder.id,
            driveFolderUrl: mainFolder.webViewLink || `https://drive.google.com/drive/folders/${mainFolder.id}`,
            updatedAt: new Date()
          });
        }
        
        console.log(`Successfully merged duplicate folder "${dupFolder.name}" into "${mainFolder.name}"!`);
      } catch (err: any) {
        console.error(`Error merging folder ${dupFolder.name}:`, err.message || err);
      }
    } else {
      console.log(`No main folder found. Simply renaming the duplicate folder "${dupFolder.name}" to "${cleanName}"...`);
      try {
        await renameFile(dupFolder.id, cleanName);
        console.log(`Successfully renamed folder to "${cleanName}".`);
      } catch (err: any) {
        console.error(`Error renaming folder:`, err.message || err);
      }
    }
  }
}

mergeDuplicates().catch(console.error);
