import React, { useState, useMemo } from 'react';
import { KbliItem, Shareholder, Address } from '../types';
import { KBLI_DATA } from '../utils/kbliData';
import { Eye, Printer, Users, Building2, Banknote, ChevronDown, ChevronRight, Search, Trash2, Plus, User, MapPin, Briefcase, IdCard, ShieldCheck, ArrowRight, Save, Edit, FileText, RefreshCw, Loader2 } from 'lucide-react';
import { Modal } from '../components/Modal';
import ShareholderForm from '../components/ShareholderForm';
import { IndoRegionSelector } from '../components/AddressFields';
import { searchShareholderByNIKClient } from './lib/firebase';
import { documentStatusOptions } from '../components/DocumentStatusBadge';
import { formatInputNumber, parseFormattedNumber } from '../utils/formatters';
import { fetchLatestDeedNumbers } from './lib/deedUtils';

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
  <label className="block text-[12px] font-bold text-slate-600 mb-1 uppercase tracking-tight">
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

const INITIAL_ADDRESS: Address = {
  province: '',
  city: '',
  fullAddress: '',
  rt: '',
  rw: '',
  kelurahan: '',
  kecamatan: ''
};

export interface PendirianData {
  documentStatus?: 'DRAFTING' | 'DRAFT NOTULEN DI KIRIM' | 'DRAFT AKTA DIKIRIM' | 'SUDAH CETAK AKTA' | 'SUDAH INPUT AHU' | 'SELESAI';
  namaPt: string;
  kotaKedudukan: string;
  alamatLengkapPT: string;
  kuotaWaktuDireksi: string; 
  tanggal: string;
  waktu: string;
  nomorAkta: string;
  nomorUrut: string;
  selectedProfileId?: string;
  notarisTempat: string;
  notarisNamaSurat: string;
  kbliItems: KbliItem[];
  modalDasar: number;
  nilaiPerLembar: number;
  modalDisetorPersen: number;
  modalDasarLembar?: number;
  modalDisetorLembar?: number;
  shareholders: Shareholder[];
  saksi1Nama: string;
  saksi1LahirTempat: string;
  saksi1LahirTanggal: string;
  saksi1Pekerjaan: string;
  saksi1Alamat: string;
  saksi1NIK: string;
  saksi2Nama: string;
  saksi2LahirTempat: string;
  saksi2LahirTanggal: string;
  saksi2Pekerjaan: string;
  saksi2Alamat: string;
  saksi2NIK: string;
}

interface DraftAktaPendirianProps {
  onShowPreview: (data: any, type: string) => void;
  onExportWord: (data: any, type: string) => void;
  profiles: any[];
  initialData?: PendirianData | null;
  onSave?: (data: PendirianData) => void;
  onCancel?: () => void;
  onDelete?: (id: string) => void;
  isSaving?: boolean;
  isSyncing?: boolean;
  onSync?: (data: PendirianData) => void;
  onChange?: (data: PendirianData) => void;
  autoSaveIndicator?: React.ReactNode;
}

export default function DraftAktaPendirian({ 
  onShowPreview, 
  onExportWord, 
  profiles, 
  initialData, 
  onSave, 
  onCancel,
  onDelete,
  isSaving = false,
  isSyncing = false,
  onSync,
  onChange,
  autoSaveIndicator
}: DraftAktaPendirianProps) {
  const [data, setData] = useState<PendirianData>(() => {
    if (initialData) return { nomorAkta: '', nomorUrut: '', ...initialData };
    return {
      namaPt: '',
      kotaKedudukan: '',
      alamatLengkapPT: '',
      kuotaWaktuDireksi: '5',
      tanggal: new Date().toISOString().split('T')[0],
      waktu: '10:00',
      nomorAkta: '',
      nomorUrut: '',
      notarisTempat: 'Kabupaten Bandung Barat',
      notarisNamaSurat: '',
      kbliItems: [],
      modalDasar: 50000000,
      modalDisetorPersen: 25,
      nilaiPerLembar: 50000,
      saksi1Nama: 'Nendi Suhendi',
      saksi1LahirTempat: 'Bandung',
      saksi1LahirTanggal: '1991-07-15',
      saksi1Pekerjaan: 'Karyawan Swasta',
      saksi1Alamat: 'Jalan Sukaresmi Nomor 17, Rukun Tetangga 005, Rukun Warga 005, Kecamatan Lembang, Desa Mekarwangi',
      saksi1NIK: '3217011507910016',
      saksi2Nama: 'Siti Nur Azizah',
      saksi2LahirTempat: 'Bandung',
      saksi2LahirTanggal: '1999-12-17',
      saksi2Pekerjaan: 'Karyawan Swasta',
      saksi2Alamat: 'Jalan Lembah Pakar Timur II Kampung Sekebuluh Rukun Tetangga 001, Rukun Warga 004, Kecamatan Cimenyan, Desa Ciburial',
      saksi2NIK: '3204065712990001',
      shareholders: [
        {
          id: crypto.randomUUID(),
          salutation: 'Tuan',
          name: '',
          birthCity: '',
          birthDate: '',
          occupation: '',
          nationality: 'WNI',
          nationalityType: 'WNI',
          address: { ...INITIAL_ADDRESS },
          nik: '',
          sharesOwned: 100,
          managementPosition: 'Direktur',
          isManagement: true,
          shareholderType: 'PERORANGAN',
          isForeign: false
        }
      ]
    };
  });

  const [isReadOnly, setIsReadOnly] = useState(initialData !== null);
  const [isFetchingNumbers, setIsFetchingNumbers] = useState(false);

  const handleFetchLatestNumbers = async () => {
    setIsFetchingNumbers(true);
    try {
      const numbers = await fetchLatestDeedNumbers(data.tanggal);
      setData(prev => ({
        ...prev,
        nomorAkta: numbers.nextDeedNumber,
        nomorUrut: numbers.nextOrderNumber
      }));
    } catch (error) {
      alert("Gagal mengambil nomor akta terbaru.");
    } finally {
      setIsFetchingNumbers(false);
    }
  };

  const handleCancelEdit = () => {
    if (initialData) {
      setData({ ...initialData });
      setIsReadOnly(true);
    } else {
      if (onCancel) onCancel();
    }
  };

  React.useEffect(() => {
    if (onChange) {
      onChange(data);
    }
  }, [data, onChange]);

  const [editingShareholder, setEditingShareholder] = useState<Shareholder | null>(null);

  const openShareholderEditor = (sh?: Shareholder) => {
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

  const handleShareholderSave = (updatedShareholder: Shareholder) => {
    updateData('shareholders', data.shareholders.some(s => s.id === updatedShareholder.id)
      ? data.shareholders.map(s => s.id === updatedShareholder.id ? updatedShareholder : s)
      : [...data.shareholders, updatedShareholder]
    );
    setEditingShareholder(null);
  };

  const [isAddKbliModalOpen, setIsAddKbliModalOpen] = useState(false);
  const [kbliModalSearchTerm, setKbliModalSearchTerm] = useState('');
  const [kbliModalSearchResults, setKbliModalSearchResults] = useState<any[]>(() => {
    return [...KBLI_DATA].sort((a, b) => a.code.localeCompare(b.code));
  });
  const [kbliCurrentPage, setKbliCurrentPage] = useState(1);
  const [kbliCheckedKblis, setKbliCheckedKblis] = useState<string[]>([]);
  
  const performKbliModalSearch = () => {
    setKbliCurrentPage(1);
    if (!kbliModalSearchTerm.trim()) {
      const sorted = [...KBLI_DATA].sort((a, b) => a.code.localeCompare(b.code));
      setKbliModalSearchResults(sorted);
      return;
    }

    const searchStr = kbliModalSearchTerm.toLowerCase().trim();
    const keywords = searchStr.split(/\s+/).filter(k => k.length > 0);

    const filtered = KBLI_DATA.filter(item => {
      const kodeMatch = item.code.includes(searchStr);
      const judul = (item.name || '').toLowerCase();
      const uraian = (item.description || '').toLowerCase();

      if (/^\d+$/.test(searchStr)) {
        return item.code.startsWith(searchStr);
      }

      return kodeMatch || keywords.every(kw => judul.includes(kw) || uraian.includes(kw));
    });

    const sortedFiltered = [...filtered].sort((a, b) => a.code.localeCompare(b.code));
    setKbliModalSearchResults(sortedFiltered);
  };

  const handleKbliModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performKbliModalSearch();
    }
  };

  const handleToggleKbliChecked = (code: string) => {
    setKbliCheckedKblis(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const kbliItemsPerPage = 10;
  const kbliTotalPages = Math.ceil(kbliModalSearchResults.length / kbliItemsPerPage);
  
  const kbliPaginatedResults = useMemo(() => {
    return kbliModalSearchResults.slice(
      (kbliCurrentPage - 1) * kbliItemsPerPage,
      kbliCurrentPage * kbliItemsPerPage
    );
  }, [kbliModalSearchResults, kbliCurrentPage]);

  const handleToggleAllKbliOnPage = () => {
    const allOnPageCodes = kbliPaginatedResults.map(r => r.code);
    const allChecked = allOnPageCodes.every(c => kbliCheckedKblis.includes(c));
    
    if (allChecked) {
      setKbliCheckedKblis(prev => prev.filter(c => !allOnPageCodes.includes(c)));
    } else {
      const newChecked = [...kbliCheckedKblis];
      allOnPageCodes.forEach(c => {
        if (!newChecked.includes(c)) newChecked.push(c);
      });
      setKbliCheckedKblis(newChecked);
    }
  };

  const handleAddKbliBatch = () => {
    const newItems: KbliItem[] = [];
    kbliCheckedKblis.forEach(code => {
      const existing = data.kbliItems.find(k => k.code === code);
      if (!existing) {
        const item = KBLI_DATA.find(k => k.code === code);
        if (item) {
          newItems.push({
            id: crypto.randomUUID(),
            code: item.code,
            name: item.name,
            description: item.description,
            categoryLetter: item.categoryLetter,
            categoryName: item.categoryName
          });
        }
      }
    });

    if (newItems.length > 0) {
      setData(prev => ({ ...prev, kbliItems: [...prev.kbliItems, ...newItems] }));
    }
    
    setKbliCheckedKblis([]);
    setIsAddKbliModalOpen(false);
  };

  const getKbliPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, kbliCurrentPage - Math.floor(maxVisible / 2));
    let end = Math.min(kbliTotalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const updateData = (field: keyof PendirianData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-20">
      <div className="flex justify-between items-center bg-white p-4 rounded-sm shadow-sm border border-slate-200 sticky top-0 z-10">
        <div>
          <h2 className="text-[16px] font-bold flex items-center gap-2 text-slate-800 uppercase">
            <Building2 className="w-5 h-5 text-[#3b5998]" /> Form Pendirian Perseroan Terbatas
          </h2>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          {autoSaveIndicator}
          {isReadOnly ? (
            <>
              {onCancel && (
                <button 
                  type="button" 
                  onClick={onCancel}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-bold rounded shadow hover:bg-slate-200 flex items-center gap-2 transition-all"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" /> Kembali
                </button>
              )}
              <button 
                type="button" 
                onClick={() => onExportWord(data, 'pendirian')}
                className="px-3 py-1.5 bg-[#00a65a] text-white text-sm font-bold rounded shadow hover:bg-[#008d4c] flex items-center gap-2 transition-all"
              >
                <Printer className="w-4 h-4" /> Download Akta
              </button>
              <button 
                type="button" 
                onClick={() => setIsReadOnly(false)}
                className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-bold rounded shadow hover:bg-indigo-700 flex items-center gap-2 transition-all"
              >
                <Edit className="w-4 h-4" /> Edit
              </button>
              {onDelete && initialData && (initialData as any).id && (
                <button 
                  type="button" 
                  onClick={() => onDelete((initialData as any).id)}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm font-bold rounded shadow hover:bg-red-700 flex items-center gap-2 transition-all"
                >
                  <Trash2 className="w-4 h-4" /> Hapus
                </button>
              )}
            </>
          ) : (
            <>
              <button 
                type="button" 
                onClick={handleCancelEdit}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-bold rounded shadow hover:bg-slate-200 flex items-center gap-2 transition-all"
              >
                <ArrowRight className="w-4 h-4 rotate-180" /> Batal
              </button>
              {onSave && (
                <button 
                  type="button" 
                  disabled={isSaving}
                  onClick={() => onSave(data)}
                  className="px-3 py-1.5 bg-[#3b5998] text-white text-sm font-bold rounded shadow hover:bg-[#2d4373] flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  <Save className="w-4 h-4" /> {isSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              )}
              {onSync && (
                <button 
                  type="button" 
                  disabled={isSyncing}
                  onClick={() => onSync(data)}
                  className="px-3 py-1.5 bg-[#3b5998] text-white text-sm font-bold rounded shadow hover:bg-[#2d4373] flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Simpan ke laporan
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <fieldset disabled={isReadOnly} className="contents">
      <div className="grid grid-cols-1 gap-4">
        {/* STATUS DOKUMEN */}
        <AhuSection title="Status Dokumen">
           <div className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <AhuLabel label="Status Saat Ini" />
                  <div className="md:col-span-3">
                    <AhuSelect 
                      value={data.documentStatus || 'DRAFTING'}
                      onChange={e => setData(prev => ({ ...prev, documentStatus: e.target.value as any }))}
                    >
                      {documentStatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </AhuSelect>
                  </div>
               </div>
           </div>
        </AhuSection>

        {/* INFORMASI UTAMA */}
        <AhuSection title="Informasi Pendirian PT">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <AhuLabel label="Pilih Klien PT (Opsional)" />
              <div className="md:col-span-3">
                <AhuSelect 
                    value={data.selectedProfileId || ''}
                    onChange={(e) => {
                        const profileId = e.target.value;
                        const profile = profiles.find(p => p.id === profileId);
                        if (profile) {
                            setData(prev => ({ ...prev, selectedProfileId: profileId }));
                            const mappedShareholders = (profile.shareholders || []).map((s: any) => ({
                                id: crypto.randomUUID(),
                                salutation: s.salutation || 'Tuan',
                                name: (s.name || '').toUpperCase(),
                                birthCity: s.birthCity || '',
                                birthDate: s.birthDate || '',
                                nationality: s.nationality || 'WNI',
                                nationalityType: s.nationalityType || 'WNI',
                                occupation: s.occupation || '',
                                address: {
                                    fullAddress: s.address?.fullAddress || '',
                                    rt: s.address?.rt || '',
                                    rw: s.address?.rw || '',
                                    kelurahan: s.address?.kelurahan || '',
                                    kecamatan: s.address?.kecamatan || '',
                                    city: s.address?.city || '',
                                    province: s.address?.province || '',
                                },
                                nik: s.nik || '',
                                shareholderType: s.shareholderType || 'PERORANGAN',
                                isForeign: s.isForeign || false,
                                npwp: s.npwp || '',
                                passportNumber: s.passportNumber || '',
                                establishmentDeedNumber: s.establishmentDeedNumber || '',
                                establishmentDeedDate: s.establishmentDeedDate || '',
                                sharesOwned: s.sharesOwned || 0,
                                managementPosition: s.managementPosition || 'Direktur',
                                isManagement: s.isManagement || true
                            }));
                            const mappedKblis = (profile.kbliItems || []).map((k: any) => ({
                                id: crypto.randomUUID(),
                                code: k.code,
                                name: k.name,
                                description: k.description,
                                categoryLetter: k.categoryLetter,
                                categoryName: k.categoryName
                            }));
                            setData(prev => ({
                                ...prev,
                                namaPt: (profile.companyName || '').toUpperCase(),
                                kotaKedudukan: profile.newAddress?.city || profile.domicile || '',
                                alamatLengkapPT: profile.fullAddress || (profile.newAddress?.fullAddress ? 
                                    `${profile.newAddress.fullAddress}, RT ${profile.newAddress.rt}/${profile.newAddress.rw}, Kel. ${profile.newAddress.kelurahan}, Kec. ${profile.newAddress.kecamatan}` 
                                    : ''),
                                modalDasar: profile.originalCapitalBase || prev.modalDasar,
                                modalDasarLembar: profile.originalAuthorizedShares || prev.modalDasarLembar,
                                modalDisetorLembar: profile.originalTotalShares || prev.modalDisetorLembar,
                                nilaiPerLembar: profile.originalSharePrice || prev.nilaiPerLembar,
                                modalDisetorPersen: profile.originalCapitalBase ? 
                                    Math.round((profile.originalCapitalPaid / profile.originalCapitalBase) * 100) : prev.modalDisetorPersen,
                                kbliItems: mappedKblis.length > 0 ? mappedKblis : prev.kbliItems,
                                shareholders: mappedShareholders.length > 0 ? mappedShareholders : prev.shareholders
                            }));
                        }
                    }}
                >
                    <option value="">-- PILIH DATA DARI MANIFEST PT --</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.companyName}</option>)}
                </AhuSelect>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <AhuLabel label="Nama Perseroan Terbatas" required />
              <div className="md:col-span-3">
                 <AhuInput type="text" value={data.namaPt || ''} onChange={e => updateData('namaPt', e.target.value.toUpperCase())} placeholder="CONTOH: MAJU BERSAMA" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <AhuLabel label="Tempat Kedudukan (Kota/Kab)" required />
              <div className="md:col-span-3">
                <AhuInput type="text" value={data.kotaKedudukan || ''} onChange={e => updateData('kotaKedudukan', e.target.value)} placeholder="JAKARTA SELATAN" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <AhuLabel label="Alamat Lengkap PT" required />
              <div className="md:col-span-3">
                <textarea 
                  value={data.alamatLengkapPT || ''} 
                  onChange={e => updateData('alamatLengkapPT', e.target.value)} 
                  className="w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none focus:border-[#66afe9] transition-all bg-white text-slate-800" 
                  rows={2} 
                  placeholder="JALAN R.A. KARTINI NOMOR KAV 8 TOWER A..." 
                />
              </div>
            </div>

            {/* Modal Perseroan Section */}
            <div className="bg-slate-50 p-4 border border-slate-200 rounded-sm mt-2 space-y-4">
              <h4 className="flex items-center gap-2 text-[13px] font-bold text-[#3b5998] mb-2 uppercase tracking-tighter shadow-sm pb-1 border-b border-slate-200">
                <Banknote className="w-4 h-4" /> Modal Perseroan
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                <AhuLabel label="Harga per Lembar" />
                <div className="md:col-span-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">Rp.</span>
                    <AhuInput 
                      className="pl-10"
                      value={data.nilaiPerLembar === 0 ? '' : formatInputNumber(data.nilaiPerLembar)} 
                      onChange={e => updateData('nilaiPerLembar', parseFormattedNumber(e.target.value))} 
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
                        value={data.modalDasarLembar === undefined || data.modalDasarLembar === 0 ? '' : formatInputNumber(data.modalDasarLembar)} 
                        onChange={e => updateData('modalDasarLembar', parseFormattedNumber(e.target.value))} 
                      />
                    </div>
                    <div className="text-[13px] font-bold text-slate-500 w-48">
                      Rp. {formatInputNumber((data.modalDasarLembar || 0) * data.nilaiPerLembar)}
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
                        value={data.modalDisetorLembar === undefined || data.modalDisetorLembar === 0 ? '' : formatInputNumber(data.modalDisetorLembar)} 
                        onChange={e => updateData('modalDisetorLembar', parseFormattedNumber(e.target.value))} 
                      />
                    </div>
                    <div className="text-[13px] font-bold text-slate-500 w-48">
                      Rp. {formatInputNumber((data.modalDisetorLembar || 0) * data.nilaiPerLembar)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-3 text-[11px] text-slate-500 font-bold italic">
                * Modal Ditempatkan dan Disetor Minimal 25% dari Modal Dasar.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center pt-2">
              <AhuLabel label="Masa Jabatan Direksi & Komisaris" />
              <div className="md:col-span-3 flex items-center gap-2">
                <AhuInput type="text" className="w-20" value={data.kuotaWaktuDireksi || ''} onChange={e => updateData('kuotaWaktuDireksi', e.target.value)} />
                <span className="text-[13px] font-bold text-slate-500 uppercase">Tahun</span>
              </div>
            </div>
          </div>
        </AhuSection>

        {/* NOTARIS & JADWAL */}
        <AhuSection title="AKTA">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase border-b pb-1">Detail Waktu</h4>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <AhuLabel label="Tanggal Akta" />
                    <AhuInput type="date" value={data.tanggal || ''} onChange={e => updateData('tanggal', e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <AhuLabel label="Waktu (Pukul)" />
                    <AhuInput type="time" value={data.waktu || ''} onChange={e => updateData('waktu', e.target.value)} />
                  </div>
                </div>
             </div>
             <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase border-b pb-1">Detail Akta</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <AhuLabel label="Nomor Akta" />
                    <div className="flex gap-2">
                      <AhuInput type="text" value={data.nomorAkta || ''} onChange={e => updateData('nomorAkta', e.target.value)} />
                      <button
                        type="button"
                        onClick={handleFetchLatestNumbers}
                        disabled={isFetchingNumbers || isReadOnly}
                        className="p-2 bg-[#3b5998] hover:bg-[#2d4373] text-white rounded-sm transition-all disabled:opacity-50"
                        title="Ambil Nomor Terakhir"
                      >
                        {isFetchingNumbers ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <AhuLabel label="Nomor Urut Akta" />
                    <AhuInput type="text" value={data.nomorUrut || ''} onChange={e => updateData('nomorUrut', e.target.value)} />
                  </div>
                </div>
                <div>
                  <AhuLabel label="Tempat Kedudukan Notaris" />
                  <div className="h-[34px] px-3 flex items-center bg-slate-100 border border-slate-200 rounded-sm text-[12px] text-slate-600 font-medium">
                    Kabupaten Bandung Barat
                  </div>
                </div>
             </div>
          </div>
        </AhuSection>

        {/* MAKSUD DAN TUJUAN (KBLI) */}
        <AhuSection title="Maksud & Tujuan (KBLI 2025)">
           <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-[11px] text-slate-500 font-medium italic">Klik tombol di samping untuk mencari data KBLI secara otomatis sesuai standar tahun 2025.</p>
                <button
                  type="button"
                  onClick={() => setIsAddKbliModalOpen(true)}
                  className="px-4 py-2 bg-[#3b5998] hover:bg-[#2d4373] text-white text-[12px] font-bold rounded-sm transition-all flex items-center gap-1.5 uppercase shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Tambah KBLI
                </button>
              </div>

              <div className="w-full bg-white border border-slate-200 rounded-sm overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-slate-600 text-[11px]">
                      <th className="px-4 py-3 text-center w-12 border-r border-slate-200">#</th>
                      <th className="px-4 py-3 text-center w-24 border-r border-slate-200 text-[#3b5998]">Kode</th>
                      <th className="px-4 py-3 text-left w-64 border-r border-slate-200">Judul KBLI</th>
                      <th className="px-4 py-3 text-left border-r border-slate-200">Uraian Kegiatan</th>
                      <th className="px-4 py-3 text-center w-20">Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.kbliItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-center border-r border-slate-100 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="px-4 py-3 text-center border-r border-slate-100 font-mono text-[#3b5998] font-bold">{item.code}</td>
                        <td className="px-4 py-3 border-r border-slate-100 font-bold text-slate-800 uppercase leading-tight">{item.name}</td>
                        <td className="px-4 py-3 border-r border-slate-100 text-slate-600">
                          <textarea
                            value={item.description || ''}
                            onChange={(e) => {
                              const newList = data.kbliItems.map(k =>
                                k.id === item.id ? { ...k, description: e.target.value } : k
                              );
                              updateData('kbliItems', newList);
                            }}
                            className="w-full text-[11px] p-2 border border-slate-200 rounded font-medium focus:border-[#3b5998] outline-none bg-white text-slate-800 resize-y min-h-[80px]"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button 
                            type="button"
                            onClick={() => updateData('kbliItems', data.kbliItems.filter(k => k.id !== item.id))}
                            className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {data.kbliItems.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-slate-400 italic font-medium">
                          Belum ada data KBLI. Silakan klik tombol "Tambah KBLI" di atas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
           </div>
        </AhuSection>

        {/* STRUKTUR PENDIRIAN - Match styling with KLIEN PT */}
        <AhuSection title="Struktur Pemegang Saham & Pengurus">
          <div className="space-y-4">
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => openShareholderEditor()} className="bg-[#222d32] text-white px-3 py-1.5 rounded-sm text-[12px] font-bold shadow hover:bg-black transition-colors flex items-center gap-1"><Plus className="w-4 h-4" /> Tambah Data</button>
              </div>
              <div className="border border-slate-200 overflow-x-auto rounded-sm bg-white">
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
                         <td className="p-2 border-r border-slate-200">Rp. {formatInputNumber(s.sharesOwned * data.nilaiPerLembar)}</td>
                         <td className="p-2 text-center text-blue-600 flex items-center justify-center gap-2">
                           <span 
                             onClick={() => openShareholderEditor(s)} 
                             className="hover:underline flex items-center gap-0.5 cursor-pointer text-blue-600"
                           >
                             <Eye className="w-3 h-3" /> {isReadOnly ? 'Lihat' : 'Edit'}
                           </span>
                           {!isReadOnly && (
                             <>
                               <span className="text-slate-300">|</span>
                               <span 
                                 onClick={() => updateData('shareholders', data.shareholders.filter(sh => sh.id !== s.id))} 
                                 className="hover:underline text-red-500 flex items-center gap-0.5 cursor-pointer"
                               >
                                 <Trash2 className="w-3 h-3" /> Hapus
                               </span>
                             </>
                           )}
                         </td>
                       </tr>
                    ))}
                    {data.shareholders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-400 italic">Belum ada data pengurus/pemegang saham.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="text-[13px] font-bold text-slate-800 space-y-1 uppercase">
                <div>TOTAL LEMBAR SAHAM {formatInputNumber(data.shareholders.reduce((sum, s) => sum + (s.sharesOwned || 0), 0))}</div>
                <div>TOTAL MODAL DITEMPATKAN DAN DISETOR Rp {formatInputNumber(data.shareholders.reduce((sum, s) => sum + (s.sharesOwned || 0), 0) * data.nilaiPerLembar)}</div>
                {data.shareholders.reduce((sum, s) => sum + (s.sharesOwned || 0), 0) < (data.modalDisetorLembar || 0) && (
                  <div className="text-red-500 font-normal text-xs normal-case mt-1 bg-red-50 p-2 rounded border border-red-100">
                    * Total lembar saham ({formatInputNumber(data.shareholders.reduce((sum, s) => sum + (s.sharesOwned || 0), 0))}) kurang dari Modal Ditempatkan & Disetor ({formatInputNumber(data.modalDisetorLembar || 0)} lembar)
                  </div>
                )}
              </div>
          </div>
        </AhuSection>
      </div>
      </fieldset>

      <Modal
        isOpen={Boolean(editingShareholder)}
        onClose={() => setEditingShareholder(null)}
        title="Tambah Pemegang Saham & Pengurus"
        maxWidth="max-w-4xl"
        headerColor="bg-white text-slate-800 border-b border-slate-200"
      >
        <div className="p-0 flex flex-col h-full bg-slate-50">
          {editingShareholder && (
            <div className="p-6 overflow-y-auto">
              <ShareholderForm 
                shareholder={editingShareholder}
                onChange={updates => setEditingShareholder({ ...editingShareholder, ...updates })}
                globalSharePrice={data.nilaiPerLembar}
                totalSharesAllowed={1000000000} 
                otherAllocated={0} 
                existingData={[]} 
                allShareholders={data.shareholders}
                oldSharesOwned={0} 
                isOld={true} 
                hasTransferAgenda={false} 
                hasManagementAgenda={true} 
                hasCapitalChange={false} 
                hideFinancials={false} 
                hideManagement={false} 
                profiles={profiles}
                disabled={isReadOnly}
              />
            </div>
          )}
          <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3 sticky bottom-0">
             <button 
                onClick={() => setEditingShareholder(null)} 
                className="px-6 py-2 border border-slate-300 text-slate-700 font-bold rounded-sm text-sm hover:bg-slate-50 transition-colors uppercase"
             >
                {isReadOnly ? 'Tutup' : 'Batal'}
             </button>
             {!isReadOnly && (
               <button 
                  onClick={() => {
                    if (editingShareholder) {
                      handleShareholderSave(editingShareholder);
                    }
                  }} 
                  className="px-6 py-2 bg-[#222d32] text-white font-bold rounded-sm shadow-md text-sm hover:bg-black transition-colors uppercase flex items-center gap-2"
               >
                  <Save className="w-4 h-4" /> Simpan Data
               </button>
             )}
          </div>
        </div>
      </Modal>

      {/* KBLI Modal */}
      {isAddKbliModalOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-sm shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="bg-[#0c2444] px-5 py-3 flex justify-between items-center text-white rounded-t-sm">
              <h3 className="text-sm font-bold tracking-wider text-white uppercase">TAMBAH DATA KBLI (PENDIRIAN PT)</h3>
              <button 
                onClick={() => setIsAddKbliModalOpen(false)} 
                className="text-white hover:text-slate-200 text-2xl font-semibold focus:outline-none transition-colors"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="text-center space-y-1">
                <h4 className="text-[18px] font-bold text-slate-800 uppercase tracking-widest leading-none">Maksud dan Tujuan</h4>
                <p className="text-[14px] font-bold text-slate-500 tracking-wide pt-1">(KBLI 2025)</p>
                <div className="border-b border-slate-300 w-full pt-3"></div>
              </div>

              <div className="max-w-md mx-auto">
                <div className="flex items-center border border-slate-300 rounded-md overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-[#0c2444]/30 focus-within:border-[#0c2444] transition-all bg-white">
                  <input
                    type="text"
                    placeholder="Cari Kode atau Kata Kunci KBLI..."
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

              <div className="border border-slate-200 rounded-sm overflow-hidden bg-white">
                <div className="max-h-[350px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-[12px]">
                    <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10 font-extrabold uppercase text-[11px] text-slate-700">
                      <tr>
                        <th className="px-4 py-3 text-center w-12 border-r border-slate-200">
                          <input
                            type="checkbox"
                            checked={kbliPaginatedResults.length > 0 && kbliPaginatedResults.every(r => kbliCheckedKblis.includes(r.code))}
                            onChange={handleToggleAllKbliOnPage}
                          />
                        </th>
                        <th className="px-4 py-3 text-center w-24 border-r border-slate-200">Kode KBLI</th>
                        <th className="px-4 py-3 text-left w-52 border-r border-slate-200">Judul KBLI</th>
                        <th className="px-4 py-3 text-left">Uraian KBLI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {kbliPaginatedResults.map((item) => {
                        const isChecked = kbliCheckedKblis.includes(item.code);
                        const isAlreadySelected = data.kbliItems.some(i => i.code === item.code);
                        return (
                          <tr 
                            key={item.code} 
                            onClick={() => !isAlreadySelected && handleToggleKbliChecked(item.code)}
                            className={`hover:bg-indigo-50/30 transition-colors ${isChecked ? 'bg-indigo-50 underline decoration-indigo-200' : ''} ${isAlreadySelected ? 'opacity-50 cursor-not-allowed italic' : 'cursor-pointer'}`}
                          >
                            <td className="px-4 py-2 text-center border-r border-slate-100" onClick={(e) => e.stopPropagation()}>
                              {!isAlreadySelected ? (
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleKbliChecked(item.code)}
                                />
                              ) : <span className="text-[8px] font-bold text-slate-400">EXIST</span>}
                            </td>
                            <td className="px-4 py-2 text-center border-r border-slate-100 font-mono font-bold text-[#3b5998]">{item.code}</td>
                            <td className="px-4 py-2 border-r border-slate-100 font-bold text-slate-800 uppercase leading-none">{item.name}</td>
                            <td className="px-4 py-2 text-slate-500 leading-tight text-justify line-clamp-2 hover:line-clamp-none">{item.description}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {kbliTotalPages > 1 && (
                <div className="flex justify-center gap-1">
                  {getKbliPageNumbers().map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => setKbliCurrentPage(pageNum)}
                      className={`px-3 py-1 border rounded-sm font-bold text-[11px] ${kbliCurrentPage === pageNum ? 'bg-[#0c2444] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex justify-end gap-3 rounded-b-sm">
              <button onClick={() => setIsAddKbliModalOpen(false)} className="px-4 py-2 bg-white border border-slate-300 rounded-sm text-xs font-bold text-slate-700">BATAL</button>
              <button onClick={handleAddKbliBatch} className="px-4 py-2 bg-[#0c2444] text-white rounded-sm text-xs font-bold uppercase shadow-lg">Tambahkan Terpilih ({kbliCheckedKblis.length})</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
