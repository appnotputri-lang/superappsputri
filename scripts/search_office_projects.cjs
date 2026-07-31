const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || firebaseConfig.projectId);

async function run() {
  console.log("=== SEARCHING office_projects ===");
  const colRef = collection(db, 'office_projects');
  const snap = await getDocs(colRef);
  console.log(`Total documents in office_projects: ${snap.size}`);

  let found = false;
  snap.forEach(docSnap => {
    const d = docSnap.data();
    const title = d.title || '';
    if (title.toUpperCase().includes('KEENCONNECT')) {
      console.log(`FOUND office_project:`);
      console.log(`Document ID: ${docSnap.id}`);
      console.log(`title: ${title}`);
      console.log(`clientId: ${JSON.stringify(d.clientId)}`);
      console.log(`selectedProfileId: ${JSON.stringify(d.selectedProfileId)}`);
      console.log(`Full document:`, JSON.stringify(d, null, 2));
      found = true;
    }
    
    if (d.clientId === 'undefined') {
      console.log(`WARNING: Found clientId as string literal "undefined" in office_projects document ID: ${docSnap.id} (Title: ${title})`);
    }
  });

  if (!found) {
    console.log("No office_projects containing 'KEENCONNECT' found.");
  }
  process.exit(0);
}

run().catch(console.error);
