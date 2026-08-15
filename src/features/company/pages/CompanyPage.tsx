import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { PageContainer } from '../../../components/ui/PageLayout';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { 
  Menu, 
  Plus, 
  Search, 
  SlidersHorizontal, 
  ChevronDown, 
  X, 
  Check 
} from 'lucide-react';
import { CompanyHeader } from '../components/CompanyHeader';
import { CompanyToolbar } from '../components/CompanyToolbar';
import { CompanyList } from '../components/CompanyList';
import { CompanyDetail } from '../components/CompanyDetail';
import { CompanyForm } from '../components/CompanyForm';
import { CompanyPageProps } from '../types/company.types';
import { useCompanyContext } from '../../../hooks/useCompanyContext';
import { useAuth } from '../../../hooks/useAuth';
import { getApiUrl } from '../../../lib/api';
import { handleFirestoreError, OperationType } from '../../../lib/firebase';
import { CompanyService, ClientDirectoryEntry } from '../../../services/CompanyService';
import { ShareholderModal } from '../../../components/modals/ShareholderModal';
import { KbliModal } from '../../../components/modals/KbliModal';
import { MergeClientsModal } from '../../../components/modals/MergeClientsModal';
import { INITIAL_STATE, INITIAL_ADDRESS } from '../../../domain/company/initialCompanyData';
import { KBLI_DATA } from '../../../../utils/kbliData';
import { KBLI_2025_CATEGORIES } from '../../../lib/kbliConstants';
import kbli2025Data from '../../../../kbli_2025.json';
import { CompanyProfile, Shareholder, KbliItem } from '../../../../types';
import { formatCompanyName } from '../../../lib/formatter';

export const CompanyPage: React.FC<CompanyPageProps> = ({ setIsSidebarOpen, ...props }) => {
  const location = useLocation();
  const isCv = location.pathname === '/profile-cv';
  const outletCtx = useOutletContext<{ setIsSidebarOpen?: (v: boolean) => void }>() || {};

  // 1. Context & Auth Hooks
  const { user, userProfile } = useAuth();
  const { 
    fetchDirectoryPage,
    getProfile,
    save: saveCompanyInContext, 
    delete: deleteCompanyInContext, 
    archive: archiveCompanyInContext, 
    duplicate: duplicateCompanyInContext,
    merge: mergeCompaniesInContext,
    loading: isDataLoading,
  } = useCompanyContext();

  // 2. Local State Management for Listing & View State
  const [selectedClientType, setSelectedClientType] = useState<string>('all');
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [isProfilePreview, setIsProfilePreview] = useState<boolean>(false);
  const [showArchivedProfiles, setShowArchivedProfiles] = useState<boolean>(false);
  const [profileCurrentPage, setProfileCurrentPage] = useState<number>(1);
  const [profileSearchQuery, setProfileSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [selectedProfileYear, setSelectedProfileYear] = useState<string>('all');
  const [profileSortField, setProfileSortField] = useState<string>('companyName');
  const [profileSortOrder, setProfileSortOrder] = useState<'asc' | 'desc'>('asc');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [profileItemsPerPage, setProfileItemsPerPage] = useState<number>(10);

  // Paginated directory state
  const [pageDirectoryEntries, setPageDirectoryEntries] = useState<ClientDirectoryEntry[]>([]);
  const pageCursorsRef = useRef<Map<string, Map<number, any>>>(new Map());
  const [hasMorePageResults, setHasMorePageResults] = useState<boolean>(false);
  const [isDirectoryLoading, setIsDirectoryLoading] = useState<boolean>(false);

  // Merge modal profiles on-demand state
  const [mergeProfiles, setMergeProfiles] = useState<ClientDirectoryEntry[]>([]);
  const [isMergeProfilesLoading, setIsMergeProfilesLoading] = useState<boolean>(false);

  // 5. State for Merge Clients Modal
  const [isMergeModalOpen, setIsMergeModalOpen] = useState<boolean>(false);

  // Load merge profiles on demand when the modal opens
  useEffect(() => {
    if (!isMergeModalOpen) return;
    let isSubscribed = true;
    const fetchAllForMerge = async () => {
      setIsMergeProfilesLoading(true);
      try {
        const allEntries = await CompanyService.getClientDirectory({ clientType: isCv ? 'CV' : 'all', limit: 'all' });
        if (isSubscribed) {
          setMergeProfiles(allEntries);
        }
      } catch (err) {
        console.error('Error fetching profiles for merge:', err);
      } finally {
        if (isSubscribed) setIsMergeProfilesLoading(false);
      }
    };
    fetchAllForMerge();
    return () => { isSubscribed = false; };
  }, [isMergeModalOpen, isCv]);

  // Mobile Filter Sheet & Mobile Sort Dropdown State
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);
  const [isMobileSortOpen, setIsMobileSortOpen] = useState<boolean>(false);

  // Sync clientType if arriving from legacy CV path
  useEffect(() => {
    if (isCv) {
      setSelectedClientType('CV');
    }
  }, [isCv]);

  const navigate = useNavigate();

  // Synchronize state from URL path (e.g. /clients/:id, /clients/new, /clients/:id/edit)
  useEffect(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    const basePath = isCv ? '/profile-cv' : '/clients';

    if (lastPart === 'new') {
      setEditingProfileId('new');
      setIsProfilePreview(false);
    } else if (parts.length >= 3 && lastPart === 'edit') {
      const entityId = parts[parts.length - 2];
      setEditingProfileId(entityId);
      setIsProfilePreview(false);
    } else if (parts.length >= 2 && !['clients', 'profile', 'profile-cv', 'new', 'edit'].includes(lastPart)) {
      setEditingProfileId(lastPart);
      setIsProfilePreview(true);
    } else if (parts.length <= 1 || ['clients', 'profile', 'profile-cv'].includes(lastPart)) {
      setEditingProfileId(null);
      setIsProfilePreview(false);
    }
  }, [location.pathname, isCv]);

  const handleSetEditingProfileId = useCallback((id: string | null | ((prev: string | null) => string | null)) => {
    const nextId = typeof id === 'function' ? id(editingProfileId) : id;
    const basePath = isCv ? '/profile-cv' : '/clients';
    if (!nextId) {
      navigate(basePath);
    } else if (nextId === 'new') {
      navigate(`${basePath}/new`);
    } else if (isProfilePreview) {
      navigate(`${basePath}/${nextId}`);
    } else {
      navigate(`${basePath}/${nextId}/edit`);
    }
  }, [editingProfileId, isProfilePreview, isCv, navigate]);

  const handleSetIsProfilePreview = useCallback((preview: boolean | ((prev: boolean) => boolean)) => {
    const nextPreview = typeof preview === 'function' ? preview(isProfilePreview) : preview;
    const basePath = isCv ? '/profile-cv' : '/clients';
    if (editingProfileId && editingProfileId !== 'new') {
      if (nextPreview) {
        navigate(`${basePath}/${editingProfileId}`);
      } else {
        navigate(`${basePath}/${editingProfileId}/edit`);
      }
    } else if (!nextPreview && editingProfileId === 'new') {
      navigate(`${basePath}/new`);
    } else {
      navigate(basePath);
    }
  }, [editingProfileId, isProfilePreview, isCv, navigate]);

  const directActionHandledRef = useRef<string | null>(null);

  useEffect(() => {
    const isDirectAction = (location.state as any)?.openNew || (location.state as any)?.openCreateModal || location.search.includes('action=new') || location.search.includes('create=true');
    const actionKey = `${location.pathname}_${location.search}_${location.key}`;
    if (isDirectAction && directActionHandledRef.current !== actionKey) {
      directActionHandledRef.current = actionKey;
      setEditingProfileId('new');
      setIsProfilePreview(false);
      setData({ ...INITIAL_STATE });
    }
  }, [location]);
  
  // 3. Local State Management for Current Edited Profile Form Data
  const [data, setData] = useState<any>({ ...INITIAL_STATE });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // 4. Local State Management for Shareholder Modal
  const [editMode, setEditMode] = useState<'lama' | 'baru' | 'pengganti' | 'pengganti_saham' | null>(null);
  const [editingShareholder, setEditingShareholder] = useState<any>(null);
  const [editingDismissalId, setEditingDismissalId] = useState<string | null>(null);

  const handleMergeCompanies = async (targetId: string, sourceIds: string[]) => {
    try {
      const result = await mergeCompaniesInContext(targetId, sourceIds);
      await recordNotification(
        'Penyatuan Klien Berhasil',
        `Berhasil menyatukan ${sourceIds.length} klien duplikat. ${result.projectsMerged} proyek telah dipindahkan secara aman.`,
        'success'
      );
      alert(`Penyatuan berhasil! ${sourceIds.length} klien duplikat telah digabungkan, dan ${result.projectsMerged} proyek dipindahkan secara aman.`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Terjadi kesalahan saat menggabungkan klien.');
      throw err;
    }
  };

  const handleMergeMultipleCompanies = async (groups: { targetId: string; sourceIds: string[] }[]) => {
    try {
      let totalProjectsMerged = 0;
      let totalClientsMerged = 0;
      for (const group of groups) {
        const result = await mergeCompaniesInContext(group.targetId, group.sourceIds);
        totalProjectsMerged += result.projectsMerged;
        totalClientsMerged += group.sourceIds.length;
      }
      await recordNotification(
        'Penyatuan Massal Berhasil',
        `Berhasil menyatukan ${totalClientsMerged} klien duplikat di ${groups.length} grup berbeda. ${totalProjectsMerged} proyek telah dipindahkan secara aman.`,
        'success'
      );
      alert(`Penyatuan massal berhasil! ${totalClientsMerged} klien duplikat di ${groups.length} grup telah digabungkan, dan ${totalProjectsMerged} proyek dipindahkan secara aman.`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Terjadi kesalahan saat menggabungkan klien secara massal.');
      throw err;
    }
  };

  // 6. Local State Management for KBLI Modal
  const [isAddKbliModalOpen, setIsAddKbliModalOpen] = useState<boolean>(false);
  const [kbliModalSearchTerm, setKbliModalSearchTerm] = useState<string>('');
  const [kbliModalSearchResults, setKbliModalSearchResults] = useState<any[]>([]);
  const [kbliCurrentPage, setKbliCurrentPage] = useState<number>(1);
  const [kbliCheckedKblis, setKbliCheckedKblis] = useState<string[]>([]);

  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);

  // Refs to synchronize state across effects without causing re-runs
  const pageDirectoryEntriesRef = useRef<ClientDirectoryEntry[]>([]);
  useEffect(() => {
    pageDirectoryEntriesRef.current = pageDirectoryEntries;
  }, [pageDirectoryEntries]);

  const selectedClientTypeRef = useRef<string>('all');
  useEffect(() => {
    selectedClientTypeRef.current = selectedClientType;
  }, [selectedClientType]);

  // Update form data state when editingProfileId changes (fetches full profile on-demand)
  useEffect(() => {
    let active = true;
    if (editingProfileId) {
      if (editingProfileId === 'new') {
        const defaultType = selectedClientTypeRef.current !== 'all' ? selectedClientTypeRef.current : 'PT';
        setData({ 
          ...INITIAL_STATE, 
          id: crypto.randomUUID(),
          clientType: defaultType,
          companyType: defaultType === 'CV' ? 'CV' : 'PT_LOKAL' 
        });
      } else {
        setIsProfileLoading(true);
        getProfile(editingProfileId).then(fullProfile => {
          if (!active) return;
          if (fullProfile) {
            setData({ ...INITIAL_STATE, ...fullProfile });
          } else {
            const found = pageDirectoryEntriesRef.current.find(p => p.id === editingProfileId || p.clientId === editingProfileId);
            if (found) setData({ ...INITIAL_STATE, ...found });
          }
          setIsProfileLoading(false);
        }).catch(err => {
          console.warn('[CompanyPage] Error loading full profile:', err);
          if (active) setIsProfileLoading(false);
        });
      }
    } else {
      setData({ ...INITIAL_STATE });
    }
    return () => { active = false; };
  }, [editingProfileId, getProfile]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(profileSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [profileSearchQuery]);

  // Reset pagination when search/filter/sort/page size options change
  useEffect(() => {
    setProfileCurrentPage(1);
  }, [
    debouncedSearchQuery, 
    selectedClientType, 
    showArchivedProfiles, 
    selectedProfileYear,
    profileSortField,
    profileSortOrder,
    profileItemsPerPage
  ]);

  // Server-side paginated query fetch for Client Menu
  useEffect(() => {
    let isSubscribed = true;
    const queryKey = `${selectedClientType}_${showArchivedProfiles ? 'archived' : 'active'}_${debouncedSearchQuery}_${selectedProfileYear}_${profileSortField}_${profileSortOrder}_${profileItemsPerPage}`;
    const currentQueryCursors = pageCursorsRef.current.get(queryKey) || new Map();
    const prevCursor = profileCurrentPage > 1 ? currentQueryCursors.get(profileCurrentPage - 1) : null;

    if (profileCurrentPage > 1 && !prevCursor) {
      // Avoid executing query with stale page state while waiting for page reset
      return;
    }

    const loadPage = async () => {
      setIsDirectoryLoading(true);
      try {
        const res = await fetchDirectoryPage({
          clientType: selectedClientType,
          showArchived: showArchivedProfiles,
          searchQuery: debouncedSearchQuery,
          establishmentYear: selectedProfileYear,
          sortField: profileSortField,
          sortOrder: profileSortOrder,
          pageSize: profileItemsPerPage,
          lastDoc: prevCursor,
          page: profileCurrentPage
        });

        if (!isSubscribed) return;

        setPageDirectoryEntries(res.items);
        setHasMorePageResults(res.hasMore);

        if (res.lastDoc) {
          const currentCursors = pageCursorsRef.current.get(queryKey) || new Map();
          currentCursors.set(profileCurrentPage, res.lastDoc);
          pageCursorsRef.current.set(queryKey, currentCursors);
        }

        // Instrumentation log
        console.log(
          `[ClientList]\n` +
          `page: ${profileCurrentPage}\n` +
          `pageSize: ${profileItemsPerPage}\n` +
          `documents: ${res.items.length}\n` +
          `cache: ${res.fromCache ? 'HIT' : 'MISS'}\n` +
          `network: ${res.fromCache ? 'NO' : 'YES'}\n` +
          `profileReads: 0\n` +
          `writes: 0`
        );
      } catch (err) {
        console.warn('[CompanyPage] Error fetching directory page:', err);
      } finally {
        if (isSubscribed) setIsDirectoryLoading(false);
      }
    };

    loadPage();
    return () => { isSubscribed = false; };
  }, [
    fetchDirectoryPage,
    selectedClientType,
    showArchivedProfiles,
    debouncedSearchQuery,
    selectedProfileYear,
    profileSortField,
    profileSortOrder,
    profileCurrentPage,
    profileItemsPerPage
  ]);

  // Notification Helper (No-op: notification feature completely removed)
  const recordNotification = async (title: string, description: string, type: string) => {
    // No-op
  };

  // 6. KBLI Modal Search Engine
  useEffect(() => {
    if (kbli2025Data?.data) {
      const sorted = [...kbli2025Data.data].sort((a: any, b: any) => a.kode.localeCompare(b.kode));
      setKbliModalSearchResults(sorted);
    }
  }, []);

  const performKbliModalSearch = () => {
    setKbliCurrentPage(1);
    if (!kbliModalSearchTerm.trim()) {
      if (kbli2025Data?.data) {
        const sorted = [...kbli2025Data.data].sort((a: any, b: any) => a.kode.localeCompare(b.kode));
        setKbliModalSearchResults(sorted);
      }
      return;
    }
    const term = kbliModalSearchTerm.toLowerCase();
    const filtered = (kbli2025Data.data as any[]).filter(item => {
      return (
        item.kode.includes(term) ||
        (item.judul || '').toLowerCase().includes(term) ||
        (item.uraian || '').toLowerCase().includes(term)
      );
    });
    setKbliModalSearchResults(filtered);
  };

  const handleKbliModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performKbliModalSearch();
    }
  };

  const handleToggleKbliChecked = (kode: string) => {
    setKbliCheckedKblis(prev => 
      prev.includes(kode) ? prev.filter(k => k !== kode) : [...prev, kode]
    );
  };

  const kbliItemsPerPage = 10;
  const kbliTotalPages = Math.ceil(kbliModalSearchResults.length / kbliItemsPerPage) || 1;
  const safeKbliCurrentPage = Math.min(kbliCurrentPage, kbliTotalPages);
  const kbliStartIndex = (safeKbliCurrentPage - 1) * kbliItemsPerPage;
  const kbliPaginatedResults = kbliModalSearchResults.slice(kbliStartIndex, kbliStartIndex + kbliItemsPerPage);

  const handleToggleAllKbliOnPage = () => {
    const pageCodes = kbliPaginatedResults.map(item => item.kode);
    const allChecked = pageCodes.every(code => kbliCheckedKblis.includes(code));
    if (allChecked) {
      setKbliCheckedKblis(prev => prev.filter(code => !pageCodes.includes(code)));
    } else {
      setKbliCheckedKblis(prev => [...new Set([...prev, ...pageCodes])]);
    }
  };

  const getKbliPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, safeKbliCurrentPage - 2);
    let end = Math.min(kbliTotalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      end = kbliTotalPages;
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const handleAddKbliBatch = () => {
    const itemsToAdd = (kbli2025Data.data as any[]).filter(item =>
      kbliCheckedKblis.includes(item.kode) && !data.kbliItems.some((i: any) => i.code === item.kode)
    );

    if (itemsToAdd.length === 0) {
      setIsAddKbliModalOpen(false);
      return;
    }

    const newKbliItems: KbliItem[] = itemsToAdd.map(item => {
      const existingKbli = KBLI_DATA.find((k: any) => k.code === item.kode);
      const categoryLetter = existingKbli?.categoryLetter || '';
      const categoryName = existingKbli?.categoryName || KBLI_2025_CATEGORIES[categoryLetter] || '';

      return {
        id: crypto.randomUUID(),
        code: item.kode,
        name: item.judul,
        description: item.uraian,
        categoryLetter,
        categoryName
      };
    });

    updateData({ kbliItems: [...newKbliItems, ...(data.kbliItems || [])] });
    setKbliCheckedKblis([]);
    setIsAddKbliModalOpen(false);
  };

  // 7. Shareholder & Management Editor Engine
  const openShareholderEditor = (type: 'lama' | 'baru' | 'pengganti' | 'pengganti_saham', sh?: Shareholder, dismissalId?: string) => {
    setEditMode(type);
    if (dismissalId) {
      setEditingDismissalId(dismissalId);
    } else {
      setEditingDismissalId(null);
    }
    if (sh) {
      setEditingShareholder(sh);
    } else {
      const newSh: Shareholder = {
        id: crypto.randomUUID(),
        salutation: 'Tuan',
        name: '',
        birthCity: '',
        birthDate: '',
        nationality: 'WNI',
        nationalityType: 'WNI',
        occupation: '',
        address: { ...INITIAL_ADDRESS },
        nik: '',
        sharesOwned: 0,
        kitasType: 'NONE'
      };
      setEditingShareholder(newSh);
    }
  };

  const deleteShareholder = (id: string, mode: 'lama' | 'baru') => {
    const shareholders = data.shareholders || [];
    const finalShareholders = data.finalShareholders || [];

    if (mode === 'lama') {
      const deletedShareholder = shareholders.find((s: any) => s.id === id);
      const updatedShareholders = shareholders.filter((s: any) => s.id !== id);
      const updatedFinalShareholders = finalShareholders.filter((fs: any) => {
        if (fs.linkedPartyId === id) return false;
        if (deletedShareholder && (fs.name || '').trim().toUpperCase() === (deletedShareholder.name || '').trim().toUpperCase()) return false;
        return true;
      });
      updateData({ 
        shareholders: updatedShareholders,
        finalShareholders: updatedFinalShareholders
      });
    } else {
      updateData({ finalShareholders: finalShareholders.filter((p: any) => p.id !== id) });
    }
  };

  const saveShareholder = () => {
    if (!editingShareholder || !editMode) return;
    
    let sanitizedShareholder = { ...editingShareholder };
    const shareholders = data.shareholders || [];
    const finalShareholders = data.finalShareholders || [];

    if (editMode === 'pengganti') {
      if (editingDismissalId) {
        const updatedDismissals = (data.managementDismissals || []).map((t: any) => {
          if (t.id === editingDismissalId) {
            return {
              ...t,
              replacedByDetail: sanitizedShareholder,
              replacedByName: sanitizedShareholder.name,
              replacedBySalutation: sanitizedShareholder.salutation,
              replacedByNik: sanitizedShareholder.nik,
              replacedByPosition: sanitizedShareholder.managementPosition || t.replacedByPosition || 'DIREKTUR'
            };
          }
          return t;
        });
        updateData({ managementDismissals: updatedDismissals });
      }
      setEditingShareholder(null);
      setEditMode(null);
      setEditingDismissalId(null);
      return;
    }

    if (editMode === 'pengganti_saham') {
      if (editingDismissalId) {
        const updatedTransfers = (data.shareTransfersNew || []).map((t: any) => {
          if (t.id === editingDismissalId) {
            return {
              ...t,
              toDetail: sanitizedShareholder,
              toName: sanitizedShareholder.name,
              toSalutation: sanitizedShareholder.salutation,
              toNik: sanitizedShareholder.nik
            };
          }
          return t;
        });
        updateData({ shareTransfersNew: updatedTransfers });
      }
      setEditingShareholder(null);
      setEditMode(null);
      setEditingDismissalId(null);
      return;
    }

    const isOld = editMode === 'lama';
    const hasCapitalChange = data.resolutions?.capitalBase || data.resolutions?.capitalPaid || data.resolutions?.capitalBaseDecrease || data.resolutions?.capitalPaidDecrease;
    const disableFinancials = !isOld && !data.resolutions?.shareholders && !hasCapitalChange;

    if (disableFinancials) {
      const oldShares = shareholders.find((s: any) => s.id === sanitizedShareholder.linkedPartyId || (s.name || '').trim().toUpperCase() === (sanitizedShareholder.name || '').trim().toUpperCase())?.sharesOwned || 0;
      sanitizedShareholder.sharesOwned = oldShares;
    }

    // Explicit server-side-like limit check
    const currentList = editMode === 'lama' ? shareholders : finalShareholders;
    const currentTargetSharesPaid = data.originalSharePrice > 0 ? (data.targetCapitalPaid / data.originalSharePrice) : 0;
    const limit = editMode === 'lama' ? data.originalTotalShares : ((data.resolutions?.capitalPaid || data.resolutions?.capitalPaidDecrease) ? currentTargetSharesPaid : data.originalTotalShares);
    const otherAllocated = currentList.filter((s: any) => s.id !== sanitizedShareholder.id).reduce((sum: number, s: any) => {
      let shares = s.sharesOwned || 0;
      if (editMode === 'baru' && sanitizedShareholder.isAcquisition && (sanitizedShareholder.acquisitionSourceId === s.id || (s.linkedPartyId && sanitizedShareholder.acquisitionSourceId === s.linkedPartyId))) {
        shares = Math.max(0, shares - (sanitizedShareholder.acquisitionShares || 0));
      }
      return sum + shares;
    }, 0);

    if (sanitizedShareholder.sharesOwned > limit - otherAllocated) {
        alert(`Batas terlampaui! Maksimal sisa lembar yang tersedia adalah ${(limit - otherAllocated).toLocaleString('id-ID')} lembar.`);
        return;
    }

    let updatedShareholders = [...shareholders];
    let updatedFinalShareholders = [...finalShareholders];
    let updatedTransfers = [...(data.shareTransfers || [])];

    if (editMode === 'lama') {
      const exists = updatedShareholders.some(s => s.id === sanitizedShareholder.id);
      const oldShareholderData = updatedShareholders.find(s => s.id === sanitizedShareholder.id);

      updatedShareholders = exists 
        ? updatedShareholders.map(s => s.id === sanitizedShareholder.id ? sanitizedShareholder : s)
        : [...updatedShareholders, sanitizedShareholder];

      let foundInFinal = false;
      updatedFinalShareholders = updatedFinalShareholders.map((fs: any) => {
        const isMatch = fs.linkedPartyId === sanitizedShareholder.id || 
                        fs.id === sanitizedShareholder.id || 
                        ((fs.name || '').trim().toUpperCase() === (sanitizedShareholder.name || '').trim().toUpperCase()) ||
                        (oldShareholderData && (fs.name || '').trim().toUpperCase() === (oldShareholderData.name || '').trim().toUpperCase());
        
        if (isMatch) {
          foundInFinal = true;
          return {
            ...fs,
            ...sanitizedShareholder,
            id: fs.id,
            linkedPartyId: sanitizedShareholder.id,
            isExistingParty: true,
            sharesOwned: (oldShareholderData && fs.sharesOwned === oldShareholderData.sharesOwned) ? sanitizedShareholder.sharesOwned : fs.sharesOwned,
            isAcquisition: fs.isAcquisition,
            acquisitionSourceId: fs.acquisitionSourceId,
            acquisitionType: fs.acquisitionType
          };
        }
        return fs;
      });

      if (!foundInFinal && (finalShareholders.length > 0 || data.resolutions?.shareholders)) {
         updatedFinalShareholders.push({
            ...sanitizedShareholder,
            id: crypto.randomUUID(),
            linkedPartyId: sanitizedShareholder.id,
            isExistingParty: true
         });
      }
    } else {
      const exists = updatedFinalShareholders.some(s => s.id === sanitizedShareholder.id);
      let tempFinal = exists 
        ? updatedFinalShareholders.map(s => s.id === sanitizedShareholder.id ? sanitizedShareholder : s)
        : [...updatedFinalShareholders, sanitizedShareholder];

      // Handle automatic transfer generation/update
      if (sanitizedShareholder.isAcquisition && sanitizedShareholder.acquisitionSourceId && sanitizedShareholder.acquisitionShares) {
        const transferAmt = sanitizedShareholder.acquisitionShares;
        updatedTransfers = updatedTransfers.filter(t => t.toShareholderId !== sanitizedShareholder.id);
        
        if (transferAmt > 0) {
          updatedTransfers.push({
            id: crypto.randomUUID(),
            type: sanitizedShareholder.acquisitionType === 'HIBAH' ? 'Hibah' : 'Jual Beli',
            fromShareholderId: sanitizedShareholder.acquisitionSourceId,
            toShareholderId: sanitizedShareholder.id,
            sharesTransferred: transferAmt
          });
        }
      } else {
        updatedTransfers = updatedTransfers.filter(t => t.toShareholderId !== sanitizedShareholder.id);
      }

      updatedFinalShareholders = tempFinal.map((fs: any) => {
        const oldSh = updatedShareholders.find(s => (s.name || '').trim().toUpperCase() === (fs.name || '').trim().toUpperCase());
        const baseShares = oldSh ? (oldSh.sharesOwned || 0) : 0;
        const transfersIn = updatedTransfers.filter(t => t.toShareholderId === fs.id).reduce((sum, t) => sum + t.sharesTransferred, 0);
        const fromIdMatch1 = oldSh ? oldSh.id : null;
        const fromIdMatch2 = fs.linkedPartyId;
        const fromIdMatch3 = fs.id;
        
        const transfersOut = updatedTransfers.filter(t => 
             t.fromShareholderId === fromIdMatch1 
          || (fromIdMatch2 && t.fromShareholderId === fromIdMatch2) 
          || t.fromShareholderId === fromIdMatch3
        ).reduce((sum, t) => sum + t.sharesTransferred, 0);
        
        const deposits = (fs.isNewDeposit && fs.newDepositShares) ? fs.newDepositShares : 0;

        return {
          ...fs,
          sharesOwned: Math.max(0, baseShares + transfersIn - transfersOut + deposits)
        };
      });
    }

    updateData({
      shareholders: updatedShareholders,
      finalShareholders: updatedFinalShareholders,
      shareTransfers: updatedTransfers,
      resolutions: updatedTransfers.length > 0 ? { ...data.resolutions, shareholders: true } : data.resolutions
    });

    setEditingShareholder(null);
    setEditMode(null);
  };

  // 8. CRUD Actions using CompanyContext
  const saveCompany = async (id: string, companyData: any, redirect: boolean) => {
    await saveCompanyInContext(id, companyData, isCv);
    return companyData;
  };

  const handleSyncDrive = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const token = await user?.getIdToken();
      const typeFilter = selectedClientType !== 'all' ? selectedClientType : '';
      const response = await fetch(getApiUrl(`/api/sync-drive-clients${typeFilter ? `?clientType=${typeFilter}` : ''}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Terjadi kesalahan saat menyinkronkan klien.');
      }

      if (resData.createdCount > 0) {
        await recordNotification(
          'Sinkronisasi Klien Selesai', 
          `Berhasil menyinkronkan Google Drive. ${resData.createdCount} klien PT baru berhasil ditambahkan.`, 
          'success'
        );
        alert(`Berhasil mencocokan dengan Google Drive!\n\n${resData.createdCount} Klien baru berhasil dibuat:\n` + resData.createdClients.join('\n'));
      } else {
        alert('Pencocokan selesai. Semua folder PT di Google Drive sudah memiliki data Klien di database.');
      }
    } catch (err: any) {
      console.error("Gagal mencocokan klien:", err);
      alert(`Gagal mencocokan klien: ${err.message || String(err)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteCompany = async (id: string, redirect: boolean) => {
    if (userProfile?.role !== 'Super Admin') {
      alert('Hanya Super Admin yang dapat menghapus data klien!');
      return null;
    }
    const targetProfile = pageDirectoryEntries.find(p => p.id === id || p.clientId === id);
    const clientName = targetProfile?.companyName ? formatCompanyName(targetProfile.companyName, targetProfile.clientType) : id;
    if (confirm(`Apakah Anda yakin ingin menghapus profil "${clientName}", SELURUH PROYEK TERKAIT, DATA FIRESTORE, dan FOLDER GOOGLE DRIVE miliknya secara permanen?`)) {
      const originalEntries = [...pageDirectoryEntries];
      try {
        // Optimistically remove client from page list
        setPageDirectoryEntries(prev => prev.filter(p => p.id !== id && p.clientId !== id));

        await deleteCompanyInContext(id, isCv);
        recordNotification(
          'Klien & Proyek Dihapus', 
          `Profil klien "${clientName}", seluruh proyek terkait, data Firestore, dan folder Google Drive telah dihapus secara permanen.`, 
          'warning'
        );
        alert(`Profil klien "${clientName}", seluruh proyek terkait, data Firestore, dan folder Google Drive berhasil dihapus.`);
        setEditingProfileId(null);
      } catch (err: any) {
        console.error("Gagal menghapus profil, rolling back optimistic UI...", err);
        // Rollback optimistic state
        setPageDirectoryEntries(originalEntries);
        alert(`Gagal menghapus profil: ${err?.message || String(err)}`);
      }
    }
    return null;
  };

  const handleArchiveProfile = async (profile: any) => {
    const toggleArchive = !profile.isArchived;
    try {
      await archiveCompanyInContext(profile.id, profile.isArchived || false, isCv);
      recordNotification(
        toggleArchive ? 'Profil Diarsipkan' : 'Profil Dipulihkan', 
        `Profil ${profile.companyName} telah berhasil ${toggleArchive ? 'diarsipkan' : 'dipulihkan'}.`, 
        'info'
      );
      alert(`Profil berhasil ${toggleArchive ? 'diarsipkan' : 'dipulihkan'}!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `profiles/${profile.id}`);
    }
  };

  const handleDuplicateProfile = async (profile: any) => {
    try {
      const newProfile = await duplicateCompanyInContext(profile as any, isCv);
      recordNotification(
        'Profil Diduplikasi', 
        `Profil ${profile.companyName} berhasil diduplikasi.`, 
        'info'
      );
      alert(`Profil ${profile.companyName} berhasil diduplikasi!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `profiles/${profile.id}`);
    }
  };

  const updateData = useCallback((updates: any) => {
    setData((prev: any) => {
      const merged = { ...prev, ...updates };

      // Auto calculation for capital if PT and not CV
      if (merged.companyType !== 'CV') {
        const price = merged.originalSharePrice || 0;
        merged.targetCapitalBase = (merged.originalAuthorizedShares || 0) * price;
        merged.targetCapitalPaid = (merged.originalTotalShares || 0) * price;
      }

      return merged;
    });
  }, []);

  const resetData = useCallback(() => {
    setData({ ...INITIAL_STATE });
  }, []);

  // 9. Filtering and Sorting List Data from Paginated Directory Entries
  const uniqueProfileYears = useMemo(() => {
    return Array.from(
      new Set(
        pageDirectoryEntries
          .map((p) => (p.establishmentDeedDate ? new Date(p.establishmentDeedDate).getFullYear().toString() : ''))
          .filter(Boolean)
      )
    ).sort((a, b) => Number(b) - Number(a));
  }, [pageDirectoryEntries]);

  const paginatedProfileResults = pageDirectoryEntries;
  const totalProfilePages = hasMorePageResults ? Math.max(profileCurrentPage + 1, 1) : Math.max(profileCurrentPage, 1);
  const totalProfileItems = hasMorePageResults ? (profileCurrentPage * profileItemsPerPage) + 1 : ((profileCurrentPage - 1) * profileItemsPerPage) + paginatedProfileResults.length;
  const safeProfileCurrentPage = profileCurrentPage;
  const profileStartIndex = (profileCurrentPage - 1) * profileItemsPerPage;

  const handleProfileSort = (field: string) => {
    if (profileSortField === field) {
      setProfileSortOrder(profileSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setProfileSortField(field);
      setProfileSortOrder('asc');
    }
    setProfileCurrentPage(1);
  };

  const renderProfileSortArrows = (field: string) => {
    const isActive = profileSortField === field;
    return (
      <span className="inline-flex flex-col text-[8px] text-slate-400 shrink-0 ml-1.5 leading-none select-none">
        <span className={`${isActive && profileSortOrder === 'asc' ? 'text-blue-600 font-bold' : 'text-slate-300'}`}>
          ▲
        </span>
        <span className={`${isActive && profileSortOrder === 'desc' ? 'text-blue-600 font-bold' : 'text-slate-300'}`}>
          ▼
        </span>
      </span>
    );
  };

  const currentTargetSharesPaidForModal = data.originalSharePrice > 0 ? ((data.targetCapitalPaid || 0) / data.originalSharePrice) : 0;

  const currentSortLabel = useMemo(() => {
    if (profileSortField === 'companyName') return profileSortOrder === 'asc' ? 'Nama A-Z' : 'Nama Z-A';
    if (profileSortField === 'domicile') return 'Kedudukan';
    if (profileSortField === 'establishmentDeedDate') return 'Thn Pendirian';
    return 'Terbaru';
  }, [profileSortField, profileSortOrder]);

  return (
    <PageContainer>
      {/* 1. HERO HEADER BIRU KHUSUS MOBILE */}
      {!editingProfileId && (
        <div className="md:hidden bg-[#1e61c3] text-white rounded-b-[2rem] p-4.5 pt-5 pb-5 shadow-sm -mx-4 -mt-4 mb-4 space-y-4">
          {/* Baris Atas: Hamburger Menu + Judul Klien + Tombol Plus */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const handler = setIsSidebarOpen || outletCtx?.setIsSidebarOpen;
                  if (handler) handler(true);
                }}
                className="p-1 -ml-1 text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Buka Sidebar"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-bold text-white tracking-tight">Klien</h1>
            </div>

            <button
              onClick={() => {
                setEditingProfileId('new');
                setIsProfilePreview(false);
                updateData({ ...INITIAL_STATE } as any);
              }}
              className="w-9 h-9 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all cursor-pointer"
              title="Tambah Klien Baru"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Search Bar + Filter Button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama klien..."
                value={profileSearchQuery}
                onChange={(e) => {
                  setProfileSearchQuery(e.target.value);
                  setProfileCurrentPage(1);
                }}
                className="w-full pl-9.5 pr-8 py-2.5 bg-white text-slate-800 placeholder-slate-400 text-xs rounded-xl border-0 outline-none shadow-xs font-medium"
              />
              {profileSearchQuery && (
                <button
                  onClick={() => {
                    setProfileSearchQuery('');
                    setProfileCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="w-10 h-10 bg-white text-[#1e61c3] rounded-xl flex items-center justify-center shrink-0 shadow-xs cursor-pointer hover:bg-blue-50 transition-colors"
              title="Filter Klien"
            >
              <SlidersHorizontal className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Baris Ringkasan: Total Klien & Dropdown Urutkan */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-medium text-white/90">
              Total {totalProfileItems} Klien
            </span>

            <div className="relative">
              <button
                onClick={() => setIsMobileSortOpen(!isMobileSortOpen)}
                className="flex items-center gap-1.5 text-xs font-medium text-white/90 hover:text-white cursor-pointer bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-colors"
              >
                <span>Urutkan: {currentSortLabel}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {isMobileSortOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-100">
                  {[
                    { field: 'updatedAt', order: 'desc', label: 'Terbaru' },
                    { field: 'companyName', order: 'asc', label: 'Nama A-Z' },
                    { field: 'companyName', order: 'desc', label: 'Nama Z-A' },
                    { field: 'domicile', order: 'asc', label: 'Kedudukan' },
                    { field: 'establishmentDeedDate', order: 'desc', label: 'Thn Pendirian' },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => {
                        setProfileSortField(opt.field);
                        setProfileSortOrder(opt.order as 'asc' | 'desc');
                        setProfileCurrentPage(1);
                        setIsMobileSortOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 flex items-center justify-between ${
                        profileSortField === opt.field && profileSortOrder === opt.order
                          ? 'text-[#1e61c3] bg-blue-50/50'
                          : 'text-slate-700'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {profileSortField === opt.field && profileSortOrder === opt.order && (
                        <Check className="w-3.5 h-3.5 text-[#1e61c3]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM SHEET FILTER */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 bg-black/60 z-[999] flex items-end justify-center md:hidden animate-in fade-in duration-200">
          <div 
            className="fixed inset-0" 
            onClick={() => setIsMobileFilterOpen(false)} 
          />
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-5 space-y-5 max-h-[85vh] overflow-y-auto relative z-[1000] shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto -mt-1"></div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Filter Klien</h3>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Status Profil</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => {
                    setShowArchivedProfiles(false);
                    setProfileCurrentPage(1);
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    !showArchivedProfiles
                      ? 'bg-white text-[#1e61c3] shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  Aktif
                </button>
                <button
                  onClick={() => {
                    setShowArchivedProfiles(true);
                    setProfileCurrentPage(1);
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    showArchivedProfiles
                      ? 'bg-white text-amber-700 shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  Arsip
                </button>
              </div>
            </div>

            {/* Jenis Badan Usaha Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Jenis Badan Usaha</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'SEMUA' },
                  { id: 'PT', label: 'PT' },
                  { id: 'CV', label: 'CV' },
                  { id: 'YAYASAN', label: 'YAYASAN' },
                  { id: 'PERKUMPULAN', label: 'PERKUMPULAN' },
                  { id: 'KOPERASI', label: 'KOPERASI' },
                  { id: 'FIRMA', label: 'FIRMA' },
                  { id: 'PERDATA', label: 'PERDATA' },
                  { id: 'PMA', label: 'PMA' },
                  { id: 'PERORANGAN', label: 'PERORANGAN' },
                  { id: 'LAINNYA', label: 'LAINNYA' }
                ].map((cat) => {
                  const isActive = selectedClientType === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedClientType(cat.id);
                        setProfileCurrentPage(1);
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#1e61c3] text-white border-[#1e61c3]'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tahun Pendirian */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Tahun Pendirian</label>
              <select
                value={selectedProfileYear}
                onChange={(e) => {
                  setSelectedProfileYear(e.target.value);
                  setProfileCurrentPage(1);
                }}
                className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 outline-none"
              >
                <option value="all">Semua Tahun Pendirian</option>
                {uniqueProfileYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Modal Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => {
                  setProfileSearchQuery('');
                  setSelectedProfileYear('all');
                  setSelectedClientType('all');
                  setShowArchivedProfiles(false);
                  setProfileCurrentPage(1);
                }}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 uppercase tracking-wider cursor-pointer"
              >
                Reset Filter
              </button>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-2.5 bg-[#1e61c3] text-white font-bold text-xs rounded-xl hover:bg-blue-700 uppercase tracking-wider cursor-pointer"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP HEADER (HIDDEN ON MOBILE) */}
      <div className="hidden md:block">
        <CompanyHeader
          editingProfileId={editingProfileId}
          setEditingProfileId={setEditingProfileId}
          setIsProfilePreview={setIsProfilePreview}
          updateData={updateData}
          INITIAL_STATE={INITIAL_STATE}
          isCv={isCv}
          onSyncDrive={handleSyncDrive}
          isSyncing={isSyncing}
        />
      </div>

      {!editingProfileId ? (
        <>
          {/* DESKTOP TOOLBAR (HIDDEN ON MOBILE) */}
          <div className="hidden md:block">
            <CompanyToolbar
              items={pageDirectoryEntries}
              showArchivedProfiles={showArchivedProfiles}
              setShowArchivedProfiles={setShowArchivedProfiles}
              setProfileCurrentPage={setProfileCurrentPage}
              profileSearchQuery={profileSearchQuery}
              setProfileSearchQuery={setProfileSearchQuery}
              selectedProfileYear={selectedProfileYear}
              setSelectedProfileYear={setSelectedProfileYear}
              uniqueProfileYears={uniqueProfileYears}
              selectedClientType={selectedClientType}
              setSelectedClientType={setSelectedClientType}
              onOpenMergeModal={() => setIsMergeModalOpen(true)}
            />
          </div>

          <CompanyList
            items={pageDirectoryEntries}
            profileStartIndex={profileStartIndex}
            paginatedProfileResults={paginatedProfileResults}
            totalProfileItems={totalProfileItems}
            profileSortField={profileSortField}
            profileSortOrder={profileSortOrder}
            handleProfileSort={handleProfileSort}
            renderProfileSortArrows={renderProfileSortArrows}
            openDropdownId={openDropdownId}
            setOpenDropdownId={setOpenDropdownId}
            setEditingProfileId={handleSetEditingProfileId}
            setIsProfilePreview={handleSetIsProfilePreview}
            updateData={updateData}
            INITIAL_STATE={INITIAL_STATE}
            handleDuplicateProfile={handleDuplicateProfile}
            handleArchiveProfile={handleArchiveProfile}
            profileCurrentPage={safeProfileCurrentPage}
            setProfileCurrentPage={setProfileCurrentPage}
            totalProfilePages={totalProfilePages}
            userProfile={userProfile}
            deleteCompany={deleteCompany}
            itemsPerPage={profileItemsPerPage}
            setItemsPerPage={(n) => {
              setProfileItemsPerPage(n);
              setProfileCurrentPage(1);
            }}
          />
        </>
      ) : isProfileLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-semibold text-slate-600">Memuat Data Lengkap Profile Klien...</p>
        </div>
      ) : isProfilePreview ? (
        <CompanyDetail
          data={data}
          isProfilePreview={isProfilePreview}
          setIsProfilePreview={handleSetIsProfilePreview}
          user={user}
          userProfile={userProfile}
          deleteCompany={deleteCompany}
          editingProfileId={editingProfileId}
          setEditingProfileId={handleSetEditingProfileId}
          recordNotification={recordNotification}
          handleFirestoreError={handleFirestoreError}
          openShareholderEditor={openShareholderEditor}
          deleteShareholder={deleteShareholder}
        />
      ) : (
        <CompanyForm
          data={data}
          isProfilePreview={isProfilePreview}
          setIsProfilePreview={handleSetIsProfilePreview}
          updateData={updateData}
          resetData={resetData}
          isSaving={isSaving}
          setIsSaving={setIsSaving}
          saveCompany={saveCompany}
          editingProfileId={editingProfileId}
          setEditingProfileId={handleSetEditingProfileId}
          user={user}
          recordNotification={recordNotification}
          handleFirestoreError={handleFirestoreError}
          isAddKbliModalOpen={isAddKbliModalOpen}
          setIsAddKbliModalOpen={setIsAddKbliModalOpen}
          openShareholderEditor={openShareholderEditor}
          deleteShareholder={deleteShareholder}
        />
      )}

      {/* Shareholder and KBLI Modals rendered locally inside Company Page */}
      <ShareholderModal
        editingShareholder={editingShareholder}
        setEditingShareholder={setEditingShareholder}
        editMode={editMode}
        setEditMode={setEditMode}
        data={data}
        currentTargetSharesPaid={currentTargetSharesPaidForModal}
        saveShareholder={saveShareholder}
      />

      <KbliModal
        isOpen={isAddKbliModalOpen}
        onClose={() => setIsAddKbliModalOpen(false)}
        searchTerm={kbliModalSearchTerm}
        setSearchTerm={setKbliModalSearchTerm}
        onKeyDown={handleKbliModalKeyDown}
        onSearch={performKbliModalSearch}
        paginatedResults={kbliPaginatedResults}
        checkedKblis={kbliCheckedKblis}
        onToggleAllOnPage={handleToggleAllKbliOnPage}
        onToggleKbli={handleToggleKbliChecked}
        totalPages={kbliTotalPages}
        pageNumbers={getKbliPageNumbers()}
        currentPage={safeKbliCurrentPage}
        setCurrentPage={setKbliCurrentPage}
        onAddBatch={handleAddKbliBatch}
      />

      <MergeClientsModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        profiles={mergeProfiles as any[]}
        onMerge={handleMergeCompanies}
        onMergeMultiple={handleMergeMultipleCompanies}
      />
    </PageContainer>
  );
};

export default CompanyPage;
