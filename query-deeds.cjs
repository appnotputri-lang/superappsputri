const fs = require('fs');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

if (!fs.existsSync('firebase-applet-config.json')) {
  console.error('firebase-applet-config.json not found!');
  process.exit(1);
}

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

// Initialize Firebase Admin
initializeApp({
  projectId: firebaseConfig.projectId
});

const db = getFirestore();
if (firebaseConfig.firestoreDatabaseId) {
  // Wait, in Node.js firebase-admin, setting databaseId can be done via settings or initializeApp or getFirestore(databaseId)
  try {
    // In admin SDK, we can pass databaseId directly to getFirestore
    const customDb = getFirestore(firebaseConfig.firestoreDatabaseId);
    run(customDb);
  } catch (err) {
    console.warn("Could not set databaseId, falling back to default:", err.message);
    run(db);
  }
} else {
  run(db);
}

async function run(firestoreDb) {
  try {
    const colRef = firestoreDb.collection('deeds');
    const snap = await colRef.get();
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
