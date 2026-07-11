import { driveRest } from '../src/lib/drive-rest';
import { DriveFolderService } from '../src/services/DriveFolderService';

async function testDetection() {
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!rootFolderId) {
    console.error('GOOGLE_DRIVE_ROOT_FOLDER_ID is missing');
    return;
  }

  const q = `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  console.log(`Querying Drive with: ${q}`);

  try {
    const allFolders = await driveRest.listFiles(q);
    console.log(`Total folders found: ${allFolders.length}`);
    
    const exactMap = new Map<string, any[]>();
    const normalizedMap = new Map<string, any[]>();

    for (const f of allFolders) {
      const name = f.name || '';
      const norm = DriveFolderService.normalizeCompanyName(name);
      
      if (!exactMap.has(name)) exactMap.set(name, []);
      exactMap.get(name)!.push(f);

      if (!normMapHas(normalizedMap, norm)) normalizedMap.set(norm, []);
      normalizedMap.get(norm)!.push(f);
    }

    console.log('\n--- DETECTED EXACT NAME DUPLICATES ---');
    let exactDups = 0;
    for (const [name, list] of exactMap.entries()) {
      if (list.length > 1) {
        exactDups++;
        console.log(`\nDuplicate Name: "${name}" (${list.length} folders)`);
        for (const item of list) {
          console.log(`  * ID: ${item.id}, URL: ${item.webViewLink}`);
        }
      }
    }
    if (exactDups === 0) {
      console.log('No exact name duplicates found.');
    }

    console.log('\n--- DETECTED NORMALIZED NAME DUPLICATES (CASE/SPACE INSENSITIVE) ---');
    let normDups = 0;
    for (const [norm, list] of normalizedMap.entries()) {
      if (list.length > 1) {
        normDups++;
        console.log(`\nNormalized Duplicate: "${norm}" (${list.length} folders found)`);
        for (const item of list) {
          console.log(`  * Actual Name: "${item.name}", ID: ${item.id}, URL: ${item.webViewLink}`);
        }
      }
    }
    if (normDups === 0) {
      console.log('No normalized name duplicates found.');
    }

  } catch (error) {
    console.error('Error during testing:', error);
  }
}

function normMapHas(map: Map<string, any[]>, key: string) {
  return map.has(key);
}

testDetection().catch(console.error);
