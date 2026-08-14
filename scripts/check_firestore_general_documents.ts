import fs from 'fs';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

if (!getApps().length) {
  initializeApp({
    projectId: config.projectId
  });
}

async function checkDocs() {
  const db = getFirestore(config.databaseId || 'ai-studio-9ed678a8-09d0-44a0-9223-82537f62bf08');
  const snapshot = await db.collection('general_documents').get();
  console.log(`[Firestore check] Total general_documents in Firestore: ${snapshot.size}`);

  const receipts: any[] = [];
  const deliveries: any[] = [];

  snapshot.docs.forEach(doc => {
    const data = { id: doc.id, ...doc.data() };
    if ((data as any).docType === 'RECEIPT') {
      receipts.push(data);
    } else {
      deliveries.push(data);
    }
  });

  console.log(`- RECEIPT (Tanda Terima): ${receipts.length}`);
  console.log(`- DELIVERY (Surat Jalan): ${deliveries.length}`);

  if (snapshot.size > 0) {
    console.log("\nSample RECEIPT:", JSON.stringify(receipts[0], null, 2));
    console.log("\nSample DELIVERY:", JSON.stringify(deliveries[0], null, 2));
  }
}

checkDocs().catch(console.error);
