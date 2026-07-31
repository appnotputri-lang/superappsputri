const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || firebaseConfig.projectId);

async function run() {
  const targetId = 'b67f1d80-eb37-4a9c-94a4-97c3b3a4baed';
  const targetRef = doc(db, 'profiles', targetId);
  const targetSnap = await getDoc(targetRef);

  if (targetSnap.exists()) {
    const d = targetSnap.data();
    console.log("Profile data ID:", targetId);
    console.log("clientId value type:", typeof d.clientId);
    console.log("clientId value:", d.clientId);
    console.log("selectedProfileId value:", d.selectedProfileId);
    console.log("has clientId key:", 'clientId' in d);
  } else {
    console.log("Profile not found!");
  }
  process.exit(0);
}

run().catch(console.error);
