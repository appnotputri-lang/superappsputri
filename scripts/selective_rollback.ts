/**
 * Selective Rollback Script
 * Notaris Putri Office System (Superapps Putri)
 *
 * Reverts only the personId backfill injected by a specific migration batch
 * without reverting or overwriting subsequent legal edits, shares, or updatedAt timestamps.
 */

import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, doc, runTransaction } from 'firebase/firestore';
import { sanitizeForFirestore } from '../src/utils/sanitize';

export async function runSelectiveRollback(targetBatchId: string, removeD1Records = false) {
  console.log('================================================================');
  console.log(` PROSEDUR ROLLBACK SELEKTIF — BATCH ID: ${targetBatchId}`);
  console.log('================================================================\n');

  if (!targetBatchId) {
    throw new Error('Batch ID wajib disertakan untuk menjalankan selective rollback!');
  }

  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const app = initializeApp(firebaseConfig);
  const db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    experimentalForceLongPolling: true,
  }, firebaseConfig.firestoreDatabaseId);

  const collections = ['profiles', 'cv_profiles', 'projects', 'rupst_projects', 'pendirian_projects'];
  let totalDocsScanned = 0;
  let totalDocsRolledBack = 0;
  let totalPersonIdsRemoved = 0;

  const arrayFields = [
    'shareholders',
    'finalShareholders',
    'oldManagementItems',
    'newManagementItems',
    'managementItems',
    'parties',
    'founders',
    'peseros'
  ];

  for (const colName of collections) {
    try {
      const snap = await getDocs(collection(db, colName));
      totalDocsScanned += snap.size;

      for (const docSnap of snap.docs) {
        const d = docSnap.data();
        const meta = d._migrationMeta;

        // Check if document was modified in target batch
        if (meta && meta.batchId === targetBatchId) {
          const docRef = doc(db, colName, docSnap.id);
          const updatedPayload: Record<string, any> = {};
          let docModified = false;
          const modifiedIds: string[] = Array.isArray(meta.modifiedItemIds) ? meta.modifiedItemIds : [];

          for (const field of arrayFields) {
            const arr = d[field];
            if (Array.isArray(arr)) {
              const cleanedArr = arr.map((item: any) => {
                if (!item) return item;
                const itemId = item.id || item.personId;
                // If item was backfilled by this batch, strip personId
                if (item.personId && (modifiedIds.includes(itemId) || modifiedIds.length === 0)) {
                  docModified = true;
                  totalPersonIdsRemoved++;
                  const copy = { ...item };
                  delete copy.personId;
                  return copy;
                }
                return item;
              });
              if (docModified) {
                updatedPayload[field] = cleanedArr;
              }
            }
          }

          if (docModified) {
            await runTransaction(db, async (transaction) => {
              // Delete _migrationMeta and update arrays
              // IMPORTANT: Do NOT touch root updatedAt or company legal data!
              transaction.update(docRef, sanitizeForFirestore({
                ...updatedPayload,
                _migrationMeta: null
              }));
            });
            totalDocsRolledBack++;
            console.log(` - Reverted backfill on [${colName}/${docSnap.id}] (Batch: ${targetBatchId})`);
          }
        }
      }
    } catch (err: any) {
      console.error(`Gagal memproses koleksi ${colName}:`, err.message);
    }
  }

  console.log('\n================================================================');
  console.log(' REKAPITULASI ROLLBACK SELEKTIF:');
  console.log(` Total Dokumen Diperiksa   : ${totalDocsScanned}`);
  console.log(` Total Dokumen Dipulihkan  : ${totalDocsRolledBack}`);
  console.log(` Total personId Dihapus    : ${totalPersonIdsRemoved}`);
  console.log(' STATUS: PERUBAHAN LEGAL LAIN & UPDATEDAT TETAP UTUH (NON-DESTRUKTIF)');
  console.log('================================================================\n');

  return {
    targetBatchId,
    totalDocsScanned,
    totalDocsRolledBack,
    totalPersonIdsRemoved
  };
}

// CLI execution support
if (process.argv[2]) {
  runSelectiveRollback(process.argv[2]).then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
