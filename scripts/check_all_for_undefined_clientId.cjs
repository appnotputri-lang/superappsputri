const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || firebaseConfig.projectId);

async function run() {
  const collections = ['projects', 'rupst_projects', 'pendirian_projects', 'profiles', 'company_profiles', 'office_projects'];
  
  for (const colName of collections) {
    try {
      console.log(`Searching collection '${colName}'...`);
      const snap = await getDocs(collection(db, colName));
      let count = 0;
      snap.forEach(dDoc => {
        const d = dDoc.data();
        if (d.clientId === 'undefined' || d.selectedProfileId === 'undefined') {
          console.log(`-> MATCH FOUND in '${colName}'! Doc ID: ${dDoc.id}, clientId: ${JSON.stringify(d.clientId)}, selectedProfileId: ${JSON.stringify(d.selectedProfileId)}, Name/Title: ${d.companyName || d.title || d.namaPt || 'N/A'}`);
          count++;
        }
      });
      console.log(`Finished '${colName}': Found ${count} matching docs.`);
    } catch (e) {
      console.warn(`Error searching ${colName}:`, e.message);
    }
  }
  process.exit(0);
}

run().catch(console.error);
