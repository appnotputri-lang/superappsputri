import { db } from '../lib/firebase';
import { getApiUrl } from '../lib/api';
import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  where
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
      // 1. Migrate CV profiles from legacy 'cv_profiles' collection
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

      // Load all profiles to perform checks and fixes
      const profilesSnap = await getDocs(collection(db, 'profiles'));
      
      // 2. Add clientType: 'PT' to any existing profiles that don't have it and are NOT CVs
      for (const docSnap of profilesSnap.docs) {
        const data = docSnap.data();
        if (!data.clientType) {
          const isCv = data.companyType === 'CV';
          const defaultClientType = isCv ? 'CV' : 'PT';
          console.log(`Setting default clientType: ${defaultClientType} for profile ${docSnap.id} (${data.companyName})`);
          await updateDoc(doc(db, 'profiles', docSnap.id), {
            clientType: defaultClientType
          });
        }
      }

      // 3. Auto-fix any mismatched CV fields: clientType CV and companyType CV must always match
      for (const docSnap of profilesSnap.docs) {
        const data = docSnap.data();
        const isCvByClientType = data.clientType === 'CV';
        const isCvByCompanyType = data.companyType === 'CV';
        
        if (isCvByClientType && data.companyType !== 'CV') {
          console.log(`Auto-fixing mismatched companyType -> CV for profile ${docSnap.id} (${data.companyName})`);
          await updateDoc(doc(db, 'profiles', docSnap.id), {
            companyType: 'CV'
          });
        } else if (isCvByCompanyType && data.clientType !== 'CV') {
          console.log(`Auto-fixing mismatched clientType -> CV for profile ${docSnap.id} (${data.companyName})`);
          await updateDoc(doc(db, 'profiles', docSnap.id), {
            clientType: 'CV'
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
    return name.toUpperCase().trim();
  }

  /**
    * Save (set with merge) a Company Profile
    */
  static async saveCompany(companyId: string, data: Partial<CompanyProfile>, isCv?: boolean): Promise<void> {
    const isCvCompany = isCv || data.clientType === 'CV' || data.companyType === 'CV';
    const collectionName = 'profiles';
    try {
      const clientType = isCvCompany ? 'CV' : (data.clientType || 'PT');
      const companyType = isCvCompany ? 'CV' : (data.companyType || 'PT_LOKAL');
      const preparedData = {
        ...data,
        clientType,
        companyType,
        companyName: data.companyName ? this.formatCompanyName(data.companyName, clientType) : undefined
      };

      const docRef = doc(db, collectionName, companyId);
      const docSnap = await getDoc(docRef);
      const oldData = docSnap.exists() ? docSnap.data() as CompanyProfile : null;
      const oldCompanyName = oldData?.companyName;

      if (preparedData.companyName) {
        const qName = preparedData.companyName.trim().toUpperCase();
        const isNameUnchanged = oldCompanyName && oldCompanyName.trim().toUpperCase() === qName;

        if (!isNameUnchanged) {
          const profilesColl = collection(db, collectionName);
          const q = query(profilesColl, where('companyName', '==', qName));
          const querySnap = await getDocs(q);
          
          const duplicate = querySnap.docs.find(docSnap => {
            if (docSnap.id === companyId) return false;
            const docData = docSnap.data();
            return docData.clientType === clientType;
          });

          if (duplicate) {
            throw new Error(`KLIEN_NAME_EXISTS:${preparedData.companyName}`);
          }
        }
      }

      await setDoc(docRef, sanitizeForFirestore(preparedData), { merge: true });
      
      // Ensure or Rename the Google Drive folder for this client
      if (preparedData.companyName) {
        await this.handleRenameOrEnsureFolder(companyId, oldCompanyName, preparedData.companyName, clientType);
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('KLIEN_NAME_EXISTS:')) {
        throw error;
      }
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${companyId}`);
      throw error;
    }
  }

  /**
   * Helper to rename or ensure Google Drive folder
   */
  private static async handleRenameOrEnsureFolder(companyId: string, oldCompanyName: string | undefined, newCompanyName: string, clientType: string) {
    try {
      const { auth } = await import('../lib/firebase');
      let token = '';
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      const formattedNewName = this.formatCompanyName(newCompanyName, clientType);
      const formattedOldName = oldCompanyName ? this.formatCompanyName(oldCompanyName, clientType) : undefined;

      if (formattedOldName && formattedOldName !== formattedNewName) {
        console.log(`[CompanyService] Renaming Drive folder from "${formattedOldName}" to "${formattedNewName}"`);
        await fetch(getApiUrl('/api/v2/drive/rename-client-folder'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            oldCompanyName: formattedOldName,
            newCompanyName: formattedNewName,
            clientType
          })
        });
      } else {
        console.log(`[CompanyService] Ensuring Drive folder for "${formattedNewName}"`);
        await fetch(getApiUrl('/api/v2/drive/ensure-client-folder'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            clientId: companyId,
            companyName: formattedNewName,
            clientType
          })
        });
      }
    } catch (e) {
      console.warn("[CompanyService] Failed to rename or ensure drive folder:", e);
    }
  }

  /**
   * Update a Company Profile
   */
  static async updateCompany(companyId: string, data: Partial<CompanyProfile>, isCv?: boolean): Promise<void> {
    const collectionName = 'profiles';
    try {
      const updateData = { ...data };
      
      const docRef = doc(db, collectionName, companyId);
      const snap = await getDoc(docRef);
      const currentData = (snap.exists() ? snap.data() : {}) as any;
      const oldCompanyName = currentData.companyName;

      const finalType = updateData.clientType || currentData.clientType || 'PT';
      const finalName = updateData.companyName || currentData.companyName || '';
      
      if (finalName) {
        updateData.companyName = this.formatCompanyName(finalName, finalType);
      }

      if (updateData.companyName) {
        const qName = updateData.companyName.trim().toUpperCase();
        const isNameUnchanged = oldCompanyName && oldCompanyName.trim().toUpperCase() === qName;

        if (!isNameUnchanged) {
          const profilesColl = collection(db, collectionName);
          const q = query(profilesColl, where('companyName', '==', qName));
          const querySnap = await getDocs(q);
          
          const duplicate = querySnap.docs.find(docSnap => {
            if (docSnap.id === companyId) return false;
            const docData = docSnap.data();
            return docData.clientType === finalType;
          });

          if (duplicate) {
            throw new Error(`KLIEN_NAME_EXISTS:${updateData.companyName}`);
          }
        }
      }

      await updateDoc(docRef, sanitizeForFirestore(updateData));

      if (updateData.companyName) {
        await this.handleRenameOrEnsureFolder(companyId, oldCompanyName, updateData.companyName, finalType);
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('KLIEN_NAME_EXISTS:')) {
        throw error;
      }
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
   * Delete a Profile, all associated projects and uploaded documents,
   * all Firestore records, and its Google Drive folders.
   */
  static async deleteCompany(companyId: string, isCv?: boolean): Promise<void> {
    const collectionName = 'profiles';
    try {
      // 1. Fetch profile to get driveFolderId, companyName, clientType
      let companyName = '';
      let clientType = 'PT';
      let driveFolderId = '';
      try {
        const companySnap = await getDoc(doc(db, collectionName, companyId));
        if (companySnap.exists()) {
          const data = companySnap.data();
          companyName = data.companyName || '';
          clientType = data.clientType || (isCv ? 'CV' : 'PT');
          driveFolderId = data.driveFolderId || '';
        } else {
          const cpSnap = await getDoc(doc(db, 'company_profiles', companyId));
          if (cpSnap.exists()) {
            const data = cpSnap.data();
            companyName = data.companyName || '';
            clientType = data.clientType || 'PT';
            driveFolderId = data.driveFolderId || '';
          }
        }
      } catch (e) {
        console.warn("[CompanyService] Could not pre-fetch profile before delete:", e);
      }

      // 2. Scan and gather ALL project IDs associated with this client
      const projectIdsToDelete = new Set<string>();
      
      const projectCollections = [
        'office_projects',
        'projects',
        'rupst_projects',
        'rupst_public_projects',
        'pendirian_projects'
      ];

      for (const colName of projectCollections) {
        try {
          const colRef = collection(db, colName);
          const snap = await getDocs(colRef);
          snap.forEach(d => {
            const data = d.data();
            if (
              d.id === companyId ||
              data.clientId === companyId ||
              data.selectedProfileId === companyId ||
              data.companyId === companyId ||
              data.metadata?.clientId === companyId
            ) {
              projectIdsToDelete.add(d.id);
            }
          });
        } catch (e) {
          console.warn(`[CompanyService] Error scanning collection ${colName} for client projects:`, e);
        }
      }

      // 3. Delete each associated project (and its subcollections, drive folders, uploaded docs)
      const { ProjectService } = await import('./ProjectService');
      for (const projId of projectIdsToDelete) {
        try {
          console.log(`[CompanyService] Deleting associated project ${projId} for client ${companyId}...`);
          await ProjectService.deleteProject(projId);
        } catch (projErr) {
          console.warn(`[CompanyService] Error deleting project ${projId}:`, projErr);
        }
      }

      // 4. Clean up any remaining records in project_uploaded_documents for this client ID
      try {
        const uploadedDocsCol = collection(db, 'project_uploaded_documents');
        const docRefsToDelete = new Set<string>();

        // Query by clientId
        const qClient = query(uploadedDocsCol, where('clientId', '==', companyId));
        const qClientSnap = await getDocs(qClient);
        qClientSnap.forEach(d => docRefsToDelete.add(d.id));

        // Query by selectedProfileId
        const qSel = query(uploadedDocsCol, where('selectedProfileId', '==', companyId));
        const qSelSnap = await getDocs(qSel);
        qSelSnap.forEach(d => docRefsToDelete.add(d.id));

        // Query by companyId
        const qComp = query(uploadedDocsCol, where('companyId', '==', companyId));
        const qCompSnap = await getDocs(qComp);
        qCompSnap.forEach(d => docRefsToDelete.add(d.id));

        // Query for each projectId to delete
        for (const projId of Array.from(projectIdsToDelete)) {
          const qProj = query(uploadedDocsCol, where('projectId', '==', projId));
          const qProjSnap = await getDocs(qProj);
          qProjSnap.forEach(d => docRefsToDelete.add(d.id));
        }

        // Perform deletions
        for (const docId of Array.from(docRefsToDelete)) {
          await deleteDoc(doc(db, 'project_uploaded_documents', docId));
        }
      } catch (e) {
        console.warn("[CompanyService] Error cleaning project_uploaded_documents for client:", e);
      }

      // 5. Call backend API to delete client folder from Google Drive
      try {
        const { auth } = await import('../lib/firebase');
        let token = '';
        if (auth.currentUser) {
          token = await auth.currentUser.getIdToken();
        }
        await fetch(getApiUrl('/api/v2/drive/delete-client-folder'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            clientId: companyId,
            companyName,
            clientType,
            driveFolderId
          })
        });
      } catch (e) {
        console.warn("[CompanyService] Error deleting Google Drive folder:", e);
      }

      // 6. Delete client documents from Firestore
      await deleteDoc(doc(db, 'profiles', companyId)).catch(() => {});
      await deleteDoc(doc(db, 'company_profiles', companyId)).catch(() => {});
      await deleteDoc(doc(db, 'cv_profiles', companyId)).catch(() => {});
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${companyId}`);
      throw error;
    }
  }

  /**
   * Merge one or more source companies into a target company
   * without losing associated projects or key profiles data.
   */
  static async mergeCompanies(targetId: string, sourceIds: string[]): Promise<{ projectsMerged: number }> {
    const collectionName = 'profiles';
    let projectsMerged = 0;
    try {
      // 1. Fetch Target Profile
      const targetRef = doc(db, collectionName, targetId);
      const targetSnap = await getDoc(targetRef);
      if (!targetSnap.exists()) {
        throw new Error('Klien utama (target) tidak ditemukan.');
      }
      const targetData = targetSnap.data() as CompanyProfile;

      // 2. Fetch Source Profiles & Merge Fields
      const mergedFields: Partial<CompanyProfile> = {};
      
      for (const sourceId of sourceIds) {
        if (sourceId === targetId) continue;
        const sourceRef = doc(db, collectionName, sourceId);
        const sourceSnap = await getDoc(sourceRef);
        if (!sourceSnap.exists()) continue;
        const sourceData = sourceSnap.data() as CompanyProfile;

        // Loop through keys and fill empty target fields with source fields
        Object.keys(sourceData).forEach((key) => {
          const k = key as keyof CompanyProfile;
          const targetVal = targetData[k];
          const sourceVal = sourceData[k];

          if (sourceVal !== undefined && sourceVal !== null && sourceVal !== '') {
            // If target value is missing/empty, adopt the source value
            if (targetVal === undefined || targetVal === null || targetVal === '' || (Array.isArray(targetVal) && targetVal.length === 0)) {
              (mergedFields as any)[k] = sourceVal;
            } else if (Array.isArray(targetVal) && Array.isArray(sourceVal)) {
              // For arrays like shareholders or kblis, combine unique items
              if (k === 'shareholders') {
                const targetSH = targetVal as any[];
                const sourceSH = sourceVal as any[];
                // Basic deduplication of shareholders based on name or id
                const combinedSH = [...targetSH];
                sourceSH.forEach(sh => {
                  const exists = targetSH.some(t => t.name === sh.name || t.id === sh.id);
                  if (!exists) combinedSH.push(sh);
                });
                (mergedFields as any)[k] = combinedSH;
              } else if (k === 'kbliItems') {
                const targetKbli = targetVal as any[];
                const sourceKbli = sourceVal as any[];
                const combinedKbli = [...targetKbli];
                sourceKbli.forEach(kb => {
                  const exists = targetKbli.some(t => (t.kode || t) === (kb.kode || kb));
                  if (!exists) combinedKbli.push(kb);
                });
                (mergedFields as any)[k] = combinedKbli;
              }
            }
          }
        });
      }

      // Save updated Target profile
      if (Object.keys(mergedFields).length > 0) {
        await updateDoc(targetRef, sanitizeForFirestore(mergedFields));
      }

      // 3. Scan & Reassociate Project Collections
      const projectCollections = [
        'office_projects',
        'projects',
        'rupst_projects',
        'rupst_public_projects',
        'pendirian_projects'
      ];

      for (const colName of projectCollections) {
        try {
          const colRef = collection(db, colName);
          const snap = await getDocs(colRef);
          
          for (const d of snap.docs) {
            const data = d.data();
            const projId = d.id;
            
            // Check if this project matches any of the source IDs
            const matchesSource = sourceIds.some(sourceId => 
              projId === sourceId ||
              data.clientId === sourceId ||
              data.selectedProfileId === sourceId ||
              data.companyId === sourceId ||
              data.metadata?.clientId === sourceId
            );

            if (matchesSource) {
              const updates: any = {};
              if (data.clientId && sourceIds.includes(data.clientId)) updates.clientId = targetId;
              if (data.selectedProfileId && sourceIds.includes(data.selectedProfileId)) updates.selectedProfileId = targetId;
              if (data.companyId && sourceIds.includes(data.companyId)) updates.companyId = targetId;
              if (data.metadata?.clientId && sourceIds.includes(data.metadata?.clientId)) {
                updates.metadata = { ...data.metadata, clientId: targetId };
              }
              
              if (Object.keys(updates).length > 0) {
                await updateDoc(doc(db, colName, projId), sanitizeForFirestore(updates));
                projectsMerged++;
              }
            }
          }
        } catch (e) {
          console.warn(`[CompanyService] Error updating projects in ${colName} during merge:`, e);
        }
      }

      // 4. Reassociate project_uploaded_documents
      try {
        const uploadedDocsCol = collection(db, 'project_uploaded_documents');
        const docsToUpdate = new Map<string, { ref: any, data: any }>();

        for (const sourceId of sourceIds) {
          // Query by clientId
          const qClient = query(uploadedDocsCol, where('clientId', '==', sourceId));
          const qClientSnap = await getDocs(qClient);
          qClientSnap.forEach(d => {
            docsToUpdate.set(d.id, { ref: d.ref, data: d.data() });
          });

          // Query by selectedProfileId
          const qSel = query(uploadedDocsCol, where('selectedProfileId', '==', sourceId));
          const qSelSnap = await getDocs(qSel);
          qSelSnap.forEach(d => {
            docsToUpdate.set(d.id, { ref: d.ref, data: d.data() });
          });

          // Query by companyId
          const qComp = query(uploadedDocsCol, where('companyId', '==', sourceId));
          const qCompSnap = await getDocs(qComp);
          qCompSnap.forEach(d => {
            docsToUpdate.set(d.id, { ref: d.ref, data: d.data() });
          });
        }

        for (const { ref, data } of Array.from(docsToUpdate.values())) {
          const updates: any = {};
          if (data.clientId && sourceIds.includes(data.clientId)) updates.clientId = targetId;
          if (data.selectedProfileId && sourceIds.includes(data.selectedProfileId)) updates.selectedProfileId = targetId;
          if (data.companyId && sourceIds.includes(data.companyId)) updates.companyId = targetId;
          
          if (Object.keys(updates).length > 0) {
            await updateDoc(ref, sanitizeForFirestore(updates));
          }
        }
      } catch (e) {
        console.warn("[CompanyService] Error updating project_uploaded_documents during merge:", e);
      }

      // 5. Delete source profile documents
      for (const sourceId of sourceIds) {
        if (sourceId === targetId) continue;
        await deleteDoc(doc(db, collectionName, sourceId)).catch(() => {});
        await deleteDoc(doc(db, 'company_profiles', sourceId)).catch(() => {});
        await deleteDoc(doc(db, 'cv_profiles', sourceId)).catch(() => {});
      }

      return { projectsMerged };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${targetId}`);
      throw error;
    }
  }
}
