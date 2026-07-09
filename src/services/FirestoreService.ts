import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  QueryConstraint, 
  query 
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase';

export const sanitizeForFirestore = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(v => sanitizeForFirestore(v));
  } else if (typeof obj === 'object') {
    if (obj instanceof Date) {
      return obj.toISOString();
    }
    if (obj.constructor && obj.constructor !== Object) {
      return obj;
    }
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val !== undefined) {
          newObj[key] = sanitizeForFirestore(val);
        }
      }
    }
    return newObj;
  }
  return obj;
};

export class FirestoreService {
  protected static async getCollectionData<T>(collectionPath: string, ...constraints: QueryConstraint[]): Promise<T[]> {
    try {
      const ref = collection(db, collectionPath);
      const q = constraints.length > 0 ? query(ref, ...constraints) : ref;
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, collectionPath);
      throw error;
    }
  }

  protected static async getDocumentData<T>(collectionPath: string, docId: string): Promise<T | null> {
    const path = `${collectionPath}/${docId}`;
    try {
      const ref = doc(db, collectionPath, docId);
      const snapshot = await getDoc(ref);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as unknown as T;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      throw error;
    }
  }

  protected static async setDocument(collectionPath: string, docId: string, data: any): Promise<void> {
    const path = `${collectionPath}/${docId}`;
    try {
      const ref = doc(db, collectionPath, docId);
      const sanitized = sanitizeForFirestore(data);
      await setDoc(ref, sanitized);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  }

  protected static async updateDocument(collectionPath: string, docId: string, data: any): Promise<void> {
    const path = `${collectionPath}/${docId}`;
    try {
      const ref = doc(db, collectionPath, docId);
      const sanitized = sanitizeForFirestore(data);
      await updateDoc(ref, sanitized);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  }

  protected static async deleteDocument(collectionPath: string, docId: string): Promise<void> {
    const path = `${collectionPath}/${docId}`;
    try {
      const ref = doc(db, collectionPath, docId);
      await deleteDoc(ref);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      throw error;
    }
  }

  public static listenToCollection<T>(
    collectionPath: string, 
    onNext: (data: T[]) => void, 
    ...constraints: QueryConstraint[]
  ): () => void {
    const ref = collection(db, collectionPath);
    const q = constraints.length > 0 ? query(ref, ...constraints) : ref;
    return onSnapshot(
      q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
        onNext(data);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, collectionPath);
      }
    );
  }
}
