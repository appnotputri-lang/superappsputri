import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { initializeFirestore, collection, getDocs, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const searchShareholderByNIKClient = async (nik: string): Promise<any | null> => {
  if (!nik || nik.trim().length !== 16) return null;
  const cleanNik = nik.trim();
  const collections = ['profiles', 'cv_profiles', 'projects', 'rupst_projects', 'pendirian_projects', 'laporan_projects'];
  let bestCandidate: any = null;

  try {
    for (const col of collections) {
      const querySnapshot = await getDocs(collection(db, col));
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        const candidateArrays = [
          data.shareholders,
          data.finalShareholders,
          data.oldManagementItems,
          data.newManagementItems,
          data.managementItems,
          data.parties,
          data.founders,
        ];

        for (const arr of candidateArrays) {
          if (Array.isArray(arr)) {
            for (const item of arr) {
              if (item && item.nik && item.nik.trim() === cleanNik) {
                const hasFullDetails = !!(
                  item.birthCity ||
                  item.birthDate ||
                  item.occupation ||
                  item.address?.fullAddress ||
                  item.address?.city
                );
                if (hasFullDetails) {
                  return item; // Best possible candidate found!
                }
                if (!bestCandidate) {
                  bestCandidate = item;
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in searchShareholderByNIKClient:", error);
  }
  return bestCandidate;
};

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Error logging in with Google:', error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function cleanUndefined(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  if (typeof obj === 'object') {
    if (obj.constructor && obj.constructor !== Object) {
      return obj;
    }
    const cleanObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val !== undefined) {
          cleanObj[key] = cleanUndefined(val);
        }
      }
    }
    return cleanObj;
  }
  return obj;
}
