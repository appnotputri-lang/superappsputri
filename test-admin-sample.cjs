const fs = require('fs');
const admin = require('firebase-admin');

if (!fs.existsSync('firebase-applet-config.json')) {
  console.error('firebase-applet-config.json not found!');
  process.exit(1);
}

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

// Initialize Firebase Admin
admin.initializeApp({
  projectId: firebaseConfig.projectId
});

const db = admin.firestore();
// Set databaseId if it exists in the config
if (firebaseConfig.firestoreDatabaseId) {
  try {
    db.settings({
      databaseId: firebaseConfig.firestoreDatabaseId
    });
    console.log(`Using databaseId: ${firebaseConfig.firestoreDatabaseId}`);
  } catch (err) {
    console.warn(`Could not set databaseId:`, err.message);
  }
}

async function sampleCollection(colName) {
  console.log(`\n=== Sampling Collection via Admin: ${colName} ===`);
  try {
    const snap = await db.collection(colName).limit(3).get();
    console.log(`Total documents found in sample: ${snap.size}`);
    snap.forEach(doc => {
      console.log(`Document ID: ${doc.id}`);
      const data = doc.data();
      const keys = Object.keys(data);
      console.log(`Fields:`, keys);
      // Look for company or PT names
      const ptCandidates = {};
      for (const k of keys) {
        if (k.toLowerCase().includes('pt') || k.toLowerCase().includes('name') || k.toLowerCase().includes('company') || k.toLowerCase().includes('nama')) {
          ptCandidates[k] = data[k];
        }
      }
      console.log(`PT/Company Name candidates:`, ptCandidates);
    });
  } catch (error) {
    console.error(`Error sampling ${colName} via Admin:`, error.message);
  }
}

async function run() {
  await sampleCollection('projects');
  await sampleCollection('rupst_projects');
  await sampleCollection('rupst_public_projects');
  await sampleCollection('pendirian_projects');
  await sampleCollection('profiles');
  await sampleCollection('office_projects');
}

run();
