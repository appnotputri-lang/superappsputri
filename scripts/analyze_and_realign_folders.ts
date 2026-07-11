import { driveRest } from '../src/lib/drive-rest';
import { firestoreRest } from '../src/lib/firestore-rest';
import { DriveFolderService } from '../src/services/DriveFolderService';
import { getGoogleAccessToken } from '../src/lib/google-auth';

async function listFilesInFolder(folderId: string): Promise<any[]> {
  try {
    const q = `'${folderId}' in parents and trashed = false`;
    return await driveRest.listFiles(q, 'files(id, name, mimeType, webViewLink)');
  } catch (e) {
    return [];
  }
}

async function moveItem(itemId: string, addParentId: string, removeParentId: string): Promise<any> {
  const token = await getGoogleAccessToken();
  const url = `https://www.googleapis.com/drive/v3/files/${itemId}?addParents=${addParentId}&removeParents=${removeParentId}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(`Failed to move item ${itemId}: ${JSON.stringify(data)}`);
  }
  return await response.json();
}

async function trashItem(itemId: string): Promise<any> {
  const token = await getGoogleAccessToken();
  const url = `https://www.googleapis.com/drive/v3/files/${itemId}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ trashed: true })
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(`Failed to trash item ${itemId}: ${JSON.stringify(data)}`);
  }
  return await response.json();
}

async function analyzeAndRealign(execute = false) {
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!rootFolderId) {
    console.error('GOOGLE_DRIVE_ROOT_FOLDER_ID is missing');
    return;
  }

  console.log(`\nFetching folders from Drive under root: ${rootFolderId}...`);
  const q = `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  
  const allFolders = await driveRest.listFiles(q, 'files(id, name, webViewLink, createdTime, modifiedTime)');
  console.log(`Found ${allFolders.length} total folders on Drive.`);

  // Group by normalized name
  const grouped = new Map<string, any[]>();
  for (const f of allFolders) {
    const norm = DriveFolderService.normalizeCompanyName(f.name || '');
    if (!grouped.has(norm)) grouped.set(norm, []);
    grouped.get(norm)!.push(f);
  }

  // Fetch Firestore drive_folder_map cache
  console.log('Fetching Firestore drive_folder_map cache...');
  const cacheResult = await firestoreRest.listDocuments('drive_folder_map', 300);
  const cacheMap = new Map<string, any>();
  for (const doc of cacheResult.documents) {
    cacheMap.set(doc.id, doc);
  }

  // Fetch all projects in office_projects
  console.log('Fetching office_projects to prepare realignment metadata...');
  const projectsResult = await firestoreRest.listDocuments('office_projects', 300);
  console.log(`Found ${projectsResult.documents.length} projects in Firestore.`);

  console.log('\n=============================================================');
  console.log(execute ? 'EXECUTING REALIGNMENT & FILE MERGING' : 'DRY RUN - ANALYZING DUPLICATES');
  console.log('=============================================================\n');

  let duplicatesCount = 0;
  let foldersTrashedCount = 0;
  let filesMovedCount = 0;
  let subfoldersMovedCount = 0;
  let projectsUpdatedCount = 0;

  for (const [norm, list] of grouped.entries()) {
    if (list.length > 1) {
      duplicatesCount++;
      
      // Sort:
      // 1. Folders starting with '0B-' are older native folders and always take priority.
      // 2. Otherwise, sort by createdTime (earlier createdTime is original).
      list.sort((a, b) => {
        const aIs0B = a.id.startsWith('0B-');
        const bIs0B = b.id.startsWith('0B-');
        if (aIs0B && !bIs0B) return -1;
        if (!aIs0B && bIs0B) return 1;
        
        const aTime = new Date(a.createdTime || 0).getTime();
        const bTime = new Date(b.createdTime || 0).getTime();
        return aTime - bTime;
      });

      const original = list[0];
      const duplicates = list.slice(1);

      console.log(`\n[Company] "${original.name}" (Normalized: "${norm}")`);
      console.log(`  -> Selected Original:  ID: ${original.id} (Created: ${original.createdTime})`);

      // List sub-items of original folder
      const originalSubitems = await listFilesInFolder(original.id);
      const originalSubfolders = originalSubitems.filter(item => item.mimeType === 'application/vnd.google-apps.folder');

      for (const dup of duplicates) {
        console.log(`  -> Duplicate Folder:   ID: ${dup.id} (Created: ${dup.createdTime})`);
        
        const dupSubitems = await listFilesInFolder(dup.id);
        console.log(`     Items found inside duplicate folder: ${dupSubitems.length}`);

        for (const item of dupSubitems) {
          if (item.mimeType === 'application/vnd.google-apps.folder') {
            // It's a subfolder (e.g. "RUPST Juli 2026")
            const targetNormName = item.name.toLowerCase().replace(/\s+/g, ' ').trim();
            const matchingOriginalSubfolder = originalSubfolders.find(f => 
              f.name.toLowerCase().replace(/\s+/g, ' ').trim() === targetNormName
            );

            if (matchingOriginalSubfolder) {
              // Case A: Subfolder already exists in original.
              // Move all files from dup's subfolder into original's subfolder!
              console.log(`     * Subfolder "${item.name}" already exists in original (ID: ${matchingOriginalSubfolder.id}). Consolidating files...`);
              const dupSubfolderFiles = await listFilesInFolder(item.id);
              
              for (const file of dupSubfolderFiles) {
                if (execute) {
                  console.log(`       - Moving file "${file.name}" (ID: ${file.id}) into original subfolder...`);
                  await moveItem(file.id, matchingOriginalSubfolder.id, item.id);
                  filesMovedCount++;
                } else {
                  console.log(`       - [Dry Run] Will move file "${file.name}" (ID: ${file.id}) into original subfolder.`);
                }
              }

              // Update projects that point to the duplicate's subfolder ID to point to the original's subfolder ID
              for (const project of projectsResult.documents) {
                if (project.metadata?.driveFolderId === item.id) {
                  if (execute) {
                    console.log(`       - Updating Project ${project.id} metadata to point to original subfolder ${matchingOriginalSubfolder.id}...`);
                    await firestoreRest.updateDocument('office_projects', project.id, {
                      metadata: {
                        ...(project.metadata || {}),
                        driveFolderId: matchingOriginalSubfolder.id,
                        driveFolderUrl: matchingOriginalSubfolder.webViewLink,
                        updatedAt: new Date().toISOString(),
                        realignedFrom: item.id
                      }
                    });
                    projectsUpdatedCount++;
                  } else {
                    console.log(`       - [Dry Run] Will update Project ${project.id} metadata -> ${matchingOriginalSubfolder.id}.`);
                  }
                }
              }

              // Trash the empty duplicate subfolder
              if (execute) {
                console.log(`       - Trashing empty duplicate subfolder "${item.name}" (ID: ${item.id})...`);
                await trashItem(item.id);
              } else {
                console.log(`       - [Dry Run] Will trash empty duplicate subfolder "${item.name}" (ID: ${item.id}).`);
              }

            } else {
              // Case B: Subfolder does NOT exist in original.
              // Move the entire subfolder from duplicate folder to original folder!
              if (execute) {
                console.log(`     * Moving entire subfolder "${item.name}" (ID: ${item.id}) to original company folder...`);
                await moveItem(item.id, original.id, dup.id);
                subfoldersMovedCount++;
              } else {
                console.log(`     * [Dry Run] Will move entire subfolder "${item.name}" (ID: ${item.id}) to original company folder.`);
              }

              // Since the subfolder ID remains identical, projects pointing to item.id don't need their ID updated,
              // but we should update their webViewLink or metadata fields just in case, or leave it as it is since ID is unchanged.
              // Let's do a quick scan just to log them
              for (const project of projectsResult.documents) {
                if (project.metadata?.driveFolderId === item.id) {
                  console.log(`       - Project ${project.id} already points to subfolder ID ${item.id} (moved under original company folder).`);
                }
              }
            }
          } else {
            // It is a direct file inside the duplicate company folder
            if (execute) {
              console.log(`     * Moving direct file "${item.name}" (ID: ${item.id}) to original company folder...`);
              await moveItem(item.id, original.id, dup.id);
              filesMovedCount++;
            } else {
              console.log(`     * [Dry Run] Will move direct file "${item.name}" (ID: ${item.id}) to original company folder.`);
            }
          }
        }

        // Now that all items inside duplicate company folder are migrated, trash it!
        if (execute) {
          console.log(`     -> Trashing empty duplicate company folder "${dup.name}" (ID: ${dup.id})...`);
          await trashItem(dup.id);
          foldersTrashedCount++;
        } else {
          console.log(`     -> [Dry Run] Will trash empty duplicate company folder "${dup.name}" (ID: ${dup.id}).`);
        }
      }

      // Finally, update Firestore Cache drive_folder_map
      if (execute) {
        console.log(`  -> [Cache] Setting cache mapping: "${norm}" -> ${original.id}`);
        await firestoreRest.setDocument('drive_folder_map', norm, {
          companyName: original.name,
          driveFolderId: original.id,
          driveFolderUrl: original.webViewLink,
          updatedAt: new Date().toISOString()
        });
      } else {
        console.log(`  -> [Cache] [Dry Run] Will set cache mapping: "${norm}" -> ${original.id}`);
      }

      console.log('-------------------------------------------------------------');
    }
  }

  console.log('\n=============================================================');
  console.log('REALIGNMENT SUMMARY');
  console.log('=============================================================');
  console.log(`Total companies processed:            ${duplicatesCount}`);
  if (execute) {
    console.log(`Total files moved:                    ${filesMovedCount}`);
    console.log(`Total whole subfolders moved:         ${subfoldersMovedCount}`);
    console.log(`Total Firestore projects re-linked:   ${projectsUpdatedCount}`);
    console.log(`Total duplicate folders trashed:      ${foldersTrashedCount}`);
    console.log('\nSTATUS: Realignment execution completed successfully.');
  } else {
    console.log('\nSTATUS: Dry run completed. No changes were made.');
    console.log('To run this for real and fix the duplicates, execute with:');
    console.log('npx tsx scripts/analyze_and_realign_folders.ts --execute');
  }
  console.log('=============================================================\n');
}

const args = process.argv.slice(2);
const execute = args.includes('--execute');
analyzeAndRealign(execute).catch(console.error);
