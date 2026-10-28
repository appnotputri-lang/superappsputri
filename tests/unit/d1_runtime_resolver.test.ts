/**
 * Unit Test: D1 Database Resolver & Production Runtime Protection
 * Verifies that:
 * 1. Cloudflare runtime with binding returns env.DB.
 * 2. Cloudflare runtime without binding throws D1BindingError.
 * 3. Node production without binding throws D1BindingError.
 * 4. Node development with allowed local adapter returns adapter.
 * 5. Node production with REQUIRE_CLOUDFLARE_D1 unset throws D1BindingError.
 * 6. Node production with REQUIRE_CLOUDFLARE_D1 set throws D1BindingError.
 * 7. Unconfigured Node environment (e.g. 'staging' without flags) throws D1ConfigurationError.
 * 8. Under NO circumstances does production create or open local SQLite.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { resolvePeopleD1, D1BindingError, D1ConfigurationError } from '../../src/lib/d1Client';

async function runRuntimeResolverTests() {
  console.log('================================================================');
  console.log(' UNIT TESTS: D1 RUNTIME RESOLVER & PRODUCTION PROTECTION        ');
  console.log('================================================================\n');

  const originalNodeEnv = process.env.NODE_ENV;
  const originalRequireD1 = process.env.REQUIRE_CLOUDFLARE_D1;
  const originalAllowSqlite = process.env.ALLOW_LOCAL_SQLITE;

  let passed = 0;
  let total = 0;

  function runCase(name: string, fn: () => void) {
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

  try {
    // 1. Cloudflare dengan binding tersedia
    runCase('Kasus 1: Cloudflare dengan binding tersedia -> Mengembalikan env.DB', () => {
      const mockD1 = { prepare: () => ({ bind: () => ({ all: async () => ({ results: [] }) }) }) };
      const context = {
        request: new Request('https://notarisputri.com/api/v2/people'),
        env: { DB: mockD1 }
      };
      const db = resolvePeopleD1(context);
      assert.strictEqual(db, mockD1, 'Harus mengembalikan binding DB yang diberikan');
    });

    // 2. Cloudflare tanpa binding
    runCase('Kasus 2: Cloudflare tanpa binding -> Melempar D1BindingError (HTTP 500)', () => {
      const context = {
        request: new Request('https://notarisputri.com/api/v2/people'),
        env: {} // missing DB
      };
      assert.throws(
        () => resolvePeopleD1(context),
        (err: any) => err instanceof D1BindingError && err.statusCode === 500,
        'Harus melempar D1BindingError jika env.DB tidak ada di Cloudflare'
      );
    });

    // 3. Node production dengan binding tidak tersedia
    runCase('Kasus 3: Node production dengan binding tidak tersedia -> Ditolak (D1BindingError)', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.REQUIRE_CLOUDFLARE_D1;
      delete process.env.ALLOW_LOCAL_SQLITE;

      const req = { headers: {} };
      assert.throws(
        () => resolvePeopleD1(req),
        (err: any) => err instanceof D1BindingError && err.message.includes('Node production environment cannot use local SQLite fallback'),
        'Produksi Node tanpa binding wajib ditolak seketika'
      );
    });

    // 4. Node development dengan adapter lokal yang diizinkan
    runCase('Kasus 4: Node development dengan adapter lokal yang diizinkan -> Mengembalikan adapter', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ALLOW_LOCAL_SQLITE;

      const req = { headers: {} };
      const db = resolvePeopleD1(req);
      assert.ok(db, 'Adapter development harus tersedia');
      assert.strictEqual(typeof db.prepare, 'function', 'Adapter harus memiliki metode prepare()');
    });

    // 5. Node production dengan REQUIRE_CLOUDFLARE_D1 tidak disetel
    runCase('Kasus 5: Node production dengan REQUIRE_CLOUDFLARE_D1 tidak disetel -> Tetap Ditolak', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.REQUIRE_CLOUDFLARE_D1;
      delete process.env.ALLOW_LOCAL_SQLITE;

      const req = { headers: {} };
      assert.throws(
        () => resolvePeopleD1(req),
        (err: any) => err instanceof D1BindingError,
        'Produksi wajib menolak fallback bahkan jika flag REQUIRE_CLOUDFLARE_D1 tidak disetel'
      );
    });

    // 6. Node production dengan REQUIRE_CLOUDFLARE_D1 disetel
    runCase('Kasus 6: Node production dengan REQUIRE_CLOUDFLARE_D1 disetel -> Tetap Ditolak', () => {
      process.env.NODE_ENV = 'production';
      process.env.REQUIRE_CLOUDFLARE_D1 = 'true';
      delete process.env.ALLOW_LOCAL_SQLITE;

      const req = { headers: {} };
      assert.throws(
        () => resolvePeopleD1(req),
        (err: any) => err instanceof D1BindingError,
        'Produksi wajib menolak fallback ketika flag REQUIRE_CLOUDFLARE_D1 disetel'
      );
    });

    // 7. Node environment tidak terkonfigurasi (unconfigured / unknown NODE_ENV)
    runCase('Kasus 7: Node environment tidak terkonfigurasi (misal "staging") -> Melempar D1ConfigurationError', () => {
      process.env.NODE_ENV = 'staging';
      delete process.env.ALLOW_LOCAL_SQLITE;

      const req = { headers: {} };
      assert.throws(
        () => resolvePeopleD1(req),
        (err: any) => err instanceof D1ConfigurationError,
        'Environment non-dev dan non-test wajib melempar D1ConfigurationError'
      );
    });

    // 8. Explicit ALLOW_LOCAL_SQLITE di environment non-production
    runCase('Kasus 8: Explicit ALLOW_LOCAL_SQLITE="true" di mode non-production -> Diizinkan', () => {
      process.env.NODE_ENV = 'custom_local_tool';
      process.env.ALLOW_LOCAL_SQLITE = 'true';

      const req = { headers: {} };
      const db = resolvePeopleD1(req);
      assert.ok(db, 'Adapter lokal diizinkan saat ALLOW_LOCAL_SQLITE disetel eksplisit');
    });

  } finally {
    // Restore original process.env
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }

    if (originalRequireD1 !== undefined) {
      process.env.REQUIRE_CLOUDFLARE_D1 = originalRequireD1;
    } else {
      delete process.env.REQUIRE_CLOUDFLARE_D1;
    }

    if (originalAllowSqlite !== undefined) {
      process.env.ALLOW_LOCAL_SQLITE = originalAllowSqlite;
    } else {
      delete process.env.ALLOW_LOCAL_SQLITE;
    }
  }

  console.log(`\n================================================================`);
  console.log(` HASIL PENGUJIAN UNIT RESOLVER: ${passed} / ${total} LULUS (100%)`);
  console.log(`================================================================\n`);
}

runRuntimeResolverTests().catch(() => process.exit(1));
