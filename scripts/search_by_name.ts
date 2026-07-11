import { getGoogleAccessToken } from '../src/lib/google-auth';

const BASE_URL = 'https://www.googleapis.com/drive/v3';

async function searchByName() {
  const token = await getGoogleAccessToken();
  console.log('Searching all of Drive for BINA PETROGAS and BINACITRA...');

  // Search with NO parents constraint, including trashed and all drives
  const queries = [
    "name contains 'BINA PETROGAS MANDIRI'",
    "name contains 'BINACITRA KHARISMA SEJATI ABADI NUSANTARA'",
    "name contains 'BINACITRA KHARISMASEJATI'"
  ];

  for (const q of queries) {
    console.log(`\nQuery: ${q}`);
    const url = `${BASE_URL}/files?q=${encodeURIComponent(q)}&includeItemsFromAllDrives=true&supportsAllDrives=true&fields=files(id,name,mimeType,parents,webViewLink,trashed,owners,shared)&pageSize=100`;
    
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await response.json() as any;
    if (!response.ok) {
      console.error('Failed:', data);
      continue;
    }

    const files = data.files || [];
    console.log(`Found ${files.length} items:`);
    for (const f of files) {
      console.log(`- Name: "${f.name}"`);
      console.log(`  ID: ${f.id}`);
      console.log(`  MimeType: ${f.mimeType}`);
      console.log(`  Parents: ${f.parents?.join(', ')}`);
      console.log(`  Trashed: ${f.trashed}`);
      console.log(`  Owners: ${JSON.stringify(f.owners)}`);
      console.log(`  URL: ${f.webViewLink}`);
    }
  }
}

searchByName().catch(console.error);
