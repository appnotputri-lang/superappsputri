import { getGoogleAccessToken } from '../src/lib/google-auth';

const BASE_URL = 'https://www.googleapis.com/drive/v3';

async function listAllInRootRaw() {
  const token = await getGoogleAccessToken();
  const rootId = '0B-My1uo45zLibWQyMVN3N3ZueEk';
  console.log('Querying everything in parent:', rootId);

  // Notice includeItemsFromAllDrives, supportsAllDrives, and no trashed filter
  const q = `'${rootId}' in parents`;
  const url = `${BASE_URL}/files?q=${encodeURIComponent(q)}&includeItemsFromAllDrives=true&supportsAllDrives=true&fields=nextPageToken,files(id,name,mimeType,parents,webViewLink,trashed,owners,shared,shortcutDetails)&pageSize=100`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await response.json() as any;
  if (!response.ok) {
    console.error('Failed:', data);
    return;
  }

  const files = data.files || [];
  console.log(`Total items found: ${files.length}`);
  for (const f of files) {
    console.log(`- "${f.name}"`);
    console.log(`  ID: ${f.id}`);
    console.log(`  Type: ${f.mimeType}`);
    console.log(`  Parents: ${f.parents?.join(', ')}`);
    console.log(`  Trashed: ${f.trashed}`);
    console.log(`  Owners: ${JSON.stringify(f.owners)}`);
    console.log(`  Shared: ${f.shared}`);
    if (f.shortcutDetails) {
      console.log(`  Shortcut Details: ${JSON.stringify(f.shortcutDetails)}`);
    }
  }
}

listAllInRootRaw().catch(console.error);
