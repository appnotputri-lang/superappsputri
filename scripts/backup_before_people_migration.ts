/**
 * Backup Script Before Centralized People Database Migration
 * Notaris Putri Office System (Superapps Putri)
 *
 * Non-destructive backup of Firestore client & project collections.
 * Produces a timestamped JSON snapshot and SHA-256 checksum metadata.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs } from 'firebase/firestore';

async function runBackup() {
  console.log('====================================================');
  console.log(' TAHAP 1: BACKUP KOLEKSI FIRESTORE SEBELUM MIGRASI ');
  console.log('====================================================\n');

  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`firebase-applet-config.json tidak ditemukan di ${configPath}`);
  }

  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const app = initializeApp(firebaseConfig);
  const db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    experimentalForceLongPolling: true,
  }, firebaseConfig.firestoreDatabaseId);

  const collectionsToBackup = [
    'profiles',
    'cv_profiles',
    'projects',
    'rupst_projects',
    'pendirian_projects',
    'laporan_projects',
    'client_directory',
    'people',
    'people_nik_keys'
  ];

  const backupData: Record<string, any[]> = {};
  const collectionCounts: Record<string, number> = {};
  let totalDocs = 0;

  console.log('Memulai pemindaian koleksi Firestore...');

  for (const colName of collectionsToBackup) {
    try {
      const snap = await getDocs(collection(db, colName));
      const docs = snap.docs.map(d => ({
        _id: d.id,
        ...d.data()
      }));
      backupData[colName] = docs;
      collectionCounts[colName] = docs.length;
      totalDocs += docs.length;
      console.log(` - Koleksi '${colName}': ${docs.length} dokumen`);
    } catch (err: any) {
      console.warn(` - Koleksi '${colName}': Gagal dibaca (${err.message}). Dicatat kosong.`);
      backupData[colName] = [];
      collectionCounts[colName] = 0;
    }
  }

  const backupsDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `people_migration_backup_${timestamp}.json`;
  const backupFilePath = path.join(backupsDir, backupFilename);
  const metaFilePath = path.join(backupsDir, `people_migration_backup_${timestamp}.meta.json`);

  const jsonContent = JSON.stringify(backupData, null, 2);
  fs.writeFileSync(backupFilePath, jsonContent, 'utf8');

  const sha256 = crypto.createHash('sha256').update(jsonContent).digest('hex');
  const meta = {
    backupFile: backupFilename,
    timestamp: new Date().toISOString(),
    totalDocuments: totalDocs,
    collectionCounts,
    sha256,
    fileSizeBytes: Buffer.byteLength(jsonContent, 'utf8')
  };

  fs.writeFileSync(metaFilePath, JSON.stringify(meta, null, 2), 'utf8');

  console.log('\n====================================================');
  console.log(' BACKUP SELESAI DENGAN SUKSES! ');
  console.log(` File Snapshot : ${backupFilePath}`);
  console.log(` File Metadata : ${metaFilePath}`);
  console.log(` Total Dokumen : ${totalDocs}`);
  console.log(` SHA-256 Hash  : ${sha256}`);
  console.log('====================================================\n');

  process.exit(0);
}

runBackup().catch(err => {
  console.error('Backup Gagal:', err);
  process.exit(1);
});
