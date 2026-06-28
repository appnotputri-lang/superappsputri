import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseUtamaConfig = {
  apiKey: "AIzaSyB3-W_p82EhL5scOUP9lesnXftjgMb67do",
  authDomain: "notarisputri-cecab.firebaseapp.com",
  projectId: "notarisputri-cecab",
  storageBucket: "notarisputri-cecab.firebasestorage.app",
};

// Initialize secondary instance
const appUtama = initializeApp(firebaseUtamaConfig, 'AplikasiUtama');
export const dbUtama = getFirestore(appUtama);
