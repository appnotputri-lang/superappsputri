import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, ChevronDown, ChevronRight, Loader2, Save, Download, Trash2, Edit, Eye, 
  FileText, FileCode, ArrowRight, Info, AlertCircle, Trash, Check, X,
  SlidersHorizontal, ChevronLeft, HelpCircle, RefreshCw, Send, CheckCircle2, AlertTriangle, Briefcase, FileBadge,
  UserPlus, ShieldAlert, KeyRound, Building, PlusCircle, ExternalLink, ArrowLeft
} from 'lucide-react';
import { db } from '../../../lib/firebase';
import { doc, setDoc, deleteDoc, getDoc, collection, onSnapshot, query } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../../lib/firebase';
import { sanitizeForFirestore } from '../../../utils/sanitize';
import { ProjectService } from '../../../services/ProjectService';
import { CompanyService } from '../../../services/CompanyService';
import { compareCompanyDocumentDiff } from '../../../lib/diffUtils';
import { DocumentGenerationService } from '../../../services/DocumentGenerationService';
import { DocumentStatusBadge } from '../../../../components/DocumentStatusBadge';
import { AhuSection, AhuLabel, AhuInput, AhuSelect, AhuMasaJabatanSelector } from '../../../../App';
import DraftAktaApp, { DraftAktaAppRef } from '../../../DraftAktaApp';
import DraftAktaRUPS from '../../../DraftAktaRUPS';
import { INITIAL_STATE, sanitizeCompanyData } from '../../../domain/company/initialCompanyData';

import { History, Archive, Coins, Users, FileSignature, CheckSquare, XCircle, Search, Calendar, Play, ArrowRightLeft, TrendingUp, MapPin } from 'lucide-react';
import JSZip from 'jszip';
import { formatInputNumber, parseFormattedNumber } from '../../../../utils/formatters';
import { MeetingFormShell } from '../../../components/MeetingFormShell';
import ShareholderEditor from '../../../components/editors/ShareholderEditor';
import CompositionEditor from '@/components/CompositionEditor';
import ManagementEditor from '@/components/ManagementEditor';
import { generateRUPSTDocx } from '../../../lib/generateRUPSTDocx';
import { generateRUPSTAktaDocx } from '../../../lib/generateRUPSTAktaDocx';
import { generateSirkulerLaporanDocx } from '../../../lib/generateSirkulerLaporanDocx';
import { generateRUPSTPernyataanDocx } from '../../../lib/generateRUPSTPernyataanDocx';
import { generateWordDoc } from '../../../../utils/docxGenerator';
import { fetchLatestDeedNumbers } from '../../../lib/deedUtils';
import { CompanyProfile, ResolutionFlags } from '@/types';
import { DomicileSelector } from '@/components/AddressFields';
import { ClientProjectSyncService, ClientSyncSelection } from '../../../services/ClientProjectSyncService';
import { PullClientDataModal } from '../../../components/common/PullClientDataModal';
import { ToastNotification, ToastState } from '../../../components/common/ToastNotification';
import { DocumentDraftService, UnifiedDraftItem } from '../../../services/DocumentDraftService';
import { DocumentDraftListView, DownloadOption } from '../components/DocumentDraftListView';
import { RUPSLBFormFields } from './RUPSLBFormFields';

export interface RUPSLBPageProps {
  user: any;
  userProfile: any;
  projects: any[];
  profiles: any[];
  editingProjectId: string | null;
  setEditingProjectId: (id: string | null) => void;
  activeProjectContext: string | null;
  setActiveProjectContext: (id: string | null) => void;
  setSelectedProjectId: (id: string | null) => void;
  setActiveSidebarTab: (tab: any) => void;

  data: any;
  setData: (d: any) => void;
  updateData: (d: any) => void;
  resetData: () => void;
  mergedData: any;
  isSaving: boolean;
  setIsSaving: (s: boolean) => void;
  isSyncing: boolean;
  handleManualSync: (type: string, data: any) => Promise<boolean>;
  recordNotification: (title: string, desc: string, type: string) => void;

  isRupsPreview: boolean;
  setIsRupsPreview: (v: boolean) => void;
  isRupslbDocDropdownOpen: boolean;
  setIsRupslbDocDropdownOpen: (v: boolean) => void;
  rupslbDropdownId: string | null;
  setRupslbDropdownId: (id: string | null) => void;

  notulenSearchQuery: string;
  setNotulenSearchQuery: (q: string) => void;
  selectedRupslbYear: string;
  setSelectedRupslbYear: (y: string) => void;
  rupslbSortField: string;
  setRupslbSortField: (f: string) => void;
  rupslbSortOrder: "asc" | "desc";
  setRupslbSortOrder: (o: "asc" | "desc") => void;
  rupslbCurrentPage: number;
  setRupslbCurrentPage: (p: number) => void;
  isRupslbFilterOpen: boolean;
  setIsRupslbFilterOpen: (o: boolean) => void;

  handleExportWord: () => Promise<void>;
  draftAktaRef: React.RefObject<DraftAktaAppRef>;

  isAddKbliModalOpen: boolean;
  setIsAddKbliModalOpen: (o: boolean) => void;
  kbliModalSearchTerm: string;
  setKbliModalSearchTerm: (t: string) => void;
  kbliModalSearchResults: any[];
  setKbliModalSearchResults: (r: any[]) => void;
  kbliCurrentPage: number;
  setKbliCurrentPage: (p: number) => void;
  kbliCheckedKblis: string[];
  setKbliCheckedKblis: (k: string[]) => void;
  performKbliModalSearch: () => void;

  AutoSaveIndicatorComponent: React.ComponentType;
  openShareholderEditor: (type: 'lama' | 'baru' | 'pengganti' | 'pengganti_saham', sh?: any, dismissalId?: string) => void;
  deleteShareholder: (id: string, mode: 'lama' | 'baru') => void;
  rupstProjects: any[];
  pendirianProjects: any[];
  handleFetchLatestNumbers: () => Promise<void>;
  isFetchingNumbers: boolean;
}

const calculateFinalShareholders = (currentData: any): any[] => {
  const originalShareholders = currentData.shareholders || [];
  const resolutions = currentData.resolutions || {};
  const hasCapitalPaid = resolutions.capitalPaid;
  const hasShareholdersChange = resolutions.shareholders;

  const shMap = new Map<string, any>();
  originalShareholders.forEach((sh: any) => {
    const nameKey = (sh.name || '').trim().toUpperCase();
    if (nameKey) {
      shMap.set(nameKey, {
        ...sh,
        sharesOwned: Number(sh.sharesOwned || 0),
        finalShares: Number(sh.sharesOwned || 0)
      });
    }
  });

  if (hasCapitalPaid && currentData.capitalSubscriptionsNew) {
    currentData.capitalSubscriptionsNew.forEach((sub: any) => {
      const nameKey = (sub.subscriberName || '').trim().toUpperCase();
      const sharesCount = Number(sub.sharesCount || 0);
      if (nameKey && sharesCount > 0) {
        if (shMap.has(nameKey)) {
          const existing = shMap.get(nameKey);
          existing.sharesOwned = (existing.sharesOwned || 0) + sharesCount;
          existing.finalShares = (existing.finalShares || 0) + sharesCount;
        } else {
          shMap.set(nameKey, {
            id: sub.id || Math.random().toString(36).substring(7),
            name: sub.subscriberName,
            sharesOwned: sharesCount,
            finalShares: sharesCount,
            isExistingParty: false,
            salutation: 'Tuan',
            nationality: 'Indonesia'
          });
        }
      }
    });
  }

  if (hasShareholdersChange) {
    const transfers = currentData.shareTransfersNew || currentData.shareTransfers || [];
    transfers.forEach((t: any) => {
      const transferAmt = Number(t.sharesTransferred || t.shares || 0);
      if (transferAmt <= 0) return;

      let fromSh: any = null;
      let fromKey = '';

      if (t.fromShareholderId) {
        for (const [key, sh] of shMap.entries()) {
          if (sh.id === t.fromShareholderId || sh.linkedPartyId === t.fromShareholderId) {
            fromSh = sh;
            fromKey = key;
            break;
          }
        }
      }

      if (!fromSh && t.fromName) {
        const testKey = t.fromName.trim().toUpperCase();
        if (shMap.has(testKey)) {
          fromSh = shMap.get(testKey);
          fromKey = testKey;
        }
      }

      if (fromSh) {
        fromSh.sharesOwned = Math.max(0, (fromSh.sharesOwned || 0) - transferAmt);
        fromSh.finalShares = Math.max(0, (fromSh.finalShares || 0) - transferAmt);
      }

      const toName = t.toName || t.toDetail?.name || '';
      const toKey = toName.trim().toUpperCase();

      if (toKey) {
        if (shMap.has(toKey)) {
          const toSh = shMap.get(toKey);
          toSh.sharesOwned = (toSh.sharesOwned || 0) + transferAmt;
          toSh.finalShares = (toSh.finalShares || 0) + transferAmt;
        } else {
          const toDetail = t.toDetail || {};
          shMap.set(toKey, {
            ...toDetail,
            id: toDetail.id || t.toShareholderId || Math.random().toString(36).substring(7),
            name: toName,
            sharesOwned: transferAmt,
            finalShares: transferAmt,
            isExistingParty: false,
            salutation: t.toSalutation || toDetail.salutation || 'Tuan',
            nik: t.toNik || toDetail.nik || '',
            nationality: toDetail.nationality || 'Indonesia',
            address: toDetail.address || {}
          });
        }
      }
    });
  }

  return Array.from(shMap.values())
    .map(sh => {
      const price = currentData.originalSharePrice || 1000000;
      return {
        ...sh,
        finalAmount: sh.sharesOwned * price
      };
    })
    .filter((sh: any) => sh.sharesOwned > 0 || sh.isManagement || (sh.managementPosition && sh.managementPosition.length > 0));
};

class PageErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error('[PageErrorBoundary] Caught error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-white border border-red-200 rounded-xl my-6 shadow-sm">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">
            ⚠️
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">Terjadi Kendala Memuat Form</h3>
          <p className="text-xs text-red-500 font-mono mb-4">{this.state.error?.message || 'Error tidak terduga'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-all cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const RUPSLBPageInternal: React.FC<RUPSLBPageProps> = ({
  user,
  userProfile,
  projects,
  profiles,
  editingProjectId,
  setEditingProjectId,
  activeProjectContext,
  setActiveProjectContext,
  setSelectedProjectId,
  setActiveSidebarTab,

  data,
  setData,
  updateData,
  resetData,
  mergedData,
  isSaving,
  setIsSaving,
  isSyncing,
  handleManualSync,
  recordNotification,

  isRupsPreview,
  setIsRupsPreview,
  isRupslbDocDropdownOpen,
  setIsRupslbDocDropdownOpen,
  rupslbDropdownId,
  setRupslbDropdownId,

  notulenSearchQuery,
  setNotulenSearchQuery,
  selectedRupslbYear,
  setSelectedRupslbYear,
  rupslbSortField,
  setRupslbSortField,
  rupslbSortOrder,
  setRupslbSortOrder,
  rupslbCurrentPage,
  setRupslbCurrentPage,
  isRupslbFilterOpen,
  setIsRupslbFilterOpen,

  handleExportWord,
  draftAktaRef,

  isAddKbliModalOpen,
  setIsAddKbliModalOpen,
  kbliModalSearchTerm,
  setKbliModalSearchTerm,
  kbliModalSearchResults,
  setKbliModalSearchResults,
  kbliCurrentPage,
  setKbliCurrentPage,
  kbliCheckedKblis,
  setKbliCheckedKblis,
  performKbliModalSearch,

  AutoSaveIndicatorComponent,
  openShareholderEditor,
  deleteShareholder,
  rupstProjects,
  pendirianProjects,
  handleFetchLatestNumbers,
  isFetchingNumbers
}) => {
  const [showPullModal, setShowPullModal] = useState(false);
  const [isPullingClient, setIsPullingClient] = useState(false);
  const [freshClientForModal, setFreshClientForModal] = useState<CompanyProfile | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [liveProjects, setLiveProjects] = useState<any[]>([]);
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'projects'));
    const unsub = onSnapshot(q, (snapshot) => {
      const loaded: any[] = [];
      snapshot.forEach(d => {
        loaded.push({ id: d.id, ...d.data() });
      });
      setLiveProjects(loaded);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'projects');
    });
    return () => unsub();
  }, []);

  const combinedProjects = useMemo(() => {
    const map = new Map<string, any>();
    (projects || []).forEach(p => { if (p.id) map.set(p.id, p); });
    liveProjects.forEach(p => { if (p.id) map.set(p.id, p); });
    return Array.from(map.values());
  }, [projects, liveProjects]);

  const unifiedRupslbDraftItems = useMemo(() => {
    return combinedProjects.map(p => DocumentDraftService.mapToUnifiedDraft('rupslb', p));
  }, [combinedProjects]);

  const uniqueRupslbYears = useMemo(() => {
    return Array.from(new Set(
      combinedProjects
        .map(p => p.signingDate ? new Date(p.signingDate).getFullYear().toString() : "")
        .filter(Boolean)
    )).sort((a, b) => Number(b) - Number(a));
  }, [combinedProjects]);

  const handleOpenPullClientModal = async () => {
    let targetClientId = data.selectedProfileId;
    if (!targetClientId && activeProjectContext) {
      const proj = combinedProjects.find(p => p.id === activeProjectContext) || (await ProjectService.getProject(activeProjectContext));
      targetClientId = proj?.clientId;
    }
    if (!targetClientId) {
      setToast({ type: 'error', message: 'ID Klien / Profil belum dipilih atau tidak ditemukan.' });
      return;
    }
    setIsPullingClient(true);
    try {
      const fresh = await ClientProjectSyncService.getFreshClientProfile(targetClientId);
      if (!fresh) throw new Error('Data Klien di Master Client tidak ditemukan.');
      setFreshClientForModal(fresh);
      setShowPullModal(true);
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Gagal memuat profil klien terbaru.' });
    } finally {
      setIsPullingClient(false);
    }
  };

  const handleConfirmPullClient = async (selection: ClientSyncSelection) => {
    let targetClientId = data.selectedProfileId;
    if (!targetClientId && activeProjectContext) {
      const proj = combinedProjects.find(p => p.id === activeProjectContext) || (await ProjectService.getProject(activeProjectContext));
      targetClientId = proj?.clientId;
    }
    if (!targetClientId) return;

    setIsPullingClient(true);
    try {
      const result = await ClientProjectSyncService.pullLatestClientData({
        projectId: activeProjectContext || '',
        clientId: targetClientId,
        jobType: data.documentType === 'CIRCULAR' ? 'sirkuler_rupslb' : 'rups_lb',
        currentFormData: data,
        refId: editingProjectId || undefined,
        selection
      });

      if (result.success) {
        updateData(result.updatedFormData);
        setShowPullModal(false);
        setToast({
          type: 'success',
          message: 'Data Klien berhasil diperbarui dari Profil Klien terbaru.'
        });
      }
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err.message || 'Gagal memperbarui data dari Master Client.'
      });
    } finally {
      setIsPullingClient(false);
    }
  };
  
  const updateAddress = (type: 'oldAddress' | 'newAddress', updates: any) => {
    updateData({
      [type]: { ...(data[type] || {}), ...updates }
    });
  };

  const toggleResolution = (key: keyof ResolutionFlags) => {
    const newVal = !data.resolutions[key];
    let updatedResolutions = { ...data.resolutions, [key]: newVal };
    
    if (key === 'domicile' && newVal) {
      updatedResolutions.address = true;
    }
    
    const updates: any = { resolutions: updatedResolutions };

    if ((key === 'shareholders' || key === 'management' || key === 'capitalPaid') && newVal && (!data.finalShareholders || data.finalShareholders.length === 0)) {
      updates.finalShareholders = calculateFinalShareholders(data);
    }

    if ((key === 'shareholders' || key === 'management') && newVal && (!data.finalManagement || data.finalManagement.length === 0)) {
      updates.finalManagement = (data.management || []).map((m: any) => ({
        ...m,
        status: 'tetap' as const
      }));
    }

    updateData(updates);
  };

  const updateManualRep = (updates: any) => {
    updateData({
      manualRepresentative: { ...(data.manualRepresentative || {}), ...updates }
    });
  };

  // Save Draft & Google Drive Upload Options Modal State
  const [isSaveDriveModalOpen, setIsSaveDriveModalOpen] = useState(false);
  const [saveDriveNone, setSaveDriveNone] = useState(true);
  const [saveDriveNotulen, setSaveDriveNotulen] = useState(false);
  const [saveDriveAkta, setSaveDriveAkta] = useState(false);
  const [saveDrivePeralihan, setSaveDrivePeralihan] = useState(false);

  // Check if there is an agenda creating share transfers
  const hasShareTransferAgenda = useMemo(() => {
    const transfers = (data.shareTransfersNew && data.shareTransfersNew.length > 0)
      ? data.shareTransfersNew
      : (data.shareTransfers || []);
    return Boolean(
      data.resolutions?.shareholders ||
      transfers.length > 0 ||
      draftAktaRef?.current?.hasTransfers
    );
  }, [data.resolutions?.shareholders, data.shareTransfersNew, data.shareTransfers, draftAktaRef]);

  const handleOpenSaveModal = () => {
    if (!data.companyName) {
      alert('Nama perseroan harus diisi!');
      return;
    }
    setSaveDriveNone(true);
    setSaveDriveNotulen(false);
    setSaveDriveAkta(false);
    setSaveDrivePeralihan(false);
    setIsSaveDriveModalOpen(true);
  };

  const handleSelectNone = () => {
    setSaveDriveNone(true);
    setSaveDriveNotulen(false);
    setSaveDriveAkta(false);
    setSaveDrivePeralihan(false);
  };

  const handleToggleNotulen = () => {
    if (saveDriveNone) {
      setSaveDriveNone(false);
      setSaveDriveNotulen(true);
      return;
    }
    const next = !saveDriveNotulen;
    setSaveDriveNotulen(next);
    if (!next && !saveDriveAkta && !saveDrivePeralihan) {
      setSaveDriveNone(true);
    }
  };

  const handleToggleAkta = () => {
    if (saveDriveNone) {
      setSaveDriveNone(false);
      setSaveDriveAkta(true);
      return;
    }
    const next = !saveDriveAkta;
    setSaveDriveAkta(next);
    if (!saveDriveNotulen && !next && !saveDrivePeralihan) {
      setSaveDriveNone(true);
    }
  };

  const handleTogglePeralihan = () => {
    if (saveDriveNone) {
      setSaveDriveNone(false);
      setSaveDrivePeralihan(true);
      return;
    }
    const next = !saveDrivePeralihan;
    setSaveDrivePeralihan(next);
    if (!saveDriveNotulen && !saveDriveAkta && !next) {
      setSaveDriveNone(true);
    }
  };

  // Common Save Handler for RUPS LB
  const handleConfirmSaveDraft = async () => {
    setIsSaving(true);
    try {
      const allowedKinds: ('notulen' | 'akta' | 'peralihan_saham')[] = [];
      if (!saveDriveNone) {
        if (saveDriveNotulen) allowedKinds.push('notulen');
        if (saveDriveAkta) allowedKinds.push('akta');
        if (saveDrivePeralihan && hasShareTransferAgenda) allowedKinds.push('peralihan_saham');
      }

      const isNew = !editingProjectId || editingProjectId === 'new';
      const result = await DocumentDraftService.saveDraft(
        'rupslb',
        editingProjectId,
        data,
        user,
        userProfile,
        activeProjectContext,
        {
          skipUpload: saveDriveNone || allowedKinds.length === 0,
          allowedKinds
        }
      );

      // Prevent duplicate draft creation on subsequent saves by updating active draft ID
      if (isNew && result.id) {
        setEditingProjectId(result.id);
      }

      recordNotification(
        isNew ? 'Draft RUPS LB Baru Dibuat' : 'Draft RUPS LB Diperbarui',
        `Draft RUPS Luar Biasa untuk "${data.companyName || 'PT Baru'}" telah ${isNew ? 'berhasil dibuat' : 'diperbarui'} oleh ${user?.email || 'Admin'}.`,
        isNew ? 'create_rupslb' : 'update_rupslb'
      );

      setIsSaveDriveModalOpen(false);

      if (saveDriveNone || allowedKinds.length === 0) {
        alert('✅ Draft RUPS LB berhasil disimpan (tanpa upload ke Google Drive).');
      } else {
        const docNames: string[] = [];
        if (saveDriveNotulen) docNames.push(data.documentType === 'CIRCULAR' ? 'Draft Sirkuler RUPS LB' : 'Draft Notulen RUPS LB');
        if (saveDriveAkta) docNames.push(data.documentType === 'CIRCULAR' ? 'Draft Akta Sirkuler RUPS LB' : 'Draft Akta RUPS LB');
        if (saveDrivePeralihan && hasShareTransferAgenda) docNames.push('Draft Akta Peralihan Saham');
        alert(`✅ Draft RUPS LB berhasil disimpan dan dokumen (${docNames.join(', ')}) berhasil diunggah ke Google Drive.`);
      }

      if (activeProjectContext) {
        const returnId = activeProjectContext;
        setEditingProjectId(null);
        setActiveProjectContext(null);
        setSelectedProjectId(returnId);
        setActiveSidebarTab('project_detail');
      }
    } catch (e: any) {
      alert('Gagal menyimpan draft: ' + (e.message || e));
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-open form view when activeProjectContext is present
  useEffect(() => {
    if (activeProjectContext && !editingProjectId) {
      setEditingProjectId('new');
      setIsRupsPreview(false);
    }
  }, [activeProjectContext, editingProjectId, setEditingProjectId, setIsRupsPreview]);

  // Sync to Google Drive
  const handleSyncToDrive = async (draftId: string, payload: any) => {
    setIsDriveSyncing(true);
    try {
      const res = await DocumentDraftService.syncDraftToGoogleDrive(
        'rupslb',
        draftId,
        payload,
        user,
        userProfile,
        activeProjectContext
      );
      if (res.success) {
        alert('✅ Dokumen berhasil diunggah dan disinkronkan ke Google Drive!');
      } else {
        alert('Gagal sinkron ke Google Drive: ' + (res.error || 'Terjadi kesalahan'));
      }
    } catch (e: any) {
      alert('Gagal sinkron ke Google Drive: ' + e.message);
    } finally {
      setIsDriveSyncing(false);
    }
  };

  // 1. LIST VIEW (Default state when not editing and not in active project context)
  if (!editingProjectId && !activeProjectContext) {
    return (
      <DocumentDraftListView
        title="RUPS LUAR BIASA (RUPS LB)"
        subtitle="Kelola daftar dokumen RUPS LB (Akta / Notulen / Sirkuler), status penyimpanan, dan sinkronisasi Google Drive."
        icon={<FileText className="w-6 h-6" />}
        badgeLabel="Modul RUPS LB"
        items={unifiedRupslbDraftItems}
        onAdd={() => {
          setEditingProjectId('new');
          setIsRupsPreview(false);
          if (!activeProjectContext) {
            updateData(sanitizeCompanyData({}));
          }
        }}
        onEdit={(item) => {
          setEditingProjectId(item.id);
          setIsRupsPreview(false);
          updateData(sanitizeCompanyData(item.rawData));
        }}
        onDelete={async (item) => {
          try {
            await DocumentDraftService.deleteDraft('rupslb', item.id, user, userProfile);
            recordNotification(
              'Draft RUPS LB Dihapus',
              `Draft RUPS Luar Biasa untuk "${item.companyName}" telah berhasil dihapus oleh ${user?.email || 'Admin'}.`,
              'delete_rupslb'
            );
            alert('✅ Draft RUPS LB berhasil dihapus.');
          } catch (e: any) {
            alert('Gagal menghapus draft: ' + (e.message || e));
          }
        }}
        onOpenDrive={(item) => {
          DocumentDraftService.openDriveDocument(item.driveFileId, item.driveFileUrl);
        }}
        onSyncDrive={async (item) => {
          await handleSyncToDrive(item.id, item.rawData);
        }}
        onDownload={async (item, format) => {
          const p = item.rawData || {};
          const merged = sanitizeCompanyData(p);
          if (format === 'notulen') {
            if (merged.documentType === 'CIRCULAR') {
              const { generateSirkulerLaporanDocx } = await import('../../../lib/generateSirkulerLaporanDocx');
              await generateSirkulerLaporanDocx(merged);
            } else {
              const { generateWordDoc } = await import('../../../../utils/docxGenerator');
              await generateWordDoc(merged);
            }
          } else if (format === 'akta') {
            const { generateRUPSDocx } = await import('../../../lib/generateRUPSDocx');
            await generateRUPSDocx(merged);
          } else if (format.startsWith('transfer_')) {
            const idx = parseInt(format.replace('transfer_', ''), 10);
            const transfers = (merged.shareTransfersNew && merged.shareTransfersNew.length > 0 ? merged.shareTransfersNew : merged.shareTransfers) || [];
            const transfer = transfers[idx];
            if (transfer) {
              const { getTransferData, getCompanyBaseData } = await import('../../../DraftAktaApp');
              const { generateDocx } = await import('../../../lib/generateDocxJualBeli');
              const { initialData } = await import('../../../constants');
              const docData = getTransferData(transfer, merged, getCompanyBaseData(merged, initialData));
              await generateDocx(docData);
            }
          }
        }}
        downloadOptions={(item) => {
          const p = sanitizeCompanyData(item.rawData || {});
          const isCircular = p.documentType === 'CIRCULAR';
          const opts: DownloadOption[] = [
            {
              label: isCircular ? 'Sirkuler RUPS LB' : 'Notulen RUPS LB',
              subLabel: 'Format dokumen (.docx)',
              format: 'notulen'
            },
            {
              label: isCircular ? 'Akta Sirkuler RUPS LB' : 'Akta RUPS LB',
              subLabel: 'Format dokumen (.docx)',
              format: 'akta'
            }
          ];
          const transfers = (p.shareTransfersNew && p.shareTransfersNew.length > 0 ? p.shareTransfersNew : p.shareTransfers) || [];
          if (p.resolutions?.shareholders && transfers.length > 0) {
            transfers.forEach((_: any, idx: number) => {
              opts.push({
                label: `Akta Peralihan Saham #${idx + 1}`,
                subLabel: 'Format dokumen (.docx)',
                format: `transfer_${idx}`
              });
            });
          }
          return opts;
        }}
        filterYears={uniqueRupslbYears}
        selectedYear={selectedRupslbYear}
        onSelectYear={setSelectedRupslbYear}
      />
    );
  }

  // 2. FORM VIEW (Create or Edit Draft)

  return (
    <div className="w-[94%] xl:w-[92%] max-w-none mx-auto space-y-6 px-2 sm:px-4 py-4 pb-12">
      {/* UNIFIED ACTION BAR */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs mb-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* LEFT GROUP */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-[12.5px] uppercase h-10 px-4 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              onClick={() => {
                const returnToProjectId = activeProjectContext;
                setIsRupslbDocDropdownOpen(false);
                setEditingProjectId(null);
                setActiveProjectContext(null);
                if (returnToProjectId) {
                  setSelectedProjectId(returnToProjectId);
                  setActiveSidebarTab('project_detail');
                }
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Daftar</span>
            </button>

            <div className="h-5 w-px bg-slate-200 hidden sm:block mx-1" />
            <AutoSaveIndicatorComponent />
          </div>

          {/* RIGHT GROUP */}
          <div className="flex flex-wrap items-center gap-2.5 justify-start lg:justify-end">
            {/* Tarik Data Klien */}
            <button
              type="button"
              onClick={handleOpenPullClientModal}
              disabled={isPullingClient}
              className="h-10 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shrink-0 shadow-xs uppercase tracking-wide"
              title="Tarik data terbaru dari Master Client ke Form ini"
            >
              <RefreshCw className={`w-4 h-4 ${isPullingClient ? 'animate-spin' : ''}`} />
              <span>Tarik Data Klien</span>
            </button>

            {/* Simpan Draft Utama */}
            <button
              type="button"
              disabled={isSaving}
              onClick={handleOpenSaveModal}
              className="bg-[#1b449c] hover:bg-[#13327d] text-white font-bold text-[12.5px] uppercase h-10 px-5 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>MENYIMPAN...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>SIMPAN DRAFT</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* FORM FIELDS */}
      <PageErrorBoundary>
        <RUPSLBFormFields
          user={user}
          userProfile={userProfile}
          projects={combinedProjects}
          profiles={profiles}
          editingProjectId={editingProjectId}
          setEditingProjectId={setEditingProjectId}
          activeProjectContext={activeProjectContext}
          setActiveProjectContext={setActiveProjectContext}
          setSelectedProjectId={setSelectedProjectId}
          setActiveSidebarTab={setActiveSidebarTab}
          data={data}
          setData={setData}
          updateData={updateData}
          resetData={resetData}
          mergedData={mergedData}
          isSaving={isSaving}
          setIsSaving={setIsSaving}
          isSyncing={isSyncing}
          handleManualSync={handleManualSync}
          recordNotification={recordNotification}
          isRupsPreview={isRupsPreview}
          setIsRupsPreview={setIsRupsPreview}
          handleExportWord={handleExportWord}
          draftAktaRef={draftAktaRef}
          isAddKbliModalOpen={isAddKbliModalOpen}
          setIsAddKbliModalOpen={setIsAddKbliModalOpen}
          kbliModalSearchTerm={kbliModalSearchTerm}
          setKbliModalSearchTerm={setKbliModalSearchTerm}
          kbliModalSearchResults={kbliModalSearchResults}
          setKbliModalSearchResults={setKbliModalSearchResults}
          kbliCurrentPage={kbliCurrentPage}
          setKbliCurrentPage={setKbliCurrentPage}
          kbliCheckedKblis={kbliCheckedKblis}
          setKbliCheckedKblis={setKbliCheckedKblis}
          performKbliModalSearch={performKbliModalSearch}
          AutoSaveIndicatorComponent={AutoSaveIndicatorComponent}
          openShareholderEditor={openShareholderEditor}
          deleteShareholder={deleteShareholder}
          rupstProjects={rupstProjects}
          pendirianProjects={pendirianProjects}
          handleFetchLatestNumbers={handleFetchLatestNumbers}
          isFetchingNumbers={isFetchingNumbers}
          handleOpenPullClientModal={handleOpenPullClientModal}
          isPullingClient={isPullingClient}
          updateAddress={updateAddress}
          toggleResolution={toggleResolution}
          updateManualRep={updateManualRep}
          calculateFinalShareholders={calculateFinalShareholders}
        />
      </PageErrorBoundary>

      {/* Tarik Data Klien Terbaru Modal */}
      <PullClientDataModal
        isOpen={showPullModal}
        onClose={() => setShowPullModal(false)}
        onConfirm={handleConfirmPullClient}
        isLoading={isPullingClient}
        clientName={data.companyName}
        freshClient={freshClientForModal}
        currentData={data}
      />

      {/* Modal Pilihan Simpan Draft & Upload Google Drive */}
      {isSaveDriveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#1b449c] text-white rounded-xl shadow-xs">
                  <Save className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800">Simpan Draft RUPS LB</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pilih opsi dokumen yang akan diunggah ke Google Drive
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveDriveModalOpen(false)}
                disabled={isSaving}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-3.5 max-h-[75vh] overflow-y-auto">
              <div className="bg-blue-50/60 border border-blue-200/70 rounded-xl p-3 text-xs text-blue-900 leading-relaxed">
                <span className="font-bold">Informasi:</span> Data formulir akan tersimpan ke sistem. Anda dapat menentukan dokumen DOCX mana yang ingin diunggah ke Google Drive.
              </div>

              {/* Opsi 1: Tidak upload apapun ke Google Drive */}
              <div
                onClick={handleSelectNone}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                  saveDriveNone
                    ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 text-blue-950 font-medium'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="mt-0.5">
                  {saveDriveNone ? (
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-[13px] text-slate-800">
                    1. Tidak upload apapun ke Google Drive
                  </div>
                  <div className="text-[11.5px] text-slate-500 mt-0.5">
                    Draft tersimpan di database tanpa mengunggah file DOCX ke Google Drive.
                  </div>
                </div>
              </div>

              {/* Divider & Header Opsi 2-4 */}
              <div className="pt-2 border-t border-slate-200/80">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                  <span>Pilihan Unggah Dokumen DOCX:</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {saveDriveNone ? 'Pilih salah satu di bawah untuk mengaktifkan' : 'Dapat memilih lebih dari satu'}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {/* Opsi 2: Upload Draft Notulen */}
                  <div
                    onClick={handleToggleNotulen}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                      saveDriveNotulen
                        ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 font-medium shadow-xs'
                        : saveDriveNone
                        ? 'bg-slate-50/70 border-slate-200 text-slate-400 hover:bg-slate-100/80 hover:text-slate-700'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="mt-0.5">
                      {saveDriveNotulen ? (
                        <CheckSquare className="w-5 h-5 text-indigo-600 shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded border-2 border-slate-300 shrink-0" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-[13px] text-slate-800">
                        2. Upload Draft Notulen
                      </div>
                      <div className="text-[11.5px] text-slate-500 mt-0.5">
                        Unggah {data.documentType === 'CIRCULAR' ? 'Draft Sirkuler RUPS LB' : 'Draft Notulen RUPS LB'} (.docx) ke Google Drive.
                      </div>
                    </div>
                  </div>

                  {/* Opsi 3: Upload Draft Akta */}
                  <div
                    onClick={handleToggleAkta}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                      saveDriveAkta
                        ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 font-medium shadow-xs'
                        : saveDriveNone
                        ? 'bg-slate-50/70 border-slate-200 text-slate-400 hover:bg-slate-100/80 hover:text-slate-700'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="mt-0.5">
                      {saveDriveAkta ? (
                        <CheckSquare className="w-5 h-5 text-indigo-600 shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded border-2 border-slate-300 shrink-0" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-[13px] text-slate-800">
                        3. Upload Draft Akta
                      </div>
                      <div className="text-[11.5px] text-slate-500 mt-0.5">
                        Unggah {data.documentType === 'CIRCULAR' ? 'Draft Akta Sirkuler RUPS LB' : 'Draft Akta RUPS LB'} (.docx) ke Google Drive.
                      </div>
                    </div>
                  </div>

                  {/* Opsi 4: Upload Draft Peralihan Saham (Hanya jika hasShareTransferAgenda) */}
                  {hasShareTransferAgenda && (
                    <div
                      onClick={handleTogglePeralihan}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                        saveDrivePeralihan
                          ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 font-medium shadow-xs'
                          : saveDriveNone
                          ? 'bg-slate-50/70 border-slate-200 text-slate-400 hover:bg-slate-100/80 hover:text-slate-700'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="mt-0.5">
                        {saveDrivePeralihan ? (
                          <CheckSquare className="w-5 h-5 text-indigo-600 shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded border-2 border-slate-300 shrink-0" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-[13px] text-slate-800">
                          4. Upload Draft Peralihan Saham
                        </div>
                        <div className="text-[11.5px] text-slate-500 mt-0.5">
                          Unggah Akta Jual Beli / Hibah Saham (.docx) ke Google Drive.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsSaveDriveModalOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/80 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveDraft}
                disabled={isSaving}
                className="px-5 py-2.5 bg-[#1b449c] hover:bg-[#13327d] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>
                      {saveDriveNone ? 'Simpan (Tanpa Upload Drive)' : 'Simpan & Upload ke Drive'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <ToastNotification
        toast={toast}
        onClose={() => setToast(null)}
      />
    </div>
  );
};

export const RUPSLBPage: React.FC<RUPSLBPageProps> = (props) => (
  <PageErrorBoundary>
    <RUPSLBPageInternal {...props} />
  </PageErrorBoundary>
);

export default RUPSLBPage;