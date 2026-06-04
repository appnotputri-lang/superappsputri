import { Modal } from './components/Modal';
import { ChevronRight, RefreshCw } from 'lucide-react';

import React, { useState, useEffect, useMemo } from 'react';
import { auth, db, loginWithGoogle, logout, handleFirestoreError, OperationType } from './src/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { CompanyData, Shareholder, ResolutionFlags, KbliItem, ManagementItem, DocumentType, Address, ManagementChangeType, CompanyProfile, AmendmentDeed, Guest } from './types';
import ShareholderForm from './components/ShareholderForm';
import CompositionEditor from './components/CompositionEditor';
import ManagementEditor from './components/ManagementEditor';
import StockTransferEditor from './components/StockTransferEditor';
import DocumentPreview from './components/DocumentPreview';
import { DataCorrectionLetter } from './components/DataCorrectionLetter';
import DraftAktaApp from './src/DraftAktaApp';
import DraftAktaRUPS from './src/DraftAktaRUPS';
import DraftAktaPendirian from './src/DraftAktaPendirian';
import PendirianDocumentPreview from './src/PendirianDocumentPreview';
import { RUPSTDocumentPreview } from './src/RUPSTDocumentPreview';
import { SirkulerLaporanDocumentPreview } from './components/SirkulerLaporanDocumentPreview';
import { SirkulerLaporanFormContent } from './components/SirkulerLaporanFormContent';
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
  Mail,
  User,
  Search,
  Menu,
  ChevronDown,
  X,
  FileCheck,
  ArrowRightLeft,
  HelpCircle,
  ZoomIn,
  ZoomOut,
  Edit
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
  resolutions: INITIAL_RESOLUTIONS,
  selectedProfileId: '',
  createDraftAktaRups: false,
  draftAktaRupsNumber: '',
  draftAktaRupsDate: '',
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
  rupstNotulenNumber: '',
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
type SidebarTabId = 'beranda' | 'company_profile' | 'notulen' | 'pendirian' | 'rupst' | 'perbaikan' | 'draft_akta_rups' | 'panduan' | 'sirkuler_laporan';

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
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [projects, setProjects] = useState<CompanyData[]>([]);
  const [rupstProjects, setRupstProjects] = useState<CompanyData[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(() => {
    return localStorage.getItem('notaris_user_is_logged_in') === 'true';
  });
  const [dataLoading, setDataLoading] = useState(true);

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

  // Fail-safe to ensure loader disappears even with network failure
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthLoading(false);
      setDataLoading(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user) {
      let profilesReady = false;
      let projectsReady = false;
      let rupstReady = false;

      const checkIfLoaded = () => {
        if (profilesReady && projectsReady && rupstReady) {
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

      return () => { unsubProfiles(); unsubProjects(); unsubRupst(); };
    } else {
      setProfiles([]);
      setProjects([]);
      setRupstProjects([]);
      setDataLoading(false);
    }
  }, [user]);

  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingRupstId, setEditingRupstId] = useState<string | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  const [editingShareholder, setEditingShareholder] = useState<Shareholder | null>(null);
  const [editMode, setEditMode] = useState<'lama' | 'baru' | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [newKbliId, setNewKbliId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTabId>('beranda');
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
      return newData;
    });
  };

  const updateAddress = (property: 'newAddress' | 'oldAddress', updates: Partial<Address>) => {
    updateData({
      [property]: { ...data[property], ...updates }
    } as any);
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
    if ((activeSidebarTab === 'notulen' || activeSidebarTab === 'rupst') && data.selectedProfileId) {
      const profile = profiles.find(p => p.id === data.selectedProfileId);
      if (profile) {
        // We want to keep the current state from profile as the "Old" data
        // but allow the draft (data) to control the "New/Target" states
        return {
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
    return data;
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

  if (!user) {
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

  if (user && user.email && !ALLOWED_EMAILS.includes(user.email)) {
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
    <div className="h-screen flex flex-col bg-[#ecf0f5] font-sans text-slate-900 overflow-hidden">
      {/* Header AHU Style */}
      <header className="bg-[#3b5998] text-white flex justify-between items-center px-4 py-2 sticky top-0 z-50 shadow-sm text-sm border-b border-black/10 h-[50px] shrink-0">
        <div className="flex items-center gap-3 sm:gap-6 flex-1 min-w-0">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-white/10 rounded transition-colors shrink-0"><Menu className="w-5 h-5" /></button>
          <div className="flex items-center gap-2 font-bold tracking-tight truncate">
            <span className="text-[13px] sm:text-[14px] truncate">SISTEM DRAFT NOTARIS PUTRI</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-[12px] opacity-90 hidden sm:inline">{user.email}</span>
              <button onClick={() => handleLogout()} className="bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-sm text-[12px] font-bold transition-colors">
                LOGOUT
              </button>
            </div>
          ) : (
            <button onClick={() => loginWithGoogle()} className="bg-[#40bdae] hover:bg-[#349c8f] px-3 py-1.5 rounded-sm text-[12px] font-bold transition-colors flex items-center gap-1.5">
               LOGIN
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar AHU Style */}
        <aside className={`bg-[#2c3b41] text-slate-400 flex flex-col shrink-0 overflow-y-auto lg:flex transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
          <div className="py-4 space-y-0 text-[13px] w-64">
            {[
              { label: 'Beranda', id: 'beranda' as const, icon: Home },
              { label: 'Company Profile', id: 'company_profile' as const, icon: Building2 },
              { label: 'RUPS LB', id: 'notulen' as const, icon: FileText },
              { label: 'RUPS Tahunan', id: 'rupst' as const, icon: History },
              { label: 'Sirkuler Lap Tahunan', id: 'sirkuler_laporan' as const, icon: FileSignature },
              { label: 'Pendirian PT', id: 'pendirian' as const, icon: FileText },
              { label: 'Surat Perbaikan Data', id: 'perbaikan' as const, icon: Mail },
              { label: 'Panduan Penggunaan', id: 'panduan' as const, icon: BookOpen },
            ].map((item) => (
              <button key={item.id} onClick={() => setActiveSidebarTab(item.id)} className={`w-full text-left px-4 py-2.5 border-l-4 transition-all flex justify-between items-center ${activeSidebarTab === item.id ? 'bg-[#1e282c] text-white border-blue-500' : 'border-transparent hover:bg-black/10 hover:text-white'}`}>
                <span className="flex items-center gap-3">
                  <item.icon size={18} />
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-[#ecf0f5] p-6 pb-20">
          
          {activeSidebarTab === 'beranda' ? (
            <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
              {/* Header Card */}
              <div className="bg-[#3b5998] rounded-md text-white p-6 sm:p-8 relative overflow-hidden shadow-md">
                <div className="absolute right-0 bottom-0 top-0 opacity-10 flex items-center pr-12 hidden md:flex pointer-events-none select-none">
                  <Building2 size={180} />
                </div>
                <div className="relative z-10 space-y-2">
                  <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> Dashboard Aktif
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    Sistem Draft Notaris Putri
                  </h1>
                  <p className="text-[13px] text-blue-100 max-w-2xl leading-relaxed">
                    Selamat datang di sistem manajemen drafting terpadu. Gunakan platform ini untuk memproses notulen RUPS Luar Biasa (LB), RUPS Tahunan (RUPST), Pendirian PT, serta surat-surat perbaikan data AHU secara cepat, tepat, dan legal.
                  </p>
                  <div className="pt-2 text-[12px] text-blue-250 flex flex-wrap gap-x-6 gap-y-2 items-center">
                    <span className="flex items-center gap-1.5 font-mono text-blue-100">
                      <Clock className="w-4 h-4 text-emerald-300" /> {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-blue-100">
                      <User className="w-4 h-4 text-emerald-300" /> {user?.email || 'Guest User'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm flex items-center justify-between hover:shadow transition-shadow">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Profil Perusahaan</span>
                    <h2 className="text-3xl font-bold text-slate-800">{profiles.length}</h2>
                    <p className="text-[11px] text-slate-400">Database profil korporasi</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#3b5998]">
                    <Building2 className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm flex items-center justify-between hover:shadow transition-shadow">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Draft RUPS LB</span>
                    <h2 className="text-3xl font-bold text-slate-800">{projects.length}</h2>
                    <p className="text-[11px] text-slate-400">Keputusan Sirkuler & Berita Acara</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-[#fcf8e3] border border-[#fbeed5] flex items-center justify-center text-[#c09853]">
                    <FileText className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm flex items-center justify-between hover:shadow transition-shadow">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Draft RUPS Tahunan</span>
                    <h2 className="text-3xl font-bold text-slate-800">{rupstProjects.length}</h2>
                    <p className="text-[11px] text-slate-400">Pertanggungjawaban tahun buku</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <History className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Quick Actions Workflow (Bento) */}
              <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm">
                <h3 className="text-[14px] font-bold text-slate-700 uppercase tracking-tight mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-[#3b5998]"></span> Alur Kerja Cepat (Quick Access)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    onClick={() => {
                      setEditingProjectId('new');
                      updateData({ ...INITIAL_STATE } as any);
                      setActiveSidebarTab('notulen');
                    }}
                    className="group border border-slate-200 hover:border-[#3b5998] p-4 rounded-sm text-left bg-white transition-all hover:shadow-md flex flex-col justify-between h-36"
                  >
                    <div>
                      <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-[#3b5998] group-hover:text-white transition-all mb-3">
                        <Plus className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-slate-800 text-[13px] group-hover:text-[#3b5998] transition-colors">{`Buat RUPS LB`}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">Buat draft Notulen sirkuler RUPS Luar Biasa baru</p>
                    </div>
                    <span className="text-[11px] font-bold text-[#3b5998] uppercase flex items-center gap-1 mt-2">Mulai <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" /></span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingRupstId('new');
                      updateData({ 
                        ...INITIAL_STATE, 
                      } as any);
                      setActiveSidebarTab('rupst');
                    }}
                    className="group border border-slate-200 hover:border-[#3b5998] p-4 rounded-sm text-left bg-white transition-all hover:shadow-md flex flex-col justify-between h-36"
                  >
                    <div>
                      <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-[#3b5998] group-hover:text-white transition-all mb-3">
                        <Plus className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-slate-800 text-[13px] group-hover:text-[#3b5998] transition-colors">{`Buat RUPS Tahunan`}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">Buat risalah atau sirkuler RUPS laporan tahunan</p>
                    </div>
                    <span className="text-[11px] font-bold text-[#3b5998] uppercase flex items-center gap-1 mt-2">Mulai <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" /></span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveSidebarTab('pendirian');
                    }}
                    className="group border border-slate-200 hover:border-[#3b5998] p-4 rounded-sm text-left bg-white transition-all hover:shadow-md flex flex-col justify-between h-36"
                  >
                    <div>
                      <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 group-hover:bg-[#3b5998] group-hover:text-white transition-all mb-3">
                        <FileCode className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-slate-800 text-[13px] group-hover:text-[#3b5998] transition-colors">{`Pendirian PT`}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">Draft pendirian Perseroan Terbatas komplit</p>
                    </div>
                    <span className="text-[11px] font-bold text-[#3b5998] uppercase flex items-center gap-1 mt-2">Mulai <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" /></span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveSidebarTab('perbaikan');
                    }}
                    className="group border border-slate-200 hover:border-[#3b5998] p-4 rounded-sm text-left bg-white transition-all hover:shadow-md flex flex-col justify-between h-36"
                  >
                    <div>
                      <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:bg-[#3b5998] group-hover:text-white transition-all mb-3">
                        <Mail className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-slate-800 text-[13px] group-hover:text-[#3b5998] transition-colors">{`Perbaikan Data`}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">Permohonan penyesuaian data AHU Online</p>
                    </div>
                    <span className="text-[11px] font-bold text-[#3b5998] uppercase flex items-center gap-1 mt-2">Mulai <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" /></span>
                  </button>
                </div>
              </div>

              {/* Grid: Recent Drafts & Shortcuts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Recent RUPS LB Drafts */}
                <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm flex flex-col h-[400px]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[14px] font-bold text-slate-700 uppercase tracking-tight flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-indigo-500 font-bold"></span> RUPS LB Terbaru
                    </h3>
                    <button onClick={() => setActiveSidebarTab('notulen')} className="text-[#3b5998] hover:underline text-[12px] font-bold uppercase">Semua RUPS LB</button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {projects.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6 border border-dashed border-slate-200 rounded">
                        <FileText className="w-8 h-8 opacity-40 mb-2" />
                        <span className="text-[12px]">Belum ada draft RUPS LB di sistem</span>
                      </div>
                    ) : (
                      projects.slice(0, 5).map(p => (
                        <div key={p.id} className="p-3 border border-slate-100 hover:border-indigo-300 rounded-sm bg-slate-50/50 hover:bg-slate-50 transition-all flex items-center justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-[#3b5998] text-[13px] truncate">{p.companyName}</h4>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-500">
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400 shrink-0"/> {p.newAddress?.city || p.domicile || 'Kota tidak diisi'}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setEditingProjectId(p.id);
                              updateData({ ...INITIAL_STATE, ...p } as any);
                              setActiveSidebarTab('notulen');
                            }}
                            className="bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-[#3b5998] px-3 py-1.5 rounded-sm font-bold text-[11px] uppercase transition-all shrink-0 shadow-sm"
                          >
                            Edit
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Recent RUPS Tahunan (RUPST) Drafts */}
                <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm flex flex-col h-[400px]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[14px] font-bold text-slate-700 uppercase tracking-tight flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-emerald-500 font-bold"></span> RUPS Tahunan Terbaru
                    </h3>
                    <button onClick={() => setActiveSidebarTab('rupst')} className="text-[#3b5998] hover:underline text-[12px] font-bold uppercase">Semua RUPST</button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {rupstProjects.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6 border border-dashed border-slate-200 rounded">
                        <History className="w-8 h-8 opacity-40 mb-2" />
                        <span className="text-[12px]">Belum ada draft RUPS Tahunan di sistem</span>
                      </div>
                    ) : (
                      rupstProjects.slice(0, 5).map(p => (
                        <div key={p.id} className="p-3 border border-slate-100 hover:border-[#40bdae] rounded-sm bg-slate-50/50 hover:bg-slate-50 transition-all flex items-center justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-[#3b5998] text-[13px] truncate">{p.companyName}</h4>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-500">
                              <span className="flex items-center gap-1 font-mono text-emerald-600 font-semibold bg-emerald-50 px-1.5 rounded-sm">Tahun Buku {p.rupstFiscalYear || '2025'}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setEditingRupstId(p.id);
                              updateData({ ...INITIAL_STATE, ...p } as any);
                              setActiveSidebarTab('rupst');
                            }}
                            className="bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-[#40bdae] px-3 py-1.5 rounded-sm font-bold text-[11px] uppercase transition-all shrink-0 shadow-sm"
                          >
                            Edit
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
              
              {/* Notary Quality & Integration Info Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border border-slate-200 rounded-md p-5 shadow-sm overflow-hidden">
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5 font-bold" />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-800">Regulasi AHU & UU No. 40/2007</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-1">Sistem ini mematuhi standar Akta Notaris di Indonesia yang mengacu pada Undang-Undang PT, mencakupi kuorum kehadiran, kuorum sirkuler, tata penambahan kapital, pemisahan saham lama dan baru secara hukum.</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <FileSignature className="w-5 h-5 font-bold" />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-800">Cetak & Ekspor Langsung (.docx)</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-1">Drafting akta dapat disinkronkan langsung dengan data profil perusahaan, serta mendukung dokumen berkualitas tinggi yang dapat dicetak langsung atau diekspor ke Microsoft Word untuk kelancaran pendaftaran AHU online.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : activeSidebarTab === 'company_profile' ? (
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="flex justify-between items-center bg-white p-4 rounded-sm shadow-sm border border-slate-200">
                <div>
                  <h2 className="text-[16px] font-bold flex items-center gap-2 text-slate-800 uppercase"><Building2 className="w-5 h-5 text-[#3b5998]" /> Profil Perusahaan</h2>
                  <p className="text-[12px] text-slate-500">Kelola daftar profil perusahaan untuk digunakan pada notulen dan akta</p>
                </div>
                {!editingProfileId && (
                  <button onClick={() => {
                    setEditingProfileId('new');
                    updateData({ ...INITIAL_STATE } as any);
                  }} className="bg-[#3b5998] hover:bg-[#2d4373] text-white px-4 py-2 rounded-sm font-bold text-[12px] flex items-center gap-2 transition-colors">
                    <Plus className="w-4 h-4" /> TAMBAH PROFIL
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

                    <button onClick={resetData} className="px-5 py-2 bg-[#d9534f] text-white rounded-md text-[13px] font-bold transition-all hover:bg-[#c9302c] shadow-sm uppercase">RISET</button>
                    <button 
                      disabled={isSaving}
                      onClick={async () => {
                       if (!data.companyName) return alert('Nama perseroan harus diisi');
                       setIsSaving(true);
                       const newId = editingProfileId && editingProfileId !== 'new' ? editingProfileId : crypto.randomUUID();
                       const profileData = {
                           ...data,
                           id: newId
                       };
                       if (!user) {
                         setIsSaving(false);
                         return alert('Anda harus login terlebih dahulu!');
                       }
                       
                       try {
                           await setDoc(doc(db, 'profiles', profileData.id), sanitizeForFirestore(profileData));
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
                  </div>
                  
                  <div className="space-y-4">
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
                      <DomicileSelector 
                        label="Pilih Kota/Kabupaten"
                        value={data.domicile || ''}
                        onChange={(val) => updateData({ domicile: val })}
                      />
                    </div>
                    <AhuSelect 
                      className="w-40" 
                      value={data.domicileStyle} 
                      onChange={e => updateData({ domicileStyle: e.target.value as 'KOTA' | 'KABUPATEN' })}
                    >
                      <option value="KOTA">Kota</option>
                      <option value="KABUPATEN">Kabupaten</option>
                    </AhuSelect>
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
                      const newDeed = { id: crypto.randomUUID(), number: '', date: '', notary: '', skNumber: '', skDate: '', skSpDocuments: [] };
                      updateData({ amendmentDeeds: [...(data.amendmentDeeds || []), newDeed] });
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-sm text-slate-400 hover:border-[#3b5998] hover:text-[#3b5998] hover:bg-slate-50 transition-all group"
                  >
                    <Plus size={16} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[13px] font-bold uppercase tracking-wider">Tambah Akta Perubahan (Opsional)</span>
                  </button>
                </div>
              </AhuSection>

            

{/* JENIS NOTULEN */}
            

          </div>
          </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {profiles.length === 0 ? (
                    <div className="bg-slate-50 text-center py-12 rounded-sm border border-dashed border-slate-300 text-slate-500 text-[13px]">
                      Belum ada data profil perusahaan. Klik <strong>"TAMBAH PROFIL"</strong> untuk membuat.
                    </div>
                  ) : profiles.map(p => (
                     <div key={p.id} className="bg-white p-4 rounded-sm border border-slate-200 hover:border-[#3b5998] transition-colors relative group flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                             <Building2 className="w-5 h-5 text-indigo-500" />
                           </div>
                           <div>
                              <h3 className="font-bold text-slate-800 text-[14px] leading-tight mb-1">{p.companyName}</h3>
                              <p className="text-[12px] text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400 shrink-0"/> {p.newAddress?.city || 'Area belum diisi'}</p>
                           </div>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => {
                             setEditingProfileId(p.id);
                             updateData({ ...INITIAL_STATE, ...p } as any);
                           }} className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-sm text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1 transition-colors uppercase">
                             <Edit className="w-3 h-3" /> Edit
                           </button>
                           <button onClick={async () => {
                             if(confirm('Hapus profil ' + p.companyName + '?')) {
                               if (!user) return alert('Anda harus login!');
                               try {
                                 await deleteDoc(doc(db, 'profiles', p.id));
                                 alert('Profil berhasil dihapus');
                               } catch (e) {
                                 handleFirestoreError(e, OperationType.DELETE, `profiles/${p.id}`);
                               }
                             }
                           }} className="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2 rounded-sm text-[11px] font-bold flex items-center justify-center gap-1 transition-colors uppercase">
                             <Trash2 className="w-3 h-3" /> Hapus
                           </button>
                        </div>
                     </div>
                  ))}
                </div>
              )}
            </div>


) : activeSidebarTab === 'notulen' ? (
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="flex justify-between items-center bg-white p-4 rounded-sm shadow-sm border border-slate-200">
                <div>
                  <h2 className="text-[16px] font-bold flex items-center gap-2 text-slate-800 uppercase"><FileText className="w-5 h-5 text-[#3b5998]" /> Daftar RUPS LB</h2>
                  <p className="text-[12px] text-slate-500">Kelola daftar RUPS LB (Akta/Notulen/Sirkuler)</p>
                </div>
                {!editingProjectId && (
                  <button onClick={() => {
                    setEditingProjectId('new');
                    updateData({ ...INITIAL_STATE } as any);
                  }} className="bg-[#3b5998] hover:bg-[#2d4373] text-white px-4 py-2 rounded-sm font-bold text-[12px] flex items-center gap-2 transition-colors">
                    <Plus className="w-4 h-4" /> TAMBAH RUPS LB BARU
                  </button>
                )}
              </div>

              {editingProjectId ? (
                <div className="space-y-4 pb-20">
                  <div className="flex flex-wrap items-center gap-2 bg-slate-50/50 p-2 rounded-md border border-slate-200">
                    <button className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold text-[12px] uppercase bg-white px-3 py-2 rounded-sm border border-slate-200 shadow-sm" onClick={() => setEditingProjectId(null)}>
                      <ArrowRight className="w-4 h-4 rotate-180" /> Kembali
                    </button>
                    
                    <div className="h-6 w-px bg-slate-300 mx-1"></div>

                    <button onClick={resetData} className="px-5 py-2 bg-[#d9534f] text-white rounded-md text-[13px] font-bold transition-all hover:bg-[#c9302c] shadow-sm uppercase">RISET</button>
                    <button 
                      disabled={isSaving}
                      onClick={async () => {
                       if (!data.companyName) return alert('Nama perseroan harus diisi');
                       setIsSaving(true);
                       
                       let newProjects = [...projects];
                       const newId = editingProjectId && editingProjectId !== 'new' ? editingProjectId : crypto.randomUUID();
                       const profileData: CompanyProfile = {
                           ...data,
                           id: newId
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
                           setEditingProjectId(null);
                           alert('RUPS LB berhasil disimpan!');
                       } catch (e) {
                           handleFirestoreError(e, OperationType.WRITE, `projects/${profileData.id}`);
                       } finally {
                           setIsSaving(false);
                       }
                    }} className="px-5 py-2 bg-[#40bdae] text-white rounded-md text-[13px] font-bold transition-all hover:bg-[#349c8f] shadow-sm uppercase disabled:opacity-50 disabled:cursor-not-allowed">
                      {isSaving ? 'MENYIMPAN...' : 'SIMPAN RUPS LB'}
                    </button>

                    <button onClick={() => setIsPreviewOpen(true)} className="hidden md:inline-block px-5 py-2 bg-[#5cb85c] text-white rounded-md text-[13px] font-bold transition-all hover:bg-[#449d44] shadow-sm uppercase">PREVIEW NOTULEN</button>
                    {mergedData.createDraftAktaRups && (
                      <button 
                        onClick={async () => {
                          try {
                            const { generateRUPSDocx } = await import('./src/lib/generateRUPSDocx');
                            await generateRUPSDocx(mergedData);
                          } catch (err) {
                            console.error('Failed to generate Draft Akta DOCX:', err);
                            alert('Gagal menghasilkan Draft Akta DOCX.');
                          }
                        }}
                        className="hidden md:flex px-5 py-2 bg-[#3b5998] text-white rounded-md text-[13px] font-bold transition-all hover:bg-[#2c4073] shadow-sm uppercase items-center gap-2"
                      >
                         <FileCode className="w-4 h-4" /> DRAFT AKTA DOCX
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
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
                         } = selected; // Exclude resolution target fields
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
                      <DomicileSelector 
                        label="Pilih Kota/Kabupaten"
                        value={data.domicile || ''}
                        onChange={(val) => updateData({ domicile: val })}
                      />
                    </div>
                    <AhuSelect 
                      className="w-40" 
                      value={data.domicileStyle} 
                      onChange={e => updateData({ domicileStyle: e.target.value as 'KOTA' | 'KABUPATEN' })}
                    >
                      <option value="KOTA">Kota</option>
                      <option value="KABUPATEN">Kabupaten</option>
                    </AhuSelect>
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
                      const newDeed = { id: crypto.randomUUID(), number: '', date: '', notary: '', skNumber: '', skDate: '', skSpDocuments: [] };
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
                    <label className="flex items-center gap-2 text-[13px] text-slate-700 cursor-pointer font-bold">
                      <input
                        type="checkbox"
                        checked={data.createDraftAktaRups}
                        onChange={(e) => updateData({ createDraftAktaRups: e.target.checked })}
                        className="w-4 h-4 text-[#3b5998] focus:ring-[#3b5998] border-[#ccc] rounded"
                      />
                      <span>Buat Draft Akta RUPS</span>
                    </label>

                    {data.createDraftAktaRups && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 p-4 bg-slate-50 border border-slate-200 rounded-sm">
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
                      </div>
                    )}
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

                  {/* Shareholder Attendance */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
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

                  {/* Guests / Invitations */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-[12px] font-bold text-slate-500 uppercase flex items-center gap-2">
                         <UserPlus className="w-3 h-3" /> Daftar Undangan / Pihak Lain
                      </h4>
                      <button 
                        onClick={() => {
                          const newGuest = { id: Math.random().toString(36).substr(2, 9), name: '', position: '' };
                          updateData({ guests: [...(data.guests || []), newGuest] });
                        }}
                        className="bg-[#222d32] text-white px-3 py-1.5 rounded-sm text-[10px] font-bold hover:bg-black transition-colors flex items-center gap-1 shadow-sm uppercase"
                      >
                        <Plus className="w-3 h-3" /> Tambah Undangan
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(data.guests || []).map((g, idx) => (
                        <div key={g.id} className="flex gap-2 items-start bg-slate-50 p-2.5 rounded border border-slate-200 shadow-sm">
                          <div className="flex-1">
                            <AhuLabel label="Nama Undangan" />
                            <AhuInput 
                              placeholder="Ketik nama undangan..." 
                              value={g.name} 
                              onChange={e => {
                                const newGuests = [...data.guests];
                                newGuests[idx].name = e.target.value;
                                updateData({ guests: newGuests });
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <AhuLabel label="Jabatan/Keterangan" />
                            <AhuInput 
                              placeholder="Contoh: Notaris / Komisaris" 
                              value={g.position} 
                              onChange={e => {
                                const newGuests = [...data.guests];
                                newGuests[idx].position = e.target.value;
                                updateData({ guests: newGuests });
                              }}
                            />
                          </div>
                          <div className="pt-7">
                            <button 
                              onClick={() => {
                                const newGuests = data.guests.filter((_, i) => i !== idx);
                                updateData({ guests: newGuests });
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                              title="Hapus Undangan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {(data.guests || []).length === 0 && (
                        <div className="text-[11px] text-slate-400 italic text-center p-6 border border-dashed border-slate-200 rounded-sm bg-white">
                          Belum ada undangan tambahan yang menghadiri rapat.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </AhuSection>
            )}

            {data.documentType === 'MINUTES' && (
              <AhuSection title="DETAIL RAPAT">
                <div className="space-y-4">
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
                <div className="space-y-6">
                  <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="flex-1 w-full">
                      <SearchableSelect
                        label="Pilih dari Katalog"
                        value={newKbliId ? `${KBLI_DATA.find(k => k.id === newKbliId)?.code} - ${KBLI_DATA.find(k => k.id === newKbliId)?.name}` : ''}
                        options={KBLI_DATA.map(k => ({ id: k.id, name: `${k.code} - ${k.name}` }))}
                        onChange={(opt) => setNewKbliId(opt ? opt.id : null)}
                        placeholder="Cari KBLI..."
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (newKbliId) {
                          const selected = KBLI_DATA.find(k => k.id === newKbliId);
                          if (selected) {
                            if (data.kbliItems.some(i => i.code === selected.code)) {
                              alert(`KBLI ${selected.code} sudah ada di daftar.`);
                              return;
                            }
                            const newItem: KbliItem = {
                              id: crypto.randomUUID(),
                              code: selected.code,
                              name: selected.name,
                              description: selected.description,
                              categoryLetter: selected.categoryLetter,
                              categoryName: selected.categoryName
                            };
                            updateData({ kbliItems: [newItem, ...data.kbliItems] });
                            setNewKbliId(null);
                          }
                        }
                      }}
                      disabled={!newKbliId}
                      className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-all disabled:opacity-50"
                    >
                      + Tambah KBLI
                    </button>
                  </div>

                  <div className="border border-slate-200 overflow-x-auto rounded-sm">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-[#f9f9f9] border-b border-slate-200 uppercase">
                        <tr>
                          <th className="p-2 border-r border-slate-200 w-10 text-center">No</th>
                          <th className="p-2 border-r border-slate-200 w-20">Kode KBLI</th>
                          <th className="p-2 border-r border-slate-200 w-40">Judul KBLI</th>
                          <th className="p-2 border-r border-slate-200">Uraian KBLI</th>
                          <th className="p-2 w-10 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.kbliItems.map((item, idx) => (
                          <tr key={item.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors">
                            <td className="p-2 border-r border-slate-200 text-center">{idx + 1}</td>
                            <td className="p-2 border-r border-slate-200">{item.code}</td>
                            <td className="p-2 border-r border-slate-200">{item.name}</td>
                            <td className="p-2 border-r border-slate-200 text-slate-600 leading-relaxed">{item.description}</td>
                            <td className="p-2 text-center text-[10px]">
                              <button onClick={() => updateData({ kbliItems: data.kbliItems.filter(k => k.id !== item.id) })} className="text-slate-400 hover:text-red-500">
                                <Trash2 className="w-4 h-4 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                        />
                      </div>
                    )}
                  </div>

               </div>
            </AhuSection>


            
            {/* Added Previews section at the bottom of the project */}
            <div className="space-y-6 pb-12">
               {mergedData.createDraftAktaRups && (
                 <AhuSection title="DRAFT AKTA RUPS" isOpen={false}>
                   <DraftAktaRUPS companyData={mergedData} />
                 </AhuSection>
               )}

               {mergedData.resolutions.shareholders && (
                 <AhuSection title="DRAFT AKTA PERALIHAN SAHAM (JUAL BELI / HIBAH)" isOpen={false}>
                   <div className="space-y-4">
                      <p className="text-[13px] text-slate-600 mb-4 font-normal">Terdapat agenda <strong>Peralihan Saham</strong>. Anda dapat melihat dan mengunduh Akta Peralihan di bawah ini.</p>
                      <DraftAktaApp companyData={mergedData} />
                   </div>
                 </AhuSection>
               )}
            </div>

                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {projects.length === 0 ? (
                    <div className="bg-slate-50 text-center py-12 rounded-sm border border-dashed border-slate-300 text-slate-500 text-[13px]">
                      Belum ada data RUPS LB. Klik <strong>"TAMBAH RUPS LB BARU"</strong> untuk membuat.
                    </div>
                  ) : projects.map(p => (
                     <div key={p.id} className="bg-white p-4 rounded-sm border border-slate-200 hover:border-[#3b5998] transition-colors relative group flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                             <Building2 className="w-5 h-5 text-indigo-500" />
                           </div>
                           <div>
                              <h3 className="font-bold text-slate-800 text-[14px] leading-tight mb-1 pr-6">{p.companyName}</h3>
                              <p className="text-[12px] text-slate-500 flex items-center gap-1 line-clamp-1"><MapPin className="w-3 h-3 text-slate-400 shrink-0"/> {p.newAddress?.city || 'Area belum diisi'}</p>
                           </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                           <button onClick={() => {
                             setEditingProjectId(p.id);
                             updateData({ ...INITIAL_STATE, ...p } as any);
                           }} className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-sm text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1 transition-colors flex-1 uppercase">
                             <Edit className="w-3 h-3" /> Edit
                           </button>
                           <button onClick={async () => {
                             if(confirm('Hapus RUPS LB ' + p.companyName + '?')) {
                               if (!user) return alert('Anda harus login!');
                               try {
                                 await deleteDoc(doc(db, 'projects', p.id));
                                 alert('RUPS LB berhasil dihapus');
                               } catch (e) {
                                 handleFirestoreError(e, OperationType.DELETE, `projects/${p.id}`);
                               }
                             }
                           }} className="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2 rounded-sm text-[11px] font-bold flex items-center justify-center gap-1 transition-colors flex-1 uppercase">
                             <Trash2 className="w-3 h-3" /> Hapus
                           </button>
                        </div>
                     </div>
                  ))}
                </div>
              )}
            </div>


) : activeSidebarTab === 'sirkuler_laporan' ? (
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="flex justify-between items-center bg-white p-4 rounded-sm shadow-sm border border-slate-200">
                <div>
                  <h2 className="text-[16px] font-bold flex items-center gap-2 text-slate-800 uppercase"><FileSignature className="w-5 h-5 text-[#3b5998]" /> Sirkuler Laporan Tahunan</h2>
                  <p className="text-[12px] text-slate-500">Draft Keputusan Pemegang Saham (Sirkuler) untuk Laporan Tahunan</p>
                </div>
                <button 
                  disabled={isExportingPendirian}
                  onClick={async () => {
                     setIsExportingPendirian(true);
                     try {
                        const { generateSirkulerLaporanDocx } = await import('./src/lib/generateSirkulerLaporanDocx');
                        await generateSirkulerLaporanDocx(mergedData);
                      } catch (error) {
                        console.error('Failed to export DOCX:', error);
                        alert('Gagal mengekspor DOCX, silakan coba lagi.');
                      } finally {
                        setIsExportingPendirian(false);
                      }
                  }} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-sm font-bold text-[12px] flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <FileCode className="w-4 h-4" /> {isExportingPendirian ? 'MEMPROSES...' : 'UNDUH DOCX'}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
                 <div>
                    <AhuSection title="PILIH PROFIL">
                      <div className="space-y-4">
                        <label className="block text-[13px] font-medium text-slate-700 mb-1">Pilih Profil Perseroan (Wajib)</label>
                        <select 
                          className="w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none bg-white focus:border-[#66afe9]"
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
                      </div>
                    </AhuSection>
                    
                    <SirkulerLaporanFormContent data={mergedData} updateData={updateData} />
                 </div>
                 <div className="bg-slate-200 overflow-x-auto p-4 rounded shadow-inner flex justify-center h-[calc(100vh-250px)] relative">
                    <div className="transform scale-90 sm:scale-75 xl:scale-100 origin-top h-max">
                      <SirkulerLaporanDocumentPreview data={mergedData} />
                    </div>
                 </div>
              </div>
            </div>

) : activeSidebarTab === 'rupst' ? (
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="flex justify-between items-center bg-white p-4 rounded-sm shadow-sm border border-slate-200">
                <div>
                  <h2 className="text-[16px] font-bold flex items-center gap-2 text-slate-800 uppercase"><History className="w-5 h-5 text-[#3b5998]" /> RUPS Tahunan (RUPST)</h2>
                  <p className="text-[12px] text-slate-500">Kelola daftar notulen RUPS Tahunan</p>
                </div>
                {!editingRupstId && (
                  <button onClick={() => {
                    setEditingRupstId('new');
                    updateData({ 
                      ...INITIAL_STATE, 
                    } as any);
                  }} className="bg-[#3b5998] hover:bg-[#2d4373] text-white px-4 py-2 rounded-sm font-bold text-[12px] flex items-center gap-2 transition-colors">
                    <Plus className="w-4 h-4" /> TAMBAH RUPST BARU
                  </button>
                )}
              </div>

              {editingRupstId ? (
                <div className="space-y-4 pb-20">
                  {/* ... editing form ... */}
                  <div className="flex flex-wrap items-center gap-2 bg-slate-50/50 p-2 rounded-md border border-slate-200">
                    <button className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold text-[12px] uppercase bg-white px-3 py-2 rounded-sm border border-slate-200 shadow-sm" onClick={() => setEditingRupstId(null)}>
                      <ArrowRight className="w-4 h-4 rotate-180" /> Kembali
                    </button>
                    
                    <div className="h-6 w-px bg-slate-300 mx-1"></div>

                    <button onClick={resetData} className="px-5 py-2 bg-[#d9534f] text-white rounded-md text-[13px] font-bold transition-all hover:bg-[#c9302c] shadow-sm uppercase">RISET</button>
                    <button 
                      disabled={isSaving}
                      onClick={async () => {
                       if (!data.companyName) return alert('Nama perseroan harus diisi');
                       setIsSaving(true);
                       const newId = editingRupstId && editingRupstId !== 'new' ? editingRupstId : crypto.randomUUID();
                       const profileData = {
                           ...data,
                           id: newId
                       };
                       if (!user) {
                         setIsSaving(false);
                         return alert('Anda harus login terlebih dahulu!');
                       }
                       
                       try {
                           await setDoc(doc(db, 'rupst_projects', profileData.id), sanitizeForFirestore(profileData));
                           setEditingRupstId(null);
                           alert('RUPST berhasil disimpan!');
                       } catch (e) {
                           handleFirestoreError(e, OperationType.WRITE, `rupst_projects/${profileData.id}`);
                       } finally {
                           setIsSaving(false);
                       }
                    }} className="px-5 py-2 bg-[#40bdae] text-white rounded-md text-[13px] font-bold transition-all hover:bg-[#349c8f] shadow-sm uppercase disabled:opacity-50 disabled:cursor-not-allowed">
                      {isSaving ? 'MENYIMPAN...' : 'SIMPAN RUPST'}
                    </button>

                    <button onClick={() => setIsPreviewOpen(true)} className="hidden md:inline-block px-5 py-2 bg-[#5cb85c] text-white rounded-md text-[13px] font-bold transition-all hover:bg-[#449d44] shadow-sm uppercase">PREVIEW NOTULEN</button>
                    <button 
                      onClick={async () => {
                        try {
                          const { generateRUPSTDocx } = await import('./src/lib/generateRUPSTDocx');
                          await generateRUPSTDocx(mergedData);
                        } catch (err) {
                          console.error('Failed to generate RUPST DOCX:', err);
                          alert('Gagal menghasilkan RUPST DOCX.');
                        }
                      }}
                      className="hidden md:flex px-5 py-2 bg-slate-500 text-white rounded-md text-[13px] font-bold transition-all hover:bg-slate-600 shadow-sm uppercase items-center gap-2"
                    >
                       <FileText className="w-4 h-4" /> NOTULEN RUPST DOCX
                    </button>
                    <button 
                      onClick={async () => {
                        try {
                          const { generateRUPSTAktaDocx } = await import('./src/lib/generateRUPSTAktaDocx');
                          await generateRUPSTAktaDocx(mergedData);
                        } catch (err) {
                          console.error('Failed to generate Draft Akta RUPST DOCX:', err);
                          alert('Gagal menghasilkan Draft Akta RUPST DOCX.');
                        }
                      }}
                      className="hidden md:flex px-5 py-2 bg-[#3b5998] text-white rounded-md text-[13px] font-bold transition-all hover:bg-[#2c4073] shadow-sm uppercase items-center gap-2"
                    >
                       <FileCode className="w-4 h-4" /> DRAFT AKTA RUPST DOCX
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {/* PILIH PROFIL */}
                    <AhuSection title="PILIH PROFIL">
                      <div className="space-y-4">
                        <label className="block text-[13px] font-medium text-slate-700 mb-1">Pilih Profil Perseroan untuk mengisi data otomatis</label>
                        <select 
                          className="w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none bg-white focus:border-[#66afe9]"
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
                      </div>
                    </AhuSection>

                    {/* DATA KHUSUS RUPST */}
                    <AhuSection title="AGENDA DAN KEUANGAN RUPST">
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
                              {((data.rupstNetProfit || 0) - (data.rupstDividendAmount || 0)) < 0 ? '- ' : ''}Rp. {formatInputNumber(Math.abs((data.rupstNetProfit || 0) - (data.rupstDividendAmount || 0)))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
                          <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Alasan Tidak Wajib Audit:</h5>
                          <div className="space-y-1.5 pt-1">
                            <label className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer font-medium">
                              <input
                                type="checkbox"
                                checked={data.rupstAlasanAuditA !== false}
                                onChange={(e) => updateData({ rupstAlasanAuditA: e.target.checked })}
                                className="w-4 h-4 text-[#3b5998] focus:ring-[#3b5998] border-[#ccc] rounded"
                              />
                              <span className="flex-1">a. Kegiatan Usaha Perseroan tidak menghimpun dan/atau mengelola dana masyarakat.</span>
                            </label>
                            <label className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer font-medium">
                              <input
                                type="checkbox"
                                checked={data.rupstAlasanAuditB !== false}
                                onChange={(e) => updateData({ rupstAlasanAuditB: e.target.checked })}
                                className="w-4 h-4 text-[#3b5998] focus:ring-[#3b5998] border-[#ccc] rounded"
                              />
                              <span className="flex-1">b. Perseroan tidak menerbitkan surat pengakuan utang kepada masyarakat.</span>
                            </label>
                            <label className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer font-medium">
                              <input
                                type="checkbox"
                                checked={data.rupstAlasanAuditC !== false}
                                onChange={(e) => updateData({ rupstAlasanAuditC: e.target.checked })}
                                className="w-4 h-4 text-[#3b5998] focus:ring-[#3b5998] border-[#ccc] rounded"
                              />
                              <span className="flex-1">c. Perseroan tidak merupakan Perseroan Terbuka (Tbk).</span>
                            </label>
                            <label className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer font-medium">
                              <input
                                type="checkbox"
                                checked={data.rupstAlasanAuditD !== false}
                                onChange={(e) => updateData({ rupstAlasanAuditD: e.target.checked })}
                                className="w-4 h-4 text-[#3b5998] focus:ring-[#3b5998] border-[#ccc] rounded"
                              />
                              <span className="flex-1">d. Perseroan tidak merupakan Persero.</span>
                            </label>
                            <label className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer font-medium">
                              <input
                                type="checkbox"
                                checked={data.rupstAlasanAuditE !== false}
                                onChange={(e) => updateData({ rupstAlasanAuditE: e.target.checked })}
                                className="w-4 h-4 text-[#3b5998] focus:ring-[#3b5998] border-[#ccc] rounded"
                              />
                              <span className="flex-1">e. Aset dan/atau jumlah peredaran usaha tidak lebih dari 50 Milyar, atau</span>
                            </label>
                            <label className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer font-medium">
                              <input
                                type="checkbox"
                                checked={data.rupstAlasanAuditF !== false}
                                onChange={(e) => updateData({ rupstAlasanAuditF: e.target.checked })}
                                className="w-4 h-4 text-[#3b5998] focus:ring-[#3b5998] border-[#ccc] rounded"
                              />
                              <span className="flex-1">f. Tidak diwajibkan oleh peraturan perundang-undangan.</span>
                            </label>
                          </div>
                        </div>
                        
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
                          <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Komponen Laporan Keuangan Yang Disahkan:</h5>
                          <div className="space-y-1.5 pt-1">
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
                          <AhuLabel label="Ketentuan AD (Pasal)" />
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
                              <AhuInput value={data.rupstQuorumArticle || ''} onChange={e => updateData({ rupstQuorumArticle: e.target.value })} placeholder="Contoh: 22" />
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
                                />
                              </div>
                            )}
                          </div>
                       </div>
                    </AhuSection>
                  </div>
                  
                  {/* PREVIEW AREA (Bottom) */}
                  <AhuSection title="PREVIEW NOTULEN RUPST" isOpen={false}>
                     <div className="bg-slate-100 p-4 rounded min-h-[500px]">
                        <RUPSTDocumentPreview data={mergedData} />
                     </div>
                  </AhuSection>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* SAVED RUPST SECTION */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                      <History className="w-5 h-5 text-[#3b5998]" />
                      <h3 className="text-[14px] font-bold text-slate-800 uppercase">Notulen RUPST Tersimpan</h3>
                    </div>
                    {rupstProjects.length === 0 ? (
                      <div className="bg-slate-50 text-center py-6 rounded-sm border border-dashed border-slate-300 text-slate-500 text-[12px]">
                        Belum ada notulen RUPST yang disimpan.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {rupstProjects.map(p => (
                          <div key={p.id} className="bg-white p-4 rounded-sm border border-slate-200 hover:border-[#3b5998] transition-colors relative group flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                                  <History className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-[14px] leading-tight mb-1 pr-6">{p.companyName}</h3>
                                    <p className="text-[12px] text-slate-500 flex items-center gap-1 line-clamp-1"><Clock className="w-3 h-3 text-slate-400 shrink-0"/> RUPST Tahun {p.rupstFiscalYear || '....'}</p>
                                </div>
                              </div>
                              <div className="flex gap-2 w-full md:w-auto">
                                <button onClick={() => {
                                  setEditingRupstId(p.id);
                                  updateData({ ...INITIAL_STATE, ...p } as any);
                                }} className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-sm text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1 transition-colors flex-1 uppercase">
                                  <Edit className="w-3 h-3" /> Edit
                                </button>
                                <button onClick={async () => {
                                  if(confirm('Hapus RUPST ' + p.companyName + '?')) {
                                    if (!user) return alert('Anda harus login!');
                                    try {
                                      await deleteDoc(doc(db, 'rupst_projects', p.id));
                                      alert('RUPST berhasil dihapus');
                                    } catch (e) {
                                      handleFirestoreError(e, OperationType.DELETE, `rupst_projects/${p.id}`);
                                    }
                                  }
                                }} className="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2 rounded-sm text-[11px] font-bold flex items-center justify-center gap-1 transition-colors flex-1 uppercase">
                                  <Trash2 className="w-3 h-3" /> Hapus
                                </button>
                              </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>


          ) : activeSidebarTab === 'pendirian' ? (
            <DraftAktaPendirian 
              onShowPreview={(d) => { setPendirianPreviewData(d); setShowPendirianPreview(true); }}
              onExportWord={(d) => { handlePendirianExportWord(d); }}
            />
          ) : activeSidebarTab === 'perbaikan' ? (
            <DataCorrectionLetter />
          ) : activeSidebarTab === 'panduan' ? (
            <GuideMenu />
          ) : null}
        </main>
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

    </div>
  );
};

export default App;