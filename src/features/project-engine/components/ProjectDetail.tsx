import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project, DocumentReference, ClientSnapshot, ProjectChangeSnapshot, Party, PPATDocumentItem, PPATData } from '../../../domain/project/Project';
import { ProjectService } from '../../../services/ProjectService';
import { PartiesManager } from './PartiesManager';
import { CompanyProfile, UserProfile, AmendmentDeed, SkSpDocument, CompanyRevision } from '../../../../types';
import { INITIAL_STATE } from '../../../domain/company/initialCompanyData';
import { Workflow } from '../../../domain/project/Workflow';
import { StatusEngine } from '../../../domain/project/ProjectStatus';
import { WorkflowService } from '../../../services/WorkflowService';
import { Timeline } from '../../../domain/project/Timeline';
import { Task } from '../../../domain/project/Task';
import { db, cleanUndefined } from '../../../lib/firebase';
import { collection, getDocs, setDoc, doc, deleteDoc, getDoc, query, where, updateDoc, getDocsFromCache } from 'firebase/firestore';
import DraftAktaPendirian from '../../../DraftAktaPendirian';
import DraftAktaPendirianCV from '../../../DraftAktaPendirianCV';
import PendirianDocumentPreview from '../../../PendirianDocumentPreview';
import { syncToUtama, getDeedTitle, formatAppearersForPendirian, formatAppearersForPendirianCV } from '../../../lib/syncUtama';
import LeaseAgreementDraft from '../../lease-agreement/components/LeaseAgreementDraft';
import { mapCompanyProfileToPendirian } from '../../../domain/company/mappers/companyProfileToPendirian';
import { mapCompanyProfileToCV } from '../../../domain/company/mappers/companyProfileToCV';
import { generatePendirianCVDocx } from '../../../lib/generatePendirianCVDocx';
import { mapPartiesToShareholdersAndManagement } from '../../../domain/project/mappers/partyToShareholder';
import { ProjectDocumentUpload } from './ProjectDocumentUpload';
import { SyncPreviewModal } from './SyncPreviewModal';
import { formatCompanyName } from '../../../lib/formatter';
import { AuthService } from '../../../services/AuthService';
import { getApiUrl } from '../../../lib/api';
import { DocumentVersioningService } from '../../../services/DocumentVersioningService';
import { compareCompanyDocumentDiff } from '../../../lib/diffUtils';
import { PPATWorkflowStepsBar } from './ppat/PPATWorkflowStepsBar';
import { PPATDataManager } from './ppat/PPATDataManager';
import { PPATDocumentGenerator } from './ppat/PPATDocumentGenerator';
import { PPATProjectDocumentsSection } from './ppat/PPATProjectDocumentsSection';
import { PPATDocumentEditor } from './ppat/PPATDocumentEditor';
import { PPATDocTypeConfig } from './ppat/ppatDocTypes';
import { isProjectFinal } from '../../../services/ClientProjectSyncService';
import { ToastNotification, ToastState } from '../../../components/common/ToastNotification';
import { RUPS_LB_AGENDAS } from '../../../constants/appConstants';

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
  ChevronUp,
  Send,
  Trash2,
  Sparkles,
  UploadCloud,
  RefreshCw,
  Ban,
  FolderPlus,
  Landmark,
  Edit3,
  Building2,
  Tag,
  Shield,
  Folder,
  Check,
  LayoutDashboard,
  Users,
  Settings,
  Edit,
  Upload,
  MoreVertical,
  Phone
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

const mapToStandardType = (val: string): string => {
  if (!val) return 'SP_DATA_PERSEROAN';
  const s = val.toLowerCase();
  if (s === 'sk_pendirian' || s.includes('sk (pendirian') || s.includes('sk pendirian')) return 'SK_PENDIRIAN';
  if (s === 'sk_perubahan' || s.includes('sk (persetujuan') || s.includes('sk perubahan')) return 'SK_PERUBAHAN';
  if (s === 'sp_anggaran_dasar' || s.includes('sp (perubahan anggaran') || s.includes('sp anggaran dasar')) return 'SP_ANGGARAN_DASAR';
  if (s === 'sp_data_perseroan' || s.includes('sp (perubahan data') || s.includes('sp perubahan data')) return 'SP_DATA_PERSEROAN';
  if (s === 'sk' || s.includes('sk (')) return 'SK';
  if (s === 'sp' || s.includes('sp (')) return 'SP';
  return val;
};

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
  currentUser: UserProfile;
}

export default function ProjectDetail({ projectId, onBack, currentUser }: ProjectDetailProps) {
  const navigate = useNavigate();
  const currentUserEmail = currentUser.email;
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<CompanyProfile | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [expandedTimelineIds, setExpandedTimelineIds] = useState<Record<string, boolean>>({});
  const [tasks, setTasks] = useState<Task[]>([]);

  const toggleExpandTimeline = (id: string) => {
    setExpandedTimelineIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  const [documents, setDocuments] = useState<DocumentReference[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentUploadKey, setDocumentUploadKey] = useState(0);

  // Consolidated all project files (both uploaded and generated)
  const allProjectFiles = useMemo(() => {
    const list: {
      id: string;
      title: string;
      subtitle?: string;
      url?: string;
      type?: string;
      uploadedAt?: string;
      isDrive?: boolean;
      driveFileId?: string;
    }[] = [];

    const seenKeys = new Set<string>();

    // 1. Files uploaded via ProjectDocumentUpload (project_uploaded_documents)
    uploadedFiles.forEach(uf => {
      const key = uf.driveFileId || uf.id;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        list.push({
          id: uf.id,
          title: uf.title || uf.fileName,
          subtitle: uf.fileName !== uf.title ? uf.fileName : (uf.documentCategory?.replace(/_/g, ' ') || uf.type || 'Dokumen'),
          url: uf.driveFileId ? `https://drive.google.com/file/d/${uf.driveFileId}/view` : undefined,
          type: uf.mimeType || 'file',
          uploadedAt: uf.uploadedAt,
          isDrive: !!uf.driveFileId,
          driveFileId: uf.driveFileId
        });
      }
    });

    // 2. Documents recorded on project (subcollection documents)
    documents.forEach(d => {
      const key = d.id || d.name;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        list.push({
          id: d.id || key,
          title: d.name,
          subtitle: d.type?.toUpperCase() || 'Draft Dokumen',
          url: d.url,
          type: d.type,
          uploadedAt: d.uploadedAt ? (typeof d.uploadedAt === 'string' ? d.uploadedAt : (d.uploadedAt as any).toDate?.()?.toISOString?.()) : undefined
        });
      }
    });

    // 3. PPAT documents if applicable
    if (project?.ppatData?.documents) {
      project.ppatData.documents.forEach(pDoc => {
        if (!seenKeys.has(pDoc.id)) {
          seenKeys.add(pDoc.id);
          list.push({
            id: pDoc.id,
            title: pDoc.title,
            subtitle: `Dokumen PPAT • ${pDoc.category || 'Akta'}`,
            type: 'docx',
            uploadedAt: pDoc.updatedAt || pDoc.createdAt
          });
        }
      });
    }

    return list;
  }, [uploadedFiles, documents, project?.ppatData?.documents]);

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

  const [toast, setToast] = useState<ToastState | null>(null);

  // Agenda Perubahan RUPS LB States
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
  const [selectedAgendasList, setSelectedAgendasList] = useState<string[]>([]);
  const [customAgendaInput, setCustomAgendaInput] = useState('');
  const [savingAgendas, setSavingAgendas] = useState(false);

  // Modern UI Tab & Quick Action States
  const [activeDetailTab, setActiveDetailTab] = useState<
    'ringkasan' | 'tugas' | 'dokumen' | 'klien' | 'timeline' | 'catatan' | 'keuangan' | 'pengaturan'
  >('ringkasan');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isInfoStatusDropdownOpen, setIsInfoStatusDropdownOpen] = useState(false);
  const [isAssignStaffOpen, setIsAssignStaffOpen] = useState(false);
  const [isSetTargetOpen, setIsSetTargetOpen] = useState(false);
  const [newTargetDate, setNewTargetDate] = useState('');
  const [selectedStaffToAssign, setSelectedStaffToAssign] = useState('');
  const [staffList, setStaffList] = useState<{ uid: string; name: string }[]>([]);

  const [isEditPicModalOpen, setIsEditPicModalOpen] = useState(false);
  const [picTitleInput, setPicTitleInput] = useState('Bapak');
  const [picNameInput, setPicNameInput] = useState('');
  const [picPhoneInput, setPicPhoneInput] = useState('');
  const [savingPic, setSavingPic] = useState(false);

  const openEditPicModal = () => {
    const currentTitle = project?.picTitle || project?.clientSnapshot?.picTitle || (client as any)?.picTitle || 'Bapak';
    const currentName = project?.picName || project?.clientPic || project?.clientSnapshot?.picName || (client as any)?.picName || (client as any)?.contactPerson || '';
    const currentPhone = project?.picPhone || project?.clientContact || project?.clientSnapshot?.picPhone || project?.clientSnapshot?.phoneNumber || (client as any)?.picPhone || (client as any)?.phoneNumber || '';
    setPicTitleInput(currentTitle);
    setPicNameInput(currentName);
    setPicPhoneInput(currentPhone);
    setIsEditPicModalOpen(true);
  };

  const handleSavePic = async () => {
    if (!project) return;
    setSavingPic(true);
    try {
      await ProjectService.updateProjectPic(project.projectId, {
        picTitle: picTitleInput,
        picName: picNameInput,
        picPhone: picPhoneInput
      });

      setProject(prev => {
        if (!prev) return null;
        const baseSnapshot = prev.clientSnapshot || {
          id: prev.clientId || projectId,
          companyName: prev.title,
          fullAddress: '',
          authorizedCapital: 0,
          paidUpCapital: 0,
          shareholders: []
        };
        const updatedSnapshot: ClientSnapshot = {
          ...baseSnapshot,
          picTitle: picTitleInput,
          picName: picNameInput,
          picPhone: picPhoneInput,
          phoneNumber: picPhoneInput || baseSnapshot.phoneNumber || ''
        };
        return {
          ...prev,
          picTitle: picTitleInput,
          picName: picNameInput,
          picPhone: picPhoneInput,
          clientPic: picNameInput,
          clientContact: picPhoneInput,
          clientSnapshot: updatedSnapshot
        };
      });

      setIsEditPicModalOpen(false);
      setToast({ type: 'success', message: 'Data PIC berhasil disimpan!' });
    } catch (err: any) {
      console.error(err);
      setToast({ type: 'error', message: 'Gagal memperbarui data PIC: ' + (err.message || 'Error') });
    } finally {
      setSavingPic(false);
    }
  };

  useEffect(() => {
    const unsub = ProjectService.listenToUserProfiles(
      (profiles) => setStaffList(profiles),
      (err) => console.warn('[ProjectDetail] listenToUserProfiles error:', err)
    );
    return () => unsub();
  }, []);

  const handleAssignStaff = async (staffName: string) => {
    if (!project) return;
    try {
      await updateDoc(doc(db, 'projects', projectId), {
        assignedTo: staffName,
        updatedAt: new Date()
      });
      setProject(prev => prev ? ({ ...prev, assignedTo: staffName }) : null);
      setIsAssignStaffOpen(false);
      setToast({ message: `Berhasil menugaskan proyek kepada ${staffName}`, type: 'success' });
    } catch (e) {
      console.error(e);
      setToast({ message: 'Gagal menetapkan penanggung jawab', type: 'error' });
    }
  };

  const handleSetTargetDate = async (targetDateVal: string) => {
    if (!project) return;
    try {
      await updateDoc(doc(db, 'projects', projectId), {
        targetDate: targetDateVal,
        updatedAt: new Date()
      });
      setProject(prev => prev ? ({ ...prev, targetDate: targetDateVal } as any) : null);
      setIsSetTargetOpen(false);
      setToast({ message: 'Berhasil memperbarui target selesai', type: 'success' });
    } catch (e) {
      console.error(e);
      setToast({ message: 'Gagal menyetel target selesai', type: 'error' });
    }
  };

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatusToChange, setTargetStatusToChange] = useState('');
  const [statusChangeNote, setStatusChangeNote] = useState('');

  const openStatusChangeModal = (targetStep: string) => {
    setIsStatusDropdownOpen(false);
    setIsInfoStatusDropdownOpen(false);
    setTargetStatusToChange(targetStep);
    setStatusChangeNote('');
    setIsStatusModalOpen(true);
  };

  const handleQuickStatusChange = (targetStep: string) => {
    openStatusChangeModal(targetStep);
  };

  const handleConfirmStatusChange = async (targetStepParam?: string, noteParam?: string) => {
    if (!project) return;
    const finalStep = targetStepParam || targetStatusToChange;
    if (!finalStep) return;

    if (StatusEngine.normalizeStep(finalStep) === StatusEngine.normalizeStep(project.status)) {
      setToast({ type: 'info', message: 'Status yang dipilih sama dengan status saat ini.' });
      setIsStatusModalOpen(false);
      return;
    }

    const finalNote = (noteParam !== undefined ? noteParam : statusChangeNote).trim();
    const commentToSave = finalNote || `Status proyek beralih dari '${project.status}' menuju '${finalStep}'.`;

    const isCompletedStatus = 
      finalStep.toLowerCase().includes('selesai') || 
      finalStep.toLowerCase() === 'sp terbit' || 
      finalStep.toLowerCase() === 'sp/sk terbit' || 
      finalStep.toLowerCase() === 'nib terbit';
    const hasDeedForm = ['rups_lb', 'sirkuler_rupslb', 'pendirian_pt'].includes(project?.jobType || '');

    if (isCompletedStatus && hasDeedForm) {
      if (!deedNumber.trim() || !deedDate || !notaryName.trim() || !notaryLocation.trim()) {
        alert('Harap lengkapi Nomor Akta, Tanggal Akta, Nama Notaris, dan Kedudukan Notaris sebelum menyelesaikan proyek.');
        return;
      }
    }

    setTransitioning(true);
    try {
      if (isCompletedStatus && hasDeedForm) {
        await syncDeedInfoAndClientProfile();
      }

      await ProjectService.updateStatus(
        project.projectId,
        finalStep,
        currentUserEmail || 'system',
        commentToSave,
        false
      );

      // If user typed a custom note, record a distinct timeline entry for it
      if (finalNote) {
        try {
          await ProjectService.addTimeline(project.projectId, {
            status: finalStep,
            title: `Catatan Status: ${finalStep.toUpperCase()}`,
            description: finalNote,
            createdBy: currentUserEmail || 'staff_notaris'
          });
        } catch (tlErr) {
          console.warn("Could not save additional note timeline:", tlErr);
        }
      }

      setProject(prev => prev ? ({ ...prev, status: finalStep, currentStep: finalStep }) : null);
      setIsStatusModalOpen(false);
      setStatusChangeNote('');
      setToast({
        type: 'success',
        message: `Status berhasil diubah ke ${finalStep.toUpperCase()}`
      });
      await fetchProjectFullDetails();
    } catch (err: any) {
      if (err?.message === 'SYNC_CANCELLED_BY_USER') {
        return;
      }
      setToast({
        type: 'error',
        message: err.message || 'Gagal mengubah status proyek'
      });
    } finally {
      setTransitioning(false);
    }
  };

  // Sync initial agendas when project loads
  useEffect(() => {
    if (project) {
      const raw: string[] = project.changeAgendas || project.metadata?.changeAgendas || project.metadata?.agendas || [];
      const initialIds: string[] = [];
      let customText = '';

      raw.forEach(item => {
        if (item.startsWith('Lainnya: ')) {
          initialIds.push('lainnya');
          customText = item.replace('Lainnya: ', '');
        } else {
          const matched = RUPS_LB_AGENDAS.find(a => a.id === item || a.label === item || a.shortLabel === item);
          if (matched) {
            initialIds.push(matched.id);
          } else {
            initialIds.push(item);
          }
        }
      });
      setSelectedAgendasList(initialIds);
      setCustomAgendaInput(customText);
    }
  }, [project?.projectId, project?.changeAgendas, project?.metadata?.changeAgendas, project?.metadata?.agendas]);

  const handleSaveAgendas = async () => {
    if (!project) return;
    setSavingAgendas(true);
    try {
      const finalAgendas: string[] = [];
      selectedAgendasList.forEach(aId => {
        if (aId === 'lainnya') {
          if (customAgendaInput.trim()) {
            finalAgendas.push(`Lainnya: ${customAgendaInput.trim()}`);
          } else {
            finalAgendas.push('Agenda Perubahan Lainnya');
          }
        } else {
          const matched = RUPS_LB_AGENDAS.find(a => a.id === aId);
          finalAgendas.push(matched ? matched.label : aId);
        }
      });

      const updatedMeetingSubject = finalAgendas.join(', ') || 'Perubahan Data Perseroan';

      await ProjectService.updateProject(project.projectId, {
        changeAgendas: finalAgendas,
        meetingSubject: updatedMeetingSubject,
        metadata: {
          ...(project.metadata || {}),
          changeAgendas: finalAgendas,
          agendas: finalAgendas
        }
      });

      setProject(prev => prev ? {
        ...prev,
        changeAgendas: finalAgendas,
        meetingSubject: updatedMeetingSubject,
        metadata: {
          ...(prev.metadata || {}),
          changeAgendas: finalAgendas,
          agendas: finalAgendas
        }
      } : null);

      setIsAgendaModalOpen(false);
      setToast({ type: 'success', message: 'Agenda Perubahan RUPS LB berhasil disimpan!' });
    } catch (err: any) {
      console.error(err);
      setToast({ type: 'error', message: 'Gagal memperbarui Agenda Perubahan: ' + (err.message || 'Error') });
    } finally {
      setSavingAgendas(false);
    }
  };

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
  const [workMode, setWorkMode] = useState<'default' | 'pendirian' | 'pendirian_cv' | 'sewa_menyewa' | 'ppat_base_data' | 'ppat_doc_editor'>('default');
  const [activePPATDoc, setActivePPATDoc] = useState<PPATDocumentItem | null>(null);
  const [isPPATSelectDocOpen, setIsPPATSelectDocOpen] = useState(false);

  const handleSavePPATDocument = async (savedDoc: PPATDocumentItem, updatedPPATData: PPATData) => {
    if (!project) return;
    const targetProjectId = project.projectId || projectId;
    if (!targetProjectId) {
      alert('ID Proyek tidak valid.');
      return;
    }
    try {
      // 1. Ambil data project terbaru dari collection office_projects
      const projectRef = doc(db, 'office_projects', targetProjectId);
      const projectSnap = await getDoc(projectRef);
      if (!projectSnap.exists()) {
        throw new Error(`Dokumen proyek (${targetProjectId}) tidak ditemukan di database office_projects.`);
      }

      const remoteData = projectSnap.data() as any;
      const currentPPATData: PPATData = remoteData?.ppatData || project.ppatData || updatedPPATData || {};

      // 2. Ambil daftar dokumen terkini
      const existingDocs: PPATDocumentItem[] = currentPPATData.documents || updatedPPATData.documents || project.ppatData?.documents || [];
      const docIndex = existingDocs.findIndex(d => d.id === savedDoc.id);
      let newDocs: PPATDocumentItem[];
      if (docIndex >= 0) {
        // 3. Jika sudah ada -> update dokumen tersebut
        newDocs = [...existingDocs];
        newDocs[docIndex] = savedDoc;
      } else {
        // 4. Jika belum ada -> tambahkan dokumen baru di awal
        newDocs = [savedDoc, ...existingDocs];
      }

      // Pastikan tidak ada duplikasi ID dokumen
      const seenIds = new Set<string>();
      const dedupedDocs: PPATDocumentItem[] = [];
      for (const d of newDocs) {
        if (!seenIds.has(d.id)) {
          seenIds.add(d.id);
          dedupedDocs.push(d);
        }
      }

      const finalPPATData: PPATData = {
        ...currentPPATData,
        ...updatedPPATData,
        documents: dedupedDocs,
        updatedAt: new Date().toISOString()
      };

      const cleanedData = cleanUndefined(finalPPATData);

      // 5. Simpan ke office_projects/{projectId} pada field ppatData
      await setDoc(projectRef, {
        ppatData: cleanedData,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Catat timeline
      try {
        await ProjectService.addTimeline(targetProjectId, {
          status: project.status,
          title: `Dokumen ${savedDoc.title} Disimpan`,
          description: `Dokumen PPAT "${savedDoc.title}" (${savedDoc.status.toUpperCase()}) berhasil disimpan oleh ${currentUser.name || currentUser.email}`,
          createdBy: currentUser.email
        });
      } catch (tlErr) {
        console.warn('Failed to add timeline:', tlErr);
      }

      // 6. Update local state project sehingga PPATProjectDocumentsSection langsung menampilkan dokumen baru
      const updatedProject: Project = {
        ...project,
        ppatData: finalPPATData,
        updatedAt: new Date().toISOString()
      };
      setProject(updatedProject);
      setActivePPATDoc(null);
      setWorkMode('default');
    } catch (err: any) {
      console.error('Error saving PPAT document:', err);
      alert('Gagal menyimpan dokumen: ' + (err.message || err));
      throw err;
    }
  };

  const handleDeletePPATDocument = async (docId: string) => {
    if (!project) return;
    const targetProjectId = project.projectId || projectId;
    if (!targetProjectId) {
      alert('ID Proyek tidak valid.');
      return;
    }
    if (!confirm('Apakah Anda yakin ingin menghapus dokumen ini dari proyek?')) return;
    try {
      const projectRef = doc(db, 'office_projects', targetProjectId);
      const projectSnap = await getDoc(projectRef);
      if (!projectSnap.exists()) {
        alert(`Dokumen proyek (${targetProjectId}) tidak ditemukan di database.`);
        return;
      }

      const remoteData = projectSnap.data() as any;
      const latestPPATData: PPATData = remoteData?.ppatData || project.ppatData || {};
      const existingDocs = latestPPATData.documents || [];
      const targetDoc = existingDocs.find(d => d.id === docId);
      const filtered = existingDocs.filter(d => d.id !== docId);
      const updatedPPATData: PPATData = {
        ...latestPPATData,
        documents: filtered,
        updatedAt: new Date().toISOString()
      };

      await setDoc(projectRef, {
        ppatData: cleanUndefined(updatedPPATData),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      if (targetDoc) {
        try {
          await ProjectService.addTimeline(targetProjectId, {
            status: project.status,
            title: `Dokumen ${targetDoc.title} Dihapus`,
            description: `Dokumen PPAT "${targetDoc.title}" dihapus dari proyek oleh ${currentUser.name || currentUser.email}`,
            createdBy: currentUser.email
          });
        } catch (tlErr) {
          console.warn('Failed to add timeline on delete:', tlErr);
        }
      }

      setProject({
        ...project,
        ppatData: updatedPPATData,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Error deleting PPAT document:', err);
      alert('Gagal menghapus dokumen: ' + (err.message || err));
    }
  };

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

    const isRups = project?.jobType === 'rups_t' || project?.jobType === 'sirkuler' || project?.jobType === 'rups_lb' || project?.jobType === 'sirkuler_rupslb';
    if (isRups) {
      let titleLabel = '';
      if (category === 'draft_akta') {
        titleLabel = (project?.jobType === 'rups_t' || project?.jobType === 'sirkuler') ? 'Draft Akta RUPST' : 'Draft Akta RUPS LB';
      } else if (category === 'notulen') {
        titleLabel = (project?.jobType === 'rups_t' || project?.jobType === 'sirkuler') ? 'Notulen / Sirkuler RUPST' : 'Draft Notulen / Sirkuler';
      } else if (category === 'surat_pernyataan') {
        titleLabel = 'Surat Pernyataan';
      }

      return await DocumentVersioningService.saveDocumentWithVersioning({
        projectId,
        companyId: project?.clientId || '',
        driveFolderId,
        category,
        title: titleLabel,
        baseFileName: filename,
        blob,
        jobType: project?.jobType || '',
        userName: currentUser?.name || 'Sistem',
        token
      });
    }

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
        const savedRecord = await uploadGeneratedDocument(filename, blob, category);
        const finalDownloadName = savedRecord?.fileName || filename;

        // Download locally to browser
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = finalDownloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);

        // Trigger ProjectDocumentUpload refresh
        setDocumentUploadKey(prev => prev + 1);

        alert(`Dokumen "${finalDownloadName}" berhasil di-generate, diunduh, dan disimpan ke Google Drive!`);
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
      let profSnap;
      try {
        profSnap = await getDocsFromCache(collection(db, 'company_profiles'));
        if (profSnap.empty) {
          profSnap = await getDocs(collection(db, 'company_profiles'));
        }
      } catch (e) {
        profSnap = await getDocs(collection(db, 'company_profiles'));
      }
      setPendirianProfiles(profSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      // Look for an existing document reference with url '/pendirian' in the project
      const pendirianDocRef = documents.find(d => d.url === '/pendirian');
      
      let existing: any = null;
      if (pendirianDocRef && pendirianDocRef.refId) {
        const docSnap = await getDoc(doc(db, 'pendirian_projects', pendirianDocRef.refId));
        if (docSnap.exists()) {
          existing = { id: docSnap.id, ...(docSnap.data() as any) };
        }
      } else {
        // Fallback: match by selectedProfileId (clientId) or a clean name
        const cleanTitle = project?.title.includes(' — ') 
          ? project.title.split(' — ')[1].trim() 
          : project?.title.includes(' - ') 
            ? project.title.split(' - ')[1].trim() 
            : project?.title || '';
            
        let qMatches: any[] = [];
        if (project?.clientId) {
          const q1 = query(collection(db, 'pendirian_projects'), where('selectedProfileId', '==', project.clientId));
          const q1Snap = await getDocs(q1);
          q1Snap.forEach(d => qMatches.push({ id: d.id, ...d.data() }));
        }
        if (cleanTitle && qMatches.length === 0) {
          const q2 = query(collection(db, 'pendirian_projects'), where('namaPt', '==', cleanTitle));
          const q2Snap = await getDocs(q2);
          q2Snap.forEach(d => qMatches.push({ id: d.id, ...d.data() }));
        }
        
        existing = qMatches[0] || null;
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

  const handleWorkHereCV = async () => {
    setLoading(true);
    try {
      let profSnap;
      try {
        profSnap = await getDocsFromCache(collection(db, 'company_profiles'));
        if (profSnap.empty) {
          profSnap = await getDocs(collection(db, 'company_profiles'));
        }
      } catch (e) {
        profSnap = await getDocs(collection(db, 'company_profiles'));
      }
      setPendirianProfiles(profSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const pendirianDocRef = documents.find(d => d.url === '/pendirian');
      
      let existing: any = null;
      if (pendirianDocRef && pendirianDocRef.refId) {
        const docSnap = await getDoc(doc(db, 'pendirian_projects', pendirianDocRef.refId));
        if (docSnap.exists()) {
          existing = { id: docSnap.id, ...(docSnap.data() as any) };
        }
      } else {
        const cleanTitle = project?.title.includes(' — ') 
          ? project.title.split(' — ')[1].trim() 
          : project?.title.includes(' - ') 
            ? project.title.split(' - ')[1].trim() 
            : project?.title || '';
            
        let qMatches: any[] = [];
        if (project?.clientId) {
          const q1 = query(collection(db, 'pendirian_projects'), where('selectedProfileId', '==', project.clientId));
          const q1Snap = await getDocs(q1);
          q1Snap.forEach(d => qMatches.push({ id: d.id, ...d.data() }));
        }
        if (cleanTitle && qMatches.length === 0) {
          const q2 = query(collection(db, 'pendirian_projects'), where('namaCV', '==', cleanTitle));
          const q2Snap = await getDocs(q2);
          q2Snap.forEach(d => qMatches.push({ id: d.id, ...d.data() }));
        }
        
        existing = qMatches[0] || null;
      }
      
      if (existing) {
        setWorkingPendirianId(existing.id);
        setWorkingPendirianData(mapCompanyProfileToCV(existing));
      } else {
        setWorkingPendirianId('new');
        if (client) {
          const defaultCVData = mapCompanyProfileToCV(client);
          setWorkingPendirianData(defaultCVData);
        } else {
          setWorkingPendirianData(null);
        }
      }
      
      setWorkMode('pendirian_cv');
    } catch (e) {
      console.error(e);
      alert('Gagal memuat form pendirian CV.');
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

      const targetQueryClientId = proj.clientId || (proj as any).selectedProfileId;

      // Parallel queries for children and linked entities
      const [cli, wf, tlList, tkList, docList, relatedSnap] = await Promise.all([
        (targetQueryClientId && targetQueryClientId !== 'undefined')
          ? getDoc(doc(db, 'profiles', targetQueryClientId)).then(snapshot => {
              if (snapshot.exists()) {
                return { id: snapshot.id, ...snapshot.data() } as CompanyProfile;
              }
              return null;
            })
          : Promise.resolve(null),
        WorkflowService.getWorkflow(
          (
            proj.jobType === 'ajb' ||
            proj.jobType === 'akta_ajb' ||
            (proj.projectType && (proj.projectType.includes('AJB') || proj.projectType.toLowerCase().includes('jual beli'))) ||
            (proj.title && proj.title.toUpperCase().includes('AJB')) ||
            (proj.ppatData?.transactionType && (proj.ppatData.transactionType.includes('AJB') || proj.ppatData.transactionType.toLowerCase().includes('jual beli')))
          ) ? 'ajb' : proj.jobType,
          proj.projectType,
          proj.title
        ),
        ProjectService.getProjectTimelines(projectId),
        ProjectService.getProjectTasks(projectId),
        ProjectService.getProjectDocuments(projectId),
        (targetQueryClientId && targetQueryClientId !== 'undefined')
          ? getDocs(query(collection(db, 'office_projects'), where('clientId', '==', targetQueryClientId)))
          : Promise.resolve({ docs: [] } as any)
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
            await setDoc(doc(db, 'office_projects', projectId), {
              metadata: updatedMetadata
            }, { merge: true });
            proj.metadata = updatedMetadata;
          } catch (e) {
            console.error("Failed to update initial metadata for minuta check:", e);
          }
        }
      } else {
        if (
          finalTasks.length === 0 &&
          (proj.jobType === 'akta_ppat' ||
            proj.jobType === 'ppat' ||
            proj.jobType === 'ajb' ||
            proj.jobType === 'akta_ajb' ||
            proj.projectCategory === 'PPAT')
        ) {
          const defaultPPATTaskTitles = [
            "Verifikasi Identitas & Data Para Pihak (KTP, KK, NPWP / NIB Badan Usaha)",
            "Data Objek Pajak & PBB (NOP, SPPT, Bukti Lunas PBB)",
            "Pemeriksaan Dokumen & Pengecekan Sertipikat BPN",
            "Validasi Pajak Penghasilan (PPh Final Penjual / Pelepas Hak)",
            "Validasi Pajak BPHTB (Pembeli / Penerima Hak)",
            "Penyusunan Akta PPAT & Berkas Pendukung (Surat Pernyataan, Pakta Integritas)",
            "Penandatanganan Akta di Hadapan PPAT & Saksi-Saksi",
            "Pendaftaran Balik Nama / Peralihan Hak di Kantor Pertanahan",
            "Penyelesaian & Penyerahan Sertipikat"
          ];
          const createdTasks: Task[] = [];
          for (const title of defaultPPATTaskTitles) {
            try {
              const newTask = await ProjectService.createTask(projectId, {
                title,
                status: 'pending'
              });
              if (newTask) createdTasks.push(newTask);
            } catch (e) {
              console.error("Failed to create default PPAT task:", title, e);
            }
          }
          finalTasks = createdTasks;
        } else if (finalTasks.length === 0 && ['rups_lb', 'sirkuler_rupslb'].includes(proj.jobType)) {
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

      // Fetch uploaded documents from project_uploaded_documents
      try {
        const upSnap = await getDocs(
          query(
            collection(db, 'project_uploaded_documents'),
            where('projectId', '==', projectId)
          )
        );
        const upDocs = upSnap.docs.map(d => ({ id: d.id, ...d.data() } as UploadedDocument));
        setUploadedFiles(upDocs);
      } catch (e) {
        console.warn("Could not fetch project_uploaded_documents:", e);
      }

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
      if (wf && wf.steps && wf.steps.length > 0) {
        const currentIndex = StatusEngine.findStepIndex(wf.steps, proj.status);
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
          loadedEntries = proj.metadata.skSpEntries.map(e => ({
            ...e,
            type: mapToStandardType(e.type)
          }));
        } else if (proj.metadata.skSpNumber) {
          loadedEntries = [{
            id: '1',
            type: mapToStandardType(proj.metadata.skSpType || 'SP_DATA_PERSEROAN'),
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
          loadedEntries = matchingDeed.skSpDocuments.map((docItem: any) => ({
            id: docItem.id || Math.random().toString(36).substring(7),
            type: mapToStandardType(docItem.type),
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
            salutation: sh.salutation || 'Tuan',
            name: sh.name || '',
            birthCity: sh.birthCity || '',
            birthDate: sh.birthDate || '',
            nationalityType: sh.nationalityType || 'WNI',
            nationality: sh.nationality || 'WNI',
            occupation: sh.occupation || '',
            sharesOwned: sh.sharesOwned || 0,
            position: sh.managementPosition || (sh as any).position || '',
            managementPosition: sh.managementPosition || (sh as any).position || '',
            isManagement: sh.isManagement ?? !!(sh.managementPosition || (sh as any).position),
            nik: sh.nik || '',
            npwp: sh.npwp || '',
            passportNumber: sh.passportNumber || '',
            kitasNumber: sh.kitasNumber || '',
            address: sh.address ? {
              rt: sh.address.rt || '',
              rw: sh.address.rw || '',
              kelurahan: sh.address.kelurahan || '',
              kecamatan: sh.address.kecamatan || '',
              city: sh.address.city || '',
              province: sh.address.province || '',
              postalCode: sh.address.postalCode || '',
              fullAddress: sh.address.fullAddress || (typeof sh.address === 'string' ? sh.address : '')
            } : undefined
          })),
          managementItems: (client.oldManagementItems || client.newManagementItems || (client as any).managementItems || []).map(m => ({
            id: m.id,
            salutation: (m as any).salutation || '',
            name: m.name || '',
            birthCity: (m as any).birthCity || '',
            birthDate: (m as any).birthDate || '',
            nationalityType: (m as any).nationalityType || '',
            nationality: (m as any).nationality || '',
            occupation: (m as any).occupation || '',
            position: m.position || '',
            nik: m.nik || '',
            npwp: (m as any).npwp || '',
            passportNumber: (m as any).passportNumber || '',
            kitasNumber: (m as any).kitasNumber || '',
            address: (m as any).address ? {
              rt: (m as any).address.rt || '',
              rw: (m as any).address.rw || '',
              kelurahan: (m as any).address.kelurahan || '',
              kecamatan: (m as any).address.kecamatan || '',
              city: (m as any).address.city || '',
              province: (m as any).address.province || '',
              postalCode: (m as any).address.postalCode || '',
              fullAddress: (m as any).address.fullAddress || (typeof (m as any).address === 'string' ? (m as any).address : '')
            } : undefined
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
                salutation: sh.salutation || 'Tuan',
                name: sh.name || '',
                birthCity: sh.birthCity || '',
                birthDate: sh.birthDate || '',
                nationalityType: sh.nationalityType || 'WNI',
                nationality: sh.nationality || 'WNI',
                occupation: sh.occupation || '',
                sharesOwned: sh.sharesOwned || 0,
                position: sh.managementPosition || sh.position || '',
                managementPosition: sh.managementPosition || sh.position || '',
                isManagement: sh.isManagement ?? !!(sh.managementPosition || sh.position),
                nik: sh.nik || '',
                npwp: sh.npwp || '',
                passportNumber: sh.passportNumber || '',
                kitasNumber: sh.kitasNumber || '',
                address: sh.address ? {
                  rt: sh.address.rt || '',
                  rw: sh.address.rw || '',
                  kelurahan: sh.address.kelurahan || '',
                  kecamatan: sh.address.kecamatan || '',
                  city: sh.address.city || '',
                  province: sh.address.province || '',
                  postalCode: sh.address.postalCode || '',
                  fullAddress: sh.address.fullAddress || (typeof sh.address === 'string' ? sh.address : '')
                } : undefined
              })),
              managementItems: (legacyData.newManagementItems || legacyData.oldManagementItems || []).map((m: any) => ({
                id: m.id || Math.random().toString(36).substring(7),
                salutation: m.salutation || '',
                name: m.name || '',
                birthCity: m.birthCity || '',
                birthDate: m.birthDate || '',
                nationalityType: m.nationalityType || '',
                nationality: m.nationality || '',
                occupation: m.occupation || '',
                position: m.position || '',
                nik: m.nik || '',
                npwp: m.npwp || '',
                passportNumber: m.passportNumber || '',
                kitasNumber: m.kitasNumber || '',
                address: m.address ? {
                  rt: m.address.rt || '',
                  rw: m.address.rw || '',
                  kelurahan: m.address.kelurahan || '',
                  kecamatan: m.address.kecamatan || '',
                  city: m.address.city || '',
                  province: m.address.province || '',
                  postalCode: m.address.postalCode || '',
                  fullAddress: m.address.fullAddress || (typeof m.address === 'string' ? m.address : '')
                } : undefined
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

    const mapOptionToDocType = (typeStr: string): any => {
      const s = typeStr.toLowerCase();
      if (s.includes('perubahan data perseroan') || s.includes('sp perubahan data')) return 'SP_DATA_PERSEROAN';
      if (s.includes('perubahan anggaran dasar') || s.includes('sp anggaran dasar')) return 'SP_ANGGARAN_DASAR';
      if (s.includes('sk pendirian')) return 'SK_PENDIRIAN';
      if (s.includes('sk perubahan')) return 'SK_PERUBAHAN';
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

    const targetProjectId = project?.projectId || projectId;
    const projectRef = doc(db, 'office_projects', targetProjectId);
    const projectSnap = await getDoc(projectRef);
    if (projectSnap.exists()) {
      await setDoc(projectRef, {
        metadata: updatedMetadata
      }, { merge: true });
    }

    const syncedItems: string[] = [];

    const formDoc = documents.find(d => d.refId);
    const refIdToUse = project.metadata?.refId || formDoc?.refId || targetProjectId;
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
        const formDocRef = doc(db, targetCollection, refIdToUse);
        const formSnap = await getDoc(formDocRef);
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
        if (formSnap.exists()) {
          await updateDoc(formDocRef, cleanUndefined(formUpdatePayload));
        } else {
          await setDoc(formDocRef, cleanUndefined(formUpdatePayload), { merge: true });
        }
      } catch (e) {
        console.warn('Could not update form document in Firestore collection:', e);
      }
    }

    const targetClientId = project.clientId || (project as any).selectedProfileId || client?.id;

    if (targetClientId && targetClientId !== 'undefined') {
      const clientDocRef = doc(db, 'profiles', targetClientId);
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

        if (formObj.targetCompanyName || formObj.companyName || formObj.namaPt) {
          profileUpdate.companyName = formObj.targetCompanyName || formObj.companyName || formObj.namaPt;
          if (profileUpdate.companyName !== freshClient?.companyName) {
            syncedItems.push('Nama Perusahaan');
          }
        }
        if (formObj.targetCompanyShortName !== undefined) {
          profileUpdate.companyShortName = formObj.targetCompanyShortName;
        }
        if (formObj.companyType) {
          profileUpdate.companyType = formObj.companyType;
        }
        // Sync Alamat Perseroan (Perubahan Alamat)
        const newFullAddressVal = 
          formObj.fullAddress || 
          formObj.address?.fullAddress || 
          formObj.newAddress?.fullAddress || 
          (typeof formObj.newAddress === 'string' ? formObj.newAddress : '');
        const newAddressObj = formObj.newAddress || formObj.address;

        if (formObj.resolutions?.address === true && (newFullAddressVal || newAddressObj)) {
          if (newFullAddressVal) {
            profileUpdate.fullAddress = newFullAddressVal;
          }
          if (newAddressObj) {
            profileUpdate.newAddress = newAddressObj;
          }
          syncedItems.push('Alamat Utama / Domisili');
        }

        if (formObj.resolutions?.kbli === true && formObj.kbliItems && formObj.kbliItems.length > 0) {
          profileUpdate.kbliItems = formObj.kbliItems;
          syncedItems.push(`KBLI (${formObj.kbliItems.length} item)`);
        }

        // Kedudukan (Domisili) sync — hanya jika resolusi domicile dicentang DAN nilai baru terisi.
        // Tidak boleh menimpa data lama dengan string kosong.
        const targetDomicile = formObj.domicile || formObj.newAddress?.city || formObj.kedudukanPT;
        if (formObj.resolutions?.domicile === true && targetDomicile && String(targetDomicile).trim().length > 0) {
          const oldDomicileVal = freshClient?.domicile || '';
          if (String(targetDomicile).trim() !== String(oldDomicileVal).trim()) {
            profileUpdate.oldDomicile = oldDomicileVal;
            profileUpdate.domicile = String(targetDomicile).trim();
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
        }).filter((sh: any) => {
          const shares = Number(sh.sharesOwned || 0);
          const isMgmt = Boolean(sh.isManagement || (sh.managementPosition && String(sh.managementPosition).trim().length > 0));
          return shares > 0 || isMgmt;
        });

        const shareholdersResolutionActive = formObj.resolutions?.shareholders === true || formObj.resolutions?.capitalPaid === true;

        if (shareholdersResolutionActive && workingShareholders.length > 0) {
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

          // Filter workingShareholders agar yang bersaham 0 dan tidak lagi menjabat langsung dibersihkan
          workingShareholders = workingShareholders.filter((sh: any) => {
            const shares = Number(sh.sharesOwned || 0);
            const isMgmt = Boolean(sh.isManagement || (sh.managementPosition && String(sh.managementPosition).trim().length > 0));
            return shares > 0 || isMgmt;
          });

          profileUpdate.shareholders = workingShareholders;
          profileUpdate.finalShareholders = workingShareholders;
          console.log('[Sync Diagnostic][Management] shareholders setelah sinkron appointment/dismissal:', workingShareholders);
        }
        } // tutup gate: if (formObj.resolutions?.management === true)

        if (profileUpdate.shareholders) {
          profileUpdate.shareholders = profileUpdate.shareholders.filter((sh: any) => {
            const shares = Number(sh.sharesOwned || 0);
            const isMgmt = Boolean(sh.isManagement || (sh.managementPosition && String(sh.managementPosition).trim().length > 0));
            return shares > 0 || isMgmt;
          });
          profileUpdate.finalShareholders = profileUpdate.shareholders;
        }
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

      const nameChanged = !!profileUpdate.companyName && profileUpdate.companyName !== freshClient?.companyName;
      if (nameChanged) {
        previewCategories.push({ label: 'Nama Perusahaan', before: freshClient?.companyName || '-', after: profileUpdate.companyName });
      }
      if (formObj?.resolutions?.companyNameChange === true && !nameChanged) {
        previewWarnings.push('Resolusi "Perubahan Nama Perseroan" dicentang tapi tidak ada perubahan terdeteksi — periksa input form sebelum lanjut.');
      }

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

      await setDoc(doc(db, 'profiles', targetClientId), cleanUndefined(profileUpdate), { merge: true });
      try {
        await setDoc(doc(db, 'company_profiles', targetClientId), cleanUndefined(profileUpdate), { merge: true });
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
                  value={mapToStandardType(entry.type)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSkSpEntries(prev => prev.map((item, i) => i === idx ? { ...item, type: val } : item));
                  }}
                  className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none transition-all focus:ring-1 focus:ring-blue-500"
                >
                  <option value="SK_PENDIRIAN">SK Pendirian</option>
                  <option value="SK_PERUBAHAN">SK Perubahan</option>
                  <option value="SP_ANGGARAN_DASAR">SP Anggaran Dasar</option>
                  <option value="SP_DATA_PERSEROAN">SP Perubahan Data</option>
                  <option value="SK">SK (Lainnya / Keputusan)</option>
                  <option value="SP">SP (Lainnya)</option>
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
    if (
      project?.jobType === 'akta_ppat' ||
      project?.jobType === 'ppat' ||
      project?.jobType === 'ajb' ||
      project?.jobType === 'akta_ajb' ||
      project?.projectCategory === 'PPAT'
    ) {
      return false;
    }
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
        const targetProjectId = project.projectId || projectId;
        const projectRef = doc(db, 'office_projects', targetProjectId);
        const projectSnap = await getDoc(projectRef);
        const updatedMetadata = {
          ...(project.metadata || {}),
          minutaCheckedAll: allChecked
        };
        if (projectSnap.exists()) {
          await setDoc(projectRef, {
            metadata: updatedMetadata
          }, { merge: true });
        }
        setProject(prev => prev ? { ...prev, metadata: updatedMetadata } : null);
      } catch (err) {
        console.error("Failed to sync minuta completion status:", err);
      }
    }
  };

  const getDisplayedTasks = () => {
    if (!project) return [];
    if (project.jobType === 'akta_ppat' || project.jobType === 'ppat' || project.projectCategory === 'PPAT') {
      return tasks;
    }
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
      const targetProjectId = project.projectId || projectId;
      const projectRef = doc(db, 'office_projects', targetProjectId);
      const projectSnap = await getDoc(projectRef);
      if (!projectSnap.exists()) {
        throw new Error(`Dokumen proyek (${targetProjectId}) tidak ditemukan.`);
      }
      await setDoc(projectRef, {
        minutaNotes: localMinutaNotes
      }, { merge: true });
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
      const targetProjectId = project.projectId || projectId;
      const projectRef = doc(db, 'office_projects', targetProjectId);
      const projectSnap = await getDoc(projectRef);
      if (!projectSnap.exists()) {
        throw new Error(`Dokumen proyek (${targetProjectId}) tidak ditemukan.`);
      }
      const now = new Date();
      const noteContent = projectNote.trim();
      
      // Update the project document on Firestore directly
      await setDoc(projectRef, {
        lastTransitionComment: noteContent,
        updatedAt: now
      }, { merge: true });

      // Add to timeline log with current status and category as Catatan Tambahan
      await ProjectService.addTimeline(targetProjectId, {
        status: project.status,
        title: "Catatan Tambahan",
        description: noteContent,
        createdBy: currentUserEmail || 'staff_notaris'
      });

      setProjectNote('');
      // Reload project details to show updated timeline and comments
      await fetchProjectFullDetails();
      setToast({ type: 'success', message: 'Catatan proyek berhasil disimpan ke Timeline!' });
    } catch (err: any) {
      console.error(err);
      setToast({ type: 'error', message: `Gagal menyimpan catatan: ${err.message || 'Error tidak dikenal'}` });
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
      const targetProjectId = project?.projectId || projectId;
      const projectRef = doc(db, 'office_projects', targetProjectId);
      const projectSnap = await getDoc(projectRef);
      if (!projectSnap.exists()) {
        throw new Error(`Dokumen proyek (${targetProjectId}) tidak ditemukan di database.`);
      }
      await setDoc(projectRef, {
        parties: updatedParties
      }, { merge: true });
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
      case 'akta_ppat':
      case 'ppat':
      case 'ajb':
      case 'akta_ajb':
        return '/ppat';
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

  const isPT = client?.clientType === 'PT' ||
    project.clientSnapshot?.companyType === 'PT' ||
    ['rups_lb', 'sirkuler_rupslb', 'rups_t', 'sirkuler', 'pendirian_pt'].includes(project.jobType) ||
    Boolean(client?.clientType && client.clientType.startsWith('PT')) ||
    Boolean(project.clientSnapshot?.companyType && project.clientSnapshot.companyType.startsWith('PT'));
  const isPPAT = project.jobType === 'akta_ppat' || project.jobType === 'ppat' || project.jobType === 'ajb' || project.jobType === 'akta_ajb' || project.projectCategory === 'PPAT';

  const isFormType = project && ['rups_lb', 'sirkuler_rupslb', 'rups_t', 'sirkuler'].includes(project.jobType);
  const isFinal = isProjectFinal(project);

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-6">
      <div className="w-[94%] xl:w-[92%] max-w-none mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
          <span>Proyek Kerja</span>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="font-semibold text-slate-700">Detail Proyek</span>
        </div>

        {/* Back and Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div className="flex items-start gap-3">
            <button
              onClick={onBack}
              className="p-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer"
              title="Kembali ke Daftar Proyek"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 leading-snug">
                {project.title}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  ID: {project.projectId.substring(0, 10).toUpperCase()}
                </span>
                {isPPAT ? (
                  <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-300 uppercase tracking-wide flex items-center gap-1.5 shadow-2xs">
                    <Landmark className="w-3.5 h-3.5 text-amber-600" />
                    <span>Akta PPAT • {project.projectType || 'Peralihan Hak'}</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
                    {workflow?.name || project.jobType.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick link buttons to existing forms */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Quick Actions: Buat Invoice & Buat Penawaran dari Proyek */}
            <button
              type="button"
              onClick={() => {
                const clientName = (project.clientSnapshot as any)?.name || project.clientSnapshot?.companyName || (project as any).clientName || '';
                const title = project.title || '';
                const targetHash = `#/invoice?new=true&projectId=${encodeURIComponent(project.projectId)}&clientId=${encodeURIComponent(project.clientId || '')}&clientName=${encodeURIComponent(clientName)}&title=${encodeURIComponent(title)}`;
                window.location.hash = targetHash;
              }}
              className="px-3.5 py-2 bg-white hover:bg-blue-50 text-blue-700 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-blue-200 transition-all cursor-pointer shadow-2xs"
              title="Buat Tagihan / Invoice untuk Proyek ini"
            >
              <FileText size={13} className="text-blue-600" />
              <span>Buat Invoice</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const clientName = (project.clientSnapshot as any)?.name || project.clientSnapshot?.companyName || (project as any).clientName || '';
                const title = project.title || '';
                const targetHash = `#/quotations/new?projectId=${encodeURIComponent(project.projectId)}&clientId=${encodeURIComponent(project.clientId || '')}&clientName=${encodeURIComponent(clientName)}&title=${encodeURIComponent(title)}`;
                window.location.hash = targetHash;
              }}
              className="px-3.5 py-2 bg-white hover:bg-purple-50 text-purple-700 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-purple-200 transition-all cursor-pointer shadow-2xs"
              title="Buat Surat Penawaran untuk Proyek ini"
            >
              <File size={13} className="text-purple-600" />
              <span>Buat Penawaran</span>
            </button>

            {project.jobType === 'sewa_menyewa' && (
              <button
                onClick={() => setWorkMode('sewa_menyewa')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm"
              >
                <span>Kerjakan di Sini</span>
                <Sparkles className="w-4 h-4" />
              </button>
            )}
            {isPT && !['pendirian_pt', 'input_nib', 'perbaikan_data_ahu', 'buka_blokir'].includes(project.jobType) && (
              <>
                {(() => {
                  const path = getRedirectPath(project.jobType);
                  const existingDoc = documents.find(d => d.url === path);
                  
                  if (existingDoc && existingDoc.refId) {
                    return (
                      <button
                        type="button"
                        onClick={() => navigate(`${path}?id=${encodeURIComponent(existingDoc.refId)}&projectId=${encodeURIComponent(project.projectId)}`)}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Edit Dokumen</span>
                      </button>
                    );
                  }

                  return (
                    <button
                      type="button"
                      onClick={() => navigate(`${path}?projectId=${encodeURIComponent(project.projectId)}`)}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Buat Dokumen Baru</span>
                    </button>
                  );
                })()}
              </>
            )}
            {project.jobType === 'pendirian_pt' && (
              <button
                onClick={handleWorkHere}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm"
              >
                <span>Kerjakan di Sini</span>
                <Sparkles className="w-4 h-4" />
              </button>
            )}
            {isPPAT && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPPATSelectDocOpen(true)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Buat Dokumen</span>
                </button>
                <button
                  onClick={() => setWorkMode('ppat_base_data')}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-2 transition-all border border-slate-200 shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Master Data PPAT</span>
                </button>
              </div>
            )}
            {(project.projectType === 'Pendirian CV' || project.jobType === 'pendirian_cv') && (
              <button
                onClick={handleWorkHereCV}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm"
              >
                <span>Draft Akta CV</span>
                <Sparkles className="w-4 h-4" />
              </button>
            )}
            {currentUser.role === 'Super Admin' && (
              <button
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="px-3.5 py-2 bg-white hover:bg-red-50 text-red-600 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all border border-red-200 cursor-pointer shadow-2xs"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-red-500" />}
                <span>Hapus Proyek</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center gap-1 border-b border-slate-200/90 overflow-x-auto no-scrollbar pt-1 bg-white px-3 rounded-xl shadow-2xs">
          {[
            { id: 'ringkasan', label: 'Ringkasan', icon: LayoutDashboard },
            { id: 'tugas', label: `Tugas & Checklist`, icon: CheckSquare },
            { id: 'dokumen', label: `Dokumen (${documents.length})`, icon: FileText },
            { id: 'klien', label: 'Data Klien', icon: Building2 },
            { id: 'timeline', label: 'Timeline', icon: Calendar },
            { id: 'catatan', label: 'Catatan', icon: Edit3 },
            { id: 'keuangan', label: 'Invoice & Keuangan', icon: Landmark },
            { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeDetailTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveDetailTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
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
                    let changes: any[] = [];
                    if (!isNew && id) {
                      try {
                        const oldSnap = await getDoc(doc(db, 'pendirian_projects', id as string));
                        if (oldSnap.exists()) {
                          changes = compareCompanyDocumentDiff(oldSnap.data(), finalData);
                        }
                      } catch (err) {
                        console.warn("Gagal mengambil data lama pendirian untuk diff:", err);
                      }
                    }

                    await setDoc(doc(db, 'pendirian_projects', id as string), cleanUndefined(finalData));
                    
                    await ProjectService.addDocument(projectId, {
                      name: `Draft Pendirian PT - ${finalData.namaPt || 'PT Baru'}`,
                      type: 'docx',
                      url: `/pendirian`,
                      refId: id as string,
                      uploadedBy: currentUserEmail,
                      changes: changes.length > 0 ? changes : undefined
                    });
                    
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
        ) : workMode === 'pendirian_cv' ? (
          <div className="mt-6">
            <button 
              onClick={() => setWorkMode('default')}
              className="mb-4 flex items-center gap-2 text-slate-500 hover:text-slate-700 font-semibold text-sm transition-colors bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Detail Proyek
            </button>
            <DraftAktaPendirianCV
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
                let rawClientName = finalData.namaCV;
                if (finalData.selectedProfileId) {
                  const profile = pendirianProfiles.find(p => p.id === finalData.selectedProfileId);
                  if (profile && profile.companyName) rawClientName = profile.companyName;
                }
                const clientName = (rawClientName || '').toUpperCase().startsWith('CV') 
                  ? (rawClientName || '') : `CV. ${(rawClientName || '')}`;
                const syncData = {
                  deedNumber,
                  orderNumber: finalData.nomorUrut || '02',
                  deedDate,
                  clientName,
                  deedTitle: `PENDIRIAN PERSEROAN KOMANDITER CV. ${(finalData.namaCV || '').toUpperCase()}`,
                  appearers: formatAppearersForPendirianCV(finalData)
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
              onSave={async (cvData) => {
                setAddingDoc(true);
                if (!currentUserEmail) {
                  setAddingDoc(false);
                  return alert('Anda harus login terlebih dahulu!');
                }
                
                const isNew = workingPendirianId === 'new';
                const id = isNew ? crypto.randomUUID() : workingPendirianId;
                const finalData = {
                  ...cvData,
                  id,
                  jobType: 'pendirian_cv',
                  updatedAt: new Date().toISOString()
                };
                try {
                  let changes: any[] = [];
                  if (!isNew && id) {
                    try {
                      const oldSnap = await getDoc(doc(db, 'pendirian_projects', id as string));
                      if (oldSnap.exists()) {
                        changes = compareCompanyDocumentDiff(oldSnap.data(), finalData);
                      }
                    } catch (err) {
                      console.warn("Gagal mengambil data lama pendirian CV untuk diff:", err);
                    }
                  }

                  await setDoc(doc(db, 'pendirian_projects', id as string), cleanUndefined(finalData));
                  
                  await ProjectService.addDocument(projectId, {
                    name: `Draft Pendirian CV - ${finalData.namaCV ? 'CV. ' + finalData.namaCV : 'CV Baru'}`,
                    type: 'docx',
                    url: `/pendirian`,
                    refId: id as string,
                    uploadedBy: currentUserEmail,
                    changes: changes.length > 0 ? changes : undefined
                  });
                  
                  alert('Data pendirian CV berhasil disimpan dan dilink ke proyek!');
                  fetchProjectFullDetails();
                  setWorkingPendirianId(id as string);
                  setWorkingPendirianData(finalData);
                } catch (e: any) {
                  console.error(e);
                  alert("Error: " + e.message);
                } finally {
                  setAddingDoc(false);
                }
              }}
              onCancel={() => {
                setWorkMode('default');
              }}
              onDelete={async (id) => {
                if (confirm('Apakah Anda yakin ingin menghapus data pendirian CV ini?')) {
                  try {
                    await deleteDoc(doc(db, 'pendirian_projects', id));
                    await ProjectService.deleteDocumentByRefId(projectId, id);
                    fetchProjectFullDetails();
                    setWorkMode('default');
                    alert('Data pendirian CV berhasil dihapus!');
                  } catch (e: any) {
                    console.error(e);
                    alert(e.message);
                  }
                }
              }}
              onShowPreview={(d) => {
                setPendirianPreviewData(d); 
                setShowPendirianPreview(true); 
              }}
              onExportWord={async (d) => { 
                setIsExportingPendirian(true);
                try {
                  await generatePendirianCVDocx(d);
                } catch (e: any) {
                  alert('Gagal export dokumen CV: ' + e.message);
                } finally {
                  setIsExportingPendirian(false);
                }
              }}
            />
            {showPendirianPreview && pendirianPreviewData && (
              <PendirianDocumentPreview
                data={pendirianPreviewData}
                onExport={async () => {
                  setIsExportingPendirian(true);
                  try {
                    await generatePendirianCVDocx(pendirianPreviewData);
                  } catch (e: any) {
                    alert('Gagal export: ' + e.message);
                  } finally {
                    setIsExportingPendirian(false);
                  }
                }}
                onClose={() => setShowPendirianPreview(false)}
                isExporting={isExportingPendirian}
              />
            )}
          </div>
        ) : workMode === 'ppat_base_data' ? (
          <div className="mt-6">
            <PPATDataManager
              project={project}
              currentUser={currentUser}
              onBack={() => setWorkMode('default')}
              onUpdateProject={(updated) => setProject(updated)}
            />
          </div>
        ) : workMode === 'ppat_doc_editor' && activePPATDoc ? (
          <div className="mt-6">
            <PPATDocumentEditor
              project={project}
              initialDoc={activePPATDoc}
              currentUser={currentUser}
              onBack={() => {
                setActivePPATDoc(null);
                setWorkMode('default');
              }}
              onSave={handleSavePPATDocument}
            />
          </div>
        ) : (
        <div className="space-y-6">
          {/* PPAT Workflow Steps Bar */}
          {isPPAT && workflow?.steps && (
            <PPATWorkflowStepsBar
              currentStep={project.currentStep || project.status}
              steps={workflow.steps}
              onSelectStep={(step) => setTransitionStatus(step)}
            />
          )}

          {/* ======================================================== */}
          {/* TAB 1: RINGKASAN (DASHBOARD SUMMARY MATCHING MOCKUP) */}
          {/* ======================================================== */}
          {activeDetailTab === 'ringkasan' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column (2/3) */}
              <div className="lg:col-span-2 space-y-6">
                {/* 1. Informasi Proyek Card */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <FileText className="w-4 h-4" />
                      </div>
                      <h2 className="text-sm font-bold text-slate-800">Informasi Proyek</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveDetailTab('pengaturan')}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6 text-[13px]">
                    {/* Item 1: Nama Proyek */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Nama Proyek</span>
                        <p className="font-bold text-slate-800 text-[13px] leading-snug">{project.title}</p>
                      </div>
                    </div>

                    {/* Item 2: Data PIC */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Data PIC</span>
                        {(() => {
                          const picTitle = project.picTitle || project.clientSnapshot?.picTitle || (client as any)?.picTitle || '';
                          const picName = project.picName || project.clientPic || project.clientSnapshot?.picName || (client as any)?.picName || (client as any)?.contactPerson || '';
                          const picPhone = project.picPhone || project.clientContact || project.clientSnapshot?.picPhone || project.clientSnapshot?.phoneNumber || (client as any)?.picPhone || (client as any)?.phoneNumber || '';
                          const displayName = picName ? `${picTitle ? `${picTitle} ` : ''}${picName}` : null;

                          return (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-bold text-[13px] ${displayName ? 'text-slate-800' : 'text-slate-400'}`}>
                                  {displayName || 'Belum diatur'}
                                </span>
                                <button
                                  type="button"
                                  onClick={openEditPicModal}
                                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200 transition-all cursor-pointer"
                                >
                                  {displayName ? 'Ubah PIC' : '+ Set PIC'}
                                </button>
                              </div>
                              {picPhone && (
                                <a
                                  href={`https://wa.me/${picPhone.replace(/[^0-9]/g, '').replace(/^0/, '62')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-teal-700 font-semibold hover:underline flex items-center gap-1 transition-colors"
                                  title="Hubungi PIC via WhatsApp"
                                >
                                  <Phone className="w-3 h-3 text-teal-600" />
                                  <span>{picPhone}</span>
                                </a>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Item 3: Klien Registrasi */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Klien Registrasi</span>
                        <p className="font-bold text-slate-800 text-[13px] leading-snug">
                          {client ? formatCompanyName(client.companyName, client.clientType) : (project.clientSnapshot?.companyName || 'Memuat...')}
                        </p>
                        <span className="text-[11px] text-slate-400 block">
                          {client?.domicile || 'Kota Tangerang Selatan'}
                        </span>
                      </div>
                    </div>

                    {/* Item 4: Status Saat Ini */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Status Saat Ini</span>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsInfoStatusDropdownOpen(!isInfoStatusDropdownOpen)}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 flex items-center gap-1.5 uppercase transition-all cursor-pointer shadow-2xs"
                          >
                            <span>{project.status.toUpperCase()}</span>
                            <ChevronDown className="w-3 h-3 text-amber-600" />
                          </button>
                          {isInfoStatusDropdownOpen && (
                            <div className="absolute left-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5 max-h-60 overflow-y-auto">
                              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                Pilih Status Cepat
                              </div>
                              {(workflow?.steps || []).map((step) => {
                                const isCur = StatusEngine.normalizeStep(step) === StatusEngine.normalizeStep(project.status);
                                return (
                                  <button
                                    key={step}
                                    type="button"
                                    onClick={() => {
                                      setIsInfoStatusDropdownOpen(false);
                                      handleQuickStatusChange(step);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-blue-50 transition-colors flex items-center justify-between ${
                                      isCur ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-700'
                                    }`}
                                  >
                                    <span>{step.toUpperCase()}</span>
                                    {isCur && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Item 5: Tanggal Dibuat */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Tanggal Dibuat</span>
                        <p className="font-bold text-slate-800 text-[13px]">
                          {project.createdAt ? new Date(project.createdAt.seconds ? project.createdAt.toDate() : project.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          }) : '-'}
                        </p>
                      </div>
                    </div>

                    {/* Item 6: Target Selesai */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Target Selesai</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 text-[13px]">
                            {(project as any).targetDate ? new Date((project as any).targetDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsSetTargetOpen(true)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200 transition-all cursor-pointer"
                          >
                            + Set Target
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Item 7: Google Drive */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0 border border-green-100">
                        <Folder className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Google Drive</span>
                        {project.metadata?.driveFolderUrl ? (
                          <a
                            href={project.metadata.driveFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg border border-blue-200 transition-all"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Buka Folder Drive Proyek</span>
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSetupDriveFolder}
                            disabled={isSettingUpDrive}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-lg border border-emerald-200 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <FolderPlus className="w-3.5 h-3.5" />
                            <span>{isSettingUpDrive ? 'Menyiapkan...' : 'Hubungkan Drive'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Item 8: Kategori */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Kategori</span>
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                          <span>
                            {isPPAT
                              ? 'Pertanahan / PPAT'
                              : project.jobType.includes('nib')
                              ? 'Perizinan & OSS'
                              : 'Badan Hukum / Usaha'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Dokumen Proyek Card (Moved above Snapshot Hukum & Perusahaan) */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-800">
                          Dokumen Proyek ({allProjectFiles.length})
                        </h2>
                        <p className="text-[11px] text-slate-400">
                          Daftar berkas & dokumen yang sudah diunggah atau digenerate
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsDocModalOpen(true)}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Dokumen</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveDetailTab('dokumen')}
                        className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl flex items-center gap-1.5 transition-all border border-blue-200 cursor-pointer"
                      >
                        <span>Kelola Semua</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {allProjectFiles.length === 0 ? (
                    <div className="py-8 text-center space-y-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto text-blue-500">
                        <FileText className="w-6 h-6 stroke-[1.5]" />
                      </div>
                      <div className="space-y-1 max-w-xs mx-auto">
                        <p className="text-xs font-semibold text-slate-700">
                          Belum ada dokumen yang diunggah
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Unggah berkas legalitas, notulen, akta, atau SK/SP untuk proyek ini.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsDocModalOpen(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs mx-auto cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Dokumen Sekarang</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {allProjectFiles.map((fileItem, idx) => (
                          <div
                            key={fileItem.id || idx}
                            className="flex items-center justify-between p-3 bg-slate-50/80 hover:bg-slate-100/80 rounded-xl border border-slate-150 transition-all group"
                          >
                            <div className="flex items-center gap-3 min-w-0 mr-2">
                              <div className="w-9 h-9 rounded-lg bg-blue-100/70 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/60">
                                <File className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 text-xs truncate group-hover:text-blue-600 transition-colors" title={fileItem.title}>
                                  {fileItem.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {fileItem.subtitle && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-slate-500 border border-slate-200 font-medium truncate max-w-[140px]">
                                      {fileItem.subtitle}
                                    </span>
                                  )}
                                  {fileItem.uploadedAt && (
                                    <span className="text-[10px] text-slate-400 shrink-0">
                                      {new Date(fileItem.uploadedAt).toLocaleDateString('id-ID', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {fileItem.url ? (
                                <a
                                  href={fileItem.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-1 transition-all shadow-2xs"
                                >
                                  <span>Lihat</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setActiveDetailTab('dokumen')}
                                  className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                                >
                                  <span>Buka</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setActiveDetailTab('dokumen')}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>Kelola selengkapnya di Tab Dokumen</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Snapshot Hukum & Perusahaan Card */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <h2 className="text-sm font-bold text-slate-800">Snapshot Hukum & Perusahaan</h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left stats */}
                    <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Nama Perusahaan</span>
                        <p className="font-bold text-slate-800 text-[13px]">
                          {client?.companyName || project.clientSnapshot?.companyName || project.title}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Alamat Lengkap</span>
                        <p className="font-medium text-slate-700 text-[12px]">
                          {client?.fullAddress || project.clientSnapshot?.fullAddress || '-'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Modal Dasar</span>
                          <p className="font-bold text-slate-800 text-[12px]">
                            {client?.targetCapitalBase
                              ? `Rp ${Number(client.targetCapitalBase).toLocaleString('id-ID')}`
                              : project.clientSnapshot?.authorizedCapital
                              ? `Rp ${Number(project.clientSnapshot.authorizedCapital).toLocaleString('id-ID')}`
                              : 'Rp 1.000.000.000'}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Modal Disetor</span>
                          <p className="font-bold text-slate-800 text-[12px]">
                            {client?.targetCapitalPaid
                              ? `Rp ${Number(client.targetCapitalPaid).toLocaleString('id-ID')}`
                              : project.clientSnapshot?.paidUpCapital
                              ? `Rp ${Number(project.clientSnapshot.paidUpCapital).toLocaleString('id-ID')}`
                              : 'Rp 600.000.000'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right list: Shareholders */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Daftar Pemegang Saham
                      </span>
                      {(() => {
                        const shareholders =
                          project.changeSnapshot?.after?.shareholders ||
                          project.clientSnapshot?.shareholders ||
                          client?.shareholders ||
                          [];

                        if (shareholders.length === 0) {
                          return (
                            <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                              Belum ada data pemegang saham tercatat
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-2">
                            {shareholders.map((sh: any, idx: number) => (
                              <div
                                key={sh.id || idx}
                                onClick={() => setActiveDetailTab('klien')}
                                className="flex items-center justify-between p-3 bg-white hover:bg-blue-50/50 rounded-xl border border-slate-200 transition-all cursor-pointer group shadow-2xs"
                              >
                                <span className="font-bold text-xs text-slate-800 group-hover:text-blue-600 uppercase">
                                  {sh.name}
                                </span>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                  <span>{sh.sharesOwned?.toLocaleString('id-ID') || 0} lembar</span>
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* 3. Timeline Proyek Card */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <h2 className="text-sm font-bold text-slate-800">Timeline Proyek</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveDetailTab('timeline')}
                      className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs rounded-lg transition-all border border-blue-200 cursor-pointer"
                    >
                      Lihat Semua
                    </button>
                  </div>

                  {timelines.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      Belum ada catatan aktivitas untuk proyek ini.
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-blue-100 pl-4 space-y-5 ml-2">
                      {timelines.slice(0, 3).map((tl) => (
                        <div key={tl.id} className="relative">
                          <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white" />
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-mono text-slate-400 font-bold block">
                              {tl.createdAt ? new Date(tl.createdAt.seconds ? tl.createdAt.toDate() : tl.createdAt).toLocaleString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : '-'}
                            </span>
                            <h4 className="text-xs font-bold text-slate-800 leading-tight">
                              {tl.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 leading-normal">
                              {tl.description}
                            </p>
                            <span className="text-[10px] text-slate-400 block pt-0.5">
                              Oleh: {tl.createdBy}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column (1/3) */}
              <div className="space-y-6">
                {/* 1. Status & Progres Card */}
                {(() => {
                  const steps = workflow?.steps || [];
                  const currentStepIndex = StatusEngine.findStepIndex(steps, project.currentStep || project.status);
                  const progressPercent = steps.length > 0 && currentStepIndex !== -1
                    ? Math.min(100, Math.max(10, Math.round(((currentStepIndex + 1) / steps.length) * 100)))
                    : 20;

                  return (
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-5">
                      <div className="flex items-center gap-2 text-blue-600 border-b border-slate-100 pb-3">
                        <CheckCircle2 className="w-4 h-4" />
                        <h2 className="text-sm font-bold text-slate-800">Status & Progres</h2>
                      </div>

                      {/* Donut and Progress description */}
                      <div className="flex items-center gap-5">
                        <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                          <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                            <circle
                              cx="40"
                              cy="40"
                              r="32"
                              stroke="#e2e8f0"
                              strokeWidth="8"
                              fill="transparent"
                            />
                            <circle
                              cx="40"
                              cy="40"
                              r="32"
                              stroke="#2563eb"
                              strokeWidth="8"
                              strokeDasharray={201}
                              strokeDashoffset={201 - (201 * progressPercent) / 100}
                              strokeLinecap="round"
                              fill="transparent"
                              className="transition-all duration-500 ease-out"
                            />
                          </svg>
                          <span className="absolute font-extrabold text-slate-800 text-sm">
                            {progressPercent}%
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h3 className="font-bold text-slate-800 text-xs uppercase leading-tight tracking-wide">
                            {project.status.replace(/_/g, ' ')}
                          </h3>
                          <p className="text-[11px] text-slate-500 leading-normal">
                            Tahapan verifikasi & pemrosesan dokumen legalitas.
                          </p>
                        </div>
                      </div>

                      {/* 4-Phase Stepper Line */}
                      <div className="pt-2">
                        <div className="relative flex items-center justify-between">
                          <div className="absolute left-2 right-2 top-2 h-0.5 bg-slate-200 -z-0" />
                          <div
                            className="absolute left-2 top-2 h-0.5 bg-blue-600 -z-0 transition-all duration-500"
                            style={{
                              width: `${Math.min(100, Math.max(0, (progressPercent / 100) * 85))}%`
                            }}
                          />
                          {[
                            { name: 'Persiapan', threshold: 10 },
                            { name: 'Input Data', threshold: 30 },
                            { name: 'Review', threshold: 70 },
                            { name: 'Selesai', threshold: 100 }
                          ].map((phase, pIdx) => {
                            const isPassed = progressPercent >= phase.threshold;
                            return (
                              <div key={pIdx} className="flex flex-col items-center gap-1.5 z-10">
                                <div
                                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                                    isPassed
                                      ? 'bg-blue-600 border-white ring-2 ring-blue-600'
                                      : 'bg-white border-slate-300'
                                  }`}
                                />
                                <span className={`text-[10px] font-semibold ${isPassed ? 'text-blue-700 font-bold' : 'text-slate-400'}`}>
                                  {phase.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Ubah Status Button */}
                      <div className="relative pt-2">
                        <button
                          type="button"
                          onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                        >
                          <span>Ubah Status Proyek</span>
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        {isStatusDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-40 py-2 max-h-64 overflow-y-auto">
                            <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                              Pilih Status Baru
                            </div>
                            {(workflow?.steps || []).map((step) => {
                              const isCur = StatusEngine.normalizeStep(step) === StatusEngine.normalizeStep(project.status);
                              return (
                                <button
                                  key={step}
                                  type="button"
                                  onClick={() => {
                                    setIsStatusDropdownOpen(false);
                                    handleQuickStatusChange(step);
                                  }}
                                  className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-blue-50 transition-colors flex items-center justify-between ${
                                    isCur ? 'text-blue-600 font-bold bg-blue-50/60' : 'text-slate-700'
                                  }`}
                                >
                                  <span>{step.toUpperCase()}</span>
                                  {isCur && <Check className="w-4 h-4 text-blue-600" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Tambah Catatan Proyek (Tanpa Ubah Status) */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-500" />
                      <h2 className="text-sm font-bold text-slate-800">
                        Tambah Catatan Proyek (Tanpa Ubah Status)
                      </h2>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Tambahkan catatan perkembangan atau catatan penting untuk proyek ini tanpa harus mengubah status.
                    </p>
                    <textarea
                      value={projectNote}
                      onChange={(e) => setProjectNote(e.target.value)}
                      placeholder="Ketik catatan di sini (misal: Menunggu konfirmasi akta, dokumen sedang diproses, dsb)..."
                      rows={3}
                      className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all focus:bg-white focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400">
                        Tersimpan ke riwayat Timeline
                      </span>
                      <button
                        type="button"
                        onClick={handleSaveProjectNote}
                        disabled={savingProjectNote || !projectNote.trim()}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
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

                {/* 3. Checklist Tugas Card */}
                {(() => {
                  const displayedTasks = getDisplayedTasks();
                  const completedCount = displayedTasks.filter((t) => t.status === 'completed').length;
                  const totalCount = displayedTasks.filter((t) => t.status !== 'not_required').length;

                  return (
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2 text-blue-600">
                          <CheckSquare className="w-4 h-4" />
                          <h2 className="text-sm font-bold text-slate-800">
                            Checklist Tugas ({completedCount}/{totalCount})
                          </h2>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveDetailTab('tugas')}
                          className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-all border border-blue-200 cursor-pointer"
                        >
                          <span>Kelola</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>

                      {displayedTasks.length === 0 ? (
                        <div className="py-6 text-center space-y-3">
                          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                            <CheckSquare className="w-6 h-6 stroke-[1.5]" />
                          </div>
                          <p className="text-xs text-slate-400">
                            Belum ada checklist tugas untuk proyek ini.
                          </p>
                          <button
                            type="button"
                            onClick={() => setActiveDetailTab('tugas')}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs mx-auto cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah Checklist</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {displayedTasks.slice(0, 3).map((task) => (
                            <div
                              key={task.id}
                              onClick={() => handleUpdateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                              className="flex items-center gap-2.5 p-2.5 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-100 cursor-pointer transition-all"
                            >
                              {task.status === 'completed' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : (
                                <div className="w-4 h-4 rounded-md border border-slate-300 shrink-0" />
                              )}
                              <span className={`text-xs font-semibold line-clamp-1 ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                {task.title}
                              </span>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => setActiveDetailTab('tugas')}
                            className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-blue-600 font-bold text-xs rounded-xl border border-dashed border-blue-200 flex items-center justify-center gap-1 transition-all cursor-pointer mt-2"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah Checklist</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: TUGAS & CHECKLIST */}
          {/* ======================================================== */}
          {activeDetailTab === 'tugas' && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-6">
              {(() => {
                const displayedTasks = getDisplayedTasks();
                const completedCount = displayedTasks.filter((t) => t.status === 'completed').length;
                const totalCount = displayedTasks.filter((t) => t.status !== 'not_required').length;

                return (
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                      <div>
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                          Daftar Checklist {isProjectMinuta(project.status) ? 'Minuta' : 'Tugas'} ({completedCount}/{totalCount})
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">Kelola tugas operasional, berkas persyaratan, dan kelengkapan minuta.</p>
                      </div>
                    </div>

                    {/* Tasks List */}
                    {displayedTasks.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        Belum ada checklist tugas untuk proyek ini. Silakan buat checklist di bawah.
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
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
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
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
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
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
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
                    <form onSubmit={handleAddTask} className="mt-5 pt-4 border-t border-slate-100 flex gap-2">
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
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[13px] rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tambah</span>
                      </button>
                    </form>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: DOKUMEN PROYEK */}
          {/* ======================================================== */}
          {activeDetailTab === 'dokumen' && (
            <div className="space-y-6">
              {/* PPAT Document Generator & Sections if PPAT */}
              {isPPAT && (
                <PPATProjectDocumentsSection
                  project={project}
                  currentUser={currentUser}
                  isSelectModalOpenExternal={isPPATSelectDocOpen}
                  setIsSelectModalOpenExternal={setIsPPATSelectDocOpen}
                  onOpenCreateDocument={(docTypeConfig: PPATDocTypeConfig) => {
                    const newDoc: PPATDocumentItem = {
                      id: 'ppat_doc_' + Math.random().toString(36).substring(2, 9),
                      documentType: docTypeConfig.id,
                      typeId: docTypeConfig.id,
                      title: docTypeConfig.defaultTitle || docTypeConfig.title,
                      category: docTypeConfig.category,
                      status: 'draft',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      letterDate: new Date().toISOString().split('T')[0],
                      letterLocation: project.ppatData?.object?.city || 'Kabupaten Bandung Barat',
                      specificData: {}
                    };
                    setActivePPATDoc(newDoc);
                    setWorkMode('ppat_doc_editor');
                  }}
                  onEditDocument={(docItem) => {
                    setActivePPATDoc(docItem);
                    setWorkMode('ppat_doc_editor');
                  }}
                  onDeleteDocument={handleDeletePPATDocument}
                  onManageBaseData={() => {
                    setWorkMode('ppat_base_data');
                  }}
                />
              )}

              {/* General Project Document Upload Component */}
              <ProjectDocumentUpload project={project} currentUser={currentUser} key={documentUploadKey} />
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: KLIEN & PERSONIL */}
          {/* ======================================================== */}
          {activeDetailTab === 'klien' && (
            <div className="space-y-6">
              {/* Immutable Snapshot Section */}
              {(project.clientSnapshot || project.changeSnapshot) ? (
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                    <h2 className="text-[14px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-blue-600" />
                      <span>Snapshot Hukum Proyek</span>
                    </h2>
                    <div className="flex items-center gap-2">
                      {isFinal ? (
                        <span className="px-2.5 py-0.5 text-[10px] bg-slate-100 text-slate-600 border border-slate-200 rounded-full font-bold uppercase tracking-wider">
                          🔒 Dokumen Final (Terkunci)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-500 border border-slate-200 rounded-full font-mono font-bold uppercase tracking-wider">
                          Snapshot Active
                        </span>
                      )}
                    </div>
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


            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: TIMELINE & RIWAYAT */}
          {/* ======================================================== */}
          {activeDetailTab === 'timeline' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Chronological Vertical Timeline Log */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs">
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

                            {timeline.changes && timeline.changes.length > 0 && (
                              <div className="pt-2 mt-2 border-t border-slate-100 space-y-1.5">
                                <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                                  <FileText className="w-3 h-3 text-blue-500" />
                                  <span>Rincian Perubahan Dokumen ({timeline.changes.length}):</span>
                                </span>
                                <div className="space-y-1 font-mono text-[11px]">
                                  {(expandedTimelineIds[timeline.id] ? timeline.changes : timeline.changes.slice(0, 3)).map((ch, cidx) => (
                                    <div key={cidx} className="flex flex-col bg-slate-50 p-2 rounded border border-slate-100 gap-1">
                                      <span className="font-bold text-blue-600">{ch.field}:</span>
                                      <div className="flex items-center gap-2 flex-wrap text-xs">
                                        <span className="text-red-500 line-through bg-red-50 px-1 py-0.5 rounded border border-red-100">{String(ch.before || 'KOSONG')}</span>
                                        <ChevronRight className="w-3 h-3 text-slate-400" />
                                        <span className="text-emerald-600 font-bold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">{String(ch.after || 'KOSONG')}</span>
                                      </div>
                                    </div>
                                  ))}
                                  {timeline.changes.length > 3 && (
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandTimeline(timeline.id)}
                                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline pt-1 flex items-center gap-1 cursor-pointer"
                                    >
                                      {expandedTimelineIds[timeline.id] ? (
                                        <>
                                          <ChevronUp className="w-3 h-3" />
                                          Sembunyikan sebagian ({timeline.changes.length - 3} item)
                                        </>
                                      ) : (
                                        <>
                                          <ChevronDown className="w-3 h-3" />
                                          Lihat {timeline.changes.length - 3} perubahan selengkapnya...
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            <span className="text-[10px] text-slate-400 font-semibold block pt-0.5">
                              Oleh: {timeline.createdBy}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                {/* Company Legal History Tracker */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
                  <h2 className="text-[14px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>Riwayat Sejarah Legal Perusahaan</span>
                  </h2>
                  <div className="relative border-l-2 border-blue-100 pl-4 space-y-5 ml-2 text-xs">
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

                {/* Related Projects Section */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
                  <h2 className="text-[14px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    <span>Proyek Terkait ({relatedProjects.length})</span>
                  </h2>
                  {relatedProjects.length === 0 ? (
                    <p className="text-slate-450 text-xs italic">Tidak ada proyek terkait lainnya untuk klien ini.</p>
                  ) : (
                    <div className="space-y-2.5 text-xs">
                      {relatedProjects.map((p) => (
                        <div key={p.projectId} className="p-3 bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-xl transition-all space-y-1">
                          <span className="font-bold text-slate-800 block text-[13px]">
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
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: CATATAN & MINUTA */}
          {/* ======================================================== */}
          {activeDetailTab === 'catatan' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tambah Catatan Proyek */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
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
                    rows={4}
                    className="w-full px-3 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-lg outline-none transition-all focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveProjectNote}
                      disabled={savingProjectNote}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition-all flex items-center gap-2 cursor-pointer"
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

              {/* Catatan Proyek Minuta */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
                <h2 className="text-[14px] font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span>Catatan Minuta & Arsip Akta</span>
                </h2>
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
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-all flex items-center gap-2 cursor-pointer"
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

              {/* Form Akta/Deed (Koreksi / Lengkapi Data Akta) */}
              {['rups_lb', 'sirkuler_rupslb', 'pendirian_pt', 'input_nib', 'perbaikan_data_ahu', 'buka_blokir'].includes(project?.jobType || '') && (
                <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <h2 className="text-[14px] font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>Koreksi / Lengkapi Data Akta & Administrasi</span>
                    </h2>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {project?.title}
                    </span>
                  </div>

                  {renderDeedFields()}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSaveDeedInfoOnly}
                      disabled={savingDeedInfo}
                      className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-[13px] rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 7: INVOICE & KEUANGAN */}
          {/* ======================================================== */}
          {activeDetailTab === 'keuangan' && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-6">
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-emerald-600" />
                    <span>Keuangan & Penagihan Proyek</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Kelola penawaran biaya jasa notaris, tagihan klien (invoice), dan status pembayaran.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const clientName = (project.clientSnapshot as any)?.name || project.clientSnapshot?.companyName || (project as any).clientName || '';
                      const title = project.title || '';
                      window.location.hash = `#/invoice?new=true&projectId=${encodeURIComponent(project.projectId)}&clientId=${encodeURIComponent(project.clientId || '')}&clientName=${encodeURIComponent(clientName)}&title=${encodeURIComponent(title)}`;
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <FileText size={13} />
                    <span>+ Buat Invoice Baru</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const clientName = (project.clientSnapshot as any)?.name || project.clientSnapshot?.companyName || (project as any).clientName || '';
                      const title = project.title || '';
                      window.location.hash = `#/quotations/new?projectId=${encodeURIComponent(project.projectId)}&clientId=${encodeURIComponent(project.clientId || '')}&clientName=${encodeURIComponent(clientName)}&title=${encodeURIComponent(title)}`;
                    }}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <File size={13} />
                    <span>+ Buat Penawaran</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 bg-blue-50/40 rounded-xl border border-blue-100 space-y-2">
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">Tagihan (Invoice)</span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Terbitkan invoice resmi lengkap dengan rincian biaya PNBP, honorarium notaris, dan nomor rekening transfer kantor.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const clientName = (project.clientSnapshot as any)?.name || project.clientSnapshot?.companyName || (project as any).clientName || '';
                      const title = project.title || '';
                      window.location.hash = `#/invoice?new=true&projectId=${encodeURIComponent(project.projectId)}&clientId=${encodeURIComponent(project.clientId || '')}&clientName=${encodeURIComponent(clientName)}&title=${encodeURIComponent(title)}`;
                    }}
                    className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                  >
                    Buka Formulir Invoice &rarr;
                  </button>
                </div>

                <div className="p-5 bg-purple-50/40 rounded-xl border border-purple-100 space-y-2">
                  <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block">Surat Penawaran</span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Kirim estimasi penawaran harga pengerjaan akta kepada klien sebelum proyek resmi dimulai atau sebelum proses penandatanganan.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const clientName = (project.clientSnapshot as any)?.name || project.clientSnapshot?.companyName || (project as any).clientName || '';
                      const title = project.title || '';
                      window.location.hash = `#/quotations/new?projectId=${encodeURIComponent(project.projectId)}&clientId=${encodeURIComponent(project.clientId || '')}&clientName=${encodeURIComponent(clientName)}&title=${encodeURIComponent(title)}`;
                    }}
                    className="mt-2 text-xs font-bold text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1"
                  >
                    Buka Formulir Penawaran &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 8: PENGATURAN */}
          {/* ======================================================== */}
          {activeDetailTab === 'pengaturan' && (
            <div className="space-y-6">
              {/* RUPS LB AGENDA PERUBAHAN SECTION */}
              {(project.jobType === 'rups_lb' || 
                project.projectType === 'RUPS LB' || 
                project.projectType === 'RUPS-LB' || 
                project.projectType === 'PKPS RUPS-LB') && (
                <div className="bg-white border border-purple-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between gap-3 border-b border-purple-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                      <h2 className="text-[14px] font-bold text-purple-950 uppercase tracking-wide">
                        Agenda Perubahan RUPS LB
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAgendaModalOpen(true)}
                      className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100/80 font-bold text-xs rounded-lg border border-purple-200 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Edit3 size={13} />
                      <span>Kelola Agenda Perubahan</span>
                    </button>
                  </div>

                  {/* Agendas Display */}
                  {(() => {
                    const agendas = project.changeAgendas || project.metadata?.changeAgendas || project.metadata?.agendas || [];
                    if (agendas.length === 0) {
                      return (
                        <div className="p-4 bg-purple-50/50 rounded-xl border border-dashed border-purple-200 text-center space-y-2">
                          <p className="text-xs text-purple-800 font-medium">
                            Belum ada agenda perubahan yang dicatat untuk RUPS LB ini.
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsAgendaModalOpen(true)}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <Plus size={13} />
                            <span>Pilih Agenda Perubahan Sekarang</span>
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 font-semibold">
                            Daftar agenda perubahan yang diputuskan ({agendas.length} agenda):
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {agendas.map((ag: string, idx: number) => {
                            const matched = RUPS_LB_AGENDAS.find(a => a.label === ag || a.shortLabel === ag || a.id === ag);
                            const colorClass = matched?.badgeColor || 'bg-purple-50 text-purple-700 border-purple-200';
                            return (
                              <span
                                key={idx}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-bold shadow-2xs flex items-center gap-1.5 ${colorClass}`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                <span>{ag}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Status Transition Engine Guard Form */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs">
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
                          const currentIndex = StatusEngine.findStepIndex(workflow?.steps || [], project.status);
                          const stepIndex = StatusEngine.findStepIndex(workflow?.steps || [], step);
                          return currentIndex === -1 || stepIndex === -1 || Math.abs(stepIndex - currentIndex) <= 1;
                        })
                        .map((step) => (
                          <option key={step} value={step}>
                            {step.toUpperCase()} {StatusEngine.normalizeStep(step) === StatusEngine.normalizeStep(project.status) ? '(Aktif Saat Ini)' : ''}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Catatan Transisi (Opsional)</label>
                    <textarea
                      value={transitionComment}
                      onChange={(e) => setTransitionComment(e.target.value)}
                      placeholder="Masukkan alasan transisi... atau tambahkan catatan mandiri pada kotak Catatan Proyek jika status tidak berubah"
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
                            const currentIndex = StatusEngine.findStepIndex(workflow.steps, project.status);
                            const targetIndex = StatusEngine.findStepIndex(workflow.steps, transitionStatus);
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

                  <button
                    type="submit"
                    disabled={transitioning || transitionStatus === project.status}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[13px] rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {transitioning ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
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

              {/* Danger Zone: Hapus Proyek */}
              {currentUser.role === 'Super Admin' && (
                <div className="bg-red-50/50 border border-red-200 rounded-2xl p-6 space-y-3">
                  <h3 className="text-xs font-bold text-red-800 uppercase tracking-wider">Danger Zone</h3>
                  <p className="text-xs text-red-600 leading-relaxed">
                    Menghapus proyek ini akan menghapus semua checklist tugas, riwayat timeline, dan link dokumen secara permanen. Tindakan ini tidak dapat dibatalkan.
                  </p>
                  <button
                    type="button"
                    onClick={handleDeleteProject}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>Hapus Proyek Ini Selamanya</span>
                  </button>
                </div>
              )}
            </div>
          )}
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

        {/* MODAL KELOLA AGENDA PERUBAHAN RUPS LB */}
        {isAgendaModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-purple-200 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 bg-gradient-to-r from-purple-900 to-indigo-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-purple-400"></span>
                  <h3 className="text-base font-extrabold tracking-wide uppercase font-heading">
                    Kelola Agenda Perubahan RUPS LB
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAgendaModalOpen(false)}
                  className="text-purple-200 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-purple-50 p-3 rounded-xl border border-purple-100">
                  <p className="text-xs text-purple-900 font-semibold">
                    Pilih agenda perubahan yang dicatat untuk proyek ini:
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedAgendasList(['pengurus', 'pemegang_saham'])}
                      className="px-2 py-1 text-[10px] font-bold bg-white text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-md shadow-2xs cursor-pointer"
                    >
                      Pengurus & Saham
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAgendasList(RUPS_LB_AGENDAS.filter(a => a.id !== 'lainnya').map(a => a.id))}
                      className="px-2 py-1 text-[10px] font-bold bg-white text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-md shadow-2xs cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAgendasList([]);
                        setCustomAgendaInput('');
                      }}
                      className="px-2 py-1 text-[10px] font-bold bg-white text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-md shadow-2xs cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Checkboxes Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {RUPS_LB_AGENDAS.map(agenda => {
                    const isChecked = selectedAgendasList.includes(agenda.id);
                    return (
                      <label
                        key={agenda.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none text-[12.5px] font-semibold ${
                          isChecked
                            ? 'bg-purple-50 border-purple-400 text-purple-950 shadow-xs'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedAgendasList(prev => {
                              const exists = prev.includes(agenda.id);
                              return exists ? prev.filter(id => id !== agenda.id) : [...prev, agenda.id];
                            });
                          }}
                          className="mt-0.5 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-purple-300"
                        />
                        <span className="leading-snug flex-1">{agenda.label}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Custom Agenda Input */}
                {selectedAgendasList.includes('lainnya') && (
                  <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-200 space-y-1.5 animate-fade-in">
                    <label className="text-xs font-bold text-purple-900 block">
                      Rincian Agenda Perubahan Lainnya:
                    </label>
                    <input
                      type="text"
                      value={customAgendaInput}
                      onChange={(e) => setCustomAgendaInput(e.target.value)}
                      placeholder="Contoh: Perubahan nama merek dagang perseroan..."
                      className="w-full px-3 py-2 text-xs bg-white border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                <span className="text-xs text-purple-900 font-bold">
                  {selectedAgendasList.length} agenda dipilih
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAgendaModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAgendas}
                    disabled={savingAgendas}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    {savingAgendas ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>Simpan Agenda Perubahan</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Tetapkan Staff Penanggung Jawab */}
        {isAssignStaffOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full overflow-hidden animate-slideUp">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-slate-800 text-[14px]">Tetapkan Penanggung Jawab</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAssignStaffOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Pilih Staff
                  </label>
                  <select
                    value={selectedStaffToAssign || project.assignedTo || ''}
                    onChange={(e) => setSelectedStaffToAssign(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">-- Belum Ditugaskan (Unassigned) --</option>
                    {staffList.map((st) => (
                      <option key={st.uid} value={st.name}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAssignStaffOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAssignStaff(selectedStaffToAssign)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Ubah Data PIC Klien */}
        {isEditPicModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full overflow-hidden animate-slideUp">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-teal-600" />
                  <h3 className="font-bold text-slate-800 text-[14px]">Data PIC (Person In Charge)</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditPicModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Sapaan
                  </label>
                  <select
                    value={picTitleInput}
                    onChange={(e) => setPicTitleInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Bapak">Bapak</option>
                    <option value="Ibu">Ibu</option>
                    <option value="Sdr">Sdr</option>
                    <option value="Sdri">Sdri</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Nama PIC
                  </label>
                  <input
                    type="text"
                    value={picNameInput}
                    onChange={(e) => setPicNameInput(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="tel"
                    value={picPhoneInput}
                    onChange={(e) => setPicPhoneInput(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditPicModalOpen(false)}
                    disabled={savingPic}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePic}
                    disabled={savingPic}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {savingPic ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>Simpan Data PIC</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Set Target Selesai */}
        {isSetTargetOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full overflow-hidden animate-slideUp">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-slate-800 text-[14px]">Set Target Selesai Proyek</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSetTargetOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Tanggal Target
                  </label>
                  <input
                    type="date"
                    value={newTargetDate || (project as any).targetDate || ''}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsSetTargetOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetTargetDate(newTargetDate)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Simpan Target
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Ubah Status Proyek & Opsi Catatan */}
        {isStatusModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-slideUp">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[15px] leading-tight">Ubah Status Proyek</h3>
                    <p className="text-[11px] text-blue-150 leading-tight truncate max-w-xs">
                      {project?.title || 'Proyek'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsStatusModalOpen(false);
                    setStatusChangeNote('');
                  }}
                  className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                {/* Visual Status Transition Flow */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Alur Perubahan Status
                  </span>
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Status Sekarang</span>
                      <span className="text-xs font-bold text-slate-700 uppercase line-clamp-1">
                        {project?.status}
                      </span>
                    </div>

                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <ChevronRight className="w-4 h-4" />
                    </div>

                    <div className="flex-1 bg-blue-50/70 p-2.5 rounded-lg border border-blue-200 shadow-2xs">
                      <span className="text-[10px] text-blue-500 font-semibold block uppercase tracking-wider">Status Baru</span>
                      <select
                        value={targetStatusToChange}
                        onChange={(e) => setTargetStatusToChange(e.target.value)}
                        className="w-full text-xs font-bold text-blue-900 bg-transparent uppercase outline-none cursor-pointer"
                      >
                        {(workflow?.steps || []).map((step) => (
                          <option key={step} value={step} className="text-slate-800 normal-case">
                            {step.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Input Opsi Catatan */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Catatan Progres / Keterangan</span>
                      <span className="text-[10px] font-normal text-slate-400 lowercase">(opsional)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Tersimpan ke Timeline</span>
                  </div>

                  <textarea
                    value={statusChangeNote}
                    onChange={(e) => setStatusChangeNote(e.target.value)}
                    rows={3}
                    placeholder="Tulis catatan perkembangan di sini (misal: Menunggu verifikasi berkas dari klien, notulen telah disetujui, akta siap ditandatangani, dsb)..."
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
                  />

                  {/* Quick Note Chips */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-medium block">Template catatan cepat:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Dokumen persyaratan lengkap",
                        "Menunggu konfirmasi klien",
                        "Draft notulen selesai dikoreksi",
                        "Menunggu tanda tangan para pihak",
                        "Proses pendaftaran di AHU",
                        "Pemberkasan minuta lengkap"
                      ].map((chip, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => {
                            if (!statusChangeNote.trim()) {
                              setStatusChangeNote(chip);
                            } else {
                              setStatusChangeNote(prev => `${prev} • ${chip}`);
                            }
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsStatusModalOpen(false);
                      setStatusChangeNote('');
                    }}
                    disabled={transitioning}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmStatusChange()}
                    disabled={transitioning || !targetStatusToChange}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {transitioning ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Memperbarui Status...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Simpan Perubahan Status</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        <ToastNotification
          toast={toast}
          onClose={() => setToast(null)}
        />

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
