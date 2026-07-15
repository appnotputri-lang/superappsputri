import { getGoogleAccessToken } from '../src/lib/google-auth';

const BASE_URL = 'https://www.googleapis.com/drive/v3';

async function listAllCorpora() {
  const token = await getGoogleAccessToken();
  const rootId = '0B-My1uo45zLiOTBzWnh2LVNGNE0';
  
  const q = `'${rootId}' in parents and trashed = false`;
  // Using corpora=allDrives requires supportsAllDrives=true and includeItemsFromAllDrives=true
  const url = `${BASE_URL}/files?q=${encodeURIComponent(q)}&corpora=allDrives&includeItemsFromAllDrives=true&supportsAllDrives=true&fields=files(id,name,mimeType,parents,webViewLink,createdTime,modifiedTime)&pageSize=1000`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await response.json() as any;
  if (!response.ok) {
    console.error('Failed with corpora=allDrives:', data);
    return;
  }

  const files = data.files || [];
  console.log(`Total files inside root (with corpora=allDrives): ${files.length}`);
  
  files.sort((a: any, b: any) => a.name.localeCompare(b.name));
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    console.log(`${i + 1}. "${f.name}" (${f.id})`);
  }
}

listAllCorpora().catch(console.error);
