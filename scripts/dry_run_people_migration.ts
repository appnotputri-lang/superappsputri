/**
 * Dry-Run People Migration Analyzer
 * Reads the verified Firestore backup snapshot and extracts all candidate individuals:
 * - Profiles (shareholders, finalShareholders, management items, witnesses, representatives)
 * - RUPST Projects
 * - Pendirian Projects
 * - Standard Projects
 *
 * Applies strict PILIHAN A validation:
 * - 16-digit valid NIK for WNI
 * - Global unique Passport for WNA
 * - Exact base name matching (titles normalized)
 * - Spelling mismatch quarantine
 * - Generates audit metrics WITHOUT writing to D1.
 */

import fs from 'fs';
import path from 'path';
import { parsePersonName, evaluateNameCompatibility } from '../src/utils/nameResolution';
import { cleanNikInput, cleanPassportInput, maskNik, maskPassportNumber } from '../src/services/peopleD1Repository';

interface PersonCandidate {
  sourceCollection: string;
  sourceDocId: string;
  companyName?: string;
  roleCategory: string; // SHAREHOLDER, DIRECTOR, COMMISSIONER, WITNESS, REPRESENTATIVE
  positionTitle?: string;
  rawName: string;
  nik: string | null;
  passport: string | null;
  nationalityType: 'WNI' | 'WNA';
  nationality: string;
  birthCity?: string;
  birthDate?: string;
  occupation?: string;
  fullAddress?: string;
  rt?: string;
  rw?: string;
  kelurahan?: string;
  kecamatan?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  npwp?: string;
}

export function extractAllCandidates(backupData: Record<string, any[]>): PersonCandidate[] {
  const candidates: PersonCandidate[] = [];

  function processPerson(
    raw: any,
    sourceCollection: string,
    sourceDocId: string,
    companyName: string | undefined,
    roleCategory: string,
    positionTitle?: string
  ) {
    if (!raw) return;
    const name = String(raw.name || raw.nama || raw.fullName || '').trim();
    if (!name || name.length < 2) return;

    // Filter out corporate entities acting as shareholders
    const isCorporate = (raw.type && raw.type !== 'INDIVIDUAL' && raw.type !== 'PERORANGAN') ||
                        (raw.shareholderType && raw.shareholderType !== 'INDIVIDUAL' && raw.shareholderType !== 'PERORANGAN') ||
                        name.toUpperCase().startsWith('PT ') ||
                        name.toUpperCase().startsWith('CV ') ||
                        name.toUpperCase().startsWith('YAYASAN ');
    if (isCorporate) return;

    const nik = cleanNikInput(raw.nik || raw.noKtp || raw.ktp);
    const passport = cleanPassportInput(raw.passport || raw.paspor || raw.passportNumber || raw.noPaspor);
    
    let nationality = String(raw.nationality || raw.kewarganegaraan || 'INDONESIA').trim().toUpperCase();
    let nationalityType: 'WNI' | 'WNA' = (nationality === 'WNA' || (passport && !nik)) ? 'WNA' : 'WNI';
    if (nationality === 'WNI') nationality = 'INDONESIA';

    let fullAddress = '';
    let rt = '';
    let rw = '';
    let kelurahan = '';
    let kecamatan = '';
    let city = '';
    let province = '';
    let postalCode = '';

    if (typeof raw.address === 'object' && raw.address !== null) {
      fullAddress = raw.address.fullAddress || raw.address.alamat || '';
      rt = raw.address.rt || '';
      rw = raw.address.rw || '';
      kelurahan = raw.address.kelurahan || '';
      kecamatan = raw.address.kecamatan || '';
      city = raw.address.city || raw.address.kota || '';
      province = raw.address.province || raw.address.provinsi || '';
      postalCode = raw.address.postalCode || raw.address.kodePos || '';
    } else if (typeof raw.fullAddress === 'string') {
      fullAddress = raw.fullAddress;
    } else if (typeof raw.address === 'string') {
      fullAddress = raw.address;
    }

    candidates.push({
      sourceCollection,
      sourceDocId,
      companyName,
      roleCategory,
      positionTitle: positionTitle || raw.position || raw.jabatan || roleCategory,
      rawName: name,
      nik,
      passport,
      nationalityType,
      nationality,
      birthCity: raw.birthCity || raw.tempatLahir || raw.birthPlace,
      birthDate: raw.birthDate || raw.tanggalLahir,
      occupation: raw.occupation || raw.pekerjaan,
      fullAddress,
      rt,
      rw,
      kelurahan,
      kecamatan,
      city,
      province,
      postalCode,
      npwp: raw.npwp
    });
  }

  // 1. Scan profiles
  const profiles = backupData.profiles || [];
  for (const doc of profiles) {
    const compName = doc.companyName || doc.targetCompanyName;
    // Shareholders
    if (Array.isArray(doc.shareholders)) {
      for (const sh of doc.shareholders) processPerson(sh, 'profiles', doc._id, compName, 'SHAREHOLDER');
    }
    if (Array.isArray(doc.finalShareholders)) {
      for (const sh of doc.finalShareholders) processPerson(sh, 'profiles', doc._id, compName, 'SHAREHOLDER');
    }
    // Management
    if (Array.isArray(doc.oldManagementItems)) {
      for (const m of doc.oldManagementItems) processPerson(m, 'profiles', doc._id, compName, 'MANAGEMENT', m.position || m.jabatan);
    }
    if (Array.isArray(doc.newManagementItems)) {
      for (const m of doc.newManagementItems) processPerson(m, 'profiles', doc._id, compName, 'MANAGEMENT', m.position || m.jabatan);
    }
    // Saksi-saksi
    if (doc.saksi1Nama) {
      processPerson({ name: doc.saksi1Nama, nik: doc.saksi1NIK, birthCity: doc.saksi1Lahir, fullAddress: doc.saksi1Alamat }, 'profiles', doc._id, compName, 'WITNESS', 'Saksi 1');
    }
    if (doc.saksi2Nama) {
      processPerson({ name: doc.saksi2Nama, nik: doc.saksi2NIK, birthCity: doc.saksi2Lahir, fullAddress: doc.saksi2Alamat }, 'profiles', doc._id, compName, 'WITNESS', 'Saksi 2');
    }
    // Manual Representative
    if (doc.manualRepresentative && doc.manualRepresentative.name) {
      processPerson(doc.manualRepresentative, 'profiles', doc._id, compName, 'REPRESENTATIVE', doc.manualRepresentative.position || 'Kuasa');
    }
  }

  // 2. Scan rupst_projects
  const rupst = backupData.rupst_projects || [];
  for (const doc of rupst) {
    const compName = doc.companyName;
    if (Array.isArray(doc.shareholders)) {
      for (const sh of doc.shareholders) processPerson(sh, 'rupst_projects', doc._id, compName, 'SHAREHOLDER');
    }
    if (Array.isArray(doc.finalShareholders)) {
      for (const sh of doc.finalShareholders) processPerson(sh, 'rupst_projects', doc._id, compName, 'SHAREHOLDER');
    }
    if (Array.isArray(doc.oldManagementItems)) {
      for (const m of doc.oldManagementItems) processPerson(m, 'rupst_projects', doc._id, compName, 'MANAGEMENT', m.position || m.jabatan);
    }
    if (Array.isArray(doc.newManagementItems)) {
      for (const m of doc.newManagementItems) processPerson(m, 'rupst_projects', doc._id, compName, 'MANAGEMENT', m.position || m.jabatan);
    }
  }

  // 3. Scan pendirian_projects
  const pendirian = backupData.pendirian_projects || [];
  for (const doc of pendirian) {
    const compName = doc.companyName;
    if (Array.isArray(doc.shareholders)) {
      for (const sh of doc.shareholders) processPerson(sh, 'pendirian_projects', doc._id, compName, 'SHAREHOLDER');
    }
    if (Array.isArray(doc.management)) {
      for (const m of doc.management) processPerson(m, 'pendirian_projects', doc._id, compName, 'MANAGEMENT', m.position || m.jabatan);
    }
  }

  // 4. Scan projects
  const projects = backupData.projects || [];
  for (const doc of projects) {
    const compName = doc.companyName;
    if (Array.isArray(doc.shareholders)) {
      for (const sh of doc.shareholders) processPerson(sh, 'projects', doc._id, compName, 'SHAREHOLDER');
    }
    if (Array.isArray(doc.management)) {
      for (const m of doc.management) processPerson(m, 'projects', doc._id, compName, 'MANAGEMENT', m.position || m.jabatan);
    }
  }

  return candidates;
}

export async function runDryRunMigration(backupFilePath: string) {
  console.log('====================================================');
  console.log(' DRY-RUN ANALISIS MIGRASI SENTRALISASI PEOPLE D1   ');
  console.log('====================================================\n');

  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`File snapshot backup tidak ditemukan: ${backupFilePath}`);
  }

  const rawJson = fs.readFileSync(backupFilePath, 'utf8');
  const backupData = JSON.parse(rawJson);

  const candidates = extractAllCandidates(backupData);
  console.log(`Total kandidat orang diekstraksi: ${candidates.length} entri\n`);

  // Aggregation maps
  const nikMap = new Map<string, { primary: PersonCandidate; allRoles: PersonCandidate[] }>();
  const passportMap = new Map<string, { primary: PersonCandidate; allRoles: PersonCandidate[] }>();
  const unkeyedCandidates: PersonCandidate[] = [];

  const conflicts: any[] = [];
  let wniCount = 0;
  let wnaCount = 0;
  let invalidNikCount = 0;

  for (const c of candidates) {
    if (c.nik) {
      if (c.nik.length !== 16) {
        invalidNikCount++;
        conflicts.push({
          type: 'INVALID_NIK_LENGTH',
          candidateName: c.rawName,
          nikMasked: maskNik(c.nik),
          length: c.nik.length,
          source: `${c.sourceCollection}/${c.sourceDocId}`
        });
        unkeyedCandidates.push(c);
        continue;
      }

      if (nikMap.has(c.nik)) {
        const existing = nikMap.get(c.nik)!;
        const comp = evaluateNameCompatibility(existing.primary.rawName, c.rawName);
        if (comp.spellingMismatch) {
          conflicts.push({
            type: 'NIK_NAME_SPELLING_MISMATCH',
            nikMasked: maskNik(c.nik),
            existingName: existing.primary.rawName,
            incomingName: c.rawName,
            existingSource: `${existing.primary.sourceCollection}/${existing.primary.sourceDocId}`,
            incomingSource: `${c.sourceCollection}/${c.sourceDocId}`
          });
        }
        existing.allRoles.push(c);
      } else {
        nikMap.set(c.nik, { primary: c, allRoles: [c] });
        wniCount++;
      }
    } else if (c.passport) {
      if (passportMap.has(c.passport)) {
        const existing = passportMap.get(c.passport)!;
        const comp = evaluateNameCompatibility(existing.primary.rawName, c.rawName);
        if (comp.spellingMismatch) {
          conflicts.push({
            type: 'PASSPORT_NAME_SPELLING_MISMATCH',
            passportMasked: maskPassportNumber(c.passport),
            existingName: existing.primary.rawName,
            incomingName: c.rawName,
            existingSource: `${existing.primary.sourceCollection}/${existing.primary.sourceDocId}`,
            incomingSource: `${c.sourceCollection}/${c.sourceDocId}`
          });
        }
        existing.allRoles.push(c);
      } else {
        passportMap.set(c.passport, { primary: c, allRoles: [c] });
        wnaCount++;
      }
    } else {
      unkeyedCandidates.push(c);
    }
  }

  // Count total company roles
  let totalRoles = 0;
  for (const entry of nikMap.values()) totalRoles += entry.allRoles.filter(r => r.companyName).length;
  for (const entry of passportMap.values()) totalRoles += entry.allRoles.filter(r => r.companyName).length;

  console.log('----------------------------------------------------');
  console.log(' HASIL ANALISIS DRY-RUN:');
  console.log('----------------------------------------------------');
  console.log(` • Total Entri Diekstraksi       : ${candidates.length}`);
  console.log(` • WNI Unik Teridentifikasi (NIK) : ${nikMap.size}`);
  console.log(` • WNA Unik Teridentifikasi (Paspor): ${passportMap.size}`);
  console.log(` • Relasi Peran Perusahaan        : ${totalRoles}`);
  console.log(` • NIK Tidak Standar (<16 digit)  : ${invalidNikCount}`);
  console.log(` • Entri Tanpa NIK/Paspor         : ${unkeyedCandidates.length}`);
  console.log(` • Potensi Konflik Terdeteksi     : ${conflicts.length}`);
  console.log('----------------------------------------------------\n');

  if (conflicts.length > 0) {
    console.log('Contoh Potensi Konflik yang Akan Masuk Karantina:');
    conflicts.slice(0, 5).forEach((cf, idx) => {
      console.log(` [${idx+1}] Tipe: ${cf.type}`);
      console.log(`     Nama: ${cf.existingName || cf.candidateName} vs ${cf.incomingName || '-'}`);
      console.log(`     No ID: ${cf.nikMasked || cf.passportMasked || '-'}`);
      console.log(`     Sumber: ${cf.incomingSource || cf.source}\n`);
    });
  }

  const report = {
    timestamp: new Date().toISOString(),
    backupFile: path.basename(backupFilePath),
    totalCandidates: candidates.length,
    uniqueWniCount: nikMap.size,
    uniqueWnaCount: passportMap.size,
    totalCompanyRoles: totalRoles,
    invalidNikCount,
    unkeyedCandidatesCount: unkeyedCandidates.length,
    conflictsCount: conflicts.length,
    conflicts
  };

  const reportPath = path.resolve(process.cwd(), 'backups', 'dry_run_migration_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Laporan lengkap dry-run disimpan di: ${reportPath}`);

  return report;
}

if (process.argv[1] && process.argv[1].endsWith('dry_run_people_migration.ts')) {
  // Find latest backup file in backups/
  const backupsDir = path.resolve(process.cwd(), 'backups');
  const files = fs.readdirSync(backupsDir)
    .filter(f => f.startsWith('verified_people_backup_') && f.endsWith('.json') && !f.endsWith('.meta.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.error('Tidak ada file backup yang ditemukan di direktori backups/');
    process.exit(1);
  }

  const latestBackup = path.join(backupsDir, files[0]);
  console.log(`Menggunakan file backup terbaru: ${latestBackup}\n`);
  runDryRunMigration(latestBackup).catch(err => {
    console.error('Dry-run gagal:', err);
    process.exit(1);
  });
}
