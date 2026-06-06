const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, deleteDoc, collection, getDocs, writeBatch } = require('firebase/firestore');

// Read firebase config
if (!fs.existsSync('firebase-applet-config.json')) {
  console.error('firebase-applet-config.json not found!');
  process.exit(1);
}

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || firebaseConfig.projectId);

// Read utils/kbliData.ts or raw files to import
let kblis = [];
if (fs.existsSync('kbli_2025.json')) {
  try {
    const rawContent = JSON.parse(fs.readFileSync('kbli_2025.json', 'utf8'));
    kblis = Array.isArray(rawContent) ? rawContent : (rawContent.data || rawContent.Data || []);
    console.log(`Loaded ${kblis.length} items from kbli_2025.json`);
  } catch (err) {
    console.error('Error parsing kbli_2025.json:', err.message);
  }
} else if (fs.existsSync('kbli-raw.json')) {
  kblis = JSON.parse(fs.readFileSync('kbli-raw.json', 'utf8'));
  console.log(`Loaded ${kblis.length} items from kbli-raw.json`);
} else {
  console.error('No KBLI JSON file found!');
  process.exit(1);
}

async function seed() {
  console.log('Fetching existing KBLI documents to clear the collection...');
  try {
    const querySnapshot = await getDocs(collection(db, 'kblis'));
    const docSize = querySnapshot.size;
    console.log(`Found ${docSize} existing KBLI documents. Deleting them...`);
    
    // We can delete using writeBatch in groups of 100 for safety and speed
    let batch = writeBatch(db);
    let count = 0;
    
    for (const d of querySnapshot.docs) {
      batch.delete(d.ref);
      count++;
      if (count % 100 === 0) {
        await batch.commit();
        console.log(`Deleted ${count} / ${docSize} items...`);
        batch = writeBatch(db);
      }
    }
    if (count % 100 !== 0) {
      await batch.commit();
    }
    console.log(`Deleted all ${count} old KBLI items from Firestore.`);
  } catch (error) {
    console.error('Error while clearing old KBLI documents (continuing anyway):', error.message);
  }

  console.log(`Seeding ${kblis.length} KBLI items directly to Firestore collection 'kblis'...`);

  let writeCount = 0;
  let batch = writeBatch(db);

  for (const item of kblis) {
    const code = item.kode || item.Kode;
    const name = item.judul || item.Judul;
    const description = item.uraian || item.Keterangan || '';
    
    if (!code) continue;

    const docRef = doc(db, 'kblis', code);
    batch.set(docRef, {
      code,
      name,
      description,
      updatedAt: new Date().toISOString()
    });
    
    writeCount++;
    if (writeCount % 100 === 0) {
      await batch.commit();
      console.log(`Seeded ${writeCount} / ${kblis.length} items...`);
      batch = writeBatch(db);
    }
  }

  if (writeCount % 100 !== 0) {
    await batch.commit();
  }

  console.log(`Successfully seeded all ${writeCount} KBLI items into Firestore collection 'kblis'!`);
}

seed().catch(err => {
  console.error('Error seeding to firestore:', err);
});
