import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { initializeFirestore, collection, getDocs, persistentLocalCache, persistentMultipleTabManager, getDocsFromCache, getFirestore, doc, getDoc, query, where, limit } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { getApiUrl, getAuthHeaders } from './api';

const app = initializeApp(firebaseConfig);

// Standard, robust Firestore initialization with no localCache to avoid iframe or sandboxed persistentMultipleTabManager errors
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    experimentalForceLongPolling: true,
  }, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  console.warn("initializeFirestore failed, falling back to getFirestore:", e);
  dbInstance = getFirestore(app);
}

export const db = dbInstance;
export const auth = getAuth(app);

export const searchShareholderByNIKClient = async (nik: string): Promise<any | null> => {
  if (!nik || nik.trim().length !== 16) return null;
  const cleanNik = nik.trim();

  // 1. Single Source of Truth: Query Cloudflare D1 via /api/v2/people Gateway API
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/api/v2/people/nik/${encodeURIComponent(cleanNik)}`), {
      headers
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.person) {
        const p = data.person;
        return {
          personId: p.personId,
          nik: p.nik || cleanNik,
          name: p.name,
          salutation: p.salutation || p.sapaan || 'Tuan',
          birthCity: p.birthCity || p.birthPlace || '',
          birthDate: p.birthDate || '',
          nationalityType: p.nationalityType || 'WNI',
          nationality: p.nationality || 'INDONESIA',
          occupation: p.occupation || '',
          address: p.address,
          passportNumber: p.passportNumber || '',
          kitasNumber: p.kitasNumber || '',
          npwp: p.npwp || ''
        };
      }
    }
  } catch (err) {
    console.warn('[searchShareholderByNIKClient] D1 People lookup warning, fallback to legacy scan:', err);
  }

  // 2. Fallback aman ke pemindaian koleksi legacy
  const collections = ['profiles', 'cv_profiles', 'projects', 'rupst_projects', 'pendirian_projects', 'laporan_projects'];
  let bestCandidate: any = null;

  try {
    for (const col of collections) {
      let querySnapshot;
      try {
        querySnapshot = await getDocsFromCache(collection(db, col));
        if (querySnapshot.empty) {
          querySnapshot = await getDocs(collection(db, col));
        }
      } catch (cacheError) {
        querySnapshot = await getDocs(collection(db, col));
      }
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

export function isQuotaExceeded(error: unknown): boolean {
  if (!error) return false;
  const str = String(error).toLowerCase();
  const msg = error instanceof Error ? error.message.toLowerCase() : '';
  return (
    str.includes('resource-exhausted') ||
    str.includes('quota exceeded') ||
    msg.includes('resource-exhausted') ||
    msg.includes('quota exceeded')
  );
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const isQuota = isQuotaExceeded(error);
  if (isQuota && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('firestore_quota_exceeded', {
      detail: {
        path,
        operationType,
        message: error instanceof Error ? error.message : String(error)
      }
    }));
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
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
