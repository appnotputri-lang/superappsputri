import React, { useState, useEffect } from 'react';
import { Project, DocumentReference, ClientSnapshot, ProjectChangeSnapshot, Party } from '../../../domain/project/Project';
import { ProjectService } from '../../../services/ProjectService';
import { PartiesManager } from './PartiesManager';
import { CompanyProfile, UserProfile, AmendmentDeed, SkSpDocument, CompanyRevision } from '../../../../types';
import { INITIAL_STATE } from '../../../domain/company/initialCompanyData';
import { Workflow } from '../../../domain/project/Workflow';
import { WorkflowService } from '../../../services/WorkflowService';
import { Timeline } from '../../../domain/project/Timeline';
import { Task } from '../../../domain/project/Task';
import { db, cleanUndefined } from '../../../lib/firebase';
import { collection, getDocs, setDoc, doc, deleteDoc, getDoc, query, where, updateDoc } from 'firebase/firestore';
import DraftAktaPendirian from '../../../DraftAktaPendirian';
import PendirianDocumentPreview from '../../../PendirianDocumentPreview';
import { syncToUtama, getDeedTitle, formatAppearersForPendirian } from '../../../lib/syncUtama';
import LeaseAgreementDraft from '../../lease-agreement/components/LeaseAgreementDraft';
import { mapCompanyProfileToPendirian } from '../../../domain/company/mappers/companyProfileToPendirian';
import { mapPartiesToShareholdersAndManagement } from '../../../domain/project/mappers/partyToShareholder';
import { ProjectDocumentUpload } from './ProjectDocumentUpload';
import { SyncPreviewModal } from './SyncPreviewModal';
import { formatCompanyName } from '../../../lib/formatter';
import { AuthService } from '../../../services/AuthService';
import { getApiUrl } from '../../../lib/api';

interface UploadedDocument {
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
import {
  ArrowLeft,
  Calendar,
  User,
  Briefcase,
  FileText,
  File,
  CheckSquare,
  Square,
  Clock,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Send,
  Trash2,
  Sparkles,
  UploadCloud,
  RefreshCw,
  Ban,
  FolderPlus
} from 'lucide-react';

const getDocKinds = (jobType: string): { kind: 'notulen' | 'pernyataan' | 'akta' | 'pendirian'; label: string }[] => {
  if (jobType === 'pendirian_pt') {
    return [{ kind: 'pendirian', label: 'Dokumen Pendirian' }];
  }
  if (jobType === 'rups_t' || jobType === 'sirkuler') {
    return [
      { kind: 'notulen', label: 'Notulen / Sirkuler RUPST' },
      { kind: 'pernyataan', label: 'Surat Pernyataan' },
      { kind: 'akta', label: 'Draft Akta RUPST' },
    ];
  }
  if (jobType === 'rups_lb' || jobType === 'sirkuler_rupslb') {
    return [
      { kind: 'notulen', label: 'Notulen / Sirkuler RUPS LB' },
      { kind: 'akta', label: 'Draft Akta RUPS LB' },
    ];
  }
  return [];
};

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
  currentUser: UserProfile;
}

export default function ProjectDetail({ projectId, onBack, currentUser }: ProjectDetailProps) {
  const currentUserEmail = currentUser.email;
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<CompanyProfile | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<DocumentReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentUploadKey, setDocumentUploadKey] = useState(0);

  // Related Projects and History
  const [relatedProjects, setRelatedProjects] = useState<Project[]>([]);

  // Migration Wizard States
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [migrationSource, setMigrationSource] = useState<'legacy_db' | 'master_client' | 'manual'>('legacy_db');
  const [manualName, setManualName] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualCapital, setManualCapital] = useState(100000000);
  const [isMigrating, setIsMigrating] = useState(false);

  // Interaction States
  const [transitionStatus, setTransitionStatus] = useState('');
  const [transitionComment, setTransitionComment] = useState('');
  const [transitionStrict, setTransitionStrict] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  // === Sync Preview Modal (Task 3) ===
  const [syncPreviewData, setSyncPreviewData] = useState<{
    categories: { label: string; before: string; after: string }[];
    warnings: string[];
  } | null>(null);
  const syncPreviewResolveRef = React.useRef<((confirmed: boolean) => void) | null>(null);

  const requestSyncPreviewConfirmation = (payload: {
    categories: { label: string; before: string; after: string }[];
    warnings: string[];
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      syncPreviewResolveRef.current = resolve;
      setSyncPreviewData(payload);
    });
  };

  const handleSyncPreviewConfirm = () => {
    setSyncPreviewData(null);
    if (syncPreviewResolveRef.current) {
      syncPreviewResolveRef.current(true);
      syncPreviewResolveRef.current = null;
    }
  };

  const handleSyncPreviewCancel = () => {
    setSyncPreviewData(null);
    if (syncPreviewResolveRef.current) {
      syncPreviewResolveRef.current(false);
      syncPreviewResolveRef.current = null;
    }
  };

  // Deed & SK/SP Form states for status transition
  const [deedNumber, setDeedNumber] = useState('');
  const [deedDate, setDeedDate] = useState('');
  const [notarySelectionType, setNotarySelectionType] = useState<'saya' | 'manual'>('saya');
  const [notaryName, setNotaryName] = useState('Nukantini Putri Parincha, SH., M.Kn.');
  const [notaryLocation, setNotaryLocation] = useState('KABUPATEN BANDUNG BARAT');
  const [skSpType, setSkSpType] = useState<string>('SP (Perubahan Data Perseroan)');
  const [skSpNumber, setSkSpNumber] = useState('');
  const [skSpDate, setSkSpDate] = useState('');
  const [skSpEntries, setSkSpEntries] = useState<{ id: string; type: string; number: string; date: string }[]>([
    { id: '1', type: 'SP (Perubahan Data Perseroan)', number: '', date: '' }
  ]);
  const [savingDeedInfo, setSavingDeedInfo] = useState(false);

  // New Task State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  // Minuta Notes State
  const [localMinutaNotes, setLocalMinutaNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [projectNote, setProjectNote] = useState('');
  const [savingProjectNote, setSavingProjectNote] = useState(false);

  // New Document State
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docForm, setDocForm] = useState({
    name: '',
    type: 'docx',
    url: ''
  });
  const [addingDoc, setAddingDoc] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64Str = (reader.result as string).split(',')[1];
        resolve(base64Str);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Pendirian Work Mode States
  const [workMode, setWorkMode] = useState<'default' | 'pendirian' | 'sewa_menyewa'>('default');
  const [workingPendirianId, setWorkingPendirianId] = useState<string | null>(null);
  const [workingPendirianData, setWorkingPendirianData] = useState<any>(null);
  const [pendirianProfiles, setPendirianProfiles] = useState<any[]>([]);
  
  const [showPendirianPreview, setShowPendirianPreview] = useState(false);
  const [pendirianPreviewData, setPendirianPreviewData] = useState<any>(null);
  const [isExportingPendirian, setIsExportingPendirian] = useState(false);

  const [exportingDocId, setExportingDocId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDocRecordData = async (docRef: DocumentReference, silent = false): Promise<any | null> => {
    let collectionName = '';
    if (project?.jobType === 'rups_lb' || project?.jobType === 'sirkuler_rupslb') {
      collectionName = 'projects';
    } else if (project?.jobType === 'rups_t' || project?.jobType === 'sirkuler') {
      collectionName = 'rupst_projects';
    } else if (project?.jobType === 'pendirian_pt') {
      collectionName = 'pendirian_projects';
    } else {
      if (!silent) alert('Jenis dokumen ini belum didukung untuk download otomatis.');
      return null;
    }

    const enrichWithProjectMetadata = (data: any) => {
      if (!data) return data;
      if (project?.metadata) {
        const { deedNumber, deedDate, notaryName, notaryLocation } = project.metadata;
        if (deedNumber) {
          data.notaryNumber = deedNumber;
          data.draftAktaRupsNumber = deedNumber;
          data.notaryNumberInput = deedNumber;
          data.draftAktaRupsNumberInput = deedNumber;
        }
        if (deedDate) {
          data.notaryDate = deedDate;
          data.draftAktaRupsDate = deedDate;
          data.notaryDateInput = deedDate;
          data.draftAktaRupsDateInput = deedDate;
        }
        if (notaryName) {
          data.notaryName = notaryName;
        }
        if (notaryLocation) {
          data.notaryDomicile = notaryLocation;
        }
      }
      return data;
    };

    if (docRef.refId) {
      const snap = await getDoc(doc(db, collectionName, docRef.refId));
      if (snap.exists()) {
        return enrichWithProjectMetadata(snap.data());
      }
    }

    // Fallback search by title / PT name
    try {
      const colRef = collection(db, collectionName);
      
      const cleanTitle = project?.title?.includes(' — ') 
        ? project.title.split(' — ')[1].trim() 
        : project?.title?.includes(' - ') 
          ? project.title.split(' - ')[1].trim() 
          : project?.title || '';

      // First try to match by selectedProfileId if available (form templates usually use selectedProfileId, except pendirian)
      if (project?.clientId) {
        let qClient;
        if (collectionName === 'pendirian_projects' || collectionName === 'rupst_projects' || collectionName === 'projects') {
          qClient = query(colRef, where('selectedProfileId', '==', project.clientId));
        } else {
          qClient = query(colRef, where('clientId', '==', project.clientId));
        }
        try {
          const qSnapClient = await getDocs(qClient);
          if (!qSnapClient.empty) return enrichWithProjectMetadata(qSnapClient.docs[0].data());
        } catch(e) {}
      }

      let q;
      if (collectionName === 'pendirian_projects') {
        q = query(colRef, where('namaPt', '==', cleanTitle));
      } else {
        q = query(colRef, where('companyName', '==', cleanTitle));
      }
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        return enrichWithProjectMetadata(qSnap.docs[0].data());
      }

      // Brute-force robust company name matching helper
      const normalizeCompName = (n: string): string => {
        if (!n) return '';
        return n
          .toUpperCase()
          .replace(/\bPT\b\.?/g, 'PT') // normalize "PT." or "PT"
          .replace(/[^A-Z0-9]/g, '')   // remove space, dots, symbols
          .trim();
      };

      const projectTitleNorm = normalizeCompName(cleanTitle);

      // Brute-force local/trimmed fallback if exact match query failed
      const allSnap = await getDocs(colRef);
      for (const d of allSnap.docs) {
        const data = d.data();
        const docTitle = data.namaPt || data.companyName || '';
        const docTitleNorm = normalizeCompName(docTitle);
        if (docTitleNorm === projectTitleNorm && projectTitleNorm !== '') {
          return enrichWithProjectMetadata(data);
        }
      }
    } catch (e) {
      console.error('Fallback query failed:', e);
    }

    if (!silent) alert('Dokumen ini dibuat sebelum fitur download otomatis tersedia. Silakan buka manual lewat menu lama untuk mengunduhnya.');
    return null;
  };

  const uploadGeneratedDocument = async (
    filename: string,
    blob: Blob,
    category: 'draft_akta' | 'notulen' | 'surat_pernyataan'
  ) => {
    const driveFolderId = project?.metadata?.driveFolderId || (project as any)?.driveFolderId;
    if (!driveFolderId) {
      throw new Error('Google Drive folder belum disiapkan untuk proyek ini.');
    }

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
    const token = await AuthService.getToken();

    // Query if documents with documentCategory == category and projectId == projectId already exist
    const docQuery = query(
      collection(db, 'project_uploaded_documents'),
      where('projectId', '==', projectId),
      where('documentCategory', '==', category)
    );
    const docSnap = await getDocs(docQuery);
    const existingDocList = !docSnap.empty ? docSnap.docs.map(d => ({ ref: d.ref, data: d.data() as UploadedDocument })) : [];
    const existingDoc = existingDocList.length > 0 ? existingDocList[0].data : null;

    let response;
    if (existingDoc) {
      // Replace file in Google Drive
      response = await fetch(getApiUrl('/api/v2/drive/upload-file'), {
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
        let errMsg = 'Gagal mengunggah file hasil generate baru ke Google Drive.';
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch (e) {
          try {
            const textMsg = await response.text();
            if (textMsg) errMsg = `${errMsg} Detail: ${textMsg.substring(0, 200)}`;
          } catch (_) {}
        }
        throw new Error(errMsg);
      }
      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error('Respons dari Google Drive upload tidak valid (bukan JSON).');
      }
      const newDriveFileId = data.file.id;

      // Delete ALL old files matching this category from Drive & delete extra Firestore records if duplicates exist
      for (let i = 0; i < existingDocList.length; i++) {
        const item = existingDocList[i];
        if (item.data.driveFileId) {
          try {
            await fetch(getApiUrl(`/api/v2/drive/delete-file/${item.data.driveFileId}`), {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
          } catch (e) {
            console.warn(`Could not delete old file from drive for ${item.data.driveFileId}:`, e);
          }
        }
        if (i > 0) {
          try {
            await deleteDoc(item.ref);
          } catch (e) {
            console.warn(`Could not delete duplicate document record ${item.data.id}:`, e);
          }
        }
      }

      // Update metadata in project_uploaded_documents
      const updatedDoc: UploadedDocument = {
        ...existingDoc,
        fileName: filename,
        mimeType: blob.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: blob.size,
        driveFileId: newDriveFileId,
        uploadedBy: currentUser?.name || 'Sistem',
        uploadedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'project_uploaded_documents', existingDoc.id), updatedDoc);
    } else {
      // Create new document in Google Drive and project_uploaded_documents
      response = await fetch(getApiUrl('/api/v2/drive/upload-file'), {
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
        let errMsg = 'Gagal mengunggah file hasil generate ke Google Drive.';
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch (e) {
          try {
            const textMsg = await response.text();
            if (textMsg) errMsg = `${errMsg} Detail: ${textMsg.substring(0, 200)}`;
          } catch (_) {}
        }
        throw new Error(errMsg);
      }
      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error('Respons dari Google Drive upload tidak valid (bukan JSON).');
      }
      const driveFileId = data.file.id;

      let titleLabel = '';
      if (category === 'draft_akta') titleLabel = project?.jobType === 'pendirian_pt' ? 'Akta Pendirian' : 'Draft Akta';
      else if (category === 'notulen') titleLabel = 'Draft Notulen / Sirkuler';
      else if (category === 'surat_pernyataan') titleLabel = 'Surat Pernyataan';

      const docId = crypto.randomUUID();
      const now = new Date().toISOString();

      const newDoc: UploadedDocument = {
        id: docId,
        companyId: project?.clientId || '',
        projectId: projectId,
        title: titleLabel,
        fileName: filename,
        mimeType: blob.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: blob.size,
        driveFileId,
        driveFolderId,
        uploadedBy: currentUser?.name || 'Sistem',
        uploadedAt: now,
        createdAt: now,
        documentSource: 'generated',
        documentCategory: category
      };

      await setDoc(doc(db, 'project_uploaded_documents', docId), newDoc);
    }
  };

  const handleGenerate = async (docRef: DocumentReference, kind: 'notulen' | 'pernyataan' | 'akta' | 'pendirian', rowKey: string) => {
    setExportingDocId(rowKey);
    try {
      const rawData = await fetchDocRecordData(docRef);
      if (!rawData) return;
      
      // Inject clientType from client profile
      if (client?.clientType) {
        (rawData as any).clientType = client.clientType;
      }

      let genResult: { filename: string, blob: Blob } | null = null;

      if (kind === 'pendirian') {
        const { generatePendirianDocx } = await import('../../../lib/generatePendirianDocx');
        genResult = await generatePendirianDocx(rawData, true);
      } else {
        const mergedData = { ...INITIAL_STATE, ...rawData } as any;
        
        // Also ensure mergedData has clientType
        if (client?.clientType) {
          mergedData.clientType = client.clientType;
        }

        if (project?.jobType === 'rups_t' || project?.jobType === 'sirkuler') {
          if (kind === 'notulen') {
            if (mergedData.rupstType === 'sirkuler') {
              const { generateSirkulerLaporanDocx } = await import('../../../lib/generateSirkulerLaporanDocx');
              genResult = await generateSirkulerLaporanDocx(mergedData, true);
            } else {
              const { generateRUPSTDocx } = await import('../../../lib/generateRUPSTDocx');
              genResult = await generateRUPSTDocx(mergedData, true);
            }
          } else if (kind === 'pernyataan') {
            const { generateRUPSTPernyataanDocx } = await import('../../../lib/generateRUPSTPernyataanDocx');
            genResult = await generateRUPSTPernyataanDocx(mergedData, true);
          } else if (kind === 'akta') {
            const { generateRUPSTAktaDocx } = await import('../../../lib/generateRUPSTAktaDocx');
            genResult = await generateRUPSTAktaDocx(mergedData, true);
          }
        } else {
          // RUPS LB / sirkuler_rupslb
          if (kind === 'notulen') {
            const { generateWordDoc } = await import('../../../../utils/docxGenerator');
            genResult = await generateWordDoc(mergedData, true);
          } else if (kind === 'akta') {
            const { generateRUPSDocx } = await import('../../../lib/generateRUPSDocx');
            genResult = await generateRUPSDocx(mergedData, true);
          }
        }
      }

      if (genResult) {
        const { filename, blob } = genResult;

        // Map generation kind to category
        let category: 'draft_akta' | 'notulen' | 'surat_pernyataan' = 'notulen';
        if (kind === 'akta' || kind === 'pendirian') {
          category = 'draft_akta';
        } else if (kind === 'pernyataan') {
          category = 'surat_pernyataan';
        }

        // Upload to Drive and save metadata
        await uploadGeneratedDocument(filename, blob, category);

        // Download locally to browser
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);

        // Trigger ProjectDocumentUpload refresh
        setDocumentUploadKey(prev => prev + 1);

        alert(`Dokumen "${filename}" berhasil di-generate, diunduh, dan disimpan ke Google Drive!`);
      }
    } catch (err: any) {
      console.error(err);
      alert('Gagal mengunduh atau menyimpan dokumen: ' + err.message);
    } finally {
      setExportingDocId(null);
    }
  };

  const handleWorkHere = async () => {
    setLoading(true);
    try {
      const profSnap = await getDocs(collection(db, 'company_profiles'));
      setPendirianProfiles(profSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const pendSnap = await getDocs(collection(db, 'pendirian_projects'));
      const pendData = pendSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      
      // Look for an existing document reference with url '/pendirian' in the project
      const pendirianDocRef = documents.find(d => d.url === '/pendirian');
      
      let existing;
      if (pendirianDocRef && pendirianDocRef.refId) {
        existing = pendData.find(p => p.id === pendirianDocRef.refId);
      } else {
        // Fallback: match by selectedProfileId (clientId) or a clean name
        const cleanTitle = project?.title.includes(' — ') 
          ? project.title.split(' — ')[1].trim() 
          : project?.title.includes(' - ') 
            ? project.title.split(' - ')[1].trim() 
            : project?.title;
            
        existing = pendData.find(p => p.selectedProfileId === project?.clientId || p.namaPt === cleanTitle || p.namaPt === project?.title);
      }
      
      if (existing) {
        setWorkingPendirianId(existing.id);
        setWorkingPendirianData(existing);
      } else {
        setWorkingPendirianId('new');
        if (client) {
          const defaultClientData = mapCompanyProfileToPendirian(client);
          setWorkingPendirianData(defaultClientData);
        } else {
          setWorkingPendirianData(null);
        }
      }
      
      setWorkMode('pendirian');
    } catch (e) {
      console.error(e);
      alert('Gagal memuat form pendirian.');
    } finally {
      setLoading(false);
    }
  };

  const handlePendirianExportWord = async (d: any) => {
    setIsExportingPendirian(true);
    try {
      const { generatePendirianDocx } = await import('../../../lib/generatePendirianDocx');
      await generatePendirianDocx(d);
    } catch (e) {
      console.error(e);
      alert('Gagal membuat dokumen pendirian');
    } finally {
      setIsExportingPendirian(false);
    }
  };

  useEffect(() => {
    fetchProjectFullDetails();
  }, [projectId]);

  const handleDeleteProject = async () => {
    if (currentUser.role !== 'Super Admin') {
      alert('Hanya Super Admin yang dapat menghapus proyek permanen!');
      return;
    }

    const confirm1 = window.confirm('Apakah Anda yakin ingin MENGHAPUS PERMANEN proyek ini? Seluruh data terkait (timeline, tugas, dokumen) akan dihapus secara permanen, dan folder Google Drive proyek ini akan dipindahkan ke Trash.');
    if (!confirm1) return;

    const confirm2 = window.prompt('Ketik "HAPUS" untuk mengonfirmasi penghapusan permanen:');
    if (confirm2 !== 'HAPUS') return;

    setIsDeleting(true);
    try {
      await ProjectService.deleteProject(projectId);
      alert('Proyek berhasil dihapus secara permanen.');
      onBack();
    } catch (err: any) {
      console.error(err);
      alert('Gagal menghapus proyek: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Google Drive State
  const [isSettingUpDrive, setIsSettingUpDrive] = useState(false);

  const handleSetupDriveFolder = async () => {
    if (!project) return;
    setIsSettingUpDrive(true);
    try {
      const { auth } = await import('../../../lib/firebase');
      let token = '';
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }
      
      const response = await fetch(getApiUrl('/api/v2/drive/ensure-project-folder'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          project: project
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to ensure project folder');
      }

      alert('Folder Google Drive berhasil dibuat dan dihubungkan ke proyek ini!');
      
      // Refresh project data so driveFolderId is updated on the page
      await fetchProjectFullDetails();
    } catch (err: any) {
      console.error(err);
      alert('Gagal menyiapkan folder Google Drive: ' + err.message);
    } finally {
      setIsSettingUpDrive(false);
    }
  };

  const fetchProjectFullDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const proj = await ProjectService.getProject(projectId);
      if (!proj) {
        setError('Proyek tidak ditemukan.');
        setLoading(false);
        return;
      }

      setProject(proj);
      setLocalMinutaNotes(proj.minutaNotes || '');

      // Parallel queries for children and linked entities
      const [cli, wf, tlList, tkList, docList, relatedSnap] = await Promise.all([
        getDoc(doc(db, 'profiles', proj.clientId)).then(snapshot => {
          if (snapshot.exists()) {
            return { id: snapshot.id, ...snapshot.data() } as CompanyProfile;
          }
          return null;
        }),
        WorkflowService.getWorkflow(proj.jobType),
        ProjectService.getProjectTimelines(projectId),
        ProjectService.getProjectTasks(projectId),
        ProjectService.getProjectDocuments(projectId),
        getDocs(query(collection(db, 'office_projects'), where('clientId', '==', proj.clientId)))
      ]);

      setClient(cli);
      setWorkflow(wf);
      setTimelines(tlList || []);
      
      const isMinuta = proj.status.toLowerCase() === 'completed' || proj.status.toLowerCase() === 'archived' || proj.status.toLowerCase() === 'selesai';
      let finalTasks = tkList || [];
      
      // Strict client-side deduplication & background Firestore cleanup to prevent race-condition duplicates
      const uniqueTasksMap = new Map<string, Task>();
      const duplicateTaskIdsToDelete: string[] = [];

      for (const task of finalTasks) {
        const existing = uniqueTasksMap.get(task.title);
        if (!existing) {
          uniqueTasksMap.set(task.title, task);
        } else {
          // Prefer completed status over pending or other states
          if (task.status === 'completed' && existing.status !== 'completed') {
            duplicateTaskIdsToDelete.push(existing.id);
            uniqueTasksMap.set(task.title, task);
          } else {
            duplicateTaskIdsToDelete.push(task.id);
          }
        }
      }

      if (duplicateTaskIdsToDelete.length > 0) {
        console.log(`[Deduplication] Detected ${duplicateTaskIdsToDelete.length} duplicate tasks for project ${projectId}. Cleaning up...`);
        for (const id of duplicateTaskIdsToDelete) {
          ProjectService.deleteTask(projectId, id).catch(err => {
            console.error("[Deduplication] Failed to delete duplicate task", id, err);
          });
        }
      }

      finalTasks = Array.from(uniqueTasksMap.values());
      
      if (isMinuta) {
        const MINUTA_TASK_TITLES = [
          "Copy KTP Para Pihak",
          "Copy NPWP Para Pihak",
          "Copy Seluruh Riwayat Akta",
          "Demikianlah Lengkap",
          "Akta Minuta diprint",
          "Surat-Surat Pendukung",
          "Jahit Minuta"
        ];
        
        const existingTitles = finalTasks.map(t => t.title);
        const missingTitles = MINUTA_TASK_TITLES.filter(title => !existingTitles.includes(title));
        
        if (missingTitles.length > 0) {
          const createdTasks: Task[] = [];
          for (const title of missingTitles) {
            try {
              const newTask = await ProjectService.createTask(projectId, {
                title,
                status: 'pending'
              });
              if (newTask) createdTasks.push(newTask);
            } catch (e) {
              console.error("Failed to create default minuta task:", title, e);
            }
          }
          finalTasks = [...finalTasks, ...createdTasks];
        }
        
        const displayedMinutaTasks = finalTasks.filter(t => !["NOTULEN", "AKTA RUPS LB", "SK/SP", "NPWP", "NIB"].includes(t.title));
        const allChecked = displayedMinutaTasks.length > 0 && displayedMinutaTasks.every(t => t.status === 'completed' || t.status === 'not_required');
        
        if (proj.metadata?.minutaCheckedAll !== allChecked) {
          const updatedMetadata = {
            ...(proj.metadata || {}),
            minutaCheckedAll: allChecked
          };
          try {
            await updateDoc(doc(db, 'office_projects', projectId), {
              metadata: updatedMetadata
            });
            proj.metadata = updatedMetadata;
          } catch (e) {
            console.error("Failed to update initial metadata for minuta check:", e);
          }
        }
      } else {
        if (finalTasks.length === 0 && ['rups_lb', 'sirkuler_rupslb'].includes(proj.jobType)) {
          const defaultTaskTitles = ["NOTULEN", "AKTA RUPS LB", "SK/SP", "NPWP", "NIB"];
          const createdTasks: Task[] = [];
          for (const title of defaultTaskTitles) {
            try {
              const newTask = await ProjectService.createTask(projectId, {
                title,
                status: 'pending'
              });
              if (newTask) createdTasks.push(newTask);
            } catch (e) {
              console.error("Failed to create default task:", title, e);
            }
          }
          finalTasks = createdTasks;
        }
      }
      
      setTasks(finalTasks);
      setDocuments(docList || []);

      const relatedList: Project[] = [];
      if (relatedSnap) {
        relatedSnap.forEach(docSnap => {
          if (docSnap.id !== projectId) {
            relatedList.push({ projectId: docSnap.id, ...docSnap.data() } as Project);
          }
        });
      }
      setRelatedProjects(relatedList);

      // Pre-populate status transition select
      if (wf && wf.steps) {
        const currentIndex = wf.steps.indexOf(proj.status);
        if (currentIndex !== -1 && currentIndex + 1 < wf.steps.length) {
          setTransitionStatus(wf.steps[currentIndex + 1]);
        } else {
          setTransitionStatus(wf.steps[0]);
        }
      }

      // Pre-populate deed & SK/SP details if saved in project metadata or client profile
      let loadedEntries: { id: string; type: string; number: string; date: string }[] = [];
      if (proj.metadata) {
        if (proj.metadata.deedNumber) setDeedNumber(proj.metadata.deedNumber);
        if (proj.metadata.deedDate) setDeedDate(proj.metadata.deedDate);
        if (proj.metadata.notarySelectionType) setNotarySelectionType(proj.metadata.notarySelectionType);
        if (proj.metadata.notaryName) setNotaryName(proj.metadata.notaryName);
        if (proj.metadata.notaryLocation) setNotaryLocation(proj.metadata.notaryLocation);
        if (proj.metadata.skSpType) setSkSpType(proj.metadata.skSpType);
        if (proj.metadata.skSpNumber) setSkSpNumber(proj.metadata.skSpNumber);
        if (proj.metadata.skSpDate) setSkSpDate(proj.metadata.skSpDate);

        if (proj.metadata.skSpEntries && Array.isArray(proj.metadata.skSpEntries) && proj.metadata.skSpEntries.length > 0) {
          loadedEntries = proj.metadata.skSpEntries;
        } else if (proj.metadata.skSpNumber) {
          loadedEntries = [{
            id: '1',
            type: proj.metadata.skSpType || 'SP (Perubahan Data Perseroan)',
            number: proj.metadata.skSpNumber,
            date: proj.metadata.skSpDate || ''
          }];
        }
      }

      // Check existing deed SK/SP docs in cli.amendmentDeeds if available for deedNumber prefill
      const currentDeedNum = proj.metadata?.deedNumber || '';
      if (currentDeedNum && cli?.amendmentDeeds) {
        const matchingDeed = cli.amendmentDeeds.find((d: AmendmentDeed) => d.number === currentDeedNum.trim());
        if (matchingDeed?.skSpDocuments && matchingDeed.skSpDocuments.length > 0) {
          const docTypeToOptionMap = (docType: string): string => {
            if (docType === 'SP_DATA_PERSEROAN') return 'SP (Perubahan Data Perseroan)';
            if (docType === 'SP_ANGGARAN_DASAR') return 'SK (Persetujuan Perubahan Anggaran Dasar)';
            if (docType === 'SK') return 'SK (Pendirian PT)';
            if (docType === 'SP') return 'SP (Pendirian PT)';
            return docType || 'SP (Perubahan Data Perseroan)';
          };

          loadedEntries = matchingDeed.skSpDocuments.map((docItem: any) => ({
            id: docItem.id || Math.random().toString(36).substring(7),
            type: docTypeToOptionMap(docItem.type),
            number: docItem.number || '',
            date: docItem.date || ''
          }));
        }
      }

      if (loadedEntries.length > 0) {
        setSkSpEntries(loadedEntries);
      }
    } catch (err: any) {
      console.error(err);
      setError('Gagal memuat detail proyek.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunMigration = async () => {
    if (!project) return;
    setIsMigrating(true);
    try {
      let snapshotData: ClientSnapshot | null = null;

      if (migrationSource === 'master_client') {
        if (!client) {
          throw new Error("Master client data not loaded yet.");
        }
        // Build snapshot from master client
        snapshotData = {
          id: client.id,
          companyName: client.companyName || project.title,
          companyType: client.companyType || 'PT',
          fullAddress: client.fullAddress || '',
          province: client.newAddress?.province || client.oldAddress?.province || '',
          city: client.newAddress?.city || client.oldAddress?.city || '',
          kbliItems: (client.kbliItems || []).map(k => ({
            id: k.id || Math.random().toString(36).substring(7),
            code: k.code || (k as any).kode || '',
            name: k.name || (k as any).judul || '',
            description: k.description || (k as any).uraian || '',
            categoryLetter: k.categoryLetter || '',
            categoryName: k.categoryName || '',
            uraian: (k as any).uraian || k.description || ''
          })),
          authorizedCapital: client.targetCapitalBase || client.originalCapitalBase || 0,
          paidUpCapital: client.targetCapitalPaid || client.originalCapitalPaid || 0,
          shareholders: (client.shareholders || []).map(sh => ({
            id: sh.id,
            name: sh.name,
            sharesOwned: sh.sharesOwned,
            nik: sh.nik || '',
            npwp: sh.npwp || '',
            occupation: sh.occupation || '',
            managementPosition: sh.managementPosition || (sh as any).position || '',
            isManagement: sh.isManagement ?? !!(sh.managementPosition || (sh as any).position),
            address: sh.address ? {
              rt: sh.address.rt || '',
              rw: sh.address.rw || '',
              kelurahan: sh.address.kelurahan || '',
              kecamatan: sh.address.kecamatan || '',
              city: sh.address.city || '',
              province: sh.address.province || '',
              fullAddress: sh.address.fullAddress || (typeof sh.address === 'string' ? sh.address : '')
            } : undefined
          })),
          managementItems: (client.oldManagementItems || client.newManagementItems || (client as any).managementItems || []).map(m => ({
            id: m.id,
            name: m.name,
            position: m.position,
            nik: m.nik || ''
          })),
          establishmentDeedNumber: client.establishmentDeedNumber || '',
          establishmentDeedDate: client.establishmentDeedDate || '',
          establishmentNotary: client.establishmentNotary || '',
          latestAmendmentDeedNumber: client.latestAmendmentDeedNumber || '',
          latestAmendmentDeedDate: client.latestAmendmentDeedDate || '',
          latestAmendmentNotary: client.latestAmendmentNotary || ''
        };
      } else if (migrationSource === 'legacy_db') {
        // Fetch from legacy projects db
        const formDoc = documents.find(d => d.refId);
        const refIdToUse = formDoc?.refId || project.metadata?.refId || projectId;
        const legacyData = await fetchDocRecordData({
          id: 'temp',
          name: project.title,
          type: 'form',
          refId: refIdToUse,
          uploadedAt: new Date().toISOString()
        });

        if (!legacyData) {
          throw new Error("Gagal mengambil data dari database proyek lama. Silakan gunakan sumber lain atau buat manual.");
        }

        snapshotData = {
          id: project.clientId,
          companyName: legacyData.companyName || legacyData.namaPt || project.title,
          companyType: legacyData.companyType || 'PT',
          fullAddress: legacyData.fullAddress || legacyData.address?.fullAddress || '',
          province: legacyData.address?.province || '',
          city: legacyData.address?.city || '',
          kbliItems: (legacyData.kbliItems || []).map((k: any) => ({
            id: k.id || Math.random().toString(36).substring(7),
            code: k.code || k.kode || '',
            name: k.name || k.judul || k.title || '',
            description: k.description || k.uraian || '',
            categoryLetter: k.categoryLetter || '',
            categoryName: k.categoryName || '',
            uraian: k.uraian || k.description || ''
          })),
          authorizedCapital: legacyData.originalCapitalBase || legacyData.targetCapitalBase || 0,
          paidUpCapital: legacyData.originalCapitalPaid || legacyData.targetCapitalPaid || 0,
          shareholders: (legacyData.shareholders || legacyData.finalShareholders || []).map((sh: any) => ({
            id: sh.id || Math.random().toString(36).substring(7),
            name: sh.name,
            sharesOwned: sh.sharesOwned || 0,
            nik: sh.nik || '',
            npwp: sh.npwp || '',
            occupation: sh.occupation || '',
            managementPosition: sh.managementPosition || sh.position || '',
            isManagement: sh.isManagement ?? !!(sh.managementPosition || sh.position),
            address: sh.address ? {
              rt: sh.address.rt || '',
              rw: sh.address.rw || '',
              kelurahan: sh.address.kelurahan || '',
              kecamatan: sh.address.kecamatan || '',
              city: sh.address.city || '',
              province: sh.address.province || '',
              fullAddress: sh.address.fullAddress || (typeof sh.address === 'string' ? sh.address : '')
            } : undefined
          })),
          managementItems: (legacyData.newManagementItems || legacyData.oldManagementItems || []).map((m: any) => ({
            id: m.id || Math.random().toString(36).substring(7),
            name: m.name,
            position: m.position || '',
            nik: m.nik || ''
          })),
          establishmentDeedNumber: legacyData.establishmentDeedNumber || '',
          establishmentDeedDate: legacyData.establishmentDeedDate || '',
          establishmentNotary: legacyData.establishmentNotary || '',
          latestAmendmentDeedNumber: legacyData.latestAmendmentDeedNumber || '',
          latestAmendmentDeedDate: legacyData.latestAmendmentDeedDate || '',
          latestAmendmentNotary: legacyData.latestAmendmentNotary || ''
        };
      } else {
        // Manual form
        snapshotData = {
          id: project.clientId,
          companyName: manualName || project.title,
          companyType: 'PT',
          fullAddress: manualAddress,
          authorizedCapital: manualCapital,
          paidUpCapital: manualCapital,
          shareholders: [],
          managementItems: []
        };
      }

      if (!snapshotData) {
        throw new Error("Snapshot data compilation failed.");
      }

      if (project.jobType === 'rups_lb') {
        // RUPS LB has Before/After snapshot structure
        const beforeSnapshot = { ...snapshotData };
        let afterSnapshot = { ...snapshotData };
        if (migrationSource === 'legacy_db') {
          const formDoc = documents.find(d => d.refId);
          const refIdToUse = formDoc?.refId || project.metadata?.refId || projectId;
          const legacyData = await fetchDocRecordData({
            id: 'temp',
            name: project.title,
            type: 'form',
            refId: refIdToUse,
            uploadedAt: new Date().toISOString()
          });
          if (legacyData) {
            afterSnapshot = {
              id: project.clientId,
              companyName: legacyData.targetCompanyName || legacyData.companyName || project.title,
              companyType: legacyData.companyType || 'PT',
              fullAddress: legacyData.fullAddress || legacyData.oldFullAddress || '',
              kbliItems: (legacyData.kbliItems || []).map((k: any) => ({
                id: k.id || Math.random().toString(36).substring(7),
                code: k.code || '',
                name: k.name || '',
                description: k.description || ''
              })),
              authorizedCapital: legacyData.targetCapitalBase || legacyData.originalCapitalBase || 0,
              paidUpCapital: legacyData.targetCapitalPaid || legacyData.originalCapitalPaid || 0,
              shareholders: (legacyData.finalShareholders || legacyData.shareholders || []).map((sh: any) => ({
                id: sh.id || Math.random().toString(36).substring(7),
                name: sh.name,
                sharesOwned: sh.sharesOwned || 0,
                nik: sh.nik || '',
                npwp: sh.npwp || '',
                occupation: sh.occupation || '',
                managementPosition: sh.managementPosition || sh.position || '',
                isManagement: sh.isManagement ?? !!(sh.managementPosition || sh.position),
                address: sh.address ? {
                  rt: sh.address.rt || '',
                  rw: sh.address.rw || '',
                  kelurahan: sh.address.kelurahan || '',
                  kecamatan: sh.address.kecamatan || '',
                  city: sh.address.city || '',
                  province: sh.address.province || '',
                  fullAddress: sh.address.fullAddress || (typeof sh.address === 'string' ? sh.address : '')
                } : undefined
              })),
              managementItems: (legacyData.newManagementItems || legacyData.oldManagementItems || []).map((m: any) => ({
                id: m.id || Math.random().toString(36).substring(7),
                name: m.name,
                position: m.position || '',
                nik: m.nik || ''
              })),
              establishmentDeedNumber: legacyData.establishmentDeedNumber || '',
              establishmentDeedDate: legacyData.establishmentDeedDate || '',
              establishmentNotary: legacyData.establishmentNotary || '',
              latestAmendmentDeedNumber: legacyData.latestAmendmentDeedNumber || '',
              latestAmendmentDeedDate: legacyData.latestAmendmentDeedDate || '',
              latestAmendmentNotary: legacyData.latestAmendmentNotary || ''
            };
          }
        }
        await ProjectService.updateProjectSnapshots(projectId, {
          changeSnapshot: {
            before: beforeSnapshot,
            after: afterSnapshot
          }
        });
      } else {
        await ProjectService.updateProjectSnapshots(projectId, {
          clientSnapshot: snapshotData
        });
      }

      await ProjectService.addTimeline(projectId, {
        status: project.status,
        title: "Migrasi Snapshot Manual Berhasil",
        description: `Snapshot proyek berhasil dibuat secara eksplisit menggunakan sumber '${migrationSource}'.`,
        createdBy: currentUserEmail || 'admin'
      });

      alert('Migrasi snapshot berhasil! Integritas arsip legal telah diperbarui.');
      setShowMigrationModal(false);
      await fetchProjectFullDetails();
    } catch (err: any) {
      console.error(err);
      alert('Gagal menjalankan migrasi snapshot: ' + err.message);
    } finally {
      setIsMigrating(false);
    }
  };

  const syncDeedInfoAndClientProfile = async () => {
    if (!project) return [];

    const mapOptionToDocType = (typeStr: string): 'SK' | 'SP_DATA_PERSEROAN' | 'SP_ANGGARAN_DASAR' | 'SP' => {
      const s = typeStr.toLowerCase();
      if (s.includes('perubahan data perseroan')) return 'SP_DATA_PERSEROAN';
      if (s.includes('perubahan anggaran dasar')) return 'SP_ANGGARAN_DASAR';
      if (s.includes('sk')) return 'SK';
      return 'SP';
    };

    const validSkSpDocs: SkSpDocument[] = skSpEntries
      .filter(e => e.number.trim().length > 0)
      .map(e => ({
        id: e.id || Math.random().toString(36).substring(7),
        type: mapOptionToDocType(e.type),
        number: e.number.trim(),
        date: e.date || deedDate
      }));

    const firstSkSp = validSkSpDocs[0];
    const finalNotaryName = notarySelectionType === 'saya' ? 'Nukantini Putri Parincha' : notaryName.trim();

    const updatedMetadata = {
      ...(project.metadata || {}),
      deedNumber: deedNumber.trim(),
      deedDate,
      notarySelectionType,
      notaryName: finalNotaryName,
      notaryLocation: notaryLocation.trim(),
      skSpEntries,
      skSpType: firstSkSp ? firstSkSp.type : (skSpEntries[0]?.type || ''),
      skSpNumber: firstSkSp ? firstSkSp.number : (skSpEntries[0]?.number || ''),
      skSpDate: firstSkSp ? firstSkSp.date : (skSpEntries[0]?.date || '')
    };

    await updateDoc(doc(db, 'office_projects', projectId), {
      metadata: updatedMetadata
    });

    const syncedItems: string[] = [];

    const formDoc = documents.find(d => d.refId);
    const refIdToUse = project.metadata?.refId || formDoc?.refId || projectId;
    const formObj = await fetchDocRecordData({
      id: 'temp',
      name: project.title || '',
      type: 'form',
      refId: refIdToUse,
      uploadedAt: new Date().toISOString()
    }, true);

    // Update target form document in Firestore if available
    let targetCollection = '';
    if (project.jobType === 'rups_lb' || project.jobType === 'sirkuler_rupslb') {
      targetCollection = 'projects';
    } else if (project.jobType === 'rups_t' || project.jobType === 'sirkuler') {
      targetCollection = 'rupst_projects';
    } else if (project.jobType === 'pendirian_pt') {
      targetCollection = 'pendirian_projects';
    }

    if (refIdToUse && targetCollection) {
      try {
        const formUpdatePayload: any = {
          notaryNumber: deedNumber.trim(),
          notaryDate: deedDate,
          notaryName: finalNotaryName,
          notaryDomicile: notaryLocation.trim(),
          skSpDocuments: validSkSpDocs,
          updatedAt: new Date().toISOString()
        };
        if (firstSkSp) {
          formUpdatePayload.skNumber = firstSkSp.number;
          formUpdatePayload.skDate = firstSkSp.date || deedDate;
        }
        await updateDoc(doc(db, targetCollection, refIdToUse), cleanUndefined(formUpdatePayload));
      } catch (e) {
        console.warn('Could not update form document in Firestore collection:', e);
      }
    }

    if (project.clientId) {
      const clientDocRef = doc(db, 'profiles', project.clientId);
      const clientSnap = await getDoc(clientDocRef);
      const freshClient = clientSnap.exists() ? (clientSnap.data() as CompanyProfile) : null;

      const profileUpdate: any = {
        updatedAt: new Date().toISOString()
      };

      // [Fix: Management baseline] `newManagementItems` di client profile bisa basi/kontaminasi
      // duplikat dari sync project sebelumnya (mis. project dibuat-hapus berkali-kali saat testing).
      // Baseline "before" untuk perbandingan & preview HARUS dihitung ulang dari `shareholders`
      // (source of truth yang tampil di halaman Klien), bukan dipercaya mentah-mentah dari field
      // cache `newManagementItems`. Default awal masih pakai field lama untuk kasus formObj kosong,
      // tapi akan ditimpa oleh hasil derive di bawah begitu formObj tersedia.
      let managementBaseline: any[] = freshClient?.newManagementItems || [];

      if (formObj) {

        if (formObj.companyName || formObj.namaPt) {
          profileUpdate.companyName = formObj.companyName || formObj.namaPt;
          if (profileUpdate.companyName !== freshClient?.companyName) {
            syncedItems.push('Nama Perusahaan');
          }
        }
        if (formObj.companyType) {
          profileUpdate.companyType = formObj.companyType;
        }
        // [Fix] Alamat & KBLI HARUS hanya disinkron kalau resolusi terkait memang dicentang
        // untuk agenda push ini. Sebelumnya field ini ditulis setiap kali form kebetulan
        // punya isi (mis. karena form pre-fill dari data lama untuk ditampilkan), sehingga
        // agenda "Perubahan Modal Dasar" misalnya ikut menimpa Alamat/KBLI walau notaris
        // tidak bermaksud mengubahnya sama sekali di push ini.
        if (formObj.resolutions?.address === true && (formObj.fullAddress || formObj.address?.fullAddress)) {
          profileUpdate.fullAddress = formObj.fullAddress || formObj.address?.fullAddress;
          syncedItems.push('Alamat Utama / Domisili');
          if (formObj.newAddress) {
            profileUpdate.newAddress = formObj.newAddress;
          }
        }
        if (formObj.resolutions?.kbli === true && formObj.kbliItems && formObj.kbliItems.length > 0) {
          profileUpdate.kbliItems = formObj.kbliItems;
          syncedItems.push(`KBLI (${formObj.kbliItems.length} item)`);
        }

        // Kedudukan (Domisili) sync — hanya jika resolusi domicile dicentang DAN nilai baru terisi.
        // Tidak boleh menimpa data lama dengan string kosong.
        if (formObj.resolutions?.domicile === true && formObj.domicile && String(formObj.domicile).trim().length > 0) {
          const oldDomicileVal = freshClient?.domicile || '';
          if (String(formObj.domicile).trim() !== String(oldDomicileVal).trim()) {
            profileUpdate.oldDomicile = oldDomicileVal;
            profileUpdate.domicile = String(formObj.domicile).trim();
            if (formObj.domicileStyle) {
              profileUpdate.domicileStyle = formObj.domicileStyle;
            }
            if (formObj.kedudukanPT && String(formObj.kedudukanPT).trim().length > 0) {
              profileUpdate.kedudukanPT = String(formObj.kedudukanPT).trim();
            }
            syncedItems.push(`Kedudukan (${oldDomicileVal || '-'} → ${profileUpdate.domicile})`);
          }
        }

        // Capital sync (Modal Dasar & Modal Disetor)
        const formNominal = Number(
          formObj.shareValue ||
          formObj.nilaiNominal ||
          formObj.nilaiPerLembar ||
          formObj.originalSharePrice ||
          (freshClient as any)?.shareValue ||
          (freshClient as any)?.nilaiNominal ||
          freshClient?.originalSharePrice ||
          0
        );

        const baseFromLembar = (formObj.modalDasarLembar && formNominal) ? (formObj.modalDasarLembar * formNominal) : 0;
        const paidFromLembar = (formObj.modalDisetorLembar && formNominal) ? (formObj.modalDisetorLembar * formNominal) : 0;

        const formPaid = Number(
          formObj.targetCapitalPaid ||
          formObj.modalDisetor ||
          formObj.originalCapitalPaid ||
          formObj.paidUpCapital ||
          paidFromLembar ||
          0
        );

        const formBase = Number(
          formObj.targetCapitalBase ||
          formObj.modalDasar ||
          formObj.originalCapitalBase ||
          formObj.authorizedCapital ||
          baseFromLembar ||
          0
        );

        console.log('[Sync Deed] Capital extraction results:', { formBase, formPaid, formNominal });

        // [Fix] Modal Dasar/Disetor HARUS hanya disinkron kalau resolusi peningkatan modal
        // memang dicentang untuk agenda push ini — form biasanya pre-fill nilai modal yang
        // sudah ada untuk ditampilkan ke notaris, jadi kalau tidak digate, agenda lain (mis.
        // Perubahan Alamat) ikut menimpa Modal Dasar/Disetor walau nilainya sebenarnya sama
        // atau malah nyasar dari draft form lain.
        const capitalResolutionActive = formObj.resolutions?.capitalBase === true || formObj.resolutions?.capitalPaid === true;

        if (capitalResolutionActive && formNominal > 0) {
          profileUpdate.shareValue = formNominal;
          profileUpdate.originalSharePrice = formNominal;
        }

        if (formObj.resolutions?.capitalBase === true && formBase > 0) {
          profileUpdate.targetCapitalBase = formBase;
          profileUpdate.originalCapitalBase = formBase;
          const shareVal = formNominal > 0 ? formNominal : 1000000;
          profileUpdate.originalAuthorizedShares = formBase / shareVal;
          profileUpdate.totalSharesBase = formBase / shareVal;
        }

        if (formObj.resolutions?.capitalPaid === true && formPaid > 0) {
          profileUpdate.targetCapitalPaid = formPaid;
          profileUpdate.originalCapitalPaid = formPaid;
          const shareVal = formNominal > 0 ? formNominal : 1000000;
          profileUpdate.originalTotalShares = formPaid / shareVal;
          profileUpdate.totalSharesPaid = formPaid / shareVal;

          if (freshClient?.targetCapitalPaid !== formPaid) {
            syncedItems.push(`Modal Disetor (Rp ${formPaid.toLocaleString('id-ID')})`);
          } else {
            syncedItems.push('Modal Disetor / Dasar');
          }
        }

        // [SYNC DIAGNOSTIC] Log raw data sebelum kalkulasi Pemegang Saham — untuk melacak apakah
        // data dari form sudah tersimpan dengan benar ke Firestore sebelum proyek diselesaikan.
        console.log('[Sync Diagnostic][Shareholders] resolutions.shareholders:', formObj.resolutions?.shareholders);
        console.log('[Sync Diagnostic][Shareholders] formObj.finalShareholders (raw):', formObj.finalShareholders);
        console.log('[Sync Diagnostic][Shareholders] formObj.shareTransfersNew / shareTransfers (raw):', formObj.shareTransfersNew || formObj.shareTransfers);
        console.log('[Sync Diagnostic][Shareholders] formObj.capitalSubscriptionsNew (raw):', formObj.capitalSubscriptionsNew);
        console.log('[Sync Diagnostic][Shareholders] freshClient?.shareholders (data lama):', freshClient?.shareholders);

        // Shareholders sync & calculation
        const baseShareholdersSource = (formObj.finalShareholders && formObj.finalShareholders.length > 0)
          ? formObj.finalShareholders
          : (formObj.shareholders || formObj.pemegangSaham || freshClient?.shareholders || []);

        let workingShareholders: any[] = JSON.parse(JSON.stringify(baseShareholdersSource || []));

        const isUsingFinalShareholders = !!(formObj.finalShareholders && formObj.finalShareholders.length > 0);

        // Process subscriptions (Peningkatan Modal) if not using pre-calculated finalShareholders
        if (!isUsingFinalShareholders && formObj.resolutions?.capitalPaid) {
          const subscriptions = formObj.capitalSubscriptionsNew || [];
          subscriptions.forEach((sub: any) => {
            const subShares = Number(sub.sharesCount || sub.shares || 0);
            if (subShares <= 0) return;

            const subName = sub.subscriberName || '';
            const subNik = sub.subscriberNik || '';

            let toSh = workingShareholders.find((s: any) =>
              (sub.id && s.id === sub.id) ||
              (subNik && s.nik && s.nik.trim() === subNik.trim()) ||
              (subName && s.name && s.name.trim().toUpperCase() === subName.trim().toUpperCase())
            );

            if (toSh) {
              toSh.sharesOwned = (toSh.sharesOwned || 0) + subShares;
            } else if (subName) {
              const newSh = {
                id: sub.id || Math.random().toString(36).substring(7),
                name: subName,
                nik: subNik,
                salutation: sub.salutation || 'Tuan',
                sharesOwned: subShares,
                nationality: 'Indonesia',
                address: sub.address || {}
              };
              workingShareholders.push(newSh);
            }
          });
        }

        // Process share transfers if present in formObj
        const transfers = formObj.shareTransfersNew || formObj.shareTransfers || [];
        if (transfers.length > 0 && formObj.resolutions?.shareholders) {
          transfers.forEach((t: any) => {
            const transferShares = Number(t.sharesTransferred || t.shares || 0);
            if (transferShares <= 0) return;

            // Find source
            const fromSh = workingShareholders.find((s: any) => 
              s.id === t.fromShareholderId || 
              (s.name && t.fromName && s.name.trim().toUpperCase() === t.fromName.trim().toUpperCase())
            );

            // Find target
            const targetDetail = t.toDetail || {};
            const toName = t.toName || targetDetail.name || '';
            const toNik = t.toNik || targetDetail.nik || '';

            let toSh = workingShareholders.find((s: any) => 
              (s.id && (s.id === t.toShareholderId || s.id === targetDetail.id)) ||
              (toNik && s.nik && s.nik.trim() === toNik.trim()) ||
              (toName && s.name && s.name.trim().toUpperCase() === toName.trim().toUpperCase())
            );

            if (toSh) {
              // Merge details from targetDetail into existing target shareholder
              Object.assign(toSh, {
                ...targetDetail,
                ...toSh,
                sharesOwned: (toSh.sharesOwned || 0) + (isUsingFinalShareholders ? 0 : transferShares),
                address: targetDetail.address || toSh.address
              });
            } else if (toName || targetDetail.name) {
              // Add new recipient shareholder
              const newSh = {
                ...targetDetail,
                id: targetDetail.id || t.toShareholderId || Math.random().toString(36).substring(7),
                name: toName || targetDetail.name,
                nik: toNik || targetDetail.nik || '',
                salutation: t.toSalutation || targetDetail.salutation || 'Tuan',
                sharesOwned: transferShares,
                address: targetDetail.address
              };
              workingShareholders.push(newSh);
            }

            if (fromSh && !isUsingFinalShareholders) {
              fromSh.sharesOwned = Math.max(0, (fromSh.sharesOwned || 0) - transferShares);
            }
          });
        }

        // Enrich all workingShareholders with initial shareholder details (address, occupation, etc)
        const initialShareholdersPool = [
          ...(formObj.shareholders || []),
          ...(freshClient?.shareholders || []),
          ...(freshClient?.finalShareholders || [])
        ];

        workingShareholders = workingShareholders.map((sh: any) => {
          const matchingOld = initialShareholdersPool.find((oldSh: any) =>
            (oldSh.id && oldSh.id === sh.id) ||
            (oldSh.nik && sh.nik && oldSh.nik.trim() === sh.nik.trim()) ||
            (oldSh.name && sh.name && oldSh.name.trim().toUpperCase() === sh.name.trim().toUpperCase())
          );

          const oldAddr = matchingOld?.address || {};
          const newAddr = sh.address || {};

          const formattedAddress = (sh.address || matchingOld?.address) ? {
            rt: newAddr.rt || oldAddr.rt || '',
            rw: newAddr.rw || oldAddr.rw || '',
            kelurahan: newAddr.kelurahan || oldAddr.kelurahan || '',
            kecamatan: newAddr.kecamatan || oldAddr.kecamatan || '',
            city: newAddr.city || oldAddr.city || '',
            province: newAddr.province || oldAddr.province || '',
            fullAddress: newAddr.fullAddress || oldAddr.fullAddress || (typeof newAddr === 'string' ? newAddr : typeof oldAddr === 'string' ? oldAddr : '')
          } : undefined;

          return {
            ...(matchingOld || {}),
            ...sh,
            id: sh.id || Math.random().toString(36).substring(7),
            name: sh.name || '',
            sharesOwned: Number(sh.sharesOwned ?? sh.finalShares ?? sh.shares ?? sh.jumlahSaham ?? 0),
            address: formattedAddress,
            nik: sh.nik || matchingOld?.nik || '',
            npwp: sh.npwp || matchingOld?.npwp || '',
            occupation: sh.occupation || matchingOld?.occupation || '',
            birthCity: sh.birthCity || matchingOld?.birthCity || '',
            birthDate: sh.birthDate || matchingOld?.birthDate || '',
            salutation: sh.salutation || matchingOld?.salutation || 'Tuan',
            nationality: sh.nationality || matchingOld?.nationality || 'Indonesia',
            managementPosition: sh.managementPosition || matchingOld?.managementPosition || '',
            isManagement: sh.isManagement ?? matchingOld?.isManagement
          };
        }).filter((sh: any) => sh.sharesOwned > 0 || (sh.name && sh.name.trim().length > 0));

        if (workingShareholders.length > 0) {
          profileUpdate.shareholders = workingShareholders;
          profileUpdate.finalShareholders = workingShareholders;
        }

        // [Fix] Seluruh kalkulasi & penulisan Susunan Pengurus (termasuk sinkron ke
        // `shareholders`) HANYA boleh jalan kalau resolusi "Perubahan Susunan Pengurus"
        // memang dicentang untuk agenda push ini. Sebelum fix ini, blok di bawah selalu
        // jalan kalau `formObj.managementAppointments`/`managementDismissals` kebetulan
        // tidak kosong — termasuk data sisa draft/testing sebelumnya yang tidak relevan
        // dengan agenda yang sedang di-push, sehingga bisa menimpa data pengurus klien
        // dengan data yang salah/tidak dimaksud.
        if (formObj.resolutions?.management === true) {
        // [SYNC DIAGNOSTIC] Log raw data sebelum kalkulasi Susunan Pengurus — untuk melacak apakah
        // data dari form sudah tersimpan dengan benar ke Firestore sebelum proyek diselesaikan.
        console.log('[Sync Diagnostic][Management] resolutions.management:', formObj.resolutions?.management);
        console.log('[Sync Diagnostic][Management] formObj.managementAppointments (raw):', formObj.managementAppointments);
        console.log('[Sync Diagnostic][Management] formObj.managementDismissals (raw):', formObj.managementDismissals);
        console.log('[Sync Diagnostic][Management] freshClient?.newManagementItems (data lama):', freshClient?.newManagementItems);
        console.log('[Sync Diagnostic][Management] workingShareholders (setelah kalkulasi saham):', workingShareholders);

        // Management calculation
        // [Fix] Baseline "pengurus lama" TIDAK lagi diambil dari `freshClient.newManagementItems`
        // (field cache yang terbukti bisa basi/berisi duplikat sisa testing project yang dihapus).
        // Sumber kebenaran untuk siapa pengurus saat ini adalah `shareholders` — yang juga dipakai
        // di halaman Klien — jadi baseline harus konsisten dengan apa yang notaris lihat di sana.
        const oldManagers = (freshClient?.shareholders || [])
          .filter((s: any) => s.isManagement || (s.managementPosition && String(s.managementPosition).trim().length > 0))
          .map((s: any) => ({
            ...s,
            id: s.id || Math.random().toString(36).substring(7),
            name: s.name,
            position: s.managementPosition || "DIREKTUR",
            nik: s.nik || ""
          }));

        const uniqueOldManagers: any[] = [];
        const seenMgmt = new Set<string>();
        oldManagers.forEach((om: any) => {
          if (!om || !om.name) return;
          const key = `${om.name.toUpperCase().trim()}_${(om.position || 'DIREKTUR').toUpperCase().trim()}`;
          if (!seenMgmt.has(key)) {
            seenMgmt.add(key);
            uniqueOldManagers.push(om);
          }
        });
        managementBaseline = uniqueOldManagers;
        console.log('[Sync Diagnostic][Management] managementBaseline (dari shareholders, bukan newManagementItems):', managementBaseline);
        
        const hasExplicitDismissals = formObj.managementDismissals && formObj.managementDismissals.length > 0;
        const hasExplicitAppointments = formObj.managementAppointments && formObj.managementAppointments.length > 0;

        if (hasExplicitDismissals || hasExplicitAppointments) {
          const dismissedNames = new Set((formObj.managementDismissals || []).map((d: any) => (d.name || d.dismissedName || '').toUpperCase().trim()));
          
          const managersToAppoint: any[] = [];
          (formObj.managementAppointments || []).forEach((a: any) => {
            managersToAppoint.push({
              ...a,
              id: a.id || Math.random().toString(36).substring(7),
              name: a.name || '',
              position: a.position || 'DIREKTUR',
              nik: a.nik || ''
            });
          });
          // Also include manual replacements from managementDismissals
          (formObj.managementDismissals || []).forEach((d: any) => {
            if ((d.replacementType === 'MANUAL' || d.replacementType === 'NEW') && (d.replacedByDetail || d.replacedByName)) {
              const detail = d.replacedByDetail || {};
              managersToAppoint.push({
                ...detail,
                id: detail.id || Math.random().toString(36).substring(7),
                name: d.replacedByName || detail.name || '',
                position: d.replacedByPosition || detail.position || detail.managementPosition || 'DIREKTUR',
                nik: d.replacedByNik || detail.nik || '',
                salutation: d.replacedBySalutation || detail.salutation || 'Tuan',
                address: detail.address
              });
            }
          });
          const remainingOldManagers = uniqueOldManagers.filter(om => om && om.name && !dismissedNames.has(om.name.toUpperCase().trim()));
          profileUpdate.newManagementItems = [...remainingOldManagers, ...managersToAppoint];
          console.warn("[Sync Management] Derived management from explicit appointments/dismissals.", profileUpdate.newManagementItems);
        } else {
          const activeMgmt = (workingShareholders || [])
            .filter((s: any) => s.isManagement || (s.managementPosition && s.managementPosition.trim().length > 0))
            .map((s: any) => ({
              ...s,
              id: s.id || Math.random().toString(36).substring(7),
              name: s.name,
              position: s.managementPosition || 'DIREKTUR',
              nik: s.nik || ''
            }));
            
          if (activeMgmt.length > 0) {
            profileUpdate.newManagementItems = activeMgmt;
            console.warn("[Sync Management] Derived management from workingShareholders.", profileUpdate.newManagementItems);
          } else {
            profileUpdate.newManagementItems = uniqueOldManagers;
            console.warn("[Sync Management] Fallback to uniqueOldManagers (No changes detected).", profileUpdate.newManagementItems);
          }
        }

        // Enrich all management items with details (address, etc.) from shareholders/client
        if (profileUpdate.newManagementItems) {
          profileUpdate.newManagementItems = profileUpdate.newManagementItems.map((m: any) => {
            const sourceSh = workingShareholders.find((s: any) => (s.name || '').trim().toUpperCase() === (m.name || '').trim().toUpperCase());
            const sourceClient = freshClient?.newManagementItems?.find((c: any) => (c.name || '').trim().toUpperCase() === (m.name || '').trim().toUpperCase());
            const source = sourceSh || sourceClient;

            return {
              ...m,
              salutation: m.salutation || source?.salutation || 'Tuan',
              birthCity: m.birthCity || source?.birthCity || '',
              birthDate: m.birthDate || source?.birthDate || '',
              occupation: m.occupation || source?.occupation || '',
              nationality: m.nationality || source?.nationality || 'Indonesia',
              address: m.address || source?.address
            };
          });
        }

        // [Fix] Halaman Klien menampilkan pengurus dari `shareholders`, BUKAN dari
        // `newManagementItems`. Kalau kita cuma update `newManagementItems` (di atas),
        // hasil pengangkatan/pemberhentian pengurus TIDAK PERNAH muncul di halaman Klien —
        // persis kasus "Tuan Ade diangkat, Tuan Rendy diberhentikan, tapi tidak ada yang
        // berubah di Klien". Jadi perubahan yang sama harus ikut ditulis ke `workingShareholders`
        // (yang jadi `profileUpdate.shareholders`), baik untuk pengurus yang sudah jadi
        // pemegang saham, maupun pengurus baru yang belum punya saham (mis. 0 lembar).
        if (hasExplicitDismissals || hasExplicitAppointments) {
          const dismissedNamesForSh = new Set(
            (formObj.managementDismissals || []).map((d: any) => (d.name || d.dismissedName || '').toUpperCase().trim())
          );

          workingShareholders.forEach((s: any) => {
            if (s?.name && dismissedNamesForSh.has(s.name.toUpperCase().trim())) {
              s.managementPosition = '';
              s.isManagement = false;
            }
          });

          const appointeesForSh: any[] = [
            ...(formObj.managementAppointments || []).map((a: any) => ({
              name: a.name || '',
              position: a.position || 'DIREKTUR',
              nik: a.nik || '',
              salutation: a.salutation || 'Tuan',
              address: a.address
            })),
            ...(formObj.managementDismissals || [])
              .filter((d: any) => (d.replacementType === 'MANUAL' || d.replacementType === 'NEW') && (d.replacedByDetail || d.replacedByName))
              .map((d: any) => {
                const detail = d.replacedByDetail || {};
                return {
                  name: d.replacedByName || detail.name || '',
                  position: d.replacedByPosition || detail.position || detail.managementPosition || 'DIREKTUR',
                  nik: d.replacedByNik || detail.nik || '',
                  salutation: d.replacedBySalutation || detail.salutation || 'Tuan',
                  address: detail.address
                };
              })
          ];

          appointeesForSh.forEach((ap: any) => {
            if (!ap.name) return;
            const match = workingShareholders.find((s: any) => (s.name || '').trim().toUpperCase() === ap.name.trim().toUpperCase());
            if (match) {
              match.managementPosition = ap.position;
              match.isManagement = true;
            } else {
              // Pengurus baru yang belum tercatat sebagai pemegang saham (mis. 0 lembar saham)
              workingShareholders.push({
                id: Math.random().toString(36).substring(7),
                name: ap.name,
                sharesOwned: 0,
                managementPosition: ap.position,
                isManagement: true,
                nik: ap.nik || '',
                salutation: ap.salutation || 'Tuan',
                address: ap.address
              });
            }
          });

          // workingShareholders dimutasi in-place di atas, tapi tetap tegaskan ulang referensinya
          // supaya konsisten kalau urutan kode di atas berubah di masa depan.
          profileUpdate.shareholders = workingShareholders;
          profileUpdate.finalShareholders = workingShareholders;
          console.log('[Sync Diagnostic][Management] shareholders setelah sinkron appointment/dismissal:', workingShareholders);
        }
        } // tutup gate: if (formObj.resolutions?.management === true)
      }

      // Merge Deed and SK details
      if (project.jobType === 'pendirian_pt') {
        profileUpdate.establishmentDeedNumber = deedNumber.trim();
        profileUpdate.establishmentDeedDate = deedDate;
        profileUpdate.establishmentNotary = finalNotaryName;
        profileUpdate.establishmentNotaryTitle = notarySelectionType === 'saya' ? 'Sarjana Hukum, Magister Kenotariatan' : '';
        profileUpdate.establishmentNotaryDomicile = notaryLocation.trim();
        if (firstSkSp) {
          profileUpdate.establishmentSkNumber = firstSkSp.number;
          profileUpdate.establishmentSkDate = firstSkSp.date || deedDate;
        }
        syncedItems.push('Data Akta Pendirian & SK');
      } else {
        // RUPS LB or Sirkuler
        profileUpdate.latestAmendmentDeedNumber = deedNumber.trim();
        profileUpdate.latestAmendmentDeedDate = deedDate;
        profileUpdate.latestAmendmentNotary = finalNotaryName;
        if (firstSkSp) {
          profileUpdate.latestAmendmentSkNumber = firstSkSp.number;
          profileUpdate.latestAmendmentSkDate = firstSkSp.date || deedDate;
        }

        const existingDeeds = freshClient?.amendmentDeeds || [];
        const newAmendmentDeed: AmendmentDeed = {
          id: Math.random().toString(36).substring(7),
          number: deedNumber.trim(),
          date: deedDate,
          notary: finalNotaryName,
          notaryTitle: notarySelectionType === 'saya' ? 'Sarjana Hukum, Magister Kenotariatan' : '',
          notaryDomicile: notaryLocation.trim(),
          skNumber: firstSkSp ? firstSkSp.number : '',
          skDate: firstSkSp ? firstSkSp.date : deedDate,
          skSpDocuments: validSkSpDocs
        };

        const duplicateIndex = existingDeeds.findIndex(d => d.number === deedNumber.trim());
        if (duplicateIndex !== -1) {
          const updatedDeeds = [...existingDeeds];
          updatedDeeds[duplicateIndex] = {
            ...newAmendmentDeed,
            id: existingDeeds[duplicateIndex].id || newAmendmentDeed.id
          };
          profileUpdate.amendmentDeeds = updatedDeeds;
        } else {
          // [Fix] Akta baru HARUS ditambahkan di AKHIR array, bukan di depan.
          // Seluruh logic generate dokumen lain (formatter.ts, personIdentification.ts,
          // sirkulerLaporanContentBlocks.ts, docxGenerator.ts, dll.) mengasumsikan
          // amendmentDeeds[length-1] adalah akta PALING BARU (dipakai untuk kalimat
          // "...terakhir dengan akta nomor X..."). Menaruh akta baru di depan array
          // akan membuat kalimat itu salah rujuk ke akta yang lebih lama, dan juga
          // membuat penomoran "Akta Perubahan 1/2/dst" di halaman Klien jadi terbalik.
          profileUpdate.amendmentDeeds = [...existingDeeds, newAmendmentDeed];
        }
        syncedItems.push(`Data Akta Perubahan (No. ${deedNumber.trim()}${validSkSpDocs.length > 0 ? `, ${validSkSpDocs.length} SK/SP` : ''})`);
      }

      // Build changes for versionHistory
      const changesList: { field: string; before: any; after: any }[] = [];
      if (profileUpdate.companyName && profileUpdate.companyName !== freshClient?.companyName) {
        changesList.push({ field: 'Nama Perusahaan', before: freshClient?.companyName || '-', after: profileUpdate.companyName });
      }

      const oldKbliStr = JSON.stringify((freshClient?.kbliItems || []).map((k: any) => k.code));
      const newKbliStr = JSON.stringify((profileUpdate.kbliItems || []).map((k: any) => k.code));
      if (profileUpdate.kbliItems && newKbliStr !== oldKbliStr) {
        changesList.push({ field: 'KBLI', before: `${freshClient?.kbliItems?.length || 0} item`, after: `${profileUpdate.kbliItems.length} item` });
      }

      if (profileUpdate.domicile && profileUpdate.domicile !== freshClient?.domicile) {
        changesList.push({ field: 'Kedudukan', before: freshClient?.domicile || '-', after: profileUpdate.domicile });
      }

      const oldMgmtSig = JSON.stringify(managementBaseline.map((m: any) => ({
        name: (m.name || '').trim().toUpperCase(),
        pos: (m.position || '').trim().toUpperCase(),
        addr: m.address?.fullAddress || ''
      })));
      const newMgmtSig = JSON.stringify((profileUpdate.newManagementItems || []).map((m: any) => ({
        name: (m.name || '').trim().toUpperCase(),
        pos: (m.position || '').trim().toUpperCase(),
        addr: m.address?.fullAddress || ''
      })));
      if (profileUpdate.newManagementItems && newMgmtSig !== oldMgmtSig) {
        syncedItems.push(`Susunan Pengurus (${profileUpdate.newManagementItems.length} orang)`);
        changesList.push({ field: 'Susunan Pengurus', before: `${managementBaseline.length} orang`, after: `${profileUpdate.newManagementItems.length} orang` });
      }

      const oldShSig = JSON.stringify((freshClient?.shareholders || []).map((s: any) => ({
        name: (s.name || '').trim().toUpperCase(),
        shares: s.sharesOwned || 0,
        addr: s.address?.fullAddress || ''
      })));
      const newShSig = JSON.stringify((profileUpdate.shareholders || []).map((s: any) => ({
        name: (s.name || '').trim().toUpperCase(),
        shares: s.sharesOwned || 0,
        addr: s.address?.fullAddress || ''
      })));
      if (profileUpdate.shareholders && newShSig !== oldShSig) {
        syncedItems.push(`Susunan Pemegang Saham (${profileUpdate.shareholders.length} orang)`);
        changesList.push({ field: 'Pemegang Saham', before: `${freshClient?.shareholders?.length || 0} pemegang`, after: `${profileUpdate.shareholders.length} pemegang` });
      }
      changesList.push({
        field: 'Akta & SK/SP',
        before: freshClient?.latestAmendmentDeedNumber || freshClient?.establishmentDeedNumber || '-',
        after: `${deedNumber.trim()} (${validSkSpDocs.length} SK/SP)`
      });

      const newRevision: CompanyRevision = {
        revisionId: Math.random().toString(36).substring(7),
        changedAt: new Date().toISOString(),
        changedBy: currentUser?.name || currentUser?.email || 'Notaris Engine',
        projectCauseId: projectId,
        reason: isProjectMinuta(project.status) 
          ? `Koreksi Data Akta / Update Minuta (${deedNumber.trim()})`
          : `Penetapan Akta Selesai (${deedNumber.trim()})`,
        changes: changesList,
        deedNumber: deedNumber.trim(),
        skNumber: firstSkSp ? firstSkSp.number : ''
      };

      const existingHistory = freshClient?.versionHistory || [];
      profileUpdate.versionHistory = [newRevision, ...existingHistory];

      // === Layar Preview Perubahan Data Klien (Task 3) ===
      // Rangkum perubahan per kategori, dan beri peringatan tegas apabila sebuah resolusi
      // dicentang di form tapi hasil kalkulasi TIDAK menghasilkan perubahan apa pun.
      const previewCategories: { label: string; before: string; after: string }[] = [];
      const previewWarnings: string[] = [];

      const domicileChanged = !!profileUpdate.domicile && profileUpdate.domicile !== freshClient?.domicile;
      if (domicileChanged) {
        previewCategories.push({ label: 'Kedudukan', before: freshClient?.domicile || '-', after: profileUpdate.domicile });
      }
      if (formObj?.resolutions?.domicile === true && !domicileChanged) {
        previewWarnings.push('Resolusi "Perubahan Tempat Kedudukan" dicentang tapi tidak ada perubahan terdeteksi — periksa input form sebelum lanjut.');
      }

      const addressChanged = syncedItems.some(i => i.startsWith('Alamat'));
      if (addressChanged) {
        previewCategories.push({ label: 'Alamat', before: freshClient?.fullAddress || '-', after: profileUpdate.fullAddress || '-' });
      }
      if (formObj?.resolutions?.address === true && !addressChanged) {
        previewWarnings.push('Resolusi "Perubahan Alamat Lengkap" dicentang tapi tidak ada perubahan terdeteksi — periksa input form sebelum lanjut.');
      }

      const kbliChanged = !!(profileUpdate.kbliItems && newKbliStr !== oldKbliStr);
      if (kbliChanged) {
        previewCategories.push({ label: 'KBLI', before: `${freshClient?.kbliItems?.length || 0} item`, after: `${profileUpdate.kbliItems.length} item` });
      }
      if (formObj?.resolutions?.kbli === true && !kbliChanged) {
        previewWarnings.push('Resolusi "Perubahan Maksud & Tujuan (KBLI)" dicentang tapi tidak ada perubahan terdeteksi — periksa input form sebelum lanjut.');
      }

      const capitalChanged = !!(profileUpdate.targetCapitalBase || profileUpdate.targetCapitalPaid);
      if (capitalChanged) {
        previewCategories.push({
          label: 'Modal Dasar / Disetor',
          before: `Rp ${(freshClient?.targetCapitalBase || 0).toLocaleString('id-ID')} / Rp ${(freshClient?.targetCapitalPaid || 0).toLocaleString('id-ID')}`,
          after: `Rp ${(profileUpdate.targetCapitalBase || freshClient?.targetCapitalBase || 0).toLocaleString('id-ID')} / Rp ${(profileUpdate.targetCapitalPaid || freshClient?.targetCapitalPaid || 0).toLocaleString('id-ID')}`
        });
      }
      const capitalResolutionChecked = formObj?.resolutions?.capitalBase === true || formObj?.resolutions?.capitalPaid === true;
      if (capitalResolutionChecked && !capitalChanged) {
        previewWarnings.push('Resolusi Peningkatan Modal dicentang tapi tidak ada perubahan Modal Dasar/Disetor terdeteksi — periksa input form sebelum lanjut.');
      }

      const managementChanged = !!(profileUpdate.newManagementItems && newMgmtSig !== oldMgmtSig);
      if (managementChanged) {
        previewCategories.push({ label: 'Susunan Pengurus', before: `${managementBaseline.length} orang`, after: `${profileUpdate.newManagementItems.length} orang` });
      }
      if (formObj?.resolutions?.management === true && !managementChanged) {
        previewWarnings.push('Resolusi "Perubahan Susunan Pengurus" dicentang tapi tidak ada perubahan terdeteksi — periksa apakah Daftar Pengangkatan/Pemberhentian sudah tersimpan sebelum lanjut.');
      }

      const shareholdersChanged = !!(profileUpdate.shareholders && newShSig !== oldShSig);
      if (shareholdersChanged) {
        previewCategories.push({ label: 'Pemegang Saham', before: `${freshClient?.shareholders?.length || 0} pemegang`, after: `${profileUpdate.shareholders.length} pemegang` });
      }
      if (formObj?.resolutions?.shareholders === true && !shareholdersChanged) {
        previewWarnings.push('Resolusi "Peralihan Saham / Perubahan Pemegang Saham" dicentang tapi tidak ada perubahan terdeteksi — periksa input form sebelum lanjut.');
      }

      console.log('[Sync Diagnostic][Preview] Kategori perubahan:', previewCategories);
      console.log('[Sync Diagnostic][Preview] Peringatan:', previewWarnings);
      console.log('[Sync Diagnostic][Preview] profileUpdate final:', profileUpdate);

      const userConfirmedSync = await requestSyncPreviewConfirmation({
        categories: previewCategories,
        warnings: previewWarnings
      });

      if (!userConfirmedSync) {
        throw new Error('SYNC_CANCELLED_BY_USER');
      }

      await setDoc(doc(db, 'profiles', project.clientId), cleanUndefined(profileUpdate), { merge: true });
      try {
        await setDoc(doc(db, 'company_profiles', project.clientId), cleanUndefined(profileUpdate), { merge: true });
      } catch (e) {
        console.warn('Could not sync company_profiles:', e);
      }
    }

    return syncedItems;
  };

  const handleSaveDeedInfoOnly = async () => {
    if (!deedNumber.trim() || !deedDate || !notaryName.trim() || !notaryLocation.trim()) {
      alert('Lengkapi data akta terlebih dahulu.');
      return;
    }
    setSavingDeedInfo(true);
    try {
      const syncedItems = await syncDeedInfoAndClientProfile();
      await fetchProjectFullDetails();
      const itemsFormatted = syncedItems && syncedItems.length > 0
        ? syncedItems.map(item => `• ${item}`).join('\n')
        : '• Data Akta & Profil Perusahaan';

      alert(`✅ Data akta berhasil disimpan.\n\nPerubahan yang disinkronkan ke profil klien:\n${itemsFormatted}`);
    } catch (e: any) {
      if (e?.message === 'SYNC_CANCELLED_BY_USER') {
        // Notaris membatalkan dari layar preview — tidak perlu tampilkan error.
        return;
      }
      console.error(e);
      alert('Gagal menyimpan data akta: ' + (e.message || e));
    } finally {
      setSavingDeedInfo(false);
    }
  };

  const handleStatusTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transitionStatus) return;

    const isCompletedStatus = 
      transitionStatus.toLowerCase().includes('selesai') || 
      transitionStatus.toLowerCase() === 'sp terbit' || 
      transitionStatus.toLowerCase() === 'sp/sk terbit' || 
      transitionStatus.toLowerCase() === 'nib terbit';
    const hasDeedForm = ['rups_lb', 'sirkuler_rupslb', 'pendirian_pt'].includes(project?.jobType || '');

    if (isCompletedStatus && hasDeedForm) {
      if (!deedNumber.trim() || !deedDate || !notaryName.trim() || !notaryLocation.trim()) {
        alert('Harap isi Nomor Akta, Tanggal Akta, Nama Notaris, dan Kedudukan Notaris sebelum menyelesaikan proyek.');
        return;
      }
    }

    setTransitioning(true);
    try {
      if (isCompletedStatus && hasDeedForm) {
        await syncDeedInfoAndClientProfile();
      }

      await ProjectService.updateStatus(
        projectId,
        transitionStatus,
        currentUserEmail || 'staff_notaris',
        transitionComment.trim() || undefined,
        isProjectMinuta(project.status) ? false : transitionStrict
      );

      setTransitionComment('');
      await fetchProjectFullDetails();
      alert('Status proyek berhasil diperbarui dan data perubahan/pendirian telah disinkronkan ke master data klien!');
    } catch (err: any) {
      if (err?.message === 'SYNC_CANCELLED_BY_USER') {
        // Notaris membatalkan dari layar preview — status TIDAK berubah, tidak perlu tampilkan error.
        return;
      }
      console.error(err);
      alert(`Gagal memperbarui status: ${err.message || 'Pelanggaran transisi status berurutan (Strict Guard).'}`);
    } finally {
      setTransitioning(false);
    }
  };

  const renderDeedFields = () => (
    <div className="space-y-4">
      {/* Nomor Akta */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <label className="text-xs font-medium text-slate-700">
          Nomor Akta <span className="text-red-500">*</span>
        </label>
        <div className="col-span-2">
          <input
            type="text"
            required
            value={deedNumber}
            onChange={(e) => setDeedNumber(e.target.value)}
            placeholder="Contoh: 01"
            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none transition-all focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tanggal Akta */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <label className="text-xs font-medium text-slate-700">
          Tanggal Akta <span className="text-red-500">*</span>
        </label>
        <div className="col-span-2">
          <input
            type="date"
            required
            value={deedDate}
            onChange={(e) => setDeedDate(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none transition-all focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Pilih Notaris */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <label className="text-xs font-medium text-slate-700">
          Pilih Notaris <span className="text-red-500">*</span>
        </label>
        <div className="col-span-2">
          <select
            value={notarySelectionType}
            onChange={(e) => {
              const val = e.target.value as 'saya' | 'manual';
              setNotarySelectionType(val);
              if (val === 'saya') {
                setNotaryName('Nukantini Putri Parincha, SH., M.Kn.');
              } else {
                setNotaryName('');
              }
            }}
            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none transition-all focus:ring-1 focus:ring-blue-500"
          >
            <option value="saya">Saya (Nukantini Putri Parincha, SH., M.Kn.)</option>
            <option value="manual">Notaris Lain (Isi Manual)</option>
          </select>
        </div>
      </div>

      {/* Nama Notaris (if manual) */}
      {notarySelectionType === 'manual' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center animate-fadeIn">
          <label className="text-xs font-medium text-slate-700">
            Nama Notaris <span className="text-red-500">*</span>
          </label>
          <div className="col-span-2">
            <input
              type="text"
              required
              value={notaryName}
              onChange={(e) => setNotaryName(e.target.value)}
              placeholder="Nama Notaris..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none transition-all focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Kedudukan Notaris */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <label className="text-xs font-medium text-slate-700">
          Kedudukan Notaris <span className="text-red-500">*</span>
        </label>
        <div className="col-span-2">
          <input
            type="text"
            required
            value={notaryLocation}
            onChange={(e) => setNotaryLocation(e.target.value)}
            placeholder="Kedudukan Notaris..."
            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none transition-all focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Nested Box: DAFTAR SK / SP TERKAIT */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5 mt-2 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
            DAFTAR SK / SP TERKAIT ({skSpEntries.filter(e => e.number.trim()).length})
          </div>
          <button
            type="button"
            onClick={() => setSkSpEntries(prev => [...prev, { id: Math.random().toString(36).substring(7), type: 'SP (Perubahan Data Perseroan)', number: '', date: '' }])}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 font-semibold text-[11px] rounded-lg transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah SK/SP</span>
          </button>
        </div>
        
        <div className="space-y-3">
          {skSpEntries.map((entry, idx) => (
            <div key={entry.id || idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-white p-3 rounded-lg border border-slate-200">
              {/* Tipe */}
              <div className="md:col-span-4 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Tipe
                </label>
                <select
                  value={entry.type}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSkSpEntries(prev => prev.map((item, i) => i === idx ? { ...item, type: val } : item));
                  }}
                  className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none transition-all focus:ring-1 focus:ring-blue-500"
                >
                  <option value="SP (Perubahan Data Perseroan)">SP (Perubahan Data Perseroan)</option>
                  <option value="SK (Persetujuan Perubahan Anggaran Dasar)">SK (Persetujuan Perubahan Anggaran Dasar)</option>
                  <option value="SP (Pendirian PT)">SP (Pendirian PT)</option>
                  <option value="SK (Pendirian PT)">SK (Pendirian PT)</option>
                </select>
              </div>

              {/* Nomor */}
              <div className="md:col-span-4 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Nomor
                </label>
                <input
                  type="text"
                  value={entry.number}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSkSpEntries(prev => prev.map((item, i) => i === idx ? { ...item, number: val } : item));
                  }}
                  placeholder="AHU-AH.01.09-..."
                  className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none transition-all focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Tanggal */}
              <div className="md:col-span-3 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={entry.date}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSkSpEntries(prev => prev.map((item, i) => i === idx ? { ...item, date: val } : item));
                  }}
                  className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none transition-all focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Action Hapus */}
              <div className="md:col-span-1 flex items-center justify-center pt-2 md:pt-4">
                <button
                  type="button"
                  disabled={skSpEntries.length <= 1}
                  onClick={() => {
                    setSkSpEntries(prev => prev.filter((_, i) => i !== idx));
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                  title="Hapus baris"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const isProjectMinuta = (status: string) => {
    const s = status.toLowerCase();
    return s === 'completed' || s === 'archived' || s === 'selesai';
  };

  const syncMinutaCompletion = async (currentTasks: Task[]) => {
    if (!project) return;
    const isMinuta = isProjectMinuta(project.status);
    if (!isMinuta) return;

    const PRE_MINUTA_DEFAULT_TITLES = ["NOTULEN", "AKTA RUPS LB", "SK/SP", "NPWP", "NIB"];
    const displayedMinutaTasks = currentTasks.filter(t => !PRE_MINUTA_DEFAULT_TITLES.includes(t.title));

    const allChecked = displayedMinutaTasks.length > 0 && displayedMinutaTasks.every(t => t.status === 'completed' || t.status === 'not_required');

    if (project.metadata?.minutaCheckedAll !== allChecked) {
      try {
        const updatedMetadata = {
          ...(project.metadata || {}),
          minutaCheckedAll: allChecked
        };
        await updateDoc(doc(db, 'office_projects', project.projectId), {
          metadata: updatedMetadata
        });
        setProject(prev => prev ? { ...prev, metadata: updatedMetadata } : null);
      } catch (err) {
        console.error("Failed to sync minuta completion status:", err);
      }
    }
  };

  const getDisplayedTasks = () => {
    if (!project) return [];
    const isMinuta = isProjectMinuta(project.status);
    const MINUTA_TASK_TITLES = [
      "Copy KTP Para Pihak",
      "Copy NPWP Para Pihak",
      "Copy Seluruh Riwayat Akta",
      "Demikianlah Lengkap",
      "Akta Minuta diprint",
      "Surat-Surat Pendukung",
      "Jahit Minuta"
    ];
    const PRE_MINUTA_DEFAULT_TITLES = ["NOTULEN", "AKTA RUPS LB", "SK/SP", "NPWP", "NIB"];

    if (isMinuta) {
      return tasks.filter(t => !PRE_MINUTA_DEFAULT_TITLES.includes(t.title));
    } else {
      return tasks.filter(t => !MINUTA_TASK_TITLES.includes(t.title));
    }
  };

  const handleSaveMinutaNotes = async () => {
    if (!project) return;
    setSavingNotes(true);
    try {
      await updateDoc(doc(db, 'office_projects', project.projectId), {
        minutaNotes: localMinutaNotes
      });
      setProject(prev => prev ? { ...prev, minutaNotes: localMinutaNotes } : null);
      alert('Catatan minuta berhasil disimpan.');
    } catch (err: any) {
      console.error(err);
      alert('Gagal menyimpan catatan minuta: ' + err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveProjectNote = async () => {
    if (!project) return;
    if (!projectNote.trim()) {
      alert('Harap ketik catatan terlebih dahulu.');
      return;
    }
    setSavingProjectNote(true);
    try {
      const now = new Date();
      const noteContent = projectNote.trim();
      
      // Update the project document on Firestore directly
      await updateDoc(doc(db, 'office_projects', projectId), {
        lastTransitionComment: noteContent,
        updatedAt: now
      });

      // Add to timeline log with current status and category as Catatan Tambahan
      await ProjectService.addTimeline(projectId, {
        status: project.status,
        title: "Catatan Tambahan",
        description: noteContent,
        createdBy: currentUserEmail || 'staff_notaris'
      });

      setProjectNote('');
      // Reload project details to show updated timeline and comments
      await fetchProjectFullDetails();
      alert('Catatan tambahan berhasil disimpan!');
    } catch (err: any) {
      console.error(err);
      alert(`Gagal menyimpan catatan: ${err.message || 'Error tidak dikenal'}`);
    } finally {
      setSavingProjectNote(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed' | 'not_required') => {
    try {
      await ProjectService.updateTaskStatus(projectId, taskId, newStatus);
      // Update local state smoothly
      const updatedTasks = tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
      setTasks(updatedTasks);
      await syncMinutaCompletion(updatedTasks);
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui status checklist.');
    }
  };

  const handleToggleTask = async (taskId: string, currentCompleted: boolean) => {
    await handleUpdateTaskStatus(taskId, currentCompleted ? 'pending' : 'completed');
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setAddingTask(true);
    try {
      const newTask = await ProjectService.createTask(projectId, {
        title: newTaskTitle.trim(),
        status: 'pending'
      });

      if (newTask) {
        const updatedTasks = [...tasks, newTask];
        setTasks(updatedTasks);
        setNewTaskTitle('');
        await syncMinutaCompletion(updatedTasks);
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menambahkan tugas baru.');
    } finally {
      setAddingTask(false);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.name.trim()) {
      alert('Nama dokumen wajib diisi.');
      return;
    }
    if (!selectedFile) {
      alert('Silakan pilih atau seret file yang ingin diunggah.');
      return;
    }

    setAddingDoc(true);
    try {
      const base64 = await getBase64(selectedFile);
      
      const response = await fetch(getApiUrl('/api/upload-document'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId,
          name: docForm.name.trim(),
          fileName: selectedFile.name,
          fileType: selectedFile.type || 'application/octet-stream',
          base64,
          uploadedBy: currentUser.email || 'staff_notaris'
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Gagal mengunggah dokumen.');
      }

      // Refresh documents and clear states
      setIsDocModalOpen(false);
      setSelectedFile(null);
      setDocForm({ name: '', type: 'docx', url: '' });
      
      // Fetch details again to refresh UI
      await fetchProjectFullDetails();
      
      alert('Dokumen administrasi berhasil diunggah dan disimpan ke Google Drive!');
    } catch (err: any) {
      console.error(err);
      alert('Gagal mengunggah dokumen: ' + err.message);
    } finally {
      setAddingDoc(false);
    }
  };

  const handlePullFromForm = async (): Promise<Party[]> => {
    // 1. Fetch form object
    const formDoc = documents.find(d => d.refId);
    const refIdToUse = formDoc?.refId || project?.metadata?.refId || projectId;
    const formObj = await fetchDocRecordData({
      id: 'temp',
      name: project?.title || '',
      type: 'form',
      refId: refIdToUse,
      uploadedAt: new Date().toISOString()
    });

    if (!formObj) {
      throw new Error('Gagal memuat formulir atau data kehadiran proyek ini. Pastikan Anda telah mengisi dan menyimpan data formulir terlebih dahulu.');
    }

    const extractedParties: Party[] = [];

    // Helper to format Address object to string
    const formatAddress = (addr: any): string => {
      if (!addr) return '';
      if (typeof addr === 'string') return addr;
      const parts = [];
      if (addr.fullAddress) parts.push(addr.fullAddress);
      if (addr.rt && addr.rw) parts.push(`RT ${addr.rt}/RW ${addr.rw}`);
      else if (addr.rt) parts.push(`RT ${addr.rt}`);
      else if (addr.rw) parts.push(`RW ${addr.rw}`);
      if (addr.kelurahan) parts.push(`Kel. ${addr.kelurahan}`);
      if (addr.kecamatan) parts.push(`Kec. ${addr.kecamatan}`);
      if (addr.city) parts.push(addr.city);
      if (addr.province) parts.push(addr.province);
      return parts.join(', ');
    };

    // Helper to standardise occupation
    const mapOccupation = (occ: string): string => {
      if (!occ) return 'Pengusaha';
      const clean = occ.trim().toLowerCase();
      if (clean === 'pengusaha') return 'Pengusaha';
      if (clean.includes('swasta') || clean.includes('karyawan') || clean.includes('pegawai')) return 'Pegawai Swasta';
      if (clean === 'pns' || clean.includes('negeri') || clean.includes('sipil')) return 'PNS';
      if (clean.includes('dokter') || clean.includes('advokat') || clean.includes('notaris') || clean.includes('akuntan') || clean.includes('profesional') || clean.includes('spesialis') || clean.includes('bidan')) {
        return 'Profesional';
      }
      if (clean.includes('pedagang') || clean.includes('dagang')) return 'Pedagang';
      if (clean.includes('guru') || clean.includes('dosen') || clean.includes('pengajar')) return 'Pengajar';
      if (clean.includes('petani') || clean.includes('tani')) return 'Petani';
      return 'Lainnya';
    };

    // Helper to add unique party
    const addParty = (item: {
      name: string;
      nik?: string;
      jabatan: string;
      pekerjaan?: string;
      kewarganegaraan?: string;
      alamat?: string;
      sahamPercentage?: number;
    }) => {
      if (!item.name) return;
      const name = item.name.trim();
      const nik = (item.nik || '').trim();
      const rawJabatan = item.jabatan.trim();
      
      // Map jabatan to standardized options
      let jabatan = 'Direktur';
      if (rawJabatan.toLowerCase().includes('direktur utama')) {
        jabatan = 'Direktur Utama';
      } else if (rawJabatan.toLowerCase().includes('direktur')) {
        jabatan = 'Direktur';
      } else if (rawJabatan.toLowerCase().includes('komisaris utama')) {
        jabatan = 'Komisaris Utama';
      } else if (rawJabatan.toLowerCase().includes('komisaris')) {
        jabatan = 'Komisaris';
      } else if (rawJabatan.toLowerCase().includes('saham') || rawJabatan.toLowerCase().includes('shareholder')) {
        jabatan = 'Pemegang Saham';
      } else if (rawJabatan.toLowerCase().includes('kuasa') || rawJabatan.toLowerCase().includes('proxy')) {
        jabatan = 'Kuasa';
      } else {
        jabatan = rawJabatan;
      }

      const pekerjaan = mapOccupation(item.pekerjaan || 'Pengusaha');
      let kewarganegaraan = (item.kewarganegaraan || 'WNI').trim().toUpperCase();
      if (kewarganegaraan === 'INDONESIA') kewarganegaraan = 'WNI';

      const existingIdx = extractedParties.findIndex(p => {
        if (p.nik && nik) return p.nik === nik;
        return p.name.trim().toLowerCase() === name.trim().toLowerCase();
      });
      if (existingIdx !== -1) {
        // Person already exists, let's keep the highest precedence position or append details
        const existing = extractedParties[existingIdx];
        if (jabatan !== 'Kuasa' && existing.jabatan === 'Kuasa') {
          existing.jabatan = jabatan;
        }
        if (item.sahamPercentage !== undefined) {
          existing.sahamPercentage = item.sahamPercentage;
        }
        if (!existing.nik && nik) {
          existing.nik = nik;
        }
        if (!existing.alamat && item.alamat) {
          existing.alamat = item.alamat;
        }
      } else {
        extractedParties.push({
          id: crypto.randomUUID(),
          name,
          nik,
          jabatan,
          pekerjaan,
          kewarganegaraan,
          alamat: item.alamat || undefined,
          sahamPercentage: item.sahamPercentage || undefined,
          status: 'Aktif'
        });
      }
    };

    // 1. Fetch from Shareholders (data.shareholders, finalShareholders, pemegangSaham)
    const rawShareholders = formObj.shareholders || formObj.finalShareholders || formObj.pemegangSaham || [];
    let totalShares = 0;
    if (Array.isArray(rawShareholders)) {
      rawShareholders.forEach((s: any) => {
        const shares = Number(s.sharesOwned || s.finalShares || s.shares || 0);
        totalShares += shares;
      });

      rawShareholders.forEach((s: any) => {
        const shares = Number(s.sharesOwned || s.finalShares || s.shares || 0);
        const sahamPercentage = totalShares > 0 ? Number(((shares / totalShares) * 100).toFixed(2)) : undefined;

        // Add as shareholder
        addParty({
          name: s.name,
          nik: s.nik,
          jabatan: s.isManagement ? (s.managementPosition || 'Direktur') : 'Pemegang Saham',
          pekerjaan: s.occupation,
          kewarganegaraan: s.nationalityType || (s.nationality === 'INDONESIA' ? 'WNI' : s.nationality) || 'WNI',
          alamat: formatAddress(s.address),
          sahamPercentage
        });

        // Add proxy (kuasa) if present
        if (s.isProxy && s.proxyData && s.proxyData.name) {
          addParty({
            name: s.proxyData.name,
            nik: s.proxyData.nik,
            jabatan: 'Kuasa',
            pekerjaan: s.proxyData.occupation,
            kewarganegaraan: s.proxyData.nationalityType || 'WNI',
            alamat: formatAddress(s.proxyData.address)
          });
        }
      });
    }

    // 2. Fetch from Management items (managementItems, newManagementItems, oldManagementItems, finalManagement, direksi, komisaris, pengurus)
    const mItems = [
      ...(formObj.managementItems || []),
      ...(formObj.newManagementItems || []),
      ...(formObj.oldManagementItems || []),
      ...(formObj.finalManagement || []),
      ...(formObj.direksi || []),
      ...(formObj.komisaris || []),
      ...(formObj.pengurus || [])
    ];

    if (Array.isArray(mItems)) {
      mItems.forEach((m: any) => {
        if (!m || !m.name) return;
        addParty({
          name: m.name,
          nik: m.nik,
          jabatan: m.position || m.managementPosition || 'Direktur',
          pekerjaan: m.occupation || m.pekerjaan,
          kewarganegaraan: m.nationalityType || m.kewarganegaraan || 'WNI',
          alamat: formatAddress(m.address)
        });
      });
    }

    // 3. Fetch from Guests / Pihak Lain / Peserta Rapat (guests, paraPihak, pihakLain, pesertaRapat)
    const rawGuests = [
      ...(formObj.guests || []),
      ...(formObj.paraPihak || []),
      ...(formObj.pihakLain || []),
      ...(formObj.pesertaRapat || [])
    ];

    if (Array.isArray(rawGuests)) {
      rawGuests.forEach((g: any) => {
        if (!g || !g.name) return;
        addParty({
          name: g.name,
          nik: g.nik,
          jabatan: g.position || g.jabatan || 'Kuasa',
          pekerjaan: g.occupation || g.pekerjaan,
          kewarganegaraan: g.nationalityType || g.nationality || g.kewarganegaraan || 'WNI',
          alamat: formatAddress(g.address)
        });
      });
    }

    // 4. Fetch from Appointed and Dismissed Management (managementAppointments, managementDismissals)
    const rawAppointments = formObj.managementAppointments || [];
    if (Array.isArray(rawAppointments)) {
      rawAppointments.forEach((a: any) => {
        if (!a || !a.name) return;
        addParty({
          name: a.name,
          nik: a.nik,
          jabatan: a.position || 'Direktur',
          pekerjaan: a.occupation || 'Pengusaha',
          kewarganegaraan: a.nationalityType || 'WNI',
          alamat: formatAddress(a.address)
        });
      });
    }

    const rawDismissals = formObj.managementDismissals || [];
    if (Array.isArray(rawDismissals)) {
      rawDismissals.forEach((d: any) => {
        if (!d || !d.name) return;
        addParty({
          name: d.name,
          nik: d.nik,
          jabatan: d.position || 'Direktur',
          pekerjaan: d.occupation || 'Pengusaha',
          kewarganegaraan: d.nationalityType || 'WNI',
          alamat: formatAddress(d.address)
        });
      });
    }

    // 5. Pimpinan Rapat (pimpinanRapat, meetingChair)
    if (formObj.meetingChair) {
      addParty({
        name: formObj.meetingChair,
        nik: formObj.meetingChairNik || '',
        jabatan: formObj.meetingChairPosition || 'Kuasa',
        pekerjaan: 'Pengusaha',
        kewarganegaraan: 'WNI'
      });
    }

    return extractedParties;
  };

  const handleSaveParties = async (updatedParties: Party[]) => {
    try {
      await updateDoc(doc(db, 'office_projects', projectId), {
        parties: updatedParties
      });
      setProject(prev => prev ? { ...prev, parties: updatedParties } : null);
    } catch (err: any) {
      console.error(err);
      throw new Error('Gagal menyimpan data personil ke database: ' + err.message);
    }
  };

  const handlePushPartiesToForm = async (): Promise<void> => {
    if (!project?.parties || project.parties.length === 0) {
      alert('Belum ada Data Personil di Proyek Kerja ini.');
      return;
    }

    const { shareholders: mappedSh, oldManagementItems: mappedMgmt } = mapPartiesToShareholdersAndManagement(project.parties);

    const formDoc = documents.find(d => d.refId);
    const refIdToUse = formDoc?.refId || project.metadata?.refId || projectId;
    const collectionName = project.jobType === 'rupst' || project.jobType === 'sirkuler' ? 'rupst_projects' : 'projects';

    try {
      const docRef = doc(db, collectionName, refIdToUse);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        await updateDoc(docRef, {
          shareholders: mappedSh,
          oldManagementItems: mappedMgmt
        });
      }
      alert(`Berhasil mengimpor ${mappedSh.length} Personil dari Proyek Kerja ke Formulir RUPS.`);
    } catch (e: any) {
      console.error('Error pushing parties to form doc:', e);
      alert('Data Personil telah dipetakan ke memori sesi.');
    }
  };

  const getRedirectPath = (jobType: string) => {
    switch (jobType) {
      case 'rups_lb':
        return '/rupslb';
      case 'rups_t':
        return '/rupst';
      case 'sirkuler':
        return '/rupst';
      case 'sirkuler_rupslb':
        return '/rupslb';
      case 'pendirian_pt':
        return '/pendirian';
      default:
        return '/';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 h-full">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="text-[13px] text-slate-400 mt-2">Memuat detail proyek...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex-1 p-6 bg-slate-50">
        <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-800">Terjadi Kesalahan</h2>
          <p className="text-[13px] text-slate-500 mt-1">{error || 'Proyek gagal dimuat.'}</p>
          <button
            onClick={onBack}
            className="mt-6 px-4 py-2 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Daftar Proyek</span>
          </button>
        </div>
      </div>
    );
  }

  const isPT = client?.clientType === 'PT' || project.clientSnapshot?.companyType === 'PT';

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Back and Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
          <div className="flex items-start gap-4">
            <button
              onClick={onBack}
              className="p-2 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg transition-colors shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">
                  ID: {project.projectId.substring(0, 10)}
                </span>
                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
                  {workflow?.name || project.jobType}
                </span>
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1.5 leading-snug">
                {project.title}
              </h1>
            </div>
          </div>

          {/* Quick link buttons to existing forms */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {project.jobType === 'sewa_menyewa' && (
              <button
                onClick={() => setWorkMode('sewa_menyewa')}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-[13px] flex items-center gap-2 transition-all shadow-sm"
              >
                <span>Kerjakan di Sini</span>
                <Sparkles className="w-4 h-4" />
              </button>
            )}
            {isPT && (
              <>
                {(() => {
                  const path = getRedirectPath(project.jobType);
                  const existingDoc = documents.find(d => d.url === path);
                  
                  if (existingDoc && existingDoc.refId) {
                    return (
                      <a
                        href={`${path}?id=${existingDoc.refId}&projectId=${project.projectId}`}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-[13px] flex items-center gap-2 transition-all shadow-sm"
                      >
                        <span>Edit Dokumen</span>
                        <FileText className="w-4 h-4" />
                      </a>
                    );
                  }

                  return (
                    <a
                      href={`${path}?projectId=${project.projectId}`}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-[13px] flex items-center gap-2 transition-all shadow-sm"
                    >
                      <span>Buat Dokumen Baru</span>
                      <Plus className="w-4 h-4" />
                    </a>
                  );
                })()}
                {project.jobType === 'pendirian_pt' && (
                  <button
                    onClick={handleWorkHere}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-[13px] flex items-center gap-2 transition-all shadow-sm"
                  >
                    <span>Kerjakan di Sini</span>
                    <Sparkles className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
            {currentUser.role === 'Super Admin' && (
              <button
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 font-semibold rounded-lg text-[13px] flex items-center gap-2 transition-all border border-red-200"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Hapus Proyek</span>
              </button>
            )}
          </div>
        </div>

        {workMode === 'sewa_menyewa' ? (
          <div className="mt-6">
            <button 
              onClick={() => setWorkMode('default')}
              className="mb-4 flex items-center gap-2 text-slate-500 hover:text-slate-700 font-semibold text-sm transition-colors bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Detail Proyek
            </button>
            <LeaseAgreementDraft
              projectId={projectId}
              project={project}
              currentUser={currentUser}
              onCancel={() => setWorkMode('default')}
            />
          </div>
        ) : workMode === 'pendirian' ? (
          <div className="mt-6">
            <button 
              onClick={() => setWorkMode('default')}
              className="mb-4 flex items-center gap-2 text-slate-500 hover:text-slate-700 font-semibold text-sm transition-colors bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Detail Proyek
            </button>
            <DraftAktaPendirian
                profiles={pendirianProfiles}
                initialData={workingPendirianData}
                isSaving={addingDoc}
                isSyncing={false}
                onSync={async (finalData) => {
                  const deedNumber = finalData.nomorAkta;
                  const deedDate = finalData.tanggal;
                  if (!deedNumber || !deedDate) {
                    alert("Nomor Akta dan Tanggal Akta harus diisi sebelum sinkronisasi.");
                    return;
                  }
                  let rawClientName = finalData.namaPt;
                  if (finalData.selectedProfileId) {
                    const profile = pendirianProfiles.find(p => p.id === finalData.selectedProfileId);
                    if (profile && profile.companyName) rawClientName = profile.companyName;
                  }
                  const clientName = (rawClientName || '').toUpperCase().startsWith('PT') 
                    ? (rawClientName || '') : `PT ${(rawClientName || '')}`;
                  const syncData = {
                    deedNumber,
                    orderNumber: finalData.nomorUrut,
                    deedDate,
                    clientName,
                    deedTitle: getDeedTitle('PENDIRIAN', finalData, rawClientName),
                    appearers: formatAppearersForPendirian(finalData)
                  };
                  try {
                    const success = await syncToUtama(syncData);
                    if (success) {
                      alert("Berhasil disimpan ke laporan!");
                    }
                  } catch (err: any) {
                    console.error(err);
                    alert("Gagal melakukan sinkronisasi: " + err.message);
                  }
                }}
                onChange={(d) => {
                  setWorkingPendirianData(d);
                }}
                autoSaveIndicator={<span className="text-xs text-slate-500">Mode Embed (Auto-save nonaktif)</span>}
                onSave={async (pendirianData) => {
                  setAddingDoc(true);
                  if (!currentUserEmail) {
                    setAddingDoc(false);
                    return alert('Anda harus login terlebih dahulu!');
                  }
                  
                  const isNew = workingPendirianId === 'new';
                  const id = isNew ? crypto.randomUUID() : workingPendirianId;
                  const finalData = {
                    ...pendirianData,
                    id,
                    updatedAt: new Date().toISOString()
                  };
                  try {
                    await setDoc(doc(db, 'pendirian_projects', id as string), cleanUndefined(finalData));
                    
                    if (isNew) {
                      await ProjectService.addDocument(projectId, {
                        name: `Draft Pendirian PT - ${finalData.namaPt || 'PT Baru'}`,
                        type: 'docx',
                        url: `/pendirian`,
                        refId: id as string,
                        uploadedBy: currentUserEmail
                      });
                    }
                    
                    alert('Data pendirian berhasil disimpan dan dilink ke proyek!');
                    fetchProjectFullDetails();
                    setWorkingPendirianId(id as string);
                    setWorkingPendirianData(finalData);
                  } catch (e: any) {
                    console.error(e);
                    alert("Error: " + e.message);
                  } fillly: {
                    setAddingDoc(false);
                  }
                }}
                onCancel={() => {
                  setWorkMode('default');
                }}
                onDelete={async (id) => {
                  if (confirm('Apakah Anda yakin ingin menghapus data pendirian ini?')) {
                    try {
                      await deleteDoc(doc(db, 'pendirian_projects', id));
                      await ProjectService.deleteDocumentByRefId(projectId, id);
                      fetchProjectFullDetails();
                      setWorkMode('default');
                      alert('Data pendirian berhasil dihapus!');
                    } catch (e: any) {
                      console.error(e);
                      alert(e.message);
                    }
                  }
                }}
                onShowPreview={(d) => {
                  const mapped = {
                    ...d,
                    modalDasar: (d.modalDasarLembar && d.nilaiPerLembar) ? (d.modalDasarLembar * d.nilaiPerLembar) : d.modalDasar,
                    modalDisetorPersen: (d.modalDisetorLembar && d.modalDasarLembar) ? ((d.modalDisetorLembar / d.modalDasarLembar) * 100) : d.modalDisetorPersen,
                  };
                  setPendirianPreviewData(mapped); 
                  setShowPendirianPreview(true); 
                }}
                onExportWord={(d) => { handlePendirianExportWord(d); }}
            />
            {showPendirianPreview && pendirianPreviewData && (
              <PendirianDocumentPreview
                data={pendirianPreviewData}
                onExport={() => handlePendirianExportWord(pendirianPreviewData)}
                onClose={() => setShowPendirianPreview(false)}
                isExporting={isExportingPendirian}
              />
            )}
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 & 2: Main Details & Tasks */}
          <div className="lg:col-span-2 space-y-6">
            {/* Metadata Card */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm">
              <h2 className="text-[14px] font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4">
                Informasi & Metadata Proyek
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-[13px]">
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Klien Registrasi</span>
                  <div className="flex items-center gap-2 text-slate-800">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold">{client ? formatCompanyName(client.companyName, client.clientType) : 'Memuat...'}</span>
                  </div>
                  {client && (
                    <span className="text-xs text-slate-400 block ml-6">
                      {client.domicile || '-'}{client.phoneNumber ? ` | ${client.phoneNumber}` : ''}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Ditugaskan Kepada</span>
                  <div className="flex items-center gap-2 text-slate-800">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{project.assignedTo || 'Unassigned'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Tanggal Dibuat</span>
                  <div className="flex items-center gap-2 text-slate-800">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>
                      {project.createdAt ? new Date(project.createdAt.seconds ? project.createdAt.toDate() : project.createdAt).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      }) : '-'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Status Tahapan Saat Ini</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
                      {project.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {project.metadata?.driveFolderUrl ? (
                  <div className="space-y-1 col-span-1 sm:col-span-2 mt-2">
                    <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Google Drive Proyek (Auto-generated)</span>
                    <a 
                      href={project.metadata.driveFolderUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs rounded-lg border border-blue-200 transition-all shadow-sm group"
                    >
                      <ExternalLink className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      Buka Folder Drive Proyek
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2 col-span-1 sm:col-span-2 mt-2">
                    <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Google Drive Proyek</span>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <button
                        onClick={handleSetupDriveFolder}
                        disabled={isSettingUpDrive}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs rounded-lg transition-all shadow-sm disabled:opacity-50"
                      >
                        {isSettingUpDrive ? (
                          <>
                            <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                            Menyiapkan Folder...
                          </>
                        ) : (
                          <>
                            <FolderPlus className="w-3.5 h-3.5" />
                            Buat / Hubungkan Google Drive
                          </>
                        )}
                      </button>
                      <span className="text-xs text-slate-500">Folder Google Drive belum disiapkan untuk proyek ini. Klik tombol untuk membuatnya secara otomatis.</span>
                    </div>
                  </div>
                )}
              </div>


            </div>

            {/* Rule: Legacy Project Banner & Migration Wizard */}
            {!project.clientSnapshot && !project.changeSnapshot ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-xs space-y-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wide">
                      ⚠️ Proyek Legacy Detect — Snapshot Historis Belum Tersedia
                    </h3>
                    <p className="text-[13px] text-amber-700 mt-1 leading-relaxed">
                      Sistem tidak boleh membuat snapshot historis secara otomatis menggunakan data Master Client saat ini guna melindungi integritas arsip sejarah hukum perusahaan.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/60 p-3 rounded-lg border border-amber-100">
                  <span className="text-xs font-mono text-slate-500 font-semibold">Tindakan Diperlukan:</span>
                  <button
                    onClick={() => {
                      setManualName(client?.companyName || project.title);
                      setManualAddress(client?.fullAddress || '');
                      setManualCapital(client?.targetCapitalBase || 100000000);
                      setShowMigrationModal(true);
                    }}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors animate-pulse"
                  >
                    Mulai Migration Wizard
                  </button>
                </div>
              </div>
            ) : null}

            {/* Rule: Immutable Project Snapshot Section */}
            {(project.clientSnapshot || project.changeSnapshot) ? (
              <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="text-[14px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    <span>Snapshot Hukum Proyek (Arsip Immutable)</span>
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-500 border border-slate-200 rounded-full font-mono font-bold uppercase tracking-wider">
                    Snapshot Active
                  </span>
                </div>

                {project.jobType === 'rups_lb' && project.changeSnapshot ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Before Snapshot */}
                    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                        Struktur Sebelum (Before)
                      </h3>
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">Nama Perusahaan</span>
                          <p className="font-bold text-slate-850 text-[13px]">{project.changeSnapshot.before.companyName}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">Alamat Lengkap</span>
                          <p className="font-medium text-slate-700 text-[12px]">{project.changeSnapshot.before.fullAddress || '-'}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">Modal Dasar</span>
                            <p className="font-bold text-slate-800">Rp {project.changeSnapshot.before.authorizedCapital?.toLocaleString('id-ID') || '0'}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">Modal Disetor</span>
                            <p className="font-bold text-slate-800">Rp {project.changeSnapshot.before.paidUpCapital?.toLocaleString('id-ID') || '0'}</p>
                          </div>
                        </div>
                        {/* Shareholders before */}
                        <div className="pt-2 border-t border-slate-150">
                          <span className="text-slate-450 font-bold text-[10px] uppercase tracking-wider block mb-1">Daftar Pemegang Saham (Before)</span>
                          {project.changeSnapshot.before.shareholders && project.changeSnapshot.before.shareholders.length > 0 ? (
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {project.changeSnapshot.before.shareholders.map((sh, idx) => (
                                <div key={sh.id || idx} className="flex justify-between p-1.5 bg-white border border-slate-100 rounded">
                                  <span className="font-semibold text-slate-700">{sh.name}</span>
                                  <span className="font-mono text-slate-600">{sh.sharesOwned?.toLocaleString('id-ID')} lembar</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-slate-400 italic">Tidak ada data</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* After Snapshot */}
                    <div className="space-y-3 bg-blue-50/40 p-4 rounded-xl border border-blue-100">
                      <h3 className="text-xs font-extrabold text-blue-600 uppercase tracking-wider border-b border-blue-100 pb-1.5">
                        Struktur Sesudah (After)
                      </h3>
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-blue-400 font-semibold text-[10px] uppercase tracking-wider">Nama Perusahaan</span>
                          <p className="font-bold text-slate-850 text-[13px]">{project.changeSnapshot.after.companyName}</p>
                        </div>
                        <div>
                          <span className="text-blue-400 font-semibold text-[10px] uppercase tracking-wider">Alamat Lengkap</span>
                          <p className="font-medium text-slate-700 text-[12px]">{project.changeSnapshot.after.fullAddress || '-'}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <span className="text-blue-400 font-semibold text-[10px] uppercase tracking-wider">Modal Dasar</span>
                            <p className="font-bold text-slate-800">Rp {project.changeSnapshot.after.authorizedCapital?.toLocaleString('id-ID') || '0'}</p>
                          </div>
                          <div>
                            <span className="text-blue-400 font-semibold text-[10px] uppercase tracking-wider">Modal Disetor</span>
                            <p className="font-bold text-slate-800">Rp {project.changeSnapshot.after.paidUpCapital?.toLocaleString('id-ID') || '0'}</p>
                          </div>
                        </div>
                        {/* Shareholders after */}
                        <div className="pt-2 border-t border-blue-100/60">
                          <span className="text-blue-500 font-bold text-[10px] uppercase tracking-wider block mb-1">Daftar Pemegang Saham (After)</span>
                          {project.changeSnapshot.after.shareholders && project.changeSnapshot.after.shareholders.length > 0 ? (
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {project.changeSnapshot.after.shareholders.map((sh, idx) => (
                                <div key={sh.id || idx} className="flex justify-between p-1.5 bg-white border border-blue-100/50 rounded animate-fade-in">
                                  <span className="font-bold text-slate-800">{sh.name}</span>
                                  <span className="font-mono text-slate-600 font-semibold">{sh.sharesOwned?.toLocaleString('id-ID')} lembar</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-slate-400 italic">Tidak ada data</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  project.clientSnapshot && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div>
                          <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">Nama Perusahaan</span>
                          <p className="font-bold text-slate-850 text-[13px]">{project.clientSnapshot.companyName}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">Alamat Lengkap</span>
                          <p className="font-medium text-slate-700">{project.clientSnapshot.fullAddress || '-'}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">Modal Dasar</span>
                            <p className="font-bold text-slate-800">Rp {project.clientSnapshot.authorizedCapital?.toLocaleString('id-ID') || '0'}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">Modal Disetor</span>
                            <p className="font-bold text-slate-800">Rp {project.clientSnapshot.paidUpCapital?.toLocaleString('id-ID') || '0'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider block">Daftar Pemegang Saham</span>
                        {project.clientSnapshot.shareholders && project.clientSnapshot.shareholders.length > 0 ? (
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {project.clientSnapshot.shareholders.map((sh, idx) => (
                              <div key={sh.id || idx} className="flex justify-between p-1.5 bg-white border border-slate-100 rounded">
                                <span className="font-semibold text-slate-700">{sh.name}</span>
                                <span className="font-mono text-slate-600">{sh.sharesOwned?.toLocaleString('id-ID')} lembar</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-400 italic">Tidak ada data pemegang saham</p>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : null}

            {/* Task Checklist Section */}
            {(() => {
              const displayedTasks = getDisplayedTasks();
              const completedCount = displayedTasks.filter((t) => t.status === 'completed').length;
              const totalCount = displayedTasks.filter((t) => t.status !== 'not_required').length;
              
              return (
                <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <h2 className="text-[14px] font-bold text-slate-800 uppercase tracking-wide">
                      Daftar Checklist {isProjectMinuta(project.status) ? 'Minuta' : 'Tugas'} ({completedCount}/{totalCount})
                    </h2>
                  </div>

                  {/* Tasks List */}
                  {displayedTasks.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-[13px]">
                      Belum ada checklist tugas kustom untuk proyek ini.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {displayedTasks.map((task) => (
                        <div
                          key={task.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 border rounded-xl transition-all select-none gap-3 ${
                            task.status === 'completed'
                              ? 'border-emerald-100 bg-emerald-50/10'
                              : task.status === 'not_required'
                              ? 'border-slate-200 bg-slate-50/40 opacity-70'
                              : 'border-slate-150 bg-white hover:bg-slate-50/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {task.status === 'completed' ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                            ) : task.status === 'not_required' ? (
                              <Ban className="w-5 h-5 text-slate-400 shrink-0" />
                            ) : (
                              <div className="w-5 h-5 rounded-md border border-slate-300 shrink-0" />
                            )}
                            <div className="flex flex-col">
                              <span className={`text-[13px] font-semibold ${
                                task.status === 'completed'
                                  ? 'line-through text-slate-500'
                                  : task.status === 'not_required'
                                  ? 'line-through text-slate-400 italic'
                                  : 'text-slate-800'
                              }`}>
                                {task.title}
                              </span>
                              {task.updatedAt && (
                                <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  Terakhir diperbarui: {new Date(task.updatedAt.seconds ? task.updatedAt.toDate() : task.updatedAt).toLocaleDateString('id-ID')}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Status Selector Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                                task.status === 'completed'
                                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                              }`}
                            >
                              Selesai
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateTaskStatus(task.id, 'pending')}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                                task.status === 'pending' || task.status === 'in_progress'
                                  ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                              }`}
                            >
                              Belum
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateTaskStatus(task.id, 'not_required')}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                                task.status === 'not_required'
                                  ? 'bg-slate-500 text-white border-slate-500 shadow-xs'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                              }`}
                            >
                              Tidak Diperlukan
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Quick Task Form */}
                  <form onSubmit={handleAddTask} className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                    <input
                      type="text"
                      required
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder={isProjectMinuta(project.status) ? "Tambah ceklist minuta baru..." : "Tambah ceklist tugas baru..."}
                      className="flex-1 px-3 py-2 text-[13px] bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-lg outline-none transition-all"
                    />
                    <button
                      type="submit"
                      disabled={addingTask}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[13px] rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah</span>
                    </button>
                  </form>
                </div>
              );
            })()}

            {/* Rule: Company Timeline (Legal History Tracker) */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="text-[14px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Riwayat Sejarah Legal Perusahaan (Company Timeline)</span>
              </h2>
              <div className="relative border-l-2 border-blue-100 pl-4 space-y-6 ml-2 text-xs">
                {/* Active/Linked projects as milestones */}
                {[project, ...relatedProjects]
                  .sort((a, b) => new Date(a.createdAt?.seconds ? a.createdAt.toDate() : a.createdAt).getTime() - new Date(b.createdAt?.seconds ? b.createdAt.toDate() : b.createdAt).getTime())
                  .map((p, idx) => {
                    const dateStr = p.createdAt ? new Date(p.createdAt.seconds ? p.createdAt.toDate() : p.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    }) : '-';
                    const isCurrent = p.projectId === projectId;
                    return (
                      <div key={p.projectId || idx} className="relative">
                        {/* Dot indicator */}
                        <div className={`absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full border-2 ${isCurrent ? 'bg-blue-600 border-blue-250 animate-pulse' : 'bg-slate-300 border-white'} shrink-0`} />
                        <div className="space-y-1">
                          <span className="font-mono text-[9px] text-slate-400 font-bold block">{dateStr}</span>
                          <span className={`font-bold text-[13px] ${isCurrent ? 'text-blue-700' : 'text-slate-800'}`}>
                            {p.title} {isCurrent ? '(Proyek Ini)' : ''}
                          </span>
                          <div className="flex gap-2 items-center mt-1 text-[11px]">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-semibold rounded text-[10px] uppercase">
                              {p.jobType.replace('_', ' ')}
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="text-slate-500 font-medium">Status: <strong className="uppercase font-bold text-slate-650">{p.status}</strong></span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Rule: Master Client Version/Revision History */}
            {client && client.versionHistory && client.versionHistory.length > 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-4">
                <h2 className="text-[14px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Jejak Audit Perubahan Master Client (Revision History)</span>
                </h2>
                <div className="space-y-4">
                  {client.versionHistory.map((rev, idx) => (
                    <div key={rev.revisionId || idx} className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs space-y-2">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <span className="font-bold text-slate-850">{rev.reason}</span>
                        <span className="font-mono text-[10px] text-slate-400 font-bold bg-white px-2 py-0.5 rounded border border-slate-100">
                          REVISION: {rev.revisionId?.substring(0, 8)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-500">
                        <div>
                          <span>Tanggal Persetujuan:</span>
                          <p className="font-medium text-slate-700">{new Date(rev.changedAt).toLocaleString('id-ID')}</p>
                        </div>
                        <div>
                          <span>Disetujui Oleh:</span>
                          <p className="font-medium text-slate-700">{rev.changedBy}</p>
                        </div>
                      </div>
                      {rev.changes && rev.changes.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                          <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block">Rincian Perubahan Hukum:</span>
                          <div className="space-y-1 font-mono text-[11px]">
                            {rev.changes.map((ch, cidx) => (
                              <div key={cidx} className="flex flex-col bg-white p-2 rounded border border-slate-100 gap-1">
                                <span className="font-bold text-blue-600">{ch.field}:</span>
                                <div className="flex items-center gap-2 flex-wrap text-xs">
                                  <span className="text-red-500 line-through bg-red-50 px-1 rounded">{String(ch.before || 'KOSONG')}</span>
                                  <ChevronRight className="w-3 h-3 text-slate-400 animate-pulse" />
                                  <span className="text-emerald-600 font-bold bg-emerald-50 px-1 rounded">{String(ch.after || 'KOSONG')}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Rule: Related Projects Section */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="text-[14px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <Briefcase className="w-4 h-4 text-blue-600" />
                <span>Proyek Terkait Klien Ini ({relatedProjects.length})</span>
              </h2>
              {relatedProjects.length === 0 ? (
                <p className="text-slate-450 text-xs italic">Tidak ada proyek terkait lainnya untuk klien ini.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {relatedProjects.map((p) => (
                    <div key={p.projectId} className="p-3.5 bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-xl transition-all space-y-1.5 shadow-2xs">
                      <span className="font-bold text-slate-800 block text-[13px] hover:text-blue-600 transition-colors">
                        {p.title}
                      </span>
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="bg-white px-2 py-0.5 border border-slate-150 rounded font-semibold text-[10px] uppercase">
                          {p.jobType.replace('_', ' ')}
                        </span>
                        <span className="uppercase font-bold text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Profil Personil PT (PMPJ/SRA) */}
            <PartiesManager 
              parties={project.parties || []} 
              onSaveParties={handleSaveParties} 
              onPullFromForm={handlePullFromForm}
              onPushToForm={handlePushPartiesToForm}
            />

            {/* UPLOAD DOKUMEN PROYEK (New Feature) */}
            <ProjectDocumentUpload project={project} currentUser={currentUser} key={documentUploadKey} />
          </div>

          {/* Column 3: Transition Engine Guard & Chronological Timeline */}
          <div className="space-y-6">
            {/* If in Minuta phase, show Minuta Notes AND Deed Form; otherwise show Transisi Status Guard */}
            {isProjectMinuta(project.status) ? (
              <>
                {/* Catatan Proyek Minuta */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h2 className="text-[14px] font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-500" />
                      <span>Catatan Proyek Minuta</span>
                    </h2>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">
                      Gunakan catatan ini untuk mendokumentasikan detail khusus, berkas pendukung, atau instruksi jahit/penataan minuta akta ini.
                    </p>
                    <textarea
                      value={localMinutaNotes}
                      onChange={(e) => setLocalMinutaNotes(e.target.value)}
                      placeholder="Tulis catatan penting di sini (misal: Lokasi penempatan berkas, status jilid, kelengkapan berkas fisik)..."
                      rows={4}
                      className="w-full p-3 text-[13px] bg-slate-50 border border-slate-200 rounded-lg outline-none transition-all focus:bg-white focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveMinutaNotes}
                        disabled={savingNotes}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-all flex items-center gap-2"
                      >
                        {savingNotes ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Menyimpan...</span>
                          </>
                        ) : (
                          <span>Simpan Catatan Minuta</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Form Akta/Deed di Fase Minuta (Koreksi / Lengkapi Data Akta) */}
                {['rups_lb', 'sirkuler_rupslb', 'pendirian_pt'].includes(project?.jobType || '') && (
                  <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-4">
                    <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                      <h2 className="text-[14px] font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span>KOREKSI / LENGKAPI DATA AKTA</span>
                      </h2>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        {project?.title}
                      </span>
                    </div>

                    {renderDeedFields()}

                    <button
                      type="button"
                      onClick={handleSaveDeedInfoOnly}
                      disabled={savingDeedInfo}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-[13px] rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {savingDeedInfo ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Menyimpan Data Akta...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Simpan Data Akta</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* Status Transition Engine Guard Form */
              <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm">
                <h2 className="text-[14px] font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4">
                  Transisi Status Guard
                </h2>

                <form onSubmit={handleStatusTransition} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Pilih Tahap Tujuan</label>
                    <select
                      value={transitionStatus}
                      onChange={(e) => setTransitionStatus(e.target.value)}
                      className="w-full px-3 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-lg outline-none transition-all focus:bg-white focus:ring-1 focus:ring-blue-500"
                    >
                      {(workflow?.steps || [])
                        .filter((step) => {
                          if (isProjectMinuta(project.status)) return true;
                          if (!transitionStrict) return true;
                          const currentIndex = workflow?.steps.indexOf(project.status) ?? -1;
                          const stepIndex = workflow?.steps.indexOf(step) ?? -1;
                          return currentIndex === -1 || stepIndex === -1 || Math.abs(stepIndex - currentIndex) <= 1;
                        })
                        .map((step) => (
                          <option key={step} value={step}>
                            {step.toUpperCase()} {step === project.status ? '(Aktif Saat Ini)' : ''}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Catatan Transisi (Opsional)</label>
                    <textarea
                      value={transitionComment}
                      onChange={(e) => setTransitionComment(e.target.value)}
                      placeholder="Masukkan alasan transisi... atau tambahkan catatan mandiri pada kotak Catatan Proyek di bawah jika status tidak berubah"
                      rows={2}
                      className="w-full px-3 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-lg outline-none transition-all focus:bg-white focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {!isProjectMinuta(project.status) && (
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">Sequential Guard (Strict)</span>
                        <span className="text-[10px] text-slate-400">Hanya izinkan transisi berurutan</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={transitionStrict}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setTransitionStrict(checked);
                          if (checked && workflow && workflow.steps) {
                            const currentIndex = workflow.steps.indexOf(project.status);
                            const targetIndex = workflow.steps.indexOf(transitionStatus);
                            if (currentIndex !== -1 && targetIndex !== -1 && Math.abs(targetIndex - currentIndex) > 1) {
                              if (currentIndex + 1 < workflow.steps.length) {
                                setTransitionStatus(workflow.steps[currentIndex + 1]);
                              } else {
                                setTransitionStatus(project.status);
                              }
                            }
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Conditionally render Deed / Akta details form when transitioning to Completed state */}
                  {['rups_lb', 'sirkuler_rupslb', 'pendirian_pt'].includes(project?.jobType || '') && 
                    (transitionStatus.toLowerCase().includes('selesai') || 
                     transitionStatus.toLowerCase() === 'sp terbit' ||
                     transitionStatus.toLowerCase() === 'sp/sk terbit' ||
                     transitionStatus.toLowerCase() === 'nib terbit') && (
                    <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4 animate-fadeIn shadow-sm">
                      {/* Header */}
                      <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          {project?.jobType === 'pendirian_pt' 
                            ? 'AKTA PENDIRIAN' 
                            : `AKTA PERUBAHAN ${(client?.amendmentDeeds?.length || 0) + 1}`}
                        </h3>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          {project?.title}
                        </span>
                      </div>
                      
                      {renderDeedFields()}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={transitioning || transitionStatus === project.status}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[13px] rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {transitioning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Terapkan Transisi</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Tambah Catatan Proyek (Separate notes entry) */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="text-[14px] font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <span>Tambah Catatan Proyek (Tanpa Ubah Status)</span>
              </h2>
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Tambahkan catatan perkembangan atau catatan penting untuk proyek ini tanpa harus mengubah status.
                </p>
                <textarea
                  value={projectNote}
                  onChange={(e) => setProjectNote(e.target.value)}
                  placeholder="Ketik catatan di sini (misal: Menunggu konfirmasi akta, dokumen sedang diproses, dsb)..."
                  rows={3}
                  className="w-full px-3 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-lg outline-none transition-all focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveProjectNote}
                    disabled={savingProjectNote}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition-all flex items-center gap-2"
                  >
                    {savingProjectNote ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Simpan Catatan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Chronological Vertical Timeline Log */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm">
              <h2 className="text-[14px] font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4">
                Riwayat Jejak Proyek ({timelines.length})
              </h2>

              {timelines.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-[13px]">
                  Belum ada catatan riwayat aktivitas.
                </div>
              ) : (
                <div className="relative border-l border-slate-200 pl-4 space-y-5 ml-1.5">
                  {timelines.map((timeline) => (
                    <div key={timeline.id} className="relative">
                      {/* Timeline Dot Indicator */}
                      <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-600 border border-white" />
                      
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          {timeline.createdAt ? new Date(timeline.createdAt.seconds ? timeline.createdAt.toDate() : timeline.createdAt).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : ''}
                        </span>
                        <h4 className="text-[13px] font-bold text-slate-800 leading-tight">
                          {timeline.title}
                        </h4>
                        <p className="text-xs text-slate-500 leading-normal">
                          {timeline.description}
                        </p>
                        <span className="text-[10px] text-slate-400 font-semibold block">
                          Oleh: {timeline.createdBy}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Register Document Metadata Dialog */}
        {isDocModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-slideUp">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-[15px]">Upload Dokumen Administrasi</h3>
                <button
                  onClick={() => {
                    setIsDocModalOpen(false);
                    setSelectedFile(null);
                  }}
                  className="p-1 text-slate-400 rounded hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddDocument} className="p-6 space-y-4">
                {/* Drag and Drop Zone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">File Dokumen (PDF, JPG, PNG, DOCX, dll)</label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragActive(true);
                    }}
                    onDragLeave={() => setIsDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragActive(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        const file = e.dataTransfer.files[0];
                        setSelectedFile(file);
                        // Auto-populate document name with file name (without extension) if empty
                        if (!docForm.name.trim()) {
                          const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                          setDocForm(prev => ({ ...prev, name: baseName }));
                        }
                      }
                    }}
                    onClick={() => {
                      document.getElementById('file-picker')?.click();
                    }}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      isDragActive 
                        ? 'border-blue-500 bg-blue-50/50' 
                        : selectedFile 
                        ? 'border-emerald-500 bg-emerald-50/10' 
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <input
                      id="file-picker"
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setSelectedFile(file);
                          // Auto-populate document name with file name (without extension) if empty
                          if (!docForm.name.trim()) {
                            const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                            setDocForm(prev => ({ ...prev, name: baseName }));
                          }
                        }
                      }}
                    />
                    
                    {selectedFile ? (
                      <div className="space-y-1">
                        <div className="mx-auto w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
                          <File className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-emerald-800 line-clamp-1">{selectedFile.name}</p>
                        <p className="text-[10px] text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Klik untuk ganti file</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                          <UploadCloud className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-slate-700">Seret file ke sini atau Klik untuk memilih</p>
                        <p className="text-[10px] text-slate-400">Mendukung format PDF, JPG, PNG, DOCX, dll.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Nama / Judul Dokumen</label>
                  <input
                    type="text"
                    required
                    value={docForm.name}
                    onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                    placeholder="Contoh: Akta Pendirian Final, SK Kemenkumham, KTP Direktur"
                    className="w-full px-3 py-2.5 text-[13px] bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-lg outline-none transition-all"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDocModalOpen(false);
                      setSelectedFile(null);
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold rounded-lg text-[13px] transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={addingDoc || !selectedFile}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-[13px] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {addingDoc ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Unggah Dokumen</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Rule: Explicit Migration Wizard Modal */}
        {showMigrationModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-slideUp">
              <div className="bg-amber-50 px-6 py-4 border-b border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-[15px] uppercase tracking-wide">Migration Wizard - Proyek Legacy</h3>
                </div>
                <button
                  onClick={() => setShowMigrationModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-amber-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="text-[13px] text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <strong className="text-slate-800">Prinsip Integritas Histori Hukum:</strong>
                  <p className="mt-1">
                    Anda sedang menginisialisasi snapshot proyek lama secara manual. Pilih salah satu metode pemetaan legal di bawah ini untuk menghasilkan arsip snapshot proyek yang sah.
                  </p>
                </div>

                {/* Source Selectors */}
                <div className="space-y-3">
                  <label className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block">Sumber Data Snapshot</label>
                  <div className="grid grid-cols-1 gap-2">
                    {/* Database Lama */}
                    <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${migrationSource === 'legacy_db' ? 'bg-blue-50/50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                      <input
                        type="radio"
                        name="migrationSource"
                        value="legacy_db"
                        checked={migrationSource === 'legacy_db'}
                        onChange={() => setMigrationSource('legacy_db')}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 block">Database Dokumen Proyek Lama (Sangat Direkomendasikan)</span>
                        <span className="text-slate-500">Mengekstrak data legal historis langsung dari modul form proyek yang diarsipkan (misal: RUPS LB / Pendirian PT).</span>
                      </div>
                    </label>

                    {/* Master Client */}
                    <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${migrationSource === 'master_client' ? 'bg-blue-50/50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                      <input
                        type="radio"
                        name="migrationSource"
                        value="master_client"
                        checked={migrationSource === 'master_client'}
                        onChange={() => setMigrationSource('master_client')}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 block">Profil Master Client Saat Ini (Pilihan Terakhir)</span>
                        <span className="text-slate-500">Gunakan data Master Client saat ini sebagai representasi sejarah hukum. Gunakan hanya jika arsip lain tidak tersedia.</span>
                      </div>
                    </label>

                    {/* Formulir Manual */}
                    <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${migrationSource === 'manual' ? 'bg-blue-50/50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                      <input
                        type="radio"
                        name="migrationSource"
                        value="manual"
                        checked={migrationSource === 'manual'}
                        onChange={() => setMigrationSource('manual')}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 block">Formulir Input Manual (Arsip Akta DOCX/PDF)</span>
                        <span className="text-slate-500">Ketik rincian legal snapshot secara manual dari salinan fisik akta notaril.</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Conditional Manual Inputs */}
                {migrationSource === 'manual' && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3 text-xs animate-fadeIn">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-650 uppercase text-[10px]">Nama Perusahaan</label>
                      <input
                        type="text"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        placeholder="Masukkan nama PT/CV sesuai akta..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-650 uppercase text-[10px]">Alamat Lengkap</label>
                      <input
                        type="text"
                        value={manualAddress}
                        onChange={(e) => setManualAddress(e.target.value)}
                        placeholder="Alamat lengkap perusahaan..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-650 uppercase text-[10px]">Modal Dasar (IDR)</label>
                      <input
                        type="number"
                        value={manualCapital}
                        onChange={(e) => setManualCapital(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowMigrationModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleRunMigration}
                    disabled={isMigrating}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isMigrating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Mengekstrak...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Eksekusi Migrasi Snapshot</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Layar Preview Perubahan Data Klien — muncul sebelum commit ke koleksi profiles/company_profiles */}
        {syncPreviewData && (
          <SyncPreviewModal
            categories={syncPreviewData.categories}
            warnings={syncPreviewData.warnings}
            onConfirm={handleSyncPreviewConfirm}
            onCancel={handleSyncPreviewCancel}
          />
        )}
      </div>
    </div>
  );
}

// Simple close helper
function X({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
  );
}
