const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

if (!fs.existsSync('firebase-applet-config.json')) {
  console.error('firebase-applet-config.json not found!');
  process.exit(1);
}

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || firebaseConfig.projectId);

async function run() {
  try {
    const colRef = collection(db, 'deeds');
    const snap = await getDocs(colRef);
    console.log(`Total deeds: ${snap.size}`);
    const deeds = [];
    snap.forEach(doc => {
      deeds.push({ id: doc.id, ...doc.data() });
    });

    // Sort deeds by date first, then by number
    deeds.sort((a, b) => {
      const dateA = a.deedDate || a.date || '';
      const dateB = b.deedDate || b.date || '';
      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }
      const numA = parseInt(String(a.deedNumber || a.number || '').replace(/\D/g, '')) || 0;
      const numB = parseInt(String(b.deedNumber || b.number || '').replace(/\D/g, '')) || 0;
      return numA - numB;
    });

    console.log("\n=== Deeds in DB (Sorted) ===");
    deeds.forEach(d => {
      console.log(`ID: ${d.id} | Date: ${d.deedDate || d.date} | No: ${d.deedNumber || d.number} | OrderNo: ${d.orderNumber} | Title: ${d.deedTitle || d.title}`);
    });
  } catch (error) {
    console.error("Error querying deeds:", error);
  }
}

run();
