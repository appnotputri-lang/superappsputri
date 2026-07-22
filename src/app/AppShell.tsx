import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { mapCompanyProfileToPendirian } from '../domain/company/mappers/companyProfileToPendirian';
import { mapPartiesToShareholdersAndManagement } from '../domain/project/mappers/partyToShareholder';
import { INITIAL_STATE, INITIAL_ADDRESS, INITIAL_MANUAL_REP, INITIAL_RESOLUTIONS } from "../domain/company/initialCompanyData";
import { TAB_TO_PATH, PATH_TO_TAB } from "../constants/tabs";
import { AppLayout, SidebarTabId } from './layout/AppLayout';
import { AppBootstrap } from './bootstrap/AppBootstrap';
import { AppEffects } from './effects/AppEffects';
import { GlobalDialogBootstrap } from './global/GlobalDialogBootstrap';
import { AppRoutes } from './AppRoutes';
import { useAuthContext } from '../contexts/AuthContext';
import { useCompanyContext } from '../contexts/CompanyContext';
import { useProjectContext } from '../contexts/ProjectContext';
import { useNotificationContext } from '../contexts/NotificationContext';
import { useProjectSession } from '../domain/project/useProjectSession';
import { useDocumentRuntime } from '../domain/company/useDocumentRuntime';
import { NotificationService } from '../services/NotificationService';
import { ProjectService } from '../services/ProjectService';
import { fetchLatestDeedNumbers } from '../lib/deedUtils';
import { syncToUtama, getDeedTitle, formatAppearersForRups, formatAppearersForPendirian } from '../lib/syncUtama';
import { CompanyData, Shareholder, ResolutionFlags, KbliItem, ManagementItem, DocumentType, Address, ManagementChangeType, CompanyProfile, AmendmentDeed, Guest, ShareTransfer, UserRole, UserProfile } from '../../types';
import { DraftAktaAppRef } from '../DraftAktaApp';
import kbli2025Data from '../../kbli_2025.json';
import { KBLI_DATA } from '../../utils/kbliData';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import JSZip from 'jszip';

type TabId = 'general' | 'shareholders' | 'shareholders_new' | 'representative' | 'agenda' | 'kbli' | 'domicile' | 'address' | 'capitalBase' | 'capitalPaid' | 'management' | 'reappointment';

export const AppShell: React.FC = () => {
  const { user, userProfile, authLoading, loginWithGoogle, logout } = useAuthContext();
  const [activeTab, setActiveTab] = useState<TabId | null>(null);

  const {
    editingProjectId,
    setEditingProjectId,
    editingRupstId,
    setEditingRupstId,
    editingPendirianId,
    setEditingPendirianId,
    editingProfileId,
    setEditingProfileId,
    selectedProjectId,
    setSelectedProjectId,
    activeProjectContext,
    setActiveProjectContext,
    activeProjectJobType,
    setActiveProjectJobType,
    openProject,
    closeProject,
    switchProject,
    activateProject,
    deactivateProject
  } = useProjectSession();

  const {
    data,
    setData,
    updateData,
    resetData,
    mergedData,
    setAutosaveParams
  } = useDocumentRuntime();

  const companyCtx = useCompanyContext();
  const profiles = companyCtx.profiles;
  const cvProfiles = companyCtx.cvProfiles;
  const saveCompany = companyCtx.save;
  const deleteCompany = companyCtx.delete;

  const projectCtx = useProjectContext();
  const projects = projectCtx.projects;
  const rupstProjects = projectCtx.rupstProjects;
  const pendirianProjects = projectCtx.pendirianProjects;

  const { notifications } = useNotificationContext();

  const [editingCvProfileId, setEditingCvProfileId] = useState<string | null>(null);
  const [isProfilePreview, setIsProfilePreview] = useState(false);
  const [cvProfileSearchQuery, setCvProfileSearchQuery] = useState('');
  const [cvProfileCurrentPage, setCvProfileCurrentPage] = useState(1);

  const [proxyModalOpenId, setProxyModalOpenId] = useState<string | null>(null);

  const [editingShareholder, setEditingShareholder] = useState<Shareholder | null>(null);
  const [editMode, setEditMode] = useState<'lama' | 'baru' | null>(null);
  const [currentTargetSharesPaid, setCurrentTargetSharesPaid] = useState<number | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRupsPreview, setIsRupsPreview] = useState(false);
  const [isRupslbDocDropdownOpen, setIsRupslbDocDropdownOpen] = useState(false);
  const [rupslbDropdownId, setRupslbDropdownId] = useState<string | null>(null);
  const [notulenSearchQuery, setNotulenSearchQuery] = useState('');
  const [selectedRupslbYear, setSelectedRupslbYear] = useState<string>('all');
  const [rupslbSortField, setRupslbSortField] = useState<'date' | 'company'>('date');
  const [rupslbSortOrder, setRupslbSortOrder] = useState<'asc' | 'desc'>('desc');
  const [rupslbCurrentPage, setRupslbCurrentPage] = useState(1);
  const [isRupslbFilterOpen, setIsRupslbFilterOpen] = useState(false);

  const [isRupstPreview, setIsRupstPreview] = useState(false);
  const [isRupstDocDropdownOpen, setIsRupstDocDropdownOpen] = useState(false);
  const [rupstDropdownId, setRupstDropdownId] = useState<string | null>(null);
  const [rupstSearchQuery, setRupstSearchQuery] = useState('');
  const [selectedRupstYear, setSelectedRupstYear] = useState<string>('all');
  const [rupstSortField, setRupstSortField] = useState<'date' | 'company'>('date');
  const [rupstSortOrder, setRupstSortOrder] = useState<'asc' | 'desc'>('desc');
  const [rupstCurrentPage, setRupstCurrentPage] = useState(1);
  const [isRupstFilterOpen, setIsRupstFilterOpen] = useState(false);
  const [rupstActiveTab, setRupstActiveTab] = useState<'profil' | 'laporan' | 'notulen' | 'semua'>('semua');

  const [currentPendirianData, setCurrentPendirianData] = useState<any>(null);
  const [showPendirianPreview, setShowPendirianPreview] = useState(false);
  const [pendirianPreviewData, setPendirianPreviewData] = useState<any>(null);
  const [isExportingPendirian, setIsExportingPendirian] = useState(false);

  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [zoom, setZoom] = useState(100);

  const [isAddKbliModalOpen, setIsAddKbliModalOpen] = useState(false);
  const [kbliModalSearchTerm, setKbliModalSearchTerm] = useState('');
  const [kbliModalSearchResults, setKbliModalSearchResults] = useState<KbliItem[]>([]);
  const [kbliCurrentPage, setKbliCurrentPage] = useState(1);
  const [kbliCheckedKblis, setKbliCheckedKblis] = useState<Record<string, boolean>>({});

  const [presetLoadedForProject, setPresetLoadedForProject] = useState<string | null>(null);

  const [isFetchingNumbers, setIsFetchingNumbers] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const markAsSaved = useCallback(() => {
    const now = new Date();
    const formatted = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setLastSavedTime(formatted);
    setSaveStatus('saved');
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'dirty') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  useEffect(() => {
    if (isSaving) {
      setSaveStatus('saving');
    } else {
      setSaveStatus(prev => {
        if (prev === 'saving') {
          const now = new Date();
          const formatted = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          setLastSavedTime(formatted);
          return 'saved';
        }
        return prev;
      });
    }
  }, [isSaving]);

  const draftAktaRef = useRef<DraftAktaAppRef>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const activeSidebarTab = useMemo(() => {
    return PATH_TO_TAB[location.pathname] || 'beranda';
  }, [location.pathname]);

  const setActiveSidebarTab = (tab: SidebarTabId) => {
    closeProject();
    const path = TAB_TO_PATH[tab] || '/';
    navigate(path);
  };

  useEffect(() => {
    setAutosaveParams({
      activeSidebarTab,
      editingProjectId,
      setEditingProjectId,
      editingRupstId,
      setEditingRupstId,
      editingPendirianId,
      setEditingPendirianId,
      currentPendirianData,
      user,
      profiles
    });
  }, [
    activeSidebarTab,
    editingProjectId,
    setEditingProjectId,
    editingRupstId,
    setEditingRupstId,
    editingPendirianId,
    setEditingPendirianId,
    currentPendirianData,
    user,
    profiles,
    setAutosaveParams
  ]);

  const loadedDocIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentDocId = editingProjectId || editingRupstId || editingPendirianId;
    const sessionKey = `${location.pathname}_${currentDocId}_${activeProjectContext}`;

    if (!currentDocId && !activeProjectContext) {
      loadedDocIdRef.current = null;
      return;
    }

    if (loadedDocIdRef.current === sessionKey) {
      return;
    }

    const loadSessionData = async () => {
      const normalizeKblis = (items: any[]) => (items || []).map((k: any) => ({
        id: k.id || crypto.randomUUID(),
        code: k.code || k.kode || '',
        name: k.name || k.judul || k.title || '',
        description: k.description || k.uraian || '',
        categoryLetter: k.categoryLetter || '',
        categoryName: k.categoryName || '',
        uraian: k.uraian || k.description || ''
      }));

      // 1. If editing an existing RUPSLB document
      if (location.pathname === '/rupslb' && editingProjectId && editingProjectId !== 'new') {
        let found = projects.find((p: any) => p.id === editingProjectId || p.projectId === editingProjectId);
        if (!found) {
          try {
            const snap = await getDoc(doc(db, 'projects', editingProjectId));
            if (snap.exists()) found = { id: snap.id, ...snap.data() } as any;
          } catch (e) {
            console.error("Error fetching project doc directly:", e);
          }
        }
        if (found) {
          updateData({
            ...INITIAL_STATE,
            ...found,
            kbliItems: normalizeKblis(found.kbliItems)
          });
          loadedDocIdRef.current = sessionKey;
          return;
        }
      }

      // 2. If editing an existing RUPST document
      if (location.pathname === '/rupst' && editingRupstId && editingRupstId !== 'new') {
        let found = rupstProjects.find((p: any) => p.id === editingRupstId || p.projectId === editingRupstId);
        if (!found) {
          try {
            const snap = await getDoc(doc(db, 'rupst_projects', editingRupstId));
            if (snap.exists()) found = { id: snap.id, ...snap.data() } as any;
          } catch (e) {
            console.error("Error fetching RUPST doc directly:", e);
          }
        }
        if (found) {
          updateData({
            ...INITIAL_STATE,
            ...found,
            kbliItems: normalizeKblis(found.kbliItems)
          });
          loadedDocIdRef.current = sessionKey;
          return;
        }
      }

      // 3. If editing an existing Pendirian document
      if (location.pathname === '/pendirian' && editingPendirianId && editingPendirianId !== 'new') {
        let found = pendirianProjects.find((p: any) => p.id === editingPendirianId || p.projectId === editingPendirianId);
        if (!found) {
          try {
            const snap = await getDoc(doc(db, 'pendirian_projects', editingPendirianId));
            if (snap.exists()) found = { id: snap.id, ...snap.data() } as any;
          } catch (e) {
            console.error("Error fetching Pendirian doc directly:", e);
          }
        }
        if (found) {
          updateData({
            ...INITIAL_STATE,
            ...found,
            kbliItems: normalizeKblis(found.kbliItems)
          });
          loadedDocIdRef.current = sessionKey;
          return;
        }
      }

      // 4. If creating a new document ('new') with an activeProjectContext
      if (activeProjectContext) {
        try {
          const proj = await ProjectService.getProject(activeProjectContext);
          if (proj) {
            const profile = profiles.find((p: any) => p.id === proj.clientId || p.id === activeProjectContext || (p.companyName && proj.title && p.companyName.toLowerCase().trim() === proj.title.toLowerCase().trim()));
            if (profile) {
              updateData({
                ...INITIAL_STATE,
                ...profile,
                selectedProfileId: profile.id,
                companyName: profile.companyName,
                kbliItems: normalizeKblis(profile.kbliItems),
                shareholders: (profile.shareholders && profile.shareholders.length > 0) ? profile.shareholders : ((proj.clientSnapshot?.shareholders || []) as Shareholder[]),
                oldManagementItems: profile.oldManagementItems || profile.newManagementItems || (profile as any).managementItems || proj.clientSnapshot?.managementItems || []
              });
              loadedDocIdRef.current = sessionKey;
              setPresetLoadedForProject(activeProjectContext);
              return;
            } else if (profiles.length === 0) {
              // Profiles not loaded yet from context! Fallback to available snapshot/parties/title, but DO NOT lock loadedDocIdRef.current so it retries when profiles loads
              if (proj.clientSnapshot) {
                const snap = proj.clientSnapshot as any;
                updateData({
                  ...INITIAL_STATE,
                  ...snap,
                  kbliItems: normalizeKblis(snap.kbliItems)
                });
              } else if (proj.parties && proj.parties.length > 0) {
                const { shareholders: partySh, oldManagementItems: partyMgmt } = mapPartiesToShareholdersAndManagement(proj.parties);
                updateData({
                  ...INITIAL_STATE,
                  companyName: proj.title,
                  shareholders: partySh,
                  oldManagementItems: partyMgmt
                });
              } else if (proj.title) {
                updateData({ ...INITIAL_STATE, companyName: proj.title });
              }
              return;
            } else {
              // profiles is loaded (>0), but profile was not found in profiles list
              if (proj.clientSnapshot) {
                const snap = proj.clientSnapshot as any;
                updateData({
                  ...INITIAL_STATE,
                  ...snap,
                  kbliItems: normalizeKblis(snap.kbliItems)
                });
              } else if (proj.parties && proj.parties.length > 0) {
                const { shareholders: partySh, oldManagementItems: partyMgmt } = mapPartiesToShareholdersAndManagement(proj.parties);
                updateData({
                  ...INITIAL_STATE,
                  companyName: proj.title,
                  shareholders: partySh,
                  oldManagementItems: partyMgmt
                });
              } else if (proj.title) {
                updateData({ ...INITIAL_STATE, companyName: proj.title });
              }
              loadedDocIdRef.current = sessionKey;
              setPresetLoadedForProject(activeProjectContext);
              return;
            }
          }
        } catch (err) {
          console.error("Error loading project session data:", err);
        }
      }

      // 5. If creating a new document ('new') without activeProjectContext
      if (currentDocId === 'new') {
        updateData({ ...INITIAL_STATE });
        loadedDocIdRef.current = sessionKey;
      }
    };

    loadSessionData();
  }, [
    editingProjectId,
    editingRupstId,
    editingPendirianId,
    activeProjectContext,
    location.pathname,
    projects,
    rupstProjects,
    pendirianProjects,
    profiles,
    updateData
  ]);

  const recordNotification = (title: string, message: string, type: 'create_project' | 'update_project' | 'delete_project' | 'create_profile' | 'update_profile' | 'delete_profile' | 'system' = 'system') => {
    if (user) {
      NotificationService.sendNotification(user, title, message, type);
    }
  };

  const handleFetchLatestNumbers = async () => {
    if (!data.companyName) {
      alert("Silakan isi Nama Perseroan terlebih dahulu.");
      return;
    }
    setIsFetchingNumbers(true);
    try {
      const result = await fetchLatestDeedNumbers(data.companyName) as any;
      if (result) {
        updateData({
          establishmentDeedNumber: result.establishmentDeedNumber || data.establishmentDeedNumber,
          establishmentDeedDate: result.establishmentDeedDate || data.establishmentDeedDate,
          establishmentNotary: result.establishmentNotary || data.establishmentNotary,
          establishmentNotaryTitle: result.establishmentNotaryTitle || data.establishmentNotaryTitle,
          establishmentNotaryDomicile: result.establishmentNotaryDomicile || data.establishmentNotaryDomicile,
          establishmentSkNumber: result.establishmentSkNumber || data.establishmentSkNumber,
          establishmentSkDate: result.establishmentSkDate || data.establishmentSkDate,
          amendmentDeeds: result.amendmentDeeds && result.amendmentDeeds.length > 0 ? result.amendmentDeeds : data.amendmentDeeds
        });
        alert(`Berhasil menemukan ${result.sourceCount || 1} dokumen sebelumnya! Data Akta Pendirian & Perubahan telah diperbarui.`);
      } else {
        alert("Tidak ditemukan riwayat akta/notulen sebelumnya untuk perseroan ini.");
      }
    } catch (error) {
      console.error("Error fetching latest deed numbers:", error);
      alert("Gagal mengambil data akta terbaru.");
    } finally {
      setIsFetchingNumbers(false);
    }
  };

  const syncCompanyDataToRupst = async (selectedProfile: CompanyProfile) => {
    if (!selectedProfile) return;
    const baseData = { ...INITIAL_STATE, ...selectedProfile };
    setData(baseData);
    alert(`Data perseroan "${selectedProfile.companyName}" berhasil disinkronkan ke form RUPST!`);
  };

  const openShareholderEditor = (mode: 'lama' | 'baru', shareholder?: Shareholder) => {
    setEditMode(mode);
    setEditingShareholder(shareholder ? { ...shareholder } : null);
    setCurrentTargetSharesPaid(null);
  };

  const saveShareholder = (s: Shareholder) => {
    if (!editMode) return;
    const rawData = data as any;

    if (editMode === 'lama') {
      const existing = data.shareholders.find(x => x.id === s.id);
      if (existing) {
        updateData({
          shareholders: data.shareholders.map(x => x.id === s.id ? s : x)
        });
      } else {
        updateData({
          shareholders: [...data.shareholders, s]
        });
      }
    } else if (editMode === 'baru') {
      const newShs = rawData.finalShareholders || rawData.newShareholders || [];
      const existing = newShs.find((x: any) => x.id === s.id);
      if (existing) {
        updateData({
          finalShareholders: newShs.map((x: any) => x.id === s.id ? s : x),
          newShareholders: newShs.map((x: any) => x.id === s.id ? s : x)
        } as any);
      } else {
        updateData({
          finalShareholders: [...newShs, s],
          newShareholders: [...newShs, s]
        } as any);
      }
    }

    setEditingShareholder(null);
    setEditMode(null);
  };

  const deleteShareholder = (id: string, mode: 'lama' | 'baru') => {
    const rawData = data as any;
    if (mode === 'lama') {
      updateData({
        shareholders: data.shareholders.filter(x => x.id !== id)
      });
    } else {
      const newShs = rawData.finalShareholders || rawData.newShareholders || [];
      updateData({
        finalShareholders: newShs.filter((x: any) => x.id !== id),
        newShareholders: newShs.filter((x: any) => x.id !== id)
      } as any);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      alert('Data berhasil disinkronisasi!');
    } catch (err) {
      console.error('Error syncing data:', err);
      alert('Gagal melakukan sinkronisasi data.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = async () => {
    if (draftAktaRef.current) {
      try {
        if ((draftAktaRef.current as any).exportWord) {
          await (draftAktaRef.current as any).exportWord();
        }
      } catch (e) {
        console.error("Export Word error:", e);
        alert("Gagal melakukan ekspor dokumen Word.");
      }
    } else {
      alert("Draft Akta belum siap untuk diekspor.");
    }
  };

  const handlePendirianExportWord = async () => {
    setIsExportingPendirian(true);
    try {
      const zip = new JSZip();
      const companyTitle = (currentPendirianData?.companyName || data.companyName || 'PENDIRIAN_PT').toUpperCase().replace(/[^A-Z0-9]/g, '_');

      zip.file(`01_DRAFT_AKTA_PENDIRIAN_${companyTitle}.docx`, "Draft Akta Pendirian Placeholder Content");
      zip.file(`02_NOTULEN_PENDIRIAN_${companyTitle}.docx`, "Notulen Pendirian Placeholder Content");

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `BERKAS_PENDIRIAN_${companyTitle}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Error exporting pendirian zip:', err);
      alert('Gagal mengekspor berkas pendirian ZIP.');
    } finally {
      setIsExportingPendirian(false);
    }
  };

  const performKbliModalSearch = (term: string) => {
    setKbliModalSearchTerm(term);
    if (!term.trim()) {
      setKbliModalSearchResults([]);
      return;
    }
    const q = term.toLowerCase().trim();
    const results = KBLI_DATA.filter((k: any) => 
      k.code.toLowerCase().includes(q) || k.name.toLowerCase().includes(q)
    );
    setKbliModalSearchResults(results);
    setKbliCurrentPage(1);
  };

  const handleKbliModalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      performKbliModalSearch(kbliModalSearchTerm);
    }
  };

  const kbliTotalPages = Math.ceil(kbliModalSearchResults.length / 10);
  const kbliPaginatedResults = useMemo(() => {
    const start = (kbliCurrentPage - 1) * 10;
    return kbliModalSearchResults.slice(start, start + 10);
  }, [kbliModalSearchResults, kbliCurrentPage]);

  const handleToggleKbliChecked = (code: string) => {
    setKbliCheckedKblis(prev => ({
      ...prev,
      [code]: !prev[code]
    }));
  };

  const handleToggleAllKbliOnPage = () => {
    const allCheckedOnPage = kbliPaginatedResults.every(k => kbliCheckedKblis[k.code]);
    const nextState = { ...kbliCheckedKblis };
    kbliPaginatedResults.forEach(k => {
      nextState[k.code] = !allCheckedOnPage;
    });
    setKbliCheckedKblis(nextState);
  };

  const getKbliPageNumbers = () => {
    const total = kbliTotalPages;
    const current = kbliCurrentPage;
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 3) {
      return [1, 2, 3, 4, 5];
    }
    if (current >= total - 2) {
      return [total - 4, total - 3, total - 2, total - 1, total];
    }
    return [current - 2, current - 1, current, current + 1, current + 2];
  };

  const handleAddKbliBatch = () => {
    const selectedCodes = Object.keys(kbliCheckedKblis).filter(k => kbliCheckedKblis[k]);
    if (selectedCodes.length === 0) {
      alert('Pilih setidaknya satu KBLI untuk ditambahkan.');
      return;
    }

    const itemsToAdd: KbliItem[] = KBLI_DATA
      .filter((k: any) => selectedCodes.includes(k.code) || selectedCodes.includes(k.kode))
      .map((k: any) => ({
        id: crypto.randomUUID(),
        code: k.code || k.kode || '',
        name: k.name || k.judul || k.title || '',
        description: k.description || k.uraian || '',
        categoryLetter: k.categoryLetter || '',
        categoryName: k.categoryName || '',
        uraian: k.uraian || k.description || ''
      }));

    const existingCodes = (data.kbliItems || []).map(k => k.code || (k as any).kode);
    const uniqueNewItems = itemsToAdd.filter(k => !existingCodes.includes(k.code));

    updateData({
      kbliItems: [...(data.kbliItems || []), ...uniqueNewItems]
    });

    setKbliCheckedKblis({});
    setIsAddKbliModalOpen(false);
  };

  const handleDownloadProject = async (proj: any) => {
    alert(`Mendownload berkas proyek ${proj.companyName}...`);
  };

  const compiledActivities = useMemo(() => {
    return [];
  }, []);

  const compiledDocuments = useMemo(() => {
    return [];
  }, []);

  const AutoSaveIndicatorComponent = () => (
    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
      {saveStatus === 'saving' && (
        <>
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
          <span className="text-amber-600 font-bold">Menyimpan...</span>
        </>
      )}
      {saveStatus === 'dirty' && (
        <>
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-amber-600 font-bold">Belum disimpan</span>
        </>
      )}
      {saveStatus === 'saved' && (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-emerald-600 font-bold">
            Tersimpan{lastSavedTime ? ` • ${lastSavedTime}` : ''}
          </span>
        </>
      )}
      {saveStatus === 'error' && (
        <span className="text-red-500 font-bold">Gagal menyimpan</span>
      )}
    </div>
  );

  return (
    <AppLayout
      user={user}
      userProfile={userProfile}
      authLoading={authLoading}
      loginWithGoogle={loginWithGoogle}
      logout={logout}
      isSidebarOpen={isSidebarOpen}
      setIsSidebarOpen={setIsSidebarOpen}
      activeSidebarTab={activeSidebarTab}
      setActiveSidebarTab={setActiveSidebarTab}
      notifications={notifications}
      isNotificationOpen={isNotificationOpen}
      setIsNotificationOpen={setIsNotificationOpen}
      isUserDropdownOpen={isUserDropdownOpen}
      setIsUserDropdownOpen={setIsUserDropdownOpen}
      setIsEditProfileModalOpen={setIsEditProfileModalOpen}
    >
      <AppBootstrap
        activeProjectContext={activeProjectContext}
        setActiveProjectContext={setActiveProjectContext}
        setEditingRupstId={setEditingRupstId}
        setEditingProjectId={setEditingProjectId}
        setEditingPendirianId={setEditingPendirianId}
        setActiveProjectJobType={setActiveProjectJobType}
        setPresetLoadedForProject={setPresetLoadedForProject}
      />
      <AppEffects
        data={data}
        activeProjectContext={activeProjectContext}
        activeSidebarTab={activeSidebarTab}
        editingRupstId={editingRupstId}
        editingProjectId={editingProjectId}
        projects={projects}
        rupstProjects={rupstProjects}
        saveProject={projectCtx.saveProject}
        setAutoSaveStatus={setSaveStatus}
      />
      <AppRoutes
        activeSidebarTab={activeSidebarTab}
        user={user}
        userProfile={userProfile}
        profiles={profiles}
        cvProfiles={cvProfiles}
        projects={projects}
        rupstProjects={rupstProjects}
        pendirianProjects={pendirianProjects}
        compiledActivities={compiledActivities}
        compiledDocuments={compiledDocuments}
        setActiveSidebarTab={setActiveSidebarTab}
        setEditingProjectId={setEditingProjectId}
        setEditingRupstId={setEditingRupstId}
        setEditingPendirianId={setEditingPendirianId}
        editingCvProfileId={editingCvProfileId}
        setEditingCvProfileId={setEditingCvProfileId}
        isProfilePreview={isProfilePreview}
        setIsProfilePreview={setIsProfilePreview}
        updateData={updateData}
        resetData={resetData}
        data={data}
        setData={setData}
        mergedData={mergedData}
        isSaving={isSaving}
        setIsSaving={setIsSaving}
        isSyncing={isSyncing}
        handleManualSync={handleManualSync}
        recordNotification={recordNotification}
        saveCompany={saveCompany}
        deleteCompany={deleteCompany}
        cvProfileSearchQuery={cvProfileSearchQuery}
        setCvProfileSearchQuery={setCvProfileSearchQuery}
        cvProfileCurrentPage={cvProfileCurrentPage}
        setCvProfileCurrentPage={setCvProfileCurrentPage}
        openShareholderEditor={openShareholderEditor}
        deleteShareholder={deleteShareholder}
        setIsAddKbliModalOpen={setIsAddKbliModalOpen}
        editingProjectId={editingProjectId}
        editingRupstId={editingRupstId}
        editingPendirianId={editingPendirianId}
        activeProjectContext={activeProjectContext}
        setActiveProjectContext={setActiveProjectContext}
        setSelectedProjectId={setSelectedProjectId}
        selectedProjectId={selectedProjectId}
        handleDownloadProject={handleDownloadProject}
        rupslbProps={{
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
        }}
        rupstProps={{
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
        }}
        pendirianProps={{
          user,
          userProfile,
          profiles,
          editingPendirianId,
          setEditingPendirianId,
          activeProjectContext,
          setActiveProjectContext,
          projects,
          rupstProjects,
          pendirianProjects,
          isSaving,
          setIsSaving,
          isSyncing,
          handleManualSync,
          setCurrentPendirianData,
          currentPendirianData,
          AutoSaveIndicatorComponent,
          recordNotification,
          setSelectedProjectId,
          setActiveSidebarTab,
          setPendirianPreviewData,
          setShowPendirianPreview,
          handlePendirianExportWord,
          updateData
        }}
      />
      <GlobalDialogBootstrap
        editingShareholder={editingShareholder}
        setEditingShareholder={setEditingShareholder}
        editMode={editMode}
        setEditMode={setEditMode}
        data={data}
        currentTargetSharesPaid={currentTargetSharesPaid}
        saveShareholder={saveShareholder as any}
        isPreviewOpen={isPreviewOpen}
        setIsPreviewOpen={setIsPreviewOpen}
        zoom={zoom}
        setZoom={setZoom}
        handlePrint={handlePrint}
        handleExportWord={handleExportWord}
        activeSidebarTab={activeSidebarTab}
        mergedData={mergedData}
        isAddKbliModalOpen={isAddKbliModalOpen}
        setIsAddKbliModalOpen={setIsAddKbliModalOpen}
        kbliModalSearchTerm={kbliModalSearchTerm}
        setKbliModalSearchTerm={setKbliModalSearchTerm}
        handleKbliModalKeyDown={handleKbliModalKeyDown}
        performKbliModalSearch={performKbliModalSearch as any}
        kbliPaginatedResults={kbliPaginatedResults}
        kbliCheckedKblis={Object.keys(kbliCheckedKblis).filter(k => kbliCheckedKblis[k]) as any}
        handleToggleAllKbliOnPage={handleToggleAllKbliOnPage}
        handleToggleKbliChecked={handleToggleKbliChecked}
        kbliTotalPages={kbliTotalPages}
        getKbliPageNumbers={getKbliPageNumbers}
        kbliCurrentPage={kbliCurrentPage}
        setKbliCurrentPage={setKbliCurrentPage}
        handleAddKbliBatch={handleAddKbliBatch}
        showPendirianPreview={showPendirianPreview}
        setShowPendirianPreview={setShowPendirianPreview}
        pendirianPreviewData={pendirianPreviewData}
        handlePendirianExportWord={handlePendirianExportWord}
        isExportingPendirian={isExportingPendirian}
        isEditProfileModalOpen={isEditProfileModalOpen}
        setIsEditProfileModalOpen={setIsEditProfileModalOpen}
        user={user}
        userProfile={userProfile}
        proxyModalOpenId={proxyModalOpenId}
        setProxyModalOpenId={setProxyModalOpenId}
        profiles={profiles}
        updateData={updateData}
      />
    </AppLayout>
  );
};

export default AppShell;
