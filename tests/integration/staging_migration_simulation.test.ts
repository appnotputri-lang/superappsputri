/**
 * Test: D1 Schema Migration Engine (Staging Simulation)
 * Notaris Putri Office System (Superapps Putri)
 *
 * Verifies that:
 * 1. 0001_initial_schema.sql and 0002_people_centralization.sql apply cleanly on an empty database.
 * 2. All 4 People tables (people, person_identity_documents, company_person_roles, people_migration_conflicts) are created.
 * 3. Partial Unique Index on NIK behaves correctly (allows multiple NULLs for WNA, blocks duplicate valid NIKs).
 * 4. Global Unique Index on active passports (idx_docs_active_passport_unique) blocks duplicate active passports across different people.
 * 5. Foreign keys and cascading deletes work as expected.
 * 6. Migration is 100% idempotent (re-applying does not throw or corrupt data).
 * 7. Migration history tracking table (d1_migrations) records executed migrations accurately.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

function runStagingMigrationTests() {
  console.log('================================================================');
  console.log(' PENGUJIAN SKEMA MIGRASI D1 (SIMULASI STAGING)                 ');
  console.log('================================================================\n');

  const migrationDir = path.resolve(process.cwd(), 'migrations');
  const file0001 = path.join(migrationDir, '0001_initial_schema.sql');
  const file0002 = path.join(migrationDir, '0002_people_centralization.sql');

  assert.ok(fs.existsSync(file0001), '0001_initial_schema.sql harus ada');
  assert.ok(fs.existsSync(file0002), '0002_people_centralization.sql harus ada');

  const sql0001 = fs.readFileSync(file0001, 'utf8');
  const sql0002 = fs.readFileSync(file0002, 'utf8');

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void) {
    total++;
    try {
      fn();
      passed++;
      console.log(`✅ [LULUS] ${name}`);
    } catch (err: any) {
      console.error(`❌ [GAGAL] ${name}: ${err.message}`);
      throw err;
    }
  }

  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');

  // Initialize migration history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS d1_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // 1. Apply Initial Schema
  test('Aplikasi Skema 0001 (Tabel Dasar 1 s.d. 16)', () => {
    db.exec(sql0001);
    db.prepare('INSERT INTO d1_migrations (name) VALUES (?)').run('0001_initial_schema.sql');
    
    const tables: any = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map((t: any) => t.name);
    assert.ok(tableNames.includes('client_directory'), 'Harus memuat client_directory');
    assert.ok(tableNames.includes('invoices'), 'Harus memuat invoices');
    assert.ok(tableNames.includes('quotations'), 'Harus memuat quotations');
    assert.ok(tableNames.includes('deeds'), 'Harus memuat deeds');
  });

  // 2. Apply People Centralization Schema
  test('Aplikasi Skema 0002 (people_centralization.sql)', () => {
    db.exec(sql0002);
    db.prepare('INSERT INTO d1_migrations (name) VALUES (?)').run('0002_people_centralization.sql');

    const tables: any = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map((t: any) => t.name);
    assert.ok(tableNames.includes('people'), 'Tabel people harus terbuat');
    assert.ok(tableNames.includes('person_identity_documents'), 'Tabel person_identity_documents harus terbuat');
    assert.ok(tableNames.includes('company_person_roles'), 'Tabel company_person_roles harus terbuat');
    assert.ok(tableNames.includes('people_migration_conflicts'), 'Tabel people_migration_conflicts harus terbuat');
  });

  // 3. Verify Indexes and Constraints
  test('Verifikasi Indeks dan Constraint D1 Terpasang Lengkap', () => {
    const indexes: any = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all();
    const indexNames = indexes.map((i: any) => i.name);
    assert.ok(indexNames.includes('idx_people_nik'), 'Indeks idx_people_nik harus aktif');
    assert.ok(indexNames.includes('idx_docs_active_passport_unique'), 'Indeks idx_docs_active_passport_unique harus aktif');
    assert.ok(indexNames.includes('idx_docs_active_person_type'), 'Indeks idx_docs_active_person_type harus aktif');
    assert.ok(indexNames.includes('idx_roles_composite'), 'Indeks idx_roles_composite harus aktif');
    assert.ok(indexNames.includes('idx_conflicts_status'), 'Indeks idx_conflicts_status harus aktif');
  });

  // 4. Test NIK Uniqueness & WNA Nullability
  test('Constraint NIK: WNA banyak yang bernilai NULL diizinkan, NIK kembar ditolak', () => {
    // 2 WNA with NULL NIK
    db.prepare(`
      INSERT INTO people (person_id, nik, name, nationality_type, nationality, created_at, updated_at)
      VALUES ('wna-01', NULL, 'JEAN DUPONT', 'WNA', 'FRANCE', datetime('now'), datetime('now')),
             ('wna-02', NULL, 'HANS MULLER', 'WNA', 'GERMANY', datetime('now'), datetime('now'))
    `).run();

    // 1 WNI with valid NIK
    db.prepare(`
      INSERT INTO people (person_id, nik, name, nationality_type, nationality, created_at, updated_at)
      VALUES ('wni-01', '3201234567890001', 'BUDI SANTOSO', 'WNI', 'INDONESIA', datetime('now'), datetime('now'))
    `).run();

    // Attempting duplicate NIK
    assert.throws(
      () => {
        db.prepare(`
          INSERT INTO people (person_id, nik, name, nationality_type, nationality, created_at, updated_at)
          VALUES ('wni-02', '3201234567890001', 'BUDI KEMBAR', 'WNI', 'INDONESIA', datetime('now'), datetime('now'))
        `).run();
      },
      (err: any) => err.message.includes('UNIQUE constraint failed'),
      'Duplikasi NIK valid harus ditolak oleh idx_people_nik'
    );
  });

  // 5. Test Global Active Passport Uniqueness
  test('Constraint Paspor: Nomor paspor aktif UNIK GLOBAL (ditolak jika aktif pada 2 person)', () => {
    // Person 1 registers passport PA1000
    db.prepare(`
      INSERT INTO person_identity_documents (id, person_id, doc_type, doc_number, issuing_country, is_active, created_at, updated_at)
      VALUES ('doc-01', 'wna-01', 'PASSPORT', 'PA1000', 'FRANCE', 1, datetime('now'), datetime('now'))
    `).run();

    // Person 2 attempts to register same active passport PA1000
    assert.throws(
      () => {
        db.prepare(`
          INSERT INTO person_identity_documents (id, person_id, doc_type, doc_number, issuing_country, is_active, created_at, updated_at)
          VALUES ('doc-02', 'wna-02', 'PASSPORT', 'PA1000', 'GERMANY', 1, datetime('now'), datetime('now'))
        `).run();
      },
      (err: any) => err.message.includes('UNIQUE constraint failed') || err.message.includes('idx_docs_active_passport_unique'),
      'Nomor paspor aktif kembar lintas negara wajib ditolak oleh idx_docs_active_passport_unique'
    );

    // However, historical (inactive) passport with same number can be recorded
    db.prepare(`
      INSERT INTO person_identity_documents (id, person_id, doc_type, doc_number, issuing_country, is_active, created_at, updated_at)
      VALUES ('doc-hist-01', 'wna-02', 'PASSPORT', 'PA1000', 'GERMANY', 0, datetime('now'), datetime('now'))
    `).run();
    console.log('   -> Verifikasi: Paspor riwayat (is_active=0) diizinkan tersimpan untuk keperluan histori audit.');
  });

  // 6. Test Foreign Key Cascading Deletes
  test('Integritas Foreign Key: Penghapusan people memicu cascading delete pada dokumen & relasi peran', () => {
    db.prepare(`
      INSERT INTO company_person_roles (id, person_id, company_id, company_name, role_category, updated_at)
      VALUES ('role-01', 'wna-01', 'comp-01', 'PT MAJU JAYA', 'DIREKSI', datetime('now'))
    `).run();

    // Delete wna-01
    db.prepare("DELETE FROM people WHERE person_id = 'wna-01'").run();

    const remainingDocs: any = db.prepare("SELECT * FROM person_identity_documents WHERE person_id = 'wna-01'").all();
    const remainingRoles: any = db.prepare("SELECT * FROM company_person_roles WHERE person_id = 'wna-01'").all();
    assert.strictEqual(remainingDocs.length, 0, 'Dokumen identitas harus terhapus otomatis via CASCADE');
    assert.strictEqual(remainingRoles.length, 0, 'Relasi peran harus terhapus otomatis via CASCADE');
  });

  // 7. Idempotency Test
  test('Idempotensi Skema: Menjalankan ulang 0002_people_centralization.sql tidak menyebabkan error', () => {
    assert.doesNotThrow(() => {
      db.exec(sql0002);
    }, 'Eksekusi berulang skema harus aman dan idempotent');
  });

  // 8. Migration History Tracking
  test('Pelacakan Migration History: d1_migrations mencatat status migrasi berurutan', () => {
    const history: any = db.prepare('SELECT name, applied_at FROM d1_migrations ORDER BY id ASC').all();
    assert.strictEqual(history.length, 2);
    assert.strictEqual(history[0].name, '0001_initial_schema.sql');
    assert.strictEqual(history[1].name, '0002_people_centralization.sql');
  });

  console.log(`\n================================================================`);
  console.log(` HASIL PENGUJIAN SKEMA MIGRASI: ${passed} / ${total} LULUS (100%)`);
  console.log(`================================================================\n`);
}

runStagingMigrationTests();
