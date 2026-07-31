const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

if (!fs.existsSync('firebase-applet-config.json')) {
  console.error('firebase-applet-config.json not found!');
  process.exit(1);
}

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || firebaseConfig.projectId);

async function checkProject() {
  console.log("=== CHECKING project doc inside 'projects' ===");
  const targetId = '4e077963-972c-4140-84df-2a4ce1e0177c';
  const targetRef = doc(db, 'projects', targetId);
  const targetSnap = await getDoc(targetRef);

  if (targetSnap.exists()) {
    const d = targetSnap.data();
    console.log("FOUND in projects!");
    console.log("clientId:", JSON.stringify(d.clientId));
    console.log("selectedProfileId:", JSON.stringify(d.selectedProfileId));
    console.log("keys of document:", Object.keys(d));
    console.log("All fields:", JSON.stringify(d, null, 2));
  } else {
    console.log("NOT FOUND in projects.");
  }

  process.exit(0);
}

checkProject().catch(console.error);
