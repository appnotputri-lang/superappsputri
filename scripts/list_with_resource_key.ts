import { getGoogleAccessToken } from '../src/lib/google-auth';

const BASE_URL = 'https://www.googleapis.com/drive/v3';

async function listWithResourceKey() {
  const token = await getGoogleAccessToken();
  const rootId = '0B-My1uo45zLiOTBzWnh2LVNGNE0';
  const resourceKey = '0-OneXpFthzNT9f_3bb3L7Vg';

  console.log(`Querying root folder with resource key: ${rootId}=${resourceKey}`);

  const q = `'${rootId}' in parents and trashed = false`;
  const url = `${BASE_URL}/files?q=${encodeURIComponent(q)}&includeItemsFromAllDrives=true&supportsAllDrives=true&fields=files(id,name,mimeType,parents,webViewLink,trashed,owners,shared)&pageSize=1000`;
  
  const response = await fetch(url, {
    headers: { 
      Authorization: `Bearer ${token}`,
      'X-Goog-Drive-Resource-Keys': `${rootId}=${resourceKey}`
    }
  });

  const data = await response.json() as any;
  if (!response.ok) {
    console.error('Failed to list folders:', data);
    return;
  }

  const files = data.files || [];
  console.log(`Total files inside root (with resource key): ${files.length}`);
  
  // Output all files so we can verify if they match the screenshot perfectly
  const sortedNames = files.map((f: any) => f.name).sort();
  console.log('\nSorted files in root:');
  for (const name of sortedNames) {
    console.log(`- ${name}`);
  }

  // Find duplicates
  const nameCounts: Record<string, any[]> = {};
  for (const f of files) {
    const norm = f.name.trim().toLowerCase();
    if (!nameCounts[norm]) nameCounts[norm] = [];
    nameCounts[norm].push(f);
  }

  console.log('\n--- DETECTED EXACT NAME DUPLICATES UNDER ROOT ---');
  let dupsFound = false;
  for (const [norm, list] of Object.entries(nameCounts)) {
    if (list.length > 1) {
      dupsFound = true;
      console.log(`\nDuplicate: "${list[0].name}" (${list.length} folders found)`);
      for (const item of list) {
        console.log(`  * ID: ${item.id}, URL: ${item.webViewLink}`);
      }
    }
  }
  if (!dupsFound) {
    console.log('No exact duplicates detected even with the resource key.');
  }
}

listWithResourceKey().catch(console.error);
