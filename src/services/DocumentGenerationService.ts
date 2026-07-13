import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { AuthService } from './AuthService';
import { Project, DocumentReference } from '../domain/project/Project';
import { INITIAL_STATE } from '../domain/company/initialCompanyData';

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
  createdAt: string;
  documentSource?: 'generated' | 'manual';
  documentCategory?: 'draft_akta' | 'notulen' | 'surat_pernyataan' | 'scan_akta' | 'scan_notulen' | 'sksp' | 'custom';
}

export class DocumentGenerationService {
  /**
   * Generates and uploads all relevant documents for a project, replacing any existing ones in Drive/Firestore.
   */
  static async generateAndUploadAllForProject(
    projectId: string,
    rawData?: any,
    currentUserEmail?: string,
    currentUserName?: string
  ): Promise<void> {
    // 1. Fetch project document to verify it exists and has driveFolderId
    const projectRef = doc(db, 'office_projects', projectId);
    const projectSnap = await getDoc(projectRef);
    if (!projectSnap.exists()) {
      throw new Error(`Proyek dengan ID ${projectId} tidak ditemukan.`);
    }

    const project = projectSnap.data() as Project;
    const driveFolderId = project.metadata?.driveFolderId || (project as any).driveFolderId;
    if (!driveFolderId) {
      throw new Error('Google Drive folder belum disiapkan untuk proyek ini. Silakan hubungi admin.');
    }

    const jobType = project.jobType;

    // 2. Fetch or prepare rawData if not passed
    let dataToUse = rawData;
    if (!dataToUse) {
      let collectionName = '';
      if (jobType === 'rups_lb' || jobType === 'sirkuler_rupslb') {
        collectionName = 'projects';
      } else if (jobType === 'rups_t' || jobType === 'sirkuler') {
        collectionName = 'rupst_projects';
      } else if (jobType === 'pendirian_pt') {
        collectionName = 'pendirian_projects';
      }

      if (collectionName) {
        const documentsColRef = collection(db, 'office_projects', projectId, 'documents');
        const docsSnap = await getDocs(documentsColRef);
        let refId = '';
        if (!docsSnap.empty) {
          const docRef = docsSnap.docs[0].data() as DocumentReference;
          refId = docRef.refId || '';
        }

        if (refId) {
          const rawSnap = await getDoc(doc(db, collectionName, refId));
          if (rawSnap.exists()) {
            dataToUse = rawSnap.data();
          }
        }

        if (!dataToUse) {
          const colRef = collection(db, collectionName);
          const cleanTitle = project.title?.includes(' — ') 
            ? project.title.split(' — ')[1].trim() 
            : project.title?.includes(' - ') 
              ? project.title.split(' - ')[1].trim() 
              : project.title || '';

          if (project.clientId) {
            let qClient;
            if (collectionName === 'pendirian_projects') {
              qClient = query(colRef, where('selectedProfileId', '==', project.clientId));
            } else {
              qClient = query(colRef, where('clientId', '==', project.clientId));
            }
            const qSnapClient = await getDocs(qClient);
            if (!qSnapClient.empty) {
              dataToUse = qSnapClient.docs[0].data();
            }
          }

          if (!dataToUse && cleanTitle) {
            let q;
            if (collectionName === 'pendirian_projects') {
              q = query(colRef, where('namaPt', '==', cleanTitle));
            } else {
              q = query(colRef, where('companyName', '==', cleanTitle));
            }
            const qSnap = await getDocs(q);
            if (!qSnap.empty) {
              dataToUse = qSnap.docs[0].data();
            } else {
              const allSnap = await getDocs(colRef);
              const projectTitleUpper = cleanTitle.toUpperCase();
              for (const d of allSnap.docs) {
                const item = d.data();
                const docTitle = (item.namaPt || item.companyName || '').toUpperCase().trim();
                if (docTitle === projectTitleUpper && projectTitleUpper !== '') {
                  dataToUse = item;
                  break;
                }
              }
            }
          }
        }
      }
    }

    if (!dataToUse) {
      throw new Error('Data form tidak ditemukan untuk proyek ini. Silakan sinkronkan atau isi data terlebih dahulu.');
    }

    // 3. Determine document kinds to generate
    interface DocKindToGenerate {
      kind: 'notulen' | 'pernyataan' | 'akta' | 'pendirian';
      category: 'draft_akta' | 'notulen' | 'surat_pernyataan';
      label: string;
    }

    let kinds: DocKindToGenerate[] = [];
    if (jobType === 'pendirian_pt') {
      kinds = [{ kind: 'pendirian', category: 'draft_akta', label: 'Dokumen Pendirian' }];
    } else if (jobType === 'rups_t' || jobType === 'sirkuler') {
      kinds = [
        { kind: 'notulen', category: 'notulen', label: 'Draft Notulen / Sirkuler' },
        { kind: 'pernyataan', category: 'surat_pernyataan', label: 'Surat Pernyataan' },
        { kind: 'akta', category: 'draft_akta', label: 'Draft Akta' },
      ];
    } else if (jobType === 'rups_lb' || jobType === 'sirkuler_rupslb') {
      kinds = [
        { kind: 'notulen', category: 'notulen', label: 'Draft Notulen / Sirkuler' },
        { kind: 'akta', category: 'draft_akta', label: 'Draft Akta' },
      ];
    }

    if (kinds.length === 0) {
      throw new Error(`Jenis pekerjaan '${jobType}' tidak mendukung generate dokumen otomatis.`);
    }

    // 4. Generate & upload each kind sequentially
    const token = await AuthService.getToken();
    const nameToUse = currentUserName || currentUserEmail || 'Sistem';

    for (const item of kinds) {
      let genResult: { filename: string; blob: Blob } | null = null;

      if (item.kind === 'pendirian') {
        const { generatePendirianDocx } = await import('../lib/generatePendirianDocx');
        genResult = await generatePendirianDocx(dataToUse, true);
      } else {
        const mergedData = { ...INITIAL_STATE, ...dataToUse } as any;

        if (jobType === 'rups_t' || jobType === 'sirkuler') {
          if (item.kind === 'notulen') {
            if (mergedData.rupstType === 'sirkuler') {
              const { generateSirkulerLaporanDocx } = await import('../lib/generateSirkulerLaporanDocx');
              genResult = await generateSirkulerLaporanDocx(mergedData, true);
            } else {
              const { generateRUPSTDocx } = await import('../lib/generateRUPSTDocx');
              genResult = await generateRUPSTDocx(mergedData, true);
            }
          } else if (item.kind === 'pernyataan') {
            const { generateRUPSTPernyataanDocx } = await import('../lib/generateRUPSTPernyataanDocx');
            genResult = await generateRUPSTPernyataanDocx(mergedData, true);
          } else if (item.kind === 'akta') {
            const { generateRUPSTAktaDocx } = await import('../lib/generateRUPSTAktaDocx');
            genResult = await generateRUPSTAktaDocx(mergedData, true);
          }
        } else {
          // RUPS LB / sirkuler_rupslb
          if (item.kind === 'notulen') {
            const { generateWordDoc } = await import('../../utils/docxGenerator');
            genResult = await generateWordDoc(mergedData, true);
          } else if (item.kind === 'akta') {
            const { generateRUPSDocx } = await import('../lib/generateRUPSDocx');
            genResult = await generateRUPSDocx(mergedData, true);
          }
        }
      }

      if (!genResult) {
        throw new Error(`Gagal men-generate dokumen ${item.label}.`);
      }

      const { filename, blob } = genResult;

      // Check if a document with documentCategory == item.category and projectId == projectId already exists
      const docQuery = query(
        collection(db, 'project_uploaded_documents'),
        where('projectId', '==', projectId),
        where('documentCategory', '==', item.category)
      );
      const docSnap = await getDocs(docQuery);
      const existingDoc = !docSnap.empty ? docSnap.docs[0].data() as UploadedDocument : null;

      // Convert blob to base64
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

      let response;
      if (existingDoc) {
        // Replace file in Google Drive
        response = await fetch('/api/v2/drive/upload-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            fileName: filename,
            mimeType: blob.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            parentFolderId: driveFolderId,
            base64
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `Gagal mengunggah file hasil generate ${item.label} baru ke Google Drive.`);
        }
        const driveData = await response.json();
        const newDriveFileId = driveData.file.id;

        // Delete old file from Drive in background
        try {
          await fetch(`/api/v2/drive/delete-file/${existingDoc.driveFileId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        } catch (e) {
          console.warn(`Could not delete old file from drive for ${existingDoc.driveFileId}:`, e);
        }

        // Update metadata in project_uploaded_documents
        const updatedDoc: UploadedDocument = {
          ...existingDoc,
          fileName: filename,
          mimeType: blob.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: blob.size,
          driveFileId: newDriveFileId,
          uploadedBy: nameToUse,
          uploadedAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'project_uploaded_documents', existingDoc.id), updatedDoc);
      } else {
        // Create new document in Google Drive and project_uploaded_documents
        response = await fetch('/api/v2/drive/upload-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            fileName: filename,
            mimeType: blob.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            parentFolderId: driveFolderId,
            base64
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `Gagal mengunggah file hasil generate ${item.label} ke Google Drive.`);
        }
        const driveData = await response.json();
        const driveFileId = driveData.file.id;

        const docId = crypto.randomUUID();
        const nowStr = new Date().toISOString();

        const newDoc: UploadedDocument = {
          id: docId,
          companyId: project.clientId || '',
          projectId: projectId,
          title: item.category === 'draft_akta' ? (jobType === 'pendirian_pt' ? 'Akta Pendirian' : 'Draft Akta') : (item.category === 'notulen' ? 'Draft Notulen / Sirkuler' : 'Surat Pernyataan'),
          fileName: filename,
          mimeType: blob.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: blob.size,
          driveFileId,
          driveFolderId,
          uploadedBy: nameToUse,
          uploadedAt: nowStr,
          createdAt: nowStr,
          documentSource: 'generated',
          documentCategory: item.category
        };

        await setDoc(doc(db, 'project_uploaded_documents', docId), newDoc);
      }
    }
  }
}
