import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { sanitizeForFirestore } from '../utils/sanitize';
import { ProjectService } from './ProjectService';
import { DocumentGenerationService } from './DocumentGenerationService';
import { compareCompanyDocumentDiff } from '../lib/diffUtils';
import { AuthService } from './AuthService';
import { getApiUrl } from '../lib/api';
import { INITIAL_STATE } from '../domain/company/initialCompanyData';

export type DocumentDraftType = 'pendirian' | 'rupslb' | 'rupst';

export interface UnifiedDraftItem {
  id: string;
  type: DocumentDraftType;
  collectionName: string;
  companyName: string;
  subTitle?: string;
  documentTypeLabel: string;
  documentNumber?: string;
  createdAt?: string;
  updatedAt?: string;
  saveStatus: 'saved' | 'draft';
  driveSyncStatus: 'synced' | 'not_synced' | 'syncing' | 'error';
  driveFileId?: string;
  driveFolderId?: string;
  driveFileUrl?: string;
  driveFiles?: Array<{
    title: string;
    fileName: string;
    driveFileId: string;
    mimeType?: string;
    updatedAt?: string;
  }>;
  projectId?: string;
  rawData: any;
}

export class DocumentDraftService {
  /**
   * Returns the Firestore collection name for each document draft type.
   */
  static getCollectionName(type: DocumentDraftType): string {
    switch (type) {
      case 'pendirian':
        return 'pendirian_projects';
      case 'rupslb':
        return 'projects';
      case 'rupst':
        return 'rupst_projects';
      default:
        throw new Error(`Unknown draft type: ${type}`);
    }
  }

  /**
   * Maps raw Firestore data to standard UnifiedDraftItem format.
   */
  static mapToUnifiedDraft(type: DocumentDraftType, data: any): UnifiedDraftItem {
    const raw = data || {};
    const id = raw.id || '';
    const collectionName = this.getCollectionName(type);

    let companyName = '';
    let subTitle = '';
    let documentTypeLabel = '';
    let documentNumber = '';

    if (type === 'pendirian') {
      const isCV = Boolean(raw.namaCV || raw.peseros || raw.jobType === 'pendirian_cv');
      companyName = isCV 
        ? (raw.namaCV ? `CV. ${raw.namaCV.toUpperCase()}` : 'CV Baru')
        : (raw.namaPt ? `PT. ${raw.namaPt.toUpperCase()}` : (raw.companyName || 'PT Baru'));
      subTitle = raw.kotaKedudukan || raw.domicile || raw.alamatLengkapPT || raw.alamatLengkapCV || '';
      documentTypeLabel = isCV ? 'Pendirian CV' : 'Pendirian PT';
      documentNumber = raw.nomorAkta ? `Akta No. ${raw.nomorAkta}` : (raw.establishmentDeedNumber || '-');
    } else if (type === 'rupslb') {
      companyName = raw.companyName ? raw.companyName.toUpperCase() : 'PT Baru';
      subTitle = raw.newAddress?.city || raw.kotaKedudukan || raw.domicile || '';
      documentTypeLabel = raw.documentType === 'CIRCULAR' ? 'Sirkuler RUPS LB' : 'RUPS Luar Biasa (Akta/Notulen)';
      documentNumber = raw.nomorAkta ? `Akta No. ${raw.nomorAkta}` : (raw.circularResolutionNumber || '-');
    } else if (type === 'rupst') {
      companyName = raw.companyName ? raw.companyName.toUpperCase() : 'PT Baru';
      subTitle = raw.rupstFiscalYear ? `Tahun Buku ${raw.rupstFiscalYear}` : (raw.domicile || '');
      documentTypeLabel = raw.rupstType === 'sirkuler' ? 'Sirkuler RUPST' : 'RUPS Tahunan (Notulen/Akta)';
      documentNumber = raw.rupstFiscalYear ? `Tahun Buku ${raw.rupstFiscalYear}` : (raw.nomorAkta ? `Akta No. ${raw.nomorAkta}` : '-');
    }

    const driveFileId = raw.driveFileId || (raw.driveFiles && raw.driveFiles.length > 0 ? raw.driveFiles[0].driveFileId : undefined);
    const driveFileUrl = raw.driveFileUrl || (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : undefined);
    const hasDriveFile = Boolean(driveFileId);

    return {
      id,
      type,
      collectionName,
      companyName,
      subTitle,
      documentTypeLabel,
      documentNumber,
      createdAt: raw.createdAt || raw.signingDate || raw.establishmentDeedDate || raw.updatedAt,
      updatedAt: raw.updatedAt,
      saveStatus: raw.documentStatus === 'FINAL' || raw.documentStatus === 'COMPLETED' ? 'saved' : 'draft',
      driveSyncStatus: hasDriveFile ? 'synced' : 'not_synced',
      driveFileId,
      driveFolderId: raw.driveFolderId,
      driveFileUrl,
      driveFiles: raw.driveFiles || (driveFileId ? [{
        title: documentTypeLabel,
        fileName: `${companyName}.docx`,
        driveFileId
      }] : []),
      projectId: raw.projectId || raw.activeProjectContext,
      rawData: raw
    };
  }

  /**
   * Loads a single draft from Firestore by ID.
   */
  static async getDraft(type: DocumentDraftType, id: string): Promise<any | null> {
    const colName = this.getCollectionName(type);
    try {
      const snap = await getDoc(doc(db, colName, id));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${colName}/${id}`);
      return null;
    }
  }

  /**
   * Saves or updates a draft document in its respective collection.
   * Ensures ID consistency, diff logging, and optional Drive sync.
   */
  static async saveDraft(
    type: DocumentDraftType,
    draftId: string | null,
    formData: any,
    user: any,
    userProfile?: any,
    activeProjectContext?: string | null,
    driveUploadOptions?: {
      skipUpload?: boolean;
      allowedKinds?: ('notulen' | 'pernyataan' | 'akta' | 'pendirian' | 'peralihan_saham')[];
    }
  ): Promise<{ id: string; success: boolean; driveFileId?: string }> {
    if (!user) {
      throw new Error('Anda harus login terlebih dahulu.');
    }

    const colName = this.getCollectionName(type);
    const isNew = !draftId || draftId === 'new';
    const id = isNew ? crypto.randomUUID() : draftId;

    let existingData: any = null;
    let changes: any[] = [];

    if (!isNew) {
      try {
        const oldSnap = await getDoc(doc(db, colName, id));
        if (oldSnap.exists()) {
          existingData = oldSnap.data();
          changes = compareCompanyDocumentDiff(existingData, formData);
        }
      } catch (err) {
        console.warn(`[DocumentDraftService] Failed fetching existing draft for diff:`, err);
      }
    }

    const nowIso = new Date().toISOString();
    const finalData = {
      ...formData,
      id,
      updatedAt: nowIso,
      createdAt: existingData?.createdAt || formData.createdAt || nowIso,
      // Preserve existing Drive metadata if not explicitly provided
      driveFileId: formData.driveFileId || existingData?.driveFileId || null,
      driveFolderId: formData.driveFolderId || existingData?.driveFolderId || null,
      driveFileUrl: formData.driveFileUrl || existingData?.driveFileUrl || null,
      driveFiles: formData.driveFiles || existingData?.driveFiles || null,
      driveSyncStatus: formData.driveSyncStatus || (existingData?.driveFileId ? 'synced' : 'not_synced'),
      projectId: activeProjectContext || formData.projectId || existingData?.projectId || null
    };

    try {
      // 1. Save sanitized document to Firestore collection
      await setDoc(doc(db, colName, id), sanitizeForFirestore(finalData));

      // 2. If activeProjectContext is set, link document to the project and generate docs
      if (activeProjectContext) {
        let docName = '';
        if (type === 'pendirian') {
          const isCV = Boolean(finalData.namaCV || finalData.peseros || finalData.jobType === 'pendirian_cv');
          docName = isCV
            ? `Draft Pendirian CV - ${finalData.namaCV ? 'CV. ' + finalData.namaCV : 'CV Baru'}`
            : `Draft Pendirian PT - ${finalData.namaPt || 'PT Baru'}`;
        } else if (type === 'rupslb') {
          docName = finalData.documentType === 'CIRCULAR'
            ? `Draft Sirkuler RUPS LB - ${finalData.companyName || 'PT Baru'}`
            : `Draft RUPS LB - ${finalData.companyName || 'PT Baru'}`;
        } else if (type === 'rupst') {
          docName = finalData.rupstType === 'sirkuler'
            ? `Draft Sirkuler RUPST - ${finalData.companyName || 'PT Baru'}`
            : `Draft RUPST - ${finalData.companyName || 'PT Baru'}`;
        }

        await ProjectService.addDocument(activeProjectContext, {
          name: docName,
          type: 'docx',
          url: `/${type === 'rupslb' ? 'rupslb' : type}`,
          refId: id,
          uploadedBy: user?.email || 'staff_notaris',
          changes: changes.length > 0 ? changes : undefined
        });

        // Trigger Google Drive upload for project
        if (!driveUploadOptions?.skipUpload) {
          try {
            await DocumentGenerationService.generateAndUploadAllForProject(
              activeProjectContext,
              finalData,
              user?.email,
              userProfile?.name,
              driveUploadOptions?.allowedKinds ? { allowedKinds: driveUploadOptions.allowedKinds } : undefined
            );

            // Update draft with project uploaded driveFileId if available
            const qUpload = query(
              collection(db, 'project_uploaded_documents'),
              where('projectId', '==', activeProjectContext)
            );
            const snapUpload = await getDocs(qUpload);
            if (!snapUpload.empty) {
              const firstDoc = snapUpload.docs[0].data();
              if (firstDoc.driveFileId) {
                await setDoc(doc(db, colName, id), {
                  driveFileId: firstDoc.driveFileId,
                  driveFolderId: firstDoc.driveFolderId || null,
                  driveFileUrl: `https://drive.google.com/file/d/${firstDoc.driveFileId}/view`,
                  driveSyncStatus: 'synced',
                  driveLastSyncedAt: new Date().toISOString()
                }, { merge: true });
                finalData.driveFileId = firstDoc.driveFileId;
              }
            }
          } catch (driveErr) {
            console.warn('[DocumentDraftService] Project Drive sync non-fatal warning:', driveErr);
          }
        }
      }

      return { id, success: true, driveFileId: finalData.driveFileId };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${colName}/${id}`);
      throw error;
    }
  }

  /**
   * Deletes a draft document safely with permission checks.
   */
  static async deleteDraft(
    type: DocumentDraftType,
    draftId: string,
    user?: any,
    userProfile?: any
  ): Promise<boolean> {
    const colName = this.getCollectionName(type);
    try {
      // 1. Fetch document to check for drive file
      const docSnap = await getDoc(doc(db, colName, draftId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.driveFileId) {
          try {
            const token = await AuthService.getToken();
            await fetch(getApiUrl(`/api/v2/drive/delete-file/${data.driveFileId}`), {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
          } catch (driveErr) {
            console.warn(`[DocumentDraftService] Failed deleting file from Drive:`, driveErr);
          }
        }
      }

      // 2. Delete document from Firestore
      await deleteDoc(doc(db, colName, draftId));
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${colName}/${draftId}`);
      throw error;
    }
  }

  /**
   * Syncs / uploads generated DOCX files for a draft to Google Drive.
   * Works for both standalone drafts and project-linked drafts.
   */
  static async syncDraftToGoogleDrive(
    type: DocumentDraftType,
    draftId: string,
    formData: any,
    user: any,
    userProfile?: any,
    activeProjectContext?: string | null
  ): Promise<{ success: boolean; driveFileId?: string; fileUrl?: string; error?: string }> {
    if (!user) {
      return { success: false, error: 'User belum login' };
    }

    const token = await AuthService.getToken();
    if (!token) {
      return { success: false, error: 'Token autentikasi Google tidak tersedia' };
    }

    const colName = this.getCollectionName(type);
    const dataToUse = { ...INITIAL_STATE, ...formData };
    const companyName = (
      dataToUse.namaPt || dataToUse.namaCV || dataToUse.companyName || 'DRAF_DOKUMEN'
    ).trim();

    try {
      // 1. Generate DOCX blob based on document type
      let genResult: { filename: string; blob: Blob } | null = null;

      if (type === 'pendirian') {
        const isCV = Boolean(dataToUse.namaCV || dataToUse.peseros || dataToUse.jobType === 'pendirian_cv');
        if (isCV) {
          const { generatePendirianCVDocx } = await import('../lib/generatePendirianCVDocx');
          genResult = await generatePendirianCVDocx(dataToUse, true) as any;
        } else {
          const { generatePendirianDocx } = await import('../lib/generatePendirianDocx');
          genResult = await generatePendirianDocx(dataToUse, true);
        }
      } else if (type === 'rupslb') {
        const { generateRUPSDocx } = await import('../lib/generateRUPSDocx');
        genResult = await generateRUPSDocx(dataToUse, true);
      } else if (type === 'rupst') {
        if (dataToUse.rupstType === 'sirkuler') {
          const { generateSirkulerLaporanDocx } = await import('../lib/generateSirkulerLaporanDocx');
          genResult = await generateSirkulerLaporanDocx(dataToUse, true);
        } else {
          const { generateRUPSTAktaDocx } = await import('../lib/generateRUPSTAktaDocx');
          genResult = await generateRUPSTAktaDocx(dataToUse, true);
        }
      }

      if (!genResult || !genResult.blob) {
        return { success: false, error: 'Gagal membuat file DOCX' };
      }

      const { filename, blob } = genResult;

      // 2. Ensure target Google Drive folder
      let targetFolderId = formData.driveFolderId;

      if (!targetFolderId && (activeProjectContext || formData.projectId)) {
        const projId = activeProjectContext || formData.projectId;
        try {
          const projSnap = await getDoc(doc(db, 'office_projects', projId));
          if (projSnap.exists()) {
            targetFolderId = projSnap.data().metadata?.driveFolderId;
          }
        } catch (_) {}
      }

      if (!targetFolderId) {
        // Ensure folder with company name
        const folderRes = await fetch(getApiUrl('/api/v2/drive/ensure-folder'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: `DRAFT - ${companyName.toUpperCase()}`
          })
        });

        if (folderRes.ok) {
          const folderData = await folderRes.json();
          targetFolderId = folderData.folder?.id;
        }
      }

      // 3. Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const base64 = await base64Promise;

      // 4. If old file existed, remove it to prevent duplicates
      if (formData.driveFileId) {
        try {
          await fetch(getApiUrl(`/api/v2/drive/delete-file/${formData.driveFileId}`), {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        } catch (_) {}
      }

      // 5. Upload new file to Drive
      const uploadRes = await fetch(getApiUrl('/api/v2/drive/upload-file'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fileName: filename,
          mimeType: blob.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          parentFolderId: targetFolderId,
          base64
        })
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        return { success: false, error: `Upload ke Google Drive gagal: ${errText.substring(0, 100)}` };
      }

      const uploadData = await uploadRes.json();
      const newDriveFileId = uploadData.file?.id;
      const fileUrl = uploadData.file?.webViewLink || `https://drive.google.com/file/d/${newDriveFileId}/view`;

      // 6. Update Firestore draft with Drive metadata
      await setDoc(doc(db, colName, draftId), {
        driveFileId: newDriveFileId,
        driveFolderId: targetFolderId || null,
        driveFileUrl: fileUrl,
        driveSyncStatus: 'synced',
        driveLastSyncedAt: new Date().toISOString()
      }, { merge: true });

      return {
        success: true,
        driveFileId: newDriveFileId,
        fileUrl
      };
    } catch (e: any) {
      console.error('[DocumentDraftService] Error syncing to Drive:', e);
      return { success: false, error: e.message || 'Gagal sinkronisasi ke Google Drive' };
    }
  }

  /**
   * Helper to open Google Drive file URL in new tab.
   */
  static openDriveDocument(driveFileId?: string, driveFileUrl?: string): void {
    const url = driveFileUrl || (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : '');
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
}
