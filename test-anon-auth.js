import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

if (!fs.existsSync('firebase-applet-config.json')) {
  console.error('firebase-applet-config.json not found!');
  process.exit(1);
}

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);

async function run() {
  try {
    console.log("Attempting anonymous sign in...");
    const userCredential = await signInAnonymously(auth);
    console.log("Signed in anonymously! User UID:", userCredential.user.uid);
    
    // Try querying a collection
    const q = query(collection(db, 'projects'), limit(1));
    const snap = await getDocs(q);
    console.log("Success! Read projects size:", snap.size);
  } catch (error) {
    console.error("Authentication/Query failed:", error.message);
  }
  process.exit(0);
}

run();
