import fs from 'fs';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

if (!getApps().length) {
  initializeApp({
    projectId: config.projectId
  });
}

const db = getFirestore(config.firestoreDatabaseId || config.databaseId || 'ai-studio-9ed678a8-09d0-44a0-9223-82537f62bf08');

async function exportAll() {
  const collections = ['deeds', 'private_deeds', 'incoming_mails', 'outgoing_mails', 'general_documents', 'protest_cheques'];
  const results: Record<string, any[]> = {};

  for (const colName of collections) {
    try {
      console.log(`Fetching ${colName}...`);
      const snap = await db.collection(colName).get();
      console.log(`✓ ${colName}: ${snap.size} records`);
      results[colName] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e: any) {
      console.error(`Error fetching ${colName}:`, e.message);
      results[colName] = [];
    }
  }

  const exportTs = `// Auto-generated historical notary records exported from Firestore
export const HISTORICAL_DEEDS = ${JSON.stringify(results.deeds || [], null, 2)};
export const HISTORICAL_PRIVATE_DEEDS = ${JSON.stringify(results.private_deeds || [], null, 2)};
export const HISTORICAL_INCOMING_MAILS = ${JSON.stringify(results.incoming_mails || [], null, 2)};
export const HISTORICAL_OUTGOING_MAILS = ${JSON.stringify(results.outgoing_mails || [], null, 2)};
export const HISTORICAL_GENERAL_DOCUMENTS = ${JSON.stringify(results.general_documents || [], null, 2)};
export const HISTORICAL_PROTEST_CHEQUES = ${JSON.stringify(results.protest_cheques || [], null, 2)};
`;

  fs.writeFileSync('src/data/notaryHistoricalRecords.ts', exportTs, 'utf8');
  console.log("✓ Saved all historical records to src/data/notaryHistoricalRecords.ts");
  process.exit(0);
}

exportAll().catch(err => {
  console.error("Migration export failed:", err);
  process.exit(1);
});
