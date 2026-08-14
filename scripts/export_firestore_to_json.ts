import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
if (!fs.existsSync(configPath)) {
  console.error("Error: firebase-applet-config.json not found in current directory.");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  appId: config.appId
});

const databaseId = config.firestoreDatabaseId || config.databaseId || 'ai-studio-9ed678a8-09d0-44a0-9223-82537f62bf08';
const db = getFirestore(app, databaseId);

const COLLECTIONS = [
  { key: 'deeds', filename: 'export_deeds.json' },
  { key: 'private_deeds', filename: 'export_private_deeds.json' },
  { key: 'incoming_mails', filename: 'export_incoming_mails.json' },
  { key: 'outgoing_mails', filename: 'export_outgoing_mails.json' },
  { key: 'general_documents', filename: 'export_general_documents.json' },
  { key: 'protest_cheques', filename: 'export_protest_cheques.json' },
];

function serializeFirestoreValue(val: any): any {
  if (val === undefined || val === null) return null;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      try { return val.toDate().toISOString(); } catch {}
    }
    if (typeof val.seconds === 'number') {
      try {
        const ms = val.seconds * 1000 + Math.round((val.nanoseconds || val._nanoseconds || 0) / 1e6);
        return new Date(ms).toISOString();
      } catch {}
    }
    if (Array.isArray(val)) return val.map(serializeFirestoreValue);
    
    const cleanObj: Record<string, any> = {};
    for (const k of Object.keys(val)) {
      if (val[k] !== undefined) {
        cleanObj[k] = serializeFirestoreValue(val[k]);
      }
    }
    return cleanObj;
  }
  return val;
}

async function runCliExport() {
  console.log("=================================================================");
  console.log("=== FIRESTORE READ-ONLY EXPORT TO JSON (CLOUDFLARE D1 TARGET) ===");
  console.log("=================================================================");
  console.log(`Firebase Project: ${config.projectId}`);
  console.log(`Database ID: ${databaseId}\n`);

  const outputDir = path.resolve(process.cwd(), 'exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const bundleResults: Record<string, any> = {
    exportedAt: new Date().toISOString(),
    projectId: config.projectId,
    databaseId: databaseId,
    collections: {},
    deeds: [],
    private_deeds: [],
    incoming_mails: [],
    outgoing_mails: [],
    general_documents: [],
    protest_cheques: []
  };

  let totalRecords = 0;

  for (const item of COLLECTIONS) {
    try {
      process.stdout.write(`Fetching ${item.key.padEnd(20)} ... `);
      const snapshot = await getDocs(collection(db, item.key));
      const records = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...serializeFirestoreValue(data)
        };
      });

      const filePath = path.join(outputDir, item.filename);
      fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf8');
      
      bundleResults[item.key] = records;
      bundleResults.collections[item.key] = records.length;
      totalRecords += records.length;

      console.log(`✓ ${records.length} records -> ${path.relative(process.cwd(), filePath)}`);
    } catch (err: any) {
      console.log(`✗ Error: ${err.message}`);
      bundleResults[item.key] = [];
      bundleResults.collections[item.key] = 0;
    }
  }

  const bundlePath = path.join(outputDir, 'firestore_notary_historical_all.json');
  fs.writeFileSync(bundlePath, JSON.stringify(bundleResults, null, 2), 'utf8');

  console.log("\n=================================================================");
  console.log(`✓ EXPORT SELESAI: Total ${totalRecords} dokumen diexport.`);
  console.log(`✓ Bundle All-in-One disimpan di: ${path.relative(process.cwd(), bundlePath)}`);
  console.log("=================================================================\n");
  process.exit(0);
}

runCliExport().catch((err) => {
  console.error("Fatal export error:", err);
  process.exit(1);
});
