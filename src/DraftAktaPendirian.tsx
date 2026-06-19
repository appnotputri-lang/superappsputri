import React, { useState, useMemo } from 'react';
import { KbliItem, Shareholder, Address } from '../types';
import { KBLI_DATA } from '../utils/kbliData';
import { Eye, Printer, Users, Building2, Banknote, ChevronDown, ChevronRight, Search, Trash2, Plus, User, MapPin, Briefcase, IdCard, ShieldCheck, ArrowRight, Save } from 'lucide-react';
import { IndoRegionSelector } from '../components/AddressFields';
import { searchShareholderByNIKClient } from './lib/firebase';
import { documentStatusOptions } from '../components/DocumentStatusBadge';

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
  notarisTempat: string;
  notarisNamaSurat: string;
  kbliItems: KbliItem[];
  modalDasar: number;
  nilaiPerLembar: number;
  modalDisetorPersen: number;
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
  isSaving?: boolean;
}

export default function DraftAktaPendirian({ 
  onShowPreview, 
  onExportWord, 
  profiles, 
  initialData, 
  onSave, 
  onCancel,
  isSaving = false 
}: DraftAktaPendirianProps) {
  const [data, setData] = useState<PendirianData>(() => {
    if (initialData) return { ...initialData };
    return {
      namaPt: '',
      kotaKedudukan: '',
      alamatLengkapPT: '',
      kuotaWaktuDireksi: '5',
      tanggal: new Date().toISOString().split('T')[0],
      waktu: '10:00',
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

  const handleShareholderChange = (id: string, updates: Partial<Shareholder>) => {
    setData(prev => ({
      ...prev,
      shareholders: prev.shareholders.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
  };

  const searchShareholderByNIK = async (id: string, nik: string) => {
    if (nik.length !== 16) return;
    try {
       const found = await searchShareholderByNIKClient(nik);
      if (found) {
        handleShareholderChange(id, {
          nik: found.nik || nik,
          name: found.name,
          birthCity: found.birthCity,
          birthDate: found.birthDate,
          occupation: found.occupation,
          address: found.address,
        });
      }
    } catch (e) {
      console.error("Error searching shareholder:", e);
    }
  };

  const addShareholder = () => {
    setData(prev => ({
      ...prev,
      shareholders: [
        ...prev.shareholders,
        {
          id: crypto.randomUUID(),
          salutation: 'Tuan',
          name: '',
          birthCity: '',
          birthDate: '',
          nationality: 'WNI',
          nationalityType: 'WNI',
          address: { ...INITIAL_ADDRESS },
          nik: '',
          sharesOwned: 0,
          occupation: '',
          managementPosition: 'Komisaris',
          isManagement: true,
          shareholderType: 'PERORANGAN',
          isForeign: false
        }
      ]
    }));
  };

  const removeShareholder = (id: string) => {
    setData(prev => ({
      ...prev,
      shareholders: prev.shareholders.filter(p => p.id !== id)
    }));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-20">
      <div className="flex justify-between items-center bg-white p-4 rounded-sm shadow-sm border border-slate-200 sticky top-0 z-10">
        <div>
          <h2 className="text-[16px] font-bold flex items-center gap-2 text-slate-800 uppercase">
            <Building2 className="w-5 h-5 text-[#3b5998]" /> Form Pendirian Perseroan Terbatas
          </h2>
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <button 
              type="button" 
              onClick={onCancel}
              className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-bold rounded shadow hover:bg-slate-200 flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4 rotate-180" /> Kembali
            </button>
          )}

          {onSave && (
            <button 
              type="button" 
              disabled={isSaving}
              onClick={() => onSave(data)}
              className="px-3 py-1.5 bg-[#3b5998] text-white text-sm font-bold rounded shadow hover:bg-[#2d4373] flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {isSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          )}

          <button 
            type="button" 
            onClick={() => onShowPreview(data, 'pendirian')}
            className="px-3 py-1.5 bg-[#f39c12] text-white text-sm font-bold rounded shadow hover:bg-[#e67e22] flex items-center gap-2"
          >
            <Eye className="w-4 h-4" /> Preview
          </button>
          <button 
            type="button" 
            onClick={() => onExportWord(data, 'pendirian')}
            className="px-3 py-1.5 bg-[#00a65a] text-white text-sm font-bold rounded shadow hover:bg-[#008d4c] flex items-center gap-2"
          >
            <Printer className="w-4 h-4" /> Export DOCX
          </button>
        </div>
      </div>

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
                    onChange={(e) => {
                        const profile = profiles.find(p => p.id === e.target.value);
                        if (profile) {
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
                 <AhuInput type="text" value={data.namaPt} onChange={e => updateData('namaPt', e.target.value.toUpperCase())} placeholder="CONTOH: MAJU BERSAMA" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <AhuLabel label="Tempat Kedudukan (Kota/Kab)" required />
              <div className="md:col-span-3">
                <AhuInput type="text" value={data.kotaKedudukan} onChange={e => updateData('kotaKedudukan', e.target.value)} placeholder="JAKARTA SELATAN" />
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

            {/* Modal Perseroan Section - Requested to be after Alamat Lengkap */}
            <div className="bg-slate-50 p-4 border border-slate-200 rounded-sm mt-2">
              <h4 className="flex items-center gap-2 text-[13px] font-bold text-[#3b5998] mb-4 uppercase tracking-tighter shadow-sm pb-1 border-b border-slate-200">
                <Banknote className="w-4 h-4" /> Modal Perseroan
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <AhuLabel label="Modal Dasar (Rp)" />
                  <AhuInput type="number" value={data.modalDasar} onChange={e => updateData('modalDasar', parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <AhuLabel label="Nilai per Saham (Rp)" />
                  <AhuInput type="number" value={data.nilaiPerLembar} onChange={e => updateData('nilaiPerLembar', parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <AhuLabel label="Ditempatkan & Disetor (%)" />
                  <AhuInput type="number" min="0" max="100" value={data.modalDisetorPersen || 25} onChange={e => updateData('modalDisetorPersen', parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div className="mt-3 text-[11px] text-slate-500 font-bold italic">
                * Modal Ditempatkan dan Disetor Minimal 25% dari Modal Dasar.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center pt-2">
              <AhuLabel label="Masa Jabatan Direksi & Komisaris" />
              <div className="md:col-span-3 flex items-center gap-2">
                <AhuInput type="text" className="w-20" value={data.kuotaWaktuDireksi} onChange={e => updateData('kuotaWaktuDireksi', e.target.value)} />
                <span className="text-[13px] font-bold text-slate-500 uppercase">Tahun</span>
              </div>
            </div>
          </div>
        </AhuSection>

        {/* NOTARIS & JADWAL */}
        <AhuSection title="Jadwal Akta & Notaris">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase border-b pb-1">Detail Waktu</h4>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <AhuLabel label="Tanggal Akta" />
                    <AhuInput type="date" value={data.tanggal} onChange={e => updateData('tanggal', e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <AhuLabel label="Waktu (Pukul)" />
                    <AhuInput type="time" value={data.waktu} onChange={e => updateData('waktu', e.target.value)} />
                  </div>
                </div>
             </div>
             <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase border-b pb-1">Detail Lokasi</h4>
                <div>
                  <AhuLabel label="Tempat Kedudukan Notaris" />
                  <AhuInput type="text" value={data.notarisTempat} onChange={e => updateData('notarisTempat', e.target.value)} />
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
          <div className="space-y-6">
             <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <div>
                   <h4 className="text-[13px] font-bold text-slate-700 uppercase flex items-center gap-2">
                     <Users className="w-4 h-4 text-[#3b5998]" /> Daftar Pendiri / Pemegang Saham
                   </h4>
                   <p className="text-[11px] text-slate-500 font-medium mt-1">Data ini akan menjadi dasar kepemilikan modal dan susunan pengurus pada saat pendirian.</p>
                </div>
                <button 
                  type="button" 
                  onClick={addShareholder} 
                  className="px-4 py-2 bg-[#3b5998] hover:bg-[#2d4373] text-white text-[12px] font-bold rounded-sm shadow-md flex items-center gap-1.5 uppercase transition-all"
                >
                  <Plus className="w-4 h-4" /> Tambah Pendiri
                </button>
             </div>

             <div className="space-y-4">
                {data.shareholders.map((p, index) => (
                  <div key={p.id} className="border border-slate-200 rounded-sm bg-white overflow-hidden shadow-sm">
                    {/* Header Row */}
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-[#3b5998] text-white rounded-full flex items-center justify-center text-[11px] font-bold">
                          {index + 1}
                        </div>
                        <span className="text-[12px] font-bold text-slate-700 uppercase">PENDIRI / PENGURUS</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeShareholder(p.id)} 
                        className="text-red-500 hover:text-red-700 p-1 transition-all rounded hover:bg-red-50"
                        title="Hapus Pendiri"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-6 bg-white space-y-6">
                      <div className="flex flex-col lg:flex-row gap-8">
                        {/* Column 1: Identity Info */}
                        <div className="flex-1 space-y-4">
                           <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                             <h5 className="text-[11px] font-extrabold text-[#3b5998] uppercase flex items-center gap-2">
                                <User className="w-4 h-4" /> Data Identitas Pendiri
                             </h5>
                             <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-2 py-1 rounded border border-slate-200">
                              <input 
                                type="checkbox" 
                                checked={!!p.isForeign}
                                onChange={e => handleShareholderChange(p.id, { 
                                  isForeign: e.target.checked,
                                  nationalityType: e.target.checked ? 'WNA' : 'WNI', 
                                  nationality: e.target.checked ? '' : 'WNI' 
                                })}
                                className="rounded border-slate-300 text-teal-500 focus:ring-teal-500"
                              />
                              <span className="text-[10px] text-slate-700 font-bold uppercase">Asing (WNA)</span>
                            </label>
                           </div>

                           <div className="grid grid-cols-1 gap-4 bg-slate-50/30 p-5 rounded-2xl border border-slate-100 shadow-inner">
                             <div>
                               <AhuLabel label="Jenis Pemegang Saham" />
                               <AhuSelect 
                                 value={p.shareholderType || 'PERORANGAN'}
                                 onChange={e => handleShareholderChange(p.id, { shareholderType: e.target.value as any })}
                                 className="rounded-xl border-slate-200 bg-white"
                               >
                                 <option value="PERORANGAN">PERORANGAN (INDIVIDU)</option>
                                 <option value="BADAN_HUKUM">BADAN HUKUM (PT/DLL)</option>
                               </AhuSelect>
                             </div>

                             {p.shareholderType !== 'BADAN_HUKUM' && (
                               <div>
                                  <AhuLabel label={p.isForeign ? "Nomor Passport" : "NIK (KTP)"} />
                                  <AhuInput 
                                    placeholder={p.isForeign ? "NOMOR PASSPORT" : "16 DIGIT NIK"} 
                                    className="rounded-xl border-slate-200 bg-white"
                                    value={p.isForeign ? (p.passportNumber || '') : (p.nik || '')} 
                                    onChange={e => {
                                      const nik = e.target.value;
                                      handleShareholderChange(p.id, p.isForeign ? { passportNumber: nik } : { nik: nik });
                                      if (!p.isForeign && nik.length === 16) {
                                        searchShareholderByNIK(p.id, nik);
                                      }
                                    }}
                                  />
                               </div>
                             )}

                             <div>
                               <AhuLabel label="Nama Lengkap" />
                               <div className="flex gap-2">
                                  {p.shareholderType !== 'BADAN_HUKUM' && (
                                    <AhuSelect 
                                      className="w-24 rounded-xl border-slate-200 bg-white" 
                                      value={p.salutation} 
                                      onChange={e => handleShareholderChange(p.id, { salutation: e.target.value as any })}
                                    >
                                      <option value="Tuan">Tuan</option>
                                      <option value="Nyonya">Nyonya</option>
                                      <option value="Nona">Nona</option>
                                    </AhuSelect>
                                  )}
                                  <AhuInput 
                                    placeholder={p.shareholderType === 'BADAN_HUKUM' ? "NAMA BADAN HUKUM / PT" : "NAMA SESUAI KTP"} 
                                    className="rounded-xl border-slate-200 font-bold text-slate-800"
                                    value={p.name} 
                                    onChange={e => handleShareholderChange(p.id, { name: e.target.value.toUpperCase() })} 
                                  />
                               </div>
                             </div>

                             {p.shareholderType === 'BADAN_HUKUM' ? (
                               <div className="space-y-4 animate-in fade-in slide-in-from-top-1">
                                 <div>
                                   <AhuLabel label="NPWP Badan Hukum" />
                                   <AhuInput 
                                      placeholder="00.000.000.0-000.000"
                                      value={p.npwp || ''}
                                      onChange={e => handleShareholderChange(p.id, { npwp: e.target.value })}
                                      className="rounded-xl border-slate-200 bg-white"
                                   />
                                 </div>
                                 <div className="grid grid-cols-2 gap-3 group">
                                   <div>
                                      <AhuLabel label="No. Akta Pendirian" />
                                      <AhuInput 
                                        placeholder="Nomor Akta"
                                        value={p.establishmentDeedNumber || ''}
                                        onChange={e => handleShareholderChange(p.id, { establishmentDeedNumber: e.target.value })}
                                        className="rounded-xl border-slate-200 bg-white"
                                      />
                                   </div>
                                   <div>
                                      <AhuLabel label="Tgl Akta Pendirian" />
                                      <AhuInput 
                                        type="date"
                                        value={p.establishmentDeedDate || ''}
                                        onChange={e => handleShareholderChange(p.id, { establishmentDeedDate: e.target.value })}
                                        className="rounded-xl border-slate-200 bg-white"
                                      />
                                   </div>
                                 </div>
                               </div>
                             ) : (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-1">
                                  <div className="grid grid-cols-1 gap-4">
                                    <div>
                                      <AhuLabel label={p.isForeign ? "Nomor Passport" : "NIK (KTP)"} />
                                      <AhuInput 
                                        placeholder={p.isForeign ? "NOMOR PASSPORT" : "16 DIGIT NIK"}
                                        className="rounded-xl border-slate-200 bg-white"
                                        value={p.isForeign ? (p.passportNumber || "") : (p.nik || "")}
                                        onChange={e => {
                                          const nik = e.target.value;
                                          handleShareholderChange(p.id, p.isForeign ? { passportNumber: nik } : { nik: nik });
                                          if (!p.isForeign && nik.length === 16) {
                                            searchShareholderByNIK(p.id, nik);
                                          }
                                        }}
                                      />
                                    </div>
                                   <div>
                                      <AhuLabel label="Pekerjaan" />
                                      <AhuInput 
                                        placeholder="CONTOH: KARYAWAN" 
                                        className="rounded-xl border-slate-200 bg-white"
                                        value={p.occupation || ''} 
                                        onChange={e => handleShareholderChange(p.id, { occupation: e.target.value })} 
                                      />
                                   </div>
                                 </div>

                                 <div>
                                    <AhuLabel label="Tempat & Tanggal Lahir" />
                                    <div className="flex gap-2">
                                       <AhuInput 
                                         placeholder="KOTA" 
                                         className="rounded-xl border-slate-200 bg-white flex-[2]"
                                         value={p.birthCity || ''} 
                                         onChange={e => handleShareholderChange(p.id, { birthCity: e.target.value })} 
                                       />
                                       <AhuInput 
                                         type="date" 
                                         className="rounded-xl border-slate-200 bg-white flex-[3]"
                                         value={p.birthDate || ''} 
                                         onChange={e => handleShareholderChange(p.id, { birthDate: e.target.value })} 
                                       />
                                    </div>
                                 </div>
                               </div>
                             )}
                           </div>
                        </div>

                        {/* Column 2: Address & Financials */}
                        <div className="flex-1 space-y-4">
                           <h5 className="text-[11px] font-extrabold text-[#3b5998] uppercase flex items-center gap-2 border-b border-slate-100 pb-2">
                              <MapPin className="w-4 h-4" /> Domisili & Saham Pendiri
                           </h5>
                           
                           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                              <IndoRegionSelector 
                                accentColor="teal"
                                address={p.address}
                                onUpdate={updates => handleShareholderChange(p.id, { address: { ...p.address, ...updates } })}
                              />
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-teal-50/50 p-5 rounded-2xl border border-teal-100 flex flex-col justify-between">
                                 <div>
                                   <label className="text-[10px] font-extrabold text-teal-800 uppercase flex items-center gap-1.5 mb-2 tracking-tight">
                                     <Banknote className="w-3.5 h-3.5" /> lembar Saham
                                   </label>
                                   <AhuInput 
                                     type="number" 
                                     className="rounded-xl border-teal-200 font-black text-lg text-teal-900 bg-white"
                                     value={p.sharesOwned || 0} 
                                     onChange={e => handleShareholderChange(p.id, { sharesOwned: parseInt(e.target.value) || 0 })} 
                                   />
                                 </div>
                                 <div className="mt-2 text-[11px] font-bold text-teal-700 bg-white/60 px-3 py-1 rounded-full border border-teal-100/50 inline-block w-fit">
                                    Rp. {((p.sharesOwned || 0) * data.nilaiPerLembar).toLocaleString('id-ID')}
                                 </div>
                              </div>

                              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
                                 <div className="flex justify-between items-center mb-2">
                                    <label className="text-[10px] font-extrabold text-slate-700 uppercase flex items-center gap-1.5 tracking-tight">
                                      <Briefcase className="w-3.5 h-3.5" /> Jabatan
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2 py-0.5 rounded border border-slate-100 shadow-xs">
                                      <input 
                                        type="checkbox" 
                                        checked={p.isManagement}
                                        onChange={e => handleShareholderChange(p.id, { isManagement: e.target.checked })}
                                        className="rounded-sm border-slate-300 text-[#3b5998] focus:ring-[#3b5998] w-3 h-3" 
                                      />
                                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Pengurus</span>
                                    </label>
                                 </div>
                                 <AhuSelect 
                                   disabled={!p.isManagement}
                                   className="rounded-xl border-slate-200 disabled:opacity-40 disabled:bg-slate-100/50 bg-white font-bold text-slate-700"
                                   value={p.managementPosition} 
                                   onChange={e => handleShareholderChange(p.id, { managementPosition: e.target.value })} 
                                 >
                                   <option value="Direktur Utama">Direktur Utama</option>
                                   <option value="Direktur">Direktur</option>
                                   <option value="Komisaris Utama">Komisaris Utama</option>
                                   <option value="Komisaris">Komisaris</option>
                                 </AhuSelect>
                              </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </AhuSection>
      </div>

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
