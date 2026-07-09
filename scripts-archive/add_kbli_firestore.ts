
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || firebaseConfig.projectId);

const newItem = {
  kode: "85578",
  judul: "PENDIDIKAN DAN PELATIHAN PERSONEL PENERBANGAN",
  uraian: "Kelompok ini mencakup jasa pendidikan personel penerbangan yang dilakukan oleh swasta, seperti personel pesawat udara, personel bandar udara, personel navigasi penerbangan, personel keamanan penerbangan. Kelompok ini juga mencakup pengangkutan khusus awak pesawat dalam rangka pendidikan.",
  level: "Kelompok",
  updatedAt: new Date().toISOString()
};

async function addToFirestore() {
  const COLLECTION_NAME = 'kbli_2025';
  console.log(`Adding KBLI 85578 to Firestore collection '${COLLECTION_NAME}'...`);
  
  try {
    const docRef = doc(db, COLLECTION_NAME, newItem.kode);
    await setDoc(docRef, newItem);
    console.log('Successfully added KBLI 85578 to Firestore!');
  } catch (error) {
    console.error('Error adding to Firestore:', error);
    process.exit(1);
  }
  process.exit(0);
}

addToFirestore();
