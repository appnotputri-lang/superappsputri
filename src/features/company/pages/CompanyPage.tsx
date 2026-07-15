import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
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
import { NotificationService } from '../../../services/NotificationService';
import { ShareholderModal } from '../../../components/modals/ShareholderModal';
import { KbliModal } from '../../../components/modals/KbliModal';
import { INITIAL_STATE, INITIAL_ADDRESS } from '../../../domain/company/initialCompanyData';
import { KBLI_DATA } from '../../../../utils/kbliData';
import { KBLI_2025_CATEGORIES } from '../../../lib/kbliConstants';
import kbli2025Data from '../../../../kbli_2025.json';
import { CompanyProfile, Shareholder, KbliItem } from '../../../../types';

export const CompanyPage: React.FC<CompanyPageProps> = () => {
  const location = useLocation();
  const isCv = location.pathname === '/profile-cv';

  // 1. Context & Auth Hooks
  const { user, userProfile } = useAuth();
  const { 
    profiles: ptProfiles, 
    cvProfiles, 
    save: saveCompanyInContext, 
    delete: deleteCompanyInContext, 
    archive: archiveCompanyInContext, 
    duplicate: duplicateCompanyInContext,
    loading: isDataLoading,
  } = useCompanyContext();

  const currentProfilesList = ptProfiles;

  // 2. Local State Management for Listing & View State
  const [selectedClientType, setSelectedClientType] = useState<string>('all');
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [isProfilePreview, setIsProfilePreview] = useState<boolean>(false);
  const [showArchivedProfiles, setShowArchivedProfiles] = useState<boolean>(false);
  const [profileCurrentPage, setProfileCurrentPage] = useState<number>(1);
  const [profileSearchQuery, setProfileSearchQuery] = useState<string>('');
  const [selectedProfileYear, setSelectedProfileYear] = useState<string>('all');
  const [profileSortField, setProfileSortField] = useState<string>('companyName');
  const [profileSortOrder, setProfileSortOrder] = useState<'asc' | 'desc'>('asc');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Sync clientType if arriving from legacy CV path
  useEffect(() => {
    if (isCv) {
      setSelectedClientType('CV');
    }
  }, [isCv]);
  
  // 3. Local State Management for Current Edited Profile Form Data
  const [data, setData] = useState<any>({ ...INITIAL_STATE });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // 4. Local State Management for Shareholder Modal
  const [editMode, setEditMode] = useState<'lama' | 'baru' | 'pengganti' | 'pengganti_saham' | null>(null);
  const [editingShareholder, setEditingShareholder] = useState<any>(null);
  const [editingDismissalId, setEditingDismissalId] = useState<string | null>(null);

  // 5. Local State Management for KBLI Modal
  const [isAddKbliModalOpen, setIsAddKbliModalOpen] = useState<boolean>(false);
  const [kbliModalSearchTerm, setKbliModalSearchTerm] = useState<string>('');
  const [kbliModalSearchResults, setKbliModalSearchResults] = useState<any[]>([]);
  const [kbliCurrentPage, setKbliCurrentPage] = useState<number>(1);
  const [kbliCheckedKblis, setKbliCheckedKblis] = useState<string[]>([]);

  // Update form data state when editingProfileId changes
  useEffect(() => {
    if (editingProfileId) {
      if (editingProfileId === 'new') {
        const defaultType = selectedClientType !== 'all' ? selectedClientType : 'PT';
        setData({ 
          ...INITIAL_STATE, 
          id: crypto.randomUUID(),
          clientType: defaultType,
          companyType: defaultType === 'CV' ? 'CV' : 'PT_LOKAL' 
        });
      } else {
        const found = currentProfilesList.find(p => p.id === editingProfileId);
        if (found) {
          setData({ ...INITIAL_STATE, ...found });
        }
      }
    } else {
      setData({ ...INITIAL_STATE });
    }
  }, [editingProfileId, currentProfilesList, selectedClientType]);

  // Reset pagination when searching/filtering
  useEffect(() => {
    setProfileCurrentPage(1);
  }, [profileSearchQuery, selectedProfileYear, showArchivedProfiles]);

  // Notification Helper
  const recordNotification = async (title: string, description: string, type: string) => {
    try {
      if (!user) return;
      await NotificationService.sendNotification(user, title, description, type);
    } catch (err) {
      console.error("Gagal menambahkan notifikasi:", err);
    }
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
      const response = await fetch(getApiUrl('/api/sync-drive-clients'), {
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
    if (confirm('Apakah Anda yakin ingin menghapus profil ini secara permanen?')) {
      await deleteCompanyInContext(id, isCv);
      recordNotification(
        'Profil Dihapus', 
        `Profil perusahaan dengan ID ${id} telah dihapus secara permanen.`, 
        'warning'
      );
      setEditingProfileId(null);
    }
    return null;
  };

  const handleArchiveProfile = async (profile: CompanyProfile) => {
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

  const handleDuplicateProfile = async (profile: CompanyProfile) => {
    try {
      const newProfile = await duplicateCompanyInContext(profile, isCv);
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

  // 9. Filtering and Sorting List Data
  let filteredProfileResults = currentProfilesList.filter((p) => {
    if (showArchivedProfiles) {
      return !!p.isArchived;
    } else {
      return !p.isArchived;
    }
  });

  if (selectedClientType !== 'all') {
    filteredProfileResults = filteredProfileResults.filter((p) => {
      return (p.clientType || 'PT') === selectedClientType;
    });
  }

  filteredProfileResults = filteredProfileResults.filter((p) => {
    if (!profileSearchQuery) return true;
    const q = profileSearchQuery.toLowerCase();
    return (
      (p.companyName || '').toLowerCase().includes(q) ||
      (p.domicile || '').toLowerCase().includes(q) ||
      (p.newAddress?.city || '').toLowerCase().includes(q)
    );
  });

  if (selectedProfileYear !== 'all') {
    filteredProfileResults = filteredProfileResults.filter((p) => {
      const year = p.establishmentDeedDate
        ? new Date(p.establishmentDeedDate).getFullYear().toString()
        : '';
      return year === selectedProfileYear;
    });
  }

  const uniqueProfileYears = Array.from(
    new Set(
      currentProfilesList
        .map((p) => (p.establishmentDeedDate ? new Date(p.establishmentDeedDate).getFullYear().toString() : ''))
        .filter(Boolean)
    )
  ).sort((a, b) => Number(b) - Number(a));

  const sortedProfileResults = [...filteredProfileResults].sort((a, b) => {
    let valA = '';
    let valB = '';

    if (profileSortField === 'companyName') {
      valA = a.companyName || '';
      valB = b.companyName || '';
    } else if (profileSortField === 'domicile') {
      valA = a.domicile || a.newAddress?.city || '';
      valB = b.domicile || b.newAddress?.city || '';
    } else if (profileSortField === 'establishmentDeedDate') {
      valA = a.establishmentDeedDate || '';
      valB = b.establishmentDeedDate || '';
    } else if (profileSortField === 'updatedAt') {
      valA = a.updatedAt || a.establishmentDeedDate || '';
      valB = b.updatedAt || b.establishmentDeedDate || '';
    }

    if (valA < valB) return profileSortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return profileSortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const profileItemsPerPage = 10;
  const totalProfileItems = sortedProfileResults.length;
  const totalProfilePages = Math.ceil(totalProfileItems / profileItemsPerPage) || 1;

  const safeProfileCurrentPage = Math.min(profileCurrentPage, totalProfilePages);
  const profileStartIndex = (safeProfileCurrentPage - 1) * profileItemsPerPage;
  const paginatedProfileResults = sortedProfileResults.slice(
    profileStartIndex,
    profileStartIndex + profileItemsPerPage
  );

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

  return (
    <div className="max-w-5xl mx-auto space-y-4">
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

      {!editingProfileId ? (
        <>
          <CompanyToolbar
            profiles={currentProfilesList}
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
          />

          <CompanyList
            profiles={currentProfilesList}
            profileStartIndex={profileStartIndex}
            paginatedProfileResults={paginatedProfileResults}
            totalProfileItems={totalProfileItems}
            profileSortField={profileSortField}
            profileSortOrder={profileSortOrder}
            handleProfileSort={handleProfileSort}
            renderProfileSortArrows={renderProfileSortArrows}
            openDropdownId={openDropdownId}
            setOpenDropdownId={setOpenDropdownId}
            setEditingProfileId={setEditingProfileId}
            setIsProfilePreview={setIsProfilePreview}
            updateData={updateData}
            INITIAL_STATE={INITIAL_STATE}
            handleDuplicateProfile={handleDuplicateProfile}
            handleArchiveProfile={handleArchiveProfile}
            profileCurrentPage={safeProfileCurrentPage}
            setProfileCurrentPage={setProfileCurrentPage}
            totalProfilePages={totalProfilePages}
          />
        </>
      ) : isProfilePreview ? (
        <CompanyDetail
          data={data}
          isProfilePreview={isProfilePreview}
          setIsProfilePreview={setIsProfilePreview}
          user={user}
          userProfile={userProfile}
          deleteCompany={deleteCompany}
          editingProfileId={editingProfileId}
          setEditingProfileId={setEditingProfileId}
          recordNotification={recordNotification}
          handleFirestoreError={handleFirestoreError}
          openShareholderEditor={openShareholderEditor}
          deleteShareholder={deleteShareholder}
        />
      ) : (
        <CompanyForm
          data={data}
          isProfilePreview={isProfilePreview}
          setIsProfilePreview={setIsProfilePreview}
          updateData={updateData}
          resetData={resetData}
          isSaving={isSaving}
          setIsSaving={setIsSaving}
          saveCompany={saveCompany}
          editingProfileId={editingProfileId}
          setEditingProfileId={setEditingProfileId}
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
    </div>
  );
};

export default CompanyPage;
