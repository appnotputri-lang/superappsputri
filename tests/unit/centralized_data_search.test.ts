import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { ensureD1TablesExist } from '../../src/services/d1MigrationService';
import { PeopleD1Repository } from '../../src/services/peopleD1Repository';

// Create in-memory mock SQLite D1 adapter conforming to Cloudflare D1 API
function createMockD1Database() {
  const db = new DatabaseSync(':memory:');

  const wrapDb = {
    prepare(sql: string) {
      return {
        _sql: sql,
        _params: [] as any[],
        bind(...params: any[]) {
          this._params = params;
          return this;
        },
        async run() {
          const stmt = db.prepare(this._sql);
          const info = stmt.run(...this._params);
          return { success: true, meta: { changes: info.changes } };
        },
        async first() {
          const stmt = db.prepare(this._sql);
          return stmt.get(...this._params) || null;
        },
        async all() {
          const stmt = db.prepare(this._sql);
          const results = stmt.all(...this._params);
          return { success: true, results };
        }
      };
    },
    async batch(statements: any[]) {
      const results = [];
      for (const s of statements) {
        results.push(await s.run());
      }
      return results;
    }
  };

  return wrapDb;
}

async function runTests() {
  console.log('================================================================');
  console.log(' UNIT TESTS: DATA TERPUSAT SEARCH & SHARE PROJECTION            ');
  console.log('================================================================');

  const db = createMockD1Database();
  await ensureD1TablesExist(db);

  // 1. Verify that defensive table creation created company_person_roles with share projection columns
  const tableInfo = await db.prepare(`PRAGMA table_info(company_person_roles)`).all();
  const cols = (tableInfo.results || []).map((r: any) => r.name);
  assert.ok(cols.includes('share_count'), 'company_person_roles must contain share_count');
  assert.ok(cols.includes('share_value'), 'company_person_roles must contain share_value');
  assert.ok(cols.includes('ownership_percentage'), 'company_person_roles must contain ownership_percentage');
  console.log('✅ [LULUS] Kolom proyeksi saham (share_count, share_value, ownership_percentage) terdefinisi di company_person_roles');

  const userContext = { uid: 'user_admin_01', role: 'Super Admin', email: 'admin@notarisputri.id' };

  // 2. Insert test person 1 (WNI with company and shares)
  const p1 = await PeopleD1Repository.savePerson(db, userContext, {
    nik: '3171010101900001',
    name: 'Budi Santoso',
    nationalityType: 'WNI',
    nationality: 'INDONESIA'
  });
  assert.ok(p1.personId);

  await PeopleD1Repository.linkCompany(db, userContext, {
    personId: p1.personId,
    companyId: 'comp_pt_majumapan',
    clientType: 'PT',
    companyName: 'PT Maju Mapan Sejahtera',
    roleCategory: 'DIREKSI',
    positionTitle: 'Direktur Utama',
    shareCount: 1500,
    shareValue: 150000000,
    ownershipPercentage: 30
  });

  // 3. Insert test person 2 (WNA with passport, 2 companies, unsynced shares)
  const p2 = await PeopleD1Repository.savePerson(db, userContext, {
    name: 'Michael Arthur Chang',
    nationalityType: 'WNA',
    nationality: 'SINGAPORE',
    passportNumber: 'E98765432'
  });
  assert.ok(p2.personId);

  await PeopleD1Repository.linkCompany(db, userContext, {
    personId: p2.personId,
    companyId: 'comp_pt_global',
    clientType: 'PT',
    companyName: 'PT Global Indo Raya',
    roleCategory: 'KOMISARIS',
    positionTitle: 'Komisaris Utama'
  });

  await PeopleD1Repository.linkCompany(db, userContext, {
    personId: p2.personId,
    companyId: 'comp_pt_nusantara',
    clientType: 'PT',
    companyName: 'PT Nusantara Sentosa',
    roleCategory: 'PEMEGANG_SAHAM',
    positionTitle: 'Pemegang Saham'
  });

  // 4. Insert test person 3 (Independent person without companies)
  const p3 = await PeopleD1Repository.savePerson(db, userContext, {
    nik: '3201010202950002',
    name: 'Siti Aminah',
    nationalityType: 'WNI'
  });
  assert.ok(p3.personId);

  // Test Search & Projection: All records
  const searchAllResult = await PeopleD1Repository.searchPeople(db, { limit: 10, offset: 0 });
  assert.strictEqual(searchAllResult.total, 3, 'Total records must be 3');
  assert.strictEqual(searchAllResult.people.length, 3, 'Fetched 3 people');
  assert.strictEqual(searchAllResult.summary?.totalPeople, 3);
  assert.strictEqual(searchAllResult.summary?.totalWni, 2);
  assert.strictEqual(searchAllResult.summary?.totalWna, 1);
  assert.strictEqual(searchAllResult.summary?.totalRelations, 3);
  console.log('✅ [LULUS] searchPeople server-side aggregation dan ringkasan global (summary) akurat');

  // Verify Budi Santoso (p1) projection
  const budi = searchAllResult.people.find((p: any) => p.personId === p1.personId);
  assert.ok(budi);
  assert.strictEqual(budi.companyCount, 1);
  assert.strictEqual(budi.primaryCompanyName, 'PT Maju Mapan Sejahtera');
  assert.strictEqual(budi.primaryPositionTitle, 'Direktur Utama');
  assert.strictEqual(budi.totalShares, 1500);
  assert.strictEqual(budi.totalShareValue, 150000000);
  assert.strictEqual(budi.sharesRecordedCount, 1);
  console.log('✅ [LULUS] Proyeksi kepemilikan saham Budi Santoso tersinkronisasi tepat: 1500 lembar, Rp 150.000.000');

  // Verify Michael Arthur Chang (p2 WNA) projection
  const michael = searchAllResult.people.find((p: any) => p.personId === p2.personId);
  assert.ok(michael);
  assert.strictEqual(michael.companyCount, 2);
  assert.strictEqual(michael.nationalityType, 'WNA');
  assert.strictEqual(michael.passportNumber, 'E98765432');
  assert.strictEqual(michael.nik, ''); // Must not have fabricated NIK!
  assert.strictEqual(michael.sharesRecordedCount, 0); // Unsynced shares
  console.log('✅ [LULUS] WNA Michael Chang memiliki 2 perusahaan, paspor asli tanpa rekayasa NIK, status saham terdeteksi belum tersinkronisasi');

  // Verify Siti Aminah (p3 Independent)
  const siti = searchAllResult.people.find((p: any) => p.personId === p3.personId);
  assert.ok(siti);
  assert.strictEqual(siti.companyCount, 0);
  assert.strictEqual(siti.primaryCompanyName, null);
  console.log('✅ [LULUS] Siti Aminah terdeteksi tanpa relasi (companyCount = 0)');

  // Test Filter hasCompany = 'YES'
  const filterHasCompany = await PeopleD1Repository.searchPeople(db, { hasCompany: 'YES' });
  assert.strictEqual(filterHasCompany.total, 2);
  console.log('✅ [LULUS] Filter hasCompany=YES mengembalikan tepat 2 individu');

  // Test Filter hasCompany = 'NO'
  const filterNoCompany = await PeopleD1Repository.searchPeople(db, { hasCompany: 'NO' });
  assert.strictEqual(filterNoCompany.total, 1);
  assert.strictEqual(filterNoCompany.people[0].personId, p3.personId);
  console.log('✅ [LULUS] Filter hasCompany=NO mengembalikan tepat 1 individu mandiri');

  // Test Filter nationalityType = 'WNA'
  const filterWna = await PeopleD1Repository.searchPeople(db, { nationalityType: 'WNA' });
  assert.strictEqual(filterWna.total, 1);
  assert.strictEqual(filterWna.people[0].name.toUpperCase(), 'MICHAEL ARTHUR CHANG');
  console.log('✅ [LULUS] Filter nationalityType=WNA mengembalikan tepat 1 individu WNA');

  console.log('================================================================');
  console.log(' SEMUA PENGUJIAN UNIT DATA TERPUSAT: 100% LULUS                 ');
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
