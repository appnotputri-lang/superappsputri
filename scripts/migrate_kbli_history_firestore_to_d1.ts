import { firestoreRest } from '../src/lib/firestore-rest';
import { getLocalD1Database } from '../src/lib/sqlite-d1';
import { ensureD1TablesExist } from '../src/services/d1MigrationService';
import { createKbliMappingD1, createKbliSuggestionD1 } from '../src/lib/d1KbliRepository';

function selectValidationIndices(totalCount: number): { index: number; type: 'FIRST' | 'RANDOM' | 'LAST' }[] {
  if (totalCount <= 0) return [];
  if (totalCount <= 30) {
    return Array.from({ length: totalCount }, (_, i) => ({
      index: i,
      type: i < 10 ? 'FIRST' : i >= totalCount - 10 ? 'LAST' : 'RANDOM'
    }));
  }

  const first10 = Array.from({ length: 10 }, (_, i) => i);
  const last10 = Array.from({ length: 10 }, (_, i) => totalCount - 10 + i);

  const middlePool = Array.from({ length: totalCount - 20 }, (_, i) => i + 10);
  const random10: number[] = [];
  while (random10.length < 10 && middlePool.length > 0) {
    const r = Math.floor(Math.random() * middlePool.length);
    const [val] = middlePool.splice(r, 1);
    random10.push(val);
  }
  random10.sort((a, b) => a - b);

  return [
    ...first10.map(i => ({ index: i, type: 'FIRST' as const })),
    ...random10.map(i => ({ index: i, type: 'RANDOM' as const })),
    ...last10.map(i => ({ index: i, type: 'LAST' as const }))
  ];
}

async function runMigration() {
  console.log("=================================================");
  console.log("MIGRASI DATA HISTORIS KBLI (FIRESTORE REST -> CLOUDFLARE D1)");
  console.log("=================================================");

  console.log("1. MENGAMBIL DATA SINGLE-PASS DARI FIRESTORE REST: kbli_saved_records ...");
  
  const allFirestoreDocs: any[] = [];
  let pageToken: string | undefined = undefined;
  let pageCount = 0;

  try {
    do {
      pageCount++;
      console.log(`- Fetching page ${pageCount} (pageSize=300)...`);
      const res: any = await firestoreRest.listDocuments('kbli_saved_records', 300, pageToken, process.env);
      const docs = res.documents || [];
      allFirestoreDocs.push(...docs);
      pageToken = res.nextPageToken;
    } while (pageToken);
  } catch (err: any) {
    console.error("FATAL ERROR FETCHING FIRESTORE REST:", err?.message || err);
    process.exit(1);
  }

  console.log(`Total dokumen ditemukan di Firestore: ${allFirestoreDocs.length}`);

  const mappingRecords: any[] = [];
  const suggestionRecords: any[] = [];

  for (const record of allFirestoreDocs) {
    const recType = (record.type || '').toLowerCase();
    if (recType === 'suggestion' || recType === 'saran') {
      suggestionRecords.push(record);
    } else {
      mappingRecords.push(record);
    }
  }

  console.log(`- Type Mapping: ${mappingRecords.length} records`);
  console.log(`- Type Suggestion: ${suggestionRecords.length} records`);

  // Initialize D1
  const d1 = getLocalD1Database();
  await ensureD1TablesExist(d1);

  console.log("\n2. MELAKUKAN BATCH UPSERT KE CLOUDFLARE D1...");

  let mappingSuccess = 0;
  let mappingFailed = 0;
  for (const m of mappingRecords) {
    try {
      await createKbliMappingD1(d1, m);
      mappingSuccess++;
    } catch (e: any) {
      console.error(`Failed mapping record ${m.id}:`, e?.message);
      mappingFailed++;
    }
  }

  let suggestionSuccess = 0;
  let suggestionFailed = 0;
  for (const s of suggestionRecords) {
    try {
      await createKbliSuggestionD1(d1, s);
      suggestionSuccess++;
    } catch (e: any) {
      console.error(`Failed suggestion record ${s.id}:`, e?.message);
      suggestionFailed++;
    }
  }

  console.log(`✓ Upsert Mapping selesai: ${mappingSuccess} sukses, ${mappingFailed} gagal.`);
  console.log(`✓ Upsert Suggestion selesai: ${suggestionSuccess} sukses, ${suggestionFailed} gagal.`);

  console.log("\n3. VALIDASI HITUNGAN ROW DI D1...");

  const d1MapCountRes = await d1.prepare("SELECT count(*) as cnt FROM kbli_mapping_records").first();
  const d1MappingCount = Number(d1MapCountRes?.cnt || 0);

  const d1SuggCountRes = await d1.prepare("SELECT count(*) as cnt FROM kbli_suggestion_records").first();
  const d1SuggestionCount = Number(d1SuggCountRes?.cnt || 0);

  console.log(`- Table kbli_mapping_records: ${d1MappingCount} rows in D1 (Source: ${mappingRecords.length})`);
  console.log(`- Table kbli_suggestion_records: ${d1SuggestionCount} rows in D1 (Source: ${suggestionRecords.length})`);

  console.log("\n4. VALIDASI SAMPEL (10 PERTAMA, 10 ACAK, 10 TERAKHIR)...");

  // Sorted deterministic
  const sortedMappings = [...mappingRecords].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const sortedSuggestions = [...suggestionRecords].sort((a, b) => String(a.id).localeCompare(String(b.id)));

  const d1MappingsAll = (await d1.prepare("SELECT * FROM kbli_mapping_records ORDER BY id ASC").all())?.results || [];
  const d1SuggestionsAll = (await d1.prepare("SELECT * FROM kbli_suggestion_records ORDER BY id ASC").all())?.results || [];

  // Validate Mappings
  const mapSamples = selectValidationIndices(sortedMappings.length);
  let mapMatches = 0;
  for (const sample of mapSamples) {
    const source = sortedMappings[sample.index];
    const target = d1MappingsAll.find((r: any) => r.id === String(source.id));
    if (target) {
      const sourceNama = String(source.nama || source.name || '').toUpperCase().trim();
      const targetNama = String(target.nama || '').toUpperCase().trim();
      if (sourceNama === targetNama) {
        mapMatches++;
      } else {
        console.warn(`Mismatch in Mapping [${sample.type} #${sample.index}] ID=${source.id}: source='${sourceNama}' d1='${targetNama}'`);
      }
    } else {
      console.warn(`Missing in D1 Mapping [${sample.type} #${sample.index}] ID=${source.id}`);
    }
  }

  // Validate Suggestions
  const suggSamples = selectValidationIndices(sortedSuggestions.length);
  let suggMatches = 0;
  for (const sample of suggSamples) {
    const source = sortedSuggestions[sample.index];
    const target = d1SuggestionsAll.find((r: any) => r.id === String(source.id));
    if (target) {
      const sourceNama = String(source.nama || source.name || '').toUpperCase().trim();
      const targetNama = String(target.nama || '').toUpperCase().trim();
      if (sourceNama === targetNama) {
        suggMatches++;
      } else {
        console.warn(`Mismatch in Suggestion [${sample.type} #${sample.index}] ID=${source.id}: source='${sourceNama}' d1='${targetNama}'`);
      }
    } else {
      console.warn(`Missing in D1 Suggestion [${sample.type} #${sample.index}] ID=${source.id}`);
    }
  }

  console.log(`\nHASIL VALIDASI SAMPEL MAPPING: ${mapMatches} / ${mapSamples.length} cocok.`);
  console.log(`HASIL VALIDASI SAMPEL SUGGESTION: ${suggMatches} / ${suggSamples.length} cocok.`);

  console.log("\n=================================================");
  console.log("STATUS MIGRASI D1:");
  console.log(`- Firestore total pages fetched: ${pageCount}`);
  console.log(`- Mapping records migrated: ${mappingSuccess} / ${mappingRecords.length}`);
  console.log(`- Suggestion records migrated: ${suggestionSuccess} / ${suggestionRecords.length}`);
  console.log(`- Status: ${mappingSuccess === mappingRecords.length && suggestionSuccess === suggestionRecords.length ? "SEMPURNA & SUKSES" : "SELESAI DENGAN CATATAN"}`);
  console.log("=================================================");
}

runMigration().catch(console.error);
