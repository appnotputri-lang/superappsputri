import { getGoogleAccessToken } from '../src/lib/google-auth';

const BASE_URL = 'https://www.googleapis.com/drive/v3';

async function getRootMetadata() {
  const token = await getGoogleAccessToken();
  const rootId = '0B-My1uo45zLibWQyMVN3N3ZueEk';
  const resourceKey = '0-OneXpFthzNT9f_3bb3L7Vg';

  const url = `${BASE_URL}/files/${rootId}?supportsAllDrives=true&fields=id,name,mimeType,parents,webViewLink,owners,shared,trashed`;
  
  const response = await fetch(url, {
    headers: { 
      Authorization: `Bearer ${token}`,
      'X-Goog-Drive-Resource-Keys': `${rootId}=${resourceKey}`
    }
  });

  const data = await response.json() as any;
  if (!response.ok) {
    console.error('Failed to get metadata with resource key:', data);
    return;
  }

  console.log('Root Folder Metadata (with resource key):');
  console.log(`- ID: ${data.id}`);
  console.log(`- Name: "${data.name}"`);
  console.log(`- Type: ${data.mimeType}`);
  console.log(`- Parents: ${data.parents?.join(', ')}`);
  console.log(`- Owners: ${JSON.stringify(data.owners)}`);
  console.log(`- Shared: ${data.shared}`);
  console.log(`- Trashed: ${data.trashed}`);
  console.log(`- URL: ${data.webViewLink}`);
}

getRootMetadata().catch(console.error);
