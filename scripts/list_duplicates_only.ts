import { getGoogleAccessToken } from '../src/lib/google-auth';

const BASE_URL = 'https://www.googleapis.com/drive/v3';

async function listDuplicatesOnly() {
  const token = await getGoogleAccessToken();
  const rootId = '0B-My1uo45zLibWQyMVN3N3ZueEk';
  
  const q = `'${rootId}' in parents and trashed = false`;
  const url = `${BASE_URL}/files?q=${encodeURIComponent(q)}&includeItemsFromAllDrives=true&supportsAllDrives=true&fields=files(id,name,mimeType,parents,webViewLink,trashed,owners,shared)&pageSize=1000`;
  
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
  
  const filterTargets = ['BINA PETROGAS MANDIRI', 'BINACITRA KHARISMA SEJATI ABADI NUSANTARA', 'BINACITRA KHARISMASEJATI'];
  
  for (const target of filterTargets) {
    console.log(`\nMatching items for: "${target}"`);
    const matches = files.filter(f => f.name.toLowerCase().includes(target.toLowerCase()));
    for (const m of matches) {
      console.log(`- Name: "${m.name}"`);
      console.log(`  ID: ${m.id}`);
      console.log(`  MimeType: ${m.mimeType}`);
      console.log(`  Parents: ${m.parents?.join(', ')}`);
      console.log(`  URL: ${m.webViewLink}`);
    }
  }
}

listDuplicatesOnly().catch(console.error);
