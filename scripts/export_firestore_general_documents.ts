import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

const app = initializeApp({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  appId: config.appId
});

const db = getFirestore(app, config.firestoreDatabaseId || config.databaseId || 'ai-studio-9ed678a8-09d0-44a0-9223-82537f62bf08');

async function exportDocs() {
  console.log("[Firebase Client SDK] Fetching general_documents collection...");
  const snap = await getDocs(collection(db, 'general_documents'));
  
  console.log(`[Firestore] Total general_documents retrieved: ${snap.size}`);

  const documents: any[] = [];
  snap.docs.forEach(docSnap => {
    documents.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });

  const receipts = documents.filter(d => d.docType === 'RECEIPT');
  const deliveries = documents.filter(d => d.docType === 'DELIVERY');

  console.log(`- RECEIPT (Tanda Terima): ${receipts.length}`);
  console.log(`- DELIVERY (Surat Jalan): ${deliveries.length}`);

  if (documents.length > 0) {
    console.log("\nSample RECEIPT:", receipts[0] || "None");
    console.log("\nSample DELIVERY:", deliveries[0] || "None");
  }

  const content = `// Auto-generated historical general_documents records exported from Firestore
export const HISTORICAL_GENERAL_DOCUMENTS = ${JSON.stringify(documents, null, 2)};
`;

  fs.writeFileSync('src/data/generalDocumentsHistorical.ts', content, 'utf8');
  console.log("\n✓ Successfully saved export to src/data/generalDocumentsHistorical.ts!");
  process.exit(0);
}

exportDocs().catch(err => {
  console.error("ERROR exporting general_documents:", err);
  process.exit(1);
});
