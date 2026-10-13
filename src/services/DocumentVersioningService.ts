import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { getApiUrl } from '../lib/api';

export interface UploadedDocument {
  id: string;
  companyId: string;
  projectId: string;
  type?: 'minutes' | 'deed' | 'sksp' | 'custom';
  title: string;
  fileName: string;
  mimeType: string;
  size: number;
  driveFileId: string;
  driveFolderId: string;
  uploadedBy: string;
  uploadedAt: string;
  savedAt?: string;
  createdAt: string;
  documentSource?: 'generated' | 'manual' | 'drive_sync';
  documentCategory?: 'draft_akta' | 'notulen' | 'surat_pernyataan' | 'scan_akta' | 'scan_notulen' | 'sksp' | 'custom';
  // Revision & versioning metadata
  parentDocumentId?: string;
  revisionNumber?: number;
  versionStatus?: 'versi awal' | 'revisi';
  isLatest?: boolean;
  documentType?: 'RUPST' | 'RUPSLB';
}

export interface RevisionResolution {
  isNewDocument: boolean;
  rootParentId: string;
  nextRevisionNumber: number;
  familyDocs: UploadedDocument[];
  originalDocName: string;
}

export class DocumentVersioningService {
  /**
   * Checks if the document is RUPST or RUPSLB, and returns the canonical documentType.
   */
  static getDocumentType(jobType?: string, title?: string, category?: string): 'RUPST' | 'RUPSLB' | null {
    const jt = (jobType || '').toLowerCase();
    const t = (title || '').toLowerCase();
    const c = (category || '').toLowerCase();

    if (
      jt === 'rups_t' ||
      jt === 'sirkuler' ||
      jt === 'rupst' ||
      jt === 'rupst_public' ||
      t.includes('rupst') ||
      c.includes('rupst')
    ) {
      return 'RUPST';
    }

    if (
      jt === 'rups_lb' ||
      jt === 'sirkuler_rupslb' ||
      jt === 'rupslb' ||
      t.includes('rups lb') ||
      t.includes('rupslb') ||
      c.includes('rupslb')
    ) {
      return 'RUPSLB';
    }

    return null;
  }

  /**
   * Helper to strip file extension and any existing 'Revisi N' suffix,
   * returning normalized lowercase base name.
   */
  static getBaseCleanName(fileName?: string): string {
    if (!fileName) return '';
    return fileName
      .replace(/\.docx$/i, '')
      .replace(/\s+Revisi\s+\d+$/i, '')
      .trim()
      .toLowerCase();
  }

  /**
   * Generates revision filename according to specifications:
   * Initial: "Draft RUPST PT ABC.docx"
   * Revision 1: "Draft RUPST PT ABC Revisi 1.docx"
   * Revision 2: "Draft RUPST PT ABC Revisi 2.docx"
   * etc.
   */
  static getRevisionFileName(baseFileName: string, revisionNumber: number): string {
    // 1. Remove .docx extension (case-insensitive)
    let cleanName = baseFileName.replace(/\.docx$/i, '').trim();

    // 2. Remove existing "Revisi [N]" suffix to avoid duplicate appending
    cleanName = cleanName.replace(/\s+Revisi\s+\d+$/i, '').trim();

    if (revisionNumber <= 0) {
      return `${cleanName}.docx`;
    }

    return `${cleanName} Revisi ${revisionNumber}.docx`;
  }

  /**
   * Resolves revision information for a document within a project.
   * Identifies original document, root parent ID, and determines next revision number
   * based on stored revision records in Firestore.
   */
  static resolveRevisionInfo(
    allDocsForProject: UploadedDocument[],
    category: string,
    title?: string,
    baseFileName?: string
  ): RevisionResolution {
    // 1. Find all docs in project matching this document family
    const cleanTargetBase = this.getBaseCleanName(baseFileName);

    const matchingDocs = allDocsForProject.filter(d => {
      const cleanDocBase = this.getBaseCleanName(d.fileName);
      const fileNameMatch = Boolean(cleanTargetBase && cleanDocBase && cleanTargetBase === cleanDocBase);
      const titleMatch = Boolean(title && d.title && d.title.trim().toLowerCase() === title.trim().toLowerCase());
      const categoryMatch = Boolean(category && d.documentCategory === category);

      if (fileNameMatch) return true;
      if (titleMatch && categoryMatch) return true;
      if (!cleanTargetBase && !title && categoryMatch) return true;

      return false;
    });

    if (matchingDocs.length === 0) {
      const generatedId = crypto.randomUUID();
      return {
        isNewDocument: true,
        rootParentId: generatedId,
        nextRevisionNumber: 0,
        familyDocs: [],
        originalDocName: baseFileName || ''
      };
    }

    // 2. Identify root parent ID:
    // Look for document with parentDocumentId, or document with revisionNumber === 0,
    // or the oldest matching document.
    const rootDocWithParent = matchingDocs.find(d => d.parentDocumentId);
    const rootDoc = rootDocWithParent ||
      matchingDocs.find(d => d.revisionNumber === 0) ||
      matchingDocs.find(d => !d.parentDocumentId) ||
      matchingDocs[0];

    const rootParentId = rootDoc.parentDocumentId || rootDoc.id;

    // 3. Find all family documents belonging to this root parent ID
    const familyDocs = allDocsForProject.filter(d => {
      if (d.parentDocumentId === rootParentId || d.id === rootParentId) return true;
      if (matchingDocs.some(m => m.id === d.id)) return true;
      return false;
    });

    // 4. Calculate next revision number based on stored revision numbers
    const storedRevisions = familyDocs.map(d => {
      if (typeof d.revisionNumber === 'number') {
        return d.revisionNumber;
      }
      // Backward compatibility for legacy docs: parse from fileName if present
      const match = d.fileName.match(/\s+Revisi\s+(\d+)\.docx$/i);
      if (match) {
        return parseInt(match[1], 10);
      }
      return 0; // Legacy document without revisionNumber is revision 0 (versi awal)
    });

    const maxStoredRev = Math.max(0, ...storedRevisions);
    const nextRevisionNumber = maxStoredRev + 1;

    // 5. Determine base clean document name from root doc
    const originalDoc = familyDocs.find(d => d.revisionNumber === 0 || d.id === rootParentId) || rootDoc;
    const originalDocName = originalDoc?.fileName || baseFileName || '';

    return {
      isNewDocument: false,
      rootParentId,
      nextRevisionNumber,
      familyDocs,
      originalDocName
    };
  }

  /**
   * Saves a RUPST or RUPSLB document revision to Google Drive and Firestore.
   * STRICT GUARANTEES:
   * - Old files in Google Drive are NEVER deleted or overwritten.
   * - Old records in Firestore are NEVER deleted.
   * - Revision number is strictly incremented from stored Firestore revision records.
   * - Upload failures abort before updating Firestore, preventing broken states.
   * - Active document reference is updated so isLatest points to the newest revision.
   */
  static async saveDocumentWithVersioning(params: {
    projectId: string;
    companyId: string;
    driveFolderId: string;
    category: 'draft_akta' | 'notulen' | 'surat_pernyataan' | 'scan_akta' | 'scan_notulen' | 'sksp' | 'custom';
    title: string;
    baseFileName: string;
    blob: Blob;
    jobType: string;
    userName: string;
    token: string;
  }): Promise<UploadedDocument> {
    const {
      projectId,
      companyId,
      driveFolderId,
      category,
      title,
      baseFileName,
      blob,
      jobType,
      userName,
      token
    } = params;

    const docType = this.getDocumentType(jobType, title, category) || 'RUPST';

    // 1. Fetch all documents for this project from project_uploaded_documents
    const docQuery = query(
      collection(db, 'project_uploaded_documents'),
      where('projectId', '==', projectId)
    );
    let docSnap;
    try {
      docSnap = await getDocs(docQuery);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'project_uploaded_documents');
      throw err;
    }
    const allDocs = !docSnap.empty ? docSnap.docs.map(d => d.data() as UploadedDocument) : [];

    // 2. Identify original document and full revision history
    const revInfo = this.resolveRevisionInfo(allDocs, category, title, baseFileName);

    const revisionNumber = revInfo.isNewDocument ? 0 : revInfo.nextRevisionNumber;
    const targetFileName = this.getRevisionFileName(revInfo.originalDocName || baseFileName, revisionNumber);

    // 3. Convert blob to base64
    const toBase64 = (b: Blob): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(b);
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
      });
    };
    const base64 = await toBase64(blob);

    // 4. Upload file to Google Drive using a NEW file ID
    // CRITICAL: We NEVER delete or overwrite old Drive files!
    const response = await fetch(getApiUrl('/api/v2/drive/upload-file'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        fileName: targetFileName,
        mimeType: blob.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        parentFolderId: driveFolderId,
        base64
      })
    });

    if (!response.ok) {
      let errMsg = `Gagal mengunggah ${targetFileName} ke Google Drive. Status: ${response.status}`;
      try {
        const errData = await response.json();
        errMsg = errData.error || errMsg;
      } catch (_) {
        try {
          const textMsg = await response.text();
          if (textMsg) errMsg = `${errMsg}. Detail: ${textMsg.substring(0, 200)}`;
        } catch (_) {}
      }
      // If upload fails, abort immediately before modifying any Firestore records
      throw new Error(errMsg);
    }

    let driveData;
    try {
      driveData = await response.json();
    } catch (e) {
      throw new Error('Respons dari Google Drive upload tidak valid (bukan JSON).');
    }

    const newDriveFileId = driveData.file?.id;
    if (!newDriveFileId) {
      throw new Error('Respons dari Google Drive upload tidak menyertakan ID berkas baru.');
    }

    // 5. Update previous version records in Firestore:
    // Mark previous active records in this family with isLatest: false
    // Ensure parentDocumentId and revisionNumber are set for backward compatibility
    // NEVER DELETE any previous records!
    if (!revInfo.isNewDocument && revInfo.familyDocs.length > 0) {
      for (const prevDoc of revInfo.familyDocs) {
        if (prevDoc.isLatest !== false || !prevDoc.parentDocumentId || typeof prevDoc.revisionNumber !== 'number') {
          const updatePayload: Partial<UploadedDocument> = {
            isLatest: false,
            parentDocumentId: revInfo.rootParentId,
            revisionNumber: typeof prevDoc.revisionNumber === 'number' ? prevDoc.revisionNumber : 0,
            versionStatus: (prevDoc.revisionNumber && prevDoc.revisionNumber > 0) ? 'revisi' : 'versi awal',
            documentType: prevDoc.documentType || docType
          };
          try {
            await updateDoc(doc(db, 'project_uploaded_documents', prevDoc.id), updatePayload as any);
          } catch (err) {
            console.warn(`[DocumentVersioningService] Could not update isLatest on prev doc ${prevDoc.id}:`, err);
          }
        }
      }
    }

    // 6. Save new revision document record to Firestore with a new doc ID
    const newDocId = revInfo.isNewDocument ? revInfo.rootParentId : crypto.randomUUID();
    const rootParentId = revInfo.isNewDocument ? newDocId : revInfo.rootParentId;
    const nowStr = new Date().toISOString();

    const newDocRecord: UploadedDocument = {
      id: newDocId,
      parentDocumentId: rootParentId,
      companyId: companyId || '',
      projectId: projectId,
      title: title,
      fileName: targetFileName,
      mimeType: blob.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: blob.size,
      driveFileId: newDriveFileId,
      driveFolderId: driveFolderId,
      uploadedBy: userName || 'Sistem',
      uploadedAt: nowStr,
      savedAt: nowStr,
      createdAt: nowStr,
      documentSource: 'generated',
      documentCategory: category,
      revisionNumber: revisionNumber,
      versionStatus: revisionNumber === 0 ? 'versi awal' : 'revisi',
      isLatest: true,
      documentType: docType
    };

    try {
      await setDoc(doc(db, 'project_uploaded_documents', newDocId), newDocRecord);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `project_uploaded_documents/${newDocId}`);
      throw err;
    }

    return newDocRecord;
  }
}
