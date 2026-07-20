import { mapCompanyProfileToPendirian } from './src/domain/company/mappers/companyProfileToPendirian';
import { INITIAL_STATE, INITIAL_ADDRESS, INITIAL_MANUAL_REP, INITIAL_RESOLUTIONS } from "./src/domain/company/initialCompanyData";
import { ALLOWED_EMAILS } from "./src/constants/appConstants";
import { TAB_ACCENTS, TAB_TO_PATH, PATH_TO_TAB } from "./src/constants/tabs";
import { sanitizeForFirestore } from "./src/utils/sanitize";
import { Sidebar } from "./src/components/layout/Sidebar";
import { Header } from "./src/components/layout/Header";
import { Dashboard } from './src/pages/Dashboard';
import { Panduan } from './src/pages/Panduan';
import { KbliTools } from './src/pages/KbliTools';
import { Modal } from './components/Modal';
import { ChevronRight, RefreshCw, Loader2 } from 'lucide-react';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from './src/lib/firebase';
import { AuthProvider, useAuthContext } from './src/contexts/AuthContext';
import { CompanyProvider, useCompanyContext } from './src/contexts/CompanyContext';
import { ProjectProvider, useProjectContext } from './src/contexts/ProjectContext';
import { NotificationProvider, useNotificationContext } from './src/contexts/NotificationContext';
import { NotificationService } from './src/services/NotificationService';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { CompanyData, Shareholder, ResolutionFlags, KbliItem, ManagementItem, DocumentType, Address, ManagementChangeType, CompanyProfile, AmendmentDeed, Guest, ShareTransfer, UserRole, UserProfile } from './types';
import ShareholderEditor from './src/components/editors/ShareholderEditor';
import CompositionEditor from './components/CompositionEditor';
import ManagementEditor from './components/ManagementEditor';
import StockTransferEditor from './components/StockTransferEditor';
import { GlobalModalManager } from './src/components/modals/GlobalModalManager';
import DocumentPreview from './components/DocumentPreview';
import { DataCorrectionLetter } from './components/DataCorrectionLetter';
import DraftAktaApp, { DraftAktaAppRef } from './src/DraftAktaApp';
import DraftAktaRUPS from './src/DraftAktaRUPS';
import PendirianList from './src/components/PendirianList';
import DraftAktaPendirian from './src/DraftAktaPendirian';
import ImportKBLI from './src/components/ImportKBLI';
import PendirianDocumentPreview from './src/PendirianDocumentPreview';
import { RUPSTDocumentPreview } from './src/RUPSTDocumentPreview';
import { SirkulerLaporanDocumentPreview } from './components/SirkulerLaporanDocumentPreview';
import { SirkulerLaporanFormContent } from './components/SirkulerLaporanFormContent';
import { RealTimeClock } from './src/components/RealTimeClock';
import { EditProfileModal } from './components/EditProfileModal';
import KBLIMapping from './src/components/KBLIMapping';
import KBLISuggestions from './src/components/KBLISuggestions';
import kbli2025Data from './kbli_2025.json';
import JSZip from 'jszip';
import { KBLI_2025_CATEGORIES } from './src/lib/kbliConstants';
import { Sparkles, Bot, Lightbulb, Lock } from 'lucide-react';
import GuideMenu from './src/components/GuideMenu';
import { LaporanList } from './src/components/LaporanList';
import { UserManagement } from './src/components/UserManagement';
import { WhatsAppSettings } from './src/components/WhatsAppSettings';
import { CompanyPage, CompanyHeader } from './src/features/company';
import { ProjectList, ProjectDetail } from './src/features/project-engine';
import { DocumentGeneratorPage } from './src/features/document-generator';
import { ProjectService } from './src/services/ProjectService';
import { MeetingFormShell } from './src/components/MeetingFormShell';
import { fetchLatestDeedNumbers } from './src/lib/deedUtils';
import { syncToUtama, getDeedTitle, formatAppearersForRups, formatAppearersForPendirian } from './src/lib/syncUtama';
import { 
  Building2, 
  Users, 
  UserPlus,
  Settings, 
  Printer, 
  Save, 
  Briefcase,
  History,
  FileCode,
  ListChecks,
  MapPin,
  Clock,
  Gavel,
  FileText,
  Plus,
  Trash2,
  BookOpen,
  Eye,
  EyeOff,
  GanttChartSquare,
  Home,
  Navigation,
  Map,
  TrendingUp,
  Coins,
  FileSignature,
  ArrowRight,
  Calculator,
  PieChart,
  Info,
  Percent,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  ShieldCheck,
  Award,
  Bell,
  BellOff,
  AlertTriangle,
  Mail,
  Moon,
  User,
  Search,
  Menu,
  ChevronDown,
  ChevronUp,
  X,
  FileCheck,
  ArrowRightLeft,
  HelpCircle,
  ZoomIn,
  ZoomOut,
  Edit,
  Filter,
  SlidersHorizontal,
  MoreHorizontal,
  Globe,
  CalendarCheck,
  ScrollText,
  FilePlus,
  Copy,
  Archive,
  Undo,
  FileBadge,
  Download,
  Smartphone
} from 'lucide-react';
import { IndoRegionSelector, DomicileSelector, SearchableSelect } from './components/AddressFields';
import { formatCurrency, formatInputNumber, parseFormattedNumber, numberToWords, toTitleCase, formatDateIndo } from './utils/formatters';
import { KBLI_DATA } from './utils/kbliData';





type TabId = 'general' | 'shareholders' | 'shareholders_new' | 'representative' | 'agenda' | 'kbli' | 'domicile' | 'address' | 'capitalBase' | 'capitalPaid' | 'management' | 'reappointment';
type SidebarTabId = 'beranda' | 'company_profile' | 'cv_profile' | 'notulen' | 'pendirian' | 'rupst' | 'perbaikan' | 'draft_akta_rups' | 'panduan' | 'kbli_mapping' | 'saran_kbli' | 'import_kbli' | 'laporan' | 'whatsapp_settings' | 'projects' | 'project_detail' | 'user_management';

// AHU Style Helper Components
export const AhuSection = ({ title, children, isOpen = true }: { title: string, children: React.ReactNode, isOpen?: boolean }) => {
  const [open, setOpen] = useState(isOpen);
  return (
    <div className="bg-white border border-slate-200 rounded-sm mb-4 shadow-sm">
      <div 
        onClick={() => setOpen(!open)}
        className="bg-[#f5f5f5] px-4 py-2 flex justify-between items-center cursor-pointer border-b border-slate-200 group"
      >
        <h3 className="text-[14px] font-bold text-slate-700 uppercase tracking-tight flex items-center gap-2">
          <span className="w-1.5 h-4 bg-[#3b5998]"></span>
          {title}
        </h3>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </div>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
};

export const AhuLabel = ({ label, required = false }: { label: string, required?: boolean }) => (
  <label className="block text-[13px] font-medium text-slate-700 mb-1">
    {label} {required && <span className="text-red-500">*</span>}
  </label>
);

export const AhuInput = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    {...props} 
    className={`w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none focus:border-[#66afe9] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,.075),0_0_8px_rgba(102,175,233,.6)] transition-all bg-white text-slate-800 ${className}`} 
  />
);

export const AhuSelect = ({ children, className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select 
    {...props} 
    className={`w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none focus:border-[#66afe9] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,.075),0_0_8px_rgba(102,175,233,.6)] transition-all bg-white text-slate-800 appearance-none ${className}`}
  >
    {children}
  </select>
);

export const AhuMasaJabatanSelector = ({ data, updateData }: { data: any, updateData: (d: any) => void }) => {
  const isAD = data.managementEffectiveUntilType === 'AD' || !data.managementEffectiveUntilType;
  const isManual = data.managementEffectiveUntilType === 'MANUAL';

  return (
    <div className="space-y-4 border-t border-slate-100 pt-4 mt-4">
      <AhuLabel label="Pilihan Akhir Masa Jabatan" required />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        {/* Option 1: Sesuai Anggaran Dasar */}
        <label className={`flex flex-col p-4 border rounded-sm hover:bg-slate-50 cursor-pointer transition-all group ${isAD ? 'border-[#3b5998] bg-slate-50' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <input 
              type="radio" 
              name="masa_jabatan_type"
              className="w-4 h-4 text-[#3b5998] focus:ring-[#3b5998]"
              checked={isAD}
              onChange={() => {
                updateData({ 
                  managementEffectiveUntilType: 'AD',
                  managementEffectiveUntil: 'untuk jangka waktu sebagaimana yang ditentukan dalam Anggaran Dasar Perseroan'
                });
              }}
            />
            <span className="text-[13px] font-bold text-slate-700 group-hover:text-slate-900">Sesuai Anggaran Dasar</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 pl-7">
            Masa jabatan akan disesuaikan dengan ketentuan dalam Anggaran Dasar Perseroan.
          </p>
        </label>

        {/* Option 2: Input Manual Tanggal Bulan Tahun */}
        <label className={`flex flex-col p-4 border rounded-sm hover:bg-slate-50 cursor-pointer transition-all group ${isManual ? 'border-[#3b5998] bg-slate-50' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <input 
              type="radio" 
              name="masa_jabatan_type"
              className="w-4 h-4 text-[#3b5998] focus:ring-[#3b5998]"
              checked={isManual}
              onChange={() => {
                const defaultDate = data.managementEffectiveDate || '';
                let formattedStr = '';
                if (defaultDate) {
                  formattedStr = `sampai dengan tanggal ${formatDateIndo(defaultDate)}`;
                } else {
                  formattedStr = data.managementEffectiveUntil && data.managementEffectiveUntil.startsWith('sampai dengan tanggal') 
                    ? data.managementEffectiveUntil 
                    : 'sampai dengan tanggal ';
                }
                updateData({ 
                  managementEffectiveUntilType: 'MANUAL',
                  managementEffectiveUntil: formattedStr
                });
              }}
            />
            <span className="text-[13px] font-bold text-slate-700 group-hover:text-slate-900">Input Manual Tanggal Bulan Tahun</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 pl-7">
            Tentukan tanggal berakhirnya masa jabatan secara spesifik (hari, bulan, dan tahun).
          </p>
        </label>
      </div>

      {isManual && (
        <div className="p-4 border border-slate-100 bg-slate-50 rounded space-y-3 mt-3 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <AhuLabel label="Pilih Tanggal Berakhir" />
              <AhuInput 
                type="date"
                value={data.managementEffectiveDate || ''}
                onChange={(e) => {
                  const dateVal = e.target.value;
                  const formattedStr = dateVal ? `sampai dengan tanggal ${formatDateIndo(dateVal)}` : 'sampai dengan tanggal ';
                  updateData({ 
                    managementEffectiveDate: dateVal,
                    managementEffectiveUntil: formattedStr
                  });
                }}
                className="mt-1"
              />
              <p className="text-[11px] text-slate-400 mt-1">Gunakan pemilih tanggal ini untuk otomatis mengisi format bahasa Indonesia.</p>
            </div>
            <div>
              <AhuLabel label="Hasil Format Teks (Bisa Diedit Manual)" />
              <AhuInput 
                placeholder="Contoh: sampai dengan tanggal 31 Desember 2029"
                value={data.managementEffectiveUntil || ''}
                onChange={(e) => {
                  updateData({ managementEffectiveUntil: e.target.value });
                }}
                className="mt-1 font-medium text-slate-800"
              />
              <p className="text-[11px] text-slate-400 mt-1">Teks inilah yang akan dimasukkan ke dalam Akta dan Notulen.</p>
            </div>
          </div>
        </div>
      )}

      {/* Preview Box */}
      <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100/50 rounded-sm">
        <h5 className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider mb-1">Pratinjau Kalimat di Akta & Notulen:</h5>
        <p className="text-[12px] text-indigo-900 leading-relaxed italic">
          "Masa jabatan anggota Direksi dan Dewan Komisaris tersebut di atas berlaku efektif terhitung sejak tanggal Keputusan ini ditetapkan, <strong className="underline text-[#3b5998]">{data.managementEffectiveUntil || "untuk jangka waktu sebagaimana yang ditentukan dalam Anggaran Dasar Perseroan"}</strong>, dengan tidak mengurangi hak Rapat Umum Pemegang Saham untuk memberhentikan sewaktu-waktu sesuai dengan ketentuan peraturan perundang-undangan yang berlaku."
        </p>
      </div>
    </div>
  );
};

const getCompanyInitials = (name: string): string => {
  if (!name) return "PT";
  let cleanName = name.replace(/^(PT\.?\s+)/gi, "").trim();
  if (!cleanName) return "PT";

  const upper = cleanName.toUpperCase();
  if (upper.includes("CZARRE")) return "CZ";
  if (upper.includes("BINACITRA")) return "BK";

  const words = cleanName.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return cleanName.slice(0, 2).toUpperCase();
};

import { DocumentStatusBadge, documentStatusOptions } from './components/DocumentStatusBadge';
import { useDocumentRuntime, DocumentRuntimeProvider } from './src/domain/company/useDocumentRuntime';
import { useProjectSession, ProjectSessionProvider } from './src/domain/project/useProjectSession';
import { useExportPipeline, ExportPipelineProvider } from './src/domain/project/useExportPipeline';

const getPastelColor = (name: string) => {
  const hash = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const pastels = [
    { bg: 'bg-blue-50/80 text-blue-600 border-blue-200/60' },
    { bg: 'bg-indigo-50/80 text-indigo-600 border-indigo-200/60' },
    { bg: 'bg-purple-50/80 text-purple-600 border-purple-200/60' },
    { bg: 'bg-pink-50/80 text-pink-600 border-pink-200/60' },
    { bg: 'bg-orange-50/80 text-orange-600 border-orange-200/60' },
    { bg: 'bg-amber-50/80 text-amber-600 border-amber-200/60' },
    { bg: 'bg-emerald-50/80 text-emerald-600 border-emerald-200/60' },
    { bg: 'bg-teal-50/80 text-teal-600 border-teal-200/60' },
    { bg: 'bg-cyan-50/80 text-cyan-600 border-cyan-200/60' },
  ];
  return pastels[hash % pastels.length];
};

const CompanyAvatar = ({ name }: { name: string }) => {
  const initials = getCompanyInitials(name);
  const colors = getPastelColor(name);
  return (
    <div className={`w-[36px] h-[36px] rounded-[12px] flex items-center justify-center font-semibold text-[12px] border shrink-0 uppercase select-none ${colors.bg}`}>
      {initials}
    </div>
  );
};

const AppShell: React.FC = () => {
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
    isAutoSaving,
    lastAutoSavedAt,
    setAutosaveParams,
    mergedData,
    isSyncing,
    syncCompanyDataToRupst,
    handleManualSync,
    proxyModalOpenId,
    setProxyModalOpenId,
    editingShareholder,
    setEditingShareholder
  } = useDocumentRuntime(() => {
    setActiveTab('general');
  });

  const {
    isExportingPendirian,
    handleExportWord,
    handleDownloadProject,
    handlePendirianExportWord,
    handlePrint
  } = useExportPipeline();

  const { profiles, cvProfiles, save: saveCompany, delete: deleteCompany, archive: archiveCompany, duplicate: duplicateCompany } = useCompanyContext();

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [expandedGuestId, setExpandedGuestId] = useState<string | null>(null);
  const [showArchivedProfiles, setShowArchivedProfiles] = useState<boolean>(false);
  const { projects, rupstProjects, rupstPublicProjects, pendirianProjects, loading: projectsLoading } = useProjectContext();

  useEffect(() => {
    if (!projectsLoading) {
      setDataLoading(false);
    }
  }, [projectsLoading]);
  const [rupstSearchQuery, setRupstSearchQuery] = useState("");
  const [selectedRupstYear, setSelectedRupstYear] = useState<string>("all");
  const [rupstSortField, setRupstSortField] = useState<string>("updatedAt");
  const [rupstSortOrder, setRupstSortOrder] = useState<"asc" | "desc">("desc");

  const draftAktaRef = useRef<DraftAktaAppRef>(null);
  const [rupstCurrentPage, setRupstCurrentPage] = useState<number>(1);
  const [rupstActiveTab, setRupstActiveTab] = useState<'ALL' | 'PROSES' | 'SELESAI'>('ALL');
  const [isRupstFilterOpen, setIsRupstFilterOpen] = useState<boolean>(false);
  const [notulenSearchQuery, setNotulenSearchQuery] = useState("");
  const [selectedRupslbYear, setSelectedRupslbYear] = useState<string>("all");
  const [rupslbSortField, setRupslbSortField] = useState<string>("updatedAt");
  const [rupslbSortOrder, setRupslbSortOrder] = useState<"asc" | "desc">("desc");
  const [rupslbCurrentPage, setRupslbCurrentPage] = useState<number>(1);
  const [isRupslbFilterOpen, setIsRupslbFilterOpen] = useState<boolean>(false);
  const [profileSearchQuery, setProfileSearchQuery] = useState("");
  const [cvProfileSearchQuery, setCvProfileSearchQuery] = useState("");
  const [profileSortField, setProfileSortField] = useState<string>("updatedAt");
  const [cvProfileSortField, setCvProfileSortField] = useState<string>("updatedAt");
  const [profileSortOrder, setProfileSortOrder] = useState<"asc" | "desc">("desc");
  const [cvProfileSortOrder, setCvProfileSortOrder] = useState<"asc" | "desc">("desc");
  const [profileCurrentPage, setProfileCurrentPage] = useState<number>(1);
  const [cvProfileCurrentPage, setCvProfileCurrentPage] = useState<number>(1);
  const [selectedProfileYear, setSelectedProfileYear] = useState<string>("all");
  const [selectedCvProfileYear, setSelectedCvProfileYear] = useState<string>("all");
  const [isProfileFilterOpen, setIsProfileFilterOpen] = useState<boolean>(false);
  const [isCvProfileFilterOpen, setIsCvProfileFilterOpen] = useState<boolean>(false);

  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [showGlobalSearchResults, setShowGlobalSearchResults] = useState(false);

  const { notifications } = useNotificationContext();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const formatIndonesianTime = (isoString?: string) => {
    if (!isoString) return 'Baru saja';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Baru saja';
      if (diffMins < 60) return `${diffMins} mnt lalu`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} jam lalu`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Kemarin';
      return new Date(isoString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Baru saja';
    }
  };

  const recordNotification = async (title: string, description: string, type: string) => {
    try {
      if (!user) return;
      await NotificationService.sendNotification(user, title, description, type);
    } catch (err) {
      console.error("Gagal menambahkan notifikasi:", err);
    }
  };

  // Compile dynamic activities & documents list
  const compiledActivities = useMemo(() => {
    const list: { id: string, desc: string, type: string, status: 'Selesai' | 'Dalam Proses' | 'Menunggu', time: string, rawDate?: string }[] = [];
    
    projects.forEach(p => {
      list.push({
        id: p.id || crypto.randomUUID(),
        desc: `Draft RUPS LB ${p.companyName || 'PT Baru'}`,
        type: 'RUPS LB',
        status: p.npwp ? 'Selesai' : 'Dalam Proses',
        time: 'Baru saja diupdate',
        rawDate: p.updatedAt || p.signingDate || ''
      });
    });
    
    rupstProjects.forEach(p => {
      list.push({
        id: p.id || crypto.randomUUID(),
        desc: `Draft RUPS Tahunan ${p.companyName || 'PT Baru'}`,
        type: 'RUPS Tahunan',
        status: p.rupstFiscalYear ? 'Selesai' : 'Dalam Proses',
        time: 'Baru saja diupdate',
        rawDate: p.updatedAt || p.signingDate || ''
      });
    });

    pendirianProjects.forEach(p => {
      list.push({
        id: p.id || crypto.randomUUID(),
        desc: `Pendirian PT ${p.companyName || 'PT Baru'}`,
        type: 'Pendirian PT',
        status: p.npwp ? 'Selesai' : 'Menunggu',
        time: 'Baru saja diupdate',
        rawDate: p.updatedAt || p.signingDate || ''
      });
    });

    // Sort by rawDate (descending)
    list.sort((a, b) => (b.rawDate || '').localeCompare(a.rawDate || ''));

    // Fallbacks if we don't have enough entries, to perfect matching screenshot
    const placeholders = [
      { id: 'p1', desc: 'Draft RUPS Tahunan PT Maju Sejahtera', type: 'RUPS Tahunan', status: 'Selesai' as const, time: '10 menit yang lalu' },
      { id: 'p2', desc: 'Draft RUPS LB PT Cemerlang Abadi', type: 'RUPS LB', status: 'Dalam Proses' as const, time: '1 jam yang lalu' },
      { id: 'p3', desc: 'Pendirian PT Berkah Nusantara', type: 'Pendirian PT', status: 'Menunggu' as const, time: '3 jam yang lalu' },
      { id: 'p4', desc: 'Perbaikan Data PT Sukses Mandiri', type: 'Perbaikan Data', status: 'Selesai' as const, time: '5 jam yang lalu' },
      { id: 'p5', desc: 'Draft RUPST Public PT Global Teknologi', type: 'RUPST Public', status: 'Dalam Proses' as const, time: '1 hari yang lalu' }
    ];

    const finalActivities = [...list];
    placeholders.forEach(item => {
      if (finalActivities.length < 5) {
        finalActivities.push(item);
      }
    });

    return finalActivities.slice(0, 5);
  }, [projects, rupstProjects, pendirianProjects]);

  const compiledDocuments = useMemo(() => {
    const docs: { id: string, name: string, sub: string, format: 'DOCX' | 'PDF', project?: any, type: string }[] = [];

    rupstProjects.forEach(p => {
      docs.push({
        id: p.id || crypto.randomUUID(),
        name: `Notulen RUPS Tahunan ${p.rupstFiscalYear || '2025'}`,
        sub: p.companyName || 'PT Baru',
        format: 'DOCX',
        project: p,
        type: 'rupst'
      });
    });

    projects.forEach(p => {
      docs.push({
        id: p.id || crypto.randomUUID(),
        name: `Sirkuler RUPS LB`,
        sub: p.companyName || 'PT Baru',
        format: 'DOCX',
        project: p,
        type: 'notulen'
      });
    });

    pendirianProjects.forEach(p => {
      docs.push({
        id: p.id || crypto.randomUUID(),
        name: `Akta Pendirian PT`,
        sub: p.companyName || 'PT Baru',
        format: 'DOCX',
        project: p,
        type: 'pendirian'
      });
    });

    const placeholders = [
      { id: 'd1', name: 'Notulen RUPS Tahunan 2025', sub: 'PT Maju Sejahtera', format: 'DOCX' as const, type: 'rupst' },
      { id: 'd2', name: 'Sirkuler RUPS LB', sub: 'PT Cemerlang Abadi', format: 'PDF' as const, type: 'notulen' },
      { id: 'd3', name: 'Akta Pendirian PT', sub: 'PT Berkah Nusantara', format: 'DOCX' as const, type: 'pendirian' },
      { id: 'd4', name: 'Surat Permohonan Perbaikan Data', sub: 'PT Sukses Mandiri', format: 'PDF' as const, type: 'perbaikan' },
      { id: 'd5', name: 'Notulen RUPST Public', sub: 'PT Global Teknologi', format: 'DOCX' as const, type: 'rupst_public' }
    ];

    const finalDocs = [...docs];
    placeholders.forEach(item => {
      if (finalDocs.length < 5) {
        finalDocs.push(item);
      }
    });

    return finalDocs.slice(0, 5);
  }, [projects, rupstProjects, pendirianProjects]);



  const getDeduplicatedNames = () => {
    const names = new Set<string>();
    
    if (data.shareholders) {
      data.shareholders.forEach(s => { if (s.name) names.add(s.name.trim()); });
    }
    if (data.finalShareholders) {
      data.finalShareholders.forEach(s => { if (s.name) names.add(s.name.trim()); });
    }
    if (data.oldManagementItems) {
      data.oldManagementItems.forEach(s => { if (s.name) names.add(s.name.trim()); });
    }
    if (data.newManagementItems) {
      data.newManagementItems.forEach(s => { if (s.name) names.add(s.name.trim()); });
    }
    
    return Array.from(names).sort();
  };

  const matchesGlobalSearch = useMemo(() => {
    if (!globalSearchQuery) return [];
    const q = globalSearchQuery.toLowerCase();
    const results: { id: string; title: string; subtitle: string; type: string; tabId: SidebarTabId; action?: () => void }[] = [];

    const menus = [
      { id: 'm-kp', title: 'Menu: Klien', subtitle: 'Kelola profile klien badan usaha', type: 'menu', tabId: 'company_profile' as const },
      { id: 'm-rlb', title: 'Menu: RUPS LB', subtitle: 'Keputusan Sirkuler & PKR LB', type: 'menu', tabId: 'notulen' as const },
      { id: 'm-rt', title: 'Menu: RUPS Tahunan', subtitle: 'Pertanggungjawaban tahun buku', type: 'menu', tabId: 'rupst' as const },
      { id: 'm-pp', title: 'Menu: Pendirian PT', subtitle: 'Draft akta pendirian', type: 'menu', tabId: 'pendirian' as const },
      { id: 'm-kbli', title: 'Menu: Mapping KBLI', subtitle: 'Klasifikasi Baku Lapangan Usaha', type: 'menu', tabId: 'kbli_mapping' as const },
      { id: 'm-sar', title: 'Menu: Saran KBLI', subtitle: 'Bantuan pemilihan KBLI', type: 'menu', tabId: 'saran_kbli' as const },
      { id: 'm-per', title: 'Menu: Surat Perbaikan Data', subtitle: 'Pembetulan data AHU', type: 'menu', tabId: 'perbaikan' as const },
    ];

    menus.forEach(m => {
      if (m.title.toLowerCase().includes(q) || m.subtitle.toLowerCase().includes(q)) {
        results.push(m);
      }
    });

    profiles.forEach(p => {
      if (p.companyName && p.companyName.toLowerCase().includes(q)) {
        results.push({
          id: p.id || '',
          title: `Klien: ${p.companyName}`,
          subtitle: `${p.clientType || 'PT'} - ${p.newAddress?.city || 'Profile Klien'}`,
          type: 'klien',
          tabId: 'company_profile',
          action: () => {
            setEditingProfileId(p.id);
            setIsProfilePreview(true);
            updateData({ ...INITIAL_STATE, ...p } as any);
          }
        });
      }
    });

    projects.forEach(p => {
      if (p.companyName && p.companyName.toLowerCase().includes(q)) {
        results.push({
          id: p.id || '',
          title: `RUPS LB: ${p.companyName}`,
          subtitle: `Draft RUPS LB`,
          type: 'rupslb',
          tabId: 'notulen',
          action: () => {
            setEditingProjectId(p.id);
            updateData({ ...INITIAL_STATE, ...p } as any);
          }
        });
      }
    });

    rupstProjects.forEach(p => {
      if (p.companyName && p.companyName.toLowerCase().includes(q)) {
        results.push({
          id: p.id || '',
          title: `RUPST: ${p.companyName}`,
          subtitle: `Tahun Buku ${p.rupstFiscalYear || '2025'}`,
          type: 'rupst',
          tabId: 'rupst',
          action: () => {
            setEditingRupstId(p.id);
            updateData({ ...INITIAL_STATE, ...p } as any);
          }
        });
      }
    });

    cvProfiles.forEach(p => {
      if (p.companyName && p.companyName.toLowerCase().includes(q)) {
        results.push({
          id: p.id || '',
          title: `Klien CV: ${p.companyName}`,
          subtitle: p.domicile || 'Profile Klien CV',
          type: 'klien',
          tabId: 'cv_profile',
          action: () => {
            setEditingCvProfileId(p.id);
            setIsProfilePreview(true);
            updateData({ ...INITIAL_STATE, ...p } as any);
          }
        });
      }
    });

    return results.slice(0, 8);
  }, [globalSearchQuery, profiles, projects, rupstProjects, cvProfiles]);

  const filteredProjects = projects.filter(p => {
    if (!notulenSearchQuery) return true;
    const q = notulenSearchQuery.toLowerCase();
    return (
      (p.companyName && p.companyName.toLowerCase().includes(q)) ||
      (p.newAddress?.city && p.newAddress.city.toLowerCase().includes(q))
    );
  });

  const filteredProfiles = profiles.filter(p => {
    if (!profileSearchQuery) return true;
    const q = profileSearchQuery.toLowerCase();
    return (
      (p.companyName && p.companyName.toLowerCase().includes(q)) ||
      (p.newAddress?.city && p.newAddress.city.toLowerCase().includes(q))
    );
  });

  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isFetchingNumbers, setIsFetchingNumbers] = useState(false);

  const handleFetchLatestNumbers = async () => {
    setIsFetchingNumbers(true);
    try {
      const numbers = await fetchLatestDeedNumbers(data.draftAktaRupsDate || new Date().toISOString().split('T')[0]);
      updateData({
        draftAktaRupsNumber: numbers.nextDeedNumber,
        draftAktaRupsOrderNumber: numbers.nextOrderNumber
      });
    } catch (error) {
      alert("Gagal mengambil nomor akta terbaru.");
    } finally {
      setIsFetchingNumbers(false);
    }
  };
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenDropdownId(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  const handleLogout = async () => {
    setDataLoading(false);
    await logout();
  };

  const handleDuplicateProfile = async (profile: CompanyProfile) => {
    if (!user) return alert('Anda harus login!');
    try {
      const isCv = profile.companyType === 'CV';
      const duplicated = await duplicateCompany(profile, isCv);
      recordNotification(
        isCv ? 'Klien CV Diduplikat' : 'Klien PT Diduplikat',
        `Klien ${isCv ? 'CV' : 'PT'} "${profile.companyName}" telah diduplikat menjadi "${duplicated.companyName}".`,
        'create_profile'
      );
      alert('Profil berhasil diduplikat!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `profiles`);
    }
  };

  const handleArchiveProfile = async (profile: CompanyProfile) => {
    if (!user) return alert('Anda harus login!');
    const isCv = profile.companyType === 'CV';
    const toggleArchive = !profile.isArchived;
    try {
      await archiveCompany(profile.id, profile.isArchived, isCv);
      recordNotification(
        toggleArchive ? (isCv ? 'Klien CV Diarsipkan' : 'Klien PT Diarsipkan') : (isCv ? 'Klien CV Dipulihkan' : 'Klien PT Dipulihkan'),
        `Profil klien "${profile.companyName}" telah ${toggleArchive ? 'diarsipkan' : 'dipulihkan'} oleh ${user.email || 'Admin'}.`,
        'update_profile'
      );
      alert(`Profil berhasil ${toggleArchive ? 'diarsipkan' : 'dipulihkan'}!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `profiles/${profile.id}`);
    }
  };

  // Fail-safe to ensure loader disappears even with network failure
  useEffect(() => {
    const timer = setTimeout(() => {
      setDataLoading(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  const [editingRupstPublicId, setEditingRupstPublicId] = useState<string | null>(null);
  const [editingCvProfileId, setEditingCvProfileId] = useState<string | null>(null);

  const [isProfilePreview, setIsProfilePreview] = useState<boolean>(false);
  const [isRupstPreview, setIsRupstPreview] = useState<boolean>(false);
  const [isRupsPreview, setIsRupsPreview] = useState<boolean>(false);
  const [isRupstDocDropdownOpen, setIsRupstDocDropdownOpen] = useState<boolean>(false);
  const [isRupslbDocDropdownOpen, setIsRupslbDocDropdownOpen] = useState<boolean>(false);
  const [rupslbDropdownId, setRupslbDropdownId] = useState<string | null>(null);
  const [rupstDropdownId, setRupstDropdownId] = useState<string | null>(null);
  const [isPtGroupOpen, setIsPtGroupOpen] = useState(true);

  const [editMode, setEditMode] = useState<'lama' | 'baru' | 'pengganti' | 'pengganti_saham' | null>(null);
  const [editingDismissalId, setEditingDismissalId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [newKbliId, setNewKbliId] = useState<string | null>(null);

  // States for "Saran KBLI"-style modal search inside RUPS LB
  const [isAddKbliModalOpen, setIsAddKbliModalOpen] = useState(false);
  const [kbliModalSearchTerm, setKbliModalSearchTerm] = useState('');
  const [kbliModalSearchResults, setKbliModalSearchResults] = useState<any[]>([]);
  const [kbliCurrentPage, setKbliCurrentPage] = useState(1);
  const [kbliCheckedKblis, setKbliCheckedKblis] = useState<string[]>([]);

  // Initialize KBLI 2025 search results
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

    const searchStr = kbliModalSearchTerm.toLowerCase().trim();
    const keywords = searchStr.split(/\s+/).filter(k => k.length > 0);

    const filtered = (kbli2025Data.data as any[]).filter(item => {
      const kodeMatch = item.kode.includes(searchStr);
      const judul = (item.judul || '').toLowerCase();
      const uraian = (item.uraian || '').toLowerCase();

      if (/^\d+$/.test(searchStr)) {
        return item.kode.startsWith(searchStr);
      }

      return kodeMatch || keywords.every(kw => judul.includes(kw) || uraian.includes(kw));
    });

    const sortedFiltered = [...filtered].sort((a: any, b: any) => a.kode.localeCompare(b.kode));
    setKbliModalSearchResults(sortedFiltered);
  };

  const handleKbliModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performKbliModalSearch();
    }
  };

  const kbliItemsPerPage = 10;
  const kbliTotalPages = Math.ceil(kbliModalSearchResults.length / kbliItemsPerPage);
  
  const kbliPaginatedResults = useMemo(() => {
    return kbliModalSearchResults.slice(
      (kbliCurrentPage - 1) * kbliItemsPerPage,
      kbliCurrentPage * kbliItemsPerPage
    );
  }, [kbliCurrentPage, kbliModalSearchResults]);

  const handleToggleKbliChecked = (kode: string) => {
    setKbliCheckedKblis((prev) =>
      prev.includes(kode) ? prev.filter((k) => k !== kode) : [...prev, kode]
    );
  };

  const handleToggleAllKbliOnPage = () => {
    const pageKodes = kbliPaginatedResults.map(r => r.kode);
    const allChecked = pageKodes.every(k => kbliCheckedKblis.includes(k));
    if (allChecked) {
      setKbliCheckedKblis(prev => prev.filter(k => !pageKodes.includes(k)));
    } else {
      setKbliCheckedKblis(prev => {
        const next = [...prev];
        pageKodes.forEach(k => {
          if (!next.includes(k)) next.push(k);
        });
        return next;
      });
    }
  };

  const getKbliPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 10;
    let start = Math.max(1, kbliCurrentPage - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;
    if (end > kbliTotalPages) {
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
      kbliCheckedKblis.includes(item.kode) && !data.kbliItems.some(i => i.code === item.kode)
    );

    if (itemsToAdd.length === 0) {
      setIsAddKbliModalOpen(false);
      return;
    }

    const newKbliItems: KbliItem[] = itemsToAdd.map(item => {
      // Find category info
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

    updateData({ kbliItems: [...newKbliItems, ...data.kbliItems] });
    setKbliCheckedKblis([]);
    setIsAddKbliModalOpen(false);
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [presetLoadedForProject, setPresetLoadedForProject] = useState<string | null>(null);
  // Guards against duplicate/racy concurrent fetch-and-match runs of the
  // project-preset-loading effect below (see usage for details).
  const presetFetchInFlightRef = useRef<string | null>(null);
  const [presetRetryTick, setPresetRetryTick] = useState(0);
  const presetRetryCountRef = useRef<Record<string, number>>({});
  const [pendirianPreset, setPendirianPreset] = useState<any>(null);
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
    const params = new URLSearchParams(location.search);
    const projId = params.get('projectId');
    const docId = params.get('id');
    
    if (projId || docId) {
      if (projId) {
        setActiveProjectContext(projId);
      }
      
      if (docId) {
        if (location.pathname === '/rupst') {
          setEditingRupstId(docId);
        } else if (location.pathname === '/rupslb') {
          setEditingProjectId(docId);
        } else if (location.pathname === '/pendirian') {
          setEditingPendirianId(docId);
        }
      }
      
      // Clean query parameter from URL using navigate to prevent auto-open loop
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, location.pathname, navigate, setActiveProjectContext, setEditingRupstId, setEditingProjectId, setEditingPendirianId]);

  useEffect(() => {
    setPresetLoadedForProject(null);
    setPendirianPreset(null);
  }, [activeProjectContext]);

  // Fetch project jobType details when activeProjectContext is set
  useEffect(() => {
    if (activeProjectContext) {
      ProjectService.getProject(activeProjectContext)
        .then((proj) => {
          if (proj) {
            setActiveProjectJobType(proj.jobType);
          }
        })
        .catch((err) => {
          console.error("Error fetching active project details:", err);
        });
    } else {
      setActiveProjectJobType(null);
    }
  }, [activeProjectContext]);

  // Handle auto-opening of document editors when activeProjectContext is set
  const findMatchedProfile = (proj: any, profilesList: any[]) => {
    if (!proj || !profilesList || profilesList.length === 0) return null;
    
    // 1. Try matching by exact clientId
    if (proj.clientId) {
      const directMatch = profilesList.find(p => p.id === proj.clientId);
      if (directMatch) return directMatch;
      
      // 2. Try matching by clientId after trimming
      const cleanId = proj.clientId.trim();
      const cleanMatch = profilesList.find(p => p.id && p.id.trim() === cleanId);
      if (cleanMatch) return cleanMatch;
    }
    
    // 3. Try matching by company name extracted from project title (splitting by "—")
    if (proj.title && proj.title.includes('—')) {
      const parts = proj.title.split('—');
      const nameFromTitle = parts[1]?.trim().toLowerCase();
      if (nameFromTitle) {
        const nameMatch = profilesList.find(p => {
          const pName = p.companyName?.trim().toLowerCase();
          return pName && (pName === nameFromTitle || pName.includes(nameFromTitle) || nameFromTitle.includes(pName));
        });
        if (nameMatch) return nameMatch;
      }
    }
    
    // 4. Try matching by companyName or targetCompanyName on project companyName field
    if (proj.companyName) {
      const cleanCompName = proj.companyName.trim().toLowerCase();
      const nameMatch = profilesList.find(p => {
        const pName = p.companyName?.trim().toLowerCase();
        return pName && (pName === cleanCompName || pName.includes(cleanCompName) || cleanCompName.includes(pName));
      });
      if (nameMatch) return nameMatch;
    }
    
    // 5. Try matching by companyName anywhere in the project title
    if (proj.title) {
      const cleanTitle = proj.title.toLowerCase();
      const nameMatch = profilesList.find(p => {
        const pName = p.companyName?.trim().toLowerCase();
        return pName && cleanTitle.includes(pName);
      });
      if (nameMatch) return nameMatch;
    }
    
    return null;
  };

  useEffect(() => {
    if (activeProjectContext) {
      if (activeSidebarTab === 'rupst' && presetLoadedForProject !== activeProjectContext) {
        if (editingRupstId && editingRupstId !== 'new') {
          // If we're editing an existing doc, don't run preset logic (which would overwrite saved state)
          setPresetLoadedForProject(activeProjectContext);
          return;
        }
        if (!editingRupstId) {
          setEditingRupstId('new');
          setIsRupstPreview(false);
        }
        // Guard: prevent duplicate concurrent fetch/match runs for the same project.
        // (This effect can re-fire when setEditingRupstId above triggers a re-render,
        // since editingRupstId is in the dependency list — without this guard, two
        // concurrent ProjectService.getProject() calls can race and the losing run
        // can lock in presetLoadedForProject with an incomplete result.)
        if (
          (profiles.length > 0 || !dataLoading) &&
          presetFetchInFlightRef.current !== `rupst:${activeProjectContext}`
        ) {
          presetFetchInFlightRef.current = `rupst:${activeProjectContext}`;
          ProjectService.getProject(activeProjectContext)
            .then((proj) => {
              if (proj) {
                const defaultType = proj.jobType === 'sirkuler' ? 'sirkuler' : 'rapat';
                const matchedProfile = findMatchedProfile(proj, profiles);
                console.log('[ProjectPreset:rupst]', {
                  activeProjectContext,
                  profilesCount: profiles.length,
                  projClientId: proj.clientId,
                  projTitle: proj.title,
                  matched: !!matchedProfile,
                  matchedId: matchedProfile?.id,
                  matchedShareholders: matchedProfile?.shareholders?.length,
                  matchedOldManagementItems: matchedProfile?.oldManagementItems?.length,
                  matchedDomicile: matchedProfile?.domicile,
                });
                if (matchedProfile) {
                  const {
                    id, 
                    resolutions, 
                    targetCapitalBase, 
                    targetCapitalPaid,
                    targetCompanyName, 
                    targetShareholders, 
                    newManagementItems,
                    ...rest
                  } = matchedProfile as any;
                  
                  // Ensure address fields from profile are mapped to "old" fields for RUPS context
                  const updates = { 
                    ...INITIAL_STATE, 
                    rupstType: defaultType, 
                    ...rest, 
                    selectedProfileId: matchedProfile.id,
                    oldFullAddress: rest.fullAddress || rest.oldFullAddress,
                    oldAddress: rest.newAddress || rest.oldAddress,
                    oldDomicile: rest.domicile || rest.oldDomicile
                  };

                  updateData(updates as any);
                  setPresetLoadedForProject(activeProjectContext);
                } else if (!dataLoading && profiles.length > 0) {
                  console.warn('[ProjectPreset:rupst] No matched profile found — falling back to title-only. clientId on project was:', proj.clientId);
                  updateData({ ...INITIAL_STATE, rupstType: defaultType, companyName: proj.title || '' } as any);
                  setPresetLoadedForProject(activeProjectContext);
                } else {
                  const retryKey = `rupst:${activeProjectContext}`;
                  const attempts = (presetRetryCountRef.current[retryKey] || 0) + 1;
                  presetRetryCountRef.current[retryKey] = attempts;
                  if (attempts > 8) {
                    console.error('[ProjectPreset:rupst] Giving up after 8 retries — profiles still empty. Falling back to title-only.');
                    updateData({ ...INITIAL_STATE, rupstType: defaultType, companyName: proj.title || '' } as any);
                    setPresetLoadedForProject(activeProjectContext);
                  } else {
                    console.warn(`[ProjectPreset:rupst] profiles not loaded yet (profilesCount=0), retry ${attempts}/8 in 700ms...`);
                    setTimeout(() => setPresetRetryTick(t => t + 1), 700);
                  }
                }
              }
            })
            .catch((err) => {
              console.error('Error fetching project for RUPST preset:', err);
              updateData({ ...INITIAL_STATE } as any);
              setPresetLoadedForProject(activeProjectContext);
            })
            .finally(() => {
              presetFetchInFlightRef.current = null;
            });
        }
      } else if (activeSidebarTab === 'notulen' && presetLoadedForProject !== activeProjectContext) {
        if (editingProjectId && editingProjectId !== 'new') {
          // If we're editing an existing doc, don't run preset logic (which would overwrite saved state)
          setPresetLoadedForProject(activeProjectContext);
          return;
        }
        if (!editingProjectId) {
          setEditingProjectId('new');
          setIsRupsPreview(false);
        }
        if (
          (profiles.length > 0 || !dataLoading) &&
          presetFetchInFlightRef.current !== `notulen:${activeProjectContext}`
        ) {
          presetFetchInFlightRef.current = `notulen:${activeProjectContext}`;
          ProjectService.getProject(activeProjectContext)
            .then((proj) => {
              if (proj) {
                const defaultType = proj.jobType === 'sirkuler_rupslb' ? 'CIRCULAR' : 'MINUTES';
                const matchedProfile = findMatchedProfile(proj, profiles);
                console.log('[ProjectPreset:notulen]', {
                  activeProjectContext,
                  profilesCount: profiles.length,
                  projClientId: proj.clientId,
                  projTitle: proj.title,
                  matched: !!matchedProfile,
                  matchedId: matchedProfile?.id,
                  matchedShareholders: matchedProfile?.shareholders?.length,
                  matchedOldManagementItems: matchedProfile?.oldManagementItems?.length,
                  matchedDomicile: matchedProfile?.domicile,
                });
                if (matchedProfile) {
                  const {
                    id, 
                    resolutions, 
                    targetCapitalBase, 
                    targetCapitalPaid,
                    targetCompanyName, 
                    targetShareholders, 
                    newManagementItems,
                    ...rest
                  } = matchedProfile as any;
                  
                  const updates = { 
                    ...INITIAL_STATE, 
                    documentType: defaultType, 
                    ...rest, 
                    selectedProfileId: matchedProfile.id,
                    oldFullAddress: rest.fullAddress || rest.oldFullAddress,
                    oldAddress: rest.newAddress || rest.oldAddress,
                    oldDomicile: rest.domicile || rest.oldDomicile
                  };

                  updateData(updates as any);
                  setPresetLoadedForProject(activeProjectContext);
                } else if (!dataLoading && profiles.length > 0) {
                  console.warn('[ProjectPreset:notulen] No matched profile found — falling back to title-only. clientId on project was:', proj.clientId);
                  updateData({ ...INITIAL_STATE, documentType: defaultType, companyName: proj.title || '' } as any);
                  setPresetLoadedForProject(activeProjectContext);
                } else {
                  const retryKey = `notulen:${activeProjectContext}`;
                  const attempts = (presetRetryCountRef.current[retryKey] || 0) + 1;
                  presetRetryCountRef.current[retryKey] = attempts;
                  if (attempts > 8) {
                    console.error('[ProjectPreset:notulen] Giving up after 8 retries — profiles still empty. Falling back to title-only.');
                    updateData({ ...INITIAL_STATE, documentType: defaultType, companyName: proj.title || '' } as any);
                    setPresetLoadedForProject(activeProjectContext);
                  } else {
                    console.warn(`[ProjectPreset:notulen] profiles not loaded yet (profilesCount=0), retry ${attempts}/8 in 700ms...`);
                    setTimeout(() => setPresetRetryTick(t => t + 1), 700);
                  }
                }
              }
            })
            .catch((err) => {
              console.error('Error fetching project for RUPS LB preset:', err);
              updateData({ ...INITIAL_STATE } as any);
              setPresetLoadedForProject(activeProjectContext);
            })
            .finally(() => {
              presetFetchInFlightRef.current = null;
            });
        }
      } else if (activeSidebarTab === 'pendirian' && presetLoadedForProject !== activeProjectContext) {
        if (!editingPendirianId) {
          setEditingPendirianId('new');
          setPendirianPreset(null);
        }
        if (profiles.length > 0 || !dataLoading) {
          ProjectService.getProject(activeProjectContext)
            .then((proj) => {
              if (proj) {
                const matchedProfile = findMatchedProfile(proj, profiles);
                if (matchedProfile) {
                  const preset = mapCompanyProfileToPendirian(matchedProfile);
                  setPendirianPreset(preset);
                  setPresetLoadedForProject(activeProjectContext);
                } else if (!dataLoading) {
                  setPendirianPreset({ namaPt: proj.title?.toUpperCase() || '' });
                  setPresetLoadedForProject(activeProjectContext);
                }
              }
            })
            .catch((err) => {
              console.error('Error fetching project for Pendirian preset:', err);
              setPendirianPreset(null);
              setPresetLoadedForProject(activeProjectContext);
            });
        }
      }
    }
  }, [activeProjectContext, activeSidebarTab, profiles, dataLoading, presetLoadedForProject, editingRupstId, editingProjectId, editingPendirianId, presetRetryTick]);

  // Effect to automatically load existing document data into editor when editingProjectId or editingRupstId changes
  useEffect(() => {
    if (editingProjectId && editingProjectId !== 'new') {
      const existingProject = projects.find(p => p.id === editingProjectId);
      if (existingProject) {
        if (data.id !== editingProjectId) {
          updateData({ ...INITIAL_STATE, ...existingProject } as any);
        }
      }
    }
  }, [editingProjectId, projects, updateData, data.id]);

  useEffect(() => {
    if (editingRupstId && editingRupstId !== 'new') {
      const existingRupst = rupstProjects.find(p => p.id === editingRupstId);
      if (existingRupst) {
        if (data.id !== editingRupstId) {
          updateData({ ...INITIAL_STATE, ...existingRupst } as any);
        }
      }
    }
  }, [editingRupstId, rupstProjects, updateData, data.id]);

  // Auto-Save States & Logic
  const [currentPendirianData, setCurrentPendirianData] = useState<any>(null);

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

  const AutoSaveIndicatorComponent = () => {
    if (isAutoSaving) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md animate-pulse shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
          Menyimpan otomatis...
        </span>
      );
    }
    if (lastAutoSavedAt) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
          Tersimpan otomatis: {lastAutoSavedAt}
        </span>
      );
    }
    return null;
  };

  const [zoom, setZoom] = useState(1);
  const [showPendirianPreview, setShowPendirianPreview] = useState(false);
  const [pendirianPreviewData, setPendirianPreviewData] = useState<any>(null);


  useEffect(() => {
    localStorage.setItem('legal-draft-data-v25-final', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (data.documentType === 'MINUTES') {
      const RESOLUTION_LABELS: Record<keyof ResolutionFlags, string> = {
        companyNameChange: 'Persetujuan Perubahan Nama Perseroan',
        domicile: 'Persetujuan Perubahan Tempat Kedudukan Perseroan',
        address: 'Persetujuan Perubahan Alamat Lengkap Perseroan',
        kbli: 'Persetujuan Perubahan Maksud dan Tujuan (KBLI) Perseroan',
        capitalBase: 'Persetujuan Peningkatan Modal Dasar Perseroan',
        capitalPaid: 'Persetujuan Peningkatan Modal Ditempatkan dan Disetor Perseroan',
        capitalBaseDecrease: 'Persetujuan Penurunan Modal Dasar Perseroan',
        capitalPaidDecrease: 'Persetujuan Penurunan Modal Ditempatkan dan Disetor Perseroan',
        shareholders: 'Persetujuan Perubahan Susunan Pemegang Saham Perseroan',
        reappointment: 'Persetujuan Pengangkatan Kembali Susunan Pengurus Perseroan',
        management: 'Persetujuan Perubahan Susunan Pengurus Perseroan'
      };

      const agendaOrder = [
        'companyNameChange',
        'domicile',
        'address',
        'kbli',
        'capitalBase',
        'capitalPaid',
        'capitalBaseDecrease',
        'capitalPaidDecrease',
        'shareholders',
        'reappointment',
        'management'
      ] as const;

      const selectedAgendas = agendaOrder
        .filter(key => data.resolutions[key])
        .map((key, idx) => `${idx + 1}. ${RESOLUTION_LABELS[key]}`);
      
      const newAgenda = selectedAgendas.join('\n');
      
      if (data.meetingAgenda !== newAgenda) {
        updateData({ meetingAgenda: newAgenda });
      }
    }
  }, [data.documentType, data.resolutions]);



  // Synchronize new shareholders initially if completely empty
  // Also calculate final composition automatically when share transfers or capital subscriptions are filled
  useEffect(() => {
    const hasShareholderChange = !!data.resolutions.shareholders;
    const hasCapitalChange = !!(data.resolutions.capitalPaid || data.resolutions.capitalPaidDecrease);

    if (hasShareholderChange || hasCapitalChange) {
      // Start with original shareholders
      const calculated: Shareholder[] = (data.shareholders || []).map(s => ({
        ...s,
        sharesOwned: s.sharesOwned,
        isNewDeposit: false,
        newDepositShares: 0
      }));

      // Apply share transfers if any
      if (hasShareholderChange && data.shareTransfersNew && data.shareTransfersNew.length > 0) {
        data.shareTransfersNew.forEach(t => {
          if (!t.fromName || !t.toName || t.sharesTransferred <= 0) return;

          // Deduct from sender
          const sender = calculated.find(s => s.name?.toUpperCase().trim() === t.fromName.toUpperCase().trim());
          if (sender) {
            sender.sharesOwned = Math.max(0, sender.sharesOwned - t.sharesTransferred);
          }

          // Add to recipient
          const recipientNameUpper = t.toName.toUpperCase().trim();
          const recipient = calculated.find(s => s.name?.toUpperCase().trim() === recipientNameUpper);
          if (recipient) {
            recipient.sharesOwned += t.sharesTransferred;
          } else {
            let newSh: Shareholder;
            if (t.toType === 'NEW' && t.toDetail) {
              newSh = {
                ...t.toDetail,
                sharesOwned: t.sharesTransferred
              };
            } else {
              newSh = {
                id: t.id + '-to',
                name: t.toName,
                nik: t.toNik || '',
                salutation: t.toSalutation || 'Tuan',
                sharesOwned: t.sharesTransferred,
                isManagement: false,
                birthCity: '',
                birthDate: '',
                nationality: 'WNI',
                nationalityType: 'WNI',
                occupation: '',
                address: { province: '', city: '', fullAddress: '', rt: '', rw: '', kelurahan: '', kecamatan: '' }
              };
            }
            calculated.push(newSh);
          }
        });
      }

      // Apply capital subscriptions if any
      if (hasCapitalChange && data.capitalSubscriptionsNew && data.capitalSubscriptionsNew.length > 0) {
        // Implement finding person details by name
        const findPersonDetailsByName = (name: string): any => {
          if (!name) return null;
          const targetName = name.trim().toUpperCase();

          const fromSh = (data.shareholders || []).find((s: any) => s.name && s.name.trim().toUpperCase() === targetName);
          if (fromSh && (fromSh.birthCity || fromSh.nik || fromSh.address?.fullAddress)) {
            return fromSh;
          }

          const fromGuest = (data.guests || []).find((g: any) => g.name && g.name.trim().toUpperCase() === targetName);
          if (fromGuest && (fromGuest.birthCity || fromGuest.nik || fromGuest.address?.fullAddress)) {
            return fromGuest;
          }

          if (data.shareTransfersNew) {
            for (const t of data.shareTransfersNew) {
              if (t.toName && t.toName.trim().toUpperCase() === targetName && t.toDetail) {
                return t.toDetail;
              }
            }
          }

          if (data.managementDismissals) {
            for (const d of data.managementDismissals) {
              if (d.replacedByName && d.replacedByName.trim().toUpperCase() === targetName && d.replacedByDetail) {
                return d.replacedByDetail;
              }
            }
          }

          if (fromSh) return fromSh;
          return null;
        };

        data.capitalSubscriptionsNew.forEach(item => {
          if (!item.subscriberName || item.sharesCount <= 0) return;
          const nameUpper = item.subscriberName.toUpperCase().trim();
          const existing = calculated.find(s => s.name?.toUpperCase().trim() === nameUpper);

          if (existing) {
            existing.sharesOwned += item.sharesCount;
            existing.isNewDeposit = true;
            existing.newDepositShares = (existing.newDepositShares || 0) + item.sharesCount;
          } else {
            const personDetail = findPersonDetailsByName(item.subscriberName);
            let newSh: Shareholder;
            if (personDetail) {
              newSh = {
                ...personDetail,
                sharesOwned: item.sharesCount,
                isNewDeposit: true,
                newDepositShares: item.sharesCount
              };
            } else {
              newSh = {
                id: item.id + '-sub',
                name: item.subscriberName,
                nik: '',
                salutation: 'Tuan',
                sharesOwned: item.sharesCount,
                isNewDeposit: true,
                newDepositShares: item.sharesCount,
                isManagement: false,
                birthCity: '',
                birthDate: '',
                nationality: 'WNI',
                nationalityType: 'WNI',
                occupation: '',
                address: { province: '', city: '', fullAddress: '', rt: '', rw: '', kelurahan: '', kecamatan: '' }
              };
            }
            calculated.push(newSh);
          }
        });
      }

      // Filter out people with 0 shares who are not management in the new state, to keep table neat
      const filteredCalculated = calculated.filter(s => s.sharesOwned > 0 || s.isManagement);

      const transfersNew = data.shareTransfersNew || [];
      const generatedTransfers: ShareTransfer[] = transfersNew.map(t => {
        const fromSh = data.shareholders.find(s => s.name?.toUpperCase().trim() === t.fromName.toUpperCase().trim());
        const toSh = filteredCalculated.find(s => s.name?.toUpperCase().trim() === t.toName.toUpperCase().trim());
        
        return {
          id: t.id,
          type: t.transferType === 'HIBAH' ? 'Hibah' : 'Jual Beli',
          fromShareholderId: fromSh?.id || 'from-' + t.id,
          toShareholderId: toSh?.id || 'to-' + t.id,
          sharesTransferred: t.sharesTransferred
        };
      });

      const finalShString = JSON.stringify(filteredCalculated.map(f => ({ id: f.id, name: f.name, sharesOwned: f.sharesOwned, birthCity: f.birthCity, occupation: f.occupation })));
      const existingFinalShString = JSON.stringify(data.finalShareholders.map(f => ({ id: f.id, name: f.name, sharesOwned: f.sharesOwned, birthCity: f.birthCity, occupation: f.occupation })));

      const transfersString = JSON.stringify(generatedTransfers);
      const existingTransfersString = JSON.stringify(data.shareTransfers || []);

      if (finalShString !== existingFinalShString || transfersString !== existingTransfersString) {
        updateData({ 
          finalShareholders: filteredCalculated,
          shareTransfers: generatedTransfers
        });
      }
    } else {
      const initialShString = JSON.stringify((data.shareholders || []).map(f => ({ id: f.id, name: f.name, sharesOwned: f.sharesOwned, birthCity: f.birthCity, occupation: f.occupation })));
      const existingFinalShString = JSON.stringify((data.finalShareholders || []).map(f => ({ id: f.id, name: f.name, sharesOwned: f.sharesOwned, birthCity: f.birthCity, occupation: f.occupation })));
      
      if (initialShString !== existingFinalShString) {
        updateData({ finalShareholders: [...data.shareholders] });
      }
    }
  }, [
    data.resolutions.shareholders,
    data.resolutions.capitalPaid,
    data.resolutions.capitalPaidDecrease,
    data.shareholders,
    data.shareTransfersNew,
    data.capitalSubscriptionsNew,
    data.finalShareholders,
    data.shareTransfers,
    data.guests,
    data.managementDismissals
  ]);





  const updateAddress = (property: 'newAddress' | 'oldAddress', updates: Partial<Address>) => {
    updateData({
      [property]: { ...data[property], ...updates }
    } as any);
  };

  const handleQuestionChange = (questionKey: 'rupstQuestionA' | 'rupstQuestionB' | 'rupstQuestionC' | 'rupstQuestionD' | 'rupstQuestionE' | 'rupstQuestionF', answer: 'ya' | 'tidak') => {
    const updatedAnswers = {
      rupstQuestionA: data.rupstQuestionA,
      rupstQuestionB: data.rupstQuestionB,
      rupstQuestionC: data.rupstQuestionC,
      rupstQuestionD: data.rupstQuestionD,
      rupstQuestionE: data.rupstQuestionE,
      rupstQuestionF: data.rupstQuestionF,
      [questionKey]: answer
    };

    const isAudited = Object.values(updatedAnswers).some(val => val === 'ya');

    const updates: Partial<CompanyData> = {
      [questionKey]: answer,
      rupstIsAudited: isAudited,
      rupstAlasanAuditA: isAudited ? (updatedAnswers.rupstQuestionA === 'ya') : true,
      rupstAlasanAuditB: isAudited ? (updatedAnswers.rupstQuestionB === 'ya') : true,
      rupstAlasanAuditC: isAudited ? (updatedAnswers.rupstQuestionC === 'ya') : true,
      rupstAlasanAuditD: isAudited ? (updatedAnswers.rupstQuestionD === 'ya') : true,
      rupstAlasanAuditE: isAudited ? (updatedAnswers.rupstQuestionE === 'ya') : true,
      rupstAlasanAuditF: isAudited ? (updatedAnswers.rupstQuestionF === 'ya') : true,
    };

    if (isAudited) {
      updates.rupstStatementNeraca = true;
      updates.rupstStatementLabaRugi = true;
      updates.rupstStatementPerubahanEkuitas = true;
      updates.rupstStatementArusKas = true;
      updates.rupstStatementCatatan = true;
      updates.rupstStatementNamaAnggota = true;
      updates.rupstStatementGaji = true;
    }

    updateData(updates);
  };

  const updateManualRep = (updates: Partial<Shareholder>) => {
    setData(prev => ({
      ...prev,
      manualRepresentative: { ...prev.manualRepresentative!, ...updates }
    }));
  };

  const handleAuthorizedSharesChange = (valStr: string) => {
    const val = parseFormattedNumber(valStr);
    if (val < data.originalTotalShares) {
      alert(`Batas Terlampaui! Modal Dasar tidak boleh lebih kecil dari Modal Disetor (${data.originalTotalShares.toLocaleString('id-ID')} lembar).`);
      updateData({ originalAuthorizedShares: data.originalTotalShares });
    } else {
      updateAuthorizedShares(val);
    }
  };

  const updateAuthorizedShares = (val: number) => {
    updateData({ originalAuthorizedShares: val });
  };

  const handlePaidSharesChange = (valStr: string) => {
    const val = parseFormattedNumber(valStr);
    if (val > data.originalAuthorizedShares && data.originalAuthorizedShares > 0) {
      alert(`Batas Terlampaui! Modal Disetor tidak boleh melebihi Modal Dasar (${data.originalAuthorizedShares.toLocaleString('id-ID')} lembar).`);
      updateData({ originalTotalShares: data.originalAuthorizedShares });
    } else {
      updateData({ originalTotalShares: val });
    }
  };

  const toggleResolution = (key: keyof ResolutionFlags) => {
    const newVal = !data.resolutions[key];
    let updatedResolutions = { ...data.resolutions, [key]: newVal };
    
    // logic: jika mencentang kedudukan otomatis mencentang perubahan alamat lengkap
    if (key === 'domicile' && newVal) {
      updatedResolutions.address = true;
    }
    
    const updates: Partial<CompanyData> = { resolutions: updatedResolutions };

    if ((key === 'shareholders' || key === 'management') && newVal && data.finalShareholders.length === 0) {
      updates.finalShareholders = (data.shareholders || []).map(s => ({
        ...s,
        id: crypto.randomUUID(),
        linkedPartyId: s.id,
        isExistingParty: true
      }));
    }

    if (key === 'domicile' && newVal) {
      if (!data.oldDomicile) updates.oldDomicile = data.domicile;
      if (!data.oldAddress.city) {
        updates.oldAddress = { ...data.oldAddress, city: data.domicile };
      }
      setActiveTab('domicile');
    } else if (key === 'address' && newVal) {
      if (!data.oldAddress.fullAddress) {
          updates.oldAddress = { ...data.newAddress };
          updates.oldFullAddress = data.fullAddress;
      }
      setActiveTab('address');
    } else if (key === 'capitalBase' && newVal) {
      setActiveTab('capitalBase');
    } else if (key === 'capitalPaid' && newVal) {
      if (data.targetCapitalPaid === 0) updateData({ targetCapitalPaid: data.originalCapitalPaid });
      setActiveTab('capitalPaid');
    } else if (key === 'management' && newVal) {
      setActiveTab('management');
    } else if (key === 'reappointment' && newVal) {
      setActiveTab('reappointment');
    } else if (key === 'shareholders' && newVal) {
      setActiveTab('shareholders_new');
    }

    updateData(updates);
  };

  const addKbli = () => {
    const newItem: KbliItem = {
      id: crypto.randomUUID(),
      code: '',
      name: '',
      description: '',
      categoryLetter: '',
      categoryName: ''
    };
    updateData({ kbliItems: [newItem, ...data.kbliItems] });
  };

  const updateKbli = (id: string, updates: Partial<KbliItem>) => {
    updateData({
      kbliItems: (data.kbliItems || []).map(item => item.id === id ? { ...item, ...updates } : item)
    });
  };

  const removeKbli = (id: string) => {
    updateData({
      kbliItems: data.kbliItems.filter(item => item.id !== id)
    });
  };
  
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
    if (mode === 'lama') {
      const deletedShareholder = data.shareholders.find(s => s.id === id);
      const updatedShareholders = data.shareholders.filter(s => s.id !== id);
      const updatedFinalShareholders = data.finalShareholders.filter(fs => {
        // Remove if linked or matched name
        if (fs.linkedPartyId === id) return false;
        if (deletedShareholder && (fs.name || '').trim().toUpperCase() === (deletedShareholder.name || '').trim().toUpperCase()) return false;
        return true;
      });
      updateData({ 
        shareholders: updatedShareholders,
        finalShareholders: updatedFinalShareholders
      });
    } else {
      updateData({ finalShareholders: data.finalShareholders.filter(p => p.id !== id) });
    }
  };

  const saveShareholder = () => {
    if (!editingShareholder || !editMode) return;
    
    let sanitizedShareholder = { ...editingShareholder };

    if (editMode === 'pengganti') {
      if (editingDismissalId) {
        const updatedDismissals = (data.managementDismissals || []).map(t => {
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
        const updatedTransfers = (data.shareTransfersNew || []).map(t => {
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
    const hasCapitalChange = data.resolutions.capitalBase || data.resolutions.capitalPaid || data.resolutions.capitalBaseDecrease || data.resolutions.capitalPaidDecrease;
    const disableManagement = !isOld && !data.resolutions.management;
    const disableFinancials = !isOld && !data.resolutions.shareholders && !hasCapitalChange;

    if (disableFinancials) {
      // If financials are disabled, we want to force sharesOwned to not change from old if linked, 
      // but honestly if they can't edit it, it's safer to just let the logic below handle it, 
      // or set it to 0 if they're a completely new entry.
      // But actually, just to be safe, if they're not old, we shouldn't let them have shares if financial change is disabled.
      const oldShares = data.shareholders.find(s => s.id === sanitizedShareholder.linkedPartyId || (s.name || '').trim().toUpperCase() === (sanitizedShareholder.name || '').trim().toUpperCase())?.sharesOwned || 0;
      sanitizedShareholder.sharesOwned = oldShares;
    }

    // Explicit server-side-like limit check
    const currentList = editMode === 'lama' ? data.shareholders : data.finalShareholders;
    const limit = editMode === 'lama' ? data.originalTotalShares : ((data.resolutions.capitalPaid || data.resolutions.capitalPaidDecrease) ? currentTargetSharesPaid : data.originalTotalShares);
    const otherAllocated = currentList.filter(s => s.id !== sanitizedShareholder.id).reduce((sum, s) => {
      let shares = s.sharesOwned;
      // If we are in final list and current person is receiving shares from 's', 
      // we must subtract that from 's''s current shares for this limit check
      if (editMode === 'baru' && sanitizedShareholder.isAcquisition && (sanitizedShareholder.acquisitionSourceId === s.id || (s.linkedPartyId && sanitizedShareholder.acquisitionSourceId === s.linkedPartyId))) {
        shares = Math.max(0, shares - (sanitizedShareholder.acquisitionShares || 0));
      }
      return sum + shares;
    }, 0);
    if (sanitizedShareholder.sharesOwned > limit - otherAllocated) {
        alert(`Batas terlampaui! Maksimal sisa lembar yang tersedia adalah ${(limit - otherAllocated).toLocaleString('id-ID')} lembar.`);
        return;
    }

    let updatedShareholders = [...data.shareholders];
    let updatedFinalShareholders = [...data.finalShareholders];
    let updatedTransfers = [...(data.shareTransfers || [])];

    if (editMode === 'lama') {
      const exists = updatedShareholders.some(s => s.id === sanitizedShareholder.id);
      const oldShareholderData = updatedShareholders.find(s => s.id === sanitizedShareholder.id);

      updatedShareholders = exists 
        ? updatedShareholders.map(s => s.id === sanitizedShareholder.id ? sanitizedShareholder : s)
        : [...updatedShareholders, sanitizedShareholder];

      let foundInFinal = false;
      updatedFinalShareholders = updatedFinalShareholders.map(fs => {
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

      if (!foundInFinal && (data.finalShareholders.length > 0 || data.resolutions.shareholders)) {
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

        // Remove existing transfer for this receiver if any
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
        // If acquisition was unchecked, remove transfer for this receiver
        updatedTransfers = updatedTransfers.filter(t => t.toShareholderId !== sanitizedShareholder.id);
      }

      // Re-calculate sharesOwned for ALL final shareholders based on shareTransfers and newDeposits
      updatedFinalShareholders = tempFinal.map(fs => {
        // Find old shares for this person
        const oldSh = updatedShareholders.find(s => (s.name || '').trim().toUpperCase() === (fs.name || '').trim().toUpperCase());
        const baseShares = oldSh ? oldSh.sharesOwned : 0;
        
        const transfersIn = updatedTransfers.filter(t => t.toShareholderId === fs.id).reduce((sum, t) => sum + t.sharesTransferred, 0);
        const fromIdMatch1 = oldSh ? oldSh.id : null;
        const fromIdMatch2 = fs.linkedPartyId;
        const fromIdMatch3 = fs.id;
        
        const transfersOut = updatedTransfers.filter(t => 
             t.fromShareholderId === fromIdMatch1 
          || (fromIdMatch2 && t.fromShareholderId === fromIdMatch2) 
          || t.fromShareholderId === fromIdMatch3
        ).reduce((sum, t) => sum + t.sharesTransferred, 0);
        
        // Include their own explicit deposits
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


  const currentTargetSharesBase = data.originalSharePrice > 0 ? (data.targetCapitalBase / data.originalSharePrice) : 0;
  const currentTargetSharesPaid = data.originalSharePrice > 0 ? (data.targetCapitalPaid / data.originalSharePrice) : 0;

  const effectiveBaseCapital = data.resolutions.capitalBase ? data.targetCapitalBase : data.originalCapitalBase;
  const effectivePaidCapital = data.resolutions.capitalPaid ? data.targetCapitalPaid : data.originalCapitalPaid;
  const paidUpPercentage = effectiveBaseCapital > 0 
    ? Math.round((effectivePaidCapital / effectiveBaseCapital) * 100) 
    : 0;

  const isPublicRoute = window.location.pathname === '/rupst';

  if (authLoading || (user && dataLoading)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#2c3b41] font-sans text-white">
        <div className="text-center space-y-5 px-4 max-w-sm">
          <div className="relative flex items-center justify-center mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-slate-700/60 border-t-[#40bdae] animate-spin"></div>
            <ShieldCheck className="w-6 h-6 text-[#40bdae]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold tracking-tight text-white">Menginisialisasi Sistem</h2>
            <p className="text-[12px] font-mono text-slate-400">
              {authLoading ? "Memvalidasi kredensial..." : "Sinkronisasi profil & data draf..."}
            </p>
          </div>
          <div className="w-32 h-1 bg-slate-850 rounded-full mx-auto overflow-hidden relative">
            <div className="absolute top-0 bottom-0 left-0 bg-[#40bdae] rounded-full animate-[loading_1.5s_infinite_ease-in-out]" style={{ width: '40%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isPublicRoute && !user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#ecf0f5] font-sans text-slate-900">
        <div className="bg-white p-8 rounded-lg shadow-lg border border-slate-200 text-center max-w-sm w-full mx-4">
          <div className="w-16 h-16 bg-[#3b5998] rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold mb-2 text-[#3b5998]">Sistem Draft Notaris Putri</h1>
          <p className="text-[13px] text-slate-500 mb-6">Akses terbatas. Silakan login menggunakan akun Google Anda.</p>
          <button 
            onClick={() => loginWithGoogle()} 
            className="w-full py-2.5 bg-[#40bdae] hover:bg-[#349c8f] text-white font-bold rounded text-[14px] shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            LOGIN DENGAN GOOGLE
          </button>
        </div>
      </div>
    );
  }

  if (!isPublicRoute && user && user.email && !ALLOWED_EMAILS.includes(user.email)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#ecf0f5] font-sans text-slate-900">
        <div className="bg-white p-8 rounded-lg shadow-lg border border-slate-200 text-center max-w-sm w-full mx-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold mb-2 text-slate-800">Akses Ditolak</h1>
          <p className="text-[13px] text-slate-500 mb-6">
            Akun <b>{user.email}</b> tidak memiliki izin untuk mengakses sistem ini.
          </p>
          <button 
            onClick={() => handleLogout()} 
            className="w-full py-2.5 bg-[#d9534f] hover:bg-[#c9302c] text-white font-bold rounded text-[14px] shadow-sm transition-colors"
          >
            LOGOUT
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-slate-50 font-sans text-slate-800 overflow-hidden relative">
      
      {/* Dynamic Left Sidebar Spanning Full Height */}
      {user && (
        <Sidebar
          user={user}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          activeSidebarTab={activeSidebarTab}
          setActiveSidebarTab={setActiveSidebarTab}
          userProfile={userProfile}
          loginWithGoogle={loginWithGoogle}
        />
      )}

      {/* Main Container viewport on right side */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Dynamic Nav Header next to the Sidebar */}
        <Header
          user={user}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          userProfile={userProfile}
          notifications={notifications}
          isNotificationOpen={isNotificationOpen}
          setIsNotificationOpen={setIsNotificationOpen}
          isUserDropdownOpen={isUserDropdownOpen}
          setIsUserDropdownOpen={setIsUserDropdownOpen}
          setIsEditProfileModalOpen={setIsEditProfileModalOpen}
          setActiveSidebarTab={setActiveSidebarTab}
          loginWithGoogle={loginWithGoogle}
          logout={logout}
        />
          <main className="flex-1 overflow-y-auto bg-[#f8fafc] p-6 md:p-8 pb-24 scroll-smooth">
          
          {activeSidebarTab === 'user_management' && userProfile?.role === 'Super Admin' ? (
            <UserManagement currentUser={userProfile} />
          ) : activeSidebarTab === 'beranda' ? (
            <Dashboard
              profiles={profiles}
              projects={projects}
              rupstProjects={rupstProjects}
              pendirianProjects={pendirianProjects}
              compiledActivities={compiledActivities}
              compiledDocuments={compiledDocuments}
              setActiveSidebarTab={setActiveSidebarTab}
              setEditingProjectId={setEditingProjectId}
              setEditingRupstId={setEditingRupstId}
              updateData={updateData}
              INITIAL_STATE={INITIAL_STATE}
              handleDownloadProject={handleDownloadProject}
              currentUser={userProfile}
            />
          ) : activeSidebarTab === 'company_profile' ? (
            <CompanyPage />
          ) : activeSidebarTab === 'cv_profile' ? (
            <CompanyPage />
          ) : false ? (
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="flex justify-between items-center bg-white p-4 rounded-sm shadow-sm border border-slate-200">
                <div>
                  <h2 className="text-[16px] font-bold flex items-center gap-2 text-slate-800 uppercase"><Briefcase className="w-5 h-5 text-teal-600" /> Klien CV</h2>
                  <p className="text-[12px] text-slate-500">Kelola daftar profil klien CV (Persekutuan Komanditer)</p>
                </div>
                {!editingCvProfileId && (
                  <button onClick={() => {
                    setEditingCvProfileId('new');
                    setIsProfilePreview(false);
                    updateData({ ...INITIAL_STATE, companyType: 'CV' } as any);
                  }} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-sm font-bold text-[12px] flex items-center gap-2 transition-colors">
                    <Plus className="w-4 h-4" /> TAMBAH KLIEN CV
                  </button>
                )}
              </div>

              {editingCvProfileId ? (
                <div className="space-y-4 pb-20">
                  <div className="flex flex-wrap items-center gap-2 bg-slate-50/50 p-2 rounded-md border border-slate-200">
                    <button className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold text-[12px] uppercase bg-white px-3 py-2 rounded-sm border border-slate-200 shadow-sm" onClick={() => setEditingCvProfileId(null)}>
                      <ArrowRight className="w-4 h-4 rotate-180" /> Kembali
                    </button>
                    
                    <div className="h-6 w-px bg-slate-300 mx-1"></div>

                    {isProfilePreview ? (
                      <>
                        <button 
                          onClick={(e) => { e.preventDefault(); setIsProfilePreview(false); }}
                          className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[13px] font-bold transition-all border border-slate-200 shadow-sm flex items-center gap-2 uppercase">
                          <Edit className="w-4 h-4" /> Edit
                        </button>
                        {userProfile?.role !== 'Staff' && (
                          <button 
                            onClick={async (e) => {
                              e.preventDefault();
                              if(confirm('Hapus profil CV ' + data.companyName + '?')) {
                                if (!user) return alert('Anda harus login!');
                                try {
                                  const deletedName = data.companyName || 'CV Baru';
                                  await deleteCompany(editingCvProfileId, true);
                                  recordNotification(
                                    'Klien CV Dihapus',
                                    `Profil klien CV "${deletedName}" telah berhasil dihapus oleh ${user?.email || 'Admin'}.`,
                                    'delete_profile'
                                  );
                                  alert('Profil CV berhasil dihapus');
                                  setEditingCvProfileId(null);
                                } catch (err) {
                                  handleFirestoreError(err, OperationType.DELETE, `cv_profiles/${editingCvProfileId}`);
                                }
                              }
                            }}
                            className="px-5 py-2 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 rounded-md font-bold transition-all text-[13px] border border-red-100 hover:border-red-500 shadow-sm flex items-center gap-2 uppercase">
                            <Trash2 className="w-4 h-4" /> Hapus
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button onClick={resetData} className="px-5 py-2 bg-[#d9534f] text-white rounded-md text-[13px] font-bold transition-all hover:bg-[#c9302c] shadow-sm uppercase">RISET</button>
                        <button 
                          disabled={isSaving}
                          onClick={async () => {
                           if (!data.companyName) return alert('Nama CV harus diisi');
                           setIsSaving(true);
                           const isNew = editingCvProfileId === 'new' || !editingCvProfileId;
                           const newId = editingCvProfileId && editingCvProfileId !== 'new' ? editingCvProfileId : crypto.randomUUID();
                           const profileData = {
                               ...data,
                               id: newId,
                               companyType: 'CV',
                               updatedAt: new Date().toISOString()
                           };
                           if (!user) {
                             setIsSaving(false);
                             return alert('Anda harus login terlebih dahulu!');
                           }
                           
                           try {
                               await saveCompany(profileData.id, profileData, true);
                               recordNotification(
                                 isNew ? 'Klien CV Baru Dibuat' : 'Profil Klien CV Diubah',
                                 `Profil klien CV "${profileData.companyName}" telah ${isNew ? 'berhasil didaftarkan' : 'diperbarui'} oleh ${user?.email || 'Admin'}.`,
                                 isNew ? 'create_profile' : 'update_profile'
                               );
                               setEditingCvProfileId(null);
                               alert('Profil CV berhasil disimpan!');
                           } catch (e) {
                               handleFirestoreError(e, OperationType.WRITE, `cv_profiles/${profileData.id}`);
                           } finally {
                               setIsSaving(false);
                           }
                        }} className="px-5 py-2 bg-teal-600 text-white rounded-md text-[13px] font-bold transition-all hover:bg-teal-700 shadow-sm uppercase disabled:opacity-50 disabled:cursor-not-allowed">
                          {isSaving ? 'MENYIMPAN...' : 'SIMPAN PROFIL'}
                        </button>
                      </>
                    )}
                  </div>
                  
                  <fieldset disabled={isProfilePreview} className="space-y-4">
                    {/* DATA CV */}
                    <AhuSection title="DATA CV (PERSEKUTUAN KOMANDITER)">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                          <AhuLabel label="Nama CV" />
                          <div className="md:col-span-3"><AhuInput value={data.companyName || ''} onChange={e => updateData({ companyName: e.target.value })} placeholder="Contoh: CV MAJU JAYA" /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                          <AhuLabel label="Kedudukan (Kab/Kota)" />
                          <div className="md:col-span-3">
                            <AhuInput 
                              placeholder="Contoh: Kota Bandung atau Kabupaten Bandung Barat"
                              value={data.domicile || ''}
                              onChange={e => updateData({ domicile: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                          <AhuLabel label="Modal CV (Total)" />
                          <div className="md:col-span-3">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">Rp.</span>
                              <AhuInput 
                                className="pl-10"
                                value={data.originalCapitalPaid === 0 ? '' : formatInputNumber(data.originalCapitalPaid)} 
                                onChange={e => updateData({ originalCapitalPaid: parseFormattedNumber(e.target.value) })} 
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </AhuSection>

                    {/* PESERO PENGURUS & KOMANDITER */}
                    <AhuSection title="PESERO PENGURUS & KOMANDITER *">
                      <div className="space-y-4">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openShareholderEditor('lama')} className="bg-[#222d32] text-white px-3 py-1.5 rounded-sm text-[12px] font-bold shadow hover:bg-black transition-colors flex items-center gap-1"><Plus className="w-4 h-4" /> Tambah Data</button>
                          </div>
                          <div className="border border-slate-200 overflow-x-auto rounded-sm">
                            <table className="w-full text-left text-[11px]">
                              <thead className="bg-[#f9f9f9] border-b border-slate-200 font-bold uppercase">
                                <tr>
                                  <th className="p-2 border-r border-slate-200">Nama</th>
                                  <th className="p-2 border-r border-slate-200">Status Pesero</th>
                                  <th className="p-2 border-r border-slate-200">Jabatan</th>
                                  <th className="p-2 border-r border-slate-200">Nilai Pemasukan (Modal)</th>
                                  <th className="p-2 text-center">Aksi</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(data.shareholders || []).map((s) => (
                                   <tr key={s.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors text-[10px]">
                                     <td className="p-2 border-r border-slate-200 font-bold uppercase">{s.name}</td>
                                     <td className="p-2 border-r border-slate-200">
                                       {s.managementPosition?.toUpperCase().includes('KOMANDITER') ? 'KOMANDITER' : 'PENGURUS (KOMPLEMENTER)'}
                                     </td>
                                     <td className="p-2 border-r border-slate-200 font-bold uppercase">{s.managementPosition || (s.isManagement ? 'DIREKTUR' : 'PESERO')}</td>
                                     <td className="p-2 border-r border-slate-200">Rp. {formatInputNumber(s.sharesOwned)}</td>
                                     <td className="p-2 text-center text-blue-600 flex items-center justify-center gap-2">
                                       <button onClick={() => openShareholderEditor('lama', s)} className="hover:underline flex items-center gap-0.5"><Eye className="w-3 h-3" /> Edit</button>
                                       <span className="text-slate-300">|</span>
                                       <button onClick={() => deleteShareholder(s.id, 'lama')} className="hover:underline text-red-500 flex items-center gap-0.5"><Trash2 className="w-3 h-3" /> Hapus</button>
                                     </td>
                                   </tr>
                                ))}
                                {data.shareholders.length === 0 && (
                                  <tr>
                                    <td colSpan={5} className="p-4 text-center text-slate-400 italic">Belum ada data pesero.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                       </div>
                    </AhuSection>

                    {/* AKTA PENDIRIAN CV */}
                    <AhuSection title="AKTA PENDIRIAN DAN PERUBAHAN CV">
                      <div className="space-y-4">
                          <div className="border border-slate-200 rounded-sm p-4 space-y-4 bg-white/50">
                            <h3 className="font-bold text-[13px] text-slate-800">Akta Pendirian CV</h3>
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
                              <AhuLabel label="Nama Notaris" />
                              <div className="md:col-span-3 flex gap-2">
                                <AhuInput 
                                  className="flex-1"
                                  value={data.establishmentNotary || ''} 
                                  onChange={e => updateData({ establishmentNotary: e.target.value })} 
                                  placeholder="Nama notaris pendirian CV" 
                                />
                                <AhuInput 
                                  className="w-48"
                                  value={data.establishmentNotaryTitle || ''} 
                                  onChange={e => updateData({ establishmentNotaryTitle: e.target.value })} 
                                  placeholder="Gelar (SH., M.Kn.)" 
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                              <AhuLabel label="Kedudukan Notaris" />
                              <div className="md:col-span-3">
                                <AhuInput 
                                  value={data.establishmentNotaryDomicile || ''} 
                                  onChange={e => updateData({ establishmentNotaryDomicile: e.target.value })} 
                                  placeholder="Contoh: Kota Bandung" 
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                              <AhuLabel label="Nomor SK (SABU)" />
                              <div className="md:col-span-3">
                                <AhuInput value={data.establishmentSkNumber || ''} onChange={e => updateData({ establishmentSkNumber: e.target.value })} placeholder="Nomor SK SABU Kemenkumham" />
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
                            </div>
                          ))}

                          <button 
                            onClick={() => {
                              const newDeed = { id: crypto.randomUUID(), number: '', date: '', notary: '', notaryDomicile: '', skNumber: '', skDate: '', skSpDocuments: [] };
                              updateData({ amendmentDeeds: [...(data.amendmentDeeds || []), newDeed] });
                            }}
                            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-sm text-slate-400 hover:border-teal-600 hover:text-teal-600 hover:bg-slate-50 transition-all group"
                          >
                            <Plus size={16} className="group-hover:scale-110 transition-transform" />
                            <span className="text-[13px] font-bold uppercase tracking-wider">Tambah Akta Perubahan CV</span>
                          </button>
                      </div>
                    </AhuSection>

                    {/* KBLI CV */}
                    <AhuSection title="MAKSUD DAN TUJUAN (KBLI) CV">
                      <div className="space-y-4">
                        <button
                          type="button"
                          onClick={() => setIsAddKbliModalOpen(true)}
                          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-[12px] font-bold rounded-sm transition-all flex items-center gap-1.5 uppercase"
                        >
                          <Plus className="w-4 h-4" /> Tambah KBLI
                        </button>
                        <div className="border border-slate-200 rounded-sm overflow-hidden">
                          <table className="w-full text-left text-[12px]">
                            <thead className="bg-[#f8fafc] border-b border-slate-200 uppercase font-semibold">
                              <tr>
                                <th className="p-3 w-12 text-center border-r">No</th>
                                <th className="p-3 w-24 text-center border-r">Kode</th>
                                <th className="p-3 border-r">Judul KBLI</th>
                                <th className="p-3 text-center">Aksi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(data.kbliItems || []).map((item, idx) => (
                                <tr key={item.id} className="border-b last:border-0">
                                  <td className="p-3 text-center border-r text-slate-500">{idx + 1}</td>
                                  <td className="p-3 text-center border-r font-mono font-bold">{item.code}</td>
                                  <td className="p-3 border-r font-bold uppercase">{item.name}</td>
                                  <td className="p-3 text-center">
                                    <button onClick={() => updateData({ kbliItems: (data.kbliItems || []).filter(k => k.id !== item.id) })} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4 mx-auto" /></button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </AhuSection>
                  </fieldset>
                </div>
              ) : (() => {
                  let filteredCvProfileResults = cvProfiles.filter(p => !p.isArchived);
                  filteredCvProfileResults = filteredCvProfileResults.filter(p => {
                    if (!cvProfileSearchQuery) return true;
                    const q = cvProfileSearchQuery.toLowerCase();
                    return (p.companyName || '').toLowerCase().includes(q) || (p.domicile || '').toLowerCase().includes(q);
                  });

                  const totalCvProfiles = filteredCvProfileResults.length;
                  const profilesCvPerPage = 10;
                  const totalCvProfilePages = Math.ceil(totalCvProfiles / profilesCvPerPage);
                  const safeCvProfileCurrentPage = Math.min(cvProfileCurrentPage, totalCvProfilePages || 1);
                  const currentCvProfiles = filteredCvProfileResults.slice(
                    (safeCvProfileCurrentPage - 1) * profilesCvPerPage,
                    safeCvProfileCurrentPage * profilesCvPerPage
                  );

                  return (
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <input 
                            type="text" 
                            placeholder="Cari nama CV atau kedudukan..." 
                            value={cvProfileSearchQuery}
                            onChange={(e) => { setCvProfileSearchQuery(e.target.value); setCvProfileCurrentPage(1); }}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-sm text-[13px] focus:bg-white focus:ring-1 focus:ring-teal-500 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {currentCvProfiles.map((p) => (
                          <div key={p.id} className="bg-white border border-slate-200 rounded-sm p-4 hover:shadow-md transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-teal-50 -mr-8 -mt-8 rounded-full transition-transform group-hover:scale-110"></div>
                            <div className="relative">
                              <div className="flex items-start justify-between mb-3">
                                <div className="p-2 bg-teal-50 rounded-lg text-teal-600"><Briefcase className="w-5 h-5" /></div>
                                <div className="flex gap-1">
                                  <button onClick={() => { setEditingCvProfileId(p.id); setIsProfilePreview(true); updateData({ ...INITIAL_STATE, ...p } as any); }} className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-teal-600 rounded-md transition-colors"><Eye className="w-4 h-4" /></button>
                                  <button onClick={() => { setEditingCvProfileId(p.id); setIsProfilePreview(false); updateData({ ...INITIAL_STATE, ...p } as any); }} className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-md transition-colors"><Edit className="w-4 h-4" /></button>
                                </div>
                              </div>
                              <h3 className="font-bold text-slate-800 text-[14px] uppercase mb-1 truncate leading-tight" title={p.companyName}>{p.companyName || 'Tanpa Nama'}</h3>
                              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-3">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate uppercase font-medium">{p.domicile || 'Kedudukan belum diatur'}</span>
                              </div>
                              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px]">
                                <div className="text-slate-400">Update: {formatDateIndo(p.updatedAt || '')}</div>
                                <div className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-bold uppercase">KLIEN CV</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {totalCvProfiles === 0 && (
                        <div className="bg-white border border-dashed border-slate-300 rounded-lg p-12 text-center">
                          <Briefcase className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                          <h3 className="text-slate-600 font-bold mb-1">Belum ada klien CV</h3>
                          <p className="text-slate-400 text-sm mb-6">Mulai dengan menambahkan profil CV pertama Anda.</p>
                          <button onClick={() => { setEditingCvProfileId('new'); setIsProfilePreview(false); updateData({ ...INITIAL_STATE, companyType: 'CV' } as any); }} className="bg-teal-600 text-white px-6 py-2 rounded-md font-bold text-sm shadow-sm hover:bg-teal-700 transition-all">TAMBAH CV SEKARANG</button>
                        </div>
                      )}

                      {totalCvProfilePages > 1 && (
                        <div className="flex items-center justify-between bg-white px-4 py-3 border border-slate-200 rounded-sm">
                          <div className="text-[12px] text-slate-500">Menampilkan <b>{currentCvProfiles.length}</b> dari <b>{totalCvProfiles}</b> profil</div>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalCvProfilePages }).map((_, i) => (
                              <button key={i} onClick={() => setCvProfileCurrentPage(i + 1)} className={`w-8 h-8 flex items-center justify-center rounded-md text-[12px] font-bold transition-all ${safeCvProfileCurrentPage === i + 1 ? 'bg-teal-600 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-600'}`}>{i + 1}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
              })()}
            </div>
          ) : (activeSidebarTab === 'notulen' || activeSidebarTab === 'rupst' || activeSidebarTab === 'pendirian') ? (
            <DocumentGeneratorPage
              activeSidebarTab={activeSidebarTab as any}
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
                pendirianPreset,
                updateData
              }}
            />
          ) : activeSidebarTab === 'perbaikan' ? (
            <DataCorrectionLetter />
          ) : activeSidebarTab === 'panduan' ? (
            <Panduan />
          ) : activeSidebarTab === 'laporan' ? (
            <LaporanList projects={projects} rupstProjects={rupstProjects} pendirianProjects={pendirianProjects} />
          ) : (activeSidebarTab === 'kbli_mapping' || activeSidebarTab === 'saran_kbli' || activeSidebarTab === 'import_kbli') ? (
            <KbliTools activeKbliTab={activeSidebarTab} />
          ) : activeSidebarTab === 'whatsapp_settings' ? (
            <WhatsAppSettings />
          ) : activeSidebarTab === 'projects' ? (
            <ProjectList
              onSelectProject={(id) => {
                setSelectedProjectId(id);
                setActiveSidebarTab('project_detail');
              }}
              currentUser={userProfile}
            />
          ) : activeSidebarTab === 'project_detail' && selectedProjectId && userProfile ? (
            <ProjectDetail
              projectId={selectedProjectId}
              currentUser={userProfile}
              onBack={() => {
                setSelectedProjectId(null);
                setActiveSidebarTab('projects');
              }}
            />
          ) : null}
        </main>
      </div>

      {/* Floating Action Buttons removed as per request */}

      {/* Global Modals */}
      <GlobalModalManager
        editingShareholder={editingShareholder}
        setEditingShareholder={setEditingShareholder}
        editMode={editMode}
        setEditMode={setEditMode}
        data={data}
        currentTargetSharesPaid={currentTargetSharesPaid}
        saveShareholder={saveShareholder}
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
        performKbliModalSearch={performKbliModalSearch}
        kbliPaginatedResults={kbliPaginatedResults}
        kbliCheckedKblis={kbliCheckedKblis}
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

    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CompanyProvider>
        <ProjectProvider>
          <NotificationProvider>
            <ProjectSessionProvider>
              <DocumentRuntimeProvider>
                <ExportPipelineProvider>
                  <AppShell />
                </ExportPipelineProvider>
              </DocumentRuntimeProvider>
            </ProjectSessionProvider>
          </NotificationProvider>
        </ProjectProvider>
      </CompanyProvider>
    </AuthProvider>
  );
};

export default App;