import { getLocalD1Database } from '../src/lib/sqlite-d1';
import { processD1JsonMigration } from '../src/services/d1MigrationService';
import { HISTORICAL_KBLI_MAPPINGS, HISTORICAL_KBLI_SUGGESTIONS } from '../src/data/kbliHistoricalRecords';

async function runLocalMigration() {
  console.log("=======================================================");
  console.log("RUNNING D1 JSON MIGRATION (LOCAL D1 SQLITE)");
  console.log("=======================================================");

  const db = getLocalD1Database();

  const payload = {
    kbliMappings: HISTORICAL_KBLI_MAPPINGS,
    kbliSuggestions: HISTORICAL_KBLI_SUGGESTIONS
  };

  console.log(`Payload prepared: ${payload.kbliMappings.length} mappings, ${payload.kbliSuggestions.length} suggestions.`);

  const result = await processD1JsonMigration(db, payload);

  console.log("\nMIGRATION RESULT:");
  console.log(JSON.stringify(result, null, 2));

  // Verify counts directly from local SQLite
  const mapCnt = (await db.prepare("SELECT count(*) as cnt FROM kbli_mapping_records").first())?.cnt;
  const suggCnt = (await db.prepare("SELECT count(*) as cnt FROM kbli_suggestion_records").first())?.cnt;

  console.log("\n=======================================================");
  console.log(`Local SQLite D1 Tables Count:`);
  console.log(`- kbli_mapping_records: ${mapCnt} (Expected: 32)`);
  console.log(`- kbli_suggestion_records: ${suggCnt} (Expected: 7)`);
  console.log("=======================================================");
}

runLocalMigration().catch(console.error);
