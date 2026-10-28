/**
 * Verified Backup Script Before Centralized People Database Migration
 * Notaris Putri Office System (Superapps Putri)
 *
 * Requirements:
 * - Must include all required data sources.
 * - If reading ANY required collection fails, ABORTS with error.
 * - Never converts read failure into an empty array.
 * - Never outputs PII in console logs.
 * - Performs immediate read-back and SHA-256 integrity verification.
 * - Never writes to production during execution.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs } from 'firebase/firestore';

// Required collections that MUST be completely read for a valid backup
export const REQUIRED_COLLECTIONS = [
  'profiles',
  'projects',
  'rupst_projects',
  'pendirian_projects',
  'client_directory'
];

// Optional or legacy collections to check
export const OPTIONAL_LEGACY_COLLECTIONS = [
  'cv_profiles',
  'company_profiles',
  'office_projects',
  'rupst_public_projects',
  'people',
  'people_nik_keys'
];

export async function runVerifiedBackup(outputDir?: string): Promise<{
  backupFilePath: string;
  metaFilePath: string;
  totalDocuments: number;
  collectionCounts: Record<string, number>;
  sha256: string;
}> {
  console.log('====================================================');
  console.log(' TAHAP 1: BACKUP TERVERIFIKASI SEBELUM MIGRASI D1  ');
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

  const backupData: Record<string, any[]> = {};
  const collectionCounts: Record<string, number> = {};
  let totalDocs = 0;

  console.log('Memulai pemindaian koleksi wajib Firestore...');

  // 1. Scan REQUIRED collections (Must NOT fail)
  for (const colName of REQUIRED_COLLECTIONS) {
    try {
      const snap = await getDocs(collection(db, colName));
      const docs = snap.docs.map(d => ({
        _id: d.id,
        ...d.data()
      }));
      backupData[colName] = docs;
      collectionCounts[colName] = docs.length;
      totalDocs += docs.length;
      console.log(` [WAJIB] Koleksi '${colName}': Berhasil dibaca (${docs.length} dokumen)`);
    } catch (err: any) {
      console.error(`\n❌ FATAL: Gagal membaca koleksi wajib '${colName}': ${err.message}`);
      console.error('Proses backup DIBATALKAN untuk mencegah snapshot tidak lengkap.\n');
      throw new Error(`BACKUP_ABORTED: Koleksi wajib '${colName}' gagal dibaca: ${err.message}`);
    }
  }

  // 2. Scan OPTIONAL/LEGACY collections (Tolerate permission restriction or missing)
  console.log('\nMemeriksa koleksi opsional & historis...');
  for (const colName of OPTIONAL_LEGACY_COLLECTIONS) {
    try {
      const snap = await getDocs(collection(db, colName));
      const docs = snap.docs.map(d => ({
        _id: d.id,
        ...d.data()
      }));
      backupData[colName] = docs;
      collectionCounts[colName] = docs.length;
      totalDocs += docs.length;
      console.log(` [OPSIONAL] Koleksi '${colName}': ${docs.length} dokumen`);
    } catch (err: any) {
      console.log(` [OPSIONAL] Koleksi '${colName}': Dilewati (${err.message})`);
      // Do NOT set backupData for failed optional collections so it's not confused with empty array
    }
  }

  const targetDir = outputDir || path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `verified_people_backup_${timestamp}.json`;
  const backupFilePath = path.join(targetDir, backupFilename);
  const metaFilePath = path.join(targetDir, `verified_people_backup_${timestamp}.meta.json`);

  const jsonContent = JSON.stringify(backupData);
  fs.writeFileSync(backupFilePath, jsonContent, 'utf8');

  const sha256 = crypto.createHash('sha256').update(jsonContent).digest('hex');
  const meta = {
    backupFile: backupFilename,
    timestamp: new Date().toISOString(),
    totalDocuments: totalDocs,
    collectionCounts,
    sha256,
    fileSizeBytes: Buffer.byteLength(jsonContent, 'utf8'),
    schemaVersion: '2.0.0-d1',
    verified: false
  };

  fs.writeFileSync(metaFilePath, JSON.stringify(meta, null, 2), 'utf8');

  // 3. IMMEDIATE INTEGRITY READ-BACK VERIFICATION
  console.log('\nMemverifikasi integritas file backup hasil ekspor...');
  const readBackContent = fs.readFileSync(backupFilePath, 'utf8');
  const readBackSha256 = crypto.createHash('sha256').update(readBackContent).digest('hex');

  if (readBackSha256 !== sha256) {
    fs.unlinkSync(backupFilePath);
    fs.unlinkSync(metaFilePath);
    throw new Error('VERIFICATION_FAILED: Checksum SHA-256 hasil pembacaan ulang tidak cocok!');
  }

  const parsed = JSON.parse(readBackContent);
  let verifiedCount = 0;
  for (const c of Object.keys(parsed)) {
    verifiedCount += parsed[c].length;
  }

  if (verifiedCount !== totalDocs) {
    fs.unlinkSync(backupFilePath);
    fs.unlinkSync(metaFilePath);
    throw new Error(`VERIFICATION_FAILED: Jumlah dokumen hasil baca ulang (${verifiedCount}) tidak sesuai total (${totalDocs})!`);
  }

  meta.verified = true;
  fs.writeFileSync(metaFilePath, JSON.stringify(meta, null, 2), 'utf8');

  console.log('====================================================');
  console.log(' BACKUP TERVERIFIKASI SELESAI DENGAN SUKSES! ');
  console.log(` File Snapshot : ${backupFilePath}`);
  console.log(` File Metadata : ${metaFilePath}`);
  console.log(` Total Dokumen : ${totalDocs}`);
  console.log(` SHA-256 Hash  : ${sha256}`);
  console.log(' Status        : 100% TERVERIFIKASI INTEGRITASNYA');
  console.log('====================================================\n');

  return {
    backupFilePath,
    metaFilePath,
    totalDocuments: totalDocs,
    collectionCounts,
    sha256
  };
}

if (process.argv[1] && process.argv[1].endsWith('backup_before_people_migration.ts')) {
  runVerifiedBackup().then(() => process.exit(0)).catch(err => {
    console.error('Eksekusi Backup Gagal:', err.message);
    process.exit(1);
  });
}
