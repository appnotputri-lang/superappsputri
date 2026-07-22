import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, ChevronDown, ChevronRight, Loader2, Save, Download, Trash2, Edit, Eye, 
  FileText, FileCode, ArrowRight, Info, AlertCircle, Trash, Check, X,
  SlidersHorizontal, ChevronLeft, HelpCircle, RefreshCw, Send, CheckCircle2, AlertTriangle, Briefcase, FileBadge,
  UserPlus, ShieldAlert, KeyRound, Building, PlusCircle
} from 'lucide-react';
import { db } from '../../../lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../../lib/firebase';
import { sanitizeForFirestore } from '../../../utils/sanitize';
import { ProjectService } from '../../../services/ProjectService';
import { DocumentGenerationService } from '../../../services/DocumentGenerationService';
import { DocumentStatusBadge, documentStatusOptions } from '../../../../components/DocumentStatusBadge';
import { AhuSection, AhuLabel, AhuInput, AhuSelect, AhuMasaJabatanSelector } from '../../../../App';
import DraftAktaApp, { DraftAktaAppRef } from '../../../DraftAktaApp';
import DraftAktaRUPS from '../../../DraftAktaRUPS';
import { INITIAL_STATE } from '../../../domain/company/initialCompanyData';

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

export const RUPSLBPage: React.FC<RUPSLBPageProps> = ({
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
  // Extract and inject the inline block
  
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

  return (() => {
            // 1. Initial filter by search query (PT Name or Year/City)
            let filteredRupslbResults = projects.filter(p => {
              if (!notulenSearchQuery) return true;
              const q = notulenSearchQuery.toLowerCase();
              return (
                (p.companyName || '').toLowerCase().includes(q) ||
                (p.newAddress?.city || '').toLowerCase().includes(q) ||
                (p.signingDate || '').toLowerCase().includes(q)
              );
            });

            // 2. Filter by Year Dropdown Selection
            if (selectedRupslbYear !== "all") {
              filteredRupslbResults = filteredRupslbResults.filter(p => {
                const year = p.signingDate ? new Date(p.signingDate).getFullYear().toString() : "";
                return year === selectedRupslbYear;
              });
            }

            // 3. Extract unique years for the dropdown
            const uniqueRupslbYears = Array.from(new Set(
              projects
                .map(p => p.signingDate ? new Date(p.signingDate).getFullYear().toString() : "")
                .filter(Boolean)
            )).sort((a, b) => Number(b) - Number(a));

            // 4. Sort results
            const sortedRupslbResults = [...filteredRupslbResults].sort((a, b) => {
              let valA = "";
              let valB = "";

              if (rupslbSortField === "companyName") {
                valA = a.companyName || "";
                valB = b.companyName || "";
              } else if (rupslbSortField === "signingDate") {
                valA = a.signingDate || "";
                valB = b.signingDate || "";
              } else if (rupslbSortField === "status") {
                valA = a.rupslbStatus || "Draft";
                valB = b.rupslbStatus || "Draft";
              } else if (rupslbSortField === "updatedAt") {
                valA = a.updatedAt || a.signingDate || "";
                valB = b.updatedAt || b.signingDate || "";
              }

              if (valA < valB) return rupslbSortOrder === "asc" ? -1 : 1;
              if (valA > valB) return rupslbSortOrder === "asc" ? 1 : -1;
              return 0;
            });

            // 5. Pagination calculation
            const rupslbItemsPerPage = 10;
            const totalRupslbItems = sortedRupslbResults.length;
            const totalRupslbPages = Math.ceil(totalRupslbItems / rupslbItemsPerPage) || 1;
            
            // Adjust current page if it's out of range
            const safeRupslbCurrentPage = Math.min(rupslbCurrentPage, totalRupslbPages);
            const rupslbStartIndex = (safeRupslbCurrentPage - 1) * rupslbItemsPerPage;
            const paginatedRupslbResults = sortedRupslbResults.slice(rupslbStartIndex, rupslbStartIndex + rupslbItemsPerPage);

            const formatRupslbLastUpdated = (dateStr?: string, signingDate?: string) => {
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

            const handleRupslbSort = (field: string) => {
              if (rupslbSortField === field) {
                setRupslbSortOrder(rupslbSortOrder === "asc" ? "desc" : "asc");
              } else {
                setRupslbSortField(field);
                setRupslbSortOrder("asc");
              }
              setRupslbCurrentPage(1);
            };

            const renderRupslbSortArrows = (field: string) => {
              const isActive = rupslbSortField === field;
              return (
                <span className="inline-flex flex-col text-[8px] text-slate-400 shrink-0 ml-1.5 leading-none select-none">
                  <span className={`${isActive && rupslbSortOrder === "asc" ? "text-blue-600 font-bold" : "text-slate-300"}`}>▲</span>
                  <span className={`${isActive && rupslbSortOrder === "desc" ? "text-blue-600 font-bold" : "text-slate-300"}`}>▼</span>
                </span>
              );
            };

            const getRupslbPageRange = () => {
              const pages: (number | string)[] = [];
              if (totalRupslbPages <= 5) {
                for (let i = 1; i <= totalRupslbPages; i++) pages.push(i);
              } else {
                pages.push(1);
                if (safeRupslbCurrentPage > 3) {
                  pages.push("...");
                }
                const start = Math.max(2, safeRupslbCurrentPage - 1);
                const end = Math.min(totalRupslbPages - 1, safeRupslbCurrentPage + 1);
                for (let i = start; i <= end; i++) {
                  pages.push(i);
                }
                if (safeRupslbCurrentPage < totalRupslbPages - 2) {
                  pages.push("...");
                }
                pages.push(totalRupslbPages);
              }
              return pages;
            };

            const handleSearchChange = (val: string) => {
              setNotulenSearchQuery(val);
              setRupslbCurrentPage(1);
            };

            return (
              <div className="max-w-7xl mx-auto space-y-6 px-2 sm:px-4 py-4">
                <div className="flex justify-between items-center bg-white p-5 rounded-md shadow-sm border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-2.5 rounded-full border border-blue-100 flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-[#1b449c]" />
                    </div>
                    <div>
                      <h2 className="text-[18px] font-extrabold flex items-center gap-2 text-slate-800 tracking-tight leading-snug">
                        RUPS LUAR BIASA (RUPS LB)
                      </h2>
                      <p className="text-[13px] text-slate-500 font-medium">
                        Kelola daftar RUPS LB (Akta/Notulen/Sirkuler)
                      </p>
                    </div>
                  </div>
                  {!editingProjectId && (
                    <button onClick={() => {
                      setEditingProjectId('new');
                      setIsRupsPreview(false);
                      updateData({ ...INITIAL_STATE } as any);
                    }} className="bg-[#1b449c] hover:bg-[#13327d] text-white px-5 py-2.5 rounded-md font-bold text-[12px] flex items-center gap-2 transition-all shadow-sm shrink-0 hover:scale-[1.01] active:scale-[0.99]">
                      <Plus className="w-4 h-4" /> TAMBAH RUPS LB BARU
                    </button>
                  )}
                </div>

               {editingProjectId ? (
                <div className="space-y-4 pb-20">
                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-slate-50/50 p-2.5 rounded-xl border border-slate-200 gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button 
                        className="text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5 font-bold text-[12.5px] uppercase h-11 px-4 rounded-xl shadow-sm transition-all duration-150 shrink-0" 
                        onClick={() => {
                          const returnToProjectId = activeProjectContext;
                          setIsRupsPreview(false);
                          setEditingProjectId(null);
                          setActiveProjectContext(null);
                          if (returnToProjectId) {
                            setSelectedProjectId(returnToProjectId);
                            setActiveSidebarTab('project_detail');
                          }
                        }}
                      >
                        <ArrowRight className="w-5 h-5 rotate-180" /> Kembali
                      </button>

                      <button 
                        className="bg-[#3b5998] hover:bg-[#2d4373] text-white flex items-center justify-center gap-1.5 font-bold text-[12.5px] uppercase h-11 px-4 rounded-xl shadow-sm transition-all duration-150 shrink-0 disabled:opacity-50" 
                        onClick={async () => {
                          const success = await handleManualSync('RUPSLB', data);
                          if (success) {
                            alert("Berhasil disimpan ke laporan!");
                          }
                        }}
                        disabled={isSyncing}
                      >
                        {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Simpan ke laporan
                      </button>
                      
                      <div className="h-6 w-px bg-slate-250 mx-1 hidden sm:block"></div>
                      <AutoSaveIndicatorComponent />
   
                      {isRupsPreview ? (
                        <>
                          <button 
                            onClick={(e) => { 
                              e.preventDefault(); 
                              setIsRupsPreview(false); 
                            }}
                            className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[12.5px] font-bold transition-all border border-slate-200 h-11 flex items-center gap-2 uppercase shrink-0"
                          >
                            <Edit className="w-[18px] h-[18px]" /> Edit
                          </button>
                          {userProfile?.role === 'Super Admin' && (
                            <button 
                              onClick={async (e) => {
                                e.preventDefault();
                                if(confirm('Hapus RUPS LB ' + data.companyName + '?')) {
                                if (!user) return alert('Anda harus login!');
                                try {
                                  const deletedName = data.companyName || 'PT Baru';
                                  await deleteDoc(doc(db, 'projects', editingProjectId));
                                  recordNotification(
                                    'Draft RUPS LB Dihapus',
                                    `Draft RUPS Luar Biasa untuk perusahaan "${deletedName}" telah berhasil dihapus oleh ${user?.email || 'Admin'}.`,
                                    'delete_rupslb'
                                  );
                                  const returnToProjectId = activeProjectContext;
                                  alert('RUPS LB berhasil dihapus');
                                  setEditingProjectId(null);
                                  setActiveProjectContext(null);
                                  setIsRupsPreview(false);
                                  if (returnToProjectId) {
                                    setSelectedProjectId(returnToProjectId);
                                    setActiveSidebarTab('project_detail');
                                  }
                                } catch (err) {
                                  handleFirestoreError(err, OperationType.DELETE, `projects/${editingProjectId}`);
                                }
                              }
                            }}
                            className="px-4 bg-red-50 hover:bg-red-500 hover:text-white text-red-650 rounded-xl font-bold transition-all text-[12.5px] border border-red-100 hover:border-red-500 h-11 flex items-center gap-2 uppercase shrink-0"
                          >
                            <Trash2 className="w-[18px] h-[18px]" /> Hapus
                          </button>
                        )}
                      </>
                      ) : (
                        <>
                          <button 
                            onClick={resetData} 
                            className="px-4 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-650 hover:text-slate-800 rounded-xl text-[12.5px] font-bold transition-all h-11 uppercase"
                          >
                            RISET
                          </button>
                          <button 
                            disabled={isSaving}
                            onClick={async () => {
                              if (!data.companyName) return alert('Nama perseroan harus diisi');
                              setIsSaving(true);
                              
                              let newProjects = [...projects];
                              const newId = editingProjectId && editingProjectId !== 'new' ? editingProjectId : crypto.randomUUID();
                              const isNew = editingProjectId === 'new' || !editingProjectId;
                              
                              // Automatically calculate final shareholders right before saving to ensure consistency
                              const calculatedFinal = calculateFinalShareholders(data);
                              
                              const profileData: CompanyProfile = {
                                  ...data,
                                  id: newId,
                                  finalShareholders: calculatedFinal.length > 0 ? calculatedFinal : (data.finalShareholders || []),
                                  documentStatus: isNew ? 'DRAFTING' : (data.documentStatus || 'DRAFTING'),
                                  updatedAt: new Date().toISOString()
                              };
                              
                              if (!user) {
                                  setIsSaving(false);
                                  return alert('Anda harus login terlebih dahulu!');
                              }
                              const idx = newProjects.findIndex(p => p.id === editingProjectId);
                              if (idx >= 0) {
                                  profileData.id = newProjects[idx].id;
                              }
                              
                              try {
                                   await setDoc(doc(db, 'projects', profileData.id), sanitizeForFirestore(profileData));
                                   if (activeProjectContext) {
                                       const docName = profileData.documentType === 'CIRCULAR'
                                         ? `Draft Sirkuler RUPS LB - ${profileData.companyName || 'PT Baru'}`
                                         : `Draft RUPS LB - ${profileData.companyName || 'PT Baru'}`;
                                       await ProjectService.addDocument(activeProjectContext, {
                                           name: docName,
                                           type: 'docx',
                                           url: `/rupslb`,
                                           refId: profileData.id,
                                           uploadedBy: user?.email || 'staff_notaris'
                                       });

                                       await DocumentGenerationService.generateAndUploadAllForProject(
                                           activeProjectContext,
                                           profileData,
                                           user?.email,
                                           userProfile?.name
                                       );
                                   }
                                   recordNotification(
                                     isNew ? 'Draft RUPS LB Baru Dibuat' : 'Draft RUPS LB Diubah',
                                     `Draft RUPS Luar Biasa untuk perusahaan "${profileData.companyName || 'PT Baru'}" telah ${isNew ? 'berhasil dibuat' : 'diperbarui'} oleh ${user?.email || 'Admin'}.`,
                                     isNew ? 'create_rupslb' : 'update_rupslb'
                                   );
                                  const returnToProjectId = activeProjectContext;
                                  setEditingProjectId(null);
                                  setActiveProjectContext(null);
                                  setIsRupsPreview(false);
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
                           }} 
                           className="px-5 bg-[#40bdae] hover:bg-[#349c8f] text-white rounded-xl text-[12.5px] font-bold transition-all h-11 uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSaving ? 'MENYIMPAN...' : 'SIMPAN RUPS LB'}
                          </button>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setIsRupslbDocDropdownOpen(!isRupslbDocDropdownOpen)}
                          className="w-full sm:w-auto h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-indigo-100 uppercase text-[12px] tracking-wider select-none shrink-0"
                        >
                          <Download className="w-[18px] h-[18px] stroke-[2.25px]" />
                          <span>Dokumen</span>
                          <ChevronDown className={`w-[14px] h-[14px] transition-transform duration-200 ${isRupslbDocDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isRupslbDocDropdownOpen && (
                          <div className="absolute right-0 mt-2 bg-white border border-slate-200 shadow-xl rounded-2xl py-1 w-64 z-50 text-left overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                            {/* Notulen RUPS LB / SIRKULER RUPS LB */}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                setIsRupslbDocDropdownOpen(false);
                                await handleExportWord();
                              }}
                              className="w-full px-4.5 py-3 text-slate-700 hover:bg-slate-50 text-[12px] font-bold flex items-center gap-3 uppercase tracking-wide transition-colors border-b border-slate-100"
                            >
                              <FileText className="w-[18px] h-[18px] text-indigo-600 stroke-[2.25px] shrink-0" />
                              <div className="flex flex-col text-left">
                                <span className="font-bold text-slate-800 leading-tight">
                                  {mergedData.documentType === 'CIRCULAR' ? 'SIRKULER RUPS LB' : 'Notulen RUPS LB'}
                                </span>
                                <span className="text-[10px] text-slate-400 lowercase mt-0.5 font-medium">format dokumen (.docx)</span>
                              </div>
                            </button>

                            {/* Draft Akta RUPS LB / AKTA SIRKULER RUPS LB */}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                setIsRupslbDocDropdownOpen(false);
                                try {
                                  const { generateRUPSDocx } = await import('../../../lib/generateRUPSDocx');
                                  await generateRUPSDocx(mergedData);
                                } catch (err) {
                                  console.error('Failed to generate Draft Akta DOCX:', err);
                                  alert('Gagal menghasilkan Draft Akta DOCX.');
                                }
                              }}
                              className="w-full px-4.5 py-3 text-slate-700 hover:bg-slate-50 text-[12px] font-bold flex items-center gap-3 uppercase tracking-wide transition-colors border-b border-slate-100"
                            >
                              <FileCode className="w-[18px] h-[18px] text-blue-600 stroke-[2.25px] shrink-0" />
                              <div className="flex flex-col text-left">
                                <span className="font-bold text-slate-800 leading-tight">
                                  {mergedData.documentType === 'CIRCULAR' ? 'AKTA SIRKULER RUPS LB' : 'AKTA RUPS LB'}
                                </span>
                                <span className="text-[10px] text-slate-400 lowercase mt-0.5 font-medium">format dokumen (.docx)</span>
                              </div>
                            </button>

                            {/* Akta Peralihan Saham (Multiple items) */}
                            {mergedData.resolutions.shareholders && mergedData.shareTransfers && mergedData.shareTransfers.length > 0 && (
                               (mergedData.shareTransfers || []).map((transfer, index) => {
                                 const fromName = mergedData.shareholders?.find(s => s.id === transfer.fromShareholderId)?.name || 'Unknown';
                                 const toName = mergedData.shareholders?.find(s => s.id === transfer.toShareholderId)?.name || mergedData.finalShareholders?.find(s => s.id === transfer.toShareholderId)?.name || 'Unknown';
                                 return (
                                   <button
                                     key={transfer.id}
                                     onClick={async (e) => {
                                       e.stopPropagation();
                                       setIsRupslbDocDropdownOpen(false);
                                       try {
                                         await draftAktaRef.current?.handleDownloadSingle(transfer.id);
                                       } catch (err) {
                                         console.error('Failed to generate Draft Akta Peralihan Saham:', err);
                                         alert('Gagal menghasilkan Akta Peralihan Saham.');
                                       }
                                     }}
                                     className="w-full px-4.5 py-3 text-slate-700 hover:bg-slate-50 text-[12px] font-bold flex items-center gap-3 uppercase tracking-wide transition-colors border-b border-slate-100 last:border-0"
                                   >
                                     <FileCode className="w-[18px] h-[18px] text-emerald-600 stroke-[2.25px] shrink-0" />
                                     <div className="flex flex-col text-left">
                                       <span className="font-bold text-slate-800 leading-tight">Akta Peralihan Saham {index + 1}</span>
                                       <span className="text-[10px] text-slate-400 lowercase mt-0.5 font-medium leading-tight">dari {fromName} ke {toName} (.docx)</span>
                                     </div>
                                   </button>
                                 );
                               })
                            )}

                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <fieldset disabled={isRupsPreview} className="space-y-4">

            <AhuSection title="STATUS DOKUMEN">
              <div className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                    <AhuLabel label="Status Saat Ini" />
                    <div className="md:col-span-3">
                      <select
                        className="w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none bg-white focus:border-[#66afe9]"
                        value={data.documentStatus || "DRAFTING"}
                        onChange={e => updateData({ documentStatus: e.target.value as any })}
                      >
                        {documentStatusOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                 </div>
              </div>
            </AhuSection>

            {/* DATA PERSEROAN (Pilihan dari Profil) */}
            <AhuSection title="PILIH PROFIL">
              <div className="space-y-4">
                {activeProjectContext ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-sm p-4 text-[13px] text-slate-700 space-y-2">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Company</div>
                      <div className="font-bold text-slate-800 text-[14px]">
                        {profiles.find(p => p.id === data.selectedProfileId)?.companyName || data.companyName || ((projects.find(p => p.id === activeProjectContext) as any) || (rupstProjects.find(p => p.id === activeProjectContext) as any) || (pendirianProjects.find(p => p.id === activeProjectContext) as any))?.title || 'PT Belum Ditentukan'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Source: Project Workspace</span>
                    </div>
                    <p className="text-[11px] text-slate-400 italic">
                      This Company is locked because the document belongs to this Project.
                    </p>
                  </div>
                ) : (
                  <>
                    <label className="block text-[13px] font-medium text-slate-700 mb-1">Pilih Profil Perseroan untuk mengisi data otomatis</label>
                    <select 
                      className="w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none bg-white focus:border-[#66afe9]"
                      value={data.selectedProfileId || ''}
                      onChange={(e) => {
                         const selected = profiles.find(p => p.id === e.target.value);
                         if (selected) {
                             const normalizeKblis = (items: any[]) => (items || []).map((k: any) => ({
                               id: k.id || crypto.randomUUID(),
                               code: k.code || k.kode || '',
                               name: k.name || k.judul || k.title || '',
                               description: k.description || k.uraian || '',
                               categoryLetter: k.categoryLetter || '',
                               categoryName: k.categoryName || '',
                               uraian: k.uraian || k.description || ''
                             }));

                             const currentManagement = selected.oldManagementItems || selected.newManagementItems || (selected as any).managementItems || [];

                             updateData({ 
                               ...(selected as any), 
                               selectedProfileId: selected.id,
                               companyName: selected.companyName || '',
                               domicile: selected.domicile || selected.newAddress?.city || selected.oldAddress?.city || '',
                               oldFullAddress: selected.fullAddress || selected.oldFullAddress || (selected.newAddress?.fullAddress ? `${selected.newAddress.fullAddress}, RT ${selected.newAddress.rt}/${selected.newAddress.rw}, Kel. ${selected.newAddress.kelurahan}, Kec. ${selected.newAddress.kecamatan}` : ''),
                               oldAddress: selected.newAddress || selected.oldAddress,
                               oldDomicile: selected.domicile || selected.oldDomicile,
                               kbliItems: normalizeKblis(selected.kbliItems),
                               shareholders: selected.shareholders || [],
                               oldManagementItems: currentManagement,
                               originalCapitalBase: selected.originalCapitalBase || selected.targetCapitalBase || 0,
                               originalCapitalPaid: selected.originalCapitalPaid || selected.targetCapitalPaid || 0,
                               originalSharePrice: selected.originalSharePrice || 0,
                               originalAuthorizedShares: selected.originalAuthorizedShares || 0,
                               originalTotalShares: selected.originalTotalShares || 0,
                               establishmentDeedNumber: selected.establishmentDeedNumber || '',
                               establishmentDeedDate: selected.establishmentDeedDate || '',
                               establishmentNotary: selected.establishmentNotary || '',
                               establishmentNotaryDomicile: selected.establishmentNotaryDomicile || '',
                               establishmentSkNumber: selected.establishmentSkNumber || '',
                               establishmentSkDate: selected.establishmentSkDate || '',
                               amendmentDeeds: selected.amendmentDeeds || []
                             } as any);
                         } else {
                             updateData({ selectedProfileId: '' });
                         }
                      }}
                    >
                      <option value="">-- Pilih PT --</option>
                      {profiles.map(p => (
                        <option key={p.id} value={p.id}>{p.companyName}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </AhuSection>

            {false && (
              <>
            <AhuSection title="DATA PERSEROAN">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <AhuLabel label="Nama Perseroan" />
                  <div className="md:col-span-3"><AhuInput value={data.companyName || ''} onChange={e => updateData({ companyName: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <AhuLabel label="Kedudukan (Kab/Kota)" />
                  <div className="md:col-span-3 flex gap-4 items-center">
                    <div className="flex-1">
                      <AhuInput 
                        placeholder="Contoh: Kota Bandung atau Kabupaten Bandung Barat"
                        value={data.domicile || ''}
                        onChange={e => updateData({ domicile: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <AhuLabel label="Harga per Lembar" />
                  <div className="md:col-span-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">Rp.</span>
                      <AhuInput 
                        className="pl-10"
                        value={data.originalSharePrice === 0 ? '' : formatInputNumber(data.originalSharePrice)} 
                        onChange={e => updateData({ originalSharePrice: parseFormattedNumber(e.target.value) })} 
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <AhuLabel label="Modal Dasar (Lembar)" required />
                  <div className="md:col-span-3">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <AhuInput 
                          value={data.originalAuthorizedShares === 0 ? '' : formatInputNumber(data.originalAuthorizedShares)} 
                          onChange={e => updateData({ originalAuthorizedShares: parseFormattedNumber(e.target.value) })} 
                        />
                      </div>
                      <div className="text-[13px] font-bold text-slate-500 w-48">
                        Rp. {formatInputNumber(data.targetCapitalBase)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <AhuLabel label="Modal Ditempatkan & Disetor (Lembar)" required />
                  <div className="md:col-span-3">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <AhuInput 
                          value={data.originalTotalShares === 0 ? '' : formatInputNumber(data.originalTotalShares)} 
                          onChange={e => updateData({ originalTotalShares: parseFormattedNumber(e.target.value) })} 
                        />
                      </div>
                      <div className="text-[13px] font-bold text-slate-500 w-48">
                        Rp. {formatInputNumber(data.targetCapitalPaid)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AhuSection>

            {/* PENGURUS DAN PEMEGANG SAHAM LAMA */}
            <AhuSection title="PENGURUS DAN PEMEGANG SAHAM LAMA *">
              <div className="space-y-4">
                  {(data.documentType === 'MINUTES' || data.documentType === 'CIRCULAR') && (
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-sm flex items-start gap-3">
                      <div className="bg-blue-100 p-1.5 rounded-full"><FileText className="w-4 h-4 text-blue-600" /></div>
                      <div>
                        <div className="text-[12px] font-bold text-blue-800 uppercase">Petunjuk Daftar Para Pihak {data.documentType === 'CIRCULAR' ? '(Sirkuler)' : '(Notulen)'}</div>
                        <p className="text-[11px] text-blue-600 leading-tight mt-0.5">
                          Silakan centang kolom <b>"{data.documentType === 'CIRCULAR' ? 'Pihak' : 'Hadir'}"</b> di bawah ini untuk setiap pemegang saham yang {data.documentType === 'CIRCULAR' ? 'menyetujui keputusan' : 'menghadiri rapat'}. 
                          Hanya pemegang saham yang dicentang yang akan muncul dalam daftar para pihak di dokumen PKR LB.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openShareholderEditor('lama')} className="bg-[#222d32] text-white px-3 py-1.5 rounded-sm text-[12px] font-bold shadow hover:bg-black transition-colors flex items-center gap-1"><Plus className="w-4 h-4" /> Tambah Data</button>
                  </div>
                  <div className="border border-slate-200 overflow-x-auto rounded-sm">
                    <table className="min-w-[600px] w-full text-left text-[11px]">
                      <thead className="bg-[#f9f9f9] border-b border-slate-200 font-bold uppercase">
                        <tr>
                          <th className="p-2 border-r border-slate-200">Nama</th>
                          <th className="p-2 border-r border-slate-200">Klasifikasi Saham</th>
                          <th className="p-2 border-r border-slate-200">Jumlah Lembar Saham</th>
                          <th className="p-2 border-r border-slate-200">Jabatan</th>
                          <th className="p-2 border-r border-slate-200">Total</th>
                          <th className="p-2 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.shareholders.map((s) => (
                           <tr key={s.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors text-[10px]">
                             <td className="p-2 border-r border-slate-200 font-bold uppercase">{s.name}</td>
                             <td className="p-2 border-r border-slate-200">Tanpa Klasifikasi</td>
                             <td className="p-2 border-r border-slate-200">{formatInputNumber(s.sharesOwned)}</td>
                             <td className="p-2 border-r border-slate-200 font-bold uppercase">{s.isManagement ? (s.managementPosition || 'DIREKTUR') : '-'}</td>
                             <td className="p-2 border-r border-slate-200">Rp. {formatInputNumber(s.sharesOwned * data.originalSharePrice)}</td>
                             <td className="p-2 text-center text-blue-600 flex items-center justify-center gap-2">
                               <button onClick={() => openShareholderEditor('lama', s)} className="hover:underline flex items-center gap-0.5"><Eye className="w-3 h-3" /> Edit</button>
                               <span className="text-slate-300">|</span>
                               <button onClick={() => deleteShareholder(s.id, 'lama')} className="hover:underline text-red-500 flex items-center gap-0.5"><Trash2 className="w-3 h-3" /> Hapus</button>
                             </td>
                           </tr>
                        ))}
                        {data.shareholders.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-slate-400 italic">Belum ada data pengurus/pemegang saham lama.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-[13px] font-bold text-slate-800 space-y-1 uppercase">
                    <div>TOTAL LEMBAR SAHAM {formatInputNumber(data.shareholders.reduce((sum, s) => sum + s.sharesOwned, 0))}</div>
                    <div>TOTAL MODAL DITEMPATKAN DAN DISETOR Rp {formatInputNumber(data.shareholders.reduce((sum, s) => sum + s.sharesOwned, 0) * data.originalSharePrice)}</div>
                    {data.shareholders.reduce((sum, s) => sum + s.sharesOwned, 0) < data.originalTotalShares && (
                      <div className="text-red-500 font-normal text-xs normal-case mt-1 bg-red-50 p-2 rounded border border-red-100">
                        * Total lembar saham ({formatInputNumber(data.shareholders.reduce((sum, s) => sum + s.sharesOwned, 0))}) kurang dari Modal Ditempatkan & Disetor Lama ({formatInputNumber(data.originalTotalShares)} lembar)
                      </div>
                    )}
                  </div>
               </div>
            </AhuSection>

            <AhuSection title="AKTA PENDIRIAN DAN PERUBAHAN">
              <div className="space-y-4">
                  <div className="border border-slate-200 rounded-sm p-4 space-y-4 bg-white/50">
                    <h3 className="font-bold text-[13px] text-slate-800">Akta Pendirian</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                      <AhuLabel label="Nomor Akta" />
                      <div className="md:col-span-3">
                        <AhuInput value={data.establishmentDeedNumber || ''} onChange={e => updateData({ establishmentDeedNumber: e.target.value })} placeholder="Contoh: 12" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                      <AhuLabel label="Tanggal Akta" />
                      <div className="md:col-span-3">
                        <AhuInput type="date" value={data.establishmentDeedDate || ''} onChange={e => updateData({ establishmentDeedDate: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                      <AhuLabel label="Pilih Notaris" />
                      <div className="md:col-span-3">
                        <AhuSelect
                          value={data.establishmentNotary === 'Nukantini Putri Parincha' ? 'saya' : (data.establishmentNotary ? 'manual' : '')}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'saya') {
                              updateData({
                                establishmentNotary: 'Nukantini Putri Parincha',
                                establishmentNotaryTitle: 'Sarjana Hukum, Magister Kenotariatan',
                                establishmentNotaryDomicile: 'Kabupaten Bandung Barat'
                              });
                            } else if (val === 'manual') {
                              updateData({
                                establishmentNotary: '',
                                establishmentNotaryTitle: '',
                                establishmentNotaryDomicile: ''
                              });
                            } else {
                              updateData({ establishmentNotary: '', establishmentNotaryTitle: '', establishmentNotaryDomicile: '' });
                            }
                          }}
                        >
                          <option value="">-- Pilih Notaris --</option>
                          <option value="saya">Saya (Nukantini Putri Parincha, SH., M.Kn.)</option>
                          <option value="manual">Input Bebas</option>
                        </AhuSelect>
                      </div>
                    </div>
                    {data.establishmentNotary !== 'Nukantini Putri Parincha' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                      <AhuLabel label="Nama Notaris" />
                      <div className="md:col-span-3 flex gap-2">
                        <AhuInput 
                          className="flex-1"
                          value={data.establishmentNotary || ''} 
                          onChange={e => updateData({ establishmentNotary: e.target.value })} 
                          placeholder="Nama notaris pendirian" 
                        />
                        <div className="w-48 flex flex-col gap-1">
                          <AhuSelect
                            value={['Sarjana Hukum', 'Sarjana Hukum, Magister Kenotariatan'].includes(data.establishmentNotaryTitle || '') ? data.establishmentNotaryTitle : (data.establishmentNotaryTitle ? 'manual' : '')}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'manual') {
                                // Keep current title but allow editing
                              } else {
                                updateData({ establishmentNotaryTitle: val });
                              }
                            }}
                          >
                            <option value="">-- Pilih Gelar --</option>
                            <option value="Sarjana Hukum">SH.</option>
                            <option value="Sarjana Hukum, Magister Kenotariatan">SH., M.Kn.</option>
                            <option value="manual">Manual</option>
                          </AhuSelect>
                          {( !['Sarjana Hukum', 'Sarjana Hukum, Magister Kenotariatan'].includes(data.establishmentNotaryTitle || '') || (data.establishmentNotaryTitle === 'manual')) && data.establishmentNotaryTitle !== undefined && (
                             <AhuInput 
                               placeholder="Gelar manual..." 
                               value={data.establishmentNotaryTitle === 'manual' ? '' : data.establishmentNotaryTitle}
                               onChange={e => updateData({ establishmentNotaryTitle: e.target.value })}
                             />
                          )}
                        </div>
                      </div>
                    </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                      <AhuLabel label="Kedudukan Notaris" />
                      <div className="md:col-span-3">
                        <AhuInput 
                          value={data.establishmentNotaryDomicile || ''} 
                          onChange={e => updateData({ establishmentNotaryDomicile: e.target.value })} 
                          placeholder="Contoh: Kabupaten Bandung Barat" 
                          disabled={data.establishmentNotary === 'Nukantini Putri Parincha'}
                          className={data.establishmentNotary === 'Nukantini Putri Parincha' ? 'bg-slate-100 font-bold' : ''}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                      <AhuLabel label="Nomor SK" />
                      <div className="md:col-span-3">
                        <AhuInput value={data.establishmentSkNumber || ''} onChange={e => updateData({ establishmentSkNumber: e.target.value })} placeholder="Nomor SK Kemenkumham" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                      <AhuLabel label="Tanggal SK" />
                      <div className="md:col-span-3">
                        <AhuInput type="date" value={data.establishmentSkDate || ''} onChange={e => updateData({ establishmentSkDate: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {(data.amendmentDeeds || []).map((deed, index) => (
                    <div key={deed.id} className="border border-slate-200 rounded-sm p-4 space-y-4 bg-white/50 relative">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
                        <h3 className="font-bold text-[13px] text-slate-800 uppercase tracking-tight">Akta Perubahan {index + 1}</h3>
                        <button 
                          onClick={() => {
                            const newList = (data.amendmentDeeds || []).filter(d => d.id !== deed.id);
                            updateData({ amendmentDeeds: newList });
                          }}
                          className="text-red-500 hover:text-red-700 p-1 transition-colors"
                          title="Hapus Akta Perubahan"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                        <AhuLabel label="Nomor Akta" />
                        <div className="md:col-span-3">
                          <AhuInput 
                            value={deed.number || ''} 
                            onChange={e => {
                              const newList = [...(data.amendmentDeeds || [])];
                              newList[index] = { ...deed, number: e.target.value };
                              updateData({ amendmentDeeds: newList });
                            }} 
                            placeholder="Contoh: 05" 
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                        <AhuLabel label="Tanggal Akta" />
                        <div className="md:col-span-3">
                          <AhuInput 
                            type="date" 
                            value={deed.date || ''} 
                            onChange={e => {
                              const newList = [...(data.amendmentDeeds || [])];
                              newList[index] = { ...deed, date: e.target.value };
                              updateData({ amendmentDeeds: newList });
                            }} 
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                        <AhuLabel label="Pilih Notaris" />
                        <div className="md:col-span-3">
                          <AhuSelect
                            value={deed.notary === 'Nukantini Putri Parincha' ? 'saya' : (deed.notary ? 'manual' : '')}
                            onChange={(e) => {
                              const val = e.target.value;
                              const newList = [...(data.amendmentDeeds || [])];
                              if (val === 'saya') {
                                newList[index] = { 
                                  ...deed, 
                                  notary: 'Nukantini Putri Parincha',
                                  notaryTitle: 'Sarjana Hukum, Magister Kenotariatan',
                                  notaryDomicile: 'Kabupaten Bandung Barat'
                                };
                              } else if (val === 'manual') {
                                newList[index] = { 
                                  ...deed, 
                                  notary: '',
                                  notaryTitle: '',
                                  notaryDomicile: ''
                                };
                              } else {
                                newList[index] = { ...deed, notary: '', notaryTitle: '', notaryDomicile: ' ' };
                              }
                              updateData({ amendmentDeeds: newList });
                            }}
                          >
                            <option value="">-- Pilih Notaris --</option>
                            <option value="saya">Saya (Nukantini Putri Parincha, SH., M.Kn.)</option>
                            <option value="manual">Input Bebas</option>
                          </AhuSelect>
                        </div>
                      </div>
                      {deed.notary !== 'Nukantini Putri Parincha' && (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                        <AhuLabel label="Nama Notaris" />
                        <div className="md:col-span-3 flex gap-2">
                          <AhuInput 
                            className="flex-1"
                            value={deed.notary || ''} 
                            onChange={e => {
                              const newList = [...(data.amendmentDeeds || [])];
                              newList[index] = { ...deed, notary: e.target.value };
                              updateData({ amendmentDeeds: newList });
                            }} 
                            placeholder="Nama notaris perubahan" 
                          />
                          <div className="w-48 flex flex-col gap-1">
                            <AhuSelect
                              value={['Sarjana Hukum', 'Sarjana Hukum, Magister Kenotariatan'].includes(deed.notaryTitle || '') ? deed.notaryTitle : (deed.notaryTitle ? 'manual' : '')}
                              onChange={(e) => {
                                const val = e.target.value;
                                const newList = [...(data.amendmentDeeds || [])];
                                if (val === 'manual') {
                                   newList[index] = { ...deed, notaryTitle: deed.notaryTitle || ' ' };
                                } else {
                                   newList[index] = { ...deed, notaryTitle: val };
                                }
                                updateData({ amendmentDeeds: newList });
                              }}
                            >
                              <option value="">-- Pilih Gelar --</option>
                              <option value="Sarjana Hukum">SH.</option>
                              <option value="Sarjana Hukum, Magister Kenotariatan">SH., M.Kn.</option>
                              <option value="manual">Manual</option>
                            </AhuSelect>
                            {(!['Sarjana Hukum', 'Sarjana Hukum, Magister Kenotariatan'].includes(deed.notaryTitle || '') || (deed.notaryTitle === 'manual')) && deed.notaryTitle !== undefined && (
                               <AhuInput 
                                 placeholder="Gelar manual..." 
                                 value={deed.notaryTitle === 'manual' ? '' : deed.notaryTitle}
                                 onChange={e => {
                                   const newList = [...(data.amendmentDeeds || [])];
                                   newList[index] = { ...deed, notaryTitle: e.target.value };
                                   updateData({ amendmentDeeds: newList });
                                 }}
                               />
                            )}
                          </div>
                        </div>
                      </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                        <AhuLabel label="Kedudukan Notaris" />
                        <div className="md:col-span-3">
                          <AhuInput 
                            value={deed.notaryDomicile || ''} 
                            onChange={e => {
                              const newList = [...(data.amendmentDeeds || [])];
                              newList[index] = { ...deed, notaryDomicile: e.target.value };
                              updateData({ amendmentDeeds: newList });
                            }} 
                            placeholder="Contoh: Kabupaten Bogor" 
                            disabled={deed.notary === 'Nukantini Putri Parincha'}
                            className={deed.notary === 'Nukantini Putri Parincha' ? 'bg-slate-100 font-bold' : ''}
                          />
                        </div>
                      </div>
                      
                      <div className="bg-slate-50/50 p-3 border border-slate-100 rounded-sm">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Daftar SK / SP Terkait</h4>
                        </div>
                        
                        <div className="space-y-3">
                          {(deed.skSpDocuments || []).map((doc, docIdx) => (
                            <div key={doc.id} className="grid grid-cols-1 md:grid-cols-9 gap-2 items-end border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                              <div className="md:col-span-2">
                                <AhuLabel label="Tipe" />
                                <AhuSelect 
                                  value={doc.type} 
                                  onChange={e => {
                                    const newList = [...(data.amendmentDeeds || [])];
                                    const newDocs = [...(deed.skSpDocuments || [])];
                                    newDocs[docIdx] = { ...doc, type: e.target.value as any };
                                    newList[index] = { ...deed, skSpDocuments: newDocs };
                                    updateData({ amendmentDeeds: newList });
                                  }}
                                >
                                  <option value="SK">SK (Keputusan)</option>
                                  <option value="SP_DATA_PERSEROAN">SP (Perubahan Data Perseroan)</option>
                                  <option value="SP_ANGGARAN_DASAR">SP (Perubahan Anggaran Dasar)</option>
                                  <option value="SP">SP (Lainnya)</option>
                                </AhuSelect>
                              </div>
                              <div className="md:col-span-4">
                                <AhuLabel label="Nomor" />
                                <AhuInput 
                                  value={doc.number || ''} 
                                  onChange={e => {
                                    const newList = [...(data.amendmentDeeds || [])];
                                    const newDocs = [...(deed.skSpDocuments || [])];
                                    newDocs[docIdx] = { ...doc, number: e.target.value };
                                    newList[index] = { ...deed, skSpDocuments: newDocs };
                                    updateData({ amendmentDeeds: newList });
                                  }}
                                  placeholder="Nomor SK/SP"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <AhuLabel label="Tanggal" />
                                <AhuInput 
                                  type="date"
                                  value={doc.date || ''} 
                                  onChange={e => {
                                    const newList = [...(data.amendmentDeeds || [])];
                                    const newDocs = [...(deed.skSpDocuments || [])];
                                    newDocs[docIdx] = { ...doc, date: e.target.value };
                                    newList[index] = { ...deed, skSpDocuments: newDocs };
                                    updateData({ amendmentDeeds: newList });
                                  }}
                                />
                              </div>
                              <div className="md:col-span-1 flex justify-center pb-1">
                                <button 
                                  onClick={() => {
                                    const newList = [...(data.amendmentDeeds || [])];
                                    const newDocs = (deed.skSpDocuments || []).filter(d => d.id !== doc.id);
                                    newList[index] = { ...deed, skSpDocuments: newDocs };
                                    updateData({ amendmentDeeds: newList });
                                  }}
                                  className="text-red-400 hover:text-red-600 p-1 transition-colors"
                                  title="Hapus SK/SP"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                          
                          {(deed.skSpDocuments || []).length === 0 && (
                            <div className="text-[11px] text-slate-400 italic mb-2">Belum ada SK/SP yang ditambahkan.</div>
                          )}

                          <button 
                            onClick={() => {
                              const newList = [...(data.amendmentDeeds || [])];
                              const newDoc = { id: crypto.randomUUID(), type: 'SK' as const, number: '', date: '' };
                              newList[index] = { ...deed, skSpDocuments: [...(deed.skSpDocuments || []), newDoc] };
                              updateData({ amendmentDeeds: newList });
                            }}
                            className="bg-white border border-[#3b5998]/30 text-[#3b5998] hover:bg-[#3b5998] hover:text-white px-3 py-1 rounded-sm text-[11px] font-bold flex items-center gap-1 transition-all"
                          >
                            <Plus size={12} /> TAMBAH SK / SP
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button 
                    onClick={() => {
                      const newDeed = { id: crypto.randomUUID(), number: '', date: '', notary: '', notaryDomicile: '', skNumber: '', skDate: '', skSpDocuments: [] };
                      updateData({ amendmentDeeds: [...(data.amendmentDeeds || []), newDeed] });
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-sm text-slate-400 hover:border-[#3b5998] hover:text-[#3b5998] hover:bg-slate-50 transition-all group"
                  >
                    <Plus size={16} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[13px] font-bold uppercase tracking-wider">Tambah Akta Perubahan (Opsional)</span>
                  </button>
                </div>
              </AhuSection>
              </>
            )}

            

{/* JENIS NOTULEN */}
            <AhuSection title="JENIS DOKUMEN">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <AhuLabel label="Status Dokumen" required />
                  <div className="md:col-span-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateData({ rupslbStatus: 'Draft' })}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                          (data.rupslbStatus || 'Draft') === 'Draft'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        DRAFT
                      </button>
                      <button
                        type="button"
                        onClick={() => updateData({ rupslbStatus: 'Final' })}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                          data.rupslbStatus === 'Final'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        FINAL
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <AhuLabel label="Jenis Notulen" />
                  <div className="md:col-span-3">
                    <div className="flex gap-4 items-center h-[34px]">
                      <label className="flex items-center gap-2 text-[13px] text-slate-700 cursor-pointer font-normal">
                        <input
                          type="radio"
                          name="documentType"
                          value="CIRCULAR"
                          checked={data.documentType === 'CIRCULAR'}
                          onChange={() => updateData({ documentType: 'CIRCULAR' })}
                          className="w-4 h-4 text-[#3b5998] focus:ring-[#3b5998] border-[#ccc]"
                        />
                        <span>Sirkuler (Keputusan di Luar RUPS)</span>
                      </label>
                      <label className="flex items-center gap-2 text-[13px] text-slate-700 cursor-pointer font-normal">
                        <input
                          type="radio"
                          name="documentType"
                          value="MINUTES"
                          checked={data.documentType === 'MINUTES'}
                          onChange={() => updateData({ documentType: 'MINUTES' })}
                          className="w-4 h-4 text-[#3b5998] focus:ring-[#3b5998] border-[#ccc]"
                        />
                        <span>PKR LB</span>
                      </label>
                    </div>
                  </div>
                </div>

                {data.documentType === 'MINUTES' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                      <AhuLabel label="Nomor Surat Undangan" />
                      <div className="md:col-span-3">
                        <AhuInput value={data.invitationNumber || ''} onChange={e => updateData({ invitationNumber: e.target.value })} placeholder="Nomor surat undangan..." />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                      <AhuLabel label="Tanggal Surat Undangan" />
                      <div className="md:col-span-3">
                        <AhuInput type="date" value={data.invitationDate || ''} onChange={e => updateData({ invitationDate: e.target.value })} />
                      </div>
                    </div>
                  </>
                )}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <AhuLabel label="Tanggal Rapat / Penandatanganan" />
                  <div className="md:col-span-3">
                    <AhuInput type="date" value={data.signingDate || ''} onChange={e => updateData({ signingDate: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <AhuLabel label="Waktu Akta (PKR)" />
                  <div className="md:col-span-3">
                    <div className="w-1/2">
                      <AhuInput 
                        type="time" 
                        value={data.aktaStartTime || ''} 
                        onChange={e => updateData({ aktaStartTime: e.target.value })} 
                      />
                    </div>
                  </div>
                </div>

                {data.documentType === 'MINUTES' && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                    <AhuLabel label="Waktu Rapat (Mulai)" />
                    <div className="md:col-span-3">
                      <div className="w-1/2">
                        <AhuInput 
                          type="time" 
                          value={data.meetingStartTime || ''} 
                          onChange={e => updateData({ meetingStartTime: e.target.value })} 
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start mt-4 pt-4 border-t border-slate-200">
                  <AhuLabel label="Opsi Draft Akta" />
                  <div className="md:col-span-3 space-y-3">
                      <div className="mt-2 p-4 bg-slate-50 border border-slate-200 rounded-sm space-y-3">
                        <div className="border-b border-slate-200 pb-1.5 mb-2">
                          <span className="text-[12px] font-bold text-[#3b5998] uppercase tracking-wider">
                            📝 DRAF AKTA NOTARIS
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <AhuLabel label="Nomor Akta" />
                            <div className="flex gap-2">
                              <AhuInput 
                                value={data.draftAktaRupsNumber || ''} 
                                onChange={(e) => updateData({ draftAktaRupsNumber: e.target.value })} 
                                placeholder="Contoh: 12"
                              />
                              <button
                                type="button"
                                onClick={handleFetchLatestNumbers}
                                disabled={isFetchingNumbers}
                                className="p-2 bg-[#3b5998] hover:bg-[#2d4373] text-white rounded-sm transition-all disabled:opacity-50"
                                title="Ambil Nomor Terakhir"
                              >
                                {isFetchingNumbers ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                              </button>
                            </div>
                          </div>
                          <div>
                            <AhuLabel label="Nomor Urut Akta" />
                            <AhuInput 
                              value={data.draftAktaRupsOrderNumber || ''} 
                              onChange={(e) => updateData({ draftAktaRupsOrderNumber: e.target.value })} 
                              placeholder="Contoh: 001"
                            />
                          </div>
                          <div>
                            <AhuLabel label="Tanggal Akta" />
                            <AhuInput 
                              type="date"
                              value={data.draftAktaRupsDate || ''} 
                              onChange={(e) => updateData({ draftAktaRupsDate: e.target.value })} 
                            />
                          </div>
                          <div>
                            <AhuLabel label="Jam Akta" />
                            <AhuInput 
                              type="time"
                              value={data.draftAktaRupsTime || ''} 
                              onChange={(e) => updateData({ draftAktaRupsTime: e.target.value })} 
                            />
                          </div>
                        </div>
                      </div>
                  </div>
                </div>
              </div>
            </AhuSection>

            
            {/* AGENDA PERUBAHAN */}
            <AhuSection title="AGENDA PERUBAHAN">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'companyNameChange', label: 'Perubahan Nama PT' },
                  { id: 'domicile', label: 'Perubahan Tempat Kedudukan' },
                  { id: 'address', label: 'Perubahan Alamat Lengkap' },
                  { id: 'kbli', label: 'Perubahan Maksud & Tujuan (KBLI)' },
                  { id: 'capitalBase', label: 'Peningkatan Modal Dasar' },
                  { id: 'capitalPaid', label: 'Peningkatan Modal Ditempatkan/Disetor' },
                  { id: 'capitalBaseDecrease', label: 'Penurunan Modal Dasar' },
                  { id: 'capitalPaidDecrease', label: 'Penurunan Modal Ditempatkan/Disetor' },
                  { id: 'management', label: 'Perubahan Susunan Pengurus' },
                  { id: 'reappointment', label: 'Pengangkatan Kembali Pengurus' },
                  { id: 'shareholders', label: 'Peralihan Saham / Perubahan Pemegang Saham' }
                ].map((item) => (
                  <label key={item.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-sm hover:bg-slate-50 cursor-pointer transition-colors group">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-[#3b5998] focus:ring-[#3b5998]"
                      checked={data.resolutions[item.id as keyof ResolutionFlags]}
                      onChange={() => toggleResolution(item.id as keyof ResolutionFlags)}
                    />
                    <span className="text-[13px] font-medium text-slate-700 group-hover:text-slate-900">{item.label}</span>
                  </label>
                ))}
              </div>
            </AhuSection>

            {(data.documentType === 'MINUTES' || data.documentType === 'CIRCULAR') && (
              <AhuSection title="DATA KEHADIRAN & PIMPINAN RAPAT">
                <MeetingFormShell 
                  meetingType="luar_biasa" 
                  isCircular={data.documentType === 'CIRCULAR'} 
                  onAddParticipant={() => openShareholderEditor('lama')}
                  openShareholderEditor={openShareholderEditor}
                  deleteShareholder={deleteShareholder}
                />
              </AhuSection>
            )}

            {data.documentType === 'MINUTES' && (
              <AhuSection title="DETAIL RAPAT">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                    <AhuLabel label="Ketentuan Anggaran Dasar Pimpinan rapat" />
                    <div className="md:col-span-3 flex gap-4">
                      <div className="flex-1">
                        <AhuLabel label="Nomor Pasal" />
                        <AhuInput value={data.rupstAdArticle || ''} onChange={e => updateData({ rupstAdArticle: e.target.value })} placeholder="Contoh: 21" />
                      </div>
                      <div className="flex-1">
                        <AhuLabel label="Nomor Ayat" />
                        <AhuInput value={data.rupstAdParagraph || ''} onChange={e => updateData({ rupstAdParagraph: e.target.value })} placeholder="Contoh: 1" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                    <AhuLabel label="Ketentuan Kuorum AD" />
                    <div className="md:col-span-3 flex gap-4">
                      <div className="flex-1">
                        <AhuLabel label="Pasal Kuorum" />
                        <AhuInput value={data.rupstQuorumArticle || ''} onChange={e => updateData({ rupstQuorumArticle: e.target.value })} placeholder="Contoh: 22" />
                      </div>
                      <div className="flex-1">
                        <AhuLabel label="Ayat Kuorum" />
                        <AhuInput value={data.rupstQuorumParagraph || ''} onChange={e => updateData({ rupstQuorumParagraph: e.target.value })} placeholder="Contoh: 1" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <AhuLabel label="Agenda Rapat" />
                    <div className="md:col-span-3">
                      <textarea
                        value={data.meetingAgenda || ''}
                        onChange={e => updateData({ meetingAgenda: e.target.value })}
                        className="w-full border border-[#ccc] rounded-sm px-3 py-2 text-[13px] outline-none focus:border-[#66afe9] shadow-[inset_0_1px_1px_rgba(0,0,0,0.075)]"
                        rows={3}
                        placeholder="Contoh: 1. Persetujuan perubahan anggaran dasar..."
                      />
                    </div>
                  </div>
                </div>
              </AhuSection>
            )}

            
            {/* DOMISILI PERSEROAN */}
            {(data.resolutions.domicile || data.resolutions.address) && (
              <AhuSection title="DOMISILI PERSEROAN">
                <div className="space-y-6">
                  {/* LAMA SECTION */}
                  <div className="bg-slate-50 p-4 rounded-sm border border-dashed border-slate-300">
                    <h4 className="text-[12px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                       <History className="w-3 h-3" /> Kedudukan & Alamat Lama
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <AhuLabel label="Kedudukan Lama" />
                        <AhuInput value={mergedData.domicile || ''} readOnly className="bg-slate-100 font-bold" />
                      </div>
                      <div className="md:col-span-1">
                        <AhuLabel label="Alamat Lama" />
                        <AhuInput 
                          placeholder="Contoh: Jl. Sudirman No. 123"
                          value={data.oldAddress?.fullAddress || ''} 
                          onChange={e => updateAddress('oldAddress', { fullAddress: e.target.value })} 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><AhuLabel label="RT" /><AhuInput value={data.oldAddress?.rt || ''} onChange={e => updateAddress('oldAddress', { rt: e.target.value })} /></div>
                        <div><AhuLabel label="RW" /><AhuInput value={data.oldAddress?.rw || ''} onChange={e => updateAddress('oldAddress', { rw: e.target.value })} /></div>
                      </div>
                      <div>
                        <AhuLabel label="Kecamatan" />
                        <AhuInput value={data.oldAddress?.kecamatan || ''} onChange={e => updateAddress('oldAddress', { kecamatan: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <AhuLabel label="Kelurahan" />
                        <AhuInput value={data.oldAddress?.kelurahan || ''} onChange={e => updateAddress('oldAddress', { kelurahan: e.target.value })} />
                      </div>
                      <div>
                        <AhuLabel label="Kode Pos" />
                        <AhuInput value={data.oldAddress?.postalCode || ''} onChange={e => updateAddress('oldAddress', { postalCode: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {/* BARU SECTION */}
                  <div className="space-y-4 pt-2">
                    <h4 className="text-[12px] font-bold text-blue-600 uppercase mb-1 flex items-center gap-2">
                       <MapPin className="w-3 h-3" /> Kedudukan & Alamat Baru
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                      <div>
                        <AhuLabel label="Kedudukan Baru" />
                        <DomicileSelector 
                          label="Pilih Kedudukan Baru"
                          value={data.newAddress?.city || ''}
                          onChange={(val) => updateAddress('newAddress', { city: val })}
                        />
                      </div>
                      <div>
                        <AhuLabel label="Alamat Baru" />
                        <AhuInput value={data.newAddress.fullAddress || ''} onChange={e => updateAddress('newAddress', { fullAddress: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><AhuLabel label="RT" /><AhuInput value={data.newAddress.rt || ''} onChange={e => updateAddress('newAddress', { rt: e.target.value })} /></div>
                        <div><AhuLabel label="RW" /><AhuInput value={data.newAddress.rw || ''} onChange={e => updateAddress('newAddress', { rw: e.target.value })} /></div>
                      </div>
                      <div>
                        <AhuLabel label="Kecamatan" />
                        <AhuInput value={data.newAddress.kecamatan || ''} onChange={e => updateAddress('newAddress', { kecamatan: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                      <div>
                        <AhuLabel label="Kelurahan" />
                        <AhuInput value={data.newAddress.kelurahan || ''} onChange={e => updateAddress('newAddress', { kelurahan: e.target.value })} />
                      </div>
                      <div>
                        <AhuLabel label="Kode Pos" />
                        <AhuInput value={data.newAddress.postalCode || ''} onChange={e => updateAddress('newAddress', { postalCode: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>
              </AhuSection>
            )}

            {/* MAKSUD DAN TUJUAN */}
            {data.resolutions.kbli && (
              <AhuSection title="Maksud dan Tujuan">
                <div className="space-y-4">
                  {/* Tambah KBLI Button */}
                  <div className="mb-2">
                    <button
                      type="button"
                      onClick={() => setIsAddKbliModalOpen(true)}
                      className="px-4 py-2 bg-[#0c2444] hover:bg-[#16365f] text-white text-[13px] font-bold rounded-sm transition-all focus:outline-none flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Data
                    </button>
                  </div>

                  {/* Selected KBLIs List Table */}
                  <div className="w-full bg-white border border-slate-200 rounded-sm overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="min-w-[600px] w-full text-left border-collapse text-[13px]">
                        <thead>
                          <tr className="bg-[#fcfcfc] border-b border-slate-200">
                            <th className="px-4 py-2.5 font-bold text-slate-700 text-center w-12 border-r border-slate-200">No</th>
                            <th className="px-4 py-2.5 font-bold text-slate-700 text-center w-24 border-r border-slate-200">Kode KBLI</th>
                            <th className="px-4 py-2.5 font-bold text-slate-700 text-left w-64 border-r border-slate-200">Judul KBLI</th>
                            <th className="px-4 py-2.5 font-bold text-slate-700 text-left border-r border-slate-200">Uraian KBLI</th>
                            <th className="px-4 py-2.5 font-bold text-slate-700 text-center w-20">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {data.kbliItems.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-slate-50/40">
                              <td className="px-4 py-3 text-center border-r border-slate-200 text-slate-600 align-top">{idx + 1}</td>
                              <td className="px-4 py-3 text-center border-r border-slate-200 font-mono text-slate-800 font-semibold align-top">{item.code}</td>
                              <td className="px-4 py-3 border-r border-slate-200 font-bold text-slate-800 align-top">{item.name}</td>
                              <td className="px-4 py-3 border-r border-slate-200 text-slate-600 leading-relaxed align-top">
                                <textarea
                                  value={item.description || ''}
                                  onChange={(e) => {
                                    updateData({
                                      kbliItems: data.kbliItems.map(k =>
                                        k.id === item.id ? { ...k, description: e.target.value } : k
                                      )
                                    });
                                  }}
                                  className="w-full text-xs p-2 border border-slate-200 rounded focus:border-[#3b5998] outline-none resize-y min-h-[90px]"
                                  placeholder="Edit uraian kegiatan jika diperlukan..."
                                />
                              </td>
                              <td className="px-4 py-3 text-center align-top whitespace-nowrap">
                                <button 
                                  onClick={() => updateData({ kbliItems: data.kbliItems.filter(k => k.id !== item.id) })}
                                  className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-all"
                                  title="Hapus KBLI"
                                >
                                  <Trash2 className="w-4 h-4 mx-auto" />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {data.kbliItems.length === 0 && (
                            <tr>
                              <td colSpan={5} className="text-center py-10 text-slate-400 italic">
                                Belum ada data KBLI terpilih. Silakan klik tombol "Tambah Data" di atas.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </AhuSection>
            )}

            {/* PERUBAHAN PENGURUS */}
            {data.resolutions.management && (() => {
              const oldManagersList = [
                ...data.shareholders.filter(s => s.isManagement).map(s => ({ name: s.name, position: s.managementPosition || 'DIREKTUR', salutation: s.salutation || 'Tuan' })),
                ...(data.oldManagementItems || []).map(m => ({ name: m.name, position: m.position, salutation: m.salutation || 'Tuan' }))
              ];

              const presentAttendeesList: { name: string; nik?: string; salutation?: 'Tuan' | 'Nyonya' | 'Nona' }[] = [];
              const presentNamesSeen = new Set<string>();

              data.shareholders.forEach(s => {
                if (s.name && !presentNamesSeen.has(s.name.toUpperCase().trim())) {
                  presentNamesSeen.add(s.name.toUpperCase().trim());
                  presentAttendeesList.push({ name: s.name, nik: s.nik || '', salutation: s.salutation || 'Tuan' });
                }
                if (s.isProxy && s.proxyData?.name && !presentNamesSeen.has(s.proxyData.name.toUpperCase().trim())) {
                  presentNamesSeen.add(s.proxyData.name.toUpperCase().trim());
                  presentAttendeesList.push({ name: s.proxyData.name, nik: s.proxyData.nik || '', salutation: s.proxyData.salutation || 'Tuan' });
                }
              });

              (data.guests || []).forEach(g => {
                if (g.name && !presentNamesSeen.has(g.name.toUpperCase().trim())) {
                  presentNamesSeen.add(g.name.toUpperCase().trim());
                  presentAttendeesList.push({ name: g.name, nik: g.nik || '', salutation: g.salutation || 'Tuan' });
                }
              });

              return (
                <AhuSection title="DATA PERUBAHAN PENGURUS (DIREKSI & KOMISARIS)">
                  <div className="space-y-8">
                    {/* 1. LIST PEMBERHENTIAN */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                        <div>
                          <h4 className="text-[13px] font-bold text-red-700 uppercase flex items-center gap-1.5">
                            <Trash2 className="w-4 h-4" /> 1. DAFTAR PENGURUS YANG DIBERHENTIKAN
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Pilih nama pengurus lama yang diberhentikan atau mengundurkan diri.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const id = Math.random().toString(36).substring(2);
                            const item = {
                              id,
                              salutation: 'Tuan' as const,
                              name: '',
                              position: 'DIREKTUR',
                              reason: 'DIBERHENTIKAN_DENGAN_HORMAT' as const,
                              resignationDate: '',
                            };
                            updateData({
                              managementDismissals: [...(data.managementDismissals || []), item]
                            });
                          }}
                          className="text-[11px] bg-red-600 text-white px-3 py-1.5 rounded hover:bg-black transition-colors font-bold shadow-sm uppercase flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> Tambah Pemberhentian
                        </button>
                      </div>

                      {(data.managementDismissals || []).length === 0 ? (
                        <div className="text-center py-6 border border-dashed border-slate-200 rounded text-slate-400 text-[11px] bg-slate-50/50">
                          Klik tombol di atas untuk menambah daftar pengurus yang diberhentikan.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {(data.managementDismissals || []).map((item, idx) => (
                            <div key={item.id} className="p-3 border border-slate-200 rounded bg-white relative grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                              <div className="md:col-span-1 text-[10px] font-bold text-slate-400">#{idx + 1}</div>
                              <div className="md:col-span-4">
                                <AhuLabel label="Pilih dari Komposisi Lama / Pihak" />
                                <select
                                  className="w-full text-[12px] border border-slate-300 rounded p-1.5 bg-white font-medium focus:border-red-500 focus:outline-none"
                                  value={item.name}
                                  onChange={e => {
                                    const val = e.target.value;
                                    const selectedOld = oldManagersList.find(om => om.name === val);
                                    const selectedParty = presentAttendeesList.find(p => p.name === val);
                                    updateData({
                                      managementDismissals: (data.managementDismissals || []).map(t =>
                                        t.id === item.id ? { 
                                          ...t, 
                                          name: val, 
                                          salutation: selectedOld ? (selectedOld.salutation as any) : selectedParty ? (selectedParty.salutation as any) : 'Tuan',
                                          position: selectedOld ? selectedOld.position : 'DIREKTUR' 
                                        } : t
                                      )
                                    });
                                  }}
                                >
                                  <option value="">-- Pilih Nama --</option>
                                  <optgroup label="Pengurus Sekarang">
                                    {oldManagersList.map((om, omIdx) => (
                                      <option key={`old-${omIdx}`} value={om.name}>{om.salutation} {om.name} ({om.position})</option>
                                    ))}
                                  </optgroup>
                                  <optgroup label="Para Pihak Lainnya">
                                    {presentAttendeesList.map((p, pIdx) => (
                                      <option key={`p-${pIdx}`} value={p.name}>{p.salutation} {p.name}</option>
                                    ))}
                                  </optgroup>
                                </select>
                              </div>
                              <div className="md:col-span-3">
                                <AhuLabel label="Jabatan Saat Ini" />
                                <input 
                                  type="text"
                                  className="w-full text-[12px] border border-slate-300 rounded p-1.5 bg-slate-50 font-medium uppercase"
                                  value={item.position}
                                  onChange={e => {
                                    updateData({
                                      managementDismissals: (data.managementDismissals || []).map(t =>
                                        t.id === item.id ? { ...t, position: e.target.value } : t
                                      )
                                    });
                                  }}
                                />
                              </div>
                              <div className="md:col-span-3">
                                <AhuLabel label="Alasan" />
                                <select
                                  className="w-full text-[12px] border border-slate-300 rounded p-1.5 bg-white font-medium"
                                  value={item.reason}
                                  onChange={e => {
                                    updateData({
                                      managementDismissals: (data.managementDismissals || []).map(t =>
                                        t.id === item.id ? { ...t, reason: e.target.value as any } : t
                                      )
                                    });
                                  }}
                                >
                                  <option value="DIBERHENTIKAN_DENGAN_HORMAT">Diberhentikan Hormat</option>
                                  <option value="MENGUNDURKAN_DIRI">Mengundurkan Diri</option>
                                </select>
                              </div>
                              <div className="md:col-span-1 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateData({
                                      managementDismissals: (data.managementDismissals || []).filter(t => t.id !== item.id)
                                    });
                                  }}
                                  className="text-red-400 hover:text-red-600 p-1.5"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 2. LIST PENGANGKATAN */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                        <div>
                          <h4 className="text-[13px] font-bold text-emerald-700 uppercase flex items-center gap-1.5">
                            <UserPlus className="w-4 h-4" /> 2. DAFTAR PENGURUS YANG DIANGKAT
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Pilih nama pengurus baru yang diangkat (biasanya dari para pihak yang hadir).
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const id = Math.random().toString(36).substring(2);
                            const item = {
                              id,
                              salutation: 'Tuan' as const,
                              name: '',
                              position: 'DIREKTUR',
                            };
                            updateData({
                              managementAppointments: [...(data.managementAppointments || []), item]
                            });
                          }}
                          className="text-[11px] bg-emerald-600 text-white px-3 py-1.5 rounded hover:bg-black transition-colors font-bold shadow-sm uppercase flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> Tambah Pengangkatan
                        </button>
                      </div>

                      {(data.managementAppointments || []).length === 0 ? (
                        <div className="text-center py-6 border border-dashed border-slate-200 rounded text-slate-400 text-[11px] bg-slate-50/50">
                          Klik tombol di atas untuk menambah daftar pengurus yang diangkat.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {(data.managementAppointments || []).map((item, idx) => (
                            <div key={item.id} className="p-3 border border-slate-200 rounded bg-white relative grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                              <div className="md:col-span-1 text-[10px] font-bold text-slate-400">#{idx + 1}</div>
                              <div className="md:col-span-5">
                                <AhuLabel label="Pilih dari Para Pihak" />
                                <select
                                  className="w-full text-[12px] border border-slate-300 rounded p-1.5 bg-white font-medium focus:border-emerald-500 focus:outline-none"
                                  value={item.name}
                                  onChange={e => {
                                    const val = e.target.value;
                                    const found = presentAttendeesList.find(p => p.name === val);
                                    updateData({
                                      managementAppointments: (data.managementAppointments || []).map(t =>
                                        t.id === item.id ? { 
                                          ...t, 
                                          name: val, 
                                          salutation: found ? (found.salutation as any) : 'Tuan',
                                          nik: found ? found.nik : ''
                                        } : t
                                      )
                                    });
                                  }}
                                >
                                  <option value="">-- Pilih Nama --</option>
                                  {presentAttendeesList.map((p, pIdx) => (
                                    <option key={`app-${pIdx}`} value={p.name}>{p.salutation} {p.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="md:col-span-5">
                                <AhuLabel label="Jabatan Baru" />
                                <select
                                  className="w-full text-[12px] border border-slate-300 rounded p-1.5 bg-white font-medium"
                                  value={item.position}
                                  onChange={e => {
                                    updateData({
                                      managementAppointments: (data.managementAppointments || []).map(t =>
                                        t.id === item.id ? { ...t, position: e.target.value } : t
                                      )
                                    });
                                  }}
                                >
                                  <option value="DIREKTUR">DIREKTUR</option>
                                  <option value="DIREKTUR UTAMA">DIREKTUR UTAMA</option>
                                  <option value="KOMISARIS">KOMISARIS</option>
                                  <option value="KOMISARIS UTAMA">KOMISARIS UTAMA</option>
                                </select>
                              </div>
                              <div className="md:col-span-1 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateData({
                                      managementAppointments: (data.managementAppointments || []).filter(t => t.id !== item.id)
                                    });
                                  }}
                                  className="text-red-400 hover:text-red-600 p-1.5"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Masa Jabatan Option */}
                    <div className="pt-4 border-t border-slate-100">
                      <AhuMasaJabatanSelector data={data} updateData={updateData} />
                    </div>
                  </div>
                </AhuSection>
              );
            })()}

            {/* PENGANGKATAN KEMBALI */}
            {data.resolutions.reappointment && (
              <AhuSection title="Pengangkatan Kembali Pengurus">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <AhuLabel label="Tanggal Berakhir Masa Jabatan Sebelumnya" />
                      <AhuInput 
                        type="date"
                        value={data.reappointmentOldExpiredDate || ''}
                        onChange={(e) => updateData({ reappointmentOldExpiredDate: e.target.value })}
                        className="mt-1"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Kosongkan untuk default otomatis (e.g. 16 November 2025 atau sesuai tanggal RUPSLB).</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <AhuLabel label="Tanggal Mulai Masa Jabatan Baru" />
                      <AhuInput 
                        type="date"
                        value={data.reappointmentStartDate || ''}
                        onChange={(e) => updateData({ reappointmentStartDate: e.target.value })}
                        className="mt-1"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Kosongkan untuk default otomatis sesuai tanggal berakhir sebelumnya.</p>
                    </div>
                    <div>
                      <AhuLabel label="Tanggal Berakhir Masa Jabatan Baru" />
                      <AhuInput 
                        type="date"
                        value={data.reappointmentEndDate || ''}
                        onChange={(e) => updateData({ reappointmentEndDate: e.target.value })}
                        className="mt-1"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Kosongkan untuk default otomatis 5 tahun berikutnya.</p>
                    </div>
                  </div>
                  <AhuMasaJabatanSelector data={data} updateData={updateData} />
                </div>
              </AhuSection>
            )}

            {/* PERUBAHAN NAMA PT */}
            {data.resolutions.companyNameChange && (
              <AhuSection title="PERUBAHAN NAMA PT">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                    <AhuLabel label="Nama PT Baru" />
                    <div className="md:col-span-3"><AhuInput value={data.targetCompanyName || ''} onChange={e => updateData({ targetCompanyName: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                    <AhuLabel label="Singkatan PT Baru" />
                    <div className="md:col-span-3"><AhuInput value={data.targetCompanyShortName || ''} onChange={e => updateData({ targetCompanyShortName: e.target.value })} /></div>
                  </div>
                </div>
              </AhuSection>
            )}

            {/* MODAL DASAR */}
            {(data.resolutions.capitalBase || data.resolutions.capitalBaseDecrease) && (
              <AhuSection title="MODAL DASAR *">
                <div className="space-y-4">
                    <div className="border border-slate-200 overflow-x-auto rounded-sm">
                      <table className="min-w-[600px] w-full text-left text-[12px]">
                        <thead className="bg-[#f9f9f9] border-b border-slate-200 font-bold uppercase">
                          <tr>
                            <th className="p-3 border-r border-slate-200">Klasifikasi Saham</th>
                            <th className="p-3 border-r border-slate-200">Harga Per Lembar</th>
                            <th className="p-3 border-r border-slate-200">Jumlah Lembar Saham</th>
                            <th className="p-3">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-slate-200">
                            <td className="p-3 border-r border-slate-200">Tanpa Klasifikasi</td>
                            <td className="p-1 border-r border-slate-200">
                              <AhuInput 
                                value={data.originalSharePrice === 0 ? '' : formatInputNumber(data.originalSharePrice)}
                                onChange={e => {
                                  const newPrice = parseFormattedNumber(e.target.value);
                                  const shares = data.originalSharePrice > 0 ? (data.targetCapitalBase / data.originalSharePrice) : 0;
                                  const newCapitalBase = shares * newPrice;
                                  updateData({ originalSharePrice: newPrice, targetCapitalBase: newCapitalBase });
                                }}
                              />
                             </td>
                            <td className="p-1 border-r border-slate-200">
                             <AhuInput 
                               value={data.originalSharePrice > 0 ? formatInputNumber(data.targetCapitalBase / data.originalSharePrice) : ''}
                               onChange={e => {
                                 const val = parseFormattedNumber(e.target.value);
                                 const newCapitalBase = val * data.originalSharePrice;
                                 updateData({ targetCapitalBase: newCapitalBase });
                               }}
                             />
                            </td>
                            <td className="p-3">Rp. {formatInputNumber(data.targetCapitalBase)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="italic font-bold text-slate-700 text-[13px]">Total modal dasar Rp. {formatInputNumber(data.targetCapitalBase)}</div>
                </div>
              </AhuSection>
            )}

            {/* MODAL DITEMPATKAN DAN DISETOR */}
            {(data.resolutions.capitalPaid || data.resolutions.capitalPaidDecrease) && (
              <AhuSection title="MODAL DITEMPATKAN DAN DISETOR *">
                <div className="space-y-4">
                    <div className="border border-slate-200 overflow-x-auto rounded-sm">
                      <table className="min-w-[600px] w-full text-left text-[12px]">
                        <thead className="bg-[#f9f9f9] border-b border-slate-200 font-bold uppercase">
                          <tr>
                            <th className="p-3 border-r border-slate-200">Klasifikasi Saham</th>
                            <th className="p-3 border-r border-slate-200">Harga Per Lembar</th>
                            <th className="p-3 border-r border-slate-200">Jumlah Lembar Saham</th>
                            <th className="p-3">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-slate-200">
                            <td className="p-3 border-r border-slate-200">Tanpa Klasifikasi</td>
                            <td className="p-3 border-r border-slate-200">Rp. {formatInputNumber(data.originalSharePrice)}</td>
                            <td className="p-3 border-r border-slate-200">
                              <AhuInput 
                                value={data.originalSharePrice > 0 ? formatInputNumber(data.targetCapitalPaid / data.originalSharePrice) : ''} 
                                onChange={e => {
                                  const shares = parseFormattedNumber(e.target.value);
                                  updateData({ targetCapitalPaid: shares * data.originalSharePrice });
                                }} 
                              />
                            </td>
                            <td className="p-3">
                              <AhuInput 
                                value={data.targetCapitalPaid === 0 ? '' : formatInputNumber(data.targetCapitalPaid)} 
                                onChange={e => updateData({ targetCapitalPaid: parseFormattedNumber(e.target.value) })} 
                              />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="italic font-bold text-slate-700 text-[13px]">Total modal ditempatkan Rp. {formatInputNumber(data.targetCapitalPaid)}</div>
                </div>
              </AhuSection>
            )}

            {/* DETAIL PERALIHAN (TRANSFER) SAHAM DYNAMIC FORM */}
            {data.resolutions.shareholders && (() => {
              const presentAttendeesList: { name: string; nik?: string; salutation?: 'Tuan' | 'Nyonya' | 'Nona' }[] = [];
              const presentNamesSeen = new Set<string>();

              data.shareholders.forEach(s => {
                if (s.name && !presentNamesSeen.has(s.name.toUpperCase().trim())) {
                  presentNamesSeen.add(s.name.toUpperCase().trim());
                  presentAttendeesList.push({ name: s.name, nik: s.nik || '', salutation: s.salutation || 'Tuan' });
                }
                if (s.isProxy && s.proxyData?.name && !presentNamesSeen.has(s.proxyData.name.toUpperCase().trim())) {
                  presentNamesSeen.add(s.proxyData.name.toUpperCase().trim());
                  presentAttendeesList.push({ name: s.proxyData.name, nik: s.proxyData.nik || '', salutation: s.proxyData.salutation || 'Tuan' });
                }
              });

              (data.guests || []).forEach(g => {
                if (g.name && !presentNamesSeen.has(g.name.toUpperCase().trim())) {
                  presentNamesSeen.add(g.name.toUpperCase().trim());
                  presentAttendeesList.push({ name: g.name, nik: g.nik || '', salutation: g.salutation || 'Tuan' });
                }
              });

              return (
                <AhuSection title="DATA PERALIHAN SAHAM (PILIH NAMA)">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4 text-wrap gap-4">
                      <div>
                        <h4 className="text-[13px] font-bold text-[#3b5998] uppercase flex items-center gap-1.5">
                          <ArrowRightLeft className="w-4 h-4 text-[#3b5998]" /> Form Peralihan / Pemindahan Hak Atas Saham
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Pilih nama pemegang saham yang mengalihkan (From), penerima pengalihan (To), jumlah lembar saham, dan jenis pengalihan (AJB atau Hibah).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const id = Math.random().toString(36).substring(2);
                          const item = {
                            id,
                            fromName: '',
                            transferType: 'AJB' as const,
                            toName: '',
                            sharesTransferred: 0,
                            toType: 'EXISTING' as const,
                            toSalutation: 'Tuan' as const,
                            toNik: ''
                          };
                          updateData({
                            shareTransfersNew: [...(data.shareTransfersNew || []), item]
                          });
                        }}
                        className="text-[11px] bg-[#3b5998] text-white px-3 py-1.5 rounded hover:bg-slate-900 transition-colors font-bold shadow-sm uppercase shrink-0 flex items-center gap-1.5 mb-1 cursor-pointer select-none"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Form Peralihan
                      </button>
                    </div>

                    {(data.shareTransfersNew || []).length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-slate-200 rounded text-slate-500 text-[12px] bg-slate-50">
                        Belum ada data pengalihan saham secara dinamis. Silakan klik "Tambah Form Peralihan" untuk menampilkan form peralihan saham.
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {(data.shareTransfersNew || []).map((item, idx) => (
                          <div key={item.id} className="p-4 border border-slate-200 rounded bg-[#fcfcfc] shadow-xs relative space-y-4">
                            <button
                              type="button"
                              onClick={() => {
                                updateData({
                                  shareTransfersNew: (data.shareTransfersNew || []).filter(t => t.id !== item.id)
                                });
                              }}
                              className="absolute top-3 right-3 text-red-500 hover:text-red-700 p-1 cursor-pointer z-10"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="text-[12px] font-bold text-[#3b5998] border-b border-slate-200 pb-1 flex items-center gap-1.5 mb-3">
                              <span>PERALIHAN SAHAM #{idx + 1}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* FROM (Peralihan Saham Dari - Pemilik Saham Lama) */}
                              <div>
                                <AhuLabel label="Peralihan Saham Dari (Pilih Nama Pemilik Saham Lama)" required />
                                <select
                                  className="w-full text-[12px] border border-slate-300 rounded p-1.5 bg-white font-medium focus:border-indigo-500 focus:outline-none uppercase"
                                  value={item.fromName || ''}
                                  onChange={e => {
                                    const selName = e.target.value;
                                    updateData({
                                      shareTransfersNew: (data.shareTransfersNew || []).map(t =>
                                        t.id === item.id ? { ...t, fromName: selName } : t
                                      )
                                    });
                                  }}
                                >
                                  <option value="">-- PILIH PEMILIK SAHAM LAMA --</option>
                                  {(data.shareholders || []).map(sh => (
                                    <option key={sh.id} value={sh.name}>{sh.name?.toUpperCase()}</option>
                                  ))}
                                </select>
                              </div>

                              {/* GENERAL PARAMS (AJB / HIBAH & JUMLAH SAHAM) */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <AhuLabel label="Hubungan AJB / Hibah" required />
                                  <select
                                    className="w-full text-[12px] border border-slate-300 rounded p-1.5 bg-white font-medium focus:border-indigo-500 focus:outline-none"
                                    value={item.transferType}
                                    onChange={e => {
                                      updateData({
                                        shareTransfersNew: (data.shareTransfersNew || []).map(t =>
                                          t.id === item.id ? { ...t, transferType: e.target.value as 'AJB' | 'HIBAH' } : t
                                        )
                                      });
                                    }}
                                  >
                                    <option value="AJB">AJB (Akta Jual Beli)</option>
                                    <option value="HIBAH">Hibah</option>
                                  </select>
                                </div>

                                <div>
                                  <AhuLabel label="Jumlah Saham (Lembar)" required />
                                  <AhuInput
                                    type="text"
                                    placeholder="Jumlah saham..."
                                    value={item.sharesTransferred === 0 ? '' : formatInputNumber(item.sharesTransferred)}
                                    onChange={e => {
                                      const parsedVal = parseFormattedNumber(e.target.value);
                                      updateData({
                                        shareTransfersNew: (data.shareTransfersNew || []).map(t =>
                                          t.id === item.id ? { ...t, sharesTransferred: parsedVal } : t
                                        )
                                      });
                                    }}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* TO (Peralihan Saham Kepada) */}
                            <div className="p-4 bg-blue-50/50 rounded border border-blue-100/50 space-y-4 mt-2">
                              <div className="text-[12px] font-bold text-slate-700 uppercase flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2 border-b border-blue-100/50">
                                <span className="flex items-center gap-1"><ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" /> Peralihan Saham Kepada</span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <AhuLabel label="Pilih Penerima dari Para Pihak" required />
                                  <select
                                    className="w-full text-[12px] border border-slate-300 rounded p-1.5 bg-white font-medium focus:border-indigo-500 focus:outline-none uppercase"
                                    value={item.toName || ''}
                                    onChange={e => {
                                      const selName = e.target.value;
                                      const found = presentAttendeesList.find(p => p.name === selName);
                                      updateData({
                                        shareTransfersNew: (data.shareTransfersNew || []).map(t =>
                                          t.id === item.id ? {
                                            ...t,
                                            toName: selName,
                                            toSalutation: found ? found.salutation : 'Tuan',
                                            toNik: found ? found.nik : ''
                                          } : t
                                        )
                                      });
                                    }}
                                  >
                                    <option value="">-- PILIH ORANG DARI PARA PIHAK --</option>
                                    {presentAttendeesList.map((p, pIdx) => (
                                      <option key={`${p.name}-${pIdx}`} value={p.name}>{p.name?.toUpperCase()}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </AhuSection>
              );
            })()}

            {/* DETAIL PENINGKATAN MODAL (SUBSCRIPTION/SAHAM DIAMBIL OLEH) */}
            {data.resolutions.capitalPaid && (() => {
              const presentAttendeesList: { name: string; nik?: string; salutation?: 'Tuan' | 'Nyonya' | 'Nona' }[] = [];
              const presentNamesSeen = new Set<string>();

              data.shareholders.forEach(s => {
                if (s.name && !presentNamesSeen.has(s.name.toUpperCase().trim())) {
                  presentNamesSeen.add(s.name.toUpperCase().trim());
                  presentAttendeesList.push({ name: s.name, nik: s.nik || '', salutation: s.salutation || 'Tuan' });
                }
                if (s.isProxy && s.proxyData?.name && !presentNamesSeen.has(s.proxyData.name.toUpperCase().trim())) {
                  presentNamesSeen.add(s.proxyData.name.toUpperCase().trim());
                  presentAttendeesList.push({ name: s.proxyData.name, nik: s.proxyData.nik || '', salutation: s.proxyData.salutation || 'Tuan' });
                }
              });

              (data.guests || []).forEach(g => {
                if (g.name && !presentNamesSeen.has(g.name.toUpperCase().trim())) {
                  presentNamesSeen.add(g.name.toUpperCase().trim());
                  presentAttendeesList.push({ name: g.name, nik: g.nik || '', salutation: g.salutation || 'Tuan' });
                }
              });

              return (
                <AhuSection title="DATA PENINGKATAN MODAL / PENGAMBILAN SAHAM BARU">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h4 className="text-[13px] font-bold text-[#3b5998] uppercase flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-[#3b5998]" /> Form Pengambilan Saham Yang Diambil Oleh Siapa
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Pilih nama pemegang saham yang mengambil/menyerap bagian modal peningkatan saham baru serta jumlah saham yang diambil.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const id = Math.random().toString(36).substring(2);
                          const item = {
                            id,
                            subscriberName: '',
                            sharesCount: 0,
                          };
                          updateData({
                            capitalSubscriptionsNew: [...(data.capitalSubscriptionsNew || []), item]
                          });
                        }}
                        className="text-[11px] bg-[#3b5998] text-white px-3 py-1.5 rounded hover:bg-slate-900 transition-colors font-bold shadow-sm uppercase flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Pengambil Saham
                      </button>
                    </div>

                    {(data.capitalSubscriptionsNew || []).length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-slate-200 rounded text-slate-500 text-[12px] bg-slate-50">
                        Belum ada data pengambilan saham baru. Silakan klik "Tambah Pengambil Saham" untuk menampilkan form peningkatan modal.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(data.capitalSubscriptionsNew || []).map((item, idx) => (
                          <div key={item.id} className="p-4 border border-slate-200 rounded bg-[#fcfcfc] shadow-xs relative space-y-4">
                            <button
                              type="button"
                              onClick={() => {
                                updateData({
                                  capitalSubscriptionsNew: (data.capitalSubscriptionsNew || []).filter(c => c.id !== item.id)
                                });
                              }}
                              className="absolute top-3 right-3 text-red-500 hover:text-red-700 p-1"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="text-[12px] font-bold text-[#3b5998] border-b border-slate-200 pb-1 flex items-center gap-1.5">
                              <span>PENGAMBILAN SAHAM BARU #{idx + 1}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <AhuLabel label="Saham Diambil Oleh (Pilih dari Para Pihak)" required />
                                <select
                                  className="w-full text-[12px] border border-slate-300 rounded p-1.5 bg-white font-medium focus:border-indigo-500 focus:outline-none uppercase"
                                  value={item.subscriberName || ''}
                                  onChange={e => {
                                    updateData({
                                      capitalSubscriptionsNew: (data.capitalSubscriptionsNew || []).map(c =>
                                        c.id === item.id ? { ...c, subscriberName: e.target.value } : c
                                      )
                                    });
                                  }}
                                >
                                  <option value="">-- PILIH ORANG DARI PARA PIHAK --</option>
                                  {presentAttendeesList.map((p, pIdx) => (
                                    <option key={`${p.name}-${pIdx}`} value={p.name}>
                                      {p.salutation || 'Tuan'} {p.name?.toUpperCase()} {p.nik ? `(NIK: ${p.nik})` : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <AhuLabel label="Jumlah Saham Diambil (Lembar)" required />
                                <AhuInput
                                  type="text"
                                  placeholder="Masukkan jumlah saham..."
                                  value={item.sharesCount === 0 ? '' : formatInputNumber(item.sharesCount)}
                                  onChange={e => {
                                    const parsedVal = parseFormattedNumber(e.target.value);
                                    updateData({
                                      capitalSubscriptionsNew: (data.capitalSubscriptionsNew || []).map(c =>
                                        c.id === item.id ? { ...c, sharesCount: parsedVal } : c
                                      )
                                    });
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </AhuSection>
              );
            })()}



            {/* KOMPOSISI PEMEGANG SAHAM SETELAH PERUBAHAN */}
            {(() => {
              const hasCapitalChange = data.resolutions.capitalBase || data.resolutions.capitalPaid || data.resolutions.capitalBaseDecrease || data.resolutions.capitalPaidDecrease;
              const hasShareholderChange = data.resolutions.shareholders;
              
              if (!hasCapitalChange && !hasShareholderChange) return null;
              
              let title = "Data calon Pemegang saham/Direksi/Komisaris *";
              if (hasCapitalChange && !hasShareholderChange) {
                title = "PEMEGANG SAHAM SETELAH PERUBAHAN MODAL *";
              } else if (hasCapitalChange && hasShareholderChange) {
                title = "Data calon Pemegang saham/Direksi/Komisaris / SETELAH PERUBAHAN MODAL *";
              }

              const handleAutoRecalculate = () => {
                const calculated = calculateFinalShareholders(data);
                updateData({ finalShareholders: calculated });
              };

              return (
              <AhuSection title={title}>
                <div className="space-y-4">
                    <div className="flex justify-between items-center gap-2 flex-wrap bg-slate-50 p-3 rounded border border-slate-200">
                       <p className="text-[12px] text-slate-600">
                         <strong>Petunjuk:</strong> Sinkronkan susunan pemegang saham baru secara otomatis dari data Peningkatan Modal & Peralihan Saham di atas.
                       </p>
                       <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={handleAutoRecalculate} 
                            className="bg-blue-600 text-white px-3 py-1.5 rounded-sm text-[12px] font-bold shadow hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                          >
                            <RefreshCw className="w-4 h-4" /> Kalkulasi Otomatis
                          </button>
                          <button 
                            type="button"
                            onClick={() => openShareholderEditor('baru')} 
                            className="bg-[#222d32] text-white px-3 py-1.5 rounded-sm text-[12px] font-bold shadow hover:bg-black transition-colors flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" /> Tambah Data
                          </button>
                       </div>
                    </div>
                    <div className="border border-slate-200 overflow-x-auto rounded-sm">
                      <table className="min-w-[600px] w-full text-left text-[11px]">
                        <thead className="bg-[#f9f9f9] border-b border-slate-200 font-bold uppercase">
                          <tr>
                            <th className="p-2.5 border-r border-slate-200">Nama</th>
                            <th className="p-2.5 border-r border-slate-200 text-center">Jumlah Lembar Saham</th>
                            <th className="p-2.5 border-r border-slate-200 text-right">Nominal (Rupiah)</th>
                            <th className="p-2.5 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.finalShareholders || []).map((s: any) => (
                            <tr key={s.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors text-[10px]">
                              <td className="p-2.5 border-r border-slate-200 font-bold uppercase">{s.name}</td>
                              <td className="p-2.5 border-r border-slate-200 text-center font-mono">{formatInputNumber(s.sharesOwned)}</td>
                              <td className="p-2.5 border-r border-slate-200 text-right font-mono font-semibold">Rp. {formatInputNumber(s.sharesOwned * (data.originalSharePrice || 1000000))}</td>
                              <td className="p-2.5 text-center text-blue-600 flex items-center justify-center gap-2">
                                <button onClick={() => openShareholderEditor('baru', s)} className="hover:underline flex items-center gap-0.5"><Eye className="w-3 h-3" /> Edit</button>
                                <span className="text-slate-300">|</span>
                                <button onClick={() => deleteShareholder(s.id, 'baru')} className="hover:underline text-red-500 flex items-center gap-0.5"><Trash2 className="w-3 h-3" /> Hapus</button>
                              </td>
                            </tr>
                          ))}
                          {(!data.finalShareholders || data.finalShareholders.length === 0) && (
                            <tr>
                              <td colSpan={4} className="p-4 text-center text-slate-400 italic">Belum ada data pengurus/pemegang saham baru. Gunakan tombol Kalkulasi Otomatis di atas.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                </div>
              </AhuSection>
              );
            })()}


            {/* KUASA */}
            <AhuSection title="Kuasa">
               <div className="space-y-6">
                  {/* Pemberian Kuasa Notaril */}
                  <div>
                    <AhuLabel label="Pemberian Kuasa Notaril" required />
                    <div className="flex gap-4 mt-2">
                       <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                         <input 
                           type="radio" 
                           checked={data.representativeType === 'EXISTING'} 
                           onChange={() => updateData({ representativeType: 'EXISTING' })} 
                         />
                         <span>Dari Pemegang Saham</span>
                       </label>
                       <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                         <input 
                           type="radio" 
                           checked={data.representativeType === 'MANUAL'} 
                           onChange={() => updateData({ representativeType: 'MANUAL' })} 
                         />
                         <span>Input Manual</span>
                       </label>
                    </div>

                    {data.representativeType === 'EXISTING' ? (
                      <div className="mt-3">
                        <AhuLabel label="Pilih Pemegang Saham" />
                        <AhuSelect 
                          value={data.authorizedRepresentativeId || ''} 
                          onChange={e => updateData({ authorizedRepresentativeId: e.target.value })}
                        >
                          <option value="">-- Pilih --</option>
                          {[...data.shareholders, ...data.finalShareholders.filter(fs => !data.shareholders.some(s => s.id === fs.id))].map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </AhuSelect>
                      </div>
                    ) : (
                      <div className="mt-4 p-4 border border-slate-200 rounded bg-slate-50">
                        <h4 className="text-[12px] font-bold text-slate-500 uppercase mb-3">Data Kuasa (Manual)</h4>
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

               </div>
            </AhuSection>


            
            {/* Added Previews section at the bottom of the project */}
            <div className="space-y-6 pb-12">
                 <AhuSection title="DRAFT AKTA RUPS" isOpen={false}>
                   <DraftAktaRUPS companyData={mergedData} />
                 </AhuSection>

               {mergedData.resolutions.shareholders && (
                 <AhuSection title="DRAFT AKTA PERALIHAN SAHAM (JUAL BELI / HIBAH)" isOpen={false}>
                   <div className="space-y-4">
                      <p className="text-[13px] text-slate-600 mb-4 font-normal">Terdapat agenda <strong>Peralihan Saham</strong>. Anda dapat melihat dan mengunduh Akta Peralihan di bawah ini.</p>
                      <DraftAktaApp ref={draftAktaRef} companyData={mergedData} />
                   </div>
                 </AhuSection>
               )}
            </div>
                  </fieldset>
                </div>
                            ) : (
                <div className="space-y-6">
                  {/* SAVED RUPS LB CARD CONTAINER */}
                  <div className="bg-white p-6 rounded-md shadow-sm border border-slate-200">
                    
                    {/* TITLE AND SEARCH/FITLER SECTION */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 pb-5 mb-5">
                      <div className="flex items-center gap-2.5">
                        <History className="w-5 h-5 text-[#1b449c]" />
                        <h3 className="text-[15px] font-bold text-slate-800 tracking-tight uppercase">
                          DAFTAR RUPS LB TERSIMPAN
                        </h3>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        {/* Search Input */}
                        <div className="relative flex-1 sm:flex-initial sm:w-72">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Cari berdasarkan nama PT..."
                            value={notulenSearchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 border border-slate-250 rounded-md text-[13px] outline-none focus:border-[#1b449c] focus:ring-1 focus:ring-[#1b449c]/20 bg-white text-slate-800 placeholder-slate-400 transition-all font-medium"
                          />
                          {notulenSearchQuery && (
                            <button
                              onClick={() => handleSearchChange("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-extrabold text-[15px]"
                              type="button"
                            >
                              ×
                            </button>
                          )}
                        </div>

                        {/* Year Filter Dropdown */}
                        <div className="relative">
                          <select
                            value={selectedRupslbYear}
                            onChange={(e) => {
                              setSelectedRupslbYear(e.target.value);
                              setRupslbCurrentPage(1);
                            }}
                            className="appearance-none pl-3 pr-8 py-2 border border-slate-250 rounded-md text-[13px] outline-none focus:border-[#1b449c] bg-white text-slate-800 font-medium cursor-pointer"
                          >
                            <option value="all">Semua Tahun</option>
                            {uniqueRupslbYears.map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        {/* Filter Toggle Button */}
                        <button
                          type="button"
                          onClick={() => setIsRupslbFilterOpen(!isRupslbFilterOpen)}
                          className={`p-2 border rounded-md transition-all flex items-center justify-center hover:bg-slate-50 ${isRupslbFilterOpen ? 'bg-blue-50 text-[#1b449c] border-[#1b449c]' : 'bg-white text-slate-600 border-slate-250'}`}
                          title="Toggle Quick Filter"
                        >
                          <SlidersHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* QUICK FILTER EXPANSION PANEL */}
                    {isRupslbFilterOpen && (
                      <div className="bg-slate-50 p-4 rounded-md border border-slate-200 mb-5 flex flex-wrap gap-2.5 items-center animate-fadeIn">
                        <span className="text-[12px] font-bold text-slate-500 uppercase">Filter Status:</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setNotulenSearchQuery("");
                              setSelectedRupslbYear("all");
                              setRupslbSortField("updatedAt");
                              setRupslbSortOrder("desc");
                              setRupslbCurrentPage(1);
                              setIsRupslbFilterOpen(false);
                            }}
                            className="bg-white hover:bg-slate-100 text-[11px] font-semibold text-slate-600 px-2.5 py-1.5 border border-slate-200 rounded"
                          >
                            Reset Semua
                          </button>
                        </div>
                      </div>
                    )}

                    {/* TABLE AREA */}
                    {projects.length === 0 ? (
                      <div className="bg-slate-50 text-center py-10 rounded-md border border-dashed border-slate-350 text-slate-500 text-[13px] font-medium">
                        Belum ada data RUPS LB. Klik <strong>"TAMBAH RUPS LB BARU"</strong> untuk membuat.
                      </div>
                    ) : sortedRupslbResults.length === 0 ? (
                      <div className="bg-slate-50 text-center py-12 rounded-md border border-dashed border-slate-350 text-slate-500 text-[13px] font-medium">
                        Tidak ada data RUPS LB yang cocok dengan pencarian atau filter Anda.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200 rounded-md shadow-inner bg-white">
                        <table className="min-w-[600px] w-full text-left border-collapse text-[13px] font-sans">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-slate-200">
                              <th className="px-4 py-3.5 text-slate-600 font-bold text-[12px] uppercase w-[60px] text-center">NO</th>
                              <th 
                                onClick={() => handleRupslbSort("companyName")}
                                className="px-4 py-3.5 text-slate-600 font-bold text-[12px] uppercase cursor-pointer hover:bg-slate-100/85 transition-colors select-none"
                              >
                                <div className="flex items-center">
                                  <span>NAMA PT</span>
                                  {renderRupslbSortArrows("companyName")}
                                </div>
                              </th>
                              <th 
                                onClick={() => handleRupslbSort("signingDate")}
                                className="px-4 py-3.5 text-slate-600 font-bold text-[12px] uppercase cursor-pointer hover:bg-slate-100/85 transition-colors select-none w-[180px]"
                              >
                                <div className="flex items-center">
                                  <span>TANGGAL ACARA</span>
                                  {renderRupslbSortArrows("signingDate")}
                                </div>
                              </th>
                              <th 
                                onClick={() => handleRupslbSort("status")}
                                className="px-4 py-3.5 text-slate-600 font-bold text-[12px] uppercase cursor-pointer hover:bg-slate-100/85 transition-colors select-none w-[120px]"
                              >
                                <div className="flex items-center">
                                  <span>STATUS</span>
                                  {renderRupslbSortArrows("status")}
                                </div>
                              </th>
                              <th 
                                onClick={() => handleRupslbSort("updatedAt")}
                                className="px-4 py-3.5 text-slate-600 font-bold text-[12px] uppercase cursor-pointer hover:bg-slate-100/85 transition-colors select-none w-[180px]"
                              >
                                <div className="flex items-center">
                                  <span>TERAKHIR DIUBAH</span>
                                  {renderRupslbSortArrows("updatedAt")}
                                </div>
                              </th>
                              <th className="px-4 py-3.5 text-slate-600 font-bold text-[12px] uppercase w-[190px] text-center">AKSI</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150">
                            {paginatedRupslbResults.map((p, idx) => {
                              const overallIdx = rupslbStartIndex + idx + 1;
                              const statusVal = p.rupslbStatus || "Draft";
                              return (
                                <tr 
                                  key={p.id} 
                                  className="hover:bg-slate-50 transition-colors duration-150 odd:bg-white even:bg-slate-50/40 cursor-pointer"
                                  onClick={() => {
                                    setEditingProjectId(p.id!);
                                    setIsRupsPreview(true);
                                    updateData({ ...INITIAL_STATE, ...p } as any);
                                  }}
                                >
                                  <td className="px-4 py-3.5 text-center font-semibold text-slate-500 text-[12px]">{overallIdx}</td>
                                  <td className="px-4 py-3.5">
                                    <div className="font-bold text-slate-800 tracking-tight">{p.companyName}</div>
                                    <div className="text-[11px] text-slate-400 mt-0.5 font-medium flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-slate-350 shrink-0" />
                                      {p.newAddress?.city || 'Area belum diisi'}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5 text-slate-600 font-semibold text-[12.5px]">
                                    {p.signingDate || "-"}
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <DocumentStatusBadge status={p.documentStatus || p.rupslbStatus || "DRAFTING"} />
                                  </td>
                                  <td className="px-4 py-3.5 text-slate-500 font-medium">
                                    {formatRupslbLastUpdated(p.updatedAt, p.signingDate)}
                                  </td>
                                  <td className="px-4 py-3.5 relative" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex justify-center items-center">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRupslbDropdownId(rupslbDropdownId === p.id ? null : p.id!);
                                        }}
                                        className={`px-3 py-1.5 rounded-md border text-[11px] font-bold uppercase transition-all shadow-sm flex items-center gap-1.5 ${
                                          rupslbDropdownId === p.id ? 'bg-[#0c2444] text-white border-[#0c2444]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                                        }`}
                                      >
                                        <Download className="w-[14px] h-[14px] stroke-[2.25px]" /> Download <ChevronDown className={`w-3.5 h-3.5 transition-transform ${rupslbDropdownId === p.id ? 'rotate-180' : ''}`} />
                                      </button>
                                    </div>

                                    {rupslbDropdownId === p.id && (
                                      <div className="absolute right-4 top-13 bg-white border border-slate-200 shadow-xl rounded-xl py-1.5 w-[220px] z-50 text-left overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
                                        {/* Notulen RUPS LB */}
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            setRupslbDropdownId(null);
                                            try {
                                              const { generateWordDoc } = await import('../../../../utils/docxGenerator');
                                              await generateWordDoc({ ...INITIAL_STATE, ...p } as any);
                                            } catch (err) {
                                              console.error('Failed to generate Notulen DOCX:', err);
                                              alert('Gagal mengunduh Notulen.');
                                            }
                                          }}
                                          className="w-full px-4 py-2 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-2.5 uppercase tracking-wide border-b border-slate-100"
                                        >
                                          <FileText className="w-[15px] h-[15px] text-indigo-500 shrink-0" />
                                          <div className="flex flex-col text-left">
                                            <span className="leading-tight">
                                              {p.documentType === 'CIRCULAR' ? 'SIRKULER RUPS LB' : 'Notulen RUPS LB'}
                                            </span>
                                            <span className="text-[9px] text-slate-400 lowercase font-medium mt-0.5">.docx</span>
                                          </div>
                                        </button>

                                        {/* Draft Akta RUPS LB */}
                                        {p.createDraftAktaRups && (
                                          <button
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              setRupslbDropdownId(null);
                                              try {
                                                const { generateRUPSDocx } = await import('../../../lib/generateRUPSDocx');
                                                await generateRUPSDocx({ ...INITIAL_STATE, ...p } as any);
                                              } catch (err) {
                                                console.error('Failed to generate Draft Akta:', err);
                                                alert('Gagal mengunduh Draft Akta PKR LB.');
                                              }
                                            }}
                                            className="w-full px-4 py-2 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-2.5 uppercase tracking-wide border-b border-slate-100"
                                          >
                                            <FileCode className="w-[15px] h-[15px] text-blue-500 shrink-0" />
                                            <div className="flex flex-col text-left">
                                              <span className="leading-tight">
                                                {p.documentType === 'CIRCULAR' ? 'AKTA SIRKULER RUPS LB' : 'AKTA RUPS LB'}
                                              </span>
                                              <span className="text-[9px] text-slate-400 lowercase font-medium mt-0.5">.docx</span>
                                            </div>
                                          </button>
                                        )}

                                        {/* Akta Peralihan Saham */}
                                        {p.resolutions?.shareholders && p.shareTransfers && p.shareTransfers.length > 0 && (
                                          (p.shareTransfers || []).map((transfer, index) => {
                                            const fromName = p.shareholders?.find(s => s.id === transfer.fromShareholderId)?.name || 'Unknown';
                                            const toName = p.shareholders?.find(s => s.id === transfer.toShareholderId)?.name || p.finalShareholders?.find(s => s.id === transfer.toShareholderId)?.name || 'Unknown';
                                            return (
                                              <button
                                                key={transfer.id}
                                                onClick={async (e) => {
                                                  e.stopPropagation();
                                                  setRupslbDropdownId(null);
                                                  try {
                                                    const { getTransferData } = await import('../../../DraftAktaApp');
                                                    const { generateDocx } = await import('../../../lib/generateDocxJualBeli');
                                                    const initData = (await import('../../../constants')).initialData;
                                                    const docData = getTransferData(transfer, { ...INITIAL_STATE, ...p } as any, initData);
                                                    await generateDocx(docData);
                                                  } catch (err) {
                                                    console.error('Failed to generate Draft Akta Peralihan Saham:', err);
                                                    alert('Gagal mengunduh Akta Peralihan Saham.');
                                                  }
                                                }}
                                                className="w-full px-4 py-2 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-2.5 uppercase tracking-wide border-b border-slate-100 last:border-0"
                                              >
                                                <FileCode className="w-[15px] h-[15px] text-emerald-500 shrink-0" />
                                                <div className="flex flex-col text-left">
                                                  <span className="leading-tight text-emerald-700">Akta Peralihan Saham {index + 1}</span>
                                                  <span className="text-[9px] text-slate-400 font-medium lowercase mt-0.5 leading-tight">dari {fromName} ke {toName} (.docx)</span>
                                                </div>
                                              </button>
                                            );
                                          })
                                        )}
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
                    {totalRupslbItems > 0 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-150 text-slate-500 text-[12.5px] font-medium">
                        <div>
                          Menampilkan <span className="font-semibold text-slate-700">{rupslbStartIndex + 1}</span> sampai <span className="font-semibold text-slate-700">{Math.min(rupslbStartIndex + rupslbItemsPerPage, totalRupslbItems)}</span> dari <span className="font-semibold text-slate-700">{totalRupslbItems}</span> data
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {/* Previous Button */}
                          <button
                            type="button"
                            disabled={safeRupslbCurrentPage === 1}
                            onClick={() => setRupslbCurrentPage(Math.max(1, safeRupslbCurrentPage - 1))}
                            className="px-2.5 py-1.5 border border-slate-200 rounded text-[12px] font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed uppercase"
                          >
                            Sebelumnya
                          </button>
                          
                          {/* Page Numbers */}
                          {getRupslbPageRange().map((p, idx) => {
                            const isEllipsis = p === "...";
                            const isActive = p === safeRupslbCurrentPage;
                            return (
                              <button
                                key={idx}
                                type="button"
                                disabled={isEllipsis}
                                onClick={() => setRupslbCurrentPage(Number(p))}
                                className={`px-3 py-1.5 border rounded text-[12px] font-semibold transition-colors ${
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

                          {/* Next Button */}
                          <button
                            type="button"
                            disabled={safeRupslbCurrentPage === totalRupslbPages}
                            onClick={() => setRupslbCurrentPage(Math.min(totalRupslbPages, safeRupslbCurrentPage + 1))}
                            className="px-2.5 py-1.5 border border-slate-200 rounded text-[12px] font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed uppercase"
                          >
                            Selanjutnya
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            );
  })();
};

export default RUPSLBPage;
