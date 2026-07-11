const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { initializeFirestore, doc, setDoc } = require('firebase/firestore');
const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, firebaseConfig.firestoreDatabaseId || firebaseConfig.projectId);
setDoc(doc(db, 'office_projects', 'test-doc'), { title: 'Test' })
  .then(() => { console.log('Write Success!'); process.exit(0); })
  .catch(e => { console.error('Write Failed:', e); process.exit(1); });
