import { Modal } from './components/Modal';
import { ChevronRight, RefreshCw } from 'lucide-react';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db, loginWithGoogle, logout, handleFirestoreError, OperationType } from './src/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { CompanyData, Shareholder, ResolutionFlags, KbliItem, ManagementItem, DocumentType, Address, ManagementChangeType, CompanyProfile, AmendmentDeed, Guest } from './types';
import ShareholderForm from './components/ShareholderForm';
import CompositionEditor from './components/CompositionEditor';
import ManagementEditor from './components/ManagementEditor';
import StockTransferEditor from './components/StockTransferEditor';
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
import { RupstInteractiveAssistant } from './src/components/RupstInteractiveAssistant';
import { RupstPublicWizard } from './src/components/RupstPublicWizard';
import KBLIMapping from './src/components/KBLIMapping';
import KBLISuggestions from './src/components/KBLISuggestions';
import kbli2025Data from './kbli_2025.json';
import JSZip from 'jszip';
import { KBLI_2025_CATEGORIES } from './src/lib/kbliConstants';
import { Sparkles, Bot, Lightbulb, Lock } from 'lucide-react';
import { generatePendirianDocx } from './src/lib/generatePendirianDocx';
import GuideMenu from './src/components/GuideMenu';
import ProxyInputModal from './components/ProxyInputModal';
import { generateWordDoc } from './utils/docxGenerator';
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
  Download
} from 'lucide-react';
import { IndoRegionSelector, DomicileSelector, SearchableSelect } from './components/AddressFields';
import { formatCurrency, formatInputNumber, parseFormattedNumber, numberToWords, toTitleCase } from './utils/formatters';
import { KBLI_DATA } from './utils/kbliData';

const INITIAL_ADDRESS: Address = {
  province: '',
  city: '',
  fullAddress: '',
  rt: '',
  rw: '',
  kelurahan: '',
  kecamatan: ''
};

const INITIAL_RESOLUTIONS: ResolutionFlags = {
  domicile: false,
  address: false,
  capitalBase: false,
  capitalPaid: false,
  capitalBaseDecrease: false,
  capitalPaidDecrease: false,
  reappointment: false,
  kbli: false, 
  management: false,
  shareholders: false,
  companyNameChange: false
};

const INITIAL_MANUAL_REP: Shareholder = {
  id: 'manual-rep',
  salutation: 'Tuan',
  name: '',
  birthCity: '',
  birthDate: '',
  nationality: 'WNI',
  nationalityType: 'WNI',
  occupation: '',
  address: { ...INITIAL_ADDRESS },
  nik: '',
  sharesOwned: 0
};

const INITIAL_STATE: CompanyData = {
  documentType: 'CIRCULAR',
  companyName: '',
  companyShortName: '',
  targetCompanyName: '',
  targetCompanyShortName: '',
  companyType: 'SWASTA NASIONAL',
  npwp: '',
  duration: 'TIDAK TERBATAS',
  status: 'tertutup',
  oldDomicile: '',
  domicile: '',
  domicileStyle: 'KOTA',
  oldAddress: { ...INITIAL_ADDRESS },
  newAddress: { ...INITIAL_ADDRESS },
  oldFullAddress: '',
  fullAddress: '',
  kbliItems: [],
  managementChangeType: 'ALL_DISMISSED',
  oldManagementItems: [],
  newManagementItems: [],
  managementEffectiveUntil: '',
  originalTotalShares: 0,
  originalAuthorizedShares: 0,
  originalSharePrice: 0,
  originalCapitalBase: 0,
  originalCapitalPaid: 0,
  targetCapitalBase: 0,
  targetCapitalPaid: 0,
  capitalArticleNumber: '4',
  domicileArticleNumber: '1',
  representativeType: 'EXISTING',
  authorizedRepresentativeId: '',
  manualRepresentative: { ...INITIAL_MANUAL_REP },
  signingPlace: '',
  signingDate: '',
  aktaStartTime: '10:00',
  meetingStartTime: '',
  meetingEndTime: '',
  meetingChair: '',
  meetingChairPosition: '',
  invitationNumber: '',
  invitationDate: '',
  meetingAgenda: '',
  establishmentDeedNumber: '',
  establishmentDeedDate: '',
  establishmentNotary: '',
  establishmentNotaryDomicile: '',
  establishmentSkNumber: '',
  establishmentSkDate: '',
  latestAmendmentDeedNumber: '',
  latestAmendmentDeedDate: '',
  latestAmendmentNotary: '',
  latestAmendmentSkNumber: '',
  latestAmendmentSkDate: '',
  amendmentDeeds: [],
  shareholders: [],
  shareTransfers: [],
  finalShareholders: [],
  guests: [],
  managementDismissals: [],
  shareTransfersNew: [],
  capitalSubscriptionsNew: [],
  resolutions: INITIAL_RESOLUTIONS,
  selectedProfileId: '',
  createDraftAktaRups: true,
  draftAktaRupsNumber: '',
  draftAktaRupsDate: '',
  draftAktaRupsTime: '',
  notaryName: '',
  notaryTitle: '',
  notaryDomicile: '',
  notaryNumber: '',
  notaryDate: '',
  isReplacementNotary: false,
  beneficialOwnerConsent: false,
  rupstFiscalYear: '',
  rupstNetProfit: undefined,
  rupstDividendAmount: undefined,
  rupstRetainedProfit: undefined,
  rupstFinancialReportNumber: '',
  rupstFinancialReportDate: '',
  rupstFinancialReportSignatoryName: '',
  rupstFinancialReportSignatoryPosition: '',
  rupstStatementNeraca: true,
  rupstStatementLabaRugi: false,
  rupstStatementPerubahanEkuitas: false,
  rupstStatementArusKas: false,
  rupstStatementCatatan: false,
  rupstStatementNamaAnggota: false,
  rupstStatementGaji: false,
  rupstAlasanAuditA: true,
  rupstAlasanAuditB: true,
  rupstAlasanAuditC: true,
  rupstAlasanAuditD: true,
  rupstAlasanAuditE: true,
  rupstAlasanAuditF: true,
  rupstIsAudited: false,
  rupstKapName: '',
  rupstKapLicenseNumber: '',
  rupstKapExpiryDate: '',
  rupstAuditReportNumber: '',
  rupstAuditReportDate: '',
  rupstNotulenNumber: '',
  rupstDividends: [],
  rupstDividendPaymentDate: '05 Juni 2026 dan 10 Juni 2026',
  rupstQuorumArticle: '10',
  rupstQuorumParagraph: '1',
  rupstMeetingEndTime: '',
  rupstInvitationNumber: '',
  rupstInvitationDate: '',
  slHari: '',
  slTanggalHuruf: '',
  slAlasanAuditA: false,
  slAlasanAuditB: false,
  slAlasanAuditC: true,
  slAlasanAuditD: true,
  slAlasanAuditE: false,
  slAlasanAuditF: false,
  slLaporanNomor: '',
  slLaporanTanggalHuruf: '',
  slTahunBukuAkhirHuruf: '',
  saksi1Nama: 'Nendi Suhendi',
  saksi1Lahir: 'Bandung, pada tanggal limabelas Juli seribu sembilan ratus sembilan puluh satu (15-07-1991)',
  saksi1Alamat: 'Jalan Sukaresmi Nomor 12, Rukun Tetangga 005, Rukun Warga 005, Kecamatan Lembang, Desa Mekarwangi',
  saksi1NIK: '3217011507910016',
  saksi2Nama: 'Siti Nur Azizah',
  saksi2Lahir: 'Bandung, pada tanggal tujuh belas Desember seribu sembilan ratus sembilan puluh sembilan (17-12-1999)',
  saksi2Alamat: 'Kabupaten Bandung, Jalan Lembah Pakar Timur II Kampung Sekebuluh Rukun Tetangga 001, Rukun Warga 004, Desa Ciburial, Kecamatan Cimenyan',
  saksi2NIK: '3204065712990001'
};

type TabId = 'general' | 'shareholders' | 'shareholders_new' | 'representative' | 'agenda' | 'kbli' | 'domicile' | 'address' | 'capitalBase' | 'capitalPaid' | 'management' | 'reappointment';
type SidebarTabId = 'beranda' | 'company_profile' | 'notulen' | 'pendirian' | 'rupst' | 'perbaikan' | 'draft_akta_rups' | 'panduan' | 'kbli_mapping' | 'saran_kbli' | 'import_kbli';

// AHU Style Helper Components
const AhuSection = ({ title, children, isOpen = true }: { title: string, children: React.ReactNode, isOpen?: boolean }) => {
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

const AhuLabel = ({ label, required = false }: { label: string, required?: boolean }) => (
  <label className="block text-[13px] font-medium text-slate-700 mb-1">
    {label} {required && <span className="text-red-500">*</span>}
  </label>
);

const AhuInput = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    {...props} 
    className={`w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none focus:border-[#66afe9] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,.075),0_0_8px_rgba(102,175,233,.6)] transition-all bg-white text-slate-800 ${className}`} 
  />
);

const AhuSelect = ({ children, className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select 
    {...props} 
    className={`w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none focus:border-[#66afe9] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,.075),0_0_8px_rgba(102,175,233,.6)] transition-all bg-white text-slate-800 appearance-none ${className}`}
  >
    {children}
  </select>
);

const sanitizeForFirestore = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => sanitizeForFirestore(v));
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val !== undefined) {
          newObj[key] = sanitizeForFirestore(val);
        }
      }
    }
    return newObj;
  }
  return obj;
};

// ==========================================
// 2026 SaaS Premium Theme Accents Configuration
// ==========================================
const TAB_ACCENTS: Record<SidebarTabId, {
  iconColor: string;      // Active icon colors
  textColor: string;      // Active text classes
  bgColor: string;        // Active background color (soft theme tints)
  hoverBg: string;        // Soft hover borders/backgrounds
  indicatorBg: string;    // Accent border colors
}> = {
  beranda: {
    iconColor: 'text-blue-600',
    textColor: 'text-blue-900',
    bgColor: 'bg-blue-50/70',
    hoverBg: 'hover:bg-blue-50/40 hover:text-blue-950',
    indicatorBg: 'bg-blue-600'
  },
  company_profile: {
    iconColor: 'text-indigo-600',
    textColor: 'text-indigo-900',
    bgColor: 'bg-indigo-50/70',
    hoverBg: 'hover:bg-indigo-50/40 hover:text-indigo-950',
    indicatorBg: 'bg-indigo-600'
  },
  notulen: {
    iconColor: 'text-orange-600',
    textColor: 'text-orange-900',
    bgColor: 'bg-orange-50/70',
    hoverBg: 'hover:bg-orange-50/40 hover:text-orange-950',
    indicatorBg: 'bg-orange-600'
  },
  rupst: {
    iconColor: 'text-green-600',
    textColor: 'text-green-900',
    bgColor: 'bg-green-50/70',
    hoverBg: 'hover:bg-green-50/40 hover:text-green-950',
    indicatorBg: 'bg-green-600'
  },
  pendirian: {
    iconColor: 'text-pink-600',
    textColor: 'text-pink-900',
    bgColor: 'bg-pink-50/70',
    hoverBg: 'hover:bg-pink-50/40 hover:text-pink-950',
    indicatorBg: 'bg-pink-600'
  },
  kbli_mapping: {
    iconColor: 'text-blue-900',
    textColor: 'text-blue-950',
    bgColor: 'bg-blue-100/55',
    hoverBg: 'hover:bg-blue-100/30 hover:text-blue-950',
    indicatorBg: 'bg-blue-900'
  },
  saran_kbli: {
    iconColor: 'text-lime-600',
    textColor: 'text-lime-900',
    bgColor: 'bg-lime-50/60',
    hoverBg: 'hover:bg-lime-50/35 hover:text-lime-950',
    indicatorBg: 'bg-lime-600'
  },
  perbaikan: {
    iconColor: 'text-red-600',
    textColor: 'text-red-900',
    bgColor: 'bg-red-50/70',
    hoverBg: 'hover:bg-red-50/40 hover:text-red-950',
    indicatorBg: 'bg-red-600'
  },
  panduan: {
    iconColor: 'text-amber-600',
    textColor: 'text-amber-900',
    bgColor: 'bg-amber-50/70',
    hoverBg: 'hover:bg-amber-50/40 hover:text-amber-950',
    indicatorBg: 'bg-amber-600'
  },
  import_kbli: {
    iconColor: 'text-emerald-600',
    textColor: 'text-emerald-900',
    bgColor: 'bg-emerald-50/70',
    hoverBg: 'hover:bg-emerald-50/40 hover:text-emerald-950',
    indicatorBg: 'bg-emerald-600'
  },
  draft_akta_rups: {
    iconColor: 'text-slate-600',
    textColor: 'text-slate-905',
    bgColor: 'bg-slate-100',
    hoverBg: 'hover:bg-slate-100 hover:text-slate-905',
    indicatorBg: 'bg-slate-500'
  }
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

const App: React.FC = () => {
  const [data, setData] = useState<CompanyData>(() => {
    const saved = localStorage.getItem('legal-draft-data-v25-final');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...INITIAL_STATE, ...parsed };
      } catch (e) {
        console.error("Failed to parse saved data:", e);
        return INITIAL_STATE;
      }
    }
    return INITIAL_STATE;
  });

  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [expandedGuestId, setExpandedGuestId] = useState<string | null>(null);
  const [showArchivedProfiles, setShowArchivedProfiles] = useState<boolean>(false);
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [projects, setProjects] = useState<CompanyData[]>([]);
  const [rupstProjects, setRupstProjects] = useState<CompanyData[]>([]);
  const [rupstPublicProjects, setRupstPublicProjects] = useState<CompanyData[]>([]);
  const [pendirianProjects, setPendirianProjects] = useState<CompanyData[]>([]);
  const [rupstSearchQuery, setRupstSearchQuery] = useState("");
  const [selectedRupstYear, setSelectedRupstYear] = useState<string>("all");
  const [rupstSortField, setRupstSortField] = useState<string>("updatedAt");
  const [rupstSortOrder, setRupstSortOrder] = useState<"asc" | "desc">("desc");

  const draftAktaRef = useRef<DraftAktaAppRef>(null);
  const [rupstCurrentPage, setRupstCurrentPage] = useState<number>(1);
  const [isRupstFilterOpen, setIsRupstFilterOpen] = useState<boolean>(false);
  const [notulenSearchQuery, setNotulenSearchQuery] = useState("");
  const [selectedRupslbYear, setSelectedRupslbYear] = useState<string>("all");
  const [rupslbSortField, setRupslbSortField] = useState<string>("updatedAt");
  const [rupslbSortOrder, setRupslbSortOrder] = useState<"asc" | "desc">("desc");
  const [rupslbCurrentPage, setRupslbCurrentPage] = useState<number>(1);
  const [isRupslbFilterOpen, setIsRupslbFilterOpen] = useState<boolean>(false);
  const [profileSearchQuery, setProfileSearchQuery] = useState("");
  const [profileSortField, setProfileSortField] = useState<string>("updatedAt");
  const [profileSortOrder, setProfileSortOrder] = useState<"asc" | "desc">("desc");
  const [profileCurrentPage, setProfileCurrentPage] = useState<number>(1);
  const [selectedProfileYear, setSelectedProfileYear] = useState<string>("all");
  const [isProfileFilterOpen, setIsProfileFilterOpen] = useState<boolean>(false);

  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [showGlobalSearchResults, setShowGlobalSearchResults] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);
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
      // Allow saving notification if logged in
      if (!auth.currentUser) return;
      const id = crypto.randomUUID();
      const notifData = {
        id,
        title,
        description,
        timestamp: new Date().toISOString(),
        read: false,
        type,
        userId: auth.currentUser.uid || auth.currentUser.email || 'system'
      };
      await setDoc(doc(db, 'notifications', id), notifData);
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

  const handleDownloadProject = async (item: any) => {
    if (item.project) {
      if (item.type === 'rupst') {
        try {
          const { generateRUPSTDocx } = await import('./src/lib/generateRUPSTDocx');
          await generateRUPSTDocx({ ...INITIAL_STATE, ...item.project });
        } catch (error) {
          console.error("RUPST Export Error:", error);
          alert("Gagal mengunduh RUPST.");
        }
      } else if (item.type === 'pendirian') {
        try {
          await generatePendirianDocx(item.project);
        } catch (e) {
          console.error(e);
          alert("Gagal mengunduh Pendirian.");
        }
      } else if (item.type === 'notulen') {
        try {
          await generateWordDoc({ ...INITIAL_STATE, ...item.project });
        } catch (error) {
          console.error("Export Word error:", error);
          alert("Gagal mengunduh dokumen Word.");
        }
      }
    } else {
      alert(`Simulasi pengunduhan akta "${item.name}" untuk "${item.sub}" berhasil.`);
    }
  };

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
      { id: 'm-kp', title: 'Menu: Klien PT', subtitle: 'Kelola profile klien PT', type: 'menu', tabId: 'company_profile' as const },
      { id: 'm-rlb', title: 'Menu: RUPS LB', subtitle: 'Keputusan Sirkuler & Berita Acara', type: 'menu', tabId: 'notulen' as const },
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
          subtitle: p.newAddress?.city || 'Profile Klien Perusahaan',
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

    return results.slice(0, 8);
  }, [globalSearchQuery, profiles, projects, rupstProjects]);

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

  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(() => {
    return localStorage.getItem('notaris_user_is_logged_in') === 'true';
  });
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

  useEffect(() => {
    let timeoutId: any;
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        localStorage.setItem('notaris_user_is_logged_in', 'true');
        setUser(currentUser);
        setAuthLoading(false);
      } else {
        const wasLoggedIn = localStorage.getItem('notaris_user_is_logged_in') === 'true';
        if (wasLoggedIn) {
          timeoutId = setTimeout(() => {
            localStorage.removeItem('notaris_user_is_logged_in');
            setUser(null);
            setAuthLoading(false);
            setDataLoading(false);
          }, 1500);
        } else {
          setUser(null);
          setAuthLoading(false);
          setDataLoading(false);
        }
      }
    });
    return () => {
      unsub();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('notaris_user_is_logged_in');
    setUser(null);
    setAuthLoading(false);
    setDataLoading(false);
    await logout();
  };

  const handleDuplicateProfile = async (profile: CompanyProfile) => {
    if (!user) return alert('Anda harus login!');
    try {
      const duplicatedName = `${profile.companyName} (Salinan)`;
      const newId = crypto.randomUUID();
      const duplicatedProfile = {
        ...profile,
        id: newId,
        companyName: duplicatedName,
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'profiles', newId), sanitizeForFirestore(duplicatedProfile));
      recordNotification(
        'Klien PT Diduplikat',
        `Klien PT "${profile.companyName}" telah diduplikat menjadi "${duplicatedName}".`,
        'create_profile'
      );
      alert('Profil berhasil diduplikat!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `profiles`);
    }
  };

  const handleArchiveProfile = async (profile: CompanyProfile) => {
    if (!user) return alert('Anda harus login!');
    const toggleArchive = !profile.isArchived;
    try {
      await updateDoc(doc(db, 'profiles', profile.id), {
        isArchived: toggleArchive
      });
      recordNotification(
        toggleArchive ? 'Klien PT Diarsipkan' : 'Klien PT Dipulihkan',
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
      setAuthLoading(false);
      setDataLoading(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Public projects listener - always active
    const rupstPublicRef = collection(db, 'rupst_public_projects');
    const unsubRupstPublic = onSnapshot(rupstPublicRef, (snapshot) => {
      const loaded: CompanyData[] = [];
      snapshot.forEach(doc => {
        loaded.push(doc.data() as CompanyData);
      });
      setRupstPublicProjects(loaded);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `rupst_public_projects`);
    });

    if (user) {
      let profilesReady = false;
      let projectsReady = false;
      let rupstReady = false;
      let pendirianReady = false;

      const checkIfLoaded = () => {
        if (profilesReady && projectsReady && rupstReady && pendirianReady) {
          setDataLoading(false);
        }
      };

      const profilesRef = collection(db, 'profiles');
      const unsubProfiles = onSnapshot(profilesRef, (snapshot) => {
        const loaded: CompanyProfile[] = [];
        snapshot.forEach(doc => {
          loaded.push(doc.data() as CompanyProfile);
        });
        setProfiles(loaded);
        profilesReady = true;
        checkIfLoaded();
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `profiles`);
        profilesReady = true;
        checkIfLoaded();
      });

      const projectsRef = collection(db, 'projects');
      const unsubProjects = onSnapshot(projectsRef, (snapshot) => {
        const loaded: CompanyData[] = [];
        snapshot.forEach(doc => {
          loaded.push(doc.data() as CompanyData);
        });
        setProjects(loaded);
        projectsReady = true;
        checkIfLoaded();
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `projects`);
        projectsReady = true;
        checkIfLoaded();
      });

      const pendirianRef = collection(db, 'pendirian_projects');
      const unsubPendirian = onSnapshot(pendirianRef, (snapshot) => {
        const loaded: CompanyData[] = [];
        snapshot.forEach(doc => {
          loaded.push(doc.data() as CompanyData);
        });
        setPendirianProjects(loaded);
        pendirianReady = true;
        checkIfLoaded();
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'pendirian_projects');
        pendirianReady = true;
        checkIfLoaded();
      });

      const rupstRef = collection(db, 'rupst_projects');
      const unsubRupst = onSnapshot(rupstRef, (snapshot) => {
        const loaded: CompanyData[] = [];
        snapshot.forEach(doc => {
          loaded.push(doc.data() as CompanyData);
        });
        setRupstProjects(loaded);
        rupstReady = true;
        checkIfLoaded();
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `rupst_projects`);
        rupstReady = true;
        checkIfLoaded();
      });

      // Realtime notifications
      const notificationsRef = collection(db, 'notifications');
      const unsubNotifications = onSnapshot(notificationsRef, (snapshot) => {
        const loaded: any[] = [];
        snapshot.forEach(doc => {
          loaded.push({ id: doc.id, ...doc.data() });
        });
        loaded.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        setNotifications(loaded);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `notifications`);
      });

      return () => { 
        unsubProfiles(); 
        unsubProjects(); 
        unsubRupst(); 
        unsubRupstPublic(); 
        unsubPendirian(); 
        unsubNotifications();
      };
    } else {
      setProfiles([]);
      setProjects([]);
      setRupstProjects([]);
      setPendirianProjects([]);
      setDataLoading(false);
      return () => unsubRupstPublic();
    }
  }, [user]);

  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingRupstId, setEditingRupstId] = useState<string | null>(null);
  const [editingRupstPublicId, setEditingRupstPublicId] = useState<string | null>(null);
  const [editingPendirianId, setEditingPendirianId] = useState<string | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [isProfilePreview, setIsProfilePreview] = useState<boolean>(false);
  const [isRupstPreview, setIsRupstPreview] = useState<boolean>(false);
  const [isRupsPreview, setIsRupsPreview] = useState<boolean>(false);
  const [isRupstDocDropdownOpen, setIsRupstDocDropdownOpen] = useState<boolean>(false);
  const [isRupslbDocDropdownOpen, setIsRupslbDocDropdownOpen] = useState<boolean>(false);
  const [rupslbDropdownId, setRupslbDropdownId] = useState<string | null>(null);
  const [rupstDropdownId, setRupstDropdownId] = useState<string | null>(null);
  const [isPtGroupOpen, setIsPtGroupOpen] = useState(true);

  const [editingShareholder, setEditingShareholder] = useState<Shareholder | null>(null);
  const [rupstInputMode, setRupstInputMode] = useState<'form' | 'assistant'>('assistant');
  const [assistantStep, setAssistantStep] = useState<number>(1);
  const [editMode, setEditMode] = useState<'lama' | 'baru' | null>(null);
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const TAB_TO_PATH: Record<string, string> = useMemo(() => ({
    'beranda': '/',
    'company_profile': '/profile',
    'notulen': '/rupslb',
    'pendirian': '/pendirian',
    'rupst': '/rupst',
    'perbaikan': '/perbaikan',
    'draft_akta_rups': '/draft-akta',
    'panduan': '/panduan',
    'sirkuler_laporan': '/sirkuler',
    'rupst_public': '/rupst-public',
    'kbli_mapping': '/kbli-mapping',
    'saran_kbli': '/saran-kbli',
    'import_kbli': '/import-kbli'
  }), []);

  const PATH_TO_TAB: Record<string, SidebarTabId> = useMemo(() => 
    Object.fromEntries(Object.entries(TAB_TO_PATH).map(([tab, path]) => [path, tab as SidebarTabId])),
  [TAB_TO_PATH]);

  const activeSidebarTab = useMemo(() => {
    return PATH_TO_TAB[location.pathname] || 'beranda';
  }, [location.pathname, PATH_TO_TAB]);

  const setActiveSidebarTab = (tab: SidebarTabId) => {
    const path = TAB_TO_PATH[tab] || '/';
    navigate(path);
  };
  const [zoom, setZoom] = useState(1);
  const [showPendirianPreview, setShowPendirianPreview] = useState(false);
  const [pendirianPreviewData, setPendirianPreviewData] = useState<any>(null);
  const [isExportingPendirian, setIsExportingPendirian] = useState(false);

  const handlePendirianExportWord = async (d: any) => {
    setIsExportingPendirian(true);
    try {
      await generatePendirianDocx(d);
    } catch (e) {
      console.error(e);
      alert("Error Exporting");
    } finally {
      setIsExportingPendirian(false);
    }
  };
  const [proxyModalOpenId, setProxyModalOpenId] = useState<string | null>(null);


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
  useEffect(() => {
    if (data.finalShareholders.length === 0 && data.shareholders.length > 0) {
      updateData({ finalShareholders: [...data.shareholders] });
    }
  }, [data.shareholders, data.finalShareholders.length]);

  const handlePrint = () => {
    const totalInputted = data.finalShareholders.reduce((sum, s) => sum + s.sharesOwned, 0);
    const targetShares = data.originalSharePrice > 0 ? (data.targetCapitalPaid / data.originalSharePrice) : 0;
    const limit = (data.resolutions.capitalPaid || data.resolutions.capitalPaidDecrease) ? targetShares : data.originalTotalShares;

    if (totalInputted !== limit && (data.resolutions.capitalPaid || data.resolutions.capitalPaidDecrease || data.resolutions.shareholders)) {
      if (!confirm(`⚠ Perhatian: Total saham komposisi akhir (${totalInputted.toLocaleString('id-ID')}) tidak sama dengan target modal disetor (${limit.toLocaleString('id-ID')}). Lanjutkan cetak?`)) {
        return;
      }
    }
    window.print();
  };

  const handleExportWord = async () => {
    if (!mergedData.companyName) {
      alert("Harap isi Nama Perusahaan terlebih dahulu.");
      return;
    }
    const totalInputted = mergedData.finalShareholders.reduce((sum, s) => sum + s.sharesOwned, 0);
    const targetShares = mergedData.originalSharePrice > 0 ? (mergedData.targetCapitalPaid / mergedData.originalSharePrice) : 0;
    const limit = (mergedData.resolutions.capitalPaid || mergedData.resolutions.capitalPaidDecrease) ? targetShares : mergedData.originalTotalShares;

    if (totalInputted !== limit && (mergedData.resolutions.capitalPaid || mergedData.resolutions.capitalPaidDecrease || mergedData.resolutions.shareholders)) {
      if (!confirm(`⚠ Perhatian: Total saham komposisi akhir (${totalInputted.toLocaleString('id-ID')}) tidak sama dengan target modal disetor (${limit.toLocaleString('id-ID')}). Lanjutkan export?`)) {
        return;
      }
    }

    if (activeSidebarTab === 'rupst') {
      try {
        const { generateRUPSTDocx } = await import('./src/lib/generateRUPSTDocx');
        await generateRUPSTDocx(mergedData);
      } catch (error) {
        console.error("RUPST Export Error:", error);
        alert("Gagal mengunduh RUPST.");
      }
      return;
    }

    try {
      await generateWordDoc(mergedData);
    } catch (error) {
      console.error("Export Word error:", error);
      alert("Gagal mengunduh dokumen Word.");
    }
  };

  const formatFullAddress = (addr: Address): string => {
    if (!addr.fullAddress) return '';
    const isRegency = addr.city?.toLowerCase().includes('kabupaten');
    const villagePrefix = isRegency ? 'Desa' : 'Kelurahan';

    const parts = [
      addr.fullAddress,
      addr.rt && addr.rw ? `RT. ${addr.rt} RW. ${addr.rw}` : '',
      addr.kelurahan ? `${villagePrefix} ${toTitleCase(addr.kelurahan)}` : '',
      addr.kecamatan ? `Kecamatan ${toTitleCase(addr.kecamatan)}` : '',
      addr.city ? toTitleCase(addr.city) : '',
      addr.province ? toTitleCase(addr.province) : ''
    ].filter(Boolean);
    return parts.join(', ');
  };

  const updateData = (updates: Partial<CompanyData>) => {
    setData(prev => {
      const newData = { ...prev, ...updates };

      if (updates.originalSharePrice !== undefined || updates.originalAuthorizedShares !== undefined) {
        newData.originalCapitalBase = (newData.originalSharePrice || 0) * (newData.originalAuthorizedShares || 0);
        if (!newData.resolutions.capitalBase && !newData.resolutions.capitalBaseDecrease) {
          newData.targetCapitalBase = newData.originalCapitalBase;
        }
      }
      if (updates.originalSharePrice !== undefined || updates.originalTotalShares !== undefined) {
        newData.originalCapitalPaid = (newData.originalSharePrice || 0) * (newData.originalTotalShares || 0);
        if (!newData.resolutions.capitalPaid && !newData.resolutions.capitalPaidDecrease) {
          newData.targetCapitalPaid = newData.originalCapitalPaid;
        }
      }

      if (updates.newAddress) {
        newData.fullAddress = formatFullAddress(newData.newAddress);
      }
      if (updates.oldAddress) {
        newData.oldFullAddress = formatFullAddress(newData.oldAddress);
      }
      if (
        updates.rupstStreet !== undefined ||
        updates.rupstRt !== undefined ||
        updates.rupstRw !== undefined ||
        updates.rupstKelurahan !== undefined ||
        updates.rupstKecamatan !== undefined
      ) {
        const street = updates.rupstStreet !== undefined ? updates.rupstStreet : (prev.rupstStreet || '');
        const rt = updates.rupstRt !== undefined ? updates.rupstRt : (prev.rupstRt || '');
        const rw = updates.rupstRw !== undefined ? updates.rupstRw : (prev.rupstRw || '');
        const kelurahan = updates.rupstKelurahan !== undefined ? updates.rupstKelurahan : (prev.rupstKelurahan || '');
        const kecamatan = updates.rupstKecamatan !== undefined ? updates.rupstKecamatan : (prev.rupstKecamatan || '');

        const parts = [
          street,
          rt && rw ? `RT. ${rt} RW. ${rw}` : (rt ? `RT. ${rt}` : (rw ? `RW. ${rw}` : '')),
          kelurahan ? `Kelurahan/Desa ${kelurahan}` : '',
          kecamatan ? `Kecamatan ${kecamatan}` : ''
        ].filter(Boolean);

        newData.fullAddress = parts.join(', ');
      }
      return newData;
    });
  };

  const syncCompanyDataToRupst = () => {
    if (!data.selectedProfileId) {
      alert("Pilih Klien PT terlebih dahulu.");
      return;
    }
    
    if (!confirm("Sinkronkan data terbaru dari Klien PT?\n\nData manual RUPST tidak akan diubah.")) {
      return;
    }

    const latestProfile = profiles.find(p => p.id === data.selectedProfileId);
    if (!latestProfile) {
      alert("Gagal mengambil data terbaru dari Klien PT.");
      return;
    }

    try {
      const updates: any = {
        companyName: latestProfile.companyName,
        domicile: latestProfile.domicile,
        establishmentDeedNumber: latestProfile.establishmentDeedNumber,
        establishmentDeedDate: latestProfile.establishmentDeedDate,
        establishmentNotary: latestProfile.establishmentNotary,
        establishmentNotaryTitle: latestProfile.establishmentNotaryTitle,
        establishmentNotaryDomicile: latestProfile.establishmentNotaryDomicile,
        establishmentSkNumber: latestProfile.establishmentSkNumber,
        establishmentSkDate: latestProfile.establishmentSkDate,
        amendmentDeeds: latestProfile.amendmentDeeds || [],
        shareholders: latestProfile.shareholders || [],
        originalSharePrice: latestProfile.originalSharePrice,
      };

      // Only sync representative data if the current form is NOT set to manual input
      if (data.representativeType !== 'MANUAL') {
        updates.authorizedRepresentativeId = latestProfile.authorizedRepresentativeId || '';
        updates.manualRepresentative = latestProfile.manualRepresentative || { ...INITIAL_MANUAL_REP };
        updates.representativeType = latestProfile.representativeType || 'EXISTING';
      }

      updateData(updates);
      alert("Data PT berhasil disinkronkan.");
    } catch (e) {
      alert("Gagal mengambil data terbaru dari Klien PT.");
    }
  };

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
      updates.finalShareholders = data.shareholders.map(s => ({
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
      kbliItems: data.kbliItems.map(item => item.id === id ? { ...item, ...updates } : item)
    });
  };

  const removeKbli = (id: string) => {
    updateData({
      kbliItems: data.kbliItems.filter(item => item.id !== id)
    });
  };
  
  const openShareholderEditor = (type: 'lama' | 'baru', sh?: Shareholder) => {
    setEditMode(type);
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

  const resetData = () => {
    if (confirm("Reset semua data?")) {
      setData(INITIAL_STATE);
      localStorage.removeItem('legal-draft-data-v25-final');
      setActiveTab('general');
    }
  };

  const currentTargetSharesBase = data.originalSharePrice > 0 ? (data.targetCapitalBase / data.originalSharePrice) : 0;
  const currentTargetSharesPaid = data.originalSharePrice > 0 ? (data.targetCapitalPaid / data.originalSharePrice) : 0;

  const mergedData = useMemo(() => {
    let baseData = data;
    if ((activeSidebarTab === 'notulen' || activeSidebarTab === 'rupst') && data.selectedProfileId) {
      const profile = profiles.find(p => p.id === data.selectedProfileId);
      if (profile) {
        // We want to keep the current state from profile as the "Old" data
        // but allow the draft (data) to control the "New/Target" states
        baseData = {
          ...data,
          companyName: profile.companyName,
          companyShortName: profile.companyShortName,
          companyType: profile.companyType,
          npwp: profile.npwp,
          duration: profile.duration,
          status: profile.status,
          // Preserve current domicile and address info from profile
          domicile: profile.domicile,
          domicileStyle: profile.domicileStyle,
          // oldAddress: profile.oldAddress, // Removed so user form input overrides profile for Draft
          // Do NOT override newAddress or fullAddress from profile if we are in a resolution
          // but we might want the profile's address as a starting point for 'oldFullAddress'
          oldFullAddress: profile.oldFullAddress,
          
          establishmentDeedNumber: profile.establishmentDeedNumber,
          establishmentDeedDate: profile.establishmentDeedDate,
          establishmentNotary: profile.establishmentNotary,
          establishmentNotaryTitle: profile.establishmentNotaryTitle,
          establishmentNotaryDomicile: profile.establishmentNotaryDomicile,
          establishmentSkNumber: profile.establishmentSkNumber,
          establishmentSkDate: profile.establishmentSkDate,
          originalTotalShares: profile.originalTotalShares,
          originalAuthorizedShares: profile.originalAuthorizedShares,
          originalSharePrice: profile.originalSharePrice,
          originalCapitalBase: profile.originalCapitalBase,
          originalCapitalPaid: profile.originalCapitalPaid,
        };
      }
    }

    // Patch shareholders and proxyData to automatically pull missing city from matching profiles
    if (baseData.shareholders && profiles.length > 0) {
      baseData = {
        ...baseData,
        shareholders: baseData.shareholders.map(sh => {
          let patchedSh = { ...sh };
          if (patchedSh.shareholderType === 'BADAN_HUKUM') {
            const prof = profiles.find(p => 
              (patchedSh.linkedProfileId && p.id === patchedSh.linkedProfileId) ||
              (p.companyName && patchedSh.name && p.companyName.trim().toUpperCase() === patchedSh.name.trim().toUpperCase())
            );
            if (prof) {
              const fallbackCity = (prof.domicile || prof.oldDomicile || prof.newAddress?.city || prof.oldAddress?.city || prof.kedudukanPT || (prof as any).city || '').toUpperCase();
              if (fallbackCity && (!patchedSh.address || !patchedSh.address.city)) {
                patchedSh.address = {
                  ...(patchedSh.address || {}),
                  city: fallbackCity,
                  fullAddress: patchedSh.address?.fullAddress || '',
                  rt: patchedSh.address?.rt || '',
                  rw: patchedSh.address?.rw || '',
                  kelurahan: patchedSh.address?.kelurahan || '',
                  kecamatan: patchedSh.address?.kecamatan || '',
                  province: patchedSh.address?.province || '',
                };
              }
            }
          }
          return patchedSh;
        })
      };
    }

    return baseData;
  }, [data, profiles, activeSidebarTab]);

  const effectiveBaseCapital = data.resolutions.capitalBase ? data.targetCapitalBase : data.originalCapitalBase;
  const effectivePaidCapital = data.resolutions.capitalPaid ? data.targetCapitalPaid : data.originalCapitalPaid;
  const paidUpPercentage = effectiveBaseCapital > 0 
    ? Math.round((effectivePaidCapital / effectiveBaseCapital) * 100) 
    : 0;

  const ALLOWED_EMAILS = [
    'appnotputri@gmail.com',
    'rdyndi@gmail.com',
    'notarisppatputri@gmail.com'
  ];

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

  const showPublicWizard = false;

  return (
    <div className="h-screen flex bg-slate-50 font-sans text-slate-800 overflow-hidden relative">
      
      {/* Dynamic Left Sidebar Spanning Full Height */}
      {!showPublicWizard && user && (
        <aside className={`bg-white border-r border-slate-200/80 flex flex-col h-full shrink-0 overflow-y-auto transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-[260px]' : 'w-0 overflow-hidden'}`}>
          
          {/* Logo container at top left */}
          <div className="h-16 bg-[#001529] px-5 flex items-center gap-3 shrink-0 select-none">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
              <Gavel size={18} className="text-white shrink-0" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-[10px] tracking-wider font-bold text-blue-400/90 leading-none">SISTEM DRAFT</span>
              <span className="text-[13px] tracking-tight font-extrabold text-white leading-tight">NOTARIS PUTRI</span>
            </div>
          </div>

          <div className="flex-1 py-4 space-y-1 text-[13px]">
            {/* General Menu Items */}
            {[
              { label: 'Beranda', id: 'beranda' as const, icon: Home },
            ].map((item) => {
              const isActive = activeSidebarTab === item.id;
              const acc = TAB_ACCENTS[item.id] || TAB_ACCENTS.beranda;
              return (
                <button 
                  key={item.id} 
                  onClick={() => setActiveSidebarTab(item.id)} 
                  className={`relative w-full text-left px-5 py-3 transition-all flex items-center gap-3.5 select-none ${
                    isActive 
                      ? `${acc.bgColor} ${acc.textColor} font-semibold` 
                      : `text-slate-600 ${acc.hoverBg}`
                  }`}
                >
                  {isActive && (
                    <div className={`absolute left-0 top-1.5 bottom-1.5 w-[4.5px] rounded-r-md ${acc.indicatorBg}`} />
                  )}
                  <item.icon 
                    size={20} 
                    strokeWidth={isActive ? 2.25 : 2.0}
                    className={`shrink-0 transition-colors ${isActive ? acc.iconColor : 'text-slate-400'}`} 
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Menu Header: PERSEROAN TERBATAS */}
            <div className="px-5 pt-6 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
              Perseroan Terbatas
            </div>

            {[
              { label: 'Klien PT', id: 'company_profile' as const, icon: Building2 },
              { label: 'RUPS LB', id: 'notulen' as const, icon: FileText },
              { label: 'RUPS Tahunan', id: 'rupst' as const, icon: CalendarCheck },
              { label: 'Pendirian PT', id: 'pendirian' as const, icon: FilePlus },
            ].map((item) => {
              const isActive = activeSidebarTab === item.id;
              const acc = TAB_ACCENTS[item.id] || TAB_ACCENTS.beranda;
              return (
                <button 
                  key={item.id} 
                  onClick={() => {
                    if (!user) {
                      if (confirm(`Anda harus login terlebih dahulu untuk mengakses menu "${item.label}".`)) {
                        loginWithGoogle();
                      }
                      return;
                    }
                    setActiveSidebarTab(item.id);
                  }} 
                  className={`relative w-full text-left pl-7 pr-5 py-2.5 transition-all flex items-center justify-between select-none ${
                    isActive 
                      ? `${acc.bgColor} ${acc.textColor} font-semibold` 
                      : `text-slate-600 ${acc.hoverBg}`
                  }`}
                >
                  {isActive && (
                    <div className={`absolute left-0 top-1.5 bottom-1.5 w-[4.5px] rounded-r-md ${acc.indicatorBg}`} />
                  )}
                  <span className="flex items-center gap-3">
                    <item.icon 
                      size={20} 
                      strokeWidth={isActive ? 2.25 : 2.0}
                      className={`shrink-0 transition-colors ${isActive ? acc.iconColor : 'text-slate-400'}`} 
                    />
                    <span>{item.label}</span>
                  </span>
                  {!user && (
                    <Lock size={12} className="text-slate-400/50 shrink-0" />
                  )}
                </button>
              );
            })}

            {/* Menu Header: DOKUMEN & DATA */}
            <div className="px-5 pt-6 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
              Dokumen & Data
            </div>

            {[
              { label: 'Mapping KBLI 2020-2025', id: 'kbli_mapping' as const, icon: ArrowRightLeft },
              { label: 'Saran KBLI', id: 'saran_kbli' as const, icon: Lightbulb },
              { label: 'Surat Perbaikan Data', id: 'perbaikan' as const, icon: Mail },
              { label: 'Panduan Penggunaan', id: 'panduan' as const, icon: BookOpen },
            ].map((item) => {
              const isActive = activeSidebarTab === item.id;
              const acc = TAB_ACCENTS[item.id] || TAB_ACCENTS.beranda;
              return (
                <button 
                  key={item.id} 
                  onClick={() => {
                    if (!user) {
                      if (confirm(`Anda harus login terlebih dahulu untuk mengakses menu "${item.label}".`)) {
                        loginWithGoogle();
                      }
                      return;
                    }
                    setActiveSidebarTab(item.id);
                  }} 
                  className={`relative w-full text-left px-5 py-2.5 transition-all flex items-center justify-between select-none ${
                    isActive 
                      ? `${acc.bgColor} ${acc.textColor} font-semibold` 
                      : `text-slate-600 ${acc.hoverBg}`
                  }`}
                >
                  {isActive && (
                    <div className={`absolute left-0 top-1.5 bottom-1.5 w-[4.5px] rounded-r-md ${acc.indicatorBg}`} />
                  )}
                  <span className="flex items-center gap-3">
                    <item.icon 
                      size={20} 
                      strokeWidth={isActive ? 2.25 : 2.0}
                      className={`shrink-0 transition-colors ${isActive ? acc.iconColor : 'text-slate-400'}`} 
                    />
                    <span>{item.label}</span>
                  </span>
                  {!user && (
                    <Lock size={12} className="text-slate-400/55 shrink-0" />
                  )}
                </button>
              );
            })}

            {user?.email === 'appnotputri@gmail.com' && (() => {
              const isActive = activeSidebarTab === 'import_kbli';
              const acc = TAB_ACCENTS.import_kbli;
              return (
                <div className="pt-2 px-5">
                  <button 
                    onClick={() => setActiveSidebarTab('import_kbli')} 
                    className={`relative w-full text-left px-4 py-2.5 rounded-lg transition-all flex items-center gap-3 select-none ${
                      isActive 
                        ? `${acc.bgColor} ${acc.textColor} font-semibold border border-transparent` 
                        : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    <RefreshCw 
                      size={15} 
                      strokeWidth={isActive ? 2.25 : 2.00}
                      className={`shrink-0 transition-colors ${isActive ? acc.iconColor : 'text-slate-500'}`} 
                    />
                    <span>Import KBLI 2025</span>
                  </button>
                </div>
              );
            })()}
          </div>
        </aside>
      )}

      {/* Main Container viewport on right side */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Dynamic Nav Header next to the Sidebar */}
        {!showPublicWizard && (
          <header className="bg-white border-b border-slate-200/80 flex justify-between items-center px-6 sticky top-0 z-50 h-16 shrink-0 shadow-sm">
            {/* Left: Greeting + Sidebar toggle */}
            <div className="flex items-center gap-4">
              {user && (
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 hover:bg-slate-100/90 text-slate-500 hover:text-slate-800 rounded transition-colors shrink-0">
                  <Menu className="w-5 h-5" />
                </button>
              )}
              <div className="flex flex-col">
                <span className="font-semibold text-sm text-slate-800">Selamat siang, Azizah 👋</span>
                <span className="text-[10px] text-slate-500 font-medium tracking-tight">PUSAT KENDALI KANTOR</span>
              </div>
            </div>
            
            {/* Right: Date/Time + Notifications + Profile */}
            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg font-medium">
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>Minggu, 14 Juni 2026</span>
                  <span className="text-slate-300">•</span>
                  <span>13:34</span>
                </div>

                <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
                  {/* Notification Logic */}
                  {(() => {
                    const unreadCount = notifications.filter(n => !n.read).length;
                    return (
                      <div className="relative">
                        <button 
                          onClick={() => {
                            setIsNotificationOpen(!isNotificationOpen);
                            setIsUserDropdownOpen(false);
                          }}
                          className={`p-2 rounded-full transition-all shrink-0 cursor-pointer outline-none relative ${
                            isNotificationOpen 
                              ? 'text-blue-600 bg-blue-50' 
                              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <Bell className="w-5 h-5" />
                          {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>}
                        </button>
                        
                        {/* Notification Dropdown */}
                        {isNotificationOpen && (
                          <div className="absolute right-0 mt-2.5 w-80 md:w-96 bg-white rounded-xl shadow-2xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <Bell className="w-3.5 h-3.5 text-blue-600" /> Notifikasi
                              </span>
                              {unreadCount > 0 && (
                                <button 
                                  onClick={async () => {
                                    try {
                                      const unreadNotifs = notifications.filter(n => !n.read);
                                      await Promise.all(
                                        unreadNotifs.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true }))
                                      );
                                    } catch (err) {
                                      console.error("Gagal tandai semua dibaca:", err);
                                    }
                                  }}
                                  className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                                >
                                  Tandai semua dibaca
                                </button>
                              )}
                            </div>
                            
                            <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                              {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                                  <BellOff className="w-8 h-8 text-slate-300 mb-2" />
                                  <p className="text-xs text-slate-500 font-medium">Tidak ada notifikasi baru</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">Semua info terbaru dari sistem akan muncul di sini</p>
                                </div>
                              ) : (
                                [...notifications].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((notif) => (
                                  <div key={notif.id} className={`p-3 transition-colors hover:bg-slate-50/50 flex gap-2.5 items-start text-left ${!notif.read ? 'bg-blue-50/20' : ''}`}>
                                    {/* Status Type Icon */}
                                    <div className={`mt-0.5 p-1 rounded-lg shrink-0 ${
                                      notif.type === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' :
                                      notif.type === 'ERROR' ? 'bg-rose-50 text-rose-600' :
                                      notif.type === 'WARNING' ? 'bg-amber-50 text-amber-600' :
                                      'bg-blue-50 text-blue-600'
                                    }`}>
                                      {notif.type === 'SUCCESS' ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                                       notif.type === 'ERROR' ? <AlertCircle className="w-3.5 h-3.5" /> :
                                       notif.type === 'WARNING' ? <AlertTriangle className="w-3.5 h-3.5" /> :
                                       <Info className="w-3.5 h-3.5" />}
                                    </div>

                                    {/* Notification content */}
                                    <div className="flex-1 space-y-0.5 min-w-0">
                                      <div className="flex items-start justify-between gap-1.5">
                                        <span className={`text-xs block leading-tight truncate ${!notif.read ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                                          {notif.title}
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-mono whitespace-nowrap shrink-0">
                                          {(() => {
                                            try {
                                              const diffMs = Date.now() - new Date(notif.timestamp).getTime();
                                              const diffMins = Math.floor(diffMs / 60000);
                                              if (diffMins < 1) return 'Baru saja';
                                              if (diffMins < 60) return `${diffMins}m lalu`;
                                              const diffHours = Math.floor(diffMins / 60);
                                              if (diffHours < 24) return `${diffHours}j lalu`;
                                              return new Date(notif.timestamp).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'});
                                            } catch {
                                              return 'Baru saja';
                                            }
                                          })()}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-500 leading-normal break-words">{notif.description}</p>
                                      
                                      {/* Actions row */}
                                      <div className="flex gap-2.5 pt-1">
                                        {!notif.read && (
                                          <button 
                                            onClick={async () => {
                                              try {
                                                await updateDoc(doc(db, 'notifications', notif.id), { read: true });
                                              } catch (err) {
                                                console.error("Gagal tandai dibaca:", err);
                                              }
                                            }}
                                            className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                                          >
                                            Tandai Dibaca
                                          </button>
                                        )}
                                        <button 
                                          onClick={async () => {
                                            try {
                                              await deleteDoc(doc(db, 'notifications', notif.id));
                                            } catch (err) {
                                              console.error("Gagal menghapus notifikasi:", err);
                                            }
                                          }}
                                          className="text-[10px] text-slate-400 hover:text-red-600 font-medium hover:underline cursor-pointer"
                                        >
                                          Hapus
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  
                  <button className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                    <Mail className="w-5 h-5 text-slate-500" />
                  </button>
                  <button className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                    <Moon className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                {/* Profile Logic */}
                <div className="relative">
                   <button 
                     onClick={() => {
                       setIsUserDropdownOpen(!isUserDropdownOpen);
                       setIsNotificationOpen(false);
                     }}
                     className="flex items-center gap-3 text-left hover:bg-slate-50 p-1 rounded-lg transition-all cursor-pointer"
                   >
                     <div className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-bold shadow-inner">AZ</div>
                     <div className="flex flex-col">
                         <span className="text-xs font-semibold text-slate-800">{user?.displayName || 'Azizah'}</span>
                         <span className="text-[10px] text-slate-500 leading-none">{user?.email || 'Staff Kantor'}</span>
                     </div>
                     <ChevronDown className="w-4 h-4 text-slate-400" />
                   </button>
                   
                   {/* User Profile Dropdown Menu */}
                   {isUserDropdownOpen && (
                     <div className="absolute right-0 mt-2.5 w-60 bg-white rounded-xl shadow-2xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 divide-y divide-slate-100">
                       <div className="px-4 py-2.5">
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Masuk Sebagai</p>
                         <p className="text-xs font-bold text-slate-800 truncate mt-1">{user?.displayName || 'Azizah'}</p>
                         <p className="text-[10px] text-slate-505 truncate font-mono mt-0.5">{user?.email || 'admin@legalnotaris.id'}</p>
                       </div>
                       
                       <div className="py-1 text-left row">
                         <button 
                           onClick={() => {
                             setActiveSidebarTab('beranda');
                             setIsUserDropdownOpen(false);
                           }}
                           className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
                         >
                           <Home className="w-3.5 h-3.5 text-slate-400" />
                           <span>Dashboard Utama</span>
                         </button>

                         <button 
                           onClick={() => {
                             if (!user) {
                               if (confirm('Anda harus login terlebih dahulu untuk mengakses menu "Klien PT".')) {
                                 loginWithGoogle();
                               }
                             } else {
                               setActiveSidebarTab('company_profile');
                             }
                             setIsUserDropdownOpen(false);
                           }}
                           className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
                         >
                           <Building2 className="w-3.5 h-3.5 text-slate-400" />
                           <span>Database Klien PT</span>
                         </button>
                       </div>

                       <div className="py-1 text-left">
                         <button 
                           onClick={() => {
                             if (user) {
                               logout();
                             } else {
                               loginWithGoogle();
                             }
                             setIsUserDropdownOpen(false);
                           }}
                           className={`w-full px-4 py-2 text-left text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
                             user ? 'text-red-600 hover:bg-red-50/50' : 'text-blue-600 hover:bg-blue-50/55'
                           }`}
                         >
                           <Lock className="w-3.5 h-3.5" />
                           <span>{user ? 'Keluar Aplikasi' : 'Login / Masuk Google'}</span>
                         </button>
                       </div>
                     </div>
                   )}
                </div>
            </div>
          </header>
        )}
        {showPublicWizard ? (
          <RupstPublicWizard
            data={data}
            updateData={updateData}
            isSaving={isSaving}
            openShareholderEditor={openShareholderEditor}
            deleteShareholder={deleteShareholder}
            handleSave={async () => {
              if (!data.companyName) return alert('Nama perseroan harus diisi');
              setIsSaving(true);
              const newId = crypto.randomUUID();
              const profileData = {
                  ...data,
                  id: newId
              };
              try {
                  await setDoc(doc(db, 'rupst_public_projects', profileData.id), sanitizeForFirestore(profileData));
                  alert('RUPST Public berhasil disimpan dan dikirim ke Notaris!');
                  updateData({ ...INITIAL_STATE } as any);
              } catch (e) {
                  handleFirestoreError(e, OperationType.WRITE, `rupst_public_projects/${profileData.id}`);
              } finally {
                  setIsSaving(false);
              }
            }}
            goBack={() => {
                alert('Silakan login di pojok kanan atas untuk melihat Notulen Anda sebelumnya.');
                window.location.href = '/';
            }}
          />
        ) : (
          <main className="flex-1 overflow-y-auto bg-[#f8fafc] p-6 md:p-8 pb-24 scroll-smooth">
          
          {activeSidebarTab === 'beranda' ? (
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
              
              {/* Redesigned Brand Header row inside dashboard content with Date and Action Buttons */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
                  <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5 bg-slate-100 border border-slate-200/50 px-2.5 py-1 rounded-md w-fit">
                    <Clock className="w-3.5 h-3.5 text-[#1890ff]" /> {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={() => {
                      setEditingProjectId('new');
                      updateData({ ...INITIAL_STATE } as any);
                      setActiveSidebarTab('notulen');
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-md hover:shadow-lg transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" /> RUPS LB
                  </button>
                  <button
                    onClick={() => {
                      setEditingRupstId('new');
                      updateData({ ...INITIAL_STATE } as any);
                      setActiveSidebarTab('rupst');
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs shadow-md hover:shadow-lg transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" /> RUPST
                  </button>
                  <button
                    onClick={() => {
                      setActiveSidebarTab('pendirian');
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg font-bold text-xs shadow-sm hover:shadow transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" /> Pendirian PT
                  </button>
                </div>
              </div>

              {/* Stats Card Row - 4 beautiful cards matching screenshot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { label: "Klien PT", val: profiles.length, desc: "Database klien perusahaan", icon: Building2, color: "text-[#1890ff] bg-blue-50/80 border-blue-100", tab: "company_profile" as const },
                  { label: "Draft RUPS LB", val: projects.length, desc: "Keputusan Sirkuler & Berita Acara", icon: FileText, color: "text-amber-600 bg-amber-50/85 border-amber-100/80", tab: "notulen" as const },
                  { label: "Draft RUPS Tahunan", val: rupstProjects.length, desc: "Pertanggungjawaban tahun buku", icon: History, color: "text-emerald-600 bg-emerald-50/80 border-emerald-100/70", tab: "rupst" as const },
                  { label: "Draft Pendirian PT", val: pendirianProjects.length, desc: "Draft akta pendirian", icon: FileCode, color: "text-purple-600 bg-purple-50/80 border-purple-100/60", tab: "pendirian" as const }
                ].map((st, i) => (
                  <div 
                    key={i} 
                    onClick={() => setActiveSidebarTab(st.tab)}
                    className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1 pr-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{st.label}</span>
                      <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{st.val}</h2>
                      <p className="text-[10px] text-slate-400 truncate leading-tight font-medium">{st.desc}</p>
                    </div>
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border transition-all group-hover:scale-105 ${st.color}`}>
                      <st.icon size={40} className="shrink-0" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Actions (QUICK ACCESS) workflow rows - 3 Elegant Columns */}
              <div className="space-y-3.5">
                <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider pl-2.5 border-l-4 border-blue-600 select-none">
                  Quick Access
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { title: "Daftar Klien PT", sub: "Kelola dan lihat seluruh data klien perusahaan.", color: "text-blue-600 bg-blue-50 border-blue-104", icon: Building2, tab: "company_profile" as const },
                    { title: "RUPS Tahunan", sub: "Lihat dan kelola draf RUPS Tahunan terbaru.", color: "text-amber-600 bg-amber-50 border-amber-104", icon: History, tab: "rupst" as const },
                    { title: "Dokumen & Arsip", sub: "Akses semua draf dokumen dan arsip legalitas.", color: "text-teal-600 bg-teal-50 border-teal-104", icon: BookOpen, tab: "notulen" as const }
                  ].map((x, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveSidebarTab(x.tab)}
                      className="group border border-slate-200 hover:border-blue-400 p-4 rounded-xl text-left bg-white transition-all hover:shadow-md flex flex-col justify-between h-36"
                    >
                      <div className="space-y-2">
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${x.color} group-hover:scale-110`}>
                          <x.icon className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-800 text-[12px] group-hover:text-blue-600 transition-colors">{x.title}</h4>
                          <p className="text-[10px] text-slate-400 leading-snug font-medium line-clamp-2">{x.sub}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-600 uppercase flex items-center gap-1 mt-2.5">
                        Mulai <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Split: Dynamic Activities & Documents inside Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-4">
                
                {/* Cell 1: Recent Activities Card */}
                <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm flex flex-col h-[400px]">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100 shrink-0">
                    <h3 className="text-slate-800 font-extrabold text-sm tracking-tight flex items-center gap-2 select-none">
                      <span className="w-1.5 h-4 bg-blue-500 rounded-sm"></span> AKTIVITAS TERAKHIR
                    </h3>
                    <button 
                      onClick={() => setActiveSidebarTab('notulen')} 
                      className="text-[#1890ff] hover:underline text-[11px] font-bold uppercase tracking-wider select-none"
                    >
                      Lihat semua
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 pt-3 pr-1">
                    {compiledActivities.map(item => (
                      <div 
                        key={item.id} 
                        className="p-3 border border-slate-100 hover:border-slate-200 rounded-lg bg-slate-50/50 hover:bg-slate-50/80 transition-all flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 border border-slate-200/50">
                            <FileText className="w-4 h-4 text-slate-500" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 text-[12px] truncate">{item.desc}</h4>
                            <span className="flex items-center gap-1 font-medium text-[10px] text-slate-400 mt-0.5">
                              <Clock className="w-3 h-3 text-slate-300" /> {item.time}
                            </span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-tight shrink-0 select-none ${
                          item.status === 'Selesai' ? 'bg-green-50 text-green-700 border border-green-200/50' : 
                          item.status === 'Dalam Proses' ? 'bg-blue-50 text-blue-700 border border-blue-200/50' : 
                          'bg-amber-50 text-amber-700 border border-amber-200/50'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => setActiveSidebarTab('notulen')} 
                    className="w-full mt-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-lg text-xs font-bold border border-slate-200/70 shrink-0 transition-all tracking-wide shadow-sm"
                  >
                    Lihat semua aktivitas
                  </button>
                </div>

                {/* Cell 2: Latest Documents Card */}
                <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm flex flex-col h-[400px]">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100 shrink-0">
                    <h3 className="text-slate-800 font-extrabold text-sm tracking-tight flex items-center gap-2 select-none">
                      <span className="w-1.5 h-4 bg-teal-500 rounded-sm"></span> DOKUMEN TERBARU
                    </h3>
                    <button 
                      onClick={() => setActiveSidebarTab('notulen')} 
                      className="text-[#1890ff] hover:underline text-[11px] font-bold uppercase tracking-wider select-none"
                    >
                      Lihat semua
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 pt-3 pr-1">
                    {compiledDocuments.map(item => (
                      <div 
                        key={item.id} 
                        className="p-3 border border-slate-100 hover:border-slate-200 rounded-lg bg-slate-50/50 hover:bg-slate-50/80 transition-all flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 border border-slate-200/50">
                            <FileCheck className="w-4 h-4 text-teal-600" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 text-[12px] truncate">{item.name}</h4>
                            <span className="font-bold text-[10px] text-[#1890ff] block truncate leading-none mt-0.5">{item.sub}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider border select-none ${
                            item.format === 'PDF' ? 'bg-rose-50 text-rose-700 border-rose-200/60' : 'bg-blue-50 text-blue-700 border-blue-200/60'
                          }`}>
                            {item.format}
                          </span>
                          <button 
                            onClick={() => handleDownloadProject(item)}
                            title="Unduh draf akta asli" 
                            className="bg-white hover:bg-slate-100 p-1.5 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200/70 transition-all shrink-0"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => setActiveSidebarTab('notulen')} 
                    className="w-full mt-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-lg text-xs font-bold border border-slate-200/70 shrink-0 transition-all tracking-wide shadow-sm"
                  >
                    Lihat semua dokumen
                  </button>
                </div>

              </div>
              
            </div>
          ) : activeSidebarTab === 'company_profile' ? (
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="flex justify-between items-center bg-white p-4 rounded-sm shadow-sm border border-slate-200">
                <div>
                  <h2 className="text-[16px] font-bold flex items-center gap-2 text-slate-800 uppercase"><Building2 className="w-5 h-5 text-[#3b5998]" /> Klien PT</h2>
                  <p className="text-[12px] text-slate-500">Kelola daftar profil klien PT untuk digunakan pada notulen dan akta</p>
                </div>
                {!editingProfileId && (
                  <button onClick={() => {
                    setEditingProfileId('new');
                    setIsProfilePreview(false);
                    updateData({ ...INITIAL_STATE } as any);
                  }} className="bg-[#3b5998] hover:bg-[#2d4373] text-white px-4 py-2 rounded-sm font-bold text-[12px] flex items-center gap-2 transition-colors">
                    <Plus className="w-4 h-4" /> TAMBAH KLIEN PT
                  </button>
                )}
              </div>

              {editingProfileId ? (
                <div className="space-y-4 pb-20">
                  <div className="flex flex-wrap items-center gap-2 bg-slate-50/50 p-2 rounded-md border border-slate-200">
                    <button className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold text-[12px] uppercase bg-white px-3 py-2 rounded-sm border border-slate-200 shadow-sm" onClick={() => setEditingProfileId(null)}>
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
                        <button 
                          onClick={async (e) => {
                            e.preventDefault();
                            if(confirm('Hapus profil ' + data.companyName + '?')) {
                              if (!user) return alert('Anda harus login!');
                              try {
                                const deletedName = data.companyName || 'PT Baru';
                                await deleteDoc(doc(db, 'profiles', editingProfileId));
                                recordNotification(
                                  'Klien PT Dihapus',
                                  `Profil klien "${deletedName}" telah berhasil dihapus oleh ${user?.email || 'Admin'}.`,
                                  'delete_profile'
                                );
                                alert('Profil berhasil dihapus');
                                setEditingProfileId(null);
                              } catch (err) {
                                handleFirestoreError(err, OperationType.DELETE, `profiles/${editingProfileId}`);
                              }
                            }
                          }}
                          className="px-5 py-2 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 rounded-md font-bold transition-all text-[13px] border border-red-100 hover:border-red-500 shadow-sm flex items-center gap-2 uppercase">
                          <Trash2 className="w-4 h-4" /> Hapus
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={resetData} className="px-5 py-2 bg-[#d9534f] text-white rounded-md text-[13px] font-bold transition-all hover:bg-[#c9302c] shadow-sm uppercase">RISET</button>
                        <button 
                          disabled={isSaving}
                          onClick={async () => {
                           if (!data.companyName) return alert('Nama perseroan harus diisi');
                           setIsSaving(true);
                           const isNew = editingProfileId === 'new' || !editingProfileId;
                           const newId = editingProfileId && editingProfileId !== 'new' ? editingProfileId : crypto.randomUUID();
                           const profileData = {
                               ...data,
                               id: newId,
                               updatedAt: new Date().toISOString()
                           };
                           if (!user) {
                             setIsSaving(false);
                             return alert('Anda harus login terlebih dahulu!');
                           }
                           
                           try {
                               await setDoc(doc(db, 'profiles', profileData.id), sanitizeForFirestore(profileData));
                               recordNotification(
                                 isNew ? 'Klien PT Baru Dibuat' : 'Profil Klien PT Diubah',
                                 `Profil klien "${profileData.companyName}" telah ${isNew ? 'berhasil didaftarkan' : 'diperbarui'} oleh ${user?.email || 'Admin'}.`,
                                 isNew ? 'create_profile' : 'update_profile'
                               );
                               setEditingProfileId(null);
                               alert('Profil berhasil disimpan!');
                           } catch (e) {
                               handleFirestoreError(e, OperationType.WRITE, `profiles/${profileData.id}`);
                           } finally {
                               setIsSaving(false);
                           }
                        }} className="px-5 py-2 bg-[#40bdae] text-white rounded-md text-[13px] font-bold transition-all hover:bg-[#349c8f] shadow-sm uppercase disabled:opacity-50 disabled:cursor-not-allowed">
                          {isSaving ? 'MENYIMPAN...' : 'SIMPAN PROFIL'}
                        </button>
                      </>
                    )}
                  </div>
                  
                  <fieldset disabled={isProfilePreview} className="space-y-4">
                    {/* DATA PERSEROAN */}
            
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
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openShareholderEditor('lama')} className="bg-[#222d32] text-white px-3 py-1.5 rounded-sm text-[12px] font-bold shadow hover:bg-black transition-colors flex items-center gap-1"><Plus className="w-4 h-4" /> Tambah Data</button>
                  </div>
                  <div className="border border-slate-200 overflow-x-auto rounded-sm">
                    <table className="w-full text-left text-[11px]">
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

              {/* MAKSUD DAN TUJUAN (KBLI) PERSEROAN */}
              <AhuSection title="MAKSUD DAN TUJUAN (KBLI) PERSEROAN">
                <div className="space-y-4">
                  {/* Tambah KBLI Button */}
                  <div className="mb-2">
                    <button
                      type="button"
                      onClick={() => setIsAddKbliModalOpen(true)}
                      className="px-4 py-2 bg-[#3b5998] hover:bg-[#2d4373] text-white text-[12px] font-bold rounded-sm transition-all focus:outline-none flex items-center gap-1.5 uppercase shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Data KBLI
                    </button>
                  </div>

                  {/* Selected KBLIs List Table */}
                  <div className="w-full bg-white border border-slate-200 rounded-sm overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[12px]">
                        <thead>
                          <tr className="bg-[#f8fafc] border-b border-slate-200 uppercase font-semibold text-slate-600 text-[11px] tracking-wider">
                            <th className="px-4 py-3 text-center w-12 border-r border-slate-200 text-[#3b5998]">No</th>
                            <th className="px-4 py-3 text-center w-24 border-r border-slate-200">Kode KBLI</th>
                            <th className="px-4 py-3 text-left w-64 border-r border-slate-200">Judul KBLI</th>
                            <th className="px-4 py-3 text-left border-r border-slate-200">Uraian / Deskripsi Kegiatan</th>
                            <th className="px-4 py-3 text-center w-20 text-[#3b5998]">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(data.kbliItems || []).map((item, idx) => (
                            <tr key={item.id} className="hover:bg-slate-50/40">
                              <td className="px-4 py-3 text-center border-r border-slate-100 text-slate-500 font-bold align-top">{idx + 1}</td>
                              <td className="px-4 py-3 text-center border-r border-slate-100 font-mono text-slate-800 font-semibold align-top">{item.code}</td>
                              <td className="px-4 py-3 border-r border-slate-100 font-bold text-slate-800 align-top uppercase leading-tight">{item.name}</td>
                              <td className="px-4 py-3 border-r border-slate-100 text-slate-600 align-top">
                                <textarea
                                  value={item.description || ''}
                                  onChange={(e) => {
                                    updateData({
                                      kbliItems: (data.kbliItems || []).map(k =>
                                        k.id === item.id ? { ...k, description: e.target.value } : k
                                      )
                                    });
                                  }}
                                  className="w-full text-[11px] p-2 border border-slate-200 rounded font-medium focus:border-[#3b5998] outline-none bg-white text-slate-800 resize-y min-h-[90px]"
                                  placeholder="Edit uraian kegiatan jika diperlukan..."
                                />
                              </td>
                              <td className="px-4 py-3 text-center align-top whitespace-nowrap">
                                <button 
                                  onClick={() => updateData({ kbliItems: (data.kbliItems || []).filter(k => k.id !== item.id) })}
                                  className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-all"
                                  title="Hapus KBLI"
                                >
                                  <Trash2 className="w-4 h-4 mx-auto" />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {(!data.kbliItems || data.kbliItems.length === 0) && (
                            <tr>
                              <td colSpan={5} className="text-center py-10 text-slate-400 italic">
                                Belum ada data KBLI terpilih. Silakan klik tombol "Tambah Data KBLI" di atas.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </AhuSection>

            

{/* JENIS NOTULEN */}
            

                  </fieldset>
                </div>
              ) : (() => {
                  // 1. Filter by archive status
                  let filteredProfileResults = profiles.filter(p => {
                    if (showArchivedProfiles) {
                      return !!p.isArchived;
                    } else {
                      return !p.isArchived;
                    }
                  });

                  // 2. Initial filter by search query (PT Name or Domicile or City)
                  filteredProfileResults = filteredProfileResults.filter(p => {
                    if (!profileSearchQuery) return true;
                    const q = profileSearchQuery.toLowerCase();
                    return (
                      (p.companyName || '').toLowerCase().includes(q) ||
                      (p.domicile || '').toLowerCase().includes(q) ||
                      (p.newAddress?.city || '').toLowerCase().includes(q)
                    );
                  });

                  // 2. Filter by Year Dropdown Selection (via establishmentDeedDate)
                  if (selectedProfileYear !== "all") {
                    filteredProfileResults = filteredProfileResults.filter(p => {
                      const year = p.establishmentDeedDate ? new Date(p.establishmentDeedDate).getFullYear().toString() : "";
                      return year === selectedProfileYear;
                    });
                  }

                  // 3. Extract unique years
                  const uniqueProfileYears = Array.from(new Set(
                    profiles
                      .map(p => p.establishmentDeedDate ? new Date(p.establishmentDeedDate).getFullYear().toString() : "")
                      .filter(Boolean)
                  )).sort((a, b) => Number(b) - Number(a));

                  // 4. Sort results
                  const sortedProfileResults = [...filteredProfileResults].sort((a, b) => {
                    let valA = "";
                    let valB = "";

                    if (profileSortField === "companyName") {
                      valA = a.companyName || "";
                      valB = b.companyName || "";
                    } else if (profileSortField === "domicile") {
                      valA = a.domicile || a.newAddress?.city || "";
                      valB = b.domicile || b.newAddress?.city || "";
                    } else if (profileSortField === "establishmentDeedDate") {
                      valA = a.establishmentDeedDate || "";
                      valB = b.establishmentDeedDate || "";
                    } else if (profileSortField === "updatedAt") {
                      valA = a.updatedAt || a.establishmentDeedDate || "";
                      valB = b.updatedAt || b.establishmentDeedDate || "";
                    }

                    if (valA < valB) return profileSortOrder === "asc" ? -1 : 1;
                    if (valA > valB) return profileSortOrder === "asc" ? 1 : -1;
                    return 0;
                  });

                  // 5. Pagination calculation
                  const profileItemsPerPage = 10;
                  const totalProfileItems = sortedProfileResults.length;
                  const totalProfilePages = Math.ceil(totalProfileItems / profileItemsPerPage) || 1;
                  
                  // Adjust current page if out of range
                  const safeProfileCurrentPage = Math.min(profileCurrentPage, totalProfilePages);
                  const profileStartIndex = (safeProfileCurrentPage - 1) * profileItemsPerPage;
                  const paginatedProfileResults = sortedProfileResults.slice(profileStartIndex, profileStartIndex + profileItemsPerPage);

                  const formatProfileLastUpdated = (dateStr?: string, establishmentDate?: string) => {
                    const dateToFormat = dateStr || establishmentDate;
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

                  const handleProfileSort = (field: string) => {
                    if (profileSortField === field) {
                      setProfileSortOrder(profileSortOrder === "asc" ? "desc" : "asc");
                    } else {
                      setProfileSortField(field);
                      setProfileSortOrder("asc");
                    }
                    setProfileCurrentPage(1);
                  };

                  const renderProfileSortArrows = (field: string) => {
                    const isActive = profileSortField === field;
                    return (
                      <span className="inline-flex flex-col text-[8px] text-slate-400 shrink-0 ml-1.5 leading-none select-none">
                        <span className={`${isActive && profileSortOrder === "asc" ? "text-blue-600 font-bold" : "text-slate-300"}`}>▲</span>
                        <span className={`${isActive && profileSortOrder === "desc" ? "text-blue-600 font-bold" : "text-slate-300"}`}>▼</span>
                      </span>
                    );
                  };

                  const getProfilePageRange = () => {
                    const pages: (number | string)[] = [];
                    if (totalProfilePages <= 5) {
                      for (let i = 1; i <= totalProfilePages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (safeProfileCurrentPage > 3) {
                        pages.push("...");
                      }
                      const start = Math.max(2, safeProfileCurrentPage - 1);
                      const end = Math.min(totalProfilePages - 1, safeProfileCurrentPage + 1);
                      for (let i = start; i <= end; i++) {
                        pages.push(i);
                      }
                      if (safeProfileCurrentPage < totalProfilePages - 2) {
                        pages.push("...");
                      }
                      pages.push(totalProfilePages);
                    }
                    return pages;
                  };

                  const handleSearchChange = (val: string) => {
                    setProfileSearchQuery(val);
                    setProfileCurrentPage(1);
                  };

                  return (
                    <div className="space-y-6">
                      {profiles.length > 0 && (
                        <div className="bg-white p-5 rounded-md shadow-sm border border-slate-200">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="flex items-center gap-2">
                                <SlidersHorizontal className="w-5 h-5 text-[#3b5998]" />
                                <h3 className="text-[14px] font-bold text-slate-800 uppercase tracking-tight">
                                  Saring & Cari Klien
                                </h3>
                              </div>
                              {/* Active vs Archived Segmented Control */}
                              <div className="bg-slate-100 p-0.5 rounded-lg flex items-center border border-slate-200/60">
                                <button
                                  onClick={() => {
                                    setShowArchivedProfiles(false);
                                    setProfileCurrentPage(1);
                                  }}
                                  className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all uppercase tracking-wider ${!showArchivedProfiles ? 'bg-white text-[#3b5998] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                  Aktif
                                </button>
                                <button
                                  onClick={() => {
                                    setShowArchivedProfiles(true);
                                    setProfileCurrentPage(1);
                                  }}
                                  className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all uppercase tracking-wider flex items-center gap-1.5 ${showArchivedProfiles ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                  <span>Arsip</span>
                                  {profiles.filter(p => p.isArchived).length > 0 && (
                                    <span className="bg-orange-100 text-orange-700 text-[10px] px-1.5 h-4 rounded-full flex items-center justify-center font-bold">
                                      {profiles.filter(p => p.isArchived).length}
                                    </span>
                                  )}
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 items-center w-full md:w-auto">
                              {/* Search */}
                              <div className="relative w-full sm:w-80">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  placeholder="Cari berdasarkan nama PT atau Kedudukan..."
                                  value={profileSearchQuery}
                                  onChange={(e) => handleSearchChange(e.target.value)}
                                  className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-md text-[12px] outline-none focus:border-[#3b5998] bg-white text-slate-800 placeholder-slate-400 transition-all shadow-sm"
                                />
                                {profileSearchQuery && (
                                  <button
                                    onClick={() => handleSearchChange("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-[14px]"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>

                              {/* Year Filter */}
                              <div className="w-full sm:w-44">
                                <select
                                  value={selectedProfileYear}
                                  onChange={(e) => {
                                    setSelectedProfileYear(e.target.value);
                                    setProfileCurrentPage(1);
                                  }}
                                  className="w-full py-2 px-3 border border-slate-300 rounded-md text-[12px] text-slate-700 font-medium outline-none focus:border-[#3b5998] transition-all bg-white"
                                >
                                  <option value="all">Semua Tahun Pendirian</option>
                                  {uniqueProfileYears.map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Reset Button */}
                              {(profileSearchQuery !== "" || selectedProfileYear !== "all") && (
                                <button
                                  onClick={() => {
                                    setProfileSearchQuery("");
                                    setSelectedProfileYear("all");
                                    setProfileCurrentPage(1);
                                  }}
                                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[12px] font-bold transition-all border border-slate-200 uppercase tracking-wider"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {profiles.length === 0 ? (
                        <div className="bg-slate-50 text-center py-12 rounded-sm border border-dashed border-slate-300 text-slate-500 text-[13px]">
                          Belum ada data klien PT. Klik <strong>"TAMBAH KLIEN PT"</strong> untuk membuat.
                        </div>
                      ) : filteredProfileResults.length === 0 ? (
                        <div className="bg-slate-50 text-center py-8 rounded-sm border border-dashed border-slate-300 text-slate-500 text-[12px]">
                          Tidak ada data klien PT yang cocok dengan pencarian / penyaringan saat ini.
                        </div>
                      ) : (
                        <div className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
                          {/* List count header */}
                          <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                            <span className="text-[12px] font-semibold text-slate-500">
                              Menampilkan <span className="text-slate-800 font-bold">{profileStartIndex + 1}</span> - <span className="text-slate-800 font-bold">{Math.min(profileStartIndex + paginatedProfileResults.length, totalProfileItems)}</span> dari <span className="text-slate-800 font-bold">{totalProfileItems}</span> Klien PT
                            </span>
                          </div>

                          {/* Table structure */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-[12px] border-collapse">
                              <thead className="bg-[#f8fafc] border-b border-slate-200 font-bold uppercase text-slate-600 text-[11px] tracking-wider select-none">
                                <tr>
                                  <th className="p-4 text-center border-r border-slate-200 w-12 text-[#3b5998]">No</th>
                                  <th 
                                    className="p-4 border-r border-slate-200 cursor-pointer hover:bg-slate-100/80 transition-colors"
                                    onClick={() => handleProfileSort("companyName")}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span>NAMA PERSEROAN</span>
                                      {renderProfileSortArrows("companyName")}
                                    </div>
                                  </th>
                                  <th 
                                    className="p-4 border-r border-slate-200 cursor-pointer hover:bg-slate-100/80 transition-colors"
                                    onClick={() => handleProfileSort("domicile")}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span>KEDUDUKAN (KAB/KOTA)</span>
                                      {renderProfileSortArrows("domicile")}
                                    </div>
                                  </th>
                                  <th 
                                    className="p-4 border-r border-slate-200 cursor-pointer hover:bg-slate-100/80 transition-colors"
                                    onClick={() => handleProfileSort("establishmentDeedDate")}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span>TANGGAL AKTA PENDIRIAN</span>
                                      {renderProfileSortArrows("establishmentDeedDate")}
                                    </div>
                                  </th>
                                  <th 
                                    className="p-4 border-r border-slate-200 cursor-pointer hover:bg-slate-100/80 transition-colors"
                                    onClick={() => handleProfileSort("updatedAt")}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span>TERAKHIR DIUBAH</span>
                                      {renderProfileSortArrows("updatedAt")}
                                    </div>
                                  </th>
                                  <th className="p-4 text-center w-16">AKSI</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {paginatedProfileResults.map((p, idx) => {
                                  const currentNo = profileStartIndex + idx + 1;
                                  const city = p.domicile || p.newAddress?.city || '-';
                                  const deedDate = p.establishmentDeedDate ? new Date(p.establishmentDeedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "-";
                                  const lastUpdated = formatProfileLastUpdated(p.updatedAt, p.establishmentDeedDate);

                                  return (
                                    <tr 
                                      key={p.id} 
                                      className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                                      onClick={() => {
                                        setEditingProfileId(p.id);
                                        setIsProfilePreview(true);
                                        updateData({ ...INITIAL_STATE, ...p } as any);
                                      }}
                                    >
                                      <td className="p-4 font-bold text-center border-r border-slate-100 text-slate-500 w-12">{currentNo}</td>
                                      <td className="p-4 font-bold text-slate-800 border-r border-slate-100 uppercase tracking-tight">
                                        <div className="flex items-center gap-3">
                                          <CompanyAvatar name={p.companyName || ''} />
                                          <span>{p.companyName}</span>
                                        </div>
                                        {p.kbliItems && p.kbliItems.length > 0 && (
                                          <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-1 py-0.5 rounded leading-none shrink-0" style={{ color: '#3b5998', backgroundColor: '#eef2f7' }}>KBLI:</span>
                                            {p.kbliItems.map(item => (
                                              <span key={item.id || item.code} className="text-[9px] font-mono font-bold bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 leading-none" title={item.name}>
                                                {item.code}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </td>
                                      <td className="p-4 text-slate-600 border-r border-slate-100 uppercase font-medium">{city}</td>
                                      <td className="p-4 text-slate-600 border-r border-slate-100 uppercase font-medium">{deedDate}</td>
                                      <td className="p-4 text-slate-500 border-r border-slate-100 text-[11px] font-mono">{lastUpdated}</td>
                                      <td className="p-4 text-center relative border-r border-slate-100" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-center">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpenDropdownId(openDropdownId === p.id ? null : p.id);
                                            }}
                                            className={`p-1.5 rounded-md border border-slate-200/45 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-500 hover:text-slate-800 transition-all shadow-sm ${
                                              openDropdownId === p.id ? 'opacity-100 bg-slate-50' : 'opacity-100 sm:opacity-0 group-hover:opacity-100'
                                            }`}
                                            title="Pilihan Aksi"
                                          >
                                            <MoreHorizontal className="w-[18px] h-[18px] stroke-[2.25px]" />
                                          </button>
                                        </div>

                                        {/* Dropdown popup portal */}
                                        {openDropdownId === p.id && (
                                          <div className="absolute right-4 top-13 bg-white border border-slate-200 shadow-xl rounded-xl py-1.5 w-40 z-50 text-left overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenDropdownId(null);
                                                setEditingProfileId(p.id);
                                                setIsProfilePreview(true);
                                                updateData({ ...INITIAL_STATE, ...p } as any);
                                              }}
                                              className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-2 uppercase tracking-wide border-b border-slate-100"
                                            >
                                              <Eye className="w-3.5 h-3.5 text-slate-450 stroke-[2.25px] shrink-0" />
                                              <span>Buka Profil</span>
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenDropdownId(null);
                                                setEditingProfileId(p.id);
                                                setIsProfilePreview(false);
                                                updateData({ ...INITIAL_STATE, ...p } as any);
                                              }}
                                              className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-2 uppercase tracking-wide border-b border-slate-100"
                                            >
                                              <Edit className="w-3.5 h-3.5 text-slate-450 stroke-[2.25px] shrink-0" />
                                              <span>Edit</span>
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenDropdownId(null);
                                                handleDuplicateProfile(p);
                                              }}
                                              className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-2 uppercase tracking-wide border-b border-slate-100"
                                            >
                                              <Copy className="w-3.5 h-3.5 text-slate-450 stroke-[2.25px] shrink-0" />
                                              <span>Duplikat</span>
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenDropdownId(null);
                                                handleArchiveProfile(p);
                                              }}
                                              className={`w-full px-3.5 py-2 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-2 uppercase tracking-wide ${p.isArchived ? 'text-emerald-700 hover:bg-emerald-50/60' : 'text-orange-700 hover:bg-orange-50/60'}`}
                                            >
                                              {p.isArchived ? (
                                                <>
                                                  <Undo className="w-3.5 h-3.5 text-emerald-500 stroke-[2.25px] shrink-0" />
                                                  <span>Pulihkan</span>
                                                </>
                                              ) : (
                                                <>
                                                  <Archive className="w-3.5 h-3.5 text-orange-500 stroke-[2.25px] shrink-0" />
                                                  <span>Arsipkan</span>
                                                </>
                                              )}
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

                          {/* Pagination block */}
                          {totalProfilePages > 1 && (
                            <div className="px-5 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#f8fafc]">
                              <div className="text-[12px] text-slate-500 font-medium">
                                Halaman <span className="text-slate-800 font-bold">{safeProfileCurrentPage}</span> dari <span className="text-slate-800 font-bold">{totalProfilePages}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {/* First */}
                                <button
                                  disabled={safeProfileCurrentPage === 1}
                                  onClick={() => setProfileCurrentPage(1)}
                                  className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[12px] disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold"
                                  title="Halaman Pertama"
                                >
                                  «
                                </button>
                                {/* Prev */}
                                <button
                                  disabled={safeProfileCurrentPage === 1}
                                  onClick={() => setProfileCurrentPage(safeProfileCurrentPage - 1)}
                                  className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[12px] disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold"
                                  title="Halaman Sebelumnya"
                                >
                                  ‹
                                </button>

                                {/* Numbers */}
                                {getProfilePageRange().map((page, idx) => {
                                  if (page === "...") {
                                    return (
                                      <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-slate-400 text-[12px]">
                                        ...
                                      </span>
                                    );
                                  }
                                  return (
                                    <button
                                      key={`page-${page}`}
                                      onClick={() => setProfileCurrentPage(Number(page))}
                                      className={`w-8 h-8 flex items-center justify-center rounded-md text-[12px] font-bold transition-all ${
                                        safeProfileCurrentPage === page
                                          ? "bg-[#3b5998] text-white"
                                          : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                                      }`}
                                    >
                                      {page}
                                    </button>
                                  );
                                })}

                                {/* Next */}
                                <button
                                  disabled={safeProfileCurrentPage === totalProfilePages}
                                  onClick={() => setProfileCurrentPage(safeProfileCurrentPage + 1)}
                                  className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[12px] disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold"
                                  title="Halaman Selanjutnya"
                                >
                                  ›
                                </button>
                                {/* Last */}
                                <button
                                  disabled={safeProfileCurrentPage === totalProfilePages}
                                  onClick={() => setProfileCurrentPage(totalProfilePages)}
                                  className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[12px] disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold"
                                  title="Halaman Terakhir"
                                >
                                  »
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
              })()}
            </div>


) : activeSidebarTab === 'notulen' ? (() => {
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
                          setIsRupsPreview(false);
                          setEditingProjectId(null);
                        }}
                      >
                        <ArrowRight className="w-5 h-5 rotate-180" /> Kembali
                      </button>
                      
                      <div className="h-6 w-px bg-slate-250 mx-1 hidden sm:block"></div>
   
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
                                  alert('RUPS LB berhasil dihapus');
                                  setEditingProjectId(null);
                                  setIsRupsPreview(false);
                                } catch (err) {
                                  handleFirestoreError(err, OperationType.DELETE, `projects/${editingProjectId}`);
                                }
                              }
                            }}
                            className="px-4 bg-red-50 hover:bg-red-500 hover:text-white text-red-650 rounded-xl font-bold transition-all text-[12.5px] border border-red-100 hover:border-red-500 h-11 flex items-center gap-2 uppercase shrink-0"
                          >
                            <Trash2 className="w-[18px] h-[18px]" /> Hapus
                          </button>
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
                              const profileData: CompanyProfile = {
                                  ...data,
                                  id: newId,
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
                                  const isNew = editingProjectId === 'new' || !editingProjectId;
                                   await setDoc(doc(db, 'projects', profileData.id), sanitizeForFirestore(profileData));
                                   recordNotification(
                                     isNew ? 'Draft RUPS LB Baru Dibuat' : 'Draft RUPS LB Diubah',
                                     `Draft RUPS Luar Biasa untuk perusahaan "${profileData.companyName || 'PT Baru'}" telah ${isNew ? 'berhasil dibuat' : 'diperbarui'} oleh ${user?.email || 'Admin'}.`,
                                     isNew ? 'create_rupslb' : 'update_rupslb'
                                   );
                                  setEditingProjectId(null);
                                  setIsRupsPreview(false);
                                  alert('RUPS LB berhasil disimpan!');
                              } catch (e) {
                                  handleFirestoreError(e, OperationType.WRITE, `projects/${profileData.id}`);
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
                            {/* Notulen RUPS LB */}
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
                                <span className="font-bold text-slate-800 leading-tight">Notulen RUPS LB</span>
                                <span className="text-[10px] text-slate-400 lowercase mt-0.5 font-medium">format dokumen (.docx)</span>
                              </div>
                            </button>

                            {/* Draft Akta RUPS LB */}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                setIsRupslbDocDropdownOpen(false);
                                try {
                                  const { generateRUPSDocx } = await import('./src/lib/generateRUPSDocx');
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
                                <span className="font-bold text-slate-800 leading-tight">Draft Akta RUPS LB</span>
                                <span className="text-[10px] text-slate-400 lowercase mt-0.5 font-medium">format dokumen (.docx)</span>
                              </div>
                            </button>

                            {/* Akta Peralihan Saham (Multiple items) */}
                            {mergedData.resolutions.shareholders && mergedData.shareTransfers && mergedData.shareTransfers.length > 0 && (
                               mergedData.shareTransfers.map((transfer, index) => {
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
                    {/* DATA PERSEROAN */}
            
            {/* DATA PERSEROAN (Pilihan dari Profil) */}
            <AhuSection title="PILIH PROFIL">
              <div className="space-y-4">
                <label className="block text-[13px] font-medium text-slate-700 mb-1">Pilih Profil Perseroan untuk mengisi data otomatis</label>
                <select 
                  className="w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none bg-white focus:border-[#66afe9]"
                  value={data.selectedProfileId || ''}
                  onChange={(e) => {
                     const selected = profiles.find(p => p.id === e.target.value);
                     if (selected) {
                         const { 
                           id, 
                           newAddress, 
                           fullAddress, 
                           oldFullAddress, 
                           oldAddress, 
                           oldDomicile,
                           kbliItems,
                           resolutions,
                           targetCapitalBase,
                           targetCapitalPaid,
                           targetCompanyName,
                           targetShareholders,
                           newManagementItems,
                           ...rest 
                         } = selected as any; // Exclude resolution target fields
                         updateData({ 
                           ...rest, 
                           selectedProfileId: selected.id 
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
              </div>
            </AhuSection>

            {activeSidebarTab !== 'notulen' && (
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
                  {data.documentType === 'MINUTES' && (
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-sm flex items-start gap-3">
                      <div className="bg-blue-100 p-1.5 rounded-full"><FileText className="w-4 h-4 text-blue-600" /></div>
                      <div>
                        <div className="text-[12px] font-bold text-blue-800 uppercase">Petunjuk Kehadiran (Notulen)</div>
                        <p className="text-[11px] text-blue-600 leading-tight mt-0.5">
                          Silakan centang kolom <b>"Hadir"</b> di bawah ini untuk setiap pemegang saham yang menghadiri rapat. 
                          Hanya pemegang saham yang dicentang yang akan muncul dalam daftar hadir di dokumen Berita Acara RUPS.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openShareholderEditor('lama')} className="bg-[#222d32] text-white px-3 py-1.5 rounded-sm text-[12px] font-bold shadow hover:bg-black transition-colors flex items-center gap-1"><Plus className="w-4 h-4" /> Tambah Data</button>
                  </div>
                  <div className="border border-slate-200 overflow-x-auto rounded-sm">
                    <table className="w-full text-left text-[11px]">
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
                        <span>Berita Acara RUPS LB</span>
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
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                      <AhuLabel label="Tempat Rapat" />
                      <div className="md:col-span-3">
                        <AhuInput value={data.signingPlace || ''} onChange={e => updateData({ signingPlace: e.target.value })} placeholder="Contoh: Jakarta" />
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
                    <AhuLabel label="Waktu Rapat" />
                    <div className="md:col-span-3">
                      <div className="flex gap-4 items-center">
                        <div className="flex-1">
                          <AhuInput 
                            type="time" 
                            value={data.meetingStartTime || ''} 
                            onChange={e => updateData({ meetingStartTime: e.target.value })} 
                          />
                          <div className="text-[10px] text-slate-400 mt-1">MULAI</div>
                        </div>
                        <div className="flex-1">
                          <AhuInput 
                            type="time" 
                            value={data.meetingEndTime || ''} 
                            onChange={e => updateData({ meetingEndTime: e.target.value })} 
                          />
                          <div className="text-[10px] text-slate-400 mt-1">SELESAI</div>
                        </div>
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <AhuLabel label="Nomor Akta" />
                            <AhuInput 
                              value={data.draftAktaRupsNumber || ''} 
                              onChange={(e) => updateData({ draftAktaRupsNumber: e.target.value })} 
                              placeholder="Contoh: 12"
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

            {data.documentType === 'MINUTES' && (
              <AhuSection title="DATA KEHADIRAN (DAFTAR HADIR)">
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-sm flex items-start gap-3">
                    <div className="bg-blue-100 p-1.5 rounded-full"><FileText className="w-4 h-4 text-blue-600" /></div>
                    <div>
                      <div className="text-[12px] font-bold text-blue-800 uppercase">Petunjuk Kehadiran (Notulen)</div>
                      <p className="text-[11px] text-blue-600 leading-tight mt-0.5">
                        Silakan centang daftar pemegang saham yang hadir di bawah ini. 
                        Anda juga dapat menambahkan tamu/undangan lain yang menghadiri rapat.
                      </p>
                    </div>
                  </div>

                  {/* Shareholder & Management & Guest Attendance */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-[12px] font-bold text-slate-500 uppercase flex items-center gap-2">
                         <Users className="w-3 h-3" /> Kehadiran Pemegang Saham, Pengurus, & Undangan Rapat
                      </h4>
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={() => openShareholderEditor('lama')}
                          className="text-[10px] bg-[#222d32] text-white px-3 py-1 rounded-sm hover:bg-black transition-colors font-bold shadow-sm uppercase flex items-center gap-1"
                        >
                           <Plus className="w-3 h-3" /> Tambah Peserta Rapat
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            const newList = data.shareholders.map(s => ({ ...s, isPresent: true }));
                            updateData({ shareholders: newList });
                          }}
                          className="text-[10px] bg-[#3b5998] text-white px-3 py-1 rounded-sm hover:bg-black transition-colors font-bold shadow-sm uppercase"
                        >
                          Tandai Semua Hadir
                        </button>
                      </div>
                    </div>
                    <div className="border border-slate-200 rounded-sm overflow-hidden">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-[#f9f9f9] border-b border-slate-200 font-bold uppercase">
                          <tr>
                            <th className="p-2 border-r border-slate-200">Nama Peserta</th>
                            <th className="p-2 border-r border-slate-200">Jumlah Saham</th>
                            <th className="p-2 border-r border-slate-200 text-center w-20">Hadir?</th>
                            <th className="p-2 border-r border-slate-200 text-center w-28">Dikuasakan?</th>
                            <th className="p-2 border-r border-slate-200 text-center">Penerima Kuasa</th>
                            <th className="p-2 text-center w-24">Aksi</th>
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
                              <td className="p-2 text-center border-r border-slate-200">
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
                              <td className="p-2 text-center">
                                <div className="flex justify-center items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openShareholderEditor('lama', s)}
                                    className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                                    title="Edit data"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteShareholder(s.id, 'lama')}
                                    className="p-1 text-red-500 hover:text-red-700 transition-colors"
                                    title="Hapus"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {data.shareholders.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-slate-400 italic">Belum ada data pemegang saham. Silakan isi di bagian DATA PERSEROAN atau tambah secara langsung.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>


                </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                    <AhuLabel label="Pimpinan Rapat" />
                    <div className="md:col-span-3">
                      <AhuSelect value={data.meetingChair || ''} onChange={e => updateData({ meetingChair: e.target.value })}>
                        <option value="">-- Pilih Pimpinan Rapat --</option>
                        {Array.from(new Set([
                          ...data.shareholders
                            .filter(sh => sh.isManagement && /direksi|direktur|komisaris/i.test(sh.managementPosition || ''))
                            .map(sh => JSON.stringify({ name: sh.name, position: sh.managementPosition })),
                          ...data.oldManagementItems
                            .filter(m => /direksi|direktur|komisaris/i.test(m.position || ''))
                            .map(m => JSON.stringify({ name: m.name, position: m.position })),
                          ...data.shareholders
                            .filter(sh => sh.isPresent && sh.isProxy && sh.proxyData?.name)
                            .map(sh => JSON.stringify({ name: sh.proxyData!.name, position: 'Kuasa Pemegang Saham' }))
                        ])).map(str => JSON.parse(str)).map((m: any, idx: number) => (
                          <option key={idx} value={m.name}>{m.name} - {m.position}</option>
                        ))}
                      </AhuSelect>
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
                      <div className="grid grid-cols-2 gap-4">
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
                      <div className="grid grid-cols-2 gap-4">
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
                      <table className="w-full text-left border-collapse text-[13px]">
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
            {(data.resolutions.management || data.resolutions.reappointment) && (
              <AhuSection title="DATA PERUBAHAN PENGURUS">
                <div className="space-y-4">
                  <div>
                    <AhuLabel label="Model Perubahan Pengurus" required />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                       {[
                         { id: 'PARTIAL_CHANGE', label: 'Perubahan Sebagian (Hanya yang Keluar/Masuk)', desc: 'Hanya memberhentikan yang keluar dan mengangkat yang baru masuk' },
                         { id: 'ALL_DISMISSED', label: 'Pemberhentian & Pengangkatan Seluruhnya', desc: 'Memberhentikan seluruh pengurus lama dan mengangkat kembali seluruh pengurus baru' },
                         { id: 'REAPPOINTMENT', label: 'Pengangkatan Kembali', desc: 'Sama dengan seluruhnya, namun biasanya digunakan untuk masa jabatan berakhir' }
                       ].map((opt) => (
                         <label key={opt.id} className={`flex flex-col gap-1 p-3 border rounded-sm cursor-pointer transition-all ${data.managementChangeType === opt.id ? 'border-[#3b5998] bg-blue-50 ring-1 ring-[#3b5998]' : 'border-slate-200 hover:bg-slate-50'}`}>
                           <div className="flex items-center gap-2">
                            <input 
                              type="radio" 
                              name="management_change_type"
                              className="w-4 h-4 text-[#3b5998] focus:ring-[#3b5998]"
                              checked={data.managementChangeType === opt.id}
                              onChange={() => updateData({ managementChangeType: opt.id as ManagementChangeType })}
                            />
                            <span className="text-[13px] font-bold text-slate-700">{opt.label}</span>
                           </div>
                           <span className="text-[10px] text-slate-500 ml-6">{opt.desc}</span>
                         </label>
                       ))}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h4 className="text-[13px] font-bold text-[#3b5998] uppercase flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-[#3b5998]" /> Form Pemberitahuan & Pengangkatan Pengurus Baru
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Pilih pengurus yang berhenti, alasan berhenti, dan ganti dengan siapa dari daftar peserta rapat/pemegang saham.
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
                            position: 'Direktur',
                            reason: 'DIBERHENTIKAN_DENGAN_HORMAT' as const,
                            resignationDate: '',
                            replacedByName: '',
                            replacedByPosition: 'Direktur',
                            replacedBySalutation: 'Tuan' as const,
                          };
                          updateData({
                            managementDismissals: [...(data.managementDismissals || []), item]
                          });
                        }}
                        className="text-[11px] bg-[#3b5998] text-white px-3 py-1.5 rounded hover:bg-slate-900 transition-colors font-bold shadow-sm uppercase flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Form Pengurus
                      </button>
                    </div>

                    {(data.managementDismissals || []).length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-slate-200 rounded text-slate-500 text-[12px] bg-slate-50">
                        Belum ada form pengurus yang ditambahkan. Silakan klik "Tambah Form Pengurus" untuk menampilkan form pemberhentian dan pengangkatan.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(data.managementDismissals || []).map((item, idx) => (
                          <div key={item.id} className="p-4 border border-slate-200 rounded bg-[#fcfcfc] shadow-xs relative space-y-4">
                            <button
                              type="button"
                              onClick={() => {
                                updateData({
                                  managementDismissals: (data.managementDismissals || []).filter(d => d.id !== item.id)
                                });
                              }}
                              className="absolute top-3 right-3 text-red-500 hover:text-red-700 p-1"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="text-[12px] font-bold text-[#3b5998] border-b border-slate-200 pb-1 flex items-center gap-1.5">
                              <span>PENGURUS YANG BERHENTI / DIGANTI #{idx + 1}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div>
                                <AhuLabel label="Pilihan" required />
                                <select
                                  className="w-full text-[12px] border border-slate-300 rounded p-1.5 bg-white font-medium focus:border-blue-500 focus:outline-none"
                                  value={item.salutation}
                                  onChange={e => {
                                    updateData({
                                      managementDismissals: (data.managementDismissals || []).map(d =>
                                        d.id === item.id ? { ...d, salutation: e.target.value as any } : d
                                      )
                                    });
                                  }}
                                >
                                  <option value="Tuan">Tuan</option>
                                  <option value="Nyonya">Nyonya</option>
                                  <option value="Nona">Nona</option>
                                </select>
                              </div>

                              <div className="md:col-span-2">
                                <AhuLabel label="Pilih Nama (Dari Peserta Rapat)" required />
                                <div className="relative">
                                  <input
                                    type="text"
                                    list={`dismissal-names-${item.id}`}
                                    placeholder="Ketik atau pilih nama..."
                                    className="w-full text-[12px] border border-slate-300 rounded p-1.5 bg-white font-medium focus:border-blue-500 focus:outline-none uppercase"
                                    value={item.name}
                                    onChange={e => {
                                      updateData({
                                        managementDismissals: (data.managementDismissals || []).map(d =>
                                          d.id === item.id ? { ...d, name: e.target.value } : d
                                        )
                                      });
                                    }}
                                  />
                                  <datalist id={`dismissal-names-${item.id}`}>
                                    {getDeduplicatedNames().map(n => (
                                      <option key={n} value={n} />
                                    ))}
                                  </datalist>
                                </div>
                              </div>

                              <div>
                                <AhuLabel label="Jabatan Saat Ini" required />
                                <input
                                  type="text"
                                  placeholder="Misal: Direktur / Komisaris..."
                                  className="w-full text-[12px] border border-slate-300 rounded p-1.5 bg-white font-medium focus:border-blue-500 focus:outline-none"
                                  value={item.position}
                                  onChange={e => {
                                    updateData({
                                      managementDismissals: (data.managementDismissals || []).map(d =>
                                        d.id === item.id ? { ...d, position: e.target.value } : d
                                      )
                                    });
                                  }}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <AhuLabel label="Alasan Berhenti / Alasan Keluar" required />
                                <select
                                  className="w-full text-[12px] border border-slate-300 rounded p-1.5 bg-white font-medium focus:border-blue-500 focus:outline-none"
                                  value={item.reason}
                                  onChange={e => {
                                    const val = e.target.value as any;
                                    updateData({
                                      managementDismissals: (data.managementDismissals || []).map(d =>
                                        d.id === item.id ? { ...d, reason: val, resignationDate: val === 'DIBERHENTIKAN_DENGAN_HORMAT' ? '' : d.resignationDate } : d
                                      )
                                    });
                                  }}
                                >
                                  <option value="DIBERHENTIKAN_DENGAN_HORMAT">Diberhentikan Dengan Hormat</option>
                                  <option value="MENGUNDURKAN_DIRI">Mengundurkan Diri</option>
                                </select>
                              </div>

                              {(item.reason === 'MENGUNDURKAN_DIRI') && (
                                <div>
                                  <AhuLabel label="Tanggal Surat Pengunduran Diri" required />
                                  <input
                                    type="date"
                                    className="w-full text-[12px] border border-slate-300 rounded p-1.5 bg-white font-medium focus:border-blue-500 focus:outline-none"
                                    value={item.resignationDate || ''}
                                    onChange={e => {
                                      updateData({
                                        managementDismissals: (data.managementDismissals || []).map(d =>
                                          d.id === item.id ? { ...d, resignationDate: e.target.value } : d
                                        )
                                      });
                                    }}
                                  />
                                </div>
                              )}
                            </div>

                            <div className="border-t border-slate-200/60 pt-3">
                              <span className="text-[11px] font-bold text-slate-500 uppercase">Digantikan oleh / Pengganti</span>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
                                <div>
                                  <AhuLabel label="Pilihan" />
                                  <select
                                    className="w-full text-[12px] border border-slate-300 rounded p-1.5 bg-white font-medium focus:border-blue-500 focus:outline-none"
                                    value={item.replacedBySalutation || 'Tuan'}
                                    onChange={e => {
                                      updateData({
                                        managementDismissals: (data.managementDismissals || []).map(d =>
                                          d.id === item.id ? { ...d, replacedBySalutation: e.target.value as any } : d
                                        )
                                      });
                                    }}
                                  >
                                    <option value="Tuan">Tuan</option>
                                    <option value="Nyonya">Nyonya</option>
                                    <option value="Nona">Nona</option>
                                  </select>
                                </div>

                                <div className="md:col-span-2">
                                  <AhuLabel label="Pilih Nama Pengganti (Dari Peserta Rapat)" />
                                  <div className="relative">
                                    <input
                                      type="text"
                                      list={`replacement-names-${item.id}`}
                                      placeholder="Ketik atau pilih nama..."
                                      className="w-full text-[12px] border border-slate-300 rounded p-1.5 bg-white font-medium focus:border-blue-500 focus:outline-none uppercase"
                                      value={item.replacedByName || ''}
                                      onChange={e => {
                                        updateData({
                                          managementDismissals: (data.managementDismissals || []).map(d =>
                                            d.id === item.id ? { ...d, replacedByName: e.target.value } : d
                                          )
                                        });
                                      }}
                                    />
                                    <datalist id={`replacement-names-${item.id}`}>
                                      {getDeduplicatedNames().map(n => (
                                        <option key={n} value={n} />
                                      ))}
                                    </datalist>
                                  </div>
                                </div>

                                <div>
                                  <AhuLabel label="Jabatan Baru" />
                                  <input
                                    type="text"
                                    placeholder="Misal: Direktur Utama..."
                                    className="w-full text-[12px] border border-slate-300 rounded p-1.5 bg-white font-medium focus:border-blue-500 focus:outline-none"
                                    value={item.replacedByPosition || ''}
                                    onChange={e => {
                                      updateData({
                                        managementDismissals: (data.managementDismissals || []).map(d =>
                                          d.id === item.id ? { ...d, replacedByPosition: e.target.value } : d
                                        )
                                      });
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </AhuSection>
            )}

            {/* PENGANGKATAN KEMBALI */}
            {data.resolutions.reappointment && (
              <AhuSection title="Pengangkatan Kembali Pengurus">
                <div className="space-y-4">
                  <div>
                    <AhuLabel label="Pilihan Akhir Masa Jabatan" required />
                    <div className="space-y-3 mt-2">
                       {[
                         'Sampai dengan penutupan RUPS Tahunan yang ke-5 (lima)',
                         'Untuk jangka waktu 5 (lima) tahun',
                         'Sampai dengan ditentukan lain oleh RUPS'
                       ].map((opt) => (
                         <label key={opt} className="flex items-center gap-3 p-3 border border-slate-200 rounded-sm hover:bg-slate-50 cursor-pointer transition-colors group">
                           <input 
                             type="radio" 
                             name="masa_jabatan"
                             className="w-4 h-4 text-[#3b5998] focus:ring-[#3b5998]"
                             checked={data.managementEffectiveUntil === opt}
                             onChange={() => updateData({ managementEffectiveUntil: opt })}
                           />
                           <span className="text-[13px] font-medium text-slate-700 group-hover:text-slate-900">{opt}</span>
                         </label>
                       ))}
                       <div className="mt-2">
                         <AhuLabel label="Input Manual (Lainnya)" />
                         <AhuInput 
                           placeholder="Contoh: Sampai dengan tanggal 31 Desember 2029"
                           value={![
                             'Sampai dengan penutupan RUPS Tahunan yang ke-5 (lima)',
                             'Untuk jangka waktu 5 (lima) tahun',
                             'Sampai dengan ditentukan lain oleh RUPS'
                           ].includes(data.managementEffectiveUntil) ? data.managementEffectiveUntil : ''}
                           onChange={(e) => updateData({ managementEffectiveUntil: e.target.value })}
                         />
                       </div>
                    </div>
                  </div>
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
                      <table className="w-full text-left text-[12px]">
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
                      <table className="w-full text-left text-[12px]">
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
            {data.resolutions.shareholders && (
              <AhuSection title="DATA PERALIHAN SAHAM (PILIH NAMA)">
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
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
                        };
                        updateData({
                          shareTransfersNew: [...(data.shareTransfersNew || []), item]
                        });
                      }}
                      className="text-[11px] bg-[#3b5998] text-white px-3 py-1.5 rounded hover:bg-slate-900 transition-colors font-bold shadow-sm uppercase flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Form Peralihan
                    </button>
                  </div>

                  {(data.shareTransfersNew || []).length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-slate-200 rounded text-slate-500 text-[12px] bg-slate-50">
                      Belum ada data pengalihan saham secara dinamis. Silakan klik "Tambah Form Peralihan" untuk menampilkan form peralihan saham.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(data.shareTransfersNew || []).map((item, idx) => (
                        <div key={item.id} className="p-4 border border-slate-200 rounded bg-[#fcfcfc] shadow-xs relative space-y-4">
                          <button
                            type="button"
                            onClick={() => {
                              updateData({
                                shareTransfersNew: (data.shareTransfersNew || []).filter(t => t.id !== item.id)
                              });
                            }}
                            className="absolute top-3 right-3 text-red-500 hover:text-red-700 p-1"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <div className="text-[12px] font-bold text-[#3b5998] border-b border-slate-200 pb-1 flex items-center gap-1.5">
                            <span>PERALIHAN SAHAM #{idx + 1}</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <AhuLabel label="Peralihan Saham Dari (Pilih Nama)" required />
                              <div className="relative">
                                <input
                                  type="text"
                                  list={`transfer-from-names-${item.id}`}
                                  placeholder="Ketik atau pilih nama penyerah saham..."
                                  className="w-full text-[12px] border border-slate-300 rounded p-1.5 bg-white font-medium focus:border-indigo-500 focus:outline-none uppercase"
                                  value={item.fromName}
                                  onChange={e => {
                                    updateData({
                                      shareTransfersNew: (data.shareTransfersNew || []).map(t =>
                                        t.id === item.id ? { ...t, fromName: e.target.value } : t
                                      )
                                    });
                                  }}
                                />
                                <datalist id={`transfer-from-names-${item.id}`}>
                                  {getDeduplicatedNames().map(n => (
                                    <option key={n} value={n} />
                                  ))}
                                </datalist>
                              </div>
                            </div>

                            <div>
                              <AhuLabel label="Peralihan Saham Kepada / Dialihkan Kesiapa (Pilih Nama)" required />
                              <div className="relative">
                                <input
                                  type="text"
                                  list={`transfer-to-names-${item.id}`}
                                  placeholder="Ketik atau pilih nama penerima saham..."
                                  className="w-full text-[12px] border border-slate-300 rounded p-1.5 bg-white font-medium focus:border-indigo-500 focus:outline-none uppercase"
                                  value={item.toName}
                                  onChange={e => {
                                    updateData({
                                      shareTransfersNew: (data.shareTransfersNew || []).map(t =>
                                        t.id === item.id ? { ...t, toName: e.target.value } : t
                                      )
                                    });
                                  }}
                                />
                                <datalist id={`transfer-to-names-${item.id}`}>
                                  {getDeduplicatedNames().map(n => (
                                    <option key={n} value={n} />
                                  ))}
                                </datalist>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <AhuLabel label="Pilih Dialihkan dengan AJB / Hibah" required />
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
                                <option value="AJB">Dialihkan dengan AJB (Akta Jual Beli)</option>
                                <option value="HIBAH">Dialihkan dengan Hibah</option>
                              </select>
                            </div>

                            <div>
                              <AhuLabel label="Jumlah Saham Terpilih (Lembar)" required />
                              <AhuInput
                                type="text"
                                placeholder="Masukkan jumlah saham..."
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
                      ))}
                    </div>
                  )}
                </div>
              </AhuSection>
            )}

            {/* DETAIL PENINGKATAN MODAL (SUBSCRIPTION/SAHAM DIAMBIL OLEH) */}
            {data.resolutions.capitalPaid && (
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
                              <AhuLabel label="Saham Diambil Oleh (Pilih Nama)" required />
                              <div className="relative">
                                <input
                                  type="text"
                                  list={`subscription-names-${item.id}`}
                                  placeholder="Ketik atau pilih nama pengambil saham baru..."
                                  className="w-full text-[12px] border border-slate-300 rounded p-1.5 bg-white font-medium focus:border-sky-500 focus:outline-none uppercase"
                                  value={item.subscriberName}
                                  onChange={e => {
                                    updateData({
                                      capitalSubscriptionsNew: (data.capitalSubscriptionsNew || []).map(c =>
                                        c.id === item.id ? { ...c, subscriberName: e.target.value } : c
                                      )
                                    });
                                  }}
                                />
                                <datalist id={`subscription-names-${item.id}`}>
                                  {getDeduplicatedNames().map(n => (
                                    <option key={n} value={n} />
                                  ))}
                                </datalist>
                              </div>
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
            )}



            {/* KOMPOSISI PEMEGANG SAHAM SETELAH PERUBAHAN */}
            {(() => {
              const hasCapitalChange = data.resolutions.capitalBase || data.resolutions.capitalPaid || data.resolutions.capitalBaseDecrease || data.resolutions.capitalPaidDecrease;
              const hasManagementOrShareholdes = data.resolutions.management || data.resolutions.shareholders;
              if (!hasCapitalChange && !hasManagementOrShareholdes) return null;
              
              let title = "PENGURUS DAN PEMEGANG SAHAM BARU *";
              if (hasCapitalChange && !hasManagementOrShareholdes) {
                title = "PEMEGANG SAHAM SETELAH PERUBAHAN MODAL *";
              } else if (hasCapitalChange && hasManagementOrShareholdes) {
                title = "PENGURUS DAN PEMEGANG SAHAM BARU / SETELAH PERUBAHAN MODAL *";
              }

              return (
              <AhuSection title={title}>
                <div className="space-y-4">
                    <div className="flex justify-end gap-2">
                       <button onClick={() => openShareholderEditor('baru')} className="bg-[#222d32] text-white px-3 py-1.5 rounded-sm text-[12px] font-bold shadow hover:bg-black transition-colors flex items-center gap-1"><Plus className="w-4 h-4" /> Tambah Data</button>
                    </div>
                    <div className="border border-slate-200 overflow-x-auto rounded-sm">
                      <table className="w-full text-left text-[11px]">
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
                          {data.finalShareholders.map((s) => (
                            <tr key={s.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors text-[10px]">
                              <td className="p-2 border-r border-slate-200 font-bold uppercase">{s.name}</td>
                              <td className="p-2 border-r border-slate-200">Tanpa Klasifikasi</td>
                              <td className="p-2 border-r border-slate-200">{formatInputNumber(s.sharesOwned)}</td>
                              <td className="p-2 border-r border-slate-200 font-bold uppercase">{s.isManagement ? (s.managementPosition || 'DIREKTUR') : '-'}</td>
                              <td className="p-2 border-r border-slate-200">Rp. {formatInputNumber(s.sharesOwned * data.originalSharePrice)}</td>
                              <td className="p-2 text-center text-blue-600 flex items-center justify-center gap-2">
                                <button onClick={() => openShareholderEditor('baru', s)} className="hover:underline flex items-center gap-0.5"><Eye className="w-3 h-3" /> Edit</button>
                                <span className="text-slate-300">|</span>
                                <button onClick={() => deleteShareholder(s.id, 'baru')} className="hover:underline text-red-500 flex items-center gap-0.5"><Trash2 className="w-3 h-3" /> Hapus</button>
                              </td>
                            </tr>
                          ))}
                          {data.finalShareholders.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-slate-400 italic">Belum ada data pengurus/pemegang saham baru.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="text-[13px] font-bold text-slate-800 space-y-1 uppercase">
                      <div>TOTAL LEMBAR SAHAM {formatInputNumber(data.finalShareholders.reduce((sum, s) => sum + s.sharesOwned, 0))}</div>
                      <div>TOTAL MODAL DITEMPATKAN DAN DISETOR Rp {formatInputNumber(data.finalShareholders.reduce((sum, s) => sum + s.sharesOwned, 0) * data.originalSharePrice)}</div>
                      {data.finalShareholders.reduce((sum, s) => sum + s.sharesOwned, 0) < (data.resolutions.capitalPaid || data.resolutions.capitalPaidDecrease ? currentTargetSharesPaid : data.originalTotalShares) && (
                        <div className="text-red-500 font-normal text-xs normal-case mt-1 bg-red-50 p-2 rounded border border-red-100">
                          * Total lembar saham ({formatInputNumber(data.finalShareholders.reduce((sum, s) => sum + s.sharesOwned, 0))}) kurang dari Modal Disetor {(data.resolutions.capitalPaid || data.resolutions.capitalPaidDecrease) ? 'Baru' : 'Lama'} ({formatInputNumber(data.resolutions.capitalPaid || data.resolutions.capitalPaidDecrease ? currentTargetSharesPaid : data.originalTotalShares)} lembar)
                        </div>
                      )}
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
                          value={data.authorizedRepresentativeId} 
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
                        <ShareholderForm 
                          shareholder={data.manualRepresentative!}
                          onChange={updates => updateManualRep(updates)}
                          hideManagement
                          hideFinancials
                          profiles={profiles}
                          globalSharePrice={0}
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
                        <table className="w-full text-left border-collapse text-[13px] font-sans">
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
                                    {statusVal === "Final" ? (
                                      <span className="px-2 py-1 text-[11px] font-bold bg-emerald-150 text-emerald-800 rounded-md border border-emerald-250 inline-block uppercase">
                                        FINAL
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 text-[11px] font-bold bg-amber-150 text-amber-800 rounded-md border border-amber-250 inline-block uppercase">
                                        DRAFT
                                      </span>
                                    )}
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
                                              const { generateWordDoc } = await import('./utils/docxGenerator');
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
                                            <span className="leading-tight">Notulen RUPS LB</span>
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
                                                const { generateRUPSDocx } = await import('./src/lib/generateRUPSDocx');
                                                await generateRUPSDocx({ ...INITIAL_STATE, ...p } as any);
                                              } catch (err) {
                                                console.error('Failed to generate Draft Akta:', err);
                                                alert('Gagal mengunduh Draft Akta RUPS LB.');
                                              }
                                            }}
                                            className="w-full px-4 py-2 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-2.5 uppercase tracking-wide border-b border-slate-100"
                                          >
                                            <FileCode className="w-[15px] h-[15px] text-blue-500 shrink-0" />
                                            <div className="flex flex-col text-left">
                                              <span className="leading-tight">Draft Akta RUPS LB</span>
                                              <span className="text-[9px] text-slate-400 lowercase font-medium mt-0.5">.docx</span>
                                            </div>
                                          </button>
                                        )}

                                        {/* Akta Peralihan Saham */}
                                        {p.resolutions?.shareholders && p.shareTransfers && p.shareTransfers.length > 0 && (
                                          p.shareTransfers.map((transfer, index) => {
                                            const fromName = p.shareholders?.find(s => s.id === transfer.fromShareholderId)?.name || 'Unknown';
                                            const toName = p.shareholders?.find(s => s.id === transfer.toShareholderId)?.name || p.finalShareholders?.find(s => s.id === transfer.toShareholderId)?.name || 'Unknown';
                                            return (
                                              <button
                                                key={transfer.id}
                                                onClick={async (e) => {
                                                  e.stopPropagation();
                                                  setRupslbDropdownId(null);
                                                  try {
                                                    const { getTransferData } = await import('./src/DraftAktaApp');
                                                    const { generateDocx } = await import('./src/lib/generateDocxJualBeli');
                                                    const initData = (await import('./src/constants')).initialData;
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
          })() : activeSidebarTab === 'rupst' ? (() => {
            const isPublicMenu = false;
            const currentEditingRupstId = editingRupstId;
            const setCurrentEditingRupstId = setEditingRupstId;
            const currentRupstProjects = rupstProjects;
            const currentCollectionName = 'rupst_projects';

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
                const { generateRUPSTDocx } = await import('./src/lib/generateRUPSTDocx');
                const { generateRUPSTPernyataanDocx } = await import('./src/lib/generateRUPSTPernyataanDocx');
                
                const docxResult = await generateRUPSTDocx(mergedData, true);
                if (docxResult) {
                  zip.file(docxResult.filename, docxResult.blob);
                }
                
                const pernyataanResult = await generateRUPSTPernyataanDocx(mergedData, true);
                if (pernyataanResult) {
                  zip.file(pernyataanResult.filename, pernyataanResult.blob);
                }
                
                if (!isPublicMenu) {
                  const { generateRUPSTAktaDocx } = await import('./src/lib/generateRUPSTAktaDocx');
                  const aktaResult = await generateRUPSTAktaDocx(mergedData, true);
                  if (aktaResult) {
                    zip.file(aktaResult.filename, aktaResult.blob);
                  }
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
                        {isPublicMenu ? 'RUPS TAHUNAN PUBLIC' : 'RUPS TAHUNAN (RUPST)'}
                      </h2>
                      <p className="text-[13px] text-slate-500 font-medium">
                        {isPublicMenu ? 'Kelola daftar notulen RUPST Public' : 'Kelola daftar notulen RUPS Tahunan'}
                      </p>
                    </div>
                  </div>
                  {!currentEditingRupstId && (
                    <button onClick={() => {
                      setCurrentEditingRupstId('new');
                      setIsRupstPreview(false);
                      updateData({ 
                        ...INITIAL_STATE, 
                      } as any);
                    }} className="bg-[#1b449c] hover:bg-[#13327d] text-white px-5 py-2.5 rounded-md font-bold text-[12px] flex items-center gap-2 transition-all shadow-sm shrink-0 hover:scale-[1.01] active:scale-[0.99]">
                      <Plus className="w-4 h-4" /> {isPublicMenu ? 'TAMBAH RUPST PUBLIC BARU' : 'TAMBAH RUPST BARU'}
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
                          setIsRupstDocDropdownOpen(false);
                          setCurrentEditingRupstId(null);
                        }}
                      >
                        <ArrowRight className="w-5 h-5 rotate-180" /> Kembali
                      </button>
                      
                      <div className="h-6 w-px bg-slate-250 mx-1 hidden sm:block"></div>
   
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
                          <button 
                            onClick={async (e) => {
                              e.preventDefault();
                              setIsRupstDocDropdownOpen(false);
                              if(confirm('Hapus ' + (isPublicMenu ? 'RUPST Public ' : 'RUPST ') + data.companyName + '?')) {
                                if (!user) return alert('Anda harus login!');
                                try {
                                  const deletedRupstName = data.companyName || 'PT Baru';
                                  await deleteDoc(doc(db, currentCollectionName, currentEditingRupstId));
                                  recordNotification(
                                    isPublicMenu ? 'RUPST Public Dihapus' : 'Draft RUPST Dihapus',
                                    `Rapat Umum Pemegang Saham Temuan (RUPST) ${isPublicMenu ? 'Public ' : ''}untuk perusahaan "${deletedRupstName}" telah berhasil dihapus oleh ${user?.email || 'Admin'}.`,
                                    isPublicMenu ? 'delete_rupst_public' : 'delete_rupst'
                                  );
                                  alert(isPublicMenu ? 'RUPST Public berhasil dihapus' : 'RUPST berhasil dihapus');
                                  setCurrentEditingRupstId(null);
                                } catch (err) {
                                  handleFirestoreError(err, OperationType.DELETE, `${currentCollectionName}/${currentEditingRupstId}`);
                                }
                              }
                            }}
                            className="px-4 bg-red-50 hover:bg-red-500 hover:text-white text-red-650 rounded-xl font-bold transition-all text-[12.5px] border border-red-100 hover:border-red-500 h-11 flex items-center gap-2 uppercase shrink-0"
                          >
                            <Trash2 className="w-[18px] h-[18px]" /> Hapus
                          </button>
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
                              const profileData = {
                                  ...data,
                                  id: newId,
                                  updatedAt: new Date().toISOString()
                              };
                              if (!user && !isPublicMenu) {
                                setIsSaving(false);
                                return alert('Anda harus login terlebih dahulu!');
                              }
                              
                              try {
                                  const isNewRupst = currentEditingRupstId === 'new' || !currentEditingRupstId;
                                   await setDoc(doc(db, currentCollectionName, profileData.id), sanitizeForFirestore(profileData));
                                   recordNotification(
                                     isNewRupst ? (isPublicMenu ? 'RUPST Public Baru Dibuat' : 'Draft RUPST Baru Dibuat') : (isPublicMenu ? 'RUPST Public Diubah' : 'Draft RUPST Diubah'),
                                     `Rapat Umum Pemegang Saham Tahunan (RUPST) ${isPublicMenu ? 'Public ' : ''}untuk perusahaan "${profileData.companyName || 'PT Baru'}" telah ${isNewRupst ? 'berhasil didaftarkan' : 'diperbarui'} oleh ${user?.email || 'Admin'}.`,
                                     isNewRupst ? (isPublicMenu ? 'create_rupst_public' : 'create_rupst') : (isPublicMenu ? 'update_rupst_public' : 'update_rupst')
                                   );
                                  setCurrentEditingRupstId(null);
                                  alert(isPublicMenu ? 'RUPST Public berhasil disimpan!' : 'RUPST berhasil disimpan!');
                              } catch (e) {
                                  handleFirestoreError(e, OperationType.WRITE, `${currentCollectionName}/${profileData.id}`);
                              } finally {
                                  setIsSaving(false);
                              }
                           }} 
                           className="px-5 bg-[#40bdae] hover:bg-[#349c8f] text-white rounded-xl text-[12.5px] font-bold transition-all h-11 uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSaving ? 'MENYIMPAN...' : (isPublicMenu ? 'SIMPAN RUPST PUBLIC' : 'SIMPAN RUPST')}
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
                                  const { generateRUPSTDocx } = await import('./src/lib/generateRUPSTDocx');
                                  await generateRUPSTDocx(mergedData);
                                } catch (err) {
                                  console.error('Failed to generate RUPST DOCX:', err);
                                  alert('Gagal menghasilkan RUPST DOCX.');
                                }
                              }}
                              className="w-full px-4.5 py-3 text-slate-700 hover:bg-slate-50 text-[12px] font-bold flex items-center gap-3 uppercase tracking-wide transition-colors border-b border-slate-100"
                            >
                              <FileText className="w-[18px] h-[18px] text-indigo-600 stroke-[2.25px] shrink-0" />
                              <div className="flex flex-col text-left">
                                <span className="font-bold text-slate-800 leading-tight">Notulen RUPST</span>
                                <span className="text-[10px] text-slate-400 lowercase mt-0.5 font-medium">format dokumen (.docx)</span>
                              </div>
                            </button>

                            {/* Surat Pernyataan */}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                setIsRupstDocDropdownOpen(false);
                                try {
                                  const { generateRUPSTPernyataanDocx } = await import('./src/lib/generateRUPSTPernyataanDocx');
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

                            {/* Draft Akta RUPST (Conditional) */}
                            {!isPublicMenu && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setIsRupstDocDropdownOpen(false);
                                  try {
                                    const { generateRUPSTAktaDocx } = await import('./src/lib/generateRUPSTAktaDocx');
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
                                  <span className="font-bold text-slate-800 leading-tight">Draft Akta RUPST</span>
                                  <span className="text-[10px] text-slate-400 lowercase mt-0.5 font-medium">format dokumen (.docx)</span>
                                </div>
                              </button>
                            )}

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
                    {/* PILIH PROFIL */}
                    {isPublicMenu && (
                      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm gap-2 mt-2">
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-50 text-[#3b5998] p-1.5 rounded">
                            <Sparkles className="w-4 h-4 animate-pulse text-blue-500" />
                          </div>
                          <div>
                            <span className="text-[10px] sm:text-[12px] font-bold text-slate-800 uppercase block leading-none">Format Pengisian Data RUPST</span>
                            <span className="text-[10px] text-slate-500 mt-1 block">Pilih mode pengisian yang paling nyaman untuk Anda</span>
                          </div>
                        </div>
                        <div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setRupstInputMode('assistant')}
                            className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                              rupstInputMode === 'assistant'
                                ? 'bg-white text-[#3b5998] shadow-sm font-extrabold'
                                : 'text-slate-600 hover:text-slate-800'
                            }`}
                          >
                            <Bot className="w-3.5 h-3.5" /> Asisten Interaktif
                          </button>
                          <button
                            type="button"
                            onClick={() => setRupstInputMode('form')}
                            className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                              rupstInputMode === 'form'
                                ? 'bg-white text-[#3b5998] shadow-sm font-extrabold'
                                : 'text-[#3b5998] hover:text-blue-800'
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5" /> Formulir Lengkap
                          </button>
                        </div>
                      </div>
                    )}

                    {isPublicMenu && rupstInputMode === 'assistant' ? (
                      <RupstInteractiveAssistant
                        data={data}
                        updateData={updateData}
                        openShareholderEditor={openShareholderEditor}
                        deleteShareholder={deleteShareholder}
                      />
                    ) : isPublicMenu ? (
                      <>
                      <AhuSection title="DATA UTAMA PERSEROAN">
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                            <AhuLabel label="Status Dokumen" required />
                            <div className="md:col-span-3">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateData({ rupstStatus: 'Draft' })}
                                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                                    (data.rupstStatus || 'Draft') === 'Draft'
                                      ? 'bg-amber-150 text-amber-800 border border-amber-300 shadow-sm'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                                  }`}
                                >
                                  DRAFT
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateData({ rupstStatus: 'Final' })}
                                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                                    data.rupstStatus === 'Final'
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
                            <AhuLabel label="Nama PT (Perseroan)" required />
                            <div className="md:col-span-3">
                              <AhuInput 
                                placeholder="Contoh: PT SARANA MAKMUR SEJAHTERA"
                                value={data.companyName || ''} 
                                onChange={e => updateData({ companyName: e.target.value.toUpperCase() })} 
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                            <AhuLabel label="Kedudukan PT (Kab/Kota)" required />
                            <div className="md:col-span-3">
                              <AhuInput 
                                placeholder="Contoh: KOTA BANDUNG atau KABUPATEN INDRAMAYU"
                                value={data.domicile || ''} 
                                onChange={e => updateData({ domicile: e.target.value.toUpperCase() })} 
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start mt-2">
                            <AhuLabel label="Detail Alamat PT" required />
                            <div className="md:col-span-3 space-y-3">
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nama Jalan / Blok / Nomor Rumah</span>
                                <AhuInput 
                                  placeholder="Contoh: Jalan Asia Afrika Nomor 123"
                                  value={data.rupstStreet || ''} 
                                  onChange={e => updateData({ rupstStreet: e.target.value })} 
                                />
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">RT</span>
                                  <AhuInput 
                                    placeholder="Contoh: 001"
                                    value={data.rupstRt || ''} 
                                    onChange={e => updateData({ rupstRt: e.target.value })} 
                                  />
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">RW</span>
                                  <AhuInput 
                                    placeholder="Contoh: 005"
                                    value={data.rupstRw || ''} 
                                    onChange={e => updateData({ rupstRw: e.target.value })} 
                                  />
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Kelurahan / Desa</span>
                                  <AhuInput 
                                    placeholder="Contoh: Braga"
                                    value={data.rupstKelurahan || ''} 
                                    onChange={e => updateData({ rupstKelurahan: e.target.value })} 
                                  />
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Kecamatan</span>
                                  <AhuInput 
                                    placeholder="Contoh: Sumur Bandung"
                                    value={data.rupstKecamatan || ''} 
                                    onChange={e => updateData({ rupstKecamatan: e.target.value })} 
                                  />
                                </div>
                              </div>
                              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pratinjau Alamat Lengkap:</span>
                                <p className="text-[12px] font-semibold text-[#3b5998] italic">
                                  {data.fullAddress || <span className="text-slate-400">Harap lengkapi komponen alamat di atas...</span>}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                            <AhuLabel label="Nilai Nominal Per Saham" required />
                            <div className="md:col-span-3">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">Rp.</span>
                                <AhuInput 
                                  className="pl-10"
                                  placeholder="Contoh: 100.000"
                                  value={data.originalSharePrice === 0 ? '' : formatInputNumber(data.originalSharePrice)} 
                                  onChange={e => updateData({ originalSharePrice: parseFormattedNumber(e.target.value) })} 
                                />
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                            <AhuLabel label="Total Modal Dasar (Lembar)" required />
                            <div className="md:col-span-3">
                              <div className="flex items-center gap-4">
                                <div className="flex-1">
                                  <AhuInput 
                                    placeholder="Contoh: 10.000"
                                    value={data.originalAuthorizedShares === 0 ? '' : formatInputNumber(data.originalAuthorizedShares)} 
                                    onChange={e => updateData({ originalAuthorizedShares: parseFormattedNumber(e.target.value) })} 
                                  />
                                </div>
                                <div className="text-[13px] font-bold text-slate-500 w-48">
                                  Rp. {formatInputNumber(data.originalCapitalBase || 0)}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                            <AhuLabel label="Total Modal Disetor (Lembar)" required />
                            <div className="md:col-span-3">
                              <div className="flex items-center gap-4">
                                <div className="flex-1">
                                  <AhuInput 
                                    placeholder="Contoh: 2.500"
                                    value={data.originalTotalShares === 0 ? '' : formatInputNumber(data.originalTotalShares)} 
                                    onChange={e => updateData({ originalTotalShares: parseFormattedNumber(e.target.value) })} 
                                  />
                                </div>
                                <div className="text-[13px] font-bold text-slate-500 w-48">
                                  Rp. {formatInputNumber(data.originalCapitalPaid || 0)}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Alert: check latest Akta & SK AHU */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start mt-1">
                            <div className="hidden md:block"></div>
                            <div className="md:col-span-3">
                              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-[11.5px] text-yellow-800 leading-relaxed">
                                <span className="font-bold uppercase tracking-wider block mb-1 flex items-center gap-1.5 text-[11px]">
                                  <span className="animate-pulse">💡</span> Rekomendasi Terpenting:
                                </span>
                                Harap pastikan nilai nominal saham modal dasar, dan modal disetor ini sesuai dengan records pada <strong>Akta Perubahan terakhir</strong> dan <strong>SK AHU (Persetujuan Kemenkumham) terbaru</strong> untuk menjaga kecocokan data hukum PT Anda saat ini!
                              </div>
                            </div>
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

                      <AhuSection title="PESERTA RAPAT (PEMEGANG SAHAM & PENGURUS)">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded border border-slate-200">
                            <div>
                              <div className="text-[12px] font-bold text-[#3b5998] uppercase">Silakan Masukkan Data Peserta Rapat</div>
                              <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                                Khusus RUPST Public, Anda dapat menyalin atau mengisi pemegang saham, direksi, dan komisaris secara manual di bawah ini.
                              </p>
                            </div>
                            <button 
                              onClick={() => openShareholderEditor('lama')} 
                              className="bg-[#3b5998] text-white px-3 py-1.5 rounded-sm text-[11px] font-bold shadow hover:bg-black transition-all flex items-center gap-1 shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" /> TAMBAH PESERTA
                            </button>
                          </div>
                          
                          <div className="border border-slate-200 overflow-x-auto rounded-sm">
                            <table className="w-full text-left text-[11px]">
                              <thead className="bg-[#f9f9f9] border-b border-slate-200 font-bold uppercase">
                                <tr>
                                  <th className="p-2 border-r border-slate-200">Nama</th>
                                  <th className="p-2 border-r border-slate-200">Klasifikasi Saham</th>
                                  <th className="p-2 border-r border-slate-200">Jumlah Lembar Saham</th>
                                  <th className="p-2 border-r border-slate-200">Jabatan</th>
                                  <th className="p-2 border-r border-slate-200">Total Nominal</th>
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
                                       <button onClick={() => openShareholderEditor('lama', s)} className="hover:underline flex items-center gap-0.5"><Eye className="w-3.5 h-3.5" /> Edit</button>
                                       <span className="text-slate-300">|</span>
                                       <button onClick={() => deleteShareholder(s.id, 'lama')} className="hover:underline text-red-500 flex items-center gap-0.5"><Trash2 className="w-3.5 h-3.5" /> Hapus</button>
                                     </td>
                                   </tr>
                                ))}
                                {data.shareholders.length === 0 && (
                                  <tr>
                                    <td colSpan={6} className="p-4 text-center text-slate-400 italic">Belum ada data pengurus/pemegang saham. Silakan klik tombol "TAMBAH PESERTA" untuk memulai.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                          <div className="text-[12px] font-bold text-slate-800 space-y-1 uppercase bg-slate-50 p-3 rounded border border-slate-200">
                            <div className="flex justify-between">
                              <span>TOTAL LEMBAR SAHAM DIINPUT:</span>
                              <span>{formatInputNumber(data.shareholders.reduce((sum, s) => sum + s.sharesOwned, 0))} lembar</span>
                            </div>
                            <div className="flex justify-between">
                              <span>TOTAL NOMINAL DIINPUT:</span>
                              <span>Rp {formatInputNumber(data.shareholders.reduce((sum, s) => sum + s.sharesOwned, 0) * data.originalSharePrice)}</span>
                            </div>
                            {data.shareholders.reduce((sum, s) => sum + s.sharesOwned, 0) !== data.originalTotalShares && (
                              <div className="text-orange-600 font-normal text-xs normal-case mt-1 bg-orange-50 p-2 rounded border border-orange-100">
                                * Catatan: Total lembar saham yang diinput ({formatInputNumber(data.shareholders.reduce((sum, s) => sum + s.sharesOwned, 0))} lembar) berbeda dengan Total Modal Disetor ({formatInputNumber(data.originalTotalShares)} lembar).
                              </div>
                            )}
                          </div>
                        </div>
                      </AhuSection>
                      </>
                    ) : (
                      <AhuSection title="PILIH PROFIL">
                      <div className="space-y-4">
                        <label className="block text-[13px] font-medium text-slate-700 mb-1">Pilih Profil Perseroan untuk mengisi data otomatis</label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <select 
                            className="flex-1 border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none bg-white focus:border-[#66afe9]"
                            value={data.selectedProfileId || ''}
                            onChange={(e) => {
                               const selected = profiles.find(p => p.id === e.target.value);
                               if (selected) {
                                   const { id, ...rest } = selected;
                                   updateData({ 
                                     ...rest, 
                                     selectedProfileId: selected.id 
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
                      </div>
                    </AhuSection>
                    )}

                    {/* DATA KHUSUS RUPST */}
                    {!(isPublicMenu && rupstInputMode === 'assistant') && (
                      <>
                        <AhuSection title="AGENDA DAN KEUANGAN RUPST">
                      {isPublicMenu ? (
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
                        <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded flex items-center gap-6">
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
                      )}

                      <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-sm space-y-3">
                        <div className="border-b border-slate-200 pb-1.5 mb-2">
                          <span className="text-[12px] font-bold text-[#3b5998] uppercase tracking-wider">
                            📝 DRAF AKTA RUPST
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <AhuLabel label="Nomor Akta RUPST" />
                            <AhuInput 
                              value={data.draftAktaRupsNumber || ''} 
                              onChange={e => updateData({ draftAktaRupsNumber: e.target.value })} 
                              placeholder="Contoh: 08" 
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
                                  {data.shareholders.map(s => <option key={s.id} value={s.name}>{s.salutation || "Tuan"} {s.name}</option>)}
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

                          {data.rupstIsAudited && (
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

                                        const autoDividends = data.shareholders.map(s => {
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

                    {/* DATA PENYELENGGARAAN RAPAT */}
                    <AhuSection title="DATA PENYELENGGARAAN RAPAT">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                          <AhuLabel label="Nomor Pemanggilan RUPST" />
                          <div className="md:col-span-3"><AhuInput value={data.rupstInvitationNumber || ''} onChange={e => updateData({ rupstInvitationNumber: e.target.value })} /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                          <AhuLabel label="Tanggal Pemanggilan RUPST" />
                          <div className="md:col-span-3"><AhuInput type="date" value={data.rupstInvitationDate || ''} onChange={e => updateData({ rupstInvitationDate: e.target.value })} /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                          <AhuLabel label="Tempat Penyelenggaraan" />
                          <div className="md:col-span-3"><AhuInput value={data.signingPlace || ''} onChange={e => updateData({ signingPlace: e.target.value })} /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                          <AhuLabel label="Hari/Tanggal Rapat" />
                          <div className="md:col-span-3 flex gap-2">
                             <AhuInput type="date" value={data.signingDate || ''} onChange={e => updateData({ signingDate: e.target.value })} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                          <AhuLabel label="Waktu Rapat" />
                          <div className="md:col-span-3 flex items-center gap-2">
                            <div className="flex-1">
                              <AhuLabel label="Mulai" />
                              <AhuInput type="time" value={data.meetingStartTime || ''} onChange={e => updateData({ meetingStartTime: e.target.value })} />
                            </div>
                            <div className="flex-1">
                              <AhuLabel label="Selesai" />
                              <AhuInput type="time" value={data.rupstMeetingEndTime || ''} onChange={e => updateData({ rupstMeetingEndTime: e.target.value })} />
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
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                          <AhuLabel label="Ketua Rapat" />
                          <div className="md:col-span-3 flex gap-4">
                            <div className="flex-1">
                              <AhuLabel label="Nama Ketua Rapat" />
                              <AhuSelect 
                                value={data.meetingChair || ''} 
                                onChange={e => {
                                  const selectedName = e.target.value;
                                  const sh = data.shareholders.find(s => s.name === selectedName);
                                  updateData({ 
                                    meetingChair: selectedName,
                                    meetingChairPosition: sh?.isManagement ? (sh.managementPosition || "Direktur") : "Pemegang Saham"
                                  });
                                }}
                              >
                                <option value="">-- Pilih --</option>
                                {data.shareholders.map(s => <option key={s.id} value={s.name}>{s.salutation} {s.name}</option>)}
                              </AhuSelect>
                            </div>
                            <div className="flex-1">
                              <AhuLabel label="Jabatan di PT" />
                              <AhuInput value={data.meetingChairPosition || ''} onChange={e => updateData({ meetingChairPosition: e.target.value })} placeholder="Contoh: Direktur Utama" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </AhuSection>

                    <AhuSection title="KEHADIRAN PEMEGANG SAHAM">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[12px] font-bold text-slate-500 uppercase flex items-center gap-2">
                             <Users className="w-3 h-3" /> Kehadiran Pemegang Saham
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
                          <table className="w-full text-left text-[11px]">
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
                                  value={data.authorizedRepresentativeId} 
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
                                <ShareholderForm 
                                  shareholder={data.manualRepresentative!}
                                  onChange={updates => updateManualRep(updates)}
                                  hideManagement
                                  hideFinancials
                                  profiles={profiles}
                                  globalSharePrice={0}
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
                          {isPublicMenu ? 'NOTULEN RUPST PUBLIC TERSIMPAN' : 'NOTULEN RUPST TERSIMPAN'}
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
                        {isPublicMenu ? 'Belum ada notulen RUPST Public yang disimpan.' : 'Belum ada notulen RUPST yang disimpan.'}
                      </div>
                    ) : sortedResults.length === 0 ? (
                      <div className="bg-slate-50 text-center py-12 rounded-md border border-dashed border-slate-350 text-slate-500 text-[13px] font-medium">
                        Tidak ada notulen RUPST yang cocok dengan pencarian atau filter Anda.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200 rounded-md shadow-inner bg-white">
                        <table className="w-full text-left border-collapse text-[13px] font-sans">
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
                                    {statusVal === "Final" ? (
                                      <span className="px-2 py-1 text-[11px] font-bold bg-emerald-150 text-emerald-800 rounded-md border border-emerald-250 inline-block uppercase">
                                        FINAL
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 text-[11px] font-bold bg-amber-150 text-amber-800 rounded-md border border-amber-250 inline-block uppercase">
                                        DRAFT
                                      </span>
                                    )}
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
                                        {/* Notulen RUPST */}
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            setRupstDropdownId(null);
                                            try {
                                              const { generateRUPSTDocx } = await import('./src/lib/generateRUPSTDocx');
                                              await generateRUPSTDocx({ ...INITIAL_STATE, ...p } as any);
                                            } catch (err) {
                                              console.error('Failed to generate RUPST DOCX:', err);
                                              alert('Gagal mengunduh Notulen RUPST.');
                                            }
                                          }}
                                          className="w-full px-4 py-2 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-2.5 uppercase tracking-wide border-b border-slate-100"
                                        >
                                          <FileText className="w-[15px] h-[15px] text-indigo-500 shrink-0" />
                                          <div className="flex flex-col text-left">
                                            <span className="leading-tight">Notulen RUPST</span>
                                            <span className="text-[9px] text-slate-400 lowercase font-medium mt-0.5">.docx</span>
                                          </div>
                                        </button>

                                        {/* Surat Pernyataan */}
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            setRupstDropdownId(null);
                                            try {
                                              const { generateRUPSTPernyataanDocx } = await import('./src/lib/generateRUPSTPernyataanDocx');
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
                                              const { generateRUPSTAktaDocx } = await import('./src/lib/generateRUPSTAktaDocx');
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
                                            <span className="leading-tight">Draft Akta RUPST</span>
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
                                              const { generateRUPSTDocx } = await import('./src/lib/generateRUPSTDocx');
                                              const { generateRUPSTPernyataanDocx } = await import('./src/lib/generateRUPSTPernyataanDocx');
                                              const { generateRUPSTAktaDocx } = await import('./src/lib/generateRUPSTAktaDocx');
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
          })() : activeSidebarTab === 'kbli_mapping' ? (
            <KBLIMapping />
          ) : activeSidebarTab === 'saran_kbli' ? (
            <KBLISuggestions />
          ) : activeSidebarTab === 'import_kbli' ? (
            <ImportKBLI />
          ) : activeSidebarTab === 'pendirian' ? (
            editingPendirianId ? (
              <DraftAktaPendirian 
                profiles={profiles}
                initialData={editingPendirianId === 'new' ? null : pendirianProjects.find(p => p.id === editingPendirianId) as any}
                isSaving={isSaving}
                onSave={async (pendirianData) => {
                  setIsSaving(true);
                  if (!user) {
                    setIsSaving(false);
                    return alert('Anda harus login terlebih dahulu!');
                  }
                  
                  const id = editingPendirianId === 'new' ? crypto.randomUUID() : editingPendirianId;
                  const finalData = {
                    ...pendirianData,
                    id,
                    updatedAt: new Date().toISOString()
                  };

                  try {
                    const isNewPendirian = editingPendirianId === 'new';
                     await setDoc(doc(db, 'pendirian_projects', id), sanitizeForFirestore(finalData));
                     recordNotification(
                       isNewPendirian ? 'Pendirian PT Baru Dibuat' : 'Pendirian PT Diubah',
                       `Data Pendirian PT untuk perusahaan "${finalData.namaPt || 'PT Baru'}" telah ${isNewPendirian ? 'berhasil didaftarkan' : 'diperbarui'} oleh ${user?.email || 'Admin'}.`,
                       isNewPendirian ? 'create_pendirian' : 'update_pendirian'
                     );
                    setEditingPendirianId(null);
                    alert('Data pendirian berhasil disimpan!');
                  } catch (e) {
                    handleFirestoreError(e, OperationType.WRITE, `pendirian_projects/${id}`);
                  } finally {
                    setIsSaving(false);
                  }
                }}
                onCancel={() => setEditingPendirianId(null)}
                onShowPreview={(d) => { setPendirianPreviewData(d); setShowPendirianPreview(true); }}
                onExportWord={(d) => { handlePendirianExportWord(d); }}
              />
            ) : (
              <PendirianList 
                onEdit={(rec) => {
                  setEditingPendirianId(rec.id);
                  updateData({ ...INITIAL_STATE, ...rec } as any);
                }}
                onAdd={() => {
                  setEditingPendirianId('new');
                  updateData({ ...INITIAL_STATE } as any);
                }}
              />
            )
          ) : activeSidebarTab === 'perbaikan' ? (
            <DataCorrectionLetter />
          ) : activeSidebarTab === 'panduan' ? (
            <GuideMenu />
          ) : null}
        </main>
        )}
      </div>

      {/* Floating Action Buttons removed as per request */}

      {/* Proxy Input Modal */}
      {proxyModalOpenId && (() => {
        const sh = data.shareholders.find(s => s.id === proxyModalOpenId);
        if (!sh) return null;

        const rawParties = [
          ...data.shareholders.map(s => ({
            name: s.name,
            salutation: s.salutation || 'Tuan',
            nik: s.nik || '',
            birthCity: s.birthCity || '',
            birthDate: s.birthDate || '',
            occupation: s.occupation || '',
            address: s.address,
            nationalityType: s.nationalityType || 'WNI',
            isForeign: s.isForeign || false,
            nationality: s.nationality || '',
            passportNumber: s.passportNumber || '',
            kitasNumber: s.kitasNumber || '',
            kitasType: s.kitasType || 'NONE',
            hasKitas: s.hasKitas || false
          })),
          ...(data.newManagementItems || []).map(m => ({
            name: m.name,
            salutation: m.salutation || 'Tuan',
            nik: m.nik || '',
            birthCity: m.birthCity || '',
            birthDate: m.birthDate || '',
            occupation: m.occupation || '',
            address: m.address,
            nationalityType: (m as any).nationalityType || 'WNI',
            isForeign: (m as any).isForeign || false,
            nationality: (m as any).nationality || '',
            passportNumber: (m as any).passportNumber || '',
            kitasNumber: (m as any).kitasNumber || '',
            kitasType: (m as any).kitasType || 'NONE',
            hasKitas: (m as any).hasKitas || false
          })),
          ...(data.oldManagementItems || []).map(m => ({
            name: m.name,
            salutation: m.salutation || 'Tuan',
            nik: m.nik || '',
            birthCity: m.birthCity || '',
            birthDate: m.birthDate || '',
            occupation: m.occupation || '',
            address: m.address,
            nationalityType: (m as any).nationalityType || 'WNI',
            isForeign: (m as any).isForeign || false,
            nationality: (m as any).nationality || '',
            passportNumber: (m as any).passportNumber || '',
            kitasNumber: (m as any).kitasNumber || '',
            kitasType: (m as any).kitasType || 'NONE',
            hasKitas: (m as any).hasKitas || false
          }))
        ];

        const availableParties = rawParties.filter((item, index, self) => 
          item.name && 
          item.name.trim() !== '' &&
          self.findIndex(t => t.name.trim().toUpperCase() === item.name.trim().toUpperCase()) === index
        );

        return (
          <ProxyInputModal
            isOpen={true}
            shareholderName={`${sh.salutation} ${sh.name}`}
            initialData={sh.proxyData}
            availableParties={availableParties}
            shareholder={sh}
            profiles={profiles}
            onSave={(proxyData) => {
              const newList = data.shareholders.map(item =>
                item.id === proxyModalOpenId ? { ...item, proxyData } : item
              );
              updateData({ shareholders: newList });
              setProxyModalOpenId(null);
            }}
            onClose={() => setProxyModalOpenId(null)}
          />
        );
      })()}

      <Modal 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)} 
        title="DRAFT DOKUMEN"
        maxWidth="max-w-7xl"
        headerColor="bg-[#3b5998] text-white"
      >
        <div className="flex flex-col items-center h-[88vh] bg-slate-200/50 rounded-b-2xl overflow-hidden relative">
          <div className="no-print sticky top-0 w-full py-4 z-40 flex justify-center gap-4 bg-white/90 backdrop-blur-md shadow-md border-b border-slate-200">
            <div className="flex bg-white rounded-full p-1 border border-slate-300 shadow-sm">
              <button 
                onClick={() => setZoom(prev => Math.max(0.4, prev - 0.1))} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
                title="Perkecil"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <div className="flex items-center px-4 text-sm font-bold text-slate-700 min-w-[70px] justify-center">
                {Math.round(zoom * 100)}%
              </div>
              <button 
                onClick={() => setZoom(prev => Math.min(2, prev + 0.1))} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
                title="Perbesar"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setZoom(1)} 
                className="px-4 text-[11px] font-bold text-blue-600 hover:bg-slate-100 rounded-full transition-colors uppercase border-l border-slate-200"
              >
                100%
              </button>
            </div>
            
            <div className="h-10 w-[1px] bg-slate-300"></div>

            <button onClick={handlePrint} className="px-8 py-2.5 bg-[#3b5998] text-white rounded-full font-bold text-[13px] flex items-center gap-2 hover:bg-[#2d4373] transition-all shadow-md group">
              <Printer className="w-4 h-4 group-hover:scale-110 transition-transform" /> Cetak / PDF
            </button>
            <button onClick={handleExportWord} className="px-8 py-2.5 bg-emerald-600 text-white rounded-full font-bold text-[13px] flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-md group">
              <FileCode className="w-4 h-4 group-hover:scale-110 transition-transform" /> Word (.docx)
            </button>
          </div>
          
          <div className="flex-1 w-full overflow-auto p-4 sm:p-8 pt-4 custom-scrollbar bg-slate-200/50">
            {activeSidebarTab === 'rupst' ? (
              <RUPSTDocumentPreview data={mergedData} />
            ) : (
              <DocumentPreview data={mergedData} showHeader={false} zoom={zoom} />
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(editingShareholder)}
        onClose={() => { setEditingShareholder(null); setEditMode(null); }}
        title={`Tambah Pemegang Saham, Komisaris dan Direksi`}
        maxWidth="max-w-4xl"
        headerColor="bg-white text-slate-800 border-b border-slate-200"
      >
        <div className="p-0 flex flex-col h-full bg-slate-50">
          {editingShareholder && (
            <div className="p-6 overflow-y-auto">
              <ShareholderForm 
                shareholder={editingShareholder}
                onChange={updates => setEditingShareholder({ ...editingShareholder, ...updates })}
                globalSharePrice={data.originalSharePrice}
                totalSharesAllowed={editMode === 'lama' ? data.originalTotalShares : (data.resolutions.capitalPaid || data.resolutions.capitalPaidDecrease ? currentTargetSharesPaid : data.originalTotalShares)}
                otherAllocated={(editMode === 'lama' ? data.shareholders : data.finalShareholders)
                  .filter(s => s.id !== editingShareholder.id)
                  .reduce((sum, s) => {
                    let shares = s.sharesOwned;
                    if (editMode === 'baru' && editingShareholder.isAcquisition && (editingShareholder.acquisitionSourceId === s.id || (s.linkedPartyId && editingShareholder.acquisitionSourceId === s.linkedPartyId))) {
                      shares = Math.max(0, shares - (editingShareholder.acquisitionShares || 0));
                    }
                    return sum + shares;
                  }, 0)
                }
                existingData={editMode === 'lama' ? [] : [
                  ...data.shareholders,
                  ...data.oldManagementItems.filter(m => !data.shareholders.some(s => (s.name || '').toUpperCase() === (m.name || '').toUpperCase()))
                ]}
                allShareholders={data.shareholders}
                oldSharesOwned={data.shareholders.find(s => (s.name || '').trim().toUpperCase() === (editingShareholder.name || '').trim().toUpperCase())?.sharesOwned || 0}
                isOld={editMode === 'lama'}
                hasTransferAgenda={data.resolutions.shareholders}
                hasManagementAgenda={data.resolutions.management}
                hasCapitalChange={data.resolutions.capitalBase || data.resolutions.capitalPaid || data.resolutions.capitalBaseDecrease || data.resolutions.capitalPaidDecrease}
                profiles={profiles}
              />
            </div>
          )}
          <div className="mt-auto flex justify-end gap-3 p-4 px-6 border-t border-slate-200 bg-white sticky bottom-0 z-10 shrink-0">
            <button onClick={() => { setEditingShareholder(null); setEditMode(null); }} className="px-8 py-2 border border-slate-300 bg-white text-slate-700 rounded font-bold text-sm hover:bg-slate-50 transition-all">BATAL</button>
            <button onClick={saveShareholder} className="px-8 py-2 bg-[#40bdae] text-white rounded font-bold text-sm hover:bg-[#349c8f] transition-all shadow-sm">SIMPAN DATA</button>
          </div>
        </div>
      </Modal>

      {/* Popup Editors for a cleaner AHU look */}

      {showPendirianPreview && pendirianPreviewData && (
        <PendirianDocumentPreview
          data={pendirianPreviewData}
          onExport={() => handlePendirianExportWord(pendirianPreviewData)}
          onClose={() => setShowPendirianPreview(false)}
          isExporting={isExportingPendirian}
        />
      )}

      {/* KBLI Modal inside RUPS LB */}
      {isAddKbliModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-sm shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#0c2444] px-5 py-3 flex justify-between items-center text-white rounded-t-sm">
              <h3 className="text-sm font-bold tracking-wider text-white">TAMBAH DATA KBLI (RUPS LB)</h3>
              <button 
                onClick={() => setIsAddKbliModalOpen(false)}
                className="text-white hover:text-slate-200 text-2xl font-semibold focus:outline-none transition-colors"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Center Banner text */}
              <div className="text-center space-y-1 py-1">
                <h4 className="text-[18px] font-bold text-slate-800 uppercase tracking-widest leading-none">MAKSUD DAN TUJUAN</h4>
                <p className="text-[14px] font-bold text-slate-500 tracking-wide leading-none pt-1">(KBLI 2025)</p>
                <div className="border-b border-slate-300 w-full pt-3"></div>
              </div>

              {/* Search Bar */}
              <div className="max-w-md mx-auto">
                <div className="flex items-center border border-slate-300 rounded-md overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-[#0c2444]/30 focus-within:border-[#0c2444] transition-all bg-white">
                  <input
                    type="text"
                    placeholder="Cari KBLI..."
                    className="w-full px-3 py-2 text-[14px] font-medium text-slate-700 outline-none"
                    value={kbliModalSearchTerm}
                    onChange={(e) => setKbliModalSearchTerm(e.target.value)}
                    onKeyDown={handleKbliModalKeyDown}
                  />
                  <button 
                    onClick={performKbliModalSearch}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 border-l border-slate-300 text-slate-600 transition-colors focus:outline-none flex items-center justify-center shrink-0"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Results Table */}
              <div className="border border-slate-200 rounded-sm overflow-hidden shadow-sm bg-white">
                <div className="max-h-[350px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-[12px]">
                    <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10">
                      <tr>
                        <th className="px-4 py-2 text-center w-12 border-r border-slate-200">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-[#0c2444] border-slate-300 rounded cursor-pointer"
                            checked={kbliPaginatedResults.length > 0 && kbliPaginatedResults.every(r => kbliCheckedKblis.includes(r.kode))}
                            onChange={handleToggleAllKbliOnPage}
                          />
                        </th>
                        <th className="px-4 py-2 font-bold text-slate-700 text-center w-24 border-r border-slate-200">Kode KBLI</th>
                        <th className="px-4 py-2 font-bold text-slate-700 text-left w-52 border-r border-slate-200">Judul KBLI</th>
                        <th className="px-4 py-2 font-bold text-slate-700 text-left">Uraian KBLI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {kbliPaginatedResults.map((item) => {
                        const isChecked = kbliCheckedKblis.includes(item.kode);
                        return (
                          <tr 
                            key={item.kode} 
                            onClick={() => handleToggleKbliChecked(item.kode)}
                            className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                              isChecked ? 'bg-indigo-50/50 hover:bg-indigo-100/50' : ''
                            }`}
                          >
                            <td className="px-4 py-2 text-center border-r border-slate-200" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-[#0c2444] border-slate-300 rounded cursor-pointer"
                                checked={isChecked}
                                onChange={() => handleToggleKbliChecked(item.kode)}
                              />
                            </td>
                            <td className="px-4 py-2 text-center border-r border-slate-200 font-mono font-bold text-slate-700">{item.kode}</td>
                            <td className="px-4 py-2 border-r border-slate-200 font-bold text-slate-800">{item.judul}</td>
                            <td className="px-4 py-2 text-slate-600 leading-relaxed text-justify">{item.uraian}</td>
                          </tr>
                        );
                      })}
                      {kbliPaginatedResults.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-10 text-slate-400 italic">
                            Hasil pencarian tidak ditemukan. Silakan masukkan kata kunci lain.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {kbliTotalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                  <span className="font-bold">Pergi ke halaman:</span>
                  <div className="flex flex-wrap items-center gap-1">
                    {getKbliPageNumbers().map(pageNum => (
                      <button
                        key={pageNum}
                        onClick={() => setKbliCurrentPage(pageNum)}
                        className={`px-2.5 py-1 border rounded-sm font-bold transition-all ${
                          kbliCurrentPage === pageNum 
                            ? 'bg-[#0c2444] border-[#0c2444] text-white' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex justify-end gap-3 rounded-b-sm">
              <button 
                onClick={() => setIsAddKbliModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-350 rounded-sm text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
              >
                BATAL
              </button>
              <button 
                onClick={handleAddKbliBatch}
                className="px-4 py-2 bg-[#0c2444] text-white rounded-sm text-xs font-bold hover:bg-[#16365f] transition-all"
              >
                TAMBAH TERPILIH ({kbliCheckedKblis.length})
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;