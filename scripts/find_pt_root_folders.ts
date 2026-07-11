import { getGoogleAccessToken } from '../src/lib/google-auth';

const BASE_URL = 'https://www.googleapis.com/drive/v3';

async function findPTRootFolders() {
  const token = await getGoogleAccessToken();
  console.log('Searching all of Drive for folders named "PT"...');

  const q = "name = 'PT' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
  const url = `${BASE_URL}/files?q=${encodeURIComponent(q)}&includeItemsFromAllDrives=true&supportsAllDrives=true&fields=files(id,name,parents,webViewLink,owners)&pageSize=100`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await response.json() as any;
  if (!response.ok) {
    console.error('Failed to search:', data);
    return;
  }

  const files = data.files || [];
  console.log(`Found ${files.length} folders named "PT":`);
  for (const f of files) {
    console.log(`- ID: ${f.id}`);
    console.log(`  Parents: ${f.parents?.join(', ')}`);
    console.log(`  Owners: ${JSON.stringify(f.owners)}`);
    console.log(`  URL: ${f.webViewLink}`);
  }
}

findPTRootFolders().catch(console.error);
