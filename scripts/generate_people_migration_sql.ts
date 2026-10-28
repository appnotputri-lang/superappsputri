/**
 * People Migration SQL Generator
 * Generates compact, multi-row INSERT SQL statements ready for execution in Cloudflare D1 Console
 * or via Wrangler / Pages Functions.
 *
 * Enforces:
 * - Deterministic UUIDs (no drift on re-runs)
 * - Safe SQLite string escaping
 * - Multi-row INSERT batching (50 rows per statement)
 * - Complete referential integrity (people -> documents -> roles)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { extractAllCandidates } from './dry_run_people_migration';
import { evaluateNameCompatibility, parsePersonName } from '../src/utils/nameResolution';
import { maskNik, maskPassportNumber } from '../src/services/peopleD1Repository';

function deterministicUuid(seed: string): string {
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  // Format as UUID v4-like format: 8-4-4-4-12
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    '8' + hash.substring(17, 20),
    hash.substring(20, 32)
  ].join('-');
}

function escapeSqlString(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

export function generateMigrationData(backupFilePath: string) {
  const rawJson = fs.readFileSync(backupFilePath, 'utf8');
  const backupData = JSON.parse(rawJson);
  const candidates = extractAllCandidates(backupData);

  const nikMap = new Map<string, { primary: any; allRoles: any[] }>();
  const passportMap = new Map<string, { primary: any; allRoles: any[] }>();
  const conflicts: any[] = [];

  for (const c of candidates) {
    if (c.nik) {
      if (c.nik.length !== 16) {
        conflicts.push({
          type: 'INVALID_NIK_LENGTH',
          docType: 'KTP',
          docNumber: c.nik,
          candidateName: c.rawName,
          payload: { name: c.rawName, nikMasked: maskNik(c.nik), issue: 'NIK length is not 16 digits' },
          source: `${c.sourceCollection}/${c.sourceDocId}`
        });
        continue;
      }

      if (nikMap.has(c.nik)) {
        const existing = nikMap.get(c.nik)!;
        const comp = evaluateNameCompatibility(existing.primary.rawName, c.rawName);
        if (comp.spellingMismatch) {
          conflicts.push({
            type: 'NIK_NAME_SPELLING_MISMATCH',
            docType: 'KTP',
            docNumber: c.nik,
            candidateName: c.rawName,
            existingPersonId: deterministicUuid(`WNI:${c.nik}`),
            payload: {
              existingName: existing.primary.rawName,
              incomingName: c.rawName,
              nikMasked: maskNik(c.nik),
              existingSource: `${existing.primary.sourceCollection}/${existing.primary.sourceDocId}`,
              incomingSource: `${c.sourceCollection}/${c.sourceDocId}`
            },
            source: `${c.sourceCollection}/${c.sourceDocId}`
          });
        }
        existing.allRoles.push(c);
      } else {
        nikMap.set(c.nik, { primary: c, allRoles: [c] });
      }
    } else if (c.passport) {
      if (passportMap.has(c.passport)) {
        const existing = passportMap.get(c.passport)!;
        const comp = evaluateNameCompatibility(existing.primary.rawName, c.rawName);
        if (comp.spellingMismatch) {
          conflicts.push({
            type: 'PASSPORT_NAME_SPELLING_MISMATCH',
            docType: 'PASSPORT',
            docNumber: c.passport,
            candidateName: c.rawName,
            existingPersonId: deterministicUuid(`WNA:${c.passport}`),
            payload: {
              existingName: existing.primary.rawName,
              incomingName: c.rawName,
              passportMasked: maskPassportNumber(c.passport),
              existingSource: `${existing.primary.sourceCollection}/${existing.primary.sourceDocId}`,
              incomingSource: `${c.sourceCollection}/${c.sourceDocId}`
            },
            source: `${c.sourceCollection}/${c.sourceDocId}`
          });
        }
        existing.allRoles.push(c);
      } else {
        passportMap.set(c.passport, { primary: c, allRoles: [c] });
      }
    }
  }

  const now = new Date().toISOString();
  const peopleRows: any[] = [];
  const docRows: any[] = [];
  const roleRows: any[] = [];
  const conflictRows: any[] = [];

  // 1. Process WNI
  for (const [nik, entry] of nikMap.entries()) {
    const p = entry.primary;
    const personId = deterministicUuid(`WNI:${nik}`);
    const parsed = parsePersonName(p.rawName);

    peopleRows.push({
      person_id: personId,
      nik: nik,
      identity_status: 'PROVISIONAL',
      nationality_type: 'WNI',
      nationality: 'INDONESIA',
      salutation: parsed.detectedTitles.length > 0 ? parsed.detectedTitles.join(', ') : null,
      name: parsed.normalizedBaseName || p.rawName.toUpperCase(),
      birth_city: p.birthCity || null,
      birth_date: p.birthDate || null,
      occupation: p.occupation || null,
      full_address: p.fullAddress || null,
      rt: p.rt || null,
      rw: p.rw || null,
      kelurahan: p.kelurahan || null,
      kecamatan: p.kecamatan || null,
      city: p.city || null,
      province: p.province || null,
      postal_code: p.postalCode || null,
      npwp: p.npwp || null,
      raw_data: JSON.stringify({ originalName: p.rawName, source: `${p.sourceCollection}/${p.sourceDocId}` }),
      created_at: now,
      updated_at: now
    });

    docRows.push({
      id: deterministicUuid(`${personId}:KTP`),
      person_id: personId,
      doc_type: 'KTP',
      doc_number: nik,
      issuing_country: 'IDN',
      issue_date: null,
      expiry_date: null,
      is_active: 1,
      verified_status: 'PROVISIONAL',
      verified_by_uid: null,
      verified_at: null,
      notes: 'Migrated from Firestore profiles',
      created_at: now,
      updated_at: now
    });

    // Roles
    const seenRoleKey = new Set<string>();
    for (const r of entry.allRoles) {
      if (!r.companyName) continue;
      const roleKey = `${r.sourceDocId}:${r.roleCategory}:${r.positionTitle}`;
      if (seenRoleKey.has(roleKey)) continue;
      seenRoleKey.add(roleKey);

      roleRows.push({
        id: deterministicUuid(`${personId}:${roleKey}`),
        person_id: personId,
        company_id: r.sourceDocId,
        client_type: 'CORPORATE',
        company_name: r.companyName,
        role_category: r.roleCategory,
        position_title: r.positionTitle || r.roleCategory,
        source_record_id: `${r.sourceCollection}/${r.sourceDocId}`,
        updated_at: now
      });
    }
  }

  // 2. Process WNA
  for (const [passport, entry] of passportMap.entries()) {
    const p = entry.primary;
    const personId = deterministicUuid(`WNA:${passport}`);
    const parsed = parsePersonName(p.rawName);

    peopleRows.push({
      person_id: personId,
      nik: null,
      identity_status: 'PROVISIONAL',
      nationality_type: 'WNA',
      nationality: p.nationality || 'WNA',
      salutation: parsed.detectedTitles.length > 0 ? parsed.detectedTitles.join(', ') : null,
      name: parsed.normalizedBaseName || p.rawName.toUpperCase(),
      birth_city: p.birthCity || null,
      birth_date: p.birthDate || null,
      occupation: p.occupation || null,
      full_address: p.fullAddress || null,
      rt: p.rt || null,
      rw: p.rw || null,
      kelurahan: p.kelurahan || null,
      kecamatan: p.kecamatan || null,
      city: p.city || null,
      province: p.province || null,
      postal_code: p.postalCode || null,
      npwp: p.npwp || null,
      raw_data: JSON.stringify({ originalName: p.rawName, source: `${p.sourceCollection}/${p.sourceDocId}` }),
      created_at: now,
      updated_at: now
    });

    docRows.push({
      id: deterministicUuid(`${personId}:PASSPORT:${passport}`),
      person_id: personId,
      doc_type: 'PASSPORT',
      doc_number: passport,
      issuing_country: p.nationality || 'WNA',
      issue_date: null,
      expiry_date: null,
      is_active: 1,
      verified_status: 'PROVISIONAL',
      verified_by_uid: null,
      verified_at: null,
      notes: 'Initial passport migration from Firestore profiles',
      created_at: now,
      updated_at: now
    });

    // Roles
    const seenRoleKey = new Set<string>();
    for (const r of entry.allRoles) {
      if (!r.companyName) continue;
      const roleKey = `${r.sourceDocId}:${r.roleCategory}:${r.positionTitle}`;
      if (seenRoleKey.has(roleKey)) continue;
      seenRoleKey.add(roleKey);

      roleRows.push({
        id: deterministicUuid(`${personId}:${roleKey}`),
        person_id: personId,
        company_id: r.sourceDocId,
        client_type: 'CORPORATE',
        company_name: r.companyName,
        role_category: r.roleCategory,
        position_title: r.positionTitle || r.roleCategory,
        source_record_id: `${r.sourceCollection}/${r.sourceDocId}`,
        updated_at: now
      });
    }
  }

  // 3. Process Conflicts
  for (let idx = 0; idx < conflicts.length; idx++) {
    const cf = conflicts[idx];
    conflictRows.push({
      conflict_id: deterministicUuid(`CONFLICT:${idx}:${cf.type}:${cf.docNumber}`),
      doc_type: cf.docType || 'KTP',
      doc_number: cf.docNumber || null,
      conflict_type: cf.type,
      existing_person_id: cf.existingPersonId || null,
      incoming_payload: JSON.stringify(cf.payload),
      incoming_source: cf.source,
      resolution_status: 'PENDING',
      resolved_by_uid: null,
      resolved_by_role: null,
      resolution_notes: null,
      created_at: now,
      resolved_at: null
    });
  }

  return {
    peopleRows,
    docRows,
    roleRows,
    conflictRows
  };
}

export function buildMultiRowInserts(tableName: string, columns: string[], rows: any[], batchSize = 50): string[] {
  const statements: string[] = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const valueTuples = chunk.map(row => {
      const values = columns.map(col => escapeSqlString(row[col]));
      return `(${values.join(', ')})`;
    });

    const sql = `INSERT OR IGNORE INTO ${tableName} (${columns.join(', ')}) VALUES\n${valueTuples.join(',\n')};`;
    statements.push(sql);
  }
  return statements;
}

if (process.argv[1] && process.argv[1].endsWith('generate_people_migration_sql.ts')) {
  const backupsDir = path.resolve(process.cwd(), 'backups');
  const files = fs.readdirSync(backupsDir)
    .filter(f => f.startsWith('verified_people_backup_') && f.endsWith('.json') && !f.endsWith('.meta.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.error('Tidak ada file backup yang ditemukan');
    process.exit(1);
  }

  const backupFile = path.join(backupsDir, files[0]);
  console.log(`Mengolah file: ${backupFile}`);

  const { peopleRows, docRows, roleRows, conflictRows } = generateMigrationData(backupFile);
  console.log(`- People Records: ${peopleRows.length}`);
  console.log(`- Identity Documents: ${docRows.length}`);
  console.log(`- Company Roles: ${roleRows.length}`);
  console.log(`- Conflicts Quarantined: ${conflictRows.length}`);

  const peopleCols = ['person_id', 'nik', 'identity_status', 'nationality_type', 'nationality', 'salutation', 'name', 'birth_city', 'birth_date', 'occupation', 'full_address', 'rt', 'rw', 'kelurahan', 'kecamatan', 'city', 'province', 'postal_code', 'npwp', 'raw_data', 'created_at', 'updated_at'];
  const docCols = ['id', 'person_id', 'doc_type', 'doc_number', 'issuing_country', 'issue_date', 'expiry_date', 'is_active', 'verified_status', 'verified_by_uid', 'verified_at', 'notes', 'created_at', 'updated_at'];
  const roleCols = ['id', 'person_id', 'company_id', 'client_type', 'company_name', 'role_category', 'position_title', 'source_record_id', 'updated_at'];
  const conflictCols = ['conflict_id', 'doc_type', 'doc_number', 'conflict_type', 'existing_person_id', 'incoming_payload', 'incoming_source', 'resolution_status', 'resolved_by_uid', 'resolved_by_role', 'resolution_notes', 'created_at', 'resolved_at'];

  const peopleSql = buildMultiRowInserts('people', peopleCols, peopleRows);
  const docSql = buildMultiRowInserts('person_identity_documents', docCols, docRows);
  const roleSql = buildMultiRowInserts('company_person_roles', roleCols, roleRows);
  const conflictSql = buildMultiRowInserts('people_migration_conflicts', conflictCols, conflictRows);

  const outDir = path.resolve(process.cwd(), 'backups', 'migration_sql');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, '01_people.sql'), peopleSql.join('\n\n'), 'utf8');
  fs.writeFileSync(path.join(outDir, '02_documents.sql'), docSql.join('\n\n'), 'utf8');
  fs.writeFileSync(path.join(outDir, '03_company_roles.sql'), roleSql.join('\n\n'), 'utf8');
  fs.writeFileSync(path.join(outDir, '04_conflicts.sql'), conflictSql.join('\n\n'), 'utf8');

  // Also write single combined file
  const allSql = [
    '-- ==========================================',
    '-- PEOPLE CENTRALIZATION DATA BACKFILL',
    '-- ==========================================',
    '',
    '-- 1. PEOPLE (179 ROWS)',
    ...peopleSql,
    '',
    '-- 2. DOCUMENTS (179 ROWS)',
    ...docSql,
    '',
    '-- 3. COMPANY ROLES',
    ...roleSql,
    '',
    '-- 4. CONFLICTS (28 ROWS)',
    ...conflictSql
  ].join('\n');

  fs.writeFileSync(path.join(outDir, 'complete_people_data_migration.sql'), allSql, 'utf8');
  console.log(`\nFile SQL migrasi berhasil dibuat di direktori: ${outDir}`);
}
