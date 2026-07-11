import { getGoogleAccessToken } from '../src/lib/google-auth';

const BASE_URL = 'https://www.googleapis.com/drive/v3';

async function findPTFoldersDetailed() {
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

  console.log(`Total folders in Drive: ${allFolders.length}`);
  
  const targets = [
    'PT BINA PETROGAS MANDIRI',
    'PT BINACITRA KHARISMA SEJATI ABADI NUSANTARA',
    'PT BINACITRA KHARISMASEJATI'
  ];

  for (const target of targets) {
    console.log(`\n--- DETAILS FOR: "${target}" ---`);
    const matches = allFolders.filter(f => 
      f.name.replace(/\s+/g, ' ').trim().toLowerCase() === target.toLowerCase()
    );

    console.log(`Matches found: ${matches.length}`);
    for (const m of matches) {
      console.log(`  Name: "${m.name}" (Length: ${m.name.length})`);
      console.log(`  Char Codes: ${Array.from(m.name).map((c: any) => c.charCodeAt(0)).join(', ')}`);
      console.log(`  ID: ${m.id}`);
      console.log(`  Parents: ${m.parents?.join(', ') || 'none'}`);
      console.log(`  URL: ${m.webViewLink}`);
    }
  }
}

findPTFoldersDetailed().catch(console.error);
