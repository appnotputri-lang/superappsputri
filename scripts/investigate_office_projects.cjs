const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, getDocs } = require('firebase/firestore');

if (!fs.existsSync('firebase-applet-config.json')) {
  console.error('firebase-applet-config.json not found!');
  process.exit(1);
}

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || firebaseConfig.projectId);

async function checkOfficeProjects() {
  console.log("=== CHECKING office_projects ===");
  const targetId = '4e077963-972c-4140-84df-2a4ce1e0177c';
  const targetRef = doc(db, 'office_projects', targetId);
  const targetSnap = await getDoc(targetRef);

  if (targetSnap.exists()) {
    const d = targetSnap.data();
    console.log("FOUND in office_projects!");
    console.log("clientId:", JSON.stringify(d.clientId));
    console.log("selectedProfileId:", JSON.stringify(d.selectedProfileId));
    console.log("keys of document:", Object.keys(d));
    console.log("All fields:", JSON.stringify(d, null, 2));
  } else {
    console.log("NOT FOUND in office_projects.");
  }

  // Look at other projects in office_projects
  const colRef = collection(db, 'office_projects');
  const snap = await getDocs(colRef);
  console.log(`\nTotal docs: ${snap.size}`);
  let sampleCount = 0;
  snap.forEach(docSnap => {
    const d = docSnap.data();
    if (sampleCount < 10) {
      console.log(`Project ID: ${docSnap.id} | clientId: ${JSON.stringify(d.clientId)} | selectedProfileId: ${JSON.stringify(d.selectedProfileId)} | title: ${d.title}`);
      sampleCount++;
    }
  });

  process.exit(0);
}

checkOfficeProjects().catch(console.error);
