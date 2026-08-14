import { getLocalD1Database } from '../src/lib/sqlite-d1';
import { HISTORICAL_GENERAL_DOCUMENTS } from '../src/data/generalDocumentsHistorical';
import { processD1JsonMigration } from '../src/services/d1MigrationService';

async function runLocalMigration() {
  console.log("=================================================");
  console.log("RUNNING LOCAL D1 MIGRATION FOR GENERAL DOCUMENTS");
  console.log("=================================================\n");

  const db = getLocalD1Database();

  const receipts = HISTORICAL_GENERAL_DOCUMENTS.filter(d => (d.docType || (d as any).doc_type) === 'RECEIPT');
  const deliveries = HISTORICAL_GENERAL_DOCUMENTS.filter(d => (d.docType || (d as any).doc_type) === 'DELIVERY');

  console.log(`Source Historical Data: ${HISTORICAL_GENERAL_DOCUMENTS.length} total (${receipts.length} Receipts, ${deliveries.length} Deliveries)`);

  const result = await processD1JsonMigration(db, {
    generalDocuments: HISTORICAL_GENERAL_DOCUMENTS
  });

  console.log("\nMigration Result:", JSON.stringify(result, null, 2));

  if (result.success) {
    console.log("\n✅ Local SQLite D1 migration for General Documents completed successfully.");
  } else {
    console.error("\n❌ Local SQLite D1 migration failed.");
    process.exit(1);
  }
}

runLocalMigration().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
