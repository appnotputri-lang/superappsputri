import { getGoogleAccessToken } from '../src/lib/google-auth';

const BASE_URL = 'https://www.googleapis.com/drive/v3';

async function listAllFolders() {
  const token = await getGoogleAccessToken();
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

  // Find exact name duplicates under the same parent
  // Map key: parentId:normalized_name
  const parentNameMap: Record<string, any[]> = {};
  for (const f of allFolders) {
    const parentId = f.parents?.[0] || 'no-parent';
    const norm = f.name.trim().toLowerCase();
    const key = `${parentId}:${norm}`;
    if (!parentNameMap[key]) {
      parentNameMap[key] = [];
    }
    parentNameMap[key].push(f);
  }

  let exactDupCount = 0;
  console.log('\n--- EXACT DUPLICATE FOLDERS UNDER THE SAME PARENT ---');
  for (const [key, list] of Object.entries(parentNameMap)) {
    if (list.length > 1) {
      exactDupCount++;
      const [parentId, normName] = key.split(':');
      const parentFolder = allFolders.find(p => p.id === parentId);
      const parentName = parentFolder ? parentFolder.name : `Parent ID ${parentId}`;
      
      console.log(`\nDuplicate: "${list[0].name}" inside parent "${parentName}" (${list.length} folders found)`);
      for (const item of list) {
        console.log(`  * ID: ${item.id}, URL: ${item.webViewLink}`);
      }
    }
  }
  
  if (exactDupCount === 0) {
    console.log('No folders with identical names under the same parent were found.');
  } else {
    console.log(`\nFound ${exactDupCount} groups of duplicate folders under the same parent.`);
  }
}

listAllFolders().catch(console.error);
