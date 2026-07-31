const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || firebaseConfig.projectId);

async function run() {
  console.log("=== CHECKING GHOST PROFILES ===");
  const targetRef = doc(db, 'profiles', 'undefined');
  const targetSnap = await getDoc(targetRef);

  if (targetSnap.exists()) {
    console.log("FOUND GHOST PROFILE with ID 'undefined'!");
    console.log("Data:", JSON.stringify(targetSnap.data(), null, 2));
  } else {
    console.log("No ghost profile 'undefined' exists in 'profiles' collection.");
  }
  
  // Check company_profiles collection as well
  const compRef = doc(db, 'company_profiles', 'undefined');
  const compSnap = await getDoc(compRef);
  if (compSnap.exists()) {
    console.log("FOUND GHOST PROFILE with ID 'undefined' in 'company_profiles'!");
    console.log("Data:", JSON.stringify(compSnap.data(), null, 2));
  } else {
    console.log("No ghost profile 'undefined' exists in 'company_profiles' collection.");
  }

  process.exit(0);
}

run().catch(console.error);
