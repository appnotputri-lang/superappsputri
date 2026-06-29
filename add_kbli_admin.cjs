
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');
const fs = require('fs');

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

const adminApp = admin.initializeApp({
  projectId: firebaseConfig.projectId,
});
const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

const newItem = {
  kode: "85578",
  judul: "PENDIDIKAN DAN PELATIHAN PERSONEL PENERBANGAN",
  uraian: "Kelompok ini mencakup jasa pendidikan personel penerbangan yang dilakukan oleh swasta, seperti personel pesawat udara, personel bandar udara, personel navigasi penerbangan, personel keamanan penerbangan. Kelompok ini juga mencakup pengangkutan khusus awak pesawat dalam rangka pendidikan.",
  level: "Kelompok",
  updatedAt: new Date().toISOString()
};

async function addToFirestore() {
  const COLLECTION_NAME = 'kbli_2025';
  console.log(`Adding KBLI 85578 to Firestore collection '${COLLECTION_NAME}' via admin...`);
  
  try {
    // In some versions of firebase-admin, we pass dbId to initializeApp or use another way
    // For now let's try the simplest admin way
    const docRef = db.collection(COLLECTION_NAME).doc(newItem.kode);
    await docRef.set(newItem);
    console.log('Successfully added KBLI 85578 to Firestore via admin!');
  } catch (error) {
    console.error('Error adding to Firestore via admin:', error);
    process.exit(1);
  }
  process.exit(0);
}

addToFirestore();
