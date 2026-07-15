import { db } from '../lib/firebase';
import { getApiUrl } from '../lib/api';
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
   * Migrate legacy cv_profiles to unified profiles collection
   */
  static async migrateLegacyCvProfiles(): Promise<void> {
    try {
      // 1. Migrate CV profiles
      const cvSnap = await getDocs(collection(db, 'cv_profiles'));
      for (const docSnap of cvSnap.docs) {
        const data = docSnap.data();
        const id = docSnap.id;
        
        console.log(`Migrating CV profile ${id} (${data.companyName}) to unified profiles...`);
        
        // Save to 'profiles' collection with clientType: 'CV' and companyType: 'CV'
        await setDoc(doc(db, 'profiles', id), {
          ...data,
          clientType: 'CV',
          companyType: 'CV'
        }, { merge: true });
        
        // Delete from legacy 'cv_profiles' collection
        await deleteDoc(doc(db, 'cv_profiles', id));
      }

      // 2. Add clientType: 'PT' to any existing profiles that don't have it
      const profilesSnap = await getDocs(collection(db, 'profiles'));
      for (const docSnap of profilesSnap.docs) {
        const data = docSnap.data();
        if (!data.clientType) {
          console.log(`Setting default clientType: PT for profile ${docSnap.id} (${data.companyName})`);
          await updateDoc(doc(db, 'profiles', docSnap.id), {
            clientType: 'PT'
          });
        }
      }
    } catch (error) {
      console.warn("[CompanyService] Error migrating cv_profiles:", error);
    }
  }

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
   * Fetch all CV Profiles (now loaded from profiles collection for backward compatibility)
   */
  static async getCvCompanies(): Promise<CompanyProfile[]> {
    try {
      const snap = await getDocs(collection(db, 'profiles'));
      const loaded: CompanyProfile[] = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.clientType === 'CV' || data.companyType === 'CV') {
          loaded.push({ id: docSnap.id, ...data } as CompanyProfile);
        }
      });
      return loaded;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'profiles');
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
   * Listen to CV Profiles (now listened from profiles collection for backward compatibility)
   */
  static listenCvCompanies(callback: (profiles: CompanyProfile[]) => void): () => void {
    return onSnapshot(
      collection(db, 'profiles'),
      (snapshot) => {
        const loaded: CompanyProfile[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data.clientType === 'CV' || data.companyType === 'CV') {
            loaded.push({ id: docSnap.id, ...data } as CompanyProfile);
          }
        });
        callback(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'profiles');
      }
    );
  }

  /**
   * Helper to format company name: Uppercase and add type prefix if needed
   */
  static formatCompanyName(name: string, clientType: string): string {
    if (!name) return '';
    let formatted = name.toUpperCase().trim();
    const excludedTypes = ['PERORANGAN', 'PMA', 'OTHER'];

    if (!excludedTypes.includes(clientType)) {
      const prefix = clientType.toUpperCase();
      // Add prefix if not already present
      if (!formatted.startsWith(prefix + ' ') && !formatted.startsWith(prefix + '.')) {
        formatted = `${prefix} ${formatted}`;
      }
    }
    return formatted;
  }

  /**
   * Save (set with merge) a Company Profile
   */
  static async saveCompany(companyId: string, data: Partial<CompanyProfile>, isCv?: boolean): Promise<void> {
    const isCvCompany = isCv || data.clientType === 'CV' || data.companyType === 'CV';
    const collectionName = 'profiles';
    try {
      const clientType = data.clientType || (isCvCompany ? 'CV' : 'PT');
      const preparedData = {
        ...data,
        clientType,
        companyName: data.companyName ? this.formatCompanyName(data.companyName, clientType) : undefined
      };

      await setDoc(doc(db, collectionName, companyId), sanitizeForFirestore(preparedData), { merge: true });
      
      // Ensure the Google Drive folder exists for this client (for all client types!)
      if (preparedData.companyName) {
        try {
          const { auth } = await import('../lib/firebase');
          let token = '';
          if (auth.currentUser) {
            token = await auth.currentUser.getIdToken();
          }
          await fetch(getApiUrl('/api/v2/drive/ensure-client-folder'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              clientId: companyId,
              companyName: preparedData.companyName,
              clientType: preparedData.clientType
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
   * Update a Company Profile
   */
  static async updateCompany(companyId: string, data: Partial<CompanyProfile>, isCv?: boolean): Promise<void> {
    const collectionName = 'profiles';
    try {
      const updateData = { ...data };
      if (updateData.companyName || updateData.clientType) {
        const docRef = doc(db, collectionName, companyId);
        const snap = await getDocs(collection(db, collectionName));
        const currentData = snap.docs.find(d => d.id === companyId)?.data() || {};
        
        const finalType = updateData.clientType || currentData.clientType || 'PT';
        const finalName = updateData.companyName || currentData.companyName || '';
        
        if (finalName) {
          updateData.companyName = this.formatCompanyName(finalName, finalType);
        }
      }

      await updateDoc(doc(db, collectionName, companyId), sanitizeForFirestore(updateData));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${companyId}`);
      throw error;
    }
  }

  /**
   * Archive/unarchive a Profile
   */
  static async archiveCompany(companyId: string, currentStatus: boolean, isCv?: boolean): Promise<boolean> {
    const nextStatus = !currentStatus;
    const collectionName = 'profiles';
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
   * Duplicate a Profile
   */
  static async duplicateCompany(company: CompanyProfile, isCv?: boolean): Promise<CompanyProfile> {
    const clientType = company.clientType || 'PT';
    const duplicatedName = this.formatCompanyName(`${company.companyName} (Salinan)`, clientType);
    const newId = crypto.randomUUID();
    const duplicatedProfile: CompanyProfile = {
      ...company,
      id: newId,
      companyName: duplicatedName,
      updatedAt: new Date().toISOString()
    };
    const collectionName = 'profiles';
    try {
      await setDoc(doc(db, collectionName, newId), sanitizeForFirestore(duplicatedProfile));
      return duplicatedProfile;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${newId}`);
      throw error;
    }
  }

  /**
   * Delete a Profile
   */
  static async deleteCompany(companyId: string, isCv?: boolean): Promise<void> {
    const collectionName = 'profiles';
    try {
      await deleteDoc(doc(db, collectionName, companyId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${companyId}`);
      throw error;
    }
  }
}
