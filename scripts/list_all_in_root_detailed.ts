import { getGoogleAccessToken } from '../src/lib/google-auth';

const BASE_URL = 'https://www.googleapis.com/drive/v3';

async function listAllDetailed() {
  const token = await getGoogleAccessToken();
  const rootId = '0B-My1uo45zLiUDlnbkY4WFA2dVU';
  
  const q = `'${rootId}' in parents and trashed = false`;
  const url = `${BASE_URL}/files?q=${encodeURIComponent(q)}&includeItemsFromAllDrives=true&supportsAllDrives=true&fields=files(id,name,mimeType,parents,webViewLink,createdTime,modifiedTime)&pageSize=1000`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await response.json() as any;
  if (!response.ok) {
    console.error('Failed:', data);
    return;
  }

  const files = data.files || [];
  console.log(`Total files inside root: ${files.length}`);
  
  // Sort alphabetically by name
  files.sort((a: any, b: any) => a.name.localeCompare(b.name));
  
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    console.log(`${i + 1}. "${f.name}"`);
    console.log(`   ID: ${f.id}`);
    console.log(`   Created: ${f.createdTime}`);
    console.log(`   Modified: ${f.modifiedTime}`);
    console.log(`   URL: ${f.webViewLink}`);
  }
}

listAllDetailed().catch(console.error);
