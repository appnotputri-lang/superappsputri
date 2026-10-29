import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, ChevronDown, ChevronRight, Loader2, Save, Download, Trash2, Edit, Eye, 
  FileText, FileCode, ArrowRight, Info, AlertCircle, Trash, Check, X,
  SlidersHorizontal, ChevronLeft, HelpCircle, RefreshCw, Send, CheckCircle2, AlertTriangle, Briefcase, FileBadge,
  UserPlus, ShieldAlert, KeyRound, Building, Building2, RotateCcw, PlusCircle, ExternalLink, ArrowLeft,
  History, Archive, Coins, Users, FileSignature, CheckSquare, XCircle, Search, Calendar, Play, ArrowRightLeft, TrendingUp, MapPin, UserCheck, ShieldCheck,
  BookOpen
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
import { INITIAL_STATE } from '../../../domain/company/initialCompanyData';
import { DocumentDraftService, UnifiedDraftItem } from '../../../services/DocumentDraftService';
import { DocumentDraftListView, DownloadOption } from '../components/DocumentDraftListView';
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
import { CompanyProfile } from '@/types';
import { ClientProjectSyncService, ClientSyncSelection } from '../../../services/ClientProjectSyncService';
import { PullClientDataModal } from '../../../components/common/PullClientDataModal';
import { ToastNotification, ToastState } from '../../../components/common/ToastNotification';
import { getRupsLbChairCandidates, resolveRupsLbChairPosition } from '../../../lib/meetingChairHelper';
import { CorporateShareholderService } from '../../../services/CorporateShareholderService';

export interface RUPSTPageProps {
  user: any;
  userProfile: any;
  rupstProjects: any[];
  profiles: any[];
  editingRupstId: string | null;
  setEditingRupstId: (id: string | null) => void;
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
  handleManualSync: (type: string, data: any) => Promise<any>;
  recordNotification: (title: string, desc: string, type: string) => void;

  isRupstPreview: boolean;
  setIsRupstPreview: (v: boolean) => void;
  isRupstDocDropdownOpen: boolean;
  setIsRupstDocDropdownOpen: (v: boolean) => void;
  rupstDropdownId: string | null;
  setRupstDropdownId: (id: string | null) => void;

  rupstSearchQuery: string;
  setRupstSearchQuery: (q: string) => void;
  selectedRupstYear: string;
  setSelectedRupstYear: (y: string) => void;
  rupstSortField: string;
  setRupstSortField: (f: string) => void;
  rupstSortOrder: "asc" | "desc";
  setRupstSortOrder: (o: "asc" | "desc") => void;
  rupstCurrentPage: number;
  setRupstCurrentPage: (p: number) => void;
  isRupstFilterOpen: boolean;
  setIsRupstFilterOpen: (o: boolean) => void;
  rupstActiveTab: 'ALL' | 'PROSES' | 'SELESAI';
  setRupstActiveTab: (t: 'ALL' | 'PROSES' | 'SELESAI') => void;

  // Handlers & helpers
  handleRupstExportWord?: (d: any) => Promise<void>;
  AutoSaveIndicatorComponent: React.ComponentType;
  setProxyModalOpenId: (id: string | null) => void;
  activeProjectJobType: string | null;
  handleFetchLatestNumbers: () => Promise<void>;
  isFetchingNumbers: boolean;
  projects: any[];
  pendirianProjects: any[];
  syncCompanyDataToRupst: () => void;
}

export const RUPSTPage: React.FC<RUPSTPageProps> = ({
  user,
  userProfile,
  rupstProjects,
  profiles,
  editingRupstId,
  setEditingRupstId,
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

  isRupstPreview,
  setIsRupstPreview,
  isRupstDocDropdownOpen,
  setIsRupstDocDropdownOpen,
  rupstDropdownId,
  setRupstDropdownId,

  rupstSearchQuery,
  setRupstSearchQuery,
  selectedRupstYear,
  setSelectedRupstYear,
  rupstSortField,
  setRupstSortField,
  rupstSortOrder,
  setRupstSortOrder,
  rupstCurrentPage,
  setRupstCurrentPage,
  isRupstFilterOpen,
  setIsRupstFilterOpen,
  rupstActiveTab,
  setRupstActiveTab,

  AutoSaveIndicatorComponent,
  setProxyModalOpenId,
  activeProjectJobType,
  handleFetchLatestNumbers,
  isFetchingNumbers,
  projects,
  pendirianProjects,
  syncCompanyDataToRupst
}) => {
  const [showPullModal, setShowPullModal] = useState(false);
  const [isPullingClient, setIsPullingClient] = useState(false);
  const [freshClientForModal, setFreshClientForModal] = useState<CompanyProfile | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [stakeholderTab, setStakeholderTab] = useState<'all' | 'sh' | 'dir' | 'kom'>('all');
  const isSirkuler = data.rupstType === 'sirkuler';

  const currentEditingRupstId = editingRupstId;
  const setCurrentEditingRupstId = setEditingRupstId;
  const currentRupstProjects = rupstProjects;
  const currentCollectionName = 'rupst_projects';

  const handleOpenPullClientModal = async () => {
    let targetClientId = data.selectedProfileId;
    if (!targetClientId && activeProjectContext) {
      const proj = rupstProjects.find(p => p.id === activeProjectContext) || (await ProjectService.getProject(activeProjectContext));
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
      const proj = rupstProjects.find(p => p.id === activeProjectContext) || (await ProjectService.getProject(activeProjectContext));
      targetClientId = proj?.clientId;
    }
    if (!targetClientId) return;

    setIsPullingClient(true);
    try {
      const result = await ClientProjectSyncService.pullLatestClientData({
        projectId: activeProjectContext || '',
        clientId: targetClientId,
        jobType: data.rupstType === 'sirkuler' ? 'sirkuler' : 'rups_t',
        currentFormData: data,
        refId: editingRupstId || undefined,
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

  const handleQuestionChange = (questionKey: 'rupstQuestionA' | 'rupstQuestionB' | 'rupstQuestionC' | 'rupstQuestionD' | 'rupstQuestionE' | 'rupstQuestionF', answer: 'ya' | 'tidak') => {
    updateData({
      [questionKey]: answer
    });
  };

  const updateManualRep = (updates: any) => {
    updateData({
      manualRepresentative: { ...(data.manualRepresentative || {}), ...updates }
    });
  };

  // Chair Candidates calculation
  const chairCandidates = useMemo(() => {
    return getRupsLbChairCandidates(data.shareholders || [], data.oldManagementItems || []);
  }, [data.shareholders, data.oldManagementItems]);

  // Combined Stakeholders calculation
  const combinedStakeholders = useMemo(() => {
    const shs = (data.shareholders || []) as any[];
    const mgmts = (data.oldManagementItems || []) as any[];

    const list: any[] = [];
    const handledNames = new Set<string>();

    // Process shareholders
    shs.forEach((sh, idx) => {
      const trimmedName = (sh.name || '').trim();
      if (!trimmedName) return;
      handledNames.add(trimmedName.toLowerCase());

      const roles: string[] = [];
      if (sh.isManagement && sh.managementPosition) {
        roles.push(sh.managementPosition);
      } else {
        const mgmtMatch = mgmts.find(m => (m.name || '').trim().toLowerCase() === trimmedName.toLowerCase());
        if (mgmtMatch && mgmtMatch.position) {
          roles.push(mgmtMatch.position);
        }
      }
      if ((Number(sh.sharesOwned) || 0) > 0 || !roles.some(r => /direktur|direksi|komisaris/i.test(r))) {
        roles.push('Pemegang Saham');
      }

      const totalShares = data.originalTotalShares || shs.reduce((sum, s) => sum + (Number(s.sharesOwned) || 0), 0) || 1;
      const pct = sh.sharePercentage || ((Number(sh.sharesOwned) || 0) / totalShares) * 100;

      list.push({
        id: sh.id || `sh-${idx}`,
        name: sh.name,
        salutation: sh.salutation,
        nik: sh.nik,
        roles: Array.from(new Set(roles)),
        sharesOwned: Number(sh.sharesOwned) || 0,
        percentage: pct,
        isPresent: sh.isPresent ?? true,
        isProxy: sh.isProxy || false,
        proxyData: sh.proxyData,
        isShareholder: true,
        isManagement: roles.some(r => /direktur|direksi|komisaris/i.test(r)),
        shareholderType: sh.shareholderType,
        linkedProfileId: sh.linkedProfileId,
        guardianName: sh.guardianName,
        guardianSalutation: sh.guardianSalutation,
        representativePosition: sh.representativePosition,
        rawShareholder: sh
      });
    });

    // Process mgmts not in shareholders
    mgmts.forEach((m, idx) => {
      const trimmedName = (m.name || '').trim();
      if (!trimmedName || handledNames.has(trimmedName.toLowerCase())) return;
      handledNames.add(trimmedName.toLowerCase());

      list.push({
        id: m.id || `mgmt-${idx}`,
        name: m.name,
        salutation: m.salutation,
        nik: m.nik,
        roles: [m.position || 'Pengurus'],
        sharesOwned: 0,
        percentage: 0,
        isPresent: true,
        isProxy: false,
        proxyData: undefined,
        isShareholder: false,
        isManagement: true
      });
    });

    return list;
  }, [data.shareholders, data.oldManagementItems, data.originalTotalShares]);

  const shCount = useMemo(() => combinedStakeholders.filter(s => s.isShareholder && s.sharesOwned > 0).length, [combinedStakeholders]);
  const dirCount = useMemo(() => combinedStakeholders.filter(s => s.roles.some((r: string) => /direktur|direksi/i.test(r))).length, [combinedStakeholders]);
  const komCount = useMemo(() => combinedStakeholders.filter(s => s.roles.some((r: string) => /komisaris/i.test(r))).length, [combinedStakeholders]);

  const displayedStakeholders = useMemo(() => {
    if (isSirkuler) {
      return combinedStakeholders.filter(s => s.isShareholder && s.sharesOwned > 0);
    }
    if (stakeholderTab === 'sh') {
      return combinedStakeholders.filter(s => s.isShareholder && s.sharesOwned > 0);
    }
    if (stakeholderTab === 'dir') {
      return combinedStakeholders.filter(s => s.roles.some((r: string) => /direktur|direksi/i.test(r)));
    }
    if (stakeholderTab === 'kom') {
      return combinedStakeholders.filter(s => s.roles.some((r: string) => /komisaris/i.test(r)));
    }
    return combinedStakeholders;
  }, [isSirkuler, stakeholderTab, combinedStakeholders]);

  // Save handler
  const handleSaveRupst = async () => {
    if (!data.companyName) return alert('Nama perseroan harus diisi');
    setIsSaving(true);
    const newId = currentEditingRupstId && currentEditingRupstId !== 'new' ? currentEditingRupstId : crypto.randomUUID();
    const isNewRupst = currentEditingRupstId === 'new' || !currentEditingRupstId;
    const profileData = {
        ...data,
        id: newId,
        rupstStatus: isNewRupst ? 'Draft' : (data.rupstStatus || 'Draft'),
        updatedAt: new Date().toISOString()
    };
    if (!user) {
      setIsSaving(false);
      return alert('Anda harus login terlebih dahulu!');
    }
    
    let changes: any[] = [];
    if (!isNewRupst && profileData.id) {
      try {
        const oldSnap = await getDoc(doc(db, currentCollectionName, profileData.id));
        if (oldSnap.exists()) {
          changes = compareCompanyDocumentDiff(oldSnap.data(), profileData);
        }
      } catch (err) {
        console.warn("Gagal mengambil data lama RUPST untuk diffing:", err);
      }
    }
    
    try {
        await setDoc(doc(db, currentCollectionName, profileData.id), sanitizeForFirestore(profileData));
        if (activeProjectContext) {
            const docName = profileData.rupstType === 'sirkuler'
              ? `Draft Sirkuler RUPST - ${profileData.companyName || 'PT Baru'}`
              : `Draft RUPST - ${profileData.companyName || 'PT Baru'}`;
            await ProjectService.addDocument(activeProjectContext, {
                name: docName,
                type: 'docx',
                url: `/rupst`,
                refId: profileData.id,
                uploadedBy: user?.email || 'staff_notaris',
                changes: changes.length > 0 ? changes : undefined
            });

            await DocumentGenerationService.generateAndUploadAllForProject(
                activeProjectContext,
                profileData,
                user?.email,
                userProfile?.name
            );
        }
        recordNotification(
          isNewRupst ? 'Draft RUPST Baru Dibuat' : 'Draft RUPST Diubah',
          `Rapat Umum Pemegang Saham Tahunan (RUPST) untuk perusahaan "${profileData.companyName || 'PT Baru'}" telah ${isNewRupst ? 'berhasil didaftarkan' : 'diperbarui'} oleh ${user?.email || 'Admin'}.`,
          isNewRupst ? 'create_rupst' : 'update_rupst'
        );
        const returnToProjectId = activeProjectContext;
        setCurrentEditingRupstId(null);
        setActiveProjectContext(null);
        alert('✅ Data berhasil disimpan dan dokumen berhasil diperbarui.');
        if (returnToProjectId) {
          setSelectedProjectId(returnToProjectId);
          setActiveSidebarTab('project_detail');
        }
    } catch (e: any) {
        console.error("Save & Generate failed:", e);
        alert('Gagal menyimpan atau memperbarui dokumen: ' + (e.message || e));
    } finally {
        setIsSaving(false);
    }
  };

  // ZIP Download handler
  const handleDownloadAllZip = async () => {
    try {
      const zip = new JSZip();
      const { generateRUPSTPernyataanDocx } = await import('../../../lib/generateRUPSTPernyataanDocx');
      
      let docxResult;
      if (mergedData.rupstType === 'sirkuler') {
        const { generateSirkulerLaporanDocx } = await import('../../../lib/generateSirkulerLaporanDocx');
        docxResult = await generateSirkulerLaporanDocx(mergedData, true);
      } else {
        const { generateRUPSTDocx } = await import('../../../lib/generateRUPSTDocx');
        docxResult = await generateRUPSTDocx(mergedData, true);
      }
      if (docxResult) {
        zip.file(docxResult.filename, docxResult.blob);
      }
      
      const pernyataanResult = await generateRUPSTPernyataanDocx(mergedData, true);
      if (pernyataanResult) {
        zip.file(pernyataanResult.filename, pernyataanResult.blob);
      }
      
      const { generateRUPSTAktaDocx } = await import('../../../lib/generateRUPSTAktaDocx');
      const aktaResult = await generateRUPSTAktaDocx(mergedData, true);
      if (aktaResult) {
        zip.file(aktaResult.filename, aktaResult.blob);
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      const { saveAs } = (await import('file-saver'));
      saveAs(content, `Dokumen RUPST ${mergedData.companyName || 'PT Baru'}.zip`);
    } catch (err) {
      console.error('Failed to generate ZIP:', err);
      alert('Gagal menghasilkan file ZIP.');
    }
  };

  // List view search & filter calculations
  const baseResultsForCount = currentRupstProjects.filter(p => {
    if (rupstSearchQuery) {
      const q = rupstSearchQuery.toLowerCase();
      const matchSearch = (p.companyName && p.companyName.toLowerCase().includes(q)) ||
        (p.rupstFiscalYear && p.rupstFiscalYear.toString().toLowerCase().includes(q));
      if (!matchSearch) return false;
    }
    if (selectedRupstYear !== "all" && (p.rupstFiscalYear || '').toString() !== selectedRupstYear) {
      return false;
    }
    return true;
  });

  const totalRupstAll = baseResultsForCount.length;
  const totalRupstProses = baseResultsForCount.filter(p => {
    const status = (p.documentStatus || p.rupstStatus || "DRAFTING").toUpperCase();
    return status !== "SELESAI" && status !== "FINAL";
  }).length;
  const totalRupstSelesai = baseResultsForCount.filter(p => {
    const status = (p.documentStatus || p.rupstStatus || "DRAFTING").toUpperCase();
    return status === "SELESAI" || status === "FINAL";
  }).length;

  let filteredResults = currentRupstProjects.filter(p => {
    if (!rupstSearchQuery) return true;
    const q = rupstSearchQuery.toLowerCase();
    return (
      (p.companyName && p.companyName.toLowerCase().includes(q)) ||
      (p.rupstFiscalYear && p.rupstFiscalYear.toString().toLowerCase().includes(q))
    );
  });

  if (selectedRupstYear !== "all") {
    filteredResults = filteredResults.filter(p => (p.rupstFiscalYear || '').toString() === selectedRupstYear);
  }

  if (rupstActiveTab === "PROSES") {
    filteredResults = filteredResults.filter(p => {
      const status = (p.documentStatus || p.rupstStatus || "DRAFTING").toUpperCase();
      return status !== "SELESAI" && status !== "FINAL";
    });
  } else if (rupstActiveTab === "SELESAI") {
    filteredResults = filteredResults.filter(p => {
      const status = (p.documentStatus || p.rupstStatus || "DRAFTING").toUpperCase();
      return status === "SELESAI" || status === "FINAL";
    });
  }

  const uniqueYears = Array.from(new Set(
    currentRupstProjects
      .map(p => (p.rupstFiscalYear || '').toString())
      .filter(Boolean)
  )).sort((a, b) => Number(b) - Number(a));

  const sortedResults = [...filteredResults].sort((a, b) => {
    let valA = "";
    let valB = "";

    if (rupstSortField === "companyName") {
      valA = a.companyName || "";
      valB = b.companyName || "";
    } else if (rupstSortField === "rupstFiscalYear") {
      valA = (a.rupstFiscalYear || "").toString();
      valB = (b.rupstFiscalYear || "").toString();
    } else if (rupstSortField === "status") {
      valA = a.rupstStatus || "Draft";
      valB = b.rupstStatus || "Draft";
    } else if (rupstSortField === "updatedAt") {
      valA = a.updatedAt || a.signingDate || "";
      valB = b.updatedAt || b.signingDate || "";
    }

    if (valA < valB) return rupstSortOrder === "asc" ? -1 : 1;
    if (valA > valB) return rupstSortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const itemsPerPage = 10;
  const totalItems = sortedResults.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(rupstCurrentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedResults = sortedResults.slice(startIndex, startIndex + itemsPerPage);

  const handleSearchChange = (val: string) => {
    setRupstSearchQuery(val);
    setRupstCurrentPage(1);
  };

  const formatLastUpdated = (dateStr?: string, signingDate?: string) => {
    const dateToFormat = dateStr || signingDate;
    if (!dateToFormat) return "-";
    try {
      const d = new Date(dateToFormat);
      if (isNaN(d.getTime())) return dateToFormat;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const day = String(d.getDate()).padStart(2, '0');
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day} ${month} ${year} ${hours}:${minutes}`;
    } catch (e) {
      return dateToFormat;
    }
  };

  const handleSort = (field: string) => {
    if (rupstSortField === field) {
      setRupstSortOrder(rupstSortOrder === "asc" ? "desc" : "asc");
    } else {
      setRupstSortField(field);
      setRupstSortOrder("asc");
    }
    setRupstCurrentPage(1);
  };

  const renderSortArrows = (field: string) => {
    const isActive = rupstSortField === field;
    return (
      <span className="inline-flex flex-col text-[8px] text-slate-400 shrink-0 ml-1.5 leading-none select-none">
        <span className={`${isActive && rupstSortOrder === "asc" ? "text-blue-600 font-bold" : "text-slate-300"}`}>▲</span>
        <span className={`${isActive && rupstSortOrder === "desc" ? "text-blue-600 font-bold" : "text-slate-300"}`}>▼</span>
      </span>
    );
  };

  const getPageRange = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) {
        pages.push("...");
      }
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (safeCurrentPage < totalPages - 2) {
        pages.push("...");
      }
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="w-[94%] xl:w-[92%] max-w-none mx-auto space-y-6 px-2 sm:px-4 py-4 font-sans text-slate-800">
      {/* BREADCRUMB */}
      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <span>Notaris dan Akta</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-700 font-semibold">RUPS Tahunan</span>
      </div>

      {/* HEADER SECTION */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-xs">
        {currentEditingRupstId ? (
          <div className="space-y-4">
            {/* Top row: Title, Status, Company Badge, and Kembali Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#1b449c] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <FileSignature className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                      RUPS Tahunan (RUPST)
                    </h1>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>{isSaving ? 'Menyimpan...' : (data.rupstStatus === 'SELESAI' ? 'Tersimpan (Selesai)' : 'Draft Tersimpan')}</span>
                    </div>
                    {data.companyName && (
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md truncate max-w-[280px]">
                        {data.companyName.toUpperCase().startsWith('PT') ? data.companyName : `PT ${data.companyName}`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-normal mt-0.5">
                    Pengelolaan Rapat Umum Pemegang Saham Tahunan, Notulen, dan Draf Akta Notariil
                  </p>
                </div>
              </div>

              {/* Kembali ke Daftar */}
              <button
                type="button"
                onClick={() => {
                  const returnToProjectId = activeProjectContext;
                  setIsRupstDocDropdownOpen(false);
                  setCurrentEditingRupstId(null);
                  setActiveProjectContext(null);
                  if (returnToProjectId) {
                    setSelectedProjectId(returnToProjectId);
                    setActiveSidebarTab('project_detail');
                  }
                }}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs uppercase h-9 px-3.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500" />
                <span>Kembali ke Daftar</span>
              </button>
            </div>

            {/* Bottom Toolbar row: Action buttons neatly aligned */}
            <div className="pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  Bentuk: <span className="font-bold text-blue-700 uppercase">{data.rupstType === 'sirkuler' ? 'Sirkuler Tahunan' : 'RUPST'}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
                {isRupstPreview ? (
                  <button 
                    type="button"
                    onClick={(e) => { 
                      e.preventDefault(); 
                      setIsRupstDocDropdownOpen(false);
                      setIsRupstPreview(false); 
                    }}
                    className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs uppercase h-9 px-3.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit Form</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={resetData}
                    className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs uppercase h-9 px-3.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reset</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleOpenPullClientModal}
                  disabled={isPullingClient}
                  className="bg-white hover:bg-blue-50/60 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 font-bold text-xs uppercase h-9 px-3.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Tarik data terbaru dari Master Klien"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isPullingClient ? 'animate-spin' : ''}`} />
                  <span>Sync Data Klien</span>
                </button>

                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={async () => {
                    const res = await handleManualSync('RUPST', data);
                    if (res && (typeof res === 'boolean' ? res : res.success)) {
                      const finalOrder = (res as any).orderNumber || data.draftAktaRupsOrderNumber;
                      const finalDeed = (res as any).deedNumber || data.draftAktaRupsNumber;
                      const projId = data.id || (currentEditingRupstId && currentEditingRupstId !== 'new' ? currentEditingRupstId : null);
                      if (projId && user) {
                        try {
                          await setDoc(doc(db, currentCollectionName, projId), sanitizeForFirestore({
                            ...data,
                            draftAktaRupsOrderNumber: finalOrder,
                            updatedAt: new Date().toISOString()
                          }), { merge: true });
                        } catch (e) {
                          console.warn("Auto-saving RUPST project after sync error:", e);
                        }
                      }
                      alert(`Nomor Akta ${finalDeed || ''} berhasil disimpan ke Buku Daftar Akta!\nNomor Urut Akta: ${finalOrder || ''}`);
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase h-9 px-3.5 rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Simpan nomor akta RUPST ini ke Buku Daftar Akta Notaris"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Simpan ke Buku Akta</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveRupst}
                  className="bg-[#1b449c] hover:bg-[#13327d] text-white font-bold text-xs uppercase h-9 px-4 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan RUPST</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#1b449c] text-white flex items-center justify-center shrink-0 shadow-sm">
                <FileSignature className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    RUPS Tahunan (RUPST)
                  </h1>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Tersimpan</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Pengelolaan Rapat Umum Pemegang Saham Tahunan, Notulen, dan Draf Akta Notariil
                </p>
              </div>
            </div>

            <button 
              onClick={() => {
                setCurrentEditingRupstId('new');
                setIsRupstPreview(false);
                const defaultType = activeProjectJobType === 'rups_t' ? 'rapat' : 'sirkuler';
                updateData({ 
                  ...INITIAL_STATE, 
                  rupstType: defaultType,
                } as any);
              }} 
              className="bg-[#1b449c] hover:bg-[#13327d] text-white px-5 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-sm shrink-0 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" /> TAMBAH RUPST BARU
            </button>
          </div>
        )}
      </div>

      {currentEditingRupstId ? (
        <div className="space-y-6 pb-12">
          {/* STEP INDICATOR / SECTION PROGRESS BAR */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs overflow-x-auto">
            <div className="flex items-center justify-between min-w-[720px] gap-2">
              {[
                { id: 'section-identitas', num: '1', title: 'Identitas Perseroan' },
                { id: 'section-agenda', num: '2', title: 'Agenda & Keuangan' },
                { id: 'section-rapat', num: '3', title: 'Data Rapat' },
                { id: 'section-pihak', num: '4', title: 'Para Pihak' },
                { id: 'section-kuasa', num: '5', title: 'Kuasa' },
                { id: 'section-dokumen', num: '6', title: 'Dokumen Keluaran' },
              ].map((step, idx, arr) => (
                <React.Fragment key={step.id}>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(step.id);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="flex items-center gap-2.5 text-left group cursor-pointer shrink-0"
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {step.num}
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-blue-700 transition-colors">
                      {step.title}
                    </span>
                  </button>
                  {idx < arr.length - 1 && (
                    <div className="flex-1 h-px bg-slate-200 mx-2 min-w-[20px]"></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <fieldset disabled={isRupstPreview} className="space-y-6">
            {/* SECTION 1: IDENTITAS PERSEROAN (READ-ONLY CARD) */}
            <div id="section-identitas" className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <h3 className="text-base font-bold text-slate-800 tracking-tight">
                    Identitas Perseroan
                  </h3>
                </div>
                
                {/* Alert Banner / Read-only notice */}
                <div className="flex items-center gap-2 px-3.5 py-2 bg-blue-50/70 border border-blue-200/60 rounded-lg text-xs text-blue-800 font-medium">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Data ini diambil dari Master Data Klien/Proyek dan bersifat read-only. Perubahan data perseroan dilakukan melalui Master Klien.</span>
                </div>
              </div>

              {/* Company Profile Selection if not yet selected */}
              {!data.companyName && !data.selectedProfileId && !activeProjectContext ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Pilih Perseroan dari Master Klien</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    value={data.selectedProfileId || ''}
                    onChange={async (e) => {
                      const profileId = e.target.value;
                      if (profileId) {
                        const selected = await CompanyService.getCompanyProfile(profileId);
                        if (selected) {
                          const currentManagement = selected.oldManagementItems || selected.newManagementItems || (selected as any).managementItems || [];
                          updateData({ 
                            ...(selected as any), 
                            selectedProfileId: selected.id,
                            companyName: selected.companyName || '',
                            domicile: selected.domicile || selected.oldDomicile || (selected as any).kedudukanPT || (selected as any).kotaKedudukan || (selected as any).city || selected.newAddress?.city || selected.oldAddress?.city || '',
                            oldFullAddress: selected.fullAddress || selected.oldFullAddress || (selected.newAddress?.fullAddress ? `${selected.newAddress.fullAddress}, RT ${selected.newAddress.rt}/${selected.newAddress.rw}, Kel. ${selected.newAddress.kelurahan}, Kec. ${selected.newAddress.kecamatan}` : ''),
                            oldAddress: selected.newAddress || selected.oldAddress,
                            oldDomicile: selected.domicile || selected.oldDomicile,
                            shareholders: selected.shareholders || [],
                            oldManagementItems: currentManagement,
                            originalCapitalBase: selected.originalCapitalBase || selected.targetCapitalBase || 0,
                            originalCapitalPaid: selected.originalCapitalPaid || selected.targetCapitalPaid || 0,
                            originalSharePrice: selected.originalSharePrice || 0,
                            originalAuthorizedShares: selected.originalAuthorizedShares || 0,
                            originalTotalShares: selected.originalTotalShares || 0,
                          } as any);
                        }
                      }
                    }}
                  >
                    <option value="">-- Pilih Perseroan dari Master Klien --</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.companyName}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Company Top Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50/70 border border-slate-200/70 rounded-xl">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className="text-lg font-bold text-slate-900 tracking-tight">
                            {data.companyName || 'Nama Perseroan Belum Diisi'}
                          </h4>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Data dari Master Klien
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {data.companyType || 'Perseroan Terbatas (PT)'} • Terdaftar di Master Client
                        </p>
                      </div>
                    </div>

                    {!activeProjectContext && profiles.length > 0 && (
                      <select 
                        className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 font-medium focus:border-blue-600 cursor-pointer self-start sm:self-auto"
                        value={data.selectedProfileId || ''}
                        onChange={async (e) => {
                          const profileId = e.target.value;
                          if (profileId) {
                            const selected = await CompanyService.getCompanyProfile(profileId);
                            if (selected) {
                              const currentManagement = selected.oldManagementItems || selected.newManagementItems || (selected as any).managementItems || [];
                              updateData({ 
                                ...(selected as any), 
                                selectedProfileId: selected.id,
                                companyName: selected.companyName || '',
                                domicile: selected.domicile || selected.oldDomicile || (selected as any).kedudukanPT || '',
                                oldFullAddress: selected.fullAddress || selected.oldFullAddress || '',
                                shareholders: selected.shareholders || [],
                                oldManagementItems: currentManagement,
                                originalCapitalBase: selected.originalCapitalBase || selected.targetCapitalBase || 0,
                                originalCapitalPaid: selected.originalCapitalPaid || selected.targetCapitalPaid || 0,
                                originalSharePrice: selected.originalSharePrice || 0,
                                originalAuthorizedShares: selected.originalAuthorizedShares || 0,
                                originalTotalShares: selected.originalTotalShares || 0,
                              } as any);
                            }
                          }
                        }}
                      >
                        <option value="">Ganti Perseroan...</option>
                        {profiles.map(p => (
                          <option key={p.id} value={p.id}>{p.companyName}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* 2-Column Read-Only Definition Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-3.5 bg-white p-4 rounded-xl border border-slate-150 shadow-2xs">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Kedudukan</span>
                        <span className="text-sm font-semibold text-slate-800 block mt-0.5">
                          {data.domicile || data.oldDomicile || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Modal Dasar</span>
                        <span className="text-sm font-semibold text-slate-800 block mt-0.5">
                          Rp {formatInputNumber(data.targetCapitalBase || data.originalCapitalBase || 0)}
                        </span>
                        <span className="text-xs text-slate-500 block mt-0.5">
                          ({formatInputNumber(data.originalAuthorizedShares || 0)} lembar @ Rp {formatInputNumber(data.originalSharePrice || 0)})
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Modal Ditempatkan & Disetor</span>
                        <span className="text-sm font-semibold text-slate-800 block mt-0.5">
                          Rp {formatInputNumber(data.targetCapitalPaid || data.originalCapitalPaid || 0)}
                        </span>
                        <span className="text-xs text-slate-500 block mt-0.5">
                          ({formatInputNumber(data.originalTotalShares || 0)} lembar @ Rp {formatInputNumber(data.originalSharePrice || 0)})
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Jenis Perseroan</span>
                        <span className="text-sm font-semibold text-slate-800 block mt-0.5">
                          {data.companyType || 'PT Biasa (Tertutup)'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3.5 bg-white p-4 rounded-xl border border-slate-150 shadow-2xs">
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">NPWP</span>
                        <span className="text-sm font-semibold text-slate-800 block mt-0.5 font-mono">
                          {data.npwp || data.oldNpwp || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Alamat Perseroan</span>
                        <span className="text-sm font-semibold text-slate-800 block mt-0.5 leading-relaxed">
                          {data.oldFullAddress || data.fullAddress || (data.oldAddress ? `${data.oldAddress.street || ''} ${data.oldAddress.city || ''}` : '-')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Email Perseroan</span>
                        <span className="text-sm font-semibold text-slate-800 block mt-0.5">
                          {data.email || data.companyEmail || '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: BENTUK KEPUTUSAN */}
            <div id="section-keputusan" className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h3 className="text-base font-bold text-slate-800 tracking-tight">
                  Bentuk Keputusan
                </h3>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Bentuk Keputusan / RUPST <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={data.rupstType || 'sirkuler'}
                    onChange={e => updateData({ rupstType: e.target.value as any })}
                    className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm bg-white text-slate-800 font-semibold shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 appearance-none pr-10"
                  >
                    <option value="sirkuler">SIRKULER TAHUNAN</option>
                    <option value="rapat">RUPST</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {data.rupstType === 'sirkuler' 
                    ? 'Keputusan sirkuler diambil dengan persetujuan tertulis secara bulat oleh seluruh pemegang saham yang memiliki hak suara sah (Pasal 91 UU PT).'
                    : 'Rapat fisik atau hibrid diselenggarakan dengan berita acara/akta notaris dan kehadiran pemegang saham, direksi, dan komisaris.'}
                </p>
              </div>
            </div>

            {/* SECTION 3: AGENDA DAN KEUANGAN RUPST */}
            <div id="section-agenda" className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <h3 className="text-base font-bold text-slate-800 tracking-tight">
                  Agenda dan Keuangan RUPST
                </h3>
              </div>

              {/* Status Audit Laporan Keuangan */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Status Audit Laporan Keuangan <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-4 items-center p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-lg">
                  <label className="flex items-center gap-2.5 text-sm text-slate-800 font-semibold cursor-pointer select-none">
                    <input
                      type="radio"
                      name="rupstIsAudited"
                      checked={data.rupstIsAudited === false}
                      onChange={() => updateData({ rupstIsAudited: false })}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Tidak Wajib Audit</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-sm text-slate-800 font-semibold cursor-pointer select-none">
                    <input
                      type="radio"
                      name="rupstIsAudited"
                      checked={data.rupstIsAudited === true}
                      onChange={() => {
                        updateData({
                          rupstIsAudited: true,
                          rupstStatementNeraca: true,
                          rupstStatementLabaRugi: true,
                          rupstStatementPerubahanEkuitas: true,
                          rupstStatementArusKas: true,
                          rupstStatementCatatan: true,
                          rupstStatementNamaAnggota: true,
                          rupstStatementGaji: true
                        });
                      }}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Wajib Audit</span>
                  </label>
                </div>
                {data.rupstIsAudited === false && (
                  <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer font-medium p-2.5 bg-blue-50/40 rounded-lg border border-blue-100">
                    <input
                      type="checkbox"
                      checked={data.rupstNonAuditedUseKAP || false}
                      onChange={(e) => updateData({ rupstNonAuditedUseKAP: e.target.checked })}
                      className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300"
                    />
                    <span>Namun untuk laporan keuangan yang akurat perseroan memilih dan memutuskan untuk menggunakan Kantor Akuntan Publik</span>
                  </label>
                )}
              </div>

              {/* 4-Column Financial Input Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Tahun Buku */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tahun Buku <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.rupstFiscalYear || ''}
                    onChange={e => updateData({ rupstFiscalYear: e.target.value })}
                    placeholder="Contoh: 2024"
                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                {/* Laba Bersih */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Laba Bersih (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">Rp.</span>
                    <input
                      type="text"
                      value={formatInputNumber(data.rupstNetProfit)}
                      onChange={e => updateData({ rupstNetProfit: parseFormattedNumber(e.target.value) })}
                      placeholder="0"
                      className="w-full border border-slate-200 rounded-lg pl-10 pr-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>

                {/* Dividen Dibagikan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Dividen Dibagikan (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">Rp.</span>
                    <input
                      type="text"
                      value={formatInputNumber(data.rupstDividendAmount)}
                      onChange={e => updateData({ rupstDividendAmount: parseFormattedNumber(e.target.value) })}
                      placeholder="0"
                      className="w-full border border-slate-200 rounded-lg pl-10 pr-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>

                {/* Tanggal LK */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tanggal Laporan Keuangan
                  </label>
                  <input
                    type="date"
                    value={data.rupstFinancialReportDate || ''}
                    onChange={e => updateData({ rupstFinancialReportDate: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Checkbox Saldo Ditahan */}
              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={data.rupstShowRetainedProfit ?? (data.rupstRetainedProfit !== 0 && data.rupstRetainedProfit !== undefined)}
                    onChange={e => updateData({ rupstShowRetainedProfit: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300"
                  />
                  <span>Tampilkan saldo ditahan tahun sebelumnya di akta dan notulen (meskipun nilainya 0)</span>
                </label>
              </div>

              {/* Retained Profit Calculation Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Saldo Laba/Rugi Ditahan Tahun Sebelumnya (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">Rp.</span>
                    <input
                      type="text"
                      value={formatInputNumber(data.rupstRetainedProfit)}
                      onChange={e => updateData({ rupstRetainedProfit: parseFormattedNumber(e.target.value) })}
                      placeholder="0"
                      className="w-full border border-slate-200 rounded-lg pl-10 pr-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Laba Ditahan / Rugi Berjalan (Kalkulasi Otomatis)
                  </label>
                  <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 flex items-center">
                    {((data.rupstNetProfit || 0) + (data.rupstRetainedProfit || 0) - (data.rupstDividendAmount || 0)) < 0 ? '- ' : ''}
                    Rp {formatInputNumber(Math.abs((data.rupstNetProfit || 0) + (data.rupstRetainedProfit || 0) - (data.rupstDividendAmount || 0)))}
                  </div>
                </div>
              </div>

              {/* Signatory for LK */}
              <div className="p-4 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-3">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Penandatangan Laporan Keuangan
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Pilih Direksi</label>
                    <div className="relative">
                      <select
                        value={data.rupstFinancialReportSignatoryName || ''}
                        onChange={e => {
                          const selectedName = e.target.value;
                          const sh = data.shareholders.find((s: any) => s.name === selectedName);
                          updateData({ 
                            rupstFinancialReportSignatoryName: selectedName,
                            rupstFinancialReportSignatoryPosition: sh?.isManagement ? (sh.managementPosition || "Direktur") : "Direktur"
                          });
                        }}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white font-medium focus:border-blue-600 appearance-none pr-8"
                      >
                        <option value="">-- Pilih Direksi --</option>
                        {(data.shareholders || []).map((s: any) => (
                          <option key={s.id} value={s.name}>{s.salutation || "Tuan"} {s.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Jabatan Penandatangan</label>
                    <input
                      type="text"
                      value={data.rupstFinancialReportSignatoryPosition || ''}
                      onChange={e => updateData({ rupstFinancialReportSignatoryPosition: e.target.value })}
                      placeholder="Contoh: Direktur"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white font-medium focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* KAP Information if audited or chosen */}
              {(data.rupstIsAudited || data.rupstNonAuditedUseKAP) && (
                <div className="p-4 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-3">
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Informasi Kantor Akuntan Publik (KAP)
                  </h5>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Nama Kantor Akuntan Publik (KAP)</label>
                      <input
                        type="text"
                        value={data.rupstKapName || ''}
                        onChange={e => updateData({ rupstKapName: e.target.value })}
                        placeholder="Contoh: KAP Tanudiredja, Wibisana, Rintis & Rekan"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white font-medium focus:border-blue-600"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Nomor Izin KAP</label>
                        <input
                          type="text"
                          value={data.rupstKapLicenseNumber || ''}
                          onChange={e => updateData({ rupstKapLicenseNumber: e.target.value })}
                          placeholder="Contoh: KEP-442/KM.1/2023"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white font-medium focus:border-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Izin Berakhir Tanggal</label>
                        <input
                          type="date"
                          value={data.rupstKapExpiryDate || ''}
                          onChange={e => updateData({ rupstKapExpiryDate: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white font-medium focus:border-blue-600"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Nomor Laporan Audit</label>
                        <input
                          type="text"
                          value={data.rupstAuditReportNumber || ''}
                          onChange={e => updateData({ rupstAuditReportNumber: e.target.value })}
                          placeholder="Contoh: 00123/2.3456/AU.1..."
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white font-medium focus:border-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Tanggal Laporan Audit</label>
                        <input
                          type="date"
                          value={data.rupstAuditReportDate || ''}
                          onChange={e => updateData({ rupstAuditReportDate: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white font-medium focus:border-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Dividend Distribution Form */}
              {data.rupstDividendAmount !== undefined && data.rupstDividendAmount > 0 && (
                <div className="p-4 border border-blue-200/80 rounded-xl bg-blue-50/20 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-blue-100 gap-2">
                    <div>
                      <h5 className="text-xs font-bold text-blue-900 uppercase flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-blue-700" /> Distribusi Pembagian Dividen Ke Pemegang Saham
                      </h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Total dividen yang dibagikan: <strong>Rp {formatInputNumber(data.rupstDividendAmount)}</strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const id = Math.random().toString(36).substring(2);
                        const item = {
                          id,
                          shareholderName: '',
                          percentage: 0,
                          amount: 0,
                          paymentDate: '',
                        };
                        updateData({
                          rupstDividends: [...(data.rupstDividends || []), item]
                        });
                      }}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-bold shadow-2xs uppercase flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Penerima
                    </button>
                  </div>

                  {(!data.rupstDividends || data.rupstDividends.length === 0) ? (
                    <div className="text-center py-6 text-slate-500 text-xs bg-white rounded-lg border border-dashed border-slate-200">
                      Belum ada pembagian dividen. Klik "Tambah Penerima" untuk mendistribusikan dividen.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.rupstDividends.map((divItem: any, idx: number) => {
                        const rupsShareholders = Array.from(new Set([
                          ...(data.shareholders || []).filter((s: any) => (Number(s.sharesOwned) || 0) > 0).map((s: any) => s.name.trim()),
                          ...(data.finalShareholders || []).filter((s: any) => (Number(s.sharesOwned) || 0) > 0).map((s: any) => s.name.trim())
                        ].filter(Boolean))).sort();

                        return (
                          <div key={divItem.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-white border border-slate-200 rounded-lg items-center shadow-2xs">
                            <div className="md:col-span-4">
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Pemegang Saham #{idx + 1}</label>
                              <div className="relative">
                                <select
                                  className="w-full text-xs border border-slate-300 rounded-md p-1.5 bg-white font-medium focus:border-blue-500 appearance-none pr-7"
                                  value={divItem.shareholderName}
                                  onChange={e => {
                                    const newDividends = (data.rupstDividends || []).map((d: any) =>
                                      d.id === divItem.id ? { ...d, shareholderName: e.target.value } : d
                                    );
                                    updateData({ rupstDividends: newDividends });
                                  }}
                                >
                                  <option value="">-- Pilih Pemegang Saham --</option>
                                  {rupsShareholders.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                  ))}
                                </select>
                                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Persentase (%)</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="any"
                                  placeholder="0"
                                  className="w-full text-xs border border-slate-300 rounded-md p-1.5 pr-6 bg-white font-medium focus:border-blue-500"
                                  value={divItem.percentage === 0 ? '' : divItem.percentage}
                                  onChange={e => {
                                    const pct = parseFloat(e.target.value) || 0;
                                    const computedAmount = Math.round((pct / 100) * (data.rupstDividendAmount || 0));
                                    const newDividends = (data.rupstDividends || []).map((d: any) =>
                                      d.id === divItem.id ? { ...d, percentage: pct, amount: computedAmount } : d
                                    );
                                    updateData({ rupstDividends: newDividends });
                                  }}
                                />
                                <span className="absolute right-2 top-1.5 text-slate-400 text-xs font-bold">%</span>
                              </div>
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Jumlah Uang (Rp)</label>
                              <input
                                type="text"
                                placeholder="Jumlah..."
                                className="w-full text-xs border border-slate-300 rounded-md p-1.5 bg-white font-medium focus:border-blue-500"
                                value={divItem.amount === 0 ? '' : formatInputNumber(divItem.amount)}
                                onChange={e => {
                                  const cash = parseFormattedNumber(e.target.value);
                                  const computedPct = (data.rupstDividendAmount || 0) > 0 
                                    ? parseFloat(((cash / (data.rupstDividendAmount || 1)) * 100).toFixed(4))
                                    : 0;
                                  const newDividends = (data.rupstDividends || []).map((d: any) =>
                                    d.id === divItem.id ? { ...d, percentage: computedPct, amount: cash } : d
                                  );
                                  updateData({ rupstDividends: newDividends });
                                }}
                              />
                            </div>

                            <div className="md:col-span-3">
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tgl Dibayar</label>
                              <input
                                type="text"
                                placeholder="Contoh: 05 Juni 2026"
                                className="w-full text-xs border border-slate-300 rounded-md p-1.5 bg-white font-medium focus:border-blue-500"
                                value={divItem.paymentDate || ''}
                                onChange={e => {
                                  const newDividends = (data.rupstDividends || []).map((d: any) =>
                                    d.id === divItem.id ? { ...d, paymentDate: e.target.value } : d
                                  );
                                  updateData({ rupstDividends: newDividends });
                                }}
                              />
                            </div>

                            <div className="md:col-span-1 flex justify-center items-center pt-3 md:pt-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const newDividends = (data.rupstDividends || []).filter((d: any) => d.id !== divItem.id);
                                  updateData({ rupstDividends: newDividends });
                                }}
                                className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                title="Hapus"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Dividend Summary Row */}
                      {(() => {
                        const totalPct = (data.rupstDividends || []).reduce((sum: number, d: any) => sum + d.percentage, 0);
                        const totalCash = (data.rupstDividends || []).reduce((sum: number, d: any) => sum + d.amount, 0);
                        const isOverPct = totalPct > 100.01;
                        const isOverCash = totalCash > (data.rupstDividendAmount || 0) + 1;

                        return (
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center text-xs p-3 bg-white rounded-lg border border-slate-200 mt-2 font-medium">
                            <div className="flex flex-col sm:flex-row sm:gap-x-4">
                              <span className={isOverPct ? "text-red-600 font-bold" : "text-slate-700"}>
                                Total: <strong>{totalPct.toFixed(2)}%</strong> {isOverPct && "(Lebih dari 100%)"}
                              </span>
                              <span className={isOverCash ? "text-red-600 font-bold" : "text-slate-700"}>
                                Total Dibagikan: <strong>Rp {formatInputNumber(totalCash)}</strong> {isOverCash && "(Melebihi Total Dividen)"}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const validShs = (data.shareholders || []).filter((s: any) => (Number(s.sharesOwned) || 0) > 0);
                                if (validShs.length === 0) return;
                                const totalOriginalShares = validShs.reduce((sum: number, s: any) => sum + s.sharesOwned, 0);
                                if (totalOriginalShares === 0) return;

                                const autoDividends = validShs.map((s: any) => {
                                  const pct = parseFloat(((s.sharesOwned / totalOriginalShares) * 100).toFixed(4));
                                  const amt = Math.round((pct / 100) * (data.rupstDividendAmount || 0));
                                  return {
                                    id: Math.random().toString(36).substring(2),
                                    shareholderName: s.name,
                                    percentage: pct,
                                    amount: amt
                                  };
                                });
                                updateData({ rupstDividends: autoDividends });
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 font-bold underline transition-all mt-2 md:mt-0 cursor-pointer"
                            >
                              Isi Otomatis Proporsional Berdasarkan Kepemilikan Saham
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Alasan Audit & Komponen LK */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-3">
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-2">
                    {data.rupstIsAudited ? "Alasan Wajib Audit:" : "Alasan Tidak Wajib Audit:"}
                  </h5>
                  <div className="space-y-2 pt-1 text-xs text-slate-700 font-medium">
                    <label className="flex items-start gap-2 cursor-pointer hover:text-blue-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={data.rupstAlasanAuditA !== false}
                        onChange={(e) => updateData({ rupstAlasanAuditA: e.target.checked })}
                        className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300"
                      />
                      <span className="leading-tight">
                        a. Kegiatan Usaha Perseroan {data.rupstIsAudited ? "" : "tidak"} menghimpun dan/atau mengelola dana masyarakat.
                      </span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer hover:text-blue-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={data.rupstAlasanAuditB !== false}
                        onChange={(e) => updateData({ rupstAlasanAuditB: e.target.checked })}
                        className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300"
                      />
                      <span className="leading-tight">
                        b. Perseroan {data.rupstIsAudited ? "" : "tidak"} menerbitkan surat pengakuan utang kepada masyarakat.
                      </span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer hover:text-blue-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={data.rupstAlasanAuditC !== false}
                        onChange={(e) => updateData({ rupstAlasanAuditC: e.target.checked })}
                        className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300"
                      />
                      <span className="leading-tight">
                        c. Perseroan {data.rupstIsAudited ? "merupakan" : "tidak merupakan"} Perseroan Terbuka (Tbk).
                      </span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer hover:text-blue-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={data.rupstAlasanAuditD !== false}
                        onChange={(e) => updateData({ rupstAlasanAuditD: e.target.checked })}
                        className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300"
                      />
                      <span className="leading-tight">
                        d. Perseroan {data.rupstIsAudited ? "merupakan" : "tidak merupakan"} Persero.
                      </span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer hover:text-blue-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={data.rupstAlasanAuditE !== false}
                        onChange={(e) => updateData({ rupstAlasanAuditE: e.target.checked })}
                        className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300"
                      />
                      <span className="leading-tight">
                        e. Aset dan/atau jumlah peredaran usaha {data.rupstIsAudited ? "lebih" : "tidak lebih"} dari 50 Milyar, atau
                      </span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer hover:text-blue-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={data.rupstAlasanAuditF !== false}
                        onChange={(e) => updateData({ rupstAlasanAuditF: e.target.checked })}
                        className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300"
                      />
                      <span className="leading-tight">
                        f. {data.rupstIsAudited ? "" : "Tidak"} diwajibkan oleh peraturan perundang-undangan.
                      </span>
                    </label>
                  </div>
                </div>

                <div className="p-4 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-3">
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-2">
                    Komponen Laporan Keuangan Yang Disahkan:
                  </h5>
                  <div className="space-y-2 pt-1 text-xs text-slate-700 font-medium">
                    <label className="flex items-start gap-2 cursor-pointer hover:text-blue-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={data.rupstStatementNeraca}
                        onChange={(e) => updateData({ rupstStatementNeraca: e.target.checked })}
                        className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300"
                      />
                      <span className="leading-tight">Laporan Keuangan dilekatkan pada Notulen RUPST.</span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer hover:text-blue-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={data.rupstStatementLabaRugi}
                        onChange={(e) => updateData({ rupstStatementLabaRugi: e.target.checked })}
                        className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300"
                      />
                      <span className="leading-tight">Laporan mengenai Kegiatan Perseroan.</span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer hover:text-blue-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={data.rupstStatementPerubahanEkuitas}
                        onChange={(e) => updateData({ rupstStatementPerubahanEkuitas: e.target.checked })}
                        className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300"
                      />
                      <span className="leading-tight">Laporan Tanggung Jawab Sosial dan Lingkungan (TJSL).</span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer hover:text-blue-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={data.rupstStatementArusKas}
                        onChange={(e) => updateData({ rupstStatementArusKas: e.target.checked })}
                        className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300"
                      />
                      <span className="leading-tight">Rincian Masalah yang timbul selama tahun buku lampau.</span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer hover:text-blue-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={data.rupstStatementCatatan}
                        onChange={(e) => updateData({ rupstStatementCatatan: e.target.checked })}
                        className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300"
                      />
                      <span className="leading-tight">Laporan pengawasan Dewan Komisaris.</span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer hover:text-blue-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={data.rupstStatementNamaAnggota}
                        onChange={(e) => updateData({ rupstStatementNamaAnggota: e.target.checked })}
                        className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300"
                      />
                      <span className="leading-tight">Nama Anggota Direksi dan Dewan Komisaris.</span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer hover:text-blue-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={data.rupstStatementGaji}
                        onChange={(e) => updateData({ rupstStatementGaji: e.target.checked })}
                        className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300"
                      />
                      <span className="leading-tight">Gaji/honorarium dan tunjangan Direksi & Komisaris.</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: DATA RAPAT */}
            <div id="section-rapat" className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                    4
                  </div>
                  <h3 className="text-base font-bold text-slate-800 tracking-tight">
                    Data Rapat & Nomor Akta
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await handleManualSync('RUPST', data);
                    if (res && (typeof res === 'boolean' ? res : res.success)) {
                      const finalOrder = (res as any).orderNumber || data.draftAktaRupsOrderNumber;
                      const finalDeed = (res as any).deedNumber || data.draftAktaRupsNumber;
                      const projId = data.id || (currentEditingRupstId && currentEditingRupstId !== 'new' ? currentEditingRupstId : null);
                      if (projId && user) {
                        try {
                          await setDoc(doc(db, currentCollectionName, projId), sanitizeForFirestore({
                            ...data,
                            draftAktaRupsOrderNumber: finalOrder,
                            updatedAt: new Date().toISOString()
                          }), { merge: true });
                        } catch (e) {
                          console.warn("Auto-saving RUPST project after sync error:", e);
                        }
                      }
                      alert(`Nomor Akta ${finalDeed || ''} berhasil disimpan ke Buku Daftar Akta!\nNomor Urut Akta: ${finalOrder || ''}`);
                    }
                  }}
                  disabled={isSyncing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase px-4 py-2 rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
                  title="Simpan nomor akta RUPST ini ke Buku Daftar Akta Notaris"
                >
                  {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />}
                  <span>Simpan Nomor Akta ke Buku Akta</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Nomor Akta RUPST */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nomor Akta RUPST
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={data.draftAktaRupsNumber || ''}
                      onChange={e => updateData({ draftAktaRupsNumber: e.target.value })}
                      placeholder="Contoh: 08"
                      className="flex-1 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                    <button
                      type="button"
                      onClick={handleFetchLatestNumbers}
                      disabled={isFetchingNumbers}
                      className="px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
                      title="Ambil Nomor Terakhir"
                    >
                      <RefreshCw className={`w-4 h-4 ${isFetchingNumbers ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Nomor Urut Akta RUPST */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nomor Urut Akta RUPST
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={data.draftAktaRupsOrderNumber || ''}
                      onChange={e => updateData({ draftAktaRupsOrderNumber: e.target.value })}
                      placeholder="Contoh: 001"
                      className="flex-1 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                    <button
                      type="button"
                      onClick={handleFetchLatestNumbers}
                      disabled={isFetchingNumbers}
                      className="px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
                      title="Hitung Nomor Urut Sesuai Buku Akta"
                    >
                      <RefreshCw className={`w-4 h-4 ${isFetchingNumbers ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Tanggal Akta / Keputusan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {data.rupstType === 'sirkuler' ? 'Tanggal Keputusan Sirkuler' : 'Tanggal Akta RUPST'}
                  </label>
                  <input
                    type="date"
                    value={data.rupstType === 'sirkuler' ? (data.signingDate || data.draftAktaRupsDate || '') : (data.draftAktaRupsDate || '')}
                    onChange={e => {
                      if (data.rupstType === 'sirkuler') {
                        updateData({ signingDate: e.target.value, draftAktaRupsDate: e.target.value });
                      } else {
                        updateData({ draftAktaRupsDate: e.target.value });
                      }
                    }}
                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                {/* Jam Rapat */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Jam Rapat / Waktu Akta
                  </label>
                  <input
                    type="time"
                    value={data.draftAktaRupsTime || data.meetingStartTime || ''}
                    onChange={e => updateData({ draftAktaRupsTime: e.target.value, meetingStartTime: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                {/* Nomor Laporan Keuangan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nomor Laporan Keuangan
                  </label>
                  <input
                    type="text"
                    value={data.rupstFinancialReportNumber || ''}
                    onChange={e => updateData({ rupstFinancialReportNumber: e.target.value })}
                    placeholder="Contoh: LP/25/2024"
                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                {/* Tempat Rapat */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tempat Rapat <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.signingPlace || ''}
                    onChange={e => updateData({ signingPlace: e.target.value })}
                    placeholder="Contoh: Jakarta"
                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Additional fields for physical rapat */}
              {data.rupstType === 'rapat' && (
                <div className="pt-3 border-t border-slate-100 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nomor Pemanggilan RUPST</label>
                      <input
                        type="text"
                        value={data.rupstInvitationNumber || ''}
                        onChange={e => updateData({ rupstInvitationNumber: e.target.value })}
                        placeholder="Nomor pemanggilan..."
                        className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-800 focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Tanggal Pemanggilan RUPST</label>
                      <input
                        type="date"
                        value={data.rupstInvitationDate || ''}
                        onChange={e => updateData({ rupstInvitationDate: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-800 focus:border-blue-600"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Waktu Selesai Rapat</label>
                      <input
                        type="time"
                        value={data.meetingEndTime || data.rupstMeetingEndTime || ''}
                        onChange={e => updateData({ meetingEndTime: e.target.value, rupstMeetingEndTime: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-800 focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Hari/Tanggal Rapat Fisik</label>
                      <input
                        type="date"
                        value={data.signingDate || ''}
                        onChange={e => updateData({ signingDate: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-800 focus:border-blue-600"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Ketentuan AD Pimpinan Rapat</span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Pasal (cth: 9)"
                          value={data.rupstAdArticle || ''}
                          onChange={e => updateData({ rupstAdArticle: e.target.value })}
                          className="w-1/2 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Ayat (cth: 4)"
                          value={data.rupstAdParagraph || ''}
                          onChange={e => updateData({ rupstAdParagraph: e.target.value })}
                          className="w-1/2 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs bg-white"
                        />
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Ketentuan AD Kuorum</span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Pasal (cth: 10)"
                          value={data.rupstQuorumArticle || ''}
                          onChange={e => updateData({ rupstQuorumArticle: e.target.value })}
                          className="w-1/2 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Ayat (cth: 1)"
                          value={data.rupstQuorumParagraph || ''}
                          onChange={e => updateData({ rupstQuorumParagraph: e.target.value })}
                          className="w-1/2 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 5: PIMPINAN RAPAT */}
            <div id="section-pimpinan" className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                  5
                </div>
                <h3 className="text-base font-bold text-slate-800 tracking-tight">
                  Pimpinan Rapat
                </h3>
              </div>

              {data.rupstType === 'sirkuler' ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed flex items-center gap-3">
                  <Info className="w-5 h-5 text-slate-400 shrink-0" />
                  <span>Pada RUPST Sirkuler (Pasal 91 UU PT), keputusan diambil secara sirkuler tanpa rapat fisik sehingga tidak ada pimpinan rapat. Dokumen ditandatangani oleh seluruh pemegang saham.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Pilih Pimpinan Rapat <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={data.meetingChair || ''}
                        onChange={e => {
                          const selectedName = e.target.value;
                          const position = resolveRupsLbChairPosition(selectedName, chairCandidates);
                          updateData({ 
                            meetingChair: selectedName,
                            meetingChairPosition: position
                          });
                        }}
                        className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 appearance-none pr-10 bg-white"
                      >
                        <option value="">-- Pilih Pimpinan Rapat --</option>
                        {chairCandidates.map((m: any, idx: number) => (
                          <option key={idx} value={m.name}>{m.name} - {m.position}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Jabatan di PT
                    </label>
                    <input
                      type="text"
                      value={data.meetingChairPosition || ''}
                      onChange={e => updateData({ meetingChairPosition: e.target.value })}
                      placeholder="Contoh: Direktur Utama"
                      className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-slate-50"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 6: DAFTAR PEMEGANG SAHAM (SIRKULER) ATAU PEMEGANG SAHAM, DIREKSI, KOMISARIS (RAPAT) */}
            <div id="section-pihak" className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                    6
                  </div>
                  <h3 className="text-base font-bold text-slate-800 tracking-tight">
                    {isSirkuler ? 'Daftar Pemegang Saham (Para Pihak Sirkuler)' : 'Daftar Pemegang Saham, Direksi, dan Dewan Komisaris'}
                  </h3>
                </div>
                
                {!isSirkuler && (
                  <button
                    type="button"
                    onClick={() => {
                      const newList = (data.shareholders || []).map((s: any) => ({ ...s, isPresent: true }));
                      updateData({ shareholders: newList });
                    }}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 uppercase tracking-wide cursor-pointer self-start sm:self-auto"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tandai Semua Hadir</span>
                  </button>
                )}
              </div>

              {/* Filter Tabs: Disembunyikan pada Sirkuler Tahunan karena wajib seluruh pemegang saham */}
              {isSirkuler ? (
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                  <span className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold uppercase tracking-wider">
                    Pemegang Saham Wajib 100% Menyetujui & TTD
                  </span>
                  <span className="text-xs text-slate-500 font-semibold ml-1">
                    ({shCount} Pemegang Saham)
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
                  {[
                    { key: 'all', label: `Semua (${combinedStakeholders.length})` },
                    { key: 'sh', label: `Pemegang Saham (${shCount})` },
                    { key: 'dir', label: `Direksi (${dirCount})` },
                    { key: 'kom', label: `Komisaris (${komCount})` }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setStakeholderTab(tab.key as any)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all uppercase cursor-pointer select-none ${
                        stakeholderTab === tab.key
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Modern Minimalist Table (Read-Only: No edit/delete per row) */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="min-w-[700px] w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-600">
                    <tr>
                      <th className="p-3 w-12 text-center">NO</th>
                      <th className="p-3">NAMA LENGKAP</th>
                      <th className="p-3">JABATAN DALAM PERSEROAN</th>
                      <th className="p-3">JUMLAH SAHAM</th>
                      {!isSirkuler && <th className="p-3 text-center w-28">KEHADIRAN</th>}
                      <th className="p-3 text-center">DIKUASAKAN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {displayedStakeholders.length === 0 ? (
                      <tr>
                        <td colSpan={isSirkuler ? 5 : 6} className="p-6 text-center text-slate-400 italic">
                          {isSirkuler ? 'Tidak ada data pemegang saham.' : 'Tidak ada data yang sesuai dengan filter ini.'}
                        </td>
                      </tr>
                    ) : (
                      displayedStakeholders.map((person, idx) => (
                        <tr key={person.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 text-center font-semibold text-slate-500">{idx + 1}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-800 uppercase tracking-tight block">
                                {person.salutation ? `${person.salutation} ` : ''}{person.name}
                              </span>
                              {CorporateShareholderService.checkIsCorporateShareholder(person) && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                                  Badan Hukum (PT)
                                </span>
                              )}
                            </div>
                            {person.nik && !CorporateShareholderService.checkIsCorporateShareholder(person) && (
                              <span className="text-[10px] text-slate-400 font-mono">NIK: {person.nik}</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {person.roles.map((r: string, rIdx: number) => {
                                const isDir = /direktur|direksi/i.test(r);
                                const isKom = /komisaris/i.test(r);
                                const badgeClass = isDir 
                                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                  : isKom 
                                    ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                    : 'bg-slate-100 text-slate-700 border-slate-200';
                                return (
                                  <span key={rIdx} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${badgeClass}`}>
                                    {r}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="p-3">
                            {person.sharesOwned > 0 ? (
                              <div>
                                <span className="font-bold text-slate-800">{formatInputNumber(person.sharesOwned)} lembar</span>
                                <span className="text-slate-500 text-[11px] ml-1">({person.percentage.toFixed(1)}%)</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          {!isSirkuler && (
                            <td className="p-3 text-center">
                              {person.isShareholder ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newList = (data.shareholders || []).map((s: any) =>
                                      s.id === person.id ? { ...s, isPresent: !s.isPresent } : s
                                    );
                                    updateData({ shareholders: newList });
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer select-none ${
                                    person.isPresent 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                                      : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${person.isPresent ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                  <span>{person.isPresent ? 'Hadir' : 'Tidak'}</span>
                                </button>
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </td>
                          )}
                          <td className="p-3 text-center">
                            {person.isShareholder && (isSirkuler || person.isPresent) ? (
                              (() => {
                                const isCorp = CorporateShareholderService.checkIsCorporateShareholder(person);
                                const repName = person.guardianName || (person.isProxy && person.proxyData?.name) || '';
                                const repPos = person.representativePosition || person.proxyData?.occupation || person.proxyData?.position || (isCorp ? 'Direktur' : 'Penerima Kuasa');

                                if (repName) {
                                  return (
                                    <div className="flex flex-col items-center justify-center gap-1">
                                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${
                                        isCorp 
                                          ? 'text-blue-900 bg-blue-50 border-blue-200' 
                                          : 'text-orange-700 bg-orange-50 border-orange-200'
                                      }`}>
                                        {isCorp ? '🏢 Wakil: ' : 'Kuasa: '}{repName} ({repPos})
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setProxyModalOpenId(person.id)}
                                        className="text-[10px] text-blue-600 hover:underline font-semibold cursor-pointer"
                                      >
                                        Ubah Wakil / Kuasa
                                      </button>
                                    </div>
                                  );
                                }

                                return (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newList = (data.shareholders || []).map((s: any) =>
                                        s.id === person.id ? { ...s, isPresent: true, isProxy: true } : s
                                      );
                                      updateData({ shareholders: newList });
                                      setProxyModalOpenId(person.id);
                                    }}
                                    className={`text-[11px] font-bold px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                                      isCorp
                                        ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                                        : 'text-slate-500 hover:text-blue-600 border-dashed border-slate-300 hover:border-blue-400'
                                    }`}
                                  >
                                    {isCorp ? '+ Pilih Wakil PT (Direksi/Komisaris)' : '+ Kuasakan'}
                                  </button>
                                );
                              })()
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom alert banner */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-200/60 rounded-xl flex items-center gap-2.5 text-xs text-blue-800 font-medium">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  {isSirkuler
                    ? 'Keputusan Sirkuler wajib disetujui dan ditandatangani oleh seluruh pemegang saham (100% hak suara sah) sesuai Pasal 91 UU PT.'
                    : 'Daftar pemegang saham, direksi, dan dewan komisaris disinkronkan dari profil perseroan pada Master Klien. Kehadiran dan hak suara dihitung otomatis untuk kuorum.'}
                </span>
              </div>
            </div>

            {/* SECTION 7: KUASA */}
            <div id="section-kuasa" className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                  7
                </div>
                <h3 className="text-base font-bold text-slate-800 tracking-tight">
                  Kuasa dan Data Notariil
                </h3>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Pemberian Kuasa Notariil <span className="text-red-500">*</span>
                </label>
                
                {data.rupstType === 'sirkuler' ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500 italic">
                      * Pada RUPST Sirkuler, penerima kuasa wajib dari pemegang saham yang memiliki saham.
                    </p>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Pilih Pemegang Saham Penerima Kuasa</label>
                      <div className="relative">
                        <select
                          value={data.authorizedRepresentativeId || ''}
                          onChange={e => updateData({ authorizedRepresentativeId: e.target.value, representativeType: 'EXISTING' })}
                          className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-blue-600 appearance-none bg-white pr-10"
                        >
                          <option value="">-- Pilih Pemegang Saham --</option>
                          {(data.shareholders || [])
                            .filter((s: any) => (Number(s.sharesOwned) || 0) > 0)
                            .map((s: any) => (
                              <option key={s.id} value={s.id}>{s.name} ({formatInputNumber(s.sharesOwned)} Saham)</option>
                            ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm text-slate-800 font-semibold cursor-pointer select-none">
                        <input
                          type="radio"
                          checked={data.representativeType === 'EXISTING'}
                          onChange={() => updateData({ representativeType: 'EXISTING' })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Pilih dari Para Pihak</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-800 font-semibold cursor-pointer select-none">
                        <input
                          type="radio"
                          checked={data.representativeType === 'MANUAL'}
                          onChange={() => updateData({ representativeType: 'MANUAL' })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Input Manual</span>
                      </label>
                    </div>

                    {data.representativeType === 'EXISTING' ? (
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Pilih Pemegang Saham</label>
                        <div className="relative">
                          <select
                            value={data.authorizedRepresentativeId || ''}
                            onChange={e => updateData({ authorizedRepresentativeId: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-blue-600 appearance-none bg-white pr-10"
                          >
                            <option value="">-- Pilih Pemegang Saham --</option>
                            {(data.shareholders || [])
                              .filter((s: any) => (Number(s.sharesOwned) || 0) > 0)
                              .map((s: any) => (
                                <option key={s.id} value={s.id}>{s.name} ({formatInputNumber(s.sharesOwned)} Saham)</option>
                              ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
                        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Data Kuasa (Manual)</h4>
                        <ShareholderEditor
                          shareholder={data.manualRepresentative!}
                          onChange={updates => updateManualRep(updates)}
                          hideManagement
                          hideFinancials
                          totalSharesAllowed={0}
                          otherAllocated={0}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 8: DOKUMEN KELUARAN */}
            <div id="section-dokumen" className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                  8
                </div>
                <h3 className="text-base font-bold text-slate-800 tracking-tight">
                  Dokumen Keluaran
                </h3>
              </div>

              <p className="text-xs text-slate-500">
                Unduh dokumen hasil penyusunan RUPST dalam format Word (.docx) atau arsip (.zip).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                {/* Akta RUPST */}
                <div 
                  onClick={async () => {
                    try {
                      const { generateRUPSTAktaDocx } = await import('../../../lib/generateRUPSTAktaDocx');
                      await generateRUPSTAktaDocx(mergedData);
                    } catch (err) {
                      console.error('Failed to generate Draft Akta RUPST DOCX:', err);
                      alert('Gagal menghasilkan Draft Akta RUPST DOCX.');
                    }
                  }}
                  className="p-4 rounded-xl border border-slate-200 hover:border-blue-500 bg-white hover:bg-blue-50/30 transition-all shadow-2xs hover:shadow-xs cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <FileSignature className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                        {mergedData.rupstType === 'sirkuler' ? 'Akta Sirkuler RUPST' : 'Akta RUPST'}
                      </h4>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">Format resmi notaris (.docx)</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                    <span>Download Dokumen</span>
                    <Download className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Notulen RUPST */}
                <div 
                  onClick={async () => {
                    try {
                      if (mergedData.rupstType === 'sirkuler') {
                        const { generateSirkulerLaporanDocx } = await import('../../../lib/generateSirkulerLaporanDocx');
                        await generateSirkulerLaporanDocx(mergedData);
                      } else {
                        const { generateRUPSTDocx } = await import('../../../lib/generateRUPSTDocx');
                        await generateRUPSTDocx(mergedData);
                      }
                    } catch (err) {
                      console.error('Failed to generate RUPST DOCX:', err);
                      alert('Gagal menghasilkan RUPST DOCX.');
                    }
                  }}
                  className="p-4 rounded-xl border border-slate-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/30 transition-all shadow-2xs hover:shadow-xs cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                        {mergedData.rupstType === 'sirkuler' ? 'Sirkuler RUPST' : 'Notulen RUPST'}
                      </h4>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">Notulen rapat (.docx)</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
                    <span>Download Dokumen</span>
                    <Download className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Surat Pernyataan */}
                <div 
                  onClick={async () => {
                    try {
                      const { generateRUPSTPernyataanDocx } = await import('../../../lib/generateRUPSTPernyataanDocx');
                      await generateRUPSTPernyataanDocx(mergedData);
                    } catch (err) {
                      console.error('Failed to generate Statement RUPST DOCX:', err);
                      alert('Gagal menghasilkan Surat Pernyataan RUPST DOCX.');
                    }
                  }}
                  className="p-4 rounded-xl border border-slate-200 hover:border-amber-500 bg-white hover:bg-amber-50/30 transition-all shadow-2xs hover:shadow-xs cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                      <FileBadge className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 group-hover:text-amber-700 transition-colors">
                        Surat Pernyataan
                      </h4>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">Surat keabsahan (.docx)</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-600">
                    <span>Download Dokumen</span>
                    <Download className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Download Semua ZIP */}
                <div 
                  onClick={handleDownloadAllZip}
                  className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/30 transition-all shadow-2xs hover:shadow-xs cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <Archive className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                        Download Semua
                      </h4>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">Bundel lengkap (.zip)</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600">
                    <span>Download ZIP</span>
                    <Download className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </fieldset>
        </div>
      ) : (
        <div className="space-y-6">
          {/* SAVED RUPST CARD CONTAINER */}
          <div className="bg-white p-6 rounded-xl shadow-xs border border-slate-200/90">
            {/* Title and Search/Filter Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 pb-5 mb-5">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-[#1b449c]" />
                <h3 className="text-sm font-bold text-slate-800 tracking-tight uppercase">
                  NOTULEN RUPST TERSIMPAN
                </h3>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {/* Search Input */}
                <div className="relative flex-1 sm:flex-initial sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari berdasarkan nama PT..."
                    value={rupstSearchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-white text-slate-800 placeholder-slate-400 transition-all font-medium"
                  />
                  {rupstSearchQuery && (
                    <button
                      onClick={() => handleSearchChange("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-extrabold text-sm"
                      type="button"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Year Filter Dropdown */}
                <div className="relative">
                  <select
                    value={selectedRupstYear}
                    onChange={(e) => {
                      setSelectedRupstYear(e.target.value);
                      setRupstCurrentPage(1);
                    }}
                    className="appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-600 bg-white text-slate-800 font-medium cursor-pointer"
                  >
                    <option value="all">Semua Tahun</option>
                    {uniqueYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Filter Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsRupstFilterOpen(!isRupstFilterOpen)}
                  className={`p-2 border rounded-lg transition-all flex items-center justify-center hover:bg-slate-50 ${isRupstFilterOpen ? 'bg-blue-50 text-[#1b449c] border-[#1b449c]' : 'bg-white text-slate-600 border-slate-200'}`}
                  title="Toggle Quick Filter"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* STATUS FILTER TABS */}
            <div className="flex flex-wrap gap-1.5 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/50 max-w-max mb-5">
              {([
                { key: 'ALL', label: 'Semua RUPST', count: totalRupstAll },
                { key: 'PROSES', label: 'Dalam Proses', count: totalRupstProses },
                { key: 'SELESAI', label: 'Selesai', count: totalRupstSelesai }
              ] as const).map(tab => {
                const isActive = rupstActiveTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setRupstActiveTab(tab.key);
                      setRupstCurrentPage(1);
                    }}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-2 uppercase tracking-wide cursor-pointer select-none ${
                      isActive
                        ? tab.key === 'SELESAI'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : tab.key === 'PROSES'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-[#1b449c] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Filter Expansion */}
            {isRupstFilterOpen && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-5 flex flex-wrap gap-2.5 items-center">
                <span className="text-xs font-bold text-slate-500 uppercase">Filter Status:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRupstSearchQuery("");
                      setSelectedRupstYear("all");
                      setRupstSortField("updatedAt");
                      setRupstSortOrder("desc");
                      setRupstCurrentPage(1);
                      setIsRupstFilterOpen(false);
                    }}
                    className="bg-white hover:bg-slate-100 text-[11px] font-semibold text-slate-600 px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  >
                    Reset Semua
                  </button>
                </div>
              </div>
            )}

            {/* TABLE AREA */}
            {currentRupstProjects.length === 0 ? (
              <div className="bg-slate-50 text-center py-10 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs font-medium">
                Belum ada notulen RUPST yang disimpan.
              </div>
            ) : sortedResults.length === 0 ? (
              <div className="bg-slate-50 text-center py-12 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs font-medium">
                Tidak ada notulen RUPST yang cocok dengan pencarian atau filter Anda.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs bg-white">
                <table className="min-w-[600px] w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200">
                      <th className="px-4 py-3.5 text-slate-600 font-bold uppercase w-[60px] text-center">NO</th>
                      <th 
                        onClick={() => handleSort("companyName")}
                        className="px-4 py-3.5 text-slate-600 font-bold uppercase cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      >
                        <div className="flex items-center">
                          <span>NAMA PT</span>
                          {renderSortArrows("companyName")}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort("rupstFiscalYear")}
                        className="px-4 py-3.5 text-slate-600 font-bold uppercase cursor-pointer hover:bg-slate-100 transition-colors select-none w-[110px]"
                      >
                        <div className="flex items-center">
                          <span>TAHUN</span>
                          {renderSortArrows("rupstFiscalYear")}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort("status")}
                        className="px-4 py-3.5 text-slate-600 font-bold uppercase cursor-pointer hover:bg-slate-100 transition-colors select-none w-[120px]"
                      >
                        <div className="flex items-center">
                          <span>STATUS</span>
                          {renderSortArrows("status")}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort("updatedAt")}
                        className="px-4 py-3.5 text-slate-600 font-bold uppercase cursor-pointer hover:bg-slate-100 transition-colors select-none w-[180px]"
                      >
                        <div className="flex items-center">
                          <span>TERAKHIR DIUBAH</span>
                          {renderSortArrows("updatedAt")}
                        </div>
                      </th>
                      <th className="px-4 py-3.5 text-slate-600 font-bold uppercase text-center w-[150px]">DOWNLOAD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {paginatedResults.map((p, idx) => {
                      const overallIdx = startIndex + idx + 1;
                      return (
                        <tr 
                          key={p.id} 
                          className="hover:bg-slate-50 transition-colors duration-150 odd:bg-white even:bg-slate-50/40 cursor-pointer"
                          onClick={() => {
                            setCurrentEditingRupstId(p.id);
                            setIsRupstPreview(true);
                            updateData({ ...INITIAL_STATE, ...p } as any);
                          }}
                        >
                          <td className="px-4 py-3.5 text-center font-semibold text-slate-500">{overallIdx}</td>
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-800 tracking-tight">{p.companyName}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-slate-700">{p.rupstFiscalYear || '-'}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <DocumentStatusBadge status={p.documentStatus || p.rupstStatus || "DRAFTING"} />
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 font-medium">
                            {formatLastUpdated(p.updatedAt, p.signingDate)}
                          </td>
                          <td className="px-4 py-3.5 relative" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-center items-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRupstDropdownId(rupstDropdownId === p.id ? null : p.id!);
                                }}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer ${
                                  rupstDropdownId === p.id ? 'bg-[#0c2444] text-white border-[#0c2444]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                                }`}
                              >
                                <Download className="w-3.5 h-3.5" /> Download <ChevronDown className={`w-3.5 h-3.5 transition-transform ${rupstDropdownId === p.id ? 'rotate-180' : ''}`} />
                              </button>
                            </div>

                            {rupstDropdownId === p.id && (
                              <div className="absolute right-4 top-13 bg-white border border-slate-200 shadow-xl rounded-xl py-1.5 w-[220px] z-50 text-left overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
                                {/* Notulen / Sirkuler RUPST */}
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setRupstDropdownId(null);
                                    try {
                                      if (p.rupstType === 'sirkuler') {
                                        const { generateSirkulerLaporanDocx } = await import('../../../lib/generateSirkulerLaporanDocx');
                                        await generateSirkulerLaporanDocx({ ...INITIAL_STATE, ...p } as any);
                                      } else {
                                        const { generateRUPSTDocx } = await import('../../../lib/generateRUPSTDocx');
                                        await generateRUPSTDocx({ ...INITIAL_STATE, ...p } as any);
                                      }
                                    } catch (err) {
                                      console.error('Failed to generate RUPST DOCX:', err);
                                      alert('Gagal mengunduh Notulen RUPST.');
                                    }
                                  }}
                                  className="w-full px-4 py-2 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-2.5 uppercase tracking-wide border-b border-slate-100 cursor-pointer"
                                >
                                  <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                                  <div className="flex flex-col text-left">
                                    <span className="leading-tight">
                                      {p.rupstType === 'sirkuler' ? 'SIRKULER RUPST' : 'NOTULEN RUPST'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 lowercase font-medium mt-0.5">.docx</span>
                                  </div>
                                </button>

                                {/* Surat Pernyataan */}
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setRupstDropdownId(null);
                                    try {
                                      const { generateRUPSTPernyataanDocx } = await import('../../../lib/generateRUPSTPernyataanDocx');
                                      await generateRUPSTPernyataanDocx({ ...INITIAL_STATE, ...p } as any);
                                    } catch (err) {
                                      console.error('Failed to generate Statement RUPST DOCX:', err);
                                      alert('Gagal mengunduh Surat Pernyataan.');
                                    }
                                  }}
                                  className="w-full px-4 py-2 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-2.5 uppercase tracking-wide border-b border-slate-100 cursor-pointer"
                                >
                                  <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                                  <div className="flex flex-col text-left">
                                    <span className="leading-tight">Surat Pernyataan</span>
                                    <span className="text-[10px] text-slate-400 lowercase font-medium mt-0.5">.docx</span>
                                  </div>
                                </button>

                                {/* Draft Akta RUPST */}
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setRupstDropdownId(null);
                                    try {
                                      const { generateRUPSTAktaDocx } = await import('../../../lib/generateRUPSTAktaDocx');
                                      await generateRUPSTAktaDocx({ ...INITIAL_STATE, ...p } as any);
                                    } catch (err) {
                                      console.error('Failed to generate Draft Akta RUPST DOCX:', err);
                                      alert('Gagal mengunduh Draft Akta RUPST.');
                                    }
                                  }}
                                  className="w-full px-4 py-2 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-2.5 uppercase tracking-wide border-b border-slate-100 cursor-pointer"
                                >
                                  <FileCode className="w-4 h-4 text-blue-500 shrink-0" />
                                  <div className="flex flex-col text-left">
                                    <span className="leading-tight">
                                      {p.rupstType === 'sirkuler' ? 'AKTA SIRKULER RUPST' : 'AKTA RUPST'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 lowercase font-medium mt-0.5">.docx</span>
                                  </div>
                                </button>

                                {/* Simpan ke Buku Akta */}
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setRupstDropdownId(null);
                                    try {
                                      const rowData = { ...INITIAL_STATE, ...p } as any;
                                      const res = await handleManualSync('RUPST', rowData);
                                      if (res && (typeof res === 'boolean' ? res : res.success)) {
                                        const finalOrder = (res as any).orderNumber || p.draftAktaRupsOrderNumber;
                                        const finalDeed = (res as any).deedNumber || p.draftAktaRupsNumber;
                                        if (p.id) {
                                          await setDoc(doc(db, currentCollectionName, p.id), sanitizeForFirestore({
                                            ...p,
                                            draftAktaRupsOrderNumber: finalOrder,
                                            updatedAt: new Date().toISOString()
                                          }), { merge: true });
                                        }
                                        alert(`Nomor Akta ${finalDeed || ''} berhasil disimpan ke Buku Daftar Akta!\nNomor Urut Akta: ${finalOrder || ''}`);
                                      }
                                    } catch (err: any) {
                                      alert('Gagal menyimpan ke Buku Akta: ' + (err?.message || 'Terjadi kesalahan'));
                                    }
                                  }}
                                  className="w-full px-4 py-2 text-emerald-700 hover:bg-emerald-50 text-xs font-bold flex items-center gap-2.5 uppercase tracking-wide border-b border-slate-100 cursor-pointer"
                                >
                                  <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <div className="flex flex-col text-left">
                                    <span className="leading-tight">Simpan ke Buku Akta</span>
                                    <span className="text-[10px] text-slate-400 lowercase font-medium mt-0.5">register notaris</span>
                                  </div>
                                </button>

                                {/* Download Semua (.zip) */}
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setRupstDropdownId(null);
                                    try {
                                      const zip = new JSZip();
                                      const { generateRUPSTDocx } = await import('../../../lib/generateRUPSTDocx');
                                      const { generateRUPSTPernyataanDocx } = await import('../../../lib/generateRUPSTPernyataanDocx');
                                      const { generateRUPSTAktaDocx } = await import('../../../lib/generateRUPSTAktaDocx');
                                      const { saveAs } = (await import('file-saver'));
                                      
                                      const rowData = { ...INITIAL_STATE, ...p } as any;
                                      
                                      const docxResult = await generateRUPSTDocx(rowData, true);
                                      if (docxResult) zip.file(docxResult.filename, docxResult.blob);
                                      
                                      const pernyataanResult = await generateRUPSTPernyataanDocx(rowData, true);
                                      if (pernyataanResult) zip.file(pernyataanResult.filename, pernyataanResult.blob);
                                      
                                      const aktaResult = await generateRUPSTAktaDocx(rowData, true);
                                      if (aktaResult) zip.file(aktaResult.filename, aktaResult.blob);
                                      
                                      const content = await zip.generateAsync({ type: "blob" });
                                      saveAs(content, `Dokumen RUPST ${p.companyName || 'PT Baru'}.zip`);
                                    } catch (err) {
                                      console.error('Failed to generate ZIP:', err);
                                      alert('Gagal mengunduh File ZIP.');
                                    }
                                  }}
                                  className="w-full px-4 py-2 text-emerald-700 hover:bg-emerald-50/40 text-xs font-bold flex items-center gap-2.5 uppercase tracking-wide transition-colors cursor-pointer"
                                >
                                  <Archive className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <div className="flex flex-col text-left">
                                    <span className="leading-tight">Download Semua</span>
                                    <span className="text-[10px] text-emerald-500/70 lowercase font-medium mt-0.5">arsip (.zip)</span>
                                  </div>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* PAGINATION SECTION */}
            {totalItems > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-150 text-slate-500 text-xs font-medium">
                <div>
                  Menampilkan <span className="font-semibold text-slate-700">{startIndex + 1}</span> sampai <span className="font-semibold text-slate-700">{Math.min(startIndex + itemsPerPage, totalItems)}</span> dari <span className="font-semibold text-slate-700">{totalItems}</span> data
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safeCurrentPage === 1}
                    onClick={() => setRupstCurrentPage(Math.max(1, safeCurrentPage - 1))}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed uppercase"
                  >
                    Sebelumnya
                  </button>
                  
                  {getPageRange().map((p, idx) => {
                    const isEllipsis = p === "...";
                    const isActive = p === safeCurrentPage;
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={isEllipsis}
                        onClick={() => setRupstCurrentPage(Number(p))}
                        className={`px-3 py-1.5 border rounded-lg text-xs font-semibold transition-colors ${
                          isActive 
                            ? "bg-blue-600 border-blue-600 text-white font-bold" 
                            : isEllipsis 
                              ? "border-transparent bg-transparent text-slate-400 cursor-default" 
                              : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={safeCurrentPage === totalPages}
                    onClick={() => setRupstCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed uppercase"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Toast Notification */}
      <ToastNotification
        toast={toast}
        onClose={() => setToast(null)}
      />
    </div>
  );
};

export default RUPSTPage;
