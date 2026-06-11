import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const projectId = config.projectId;
const databaseId = config.firestoreDatabaseId;

initializeApp({
  projectId: projectId
});

// Pass the correct database ID to Firestore
const db = getFirestore(databaseId);

async function run() {
  console.log("Searching projects in database ID:", databaseId);
  
  const collections = ['rupst_projects', 'rupst_public_projects', 'profiles', 'projects'];
  for (const collName of collections) {
    const list = await db.collection(collName).get();
    console.log(`Collection ${collName} has ${list.size} documents.`);
    list.forEach(doc => {
      const data = doc.data();
      const companyName = data.companyName || data.name || "No Name";
      if (companyName.toUpperCase().includes("KALTON") || companyName.toUpperCase().includes("LESTARI")) {
        console.log(`FOUND IN ${collName}! Doc ID: ${doc.id}`);
        console.log("Data:", JSON.stringify(data, null, 2));
      }
    });
  }
}

run().catch(console.error);
