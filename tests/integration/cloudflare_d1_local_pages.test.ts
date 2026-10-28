/**
 * Integration Test: Cloudflare Pages Functions with D1 Binding (Local Simulation)
 * Notaris Putri Office System (Superapps Putri)
 *
 * KATEGORI PENGUJIAN: CLOUDFLARE D1 LOKAL (Pages Functions Handler + D1 Binding + HTTP Request/Response).
 *
 * Verifies that:
 * 1. Cloudflare Pages Function handlers accept context.env.DB directly.
 * 2. Missing env.DB returns HTTP 500 (D1BindingError).
 * 3. Missing/invalid Bearer token returns HTTP 401 with sanitized error message.
 * 4. Server-side RBAC denies Staff on admin-only endpoints (HTTP 403).
 * 5. Admin role successfully verifies identity (HTTP 200).
 * 6. Passport renewal operates atomically via onRequestPost.
 * 7. Duplicate/colliding passport renewals return HTTP 409 Conflict.
 */

process.env.NODE_ENV = 'test';

import assert from 'assert';
import { DatabaseSync } from 'node:sqlite';
import { ensureD1TablesExist } from '../../src/services/d1MigrationService';
import { PeopleD1Repository } from '../../src/services/peopleD1Repository';

// Import Cloudflare Pages Function Handlers directly
import { onRequestGet as getPeople, onRequestPost as createPerson } from '../../functions/api/v2/people/index';
import { onRequestGet as getPersonDetail } from '../../functions/api/v2/people/[personId]';
import { onRequestPost as renewPassport } from '../../functions/api/v2/people/[personId]/passport/renew';
import { onRequestPost as verifyIdentity } from '../../functions/api/v2/people/verify-identity';
import { onRequestGet as getConflicts } from '../../functions/api/v2/people/conflicts/index';

/**
 * Creates an isolated SQLite-backed D1 adapter
 */
function createLocalD1() {
  const sqlite = new DatabaseSync(':memory:');
  const d1: any = {
    _sqlite: sqlite,
    prepare: (sql: string) => {
      let boundArgs: any[] = [];
      const stmtObj: any = {
        _rawSql: sql,
        bind: (...args: any[]) => {
          boundArgs = args.map(a => a === undefined ? null : a);
          return stmtObj;
        },
        _getArgs: () => boundArgs,
        first: async (col?: string) => {
          const stmt = sqlite.prepare(sql);
          const row: any = stmt.get(...boundArgs);
          if (!row) return null;
          return col ? row[col] : row;
        },
        get: async () => {
          const stmt = sqlite.prepare(sql);
          return stmt.get(...boundArgs) || null;
        },
        all: async () => {
          const stmt = sqlite.prepare(sql);
          const results = stmt.all(...boundArgs);
          return { results, success: true };
        },
        run: async () => {
          const stmt = sqlite.prepare(sql);
          const info = stmt.run(...boundArgs);
          return { success: true, meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid) } };
        }
      };
      return stmtObj;
    },
    batch: async (statements: any[]) => {
      sqlite.exec("BEGIN TRANSACTION");
      try {
        const results = [];
        for (const s of statements) {
          const sql = s._rawSql;
          const args = s._getArgs();
          const prepared = sqlite.prepare(sql);
          results.push(prepared.run(...args));
        }
        sqlite.exec("COMMIT");
        return results;
      } catch (err) {
        sqlite.exec("ROLLBACK");
        throw err;
      }
    },
    exec: async (query: string) => {
      sqlite.exec(query);
      return { count: 1, duration: 0 };
    }
  };
  return d1;
}

async function runLocalCloudflarePagesIntegrationTests() {
  console.log('================================================================');
  console.log(' PENGUJIAN INTEGRASI CLOUDFLARE D1 LOKAL (PAGES FUNCTIONS)     ');
  console.log('================================================================\n');

  const db = createLocalD1();
  await ensureD1TablesExist(db);

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => Promise<void>) {
    total++;
    try {
      await fn();
      passed++;
      console.log(`✅ [LULUS] ${name}`);
    } catch (err: any) {
      console.error(`❌ [GAGAL] ${name}: ${err.message}`);
      throw err;
    }
  }

  // 1. Missing Authorization header
  await test('Handler Pages: Request tanpa Authorization header mengembalikan HTTP 401', async () => {
    const req = new Request('https://notarisputri.com/api/v2/people', { method: 'GET' });
    const context = { request: req, env: { DB: db } };
    const res: Response = await getPeople(context);
    assert.strictEqual(res.status, 401, 'Harus 401 Unauthorized');
    const body: any = await res.json();
    assert.strictEqual(body.error, 'Missing or invalid Authorization header');
  });

  // 2. Invalid Token Format without Test Auth User
  await test('Handler Pages: Token tidak valid ditolak HTTP 401 dengan pesan tersanitasi', async () => {
    const req = new Request('https://notarisputri.com/api/v2/people', {
      method: 'GET',
      headers: { Authorization: 'Bearer invalid_garbage_token' }
    });
    const context = { request: req, env: { DB: db } }; // No TEST_AUTH_USER
    const res: Response = await getPeople(context);
    assert.strictEqual(res.status, 401, 'Harus 401');
    const body: any = await res.json();
    assert.strictEqual(body.error, 'Unauthorized: Invalid or expired authentication token');
  });

  // 3. Missing env.DB in Cloudflare context
  await test('Handler Pages: Cloudflare context tanpa env.DB mengembalikan HTTP 500 (D1BindingError)', async () => {
    const req = new Request('https://notarisputri.com/api/v2/people', {
      method: 'GET',
      headers: { Authorization: 'Bearer mock_valid_bearer' }
    });
    // Missing env.DB, with authenticated Staff user
    const context = {
      request: req,
      env: { TEST_AUTH_USER: { uid: 'staff-01', role: 'Staff' } }
    };
    const res: Response = await getPeople(context);
    assert.strictEqual(res.status, 500, 'Harus 500 Server Error jika env.DB tidak ada');
    const body: any = await res.json();
    assert.ok(body.error.includes('env.DB'), 'Pesan error harus menyebut ketiadaan env.DB');
  });

  // 4. User without role assigned
  await test('Handler Pages: User tanpa role yang terdaftar ditolak dengan HTTP 403 Forbidden', async () => {
    const req = new Request('https://notarisputri.com/api/v2/people', {
      method: 'GET',
      headers: { Authorization: 'Bearer mock_valid_bearer' }
    });
    const context = {
      request: req,
      env: {
        DB: db,
        TEST_AUTH_USER: { uid: 'unassigned-user' } // role is undefined!
      }
    };
    const res: Response = await getPeople(context);
    assert.strictEqual(res.status, 403, 'Harus 403 Forbidden untuk user tanpa role');
    const body: any = await res.json();
    assert.ok(body.error.includes('FORBIDDEN'), 'Harus berisi penolakan FORBIDDEN');
  });

  // 5. Staff trying to verify identity
  await test('Handler Pages: Staff dilarang memverifikasi identitas (HTTP 403)', async () => {
    const req = new Request('https://notarisputri.com/api/v2/people/verify-identity', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer mock_valid_bearer',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ personId: 'pers-test-01', notes: 'Verified by staff' })
    });
    const context = {
      request: req,
      env: {
        DB: db,
        TEST_AUTH_USER: { uid: 'staff-01', role: 'Staff' }
      }
    };
    const res: Response = await verifyIdentity(context);
    assert.strictEqual(res.status, 403, 'Staff wajib ditolak memverifikasi identitas');
  });

  // 6. Create WNA Person via Pages Function POST
  let createdPersonId = '';
  await test('Handler Pages: POST /api/v2/people berhasil mendaftarkan WNA dan paspor awal', async () => {
    const req = new Request('https://notarisputri.com/api/v2/people', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer mock_valid_bearer',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'JEAN DUPONT',
        nationalityType: 'WNA',
        nationality: 'FRANCE',
        passportNumber: 'FR998877A',
        issuingCountry: 'FRANCE'
      })
    });
    const context = {
      request: req,
      env: {
        DB: db,
        TEST_AUTH_USER: { uid: 'staff-01', role: 'Staff' }
      }
    };
    const res: Response = await createPerson(context);
    assert.strictEqual(res.status, 200, 'Harus berhasil 200');
    const body: any = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.personId, 'Harus mengembalikan personId');
    createdPersonId = body.personId;
  });

  // 7. Admin Verifies Identity
  await test('Handler Pages: Admin berhasil memverifikasi status orang menjadi VERIFIED', async () => {
    const req = new Request('https://notarisputri.com/api/v2/people/verify-identity', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer mock_valid_bearer',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ personId: createdPersonId, notes: 'Dokumen paspor asli diperiksa di kantor notaris' })
    });
    const context = {
      request: req,
      env: {
        DB: db,
        TEST_AUTH_USER: { uid: 'admin-01', role: 'Admin' }
      }
    };
    const res: Response = await verifyIdentity(context);
    assert.strictEqual(res.status, 200, 'Admin harus berhasil memverifikasi');
    const body: any = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.identityStatus, 'VERIFIED');
  });

  // 8. Atomic Passport Renewal via Pages Function POST
  await test('Handler Pages: Perpanjangan paspor WNA berjalan atomik dan mengarsipkan paspor lama', async () => {
    const req = new Request(`https://notarisputri.com/api/v2/people/${createdPersonId}/passport/renew`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer mock_valid_bearer',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        newPassportNumber: 'FR998877B',
        issuingCountry: 'FRANCE',
        notes: 'Perpanjangan paspor habis masa berlaku'
      })
    });
    const context = {
      request: req,
      env: {
        DB: db,
        TEST_AUTH_USER: { uid: 'staff-01', role: 'Staff' }
      },
      params: { personId: createdPersonId }
    };
    const res: Response = await renewPassport(context);
    assert.strictEqual(res.status, 200, 'Pembaruan paspor harus sukses');
    const body: any = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.personId, createdPersonId);

    // Verify document records in DB: 1 active (FR998877B), 1 inactive (FR998877A)
    const docs = await PeopleD1Repository.getPersonDocuments(db, createdPersonId);
    assert.strictEqual(docs.length, 2, 'Harus ada 2 dokumen');
    const activeDoc = docs.find(d => d.isActive);
    const oldDoc = docs.find(d => !d.isActive);
    assert.strictEqual(activeDoc?.docNumber, 'FR998877B');
    assert.strictEqual(oldDoc?.docNumber, 'FR998877A');
  });

  // 9. Passport Renewal Conflict Detection via Pages Function
  await test('Handler Pages: Percobaan pembaruan paspor yang aktif milik orang lain ditolak (HTTP 409 Conflict)', async () => {
    // Create Person 2
    const createReq = new Request('https://notarisputri.com/api/v2/people', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer mock_valid_bearer',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'HANS MULLER',
        nationalityType: 'WNA',
        nationality: 'GERMANY'
      })
    });
    const createRes: any = await (await createPerson({
      request: createReq,
      env: {
        DB: db,
        TEST_AUTH_USER: { uid: 'staff-01', role: 'Staff' }
      }
    })).json();
    const personId2 = createRes.personId;

    // Try to renew Person 2's passport using Person 1's currently active passport (FR998877B)
    const renewReq = new Request(`https://notarisputri.com/api/v2/people/${personId2}/passport/renew`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer mock_valid_bearer',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        newPassportNumber: 'FR998877B', // Belongs to Jean Dupont!
        issuingCountry: 'FRANCE'
      })
    });
    const context = {
      request: renewReq,
      env: {
        DB: db,
        TEST_AUTH_USER: { uid: 'staff-01', role: 'Staff' }
      },
      params: { personId: personId2 }
    };
    const renewRes: Response = await renewPassport(context);
    assert.strictEqual(renewRes.status, 409, 'Wajib ditolak dengan HTTP 409 Conflict');
    const renewBody: any = await renewRes.json();
    assert.ok(renewBody.error.includes('PASSPORT_COLLISION'), 'Pesan error harus mengidentifikasi tabrakan paspor');

    // Verify conflict logged in DB with masked payload
    const conflicts = await PeopleD1Repository.getConflicts(db, { uid: 'admin-01', role: 'Admin' });
    assert.ok(conflicts.length > 0, 'Harus tercatat di tabel konflik');
    const passportConflict = conflicts.find((c: any) => c.docNumber === 'FR998877B');
    assert.ok(passportConflict, 'Konflik paspor harus tercatat');
    assert.strictEqual(passportConflict.conflictType, 'CROSS_PERSON_PASSPORT_COLLISION');
  });

  // 10. Admin lists conflicts via Pages Function GET
  await test('Handler Pages: Admin dapat melihat daftar antrean konflik via GET /api/v2/people/conflicts', async () => {
    const req = new Request('https://notarisputri.com/api/v2/people/conflicts', {
      method: 'GET',
      headers: { Authorization: 'Bearer mock_valid_bearer' }
    });
    const context = {
      request: req,
      env: {
        DB: db,
        TEST_AUTH_USER: { uid: 'admin-01', role: 'Admin' }
      }
    };
    const res: Response = await getConflicts(context);
    assert.strictEqual(res.status, 200);
    const body: any = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.conflicts));
  });

  console.log(`\n================================================================`);
  console.log(` HASIL PENGUJIAN INTEGRASI CLOUDFLARE D1 LOKAL: ${passed} / ${total} LULUS (100%)`);
  console.log(`================================================================\n`);
}

runLocalCloudflarePagesIntegrationTests().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
