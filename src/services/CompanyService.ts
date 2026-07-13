import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { CompanyProfile } from '../../types';
import { sanitizeForFirestore } from '../utils/sanitize';

export class CompanyService {
  /**
   * Fetch all PT (Company) Profiles
   */
  static async getCompanies(): Promise<CompanyProfile[]> {
    try {
      const snap = await getDocs(collection(db, 'profiles'));
      const loaded: CompanyProfile[] = [];
      snap.forEach(docSnap => {
        loaded.push({ id: docSnap.id, ...docSnap.data() } as CompanyProfile);
      });
      return loaded;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'profiles');
      throw error;
    }
  }

  /**
   * Fetch all CV Profiles
   */
  static async getCvCompanies(): Promise<CompanyProfile[]> {
    try {
      const snap = await getDocs(collection(db, 'cv_profiles'));
      const loaded: CompanyProfile[] = [];
      snap.forEach(docSnap => {
        loaded.push({ id: docSnap.id, ...docSnap.data() } as CompanyProfile);
      });
      return loaded;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'cv_profiles');
      throw error;
    }
  }

  /**
   * Listen to PT (Company) Profiles
   */
  static listenCompanies(callback: (profiles: CompanyProfile[]) => void): () => void {
    return onSnapshot(
      collection(db, 'profiles'),
      (snapshot) => {
        const loaded: CompanyProfile[] = [];
        snapshot.forEach(docSnap => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as CompanyProfile);
        });
        callback(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'profiles');
      }
    );
  }

  /**
   * Listen to CV Profiles
   */
  static listenCvCompanies(callback: (profiles: CompanyProfile[]) => void): () => void {
    return onSnapshot(
      collection(db, 'cv_profiles'),
      (snapshot) => {
        const loaded: CompanyProfile[] = [];
        snapshot.forEach(docSnap => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as CompanyProfile);
        });
        callback(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'cv_profiles');
      }
    );
  }

  /**
   * Save (set with merge) a PT or CV Company Profile
   */
  static async saveCompany(companyId: string, data: Partial<CompanyProfile>, isCv?: boolean): Promise<void> {
    const isCvCompany = isCv || data.companyType === 'CV';
    const collectionName = isCvCompany ? 'cv_profiles' : 'profiles';
    try {
      await setDoc(doc(db, collectionName, companyId), sanitizeForFirestore(data), { merge: true });
      
      // Ensure the Google Drive folder exists for this client (only if not CV for now, or you can do it for both)
      if (!isCvCompany && data.companyName) {
        try {
          const { auth } = await import('../lib/firebase');
          let token = '';
          if (auth.currentUser) {
            token = await auth.currentUser.getIdToken();
          }
          await fetch('/api/v2/drive/ensure-client-folder', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              clientId: companyId,
              companyName: data.companyName
            })
          });
        } catch (e) {
          console.warn("[CompanyService] Failed to ensure drive folder for new client:", e);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${companyId}`);
      throw error;
    }
  }

  /**
   * Update a PT or CV Company Profile
   */
  static async updateCompany(companyId: string, data: Partial<CompanyProfile>, isCv?: boolean): Promise<void> {
    const isCvCompany = isCv || data.companyType === 'CV';
    const collectionName = isCvCompany ? 'cv_profiles' : 'profiles';
    try {
      await updateDoc(doc(db, collectionName, companyId), sanitizeForFirestore(data));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${companyId}`);
      throw error;
    }
  }

  /**
   * Archive/unarchive a PT or CV Profile
   */
  static async archiveCompany(companyId: string, currentStatus: boolean, isCv?: boolean): Promise<boolean> {
    const nextStatus = !currentStatus;
    const collectionName = isCv ? 'cv_profiles' : 'profiles';
    try {
      await updateDoc(doc(db, collectionName, companyId), {
        isArchived: nextStatus
      });
      return nextStatus;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${companyId}`);
      throw error;
    }
  }

  /**
   * Duplicate a PT or CV Profile
   */
  static async duplicateCompany(company: CompanyProfile, isCv?: boolean): Promise<CompanyProfile> {
    const duplicatedName = `${company.companyName} (Salinan)`;
    const newId = crypto.randomUUID();
    const duplicatedProfile: CompanyProfile = {
      ...company,
      id: newId,
      companyName: duplicatedName,
      updatedAt: new Date().toISOString()
    };
    const collectionName = isCv || company.companyType === 'CV' ? 'cv_profiles' : 'profiles';
    try {
      await setDoc(doc(db, collectionName, newId), sanitizeForFirestore(duplicatedProfile));
      return duplicatedProfile;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${newId}`);
      throw error;
    }
  }

  /**
   * Delete a PT or CV Profile
   */
  static async deleteCompany(companyId: string, isCv?: boolean): Promise<void> {
    const collectionName = isCv ? 'cv_profiles' : 'profiles';
    try {
      await deleteDoc(doc(db, collectionName, companyId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${companyId}`);
      throw error;
    }
  }
}
