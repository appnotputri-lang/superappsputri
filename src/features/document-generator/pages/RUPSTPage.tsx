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
  handleManualSync: (type: string, data: any) => Promise<boolean>;
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
  // Extract and inject the inline block
  
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

  return (() => {
            const currentEditingRupstId = editingRupstId;
            const setCurrentEditingRupstId = setEditingRupstId;
            const currentRupstProjects = rupstProjects;
            const currentCollectionName = 'rupst_projects';

            // Calculate status-based counts before status filtering
            const baseResultsForCount = currentRupstProjects.filter(p => {
              // Apply search query filter for counts
              if (rupstSearchQuery) {
                const q = rupstSearchQuery.toLowerCase();
                const matchSearch = (p.companyName && p.companyName.toLowerCase().includes(q)) ||
                  (p.rupstFiscalYear && p.rupstFiscalYear.toString().toLowerCase().includes(q));
                if (!matchSearch) return false;
              }
              // Apply year filter for counts
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

            // 1. Initial filter by search query (PT Name or Year)
            let filteredResults = currentRupstProjects.filter(p => {
              if (!rupstSearchQuery) return true;
              const q = rupstSearchQuery.toLowerCase();
              return (
                (p.companyName && p.companyName.toLowerCase().includes(q)) ||
                (p.rupstFiscalYear && p.rupstFiscalYear.toString().toLowerCase().includes(q))
              );
            });

            // 2. Filter by Year Dropdown Selection
            if (selectedRupstYear !== "all") {
              filteredResults = filteredResults.filter(p => (p.rupstFiscalYear || '').toString() === selectedRupstYear);
            }

            // 2b. Filter by Active Status Tab
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

            // 3. Extract unique years for the dropdown
            const uniqueYears = Array.from(new Set(
              currentRupstProjects
                .map(p => (p.rupstFiscalYear || '').toString())
                .filter(Boolean)
            )).sort((a, b) => Number(b) - Number(a));

            // 4. Sort results
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

            // 5. Pagination calculation
            const itemsPerPage = 10;
            const totalItems = sortedResults.length;
            const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
            
            // Adjust current page if it's out of range
            const safeCurrentPage = Math.min(rupstCurrentPage, totalPages);
            const startIndex = (safeCurrentPage - 1) * itemsPerPage;
            const paginatedResults = sortedResults.slice(startIndex, startIndex + itemsPerPage);

            // Helpers
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

            return (
              <div className="max-w-7xl mx-auto space-y-6 px-2 sm:px-4 py-4">
                <div className="flex justify-between items-center bg-white p-5 rounded-md shadow-sm border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-2.5 rounded-full border border-blue-100 flex items-center justify-center shrink-0">
                      <History className="w-6 h-6 text-[#1b449c]" />
                    </div>
                    <div>
                      <h2 className="text-[18px] font-extrabold flex items-center gap-2 text-slate-800 tracking-tight leading-snug">
                        RUPS TAHUNAN (RUPST)
                      </h2>
                      <p className="text-[13px] text-slate-500 font-medium">
                        Kelola daftar notulen RUPS Tahunan
                      </p>
                    </div>
                  </div>
                  {!currentEditingRupstId && (
                    <button onClick={() => {
                      setCurrentEditingRupstId('new');
                      setIsRupstPreview(false);
                      const defaultType = activeProjectJobType === 'sirkuler' ? 'sirkuler' : 'rapat';
                      updateData({ 
                        ...INITIAL_STATE, 
                        rupstType: defaultType,
                      } as any);
                    }} className="bg-[#1b449c] hover:bg-[#13327d] text-white px-5 py-2.5 rounded-md font-bold text-[12px] flex items-center gap-2 transition-all shadow-sm shrink-0 hover:scale-[1.01] active:scale-[0.99]">
                      <Plus className="w-4 h-4" /> TAMBAH RUPST BARU
                    </button>
                  )}
                </div>

              {currentEditingRupstId ? (
                <div className="space-y-4 pb-20">
                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-slate-50/50 p-2.5 rounded-xl border border-slate-200 gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button 
                        className="text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5 font-bold text-[12.5px] uppercase h-11 px-4 rounded-xl shadow-sm transition-all duration-150 shrink-0" 
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
                      >
                        <ArrowRight className="w-5 h-5 rotate-180" /> Kembali
                      </button>

                      <button 
                        className="bg-[#3b5998] hover:bg-[#2d4373] text-white flex items-center justify-center gap-1.5 font-bold text-[12.5px] uppercase h-11 px-4 rounded-xl shadow-sm transition-all duration-150 shrink-0 disabled:opacity-50" 
                        onClick={async () => {
                          const success = await handleManualSync('RUPST', data);
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
   
                      {isRupstPreview ? (
                        <>
                          <button 
                            onClick={(e) => { 
                              e.preventDefault(); 
                              setIsRupstDocDropdownOpen(false);
                              setIsRupstPreview(false); 
                            }}
                            className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[12.5px] font-bold transition-all border border-slate-200 h-11 flex items-center gap-2 uppercase shrink-0"
                          >
                            <Edit className="w-[18px] h-[18px]" /> Edit
                          </button>
                          {userProfile?.role === 'Super Admin' && (
                            <button 
                              onClick={async (e) => {
                                e.preventDefault();
                                setIsRupstDocDropdownOpen(false);
                                if(confirm('Hapus RUPST ' + data.companyName + '?')) {
                                if (!user) return alert('Anda harus login!');
                                try {
                                  const deletedRupstName = data.companyName || 'PT Baru';
                                  await deleteDoc(doc(db, currentCollectionName, currentEditingRupstId));
                                  recordNotification(
                                    'Draft RUPST Dihapus',
                                    `Rapat Umum Pemegang Saham Temuan (RUPST) untuk perusahaan "${deletedRupstName}" telah berhasil dihapus oleh ${user?.email || 'Admin'}.`,
                                    'delete_rupst'
                                  );
                                  const returnToProjectId = activeProjectContext;
                                  alert('RUPST berhasil dihapus');
                                  setCurrentEditingRupstId(null);
                                  setActiveProjectContext(null);
                                  if (returnToProjectId) {
                                    setSelectedProjectId(returnToProjectId);
                                    setActiveSidebarTab('project_detail');
                                  }
                                } catch (err) {
                                  handleFirestoreError(err, OperationType.DELETE, `${currentCollectionName}/${currentEditingRupstId}`);
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
                              const newId = currentEditingRupstId && currentEditingRupstId !== 'new' ? currentEditingRupstId : crypto.randomUUID();
                              const isNewRupst = currentEditingRupstId === 'new' || !currentEditingRupstId;
                              const profileData = {
                                  ...data,
                                  id: newId,
                                  documentStatus: isNewRupst ? 'DRAFTING' : (data.documentStatus || 'DRAFTING'),
                                  rupstStatus: isNewRupst ? 'Draft' : (data.rupstStatus || 'Draft'),
                                  updatedAt: new Date().toISOString()
                              };
                              if (!user) {
                                setIsSaving(false);
                                return alert('Anda harus login terlebih dahulu!');
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
                           }} 
                           className="px-5 bg-[#40bdae] hover:bg-[#349c8f] text-white rounded-xl text-[12.5px] font-bold transition-all h-11 uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSaving ? 'MENYIMPAN...' : 'SIMPAN RUPST'}
                          </button>
                        </>
                      )}
                    </div>

                    {isRupstPreview && (
                      <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setIsRupstDocDropdownOpen(!isRupstDocDropdownOpen)}
                          className="w-full sm:w-auto h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-indigo-100 uppercase text-[12px] tracking-wider select-none shrink-0"
                        >
                          <Download className="w-[18px] h-[18px] stroke-[2.25px]" />
                          <span>Dokumen</span>
                          <ChevronDown className={`w-[14px] h-[14px] transition-transform duration-200 ${isRupstDocDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isRupstDocDropdownOpen && (
                          <div className="absolute right-0 mt-2 bg-white border border-slate-200 shadow-xl rounded-2xl py-1 w-64 z-50 text-left overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                            {/* Notulen RUPST */}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                setIsRupstDocDropdownOpen(false);
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
                              className="w-full px-4.5 py-3 text-slate-700 hover:bg-slate-50 text-[12px] font-bold flex items-center gap-3 uppercase tracking-wide transition-colors border-b border-slate-100"
                            >
                              <FileText className="w-[18px] h-[18px] text-indigo-600 stroke-[2.25px] shrink-0" />
                              <div className="flex flex-col text-left">
                                <span className="font-bold text-slate-800 leading-tight">
                                  {mergedData.rupstType === 'sirkuler' ? 'SIRKULER RUPST' : 'NOTULEN RUPST'}
                                </span>
                                <span className="text-[10px] text-slate-400 lowercase mt-0.5 font-medium">format dokumen (.docx)</span>
                              </div>
                            </button>

                            {/* Surat Pernyataan */}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                setIsRupstDocDropdownOpen(false);
                                try {
                                  const { generateRUPSTPernyataanDocx } = await import('../../../lib/generateRUPSTPernyataanDocx');
                                  await generateRUPSTPernyataanDocx(mergedData);
                                } catch (err) {
                                  console.error('Failed to generate Statement RUPST DOCX:', err);
                                  alert('Gagal menghasilkan Surat Pernyataan RUPST DOCX.');
                                }
                              }}
                              className="w-full px-4.5 py-3 text-slate-700 hover:bg-slate-50 text-[12px] font-bold flex items-center gap-3 uppercase tracking-wide transition-colors border-b border-slate-100"
                            >
                              <FileBadge className="w-[18px] h-[18px] text-amber-600 stroke-[2.25px] shrink-0" />
                              <div className="flex flex-col text-left">
                                <span className="font-bold text-slate-800 leading-tight">Surat Pernyataan</span>
                                <span className="text-[10px] text-slate-400 lowercase mt-0.5 font-medium">format dokumen (.docx)</span>
                              </div>
                            </button>

                            {/* Draft Akta RUPST */}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                setIsRupstDocDropdownOpen(false);
                                try {
                                  const { generateRUPSTAktaDocx } = await import('../../../lib/generateRUPSTAktaDocx');
                                  await generateRUPSTAktaDocx(mergedData);
                                } catch (err) {
                                  console.error('Failed to generate Draft Akta RUPST DOCX:', err);
                                  alert('Gagal menghasilkan Draft Akta RUPST DOCX.');
                                }
                              }}
                              className="w-full px-4.5 py-3 text-slate-700 hover:bg-slate-50 text-[12px] font-bold flex items-center gap-3 uppercase tracking-wide transition-colors border-b border-slate-100"
                            >
                              <FileSignature className="w-[18px] h-[18px] text-blue-600 stroke-[2.25px] shrink-0" />
                              <div className="flex flex-col text-left">
                                <span className="font-bold text-slate-800 leading-tight">
                                  {mergedData.rupstType === 'sirkuler' ? 'AKTA SIRKULER RUPST' : 'AKTA RUPST'}
                                </span>
                                <span className="text-[10px] text-slate-400 lowercase mt-0.5 font-medium">format dokumen (.docx)</span>
                              </div>
                            </button>

                            {/* Download Semua (.zip) */}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                setIsRupstDocDropdownOpen(false);
                                await handleDownloadAllZip();
                              }}
                              className="w-full px-4.5 py-3 text-emerald-700 hover:bg-emerald-50/40 text-[12px] font-bold flex items-center gap-3 uppercase tracking-wide transition-colors"
                            >
                              <Archive className="w-[18px] h-[18px] text-emerald-600 stroke-[2.25px] shrink-0" />
                              <div className="flex flex-col text-left">
                                <span className="font-bold text-emerald-800 leading-tight">Download Semua</span>
                                <span className="text-[10px] text-emerald-600/70 lowercase mt-0.5 font-medium">bundel zip (.zip)</span>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <fieldset disabled={isRupstPreview} className="space-y-4">

                        <AhuSection title="STATUS DOKUMEN">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                              <AhuLabel label="Status Saat Ini" />
                              <div className="md:col-span-3">
                                <select
                                  className="w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none bg-white focus:border-[#66afe9]"
                                  value={data.documentStatus || data.rupstStatus || "DRAFTING"}
                                  onChange={e => updateData({ documentStatus: e.target.value as any, rupstStatus: (e.target.value === 'SELESAI' ? 'Final' : 'Draft') })}
                                >
                                  {documentStatusOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </AhuSection>
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
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <select 
                                    className="flex-1 border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none bg-white focus:border-[#66afe9]"
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
                                  {data.selectedProfileId && (
                                    <button
                                      onClick={syncCompanyDataToRupst}
                                      className="bg-blue-50 text-[#3b5998] hover:bg-[#3b5998] hover:text-white px-4 py-1.5 rounded-sm text-[12px] font-bold uppercase transition-colors shrink-0"
                                    >
                                      Sinkronkan Data PT
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </AhuSection>

                    {/* DATA KHUSUS RUPST */}
                    {true && (
                      <>
                        <AhuSection title="BENTUK KEPUTUSAN / RUPST">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                              <AhuLabel label="Bentuk Keputusan / RUPST" required />
                              <div className="md:col-span-3">
                                <AhuSelect 
                                  value={data.rupstType || 'rapat'} 
                                  onChange={e => updateData({ rupstType: e.target.value as any })}
                                >
                                  <option value="rapat">Rapat Umum Pemegang Saham Tahunan (RUPST Biasa / Fisik / Hibrid)</option>
                                  <option value="sirkuler">Keputusan Para Pemegang Saham Sebagai Pengganti RUPST (Sirkuler / Pasal 91 UU PT)</option>
                                </AhuSelect>
                              </div>
                            </div>
                          </div>
                        </AhuSection>

                        <AhuSection title="AGENDA DAN KEUANGAN RUPST">
                      {false ? (
                        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded space-y-4">
                          <div className="border-b border-slate-200 pb-2">
                            <span className="text-[12px] font-bold text-[#3b5998] uppercase tracking-wider flex items-center gap-1.5">
                              📋 KUESIONER KEWAJIBAN AUDIT LAPORAN KEUANGAN (UU PT NO. 40/2007 PASAL 68)
                            </span>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                              Silakan isi kuesioner berikut untuk menentukan status wajib audit secara otomatis. Apabila seluruh pilihan di bawah dijawab <b>"TIDAK"</b>, maka Laporan Keuangan dikategorikan sebagai <b>Tidak Wajib Audit</b>. Apabila terdapat minimal salah satu jawaban <b>"YA"</b>, maka Laporan Keuangan menjadi <b>Wajib Audit</b>.
                            </p>
                          </div>

                          <div className="space-y-3.5 pt-1">
                            {/* Question A */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-[12px] border-b border-dashed border-slate-200 pb-3 last:border-b-0 last:pb-0">
                              <span className="font-medium text-slate-700 flex-1 leading-relaxed">
                                <b className="text-[#3b5998] mr-1">a.</b> Apakah Kegiatan Usaha Perseroan menghimpun dan/atau mengelola dana masyarakat?
                              </span>
                              <div className="flex gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleQuestionChange('rupstQuestionA', 'ya')}
                                  className={`px-3 py-1 text-[11px] font-bold uppercase rounded border transition-all ${
                                    data.rupstQuestionA === 'ya'
                                      ? 'bg-red-500 text-white border-red-500 shadow-sm'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  Ya
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuestionChange('rupstQuestionA', 'tidak')}
                                  className={`px-3 py-1 text-[11px] font-bold uppercase rounded border transition-all ${
                                    data.rupstQuestionA === 'tidak'
                                      ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  Tidak
                                </button>
                              </div>
                            </div>

                            {/* Question B */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-[12px] border-b border-dashed border-slate-200 pb-3 last:border-b-0 last:pb-0">
                              <span className="font-medium text-slate-700 flex-1 leading-relaxed">
                                <b className="text-[#3b5998] mr-1">b.</b> Apakah Perseroan menerbitkan surat pengakuan utang kepada masyarakat?
                              </span>
                              <div className="flex gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleQuestionChange('rupstQuestionB', 'ya')}
                                  className={`px-3 py-1 text-[11px] font-bold uppercase rounded border transition-all ${
                                    data.rupstQuestionB === 'ya'
                                      ? 'bg-red-500 text-white border-red-500 shadow-sm'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  Ya
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuestionChange('rupstQuestionB', 'tidak')}
                                  className={`px-3 py-1 text-[11px] font-bold uppercase rounded border transition-all ${
                                    data.rupstQuestionB === 'tidak'
                                      ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  Tidak
                                </button>
                              </div>
                            </div>

                            {/* Question C */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-[12px] border-b border-dashed border-slate-200 pb-3 last:border-b-0 last:pb-0">
                              <span className="font-medium text-slate-700 flex-1 leading-relaxed">
                                <b className="text-[#3b5998] mr-1">c.</b> Apakah Perseroan merupakan Perseroan Terbuka (Tbk)?
                              </span>
                              <div className="flex gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleQuestionChange('rupstQuestionC', 'ya')}
                                  className={`px-3 py-1 text-[11px] font-bold uppercase rounded border transition-all ${
                                    data.rupstQuestionC === 'ya'
                                      ? 'bg-red-500 text-white border-red-500 shadow-sm'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  Ya
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuestionChange('rupstQuestionC', 'tidak')}
                                  className={`px-3 py-1 text-[11px] font-bold uppercase rounded border transition-all ${
                                    data.rupstQuestionC === 'tidak'
                                      ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  Tidak
                                </button>
                              </div>
                            </div>

                            {/* Question D */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-[12px] border-b border-dashed border-slate-200 pb-3 last:border-b-0 last:pb-0">
                              <span className="font-medium text-slate-700 flex-1 leading-relaxed">
                                <b className="text-[#3b5998] mr-1">d.</b> Apakah Perseroan merupakan Persero?
                              </span>
                              <div className="flex gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleQuestionChange('rupstQuestionD', 'ya')}
                                  className={`px-3 py-1 text-[11px] font-bold uppercase rounded border transition-all ${
                                    data.rupstQuestionD === 'ya'
                                      ? 'bg-red-500 text-white border-red-500 shadow-sm'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  Ya
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuestionChange('rupstQuestionD', 'tidak')}
                                  className={`px-3 py-1 text-[11px] font-bold uppercase rounded border transition-all ${
                                    data.rupstQuestionD === 'tidak'
                                      ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  Tidak
                                </button>
                              </div>
                            </div>

                            {/* Question E */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-[12px] border-b border-dashed border-slate-200 pb-3 last:border-b-0 last:pb-0">
                              <span className="font-medium text-slate-700 flex-1 leading-relaxed">
                                <b className="text-[#3b5998] mr-1">e.</b> Apakah nilai Aset dan/atau jumlah peredaran usaha Perseroan lebih dari Rp 50 Milyar?
                              </span>
                              <div className="flex gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleQuestionChange('rupstQuestionE', 'ya')}
                                  className={`px-3 py-1 text-[11px] font-bold uppercase rounded border transition-all ${
                                    data.rupstQuestionE === 'ya'
                                      ? 'bg-red-500 text-white border-red-500 shadow-sm'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  Ya
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuestionChange('rupstQuestionE', 'tidak')}
                                  className={`px-3 py-1 text-[11px] font-bold uppercase rounded border transition-all ${
                                    data.rupstQuestionE === 'tidak'
                                      ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  Tidak
                                </button>
                              </div>
                            </div>

                            {/* Question F */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-[12px] border-b border-dashed border-slate-200 pb-3 last:border-b-0 last:pb-0">
                              <span className="font-medium text-slate-700 flex-1 leading-relaxed">
                                <b className="text-[#3b5998] mr-1">f.</b> Apakah Perseroan diwajibkan audit oleh peraturan perundang-undangan?
                              </span>
                              <div className="flex gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleQuestionChange('rupstQuestionF', 'ya')}
                                  className={`px-3 py-1 text-[11px] font-bold uppercase rounded border transition-all ${
                                    data.rupstQuestionF === 'ya'
                                      ? 'bg-red-500 text-white border-red-500 shadow-sm'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  Ya
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuestionChange('rupstQuestionF', 'tidak')}
                                  className={`px-3 py-1 text-[11px] font-bold uppercase rounded border transition-all ${
                                    data.rupstQuestionF === 'tidak'
                                      ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  Tidak
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Computed Status Audit display */}
                          <div className={`mt-4 p-3 rounded border flex items-center justify-between transition-all ${
                            data.rupstIsAudited 
                              ? 'bg-red-50 border-red-200 text-red-800' 
                              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          }`}>
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] font-bold">HASIL VALIDASI:</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase text-white ${
                                data.rupstIsAudited ? 'bg-red-600' : 'bg-emerald-600'
                              }`}>
                                {data.rupstIsAudited ? 'Wajib Audit' : 'Tidak Wajib Audit'}
                              </span>
                            </div>
                            <span className="text-[11px] font-medium hidden sm:inline">
                              {data.rupstIsAudited 
                                ? '⚠️ Memenuhi kriteria wajib audit. Laporan akuntan publik diperlukan.' 
                                : '✅ Laporan Keuangan tidak wajib audit oleh Akuntan Publik.'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-6 space-y-3">
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center gap-6">
                            <span className="text-[12px] font-bold text-slate-700">Status Audit Laporan Keuangan:</span>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer">
                                <input 
                                  type="radio" 
                                  checked={data.rupstIsAudited === false} 
                                  onChange={() => {
                                    updateData({ rupstIsAudited: false });
                                  }}
                                  className="w-4 h-4 text-[#3b5998]"
                                />
                                <span>Tidak Wajib Audit</span>
                              </label>
                              <label className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer">
                                <input 
                                  type="radio" 
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
                                  className="w-4 h-4 text-[#3b5998]"
                                />
                                <span>Wajib Audit</span>
                              </label>
                            </div>
                          </div>
                          {data.rupstIsAudited === false && (
                            <label className="flex items-start gap-2 text-[11px] text-slate-600 cursor-pointer font-medium bg-blue-50/50 p-2 rounded border border-blue-100">
                              <input
                                type="checkbox"
                                checked={data.rupstNonAuditedUseKAP || false}
                                onChange={(e) => updateData({ rupstNonAuditedUseKAP: e.target.checked })}
                                className="w-3.5 h-3.5 mt-0.5 text-blue-600 focus:ring-blue-500 border-slate-300 rounded shrink-0"
                              />
                              <span className="leading-tight">Namun untuk laporan keuangan yang akurat perseroan memilih dan memutuskan untuk menggunakan Kantor Akuntan Publik</span>
                            </label>
                          )}
                        </div>
                      )}

                      <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-sm space-y-3">
                        <div className="border-b border-slate-200 pb-1.5 mb-2">
                          <span className="text-[12px] font-bold text-[#3b5998] uppercase tracking-wider">
                            📝 DRAF AKTA RUPST
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <AhuLabel label="Nomor Akta RUPST" />
                            <div className="flex gap-2">
                              <AhuInput 
                                value={data.draftAktaRupsNumber || ''} 
                                onChange={e => updateData({ draftAktaRupsNumber: e.target.value })} 
                                placeholder="Contoh: 08" 
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
                            <AhuLabel label="Nomor Urut Akta RUPST" />
                            <AhuInput 
                              value={data.draftAktaRupsOrderNumber || ''} 
                              onChange={e => updateData({ draftAktaRupsOrderNumber: e.target.value })} 
                              placeholder="Contoh: 001" 
                            />
                          </div>
                          <div>
                            <AhuLabel label="Tanggal Akta RUPST" />
                            <AhuInput 
                              type="date"
                              value={data.draftAktaRupsDate || ''} 
                              onChange={e => updateData({ draftAktaRupsDate: e.target.value })} 
                            />
                          </div>
                          <div>
                            <AhuLabel label="Jam Akta RUPST" />
                            <AhuInput 
                              type="time"
                              value={data.draftAktaRupsTime || ''} 
                              onChange={e => updateData({ draftAktaRupsTime: e.target.value })} 
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-4">
                          <div>
                            <AhuLabel label="Tahun Buku" required />
                            <AhuInput value={data.rupstFiscalYear || ''} onChange={e => updateData({ rupstFiscalYear: e.target.value })} placeholder="Contoh: 2025" />
                          </div>
                          <div>
                            <AhuLabel label="Nomor Laporan Keuangan" />
                            <AhuInput value={data.rupstFinancialReportNumber || ''} onChange={e => updateData({ rupstFinancialReportNumber: e.target.value })} placeholder="Contoh: LP/25/2025" />
                          </div>
                          <div>
                            <AhuLabel label="Tanggal Laporan Keuangan" />
                            <AhuInput type="date" value={data.rupstFinancialReportDate || ''} onChange={e => updateData({ rupstFinancialReportDate: e.target.value })} />
                          </div>
                          <div className="p-3 bg-blue-50/50 rounded border border-blue-100 space-y-3">
                            <h5 className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Penandatangan Laporan Keuangan</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <AhuLabel label="Pilih Direksi" />
                                <AhuSelect 
                                  value={data.rupstFinancialReportSignatoryName || ''} 
                                  onChange={e => {
                                    const selectedName = e.target.value;
                                    const sh = data.shareholders.find(s => s.name === selectedName);
                                    updateData({ 
                                      rupstFinancialReportSignatoryName: selectedName,
                                      rupstFinancialReportSignatoryPosition: sh?.isManagement ? (sh.managementPosition || "Direktur") : "Direktur"
                                    });
                                  }}
                                >
                                  <option value="">-- Pilih --</option>
                                  {(data.shareholders || []).map(s => <option key={s.id} value={s.name}>{s.salutation || "Tuan"} {s.name}</option>)}
                                </AhuSelect>
                              </div>
                              <div>
                                <AhuLabel label="Jabatan Penandatangan" />
                                <AhuInput 
                                  value={data.rupstFinancialReportSignatoryPosition || ''} 
                                  onChange={e => updateData({ rupstFinancialReportSignatoryPosition: e.target.value })} 
                                  placeholder="Contoh: Direktur" 
                                />
                              </div>
                            </div>
                          </div>

                          {(data.rupstIsAudited || data.rupstNonAuditedUseKAP) && (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-3">
                              <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Informasi KAP / Auditor</h5>
                              <div className="space-y-3">
                                <div>
                                  <AhuLabel label="Nama Kantor Akuntan Publik (KAP)" />
                                  <AhuInput 
                                    value={data.rupstKapName || ''} 
                                    onChange={e => updateData({ rupstKapName: e.target.value })} 
                                    placeholder="Contoh: KAP Tanudiredja, Wibisana, Rintis & Rekan" 
                                  />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <AhuLabel label="Nomor Izin KAP" />
                                    <AhuInput 
                                      value={data.rupstKapLicenseNumber || ''} 
                                      onChange={e => updateData({ rupstKapLicenseNumber: e.target.value })} 
                                      placeholder="Contoh: KEP-442/KM.1/2023" 
                                    />
                                  </div>
                                  <div>
                                    <AhuLabel label="Izin Berakhir Tanggal" />
                                    <AhuInput 
                                      type="date"
                                      value={data.rupstKapExpiryDate || ''} 
                                      onChange={e => updateData({ rupstKapExpiryDate: e.target.value })} 
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                  <div>
                                    <AhuLabel label="Nomor Laporan Audit" />
                                    <AhuInput 
                                      value={data.rupstAuditReportNumber || ''} 
                                      onChange={e => updateData({ rupstAuditReportNumber: e.target.value })} 
                                      placeholder="Contoh: 00123/2.3456/AU.1..." 
                                    />
                                  </div>
                                  <div>
                                    <AhuLabel label="Tanggal Laporan Audit" />
                                    <AhuInput 
                                      type="date"
                                      value={data.rupstAuditReportDate || ''} 
                                      onChange={e => updateData({ rupstAuditReportDate: e.target.value })} 
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="space-y-4">
                          <div>
                            <AhuLabel label="Laba Bersih (Rp)" />
                            <AhuInput value={formatInputNumber(data.rupstNetProfit)} onChange={e => updateData({ rupstNetProfit: parseFormattedNumber(e.target.value) })} />
                          </div>
                          <div>
                            <AhuLabel label="Dividen Dibagikan (Rp)" />
                            <AhuInput value={formatInputNumber(data.rupstDividendAmount)} onChange={e => updateData({ rupstDividendAmount: parseFormattedNumber(e.target.value) })} />
                          </div>
                          <div>
                            <AhuLabel label="Saldo Laba/Rugi Ditahan Tahun Sebelumnya (Rp)" />
                            <AhuInput value={formatInputNumber(data.rupstRetainedProfit)} onChange={e => updateData({ rupstRetainedProfit: parseFormattedNumber(e.target.value) })} />
                          </div>
                          <div>
                            <AhuLabel label="Laba Ditahan / Rugi Berjalan (Rp)" />
                            <div className="px-3 py-1.5 bg-slate-50 border border-[#ccc] rounded-sm text-[13px] font-bold text-slate-700">
                              {((data.rupstNetProfit || 0) + (data.rupstRetainedProfit || 0) - (data.rupstDividendAmount || 0)) < 0 ? '- ' : ''}Rp. {formatInputNumber(Math.abs((data.rupstNetProfit || 0) + (data.rupstRetainedProfit || 0) - (data.rupstDividendAmount || 0)))}
                            </div>
                            <label className="flex items-center text-[10px] text-slate-600 gap-1.5 cursor-pointer mt-2 font-medium">
                              <input
                                type="checkbox"
                                className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                                checked={data.rupstShowRetainedProfit ?? (data.rupstRetainedProfit !== 0 && data.rupstRetainedProfit !== undefined)}
                                onChange={e => updateData({ rupstShowRetainedProfit: e.target.checked })}
                              />
                              <span className="mt-[2px]">Tampilkan Saldo Ditahan Tahun Sebelumnya di Akta dan Notulen (Meskipun nilainya 0)</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* DYNAMIC DIVIDEND DISTRIBUTION FORM */}
                      {data.rupstDividendAmount !== undefined && data.rupstDividendAmount > 0 && (
                        <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50/25 shadow-xs space-y-4">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-blue-100 gap-2">
                            <div>
                              <h5 className="text-[13px] font-bold text-blue-900 uppercase flex items-center gap-1.5">
                                <Coins className="w-4 h-4 text-blue-800" /> Distribusi Pembagian Dividen Ke Pemegang Saham
                              </h5>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Tentukan penerima dividen, persentase bagian, dan jumlah uangnya. Total dividen: <strong>Rp {formatInputNumber(data.rupstDividendAmount)}</strong>
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
                              className="text-[11px] bg-blue-800 hover:bg-blue-900 text-white px-3 py-1.5 rounded transition-colors font-bold shadow-xs uppercase flex items-center gap-1.5 self-stretch sm:self-center justify-center cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> Tambah Penerima
                            </button>
                          </div>

                          {(!data.rupstDividends || data.rupstDividends.length === 0) ? (
                            <div className="text-center py-6 text-slate-500 text-[12px] bg-white rounded border border-dashed border-slate-200">
                              Belum ada pembagian dividen. Klik "Tambah Penerima" untuk mendistribusikan dividen.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {data.rupstDividends.map((divItem, idx) => {
                                const rupsShareholders = Array.from(new Set([
                                  ...(data.shareholders || []).map(s => s.name.trim()),
                                  ...(data.finalShareholders || []).map(s => s.name.trim())
                                ].filter(Boolean))).sort();

                                return (
                                  <div key={divItem.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-white border border-slate-200 rounded-md relative items-center shadow-xs">
                                    <div className="md:col-span-4">
                                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Pemegang Saham #{idx + 1}</label>
                                      <select
                                        className="w-full text-[12px] border border-slate-300 rounded p-1.5 bg-white font-medium focus:border-blue-500 focus:outline-none"
                                        value={divItem.shareholderName}
                                        onChange={e => {
                                          const newDividends = (data.rupstDividends || []).map(d =>
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
                                          className="w-full text-[12px] border border-slate-300 rounded p-1.5 pr-6 bg-white font-medium focus:border-blue-500 focus:outline-none"
                                          value={divItem.percentage === 0 ? '' : divItem.percentage}
                                          onChange={e => {
                                            const pct = parseFloat(e.target.value) || 0;
                                            const computedAmount = Math.round((pct / 100) * (data.rupstDividendAmount || 0));
                                            const newDividends = (data.rupstDividends || []).map(d =>
                                              d.id === divItem.id ? { ...d, percentage: pct, amount: computedAmount } : d
                                            );
                                            updateData({ rupstDividends: newDividends });
                                          }}
                                        />
                                        <span className="absolute right-2 top-1.5 text-slate-400 text-[11px] font-bold">%</span>
                                      </div>
                                    </div>

                                    <div className="md:col-span-2">
                                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Jumlah Uang (Rp)</label>
                                      <input
                                        type="text"
                                        placeholder="Jumlah uang..."
                                        className="w-full text-[12px] border border-slate-300 rounded p-1.5 bg-white font-medium focus:border-blue-500 focus:outline-none"
                                        value={divItem.amount === 0 ? '' : formatInputNumber(divItem.amount)}
                                        onChange={e => {
                                          const cash = parseFormattedNumber(e.target.value);
                                          const computedPct = (data.rupstDividendAmount || 0) > 0 
                                            ? parseFloat(((cash / (data.rupstDividendAmount || 1)) * 100).toFixed(4))
                                            : 0;
                                          const newDividends = (data.rupstDividends || []).map(d =>
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
                                        className="w-full text-[12px] border border-slate-300 rounded p-1.5 bg-white font-medium focus:border-blue-500 focus:outline-none"
                                        value={divItem.paymentDate || ''}
                                        onChange={e => {
                                          const newDividends = (data.rupstDividends || []).map(d =>
                                            d.id === divItem.id ? { ...d, paymentDate: e.target.value } : d
                                          );
                                          updateData({ rupstDividends: newDividends });
                                        }}
                                      />
                                    </div>

                                    <div className="md:col-span-1 flex justify-center items-center pt-4 md:pt-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newDividends = (data.rupstDividends || []).filter(d => d.id !== divItem.id);
                                          updateData({ rupstDividends: newDividends });
                                        }}
                                        className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition-colors"
                                        title="Hapus"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Validation / Summary Row */}
                              {(() => {
                                const totalPct = (data.rupstDividends || []).reduce((sum, d) => sum + d.percentage, 0);
                                const totalCash = (data.rupstDividends || []).reduce((sum, d) => sum + d.amount, 0);
                                const isOverPct = totalPct > 100.01; // small float cushion
                                const isOverCash = totalCash > (data.rupstDividendAmount || 0) + 1; // small float cushion

                                return (
                                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center text-[12px] p-3 bg-slate-100 rounded-md border border-slate-200 mt-2 font-medium">
                                    <div className="space-y-1">
                                      <div className="flex flex-col sm:flex-row sm:gap-x-4">
                                        <span className={isOverPct ? "text-red-600 font-bold" : "text-slate-700"}>
                                          Total Persentase: <strong>{totalPct.toFixed(2)}%</strong> {isOverPct && "(Lebih dari 100%)"}
                                        </span>
                                        <span className={isOverCash ? "text-red-600 font-bold" : "text-slate-700"}>
                                          Total Dibagikan: <strong>Rp {formatInputNumber(totalCash)}</strong> {isOverCash && "(Melebihi Total Dividen)"}
                                        </span>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const count = data.shareholders.length;
                                        if (count === 0) return;
                                        const totalOriginalShares = data.shareholders.reduce((sum, s) => sum + s.sharesOwned, 0);
                                        if (totalOriginalShares === 0) return;

                                        const autoDividends = (data.shareholders || []).map(s => {
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
                                      className="text-[11px] text-blue-700 hover:text-blue-950 font-bold underline hover:no-underline transition-all mt-2 md:mt-0 cursor-pointer"
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

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded space-y-3 shadow-sm">
                          <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">
                            {data.rupstIsAudited ? "Alasan Wajib Audit:" : "Alasan Tidak Wajib Audit:"}
                          </h5>
                          <div className="space-y-2 pt-1">
                            <label className="flex items-start gap-2 text-[12px] text-slate-700 cursor-pointer font-medium hover:text-blue-600 transition-colors">
                              <input
                                type="checkbox"
                                checked={data.rupstAlasanAuditA !== false}
                                onChange={(e) => updateData({ rupstAlasanAuditA: e.target.checked })}
                                className="w-4 h-4 mt-0.5 text-[#3b5998] focus:ring-[#3b5998] border-[#ccc] rounded"
                              />
                              <span className="flex-1 leading-tight">
                                a. Kegiatan Usaha Perseroan {data.rupstIsAudited ? "" : "tidak"} menghimpun dan/atau mengelola dana masyarakat.
                              </span>
                            </label>
                            <label className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer font-medium">
                              <input
                                type="checkbox"
                                checked={data.rupstAlasanAuditB !== false}
                                onChange={(e) => updateData({ rupstAlasanAuditB: e.target.checked })}
                                className="w-4 h-4 text-[#3b5998] focus:ring-[#3b5998] border-[#ccc] rounded"
                              />
                              <span className="flex-1">
                                b. Perseroan {data.rupstIsAudited ? "" : "tidak"} menerbitkan surat pengakuan utang kepada masyarakat.
                              </span>
                            </label>
                            <label className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer font-medium">
                              <input
                                type="checkbox"
                                checked={data.rupstAlasanAuditC !== false}
                                onChange={(e) => updateData({ rupstAlasanAuditC: e.target.checked })}
                                className="w-4 h-4 text-[#3b5998] focus:ring-[#3b5998] border-[#ccc] rounded"
                              />
                              <span className="flex-1">
                                c. Perseroan {data.rupstIsAudited ? "merupakan" : "tidak merupakan"} Perseroan Terbuka (Tbk).
                              </span>
                            </label>
                            <label className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer font-medium">
                              <input
                                type="checkbox"
                                checked={data.rupstAlasanAuditD !== false}
                                onChange={(e) => updateData({ rupstAlasanAuditD: e.target.checked })}
                                className="w-4 h-4 text-[#3b5998] focus:ring-[#3b5998] border-[#ccc] rounded"
                              />
                              <span className="flex-1">
                                d. Perseroan {data.rupstIsAudited ? "merupakan" : "tidak merupakan"} Persero.
                              </span>
                            </label>
                            <label className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer font-medium">
                              <input
                                type="checkbox"
                                checked={data.rupstAlasanAuditE !== false}
                                onChange={(e) => updateData({ rupstAlasanAuditE: e.target.checked })}
                                className="w-4 h-4 text-[#3b5998] focus:ring-[#3b5998] border-[#ccc] rounded"
                              />
                              <span className="flex-1">
                                e. Aset dan/atau jumlah peredaran usaha {data.rupstIsAudited ? "lebih" : "tidak lebih"} dari 50 Milyar, atau
                              </span>
                            </label>
                            <label className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer font-medium">
                              <input
                                type="checkbox"
                                checked={data.rupstAlasanAuditF !== false}
                                onChange={(e) => updateData({ rupstAlasanAuditF: e.target.checked })}
                                className="w-4 h-4 text-[#3b5998] focus:ring-[#3b5998] border-[#ccc] rounded"
                              />
                              <span className="flex-1">
                                f. {data.rupstIsAudited ? "" : "Tidak"} diwajibkan oleh peraturan perundang-undangan.
                              </span>
                            </label>
                          </div>
                        </div>
                        
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded space-y-3 shadow-sm">
                          <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">Komponen Laporan Keuangan Yang Disahkan:</h5>
                          <div className="space-y-2 pt-1">
                            <label className="flex items-start gap-2 text-[12px] text-slate-700 cursor-pointer font-medium">
                              <input
                                type="checkbox"
                                checked={data.rupstStatementNeraca}
                                onChange={(e) => updateData({ rupstStatementNeraca: e.target.checked })}
                                className="w-4 h-4 mt-0.5 text-[#3b5998] focus:ring-[#3b5998] border-[#ccc] rounded"
                              />
                              <span className="leading-tight">Laporan Keuangan, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini.</span>
                            </label>
                            <label className="flex items-start gap-2 text-[12px] text-slate-700 cursor-pointer font-medium">
                              <input
                                type="checkbox"
                                checked={data.rupstStatementLabaRugi}
                                onChange={(e) => updateData({ rupstStatementLabaRugi: e.target.checked })}
                                className="w-4 h-4 mt-0.5 text-[#3b5998] focus:ring-[#3b5998] border-[#ccc] rounded"
                              />
                              <span className="leading-tight">Laporan mengenai Kegiatan Perseroan, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini.</span>
                            </label>
                            <label className="flex items-start gap-2 text-[12px] text-slate-700 cursor-pointer font-medium">
                              <input
                                type="checkbox"
                                checked={data.rupstStatementPerubahanEkuitas}
                                onChange={(e) => updateData({ rupstStatementPerubahanEkuitas: e.target.checked })}
                                className="w-4 h-4 mt-0.5 text-[#3b5998] focus:ring-[#3b5998] border-[#ccc] rounded"
                              />
                              <span className="leading-tight">Laporan Pelaksanaan Tanggung Jawab Sosial dan Lingkungan, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini.</span>
                            </label>
                            <label className="flex items-start gap-2 text-[12px] text-slate-700 cursor-pointer font-medium">
                              <input
                                type="checkbox"
                                checked={data.rupstStatementArusKas}
                                onChange={(e) => updateData({ rupstStatementArusKas: e.target.checked })}
                                className="w-4 h-4 mt-0.5 text-[#3b5998] focus:ring-[#3b5998] border-[#ccc] rounded"
                              />
                              <span className="leading-tight">Rincian Masalah yang timbul selama tahun buku yang mempengaruhi kegiatan usaha perseroan, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini.</span>
                            </label>
                            <label className="flex items-start gap-2 text-[12px] text-slate-700 cursor-pointer font-medium">
                              <input
                                type="checkbox"
                                checked={data.rupstStatementCatatan}
                                onChange={(e) => updateData({ rupstStatementCatatan: e.target.checked })}
                                className="w-4 h-4 mt-0.5 text-[#3b5998] focus:ring-[#3b5998] border-[#ccc] rounded"
                              />
                              <span className="leading-tight">Laporan mengenai tugas pengawasan yang telah dilaksanakan oleh Dewan Komisaris selama tahun buku yang baru lampau, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini.</span>
                            </label>
                            <label className="flex items-start gap-2 text-[12px] text-slate-700 cursor-pointer font-medium">
                              <input
                                type="checkbox"
                                checked={data.rupstStatementNamaAnggota}
                                onChange={(e) => updateData({ rupstStatementNamaAnggota: e.target.checked })}
                                className="w-4 h-4 mt-0.5 text-[#3b5998] focus:ring-[#3b5998] border-[#ccc] rounded"
                              />
                              <span className="leading-tight">Nama Anggota Direksi dan Anggota Dewan Komisaris, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini.</span>
                            </label>
                            <label className="flex items-start gap-2 text-[12px] text-slate-700 cursor-pointer font-medium">
                              <input
                                type="checkbox"
                                checked={data.rupstStatementGaji}
                                onChange={(e) => updateData({ rupstStatementGaji: e.target.checked })}
                                className="w-4 h-4 mt-0.5 text-[#3b5998] focus:ring-[#3b5998] border-[#ccc] rounded"
                              />
                              <span className="leading-tight">Gaji dan Tunjangan bagi Anggota Direksi dan Gaji atau Honorarium dan Tunjangan bagi Anggota Dewan Komisaris Perseroan untuk Tahun yang baru lampau, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini.</span>
                            </label>
                            <div className="mt-3 p-2 bg-blue-50 border border-blue-100 rounded text-[11px] text-[#3b5998] leading-normal italic">
                              * Catatan: Pernyataan tanggung jawab penuh Direksi, Komisaris, dan Pemegang Saham akan selalu ditambahkan secara otomatis pada dokumen setelah rincian komponen laporan keuangan.
                            </div>
                          </div>
                        </div>
                      </div>
                    </AhuSection>

                    {/* DATA PENYELENGGARAAN RAPAT / DATA KEPUTUSAN SIRKULER */}
                    <AhuSection title={data.rupstType === 'sirkuler' ? "DATA KEPUTUSAN SIRKULER" : "DATA PENYELENGGARAAN RAPAT"}>
                      <div className="space-y-4">
                        {data.rupstType === 'sirkuler' ? (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                              <AhuLabel label="Tanggal Keputusan Sirkuler" required />
                              <div className="md:col-span-3">
                                <AhuInput 
                                  type="date" 
                                  value={data.signingDate || ''} 
                                  onChange={e => updateData({ signingDate: e.target.value })} 
                                />
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                              <AhuLabel label="Nomor Pemanggilan RUPST" />
                              <div className="md:col-span-3"><AhuInput value={data.rupstInvitationNumber || ''} onChange={e => updateData({ rupstInvitationNumber: e.target.value })} /></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                              <AhuLabel label="Tanggal Pemanggilan RUPST" />
                              <div className="md:col-span-3"><AhuInput type="date" value={data.rupstInvitationDate || ''} onChange={e => updateData({ rupstInvitationDate: e.target.value })} /></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                              <AhuLabel label="Hari/Tanggal Rapat" />
                              <div className="md:col-span-3 flex gap-2">
                                 <AhuInput type="date" value={data.signingDate || ''} onChange={e => updateData({ signingDate: e.target.value })} />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                              <AhuLabel label="Waktu Rapat (Mulai)" />
                              <div className="md:col-span-3">
                                <div className="w-1/2">
                                  <AhuInput type="time" value={data.meetingStartTime || ''} onChange={e => updateData({ meetingStartTime: e.target.value })} />
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                              <AhuLabel label="Ketentuan Anggaran Dasar Pimpinan rapat" />
                              <div className="md:col-span-3 flex gap-4">
                                <div className="flex-1">
                                  <AhuLabel label="Nomor Pasal" />
                                  <AhuInput value={data.rupstAdArticle || ''} onChange={e => updateData({ rupstAdArticle: e.target.value })} placeholder="Contoh: 9" />
                                </div>
                                <div className="flex-1">
                                  <AhuLabel label="Nomor Ayat" />
                                  <AhuInput value={data.rupstAdParagraph || ''} onChange={e => updateData({ rupstAdParagraph: e.target.value })} placeholder="Contoh: 4" />
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                              <AhuLabel label="Ketentuan Kuorum AD" />
                              <div className="md:col-span-3 flex gap-4">
                                <div className="flex-1">
                                  <AhuLabel label="Pasal Kuorum" />
                                  <AhuInput value={data.rupstQuorumArticle || ''} onChange={e => updateData({ rupstQuorumArticle: e.target.value })} placeholder="Contoh: 10" />
                                </div>
                                <div className="flex-1">
                                  <AhuLabel label="Ayat Kuorum" />
                                  <AhuInput value={data.rupstQuorumParagraph || ''} onChange={e => updateData({ rupstQuorumParagraph: e.target.value })} placeholder="Contoh: 1" />
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </AhuSection>

                    {data.rupstType === 'sirkuler' ? (
                      <AhuSection title="DAFTAR PARA PIHAK">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-[12px] font-bold text-slate-500 uppercase flex items-center gap-2">
                               <Users className="w-3 h-3" /> DAFTAR PARA PIHAK
                            </h4>
                            <button 
                              onClick={() => {
                                const newList = data.shareholders.map(s => ({ ...s, isPresent: true }));
                                updateData({ shareholders: newList });
                              }}
                              className="text-[10px] bg-[#3b5998] text-white px-3 py-1 rounded-sm hover:bg-black transition-colors font-bold shadow-sm"
                            >
                              Tandai Semua Hadir
                            </button>
                          </div>
                          <div className="border border-slate-200 rounded-sm overflow-hidden">
                            <table className="min-w-[600px] w-full text-left text-[11px]">
                              <thead className="bg-[#f9f9f9] border-b border-slate-200 font-bold uppercase">
                                <tr>
                                  <th className="p-2 border-r border-slate-200">Nama Pemegang Saham</th>
                                  <th className="p-2 border-r border-slate-200">Jumlah Saham</th>
                                  <th className="p-2 border-r border-slate-200 text-center w-20">Hadir?</th>
                                  <th className="p-2 border-r border-slate-200 text-center w-28">Dikuasakan?</th>
                                  <th className="p-2 border-slate-200 text-center">Penerima Kuasa</th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.shareholders.map(s => (
                                  <tr key={s.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors">
                                    <td className="p-2 border-r border-slate-200 font-medium uppercase">{s.name}</td>
                                    <td className="p-2 border-r border-slate-200">{formatInputNumber(s.sharesOwned)} Saham</td>
                                    <td className="p-2 text-center border-r border-slate-200">
                                      <input
                                        type="checkbox"
                                        className="w-4 h-4 cursor-pointer"
                                        checked={s.isPresent || false}
                                        onChange={e => {
                                          const newList = data.shareholders.map(item =>
                                            item.id === s.id 
                                              ? { ...item, isPresent: e.target.checked, isProxy: e.target.checked ? item.isProxy : false, proxyData: e.target.checked ? item.proxyData : undefined } 
                                              : item
                                          );
                                          updateData({ shareholders: newList });
                                        }}
                                      />
                                    </td>
                                    <td className="p-2 text-center border-r border-slate-200">
                                      {s.isPresent && (
                                        <input
                                          type="checkbox"
                                          className="w-4 h-4 cursor-pointer accent-orange-600"
                                          checked={s.isProxy || false}
                                          onChange={e => {
                                            const newList = data.shareholders.map(item =>
                                              item.id === s.id ? { ...item, isProxy: e.target.checked, proxyData: e.target.checked ? item.proxyData : undefined } : item
                                            );
                                            updateData({ shareholders: newList });
                                          }}
                                          title="Centang jika pemegang saham dikuasakan ke orang lain"
                                        />
                                      )}
                                    </td>
                                    <td className="p-2 text-center">
                                      {s.isPresent && s.isProxy && (
                                        s.proxyData?.name ? (
                                          <div className="flex items-center justify-between gap-2 px-1">
                                            <span className="text-[11px] font-bold text-slate-700 uppercase truncate">
                                              {s.proxyData.salutation} {s.proxyData.name}
                                            </span>
                                            <button
                                              onClick={() => {
                                                  setProxyModalOpenId(s.id);
                                              }}
                                              className="text-[9px] text-blue-600 hover:underline whitespace-nowrap"
                                            >
                                              Ubah
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => {
                                              setProxyModalOpenId(s.id);
                                            }}
                                            className="text-[10px] bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600 transition-colors font-bold"
                                          >
                                            + Isi Data Kuasa
                                          </button>
                                        )
                                      )}
                                    </td>
                                  </tr>
                                ))}
                                {data.shareholders.length === 0 && (
                                  <tr>
                                    <td colSpan={5} className="p-4 text-center text-slate-400 italic">Belum ada data pemegang saham. Silakan isi di bagian DATA PERSEROAN.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </AhuSection>
                    ) : (
                      <AhuSection title="DATA KEHADIRAN & PIMPINAN RAPAT">
                        <MeetingFormShell 
                          meetingType="tahunan" 
                          isCircular={false} 
                        />
                      </AhuSection>
                    )}
                    
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
                                  {data.shareholders.map(s => (
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
                    </>
                    )}
                  </fieldset>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* SAVED RUPST CARD CONTAINER */}
                  <div className="bg-white p-6 rounded-md shadow-sm border border-slate-200">
                    
                    {/* TITLE AND SEARCH/FITLER SECTION */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 pb-5 mb-5">
                      <div className="flex items-center gap-2.5">
                        <History className="w-5 h-5 text-[#1b449c]" />
                        <h3 className="text-[15px] font-bold text-slate-800 tracking-tight uppercase">
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
                            className="w-full pl-9 pr-8 py-2 border border-slate-250 rounded-md text-[13px] outline-none focus:border-[#1b449c] focus:ring-1 focus:ring-[#1b449c]/20 bg-white text-slate-800 placeholder-slate-400 transition-all font-medium"
                          />
                          {rupstSearchQuery && (
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
                            value={selectedRupstYear}
                            onChange={(e) => {
                              setSelectedRupstYear(e.target.value);
                              setRupstCurrentPage(1);
                            }}
                            className="appearance-none pl-3 pr-8 py-2 border border-slate-250 rounded-md text-[13px] outline-none focus:border-[#1b449c] bg-white text-slate-800 font-medium cursor-pointer"
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
                          className={`p-2 border rounded-md transition-all flex items-center justify-center hover:bg-slate-50 ${isRupstFilterOpen ? 'bg-blue-50 text-[#1b449c] border-[#1b449c]' : 'bg-white text-slate-600 border-slate-250'}`}
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

                    {/* QUICK FILTER EXPANSION PANEL */}
                    {isRupstFilterOpen && (
                      <div className="bg-slate-50 p-4 rounded-md border border-slate-200 mb-5 flex flex-wrap gap-2.5 items-center animate-fadeIn">
                        <span className="text-[12px] font-bold text-slate-500 uppercase">Filter Status:</span>
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
                            className="bg-white hover:bg-slate-100 text-[11px] font-semibold text-slate-600 px-2.5 py-1.5 border border-slate-200 rounded"
                          >
                            Reset Semua
                          </button>
                        </div>
                      </div>
                    )}

                    {/* TABLE AREA */}
                    {currentRupstProjects.length === 0 ? (
                      <div className="bg-slate-50 text-center py-10 rounded-md border border-dashed border-slate-350 text-slate-500 text-[13px] font-medium">
                        Belum ada notulen RUPST yang disimpan.
                      </div>
                    ) : sortedResults.length === 0 ? (
                      <div className="bg-slate-50 text-center py-12 rounded-md border border-dashed border-slate-350 text-slate-500 text-[13px] font-medium">
                        Tidak ada notulen RUPST yang cocok dengan pencarian atau filter Anda.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200 rounded-md shadow-inner bg-white">
                        <table className="min-w-[600px] w-full text-left border-collapse text-[13px] font-sans">
                          <thead>
                            <tr className="bg-[#F8FAFC] border-b border-slate-200">
                              <th className="px-4 py-3.5 text-slate-600 font-bold text-[12px] uppercase w-[60px] text-center">NO</th>
                              <th 
                                onClick={() => handleSort("companyName")}
                                className="px-4 py-3.5 text-slate-600 font-bold text-[12px] uppercase cursor-pointer hover:bg-slate-100/85 transition-colors select-none"
                              >
                                <div className="flex items-center">
                                  <span>NAMA PT</span>
                                  {renderSortArrows("companyName")}
                                </div>
                              </th>
                              <th 
                                onClick={() => handleSort("rupstFiscalYear")}
                                className="px-4 py-3.5 text-slate-600 font-bold text-[12px] uppercase cursor-pointer hover:bg-slate-100/85 transition-colors select-none w-[110px]"
                              >
                                <div className="flex items-center">
                                  <span>TAHUN</span>
                                  {renderSortArrows("rupstFiscalYear")}
                                </div>
                              </th>
                              <th 
                                onClick={() => handleSort("status")}
                                className="px-4 py-3.5 text-slate-600 font-bold text-[12px] uppercase cursor-pointer hover:bg-slate-100/85 transition-colors select-none w-[120px]"
                              >
                                <div className="flex items-center">
                                  <span>STATUS</span>
                                  {renderSortArrows("status")}
                                </div>
                              </th>
                              <th 
                                onClick={() => handleSort("updatedAt")}
                                className="px-4 py-3.5 text-slate-600 font-bold text-[12px] uppercase cursor-pointer hover:bg-slate-100/85 transition-colors select-none w-[180px]"
                              >
                                <div className="flex items-center">
                                  <span>TERAKHIR DIUBAH</span>
                                  {renderSortArrows("updatedAt")}
                                </div>
                              </th>
                              <th className="px-4 py-3.5 text-slate-600 font-bold text-[12px] uppercase text-center w-[150px]">DOWNLOAD</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150">
                            {paginatedResults.map((p, idx) => {
                              const overallIdx = startIndex + idx + 1;
                              const statusVal = p.rupstStatus || "Draft";
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
                                  <td className="px-4 py-3.5 text-center font-semibold text-slate-500 text-[12px]">{overallIdx}</td>
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
                                        className={`px-3 py-1.5 rounded-md border text-[11px] font-bold uppercase transition-all shadow-sm flex items-center gap-1.5 ${
                                          rupstDropdownId === p.id ? 'bg-[#0c2444] text-white border-[#0c2444]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                                        }`}
                                      >
                                        <Download className="w-[14px] h-[14px] stroke-[2.25px]" /> Download <ChevronDown className={`w-3.5 h-3.5 transition-transform ${rupstDropdownId === p.id ? 'rotate-180' : ''}`} />
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
                                          className="w-full px-4 py-2 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-2.5 uppercase tracking-wide border-b border-slate-100"
                                        >
                                          <FileText className="w-[15px] h-[15px] text-indigo-500 shrink-0" />
                                          <div className="flex flex-col text-left">
                                            <span className="leading-tight">
                                              {p.rupstType === 'sirkuler' ? 'SIRKULER RUPST' : 'NOTULEN RUPST'}
                                            </span>
                                            <span className="text-[9px] text-slate-400 lowercase font-medium mt-0.5">.docx</span>
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
                                          className="w-full px-4 py-2 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-2.5 uppercase tracking-wide border-b border-slate-100"
                                        >
                                          <FileText className="w-[15px] h-[15px] text-emerald-500 shrink-0" />
                                          <div className="flex flex-col text-left">
                                            <span className="leading-tight">Surat Pernyataan</span>
                                            <span className="text-[9px] text-slate-400 lowercase font-medium mt-0.5">.docx</span>
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
                                          className="w-full px-4 py-2 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-2.5 uppercase tracking-wide border-b border-slate-100"
                                        >
                                          <FileCode className="w-[15px] h-[15px] text-blue-500 shrink-0" />
                                          <div className="flex flex-col text-left">
                                            <span className="leading-tight">
                                              {p.rupstType === 'sirkuler' ? 'AKTA SIRKULER RUPST' : 'AKTA RUPST'}
                                            </span>
                                            <span className="text-[9px] text-slate-400 lowercase font-medium mt-0.5">.docx</span>
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
                                              
                                              const content = await zip.generateAsync({type: "blob"});
                                              saveAs(content, `Dokumen RUPST ${p.companyName || 'PT Baru'}.zip`);
                                            } catch (err) {
                                              console.error('Failed to generate ZIP:', err);
                                              alert('Gagal mengunduh File ZIP.');
                                            }
                                          }}
                                          className="w-full px-4 py-2 text-emerald-700 hover:bg-emerald-50/40 text-[11px] font-bold flex items-center gap-2.5 uppercase tracking-wide transition-colors"
                                        >
                                          <Archive className="w-[15px] h-[15px] text-emerald-600 shrink-0" />
                                          <div className="flex flex-col text-left">
                                            <span className="leading-tight">Download Semua</span>
                                            <span className="text-[9px] text-emerald-500/70 lowercase font-medium mt-0.5">arsip (.zip)</span>
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
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-150 text-slate-500 text-[12.5px] font-medium">
                        <div>
                          Menampilkan <span className="font-semibold text-slate-700">{startIndex + 1}</span> sampai <span className="font-semibold text-slate-700">{Math.min(startIndex + itemsPerPage, totalItems)}</span> dari <span className="font-semibold text-slate-700">{totalItems}</span> data
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {/* Previous Button */}
                          <button
                            type="button"
                            disabled={safeCurrentPage === 1}
                            onClick={() => setRupstCurrentPage(Math.max(1, safeCurrentPage - 1))}
                            className="px-2.5 py-1.5 border border-slate-200 rounded text-[12px] font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed uppercase"
                          >
                            Sebelumnya
                          </button>
                          
                          {/* Page Numbers */}
                          {getPageRange().map((p, idx) => {
                            const isEllipsis = p === "...";
                            const isActive = p === safeCurrentPage;
                            return (
                              <button
                                key={idx}
                                type="button"
                                disabled={isEllipsis}
                                onClick={() => setRupstCurrentPage(Number(p))}
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
                            disabled={safeCurrentPage === totalPages}
                            onClick={() => setRupstCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
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

export default RUPSTPage;
