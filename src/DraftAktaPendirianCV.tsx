import React, { useState, useMemo, useEffect } from 'react';
import { CVProfile, Pesero, KbliItem, Address } from '../types';
import { KBLI_DATA } from '../utils/kbliData';
import { 
  Eye, Users, Building2, Banknote, ChevronDown, ChevronRight, Search, 
  Trash2, Plus, User, MapPin, Briefcase, IdCard, ShieldCheck, Save, Edit, 
  FileText, RefreshCw, Loader2, AlertCircle, CheckCircle2, Download 
} from 'lucide-react';
import { searchShareholderByNIKClient } from './lib/firebase';
import { formatInputNumber, parseFormattedNumber, formatCurrency } from '../utils/formatters';
import { mapCompanyProfileToCV } from './domain/company/mappers/companyProfileToCV';
import { CompanyService } from './services/CompanyService';
import { useProjectSession } from './domain/project/useProjectSession';
import { SearchableClientSelect } from './components/common/SearchableClientSelect';

const AhuSection = ({ title, children, isOpen = true }: { title: string; children: React.ReactNode; isOpen?: boolean }) => {
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

const AhuLabel = ({ label, required = false }: { label: string; required?: boolean }) => (
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

export function validateCVProfile(data: CVProfile): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.namaCV || !data.namaCV.trim()) {
    errors.push('Nama CV belum diisi.');
  }

  if (!data.kotaKedudukan || !data.kotaKedudukan.trim()) {
    errors.push('Kota/Kabupaten kedudukan CV belum diisi.');
  }

  if (!data.modalTotal || data.modalTotal <= 0) {
    errors.push('Modal Total CV harus lebih besar dari Rp 0.');
  }

  const peseros = data.peseros || [];
  if (peseros.length < 2) {
    errors.push('Jumlah Pesero minimal 2 orang (1 Pengurus/Komplementer dan 1 Komanditer).');
  }

  const pengurusList = peseros.filter(p => p.role === 'PENGURUS');
  const komanditerList = peseros.filter(p => p.role === 'KOMANDITER');

  if (pengurusList.length < 1) {
    errors.push('Minimal harus terdapat 1 Pesero Pengurus (Komplementer/Direktur).');
  }

  if (komanditerList.length < 1) {
    errors.push('Minimal harus terdapat 1 Pesero Komanditer (Pesero Pasif).');
  }

  peseros.forEach((p, idx) => {
    if (!p.name || !p.name.trim()) {
      errors.push(`Pesero #${idx + 1} belum mengisi Nama Lengkap.`);
    }
  });

  if (!data.kbliItems || data.kbliItems.length < 1) {
    errors.push('Minimal harus memilih 1 KBLI.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export interface DraftAktaPendirianCVProps {
  onShowPreview: (data: CVProfile) => void;
  onExportWord: (data: CVProfile) => void;
  profiles: any[];
  initialData?: CVProfile | null;
  activeProjectContext?: string | null;
  projectName?: string | null;
  onSave?: (data: CVProfile) => void;
  onCancel?: () => void;
  onDelete?: (id: string) => void;
  isSaving?: boolean;
  isSyncing?: boolean;
  onSync?: (data: CVProfile) => void;
  onChange?: (data: CVProfile) => void;
  autoSaveIndicator?: React.ReactNode;
}

export default function DraftAktaPendirianCV({
  onShowPreview,
  onExportWord,
  profiles,
  initialData,
  projectName,
  onSave,
  onCancel,
  onDelete,
  isSaving = false,
  isSyncing = false,
  onSync,
  onChange,
  autoSaveIndicator
}: DraftAktaPendirianCVProps) {
  const { activeProjectContext } = useProjectSession();

  const DEFAULT_CV_DATA: CVProfile = {
    namaCV: '',
    kotaKedudukan: '',
    alamatLengkapCV: '',
    modalTotal: 100000000,
    peseros: [
      {
        id: 'pesero-1',
        salutation: 'Tuan',
        name: '',
        nik: '',
        role: 'PENGURUS',
        modalContribution: 50000000,
        birthCity: '',
        birthDate: '',
        nationality: 'WNI',
        nationalityType: 'WNI',
        occupation: '',
        address: ''
      },
      {
        id: 'pesero-2',
        salutation: 'Nyonya',
        name: '',
        nik: '',
        role: 'KOMANDITER',
        modalContribution: 50000000,
        birthCity: '',
        birthDate: '',
        nationality: 'WNI',
        nationalityType: 'WNI',
        occupation: '',
        address: ''
      }
    ],
    nomorAkta: '02',
    tanggal: new Date().toISOString().split('T')[0],
    waktu: '10:30 WIB',
    notarisTempat: 'Kabupaten Bandung Barat',
    notaryName: 'R.A. NUKANTINI PUTRI PARINCHA, SH., M.Kn.',
    notaryTitle: 'Notaris di Kabupaten Bandung Barat',
    notaryDomicile: 'Kabupaten Bandung Barat',
    duration: 'tidak terbatas',
    kbliItems: [],
    mainActivityDescription: '',
    TutupBukuTanggal: '31 Desember',
    saksi1Nama: 'Nendi Suhendi',
    saksi1Lahir: 'Bandung, 15 Juli 1991',
    saksi1Alamat: 'Jalan Sukaresmi Nomor 12, Rukun Tetangga 005, Rukun Warga 005, Kecamatan Lembang, Desa Mekarwangi',
    saksi1NIK: '3217011507910016',
    saksi2Nama: 'Siti Nur Azizah',
    saksi2Lahir: 'Bandung, 17 Desember 1999',
    saksi2Alamat: 'Jalan Lembah Pakar Timur II Kampung Sekebuluh, Rukun Tetangga 001, Rukun Warga 004, Kecamatan Cimenyan, Desa Ciburial',
    saksi2NIK: '3204065712990001',
    documentStatus: 'DRAFTING'
  };

  const [data, setData] = useState<CVProfile>(() => {
    if (initialData) {
      return mapCompanyProfileToCV(initialData);
    }
    return DEFAULT_CV_DATA;
  });

  const [kbliSearchQuery, setKbliSearchQuery] = useState('');
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  const [editingPeseroId, setEditingPeseroId] = useState<string | null>(null);

  // Sync state changes upward if onChange provided
  useEffect(() => {
    if (onChange) {
      onChange(data);
    }
  }, [data]);

  const validation = useMemo(() => validateCVProfile(data), [data]);

  const pengurusCount = useMemo(() => (data.peseros || []).filter(p => p.role === 'PENGURUS').length, [data.peseros]);
  const komanditerCount = useMemo(() => (data.peseros || []).filter(p => p.role === 'KOMANDITER').length, [data.peseros]);
  const totalModalPesero = useMemo(() => (data.peseros || []).reduce((acc, p) => acc + (p.modalContribution || 0), 0), [data.peseros]);

  // KBLI Search
  const filteredKbliData = useMemo(() => {
    if (!kbliSearchQuery.trim()) return [];
    const q = kbliSearchQuery.toLowerCase();
    return KBLI_DATA.filter(k => 
      k.code.includes(q) || k.name.toLowerCase().includes(q) || (k.description && k.description.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [kbliSearchQuery]);

  const handleAddKbli = (item: KbliItem) => {
    if (data.kbliItems.some(k => k.code === item.code)) {
      alert('KBLI ini sudah ada dalam daftar.');
      return;
    }
    setData(prev => ({
      ...prev,
      kbliItems: [...prev.kbliItems, item]
    }));
    setKbliSearchQuery('');
  };

  const handleRemoveKbli = (code: string) => {
    setData(prev => ({
      ...prev,
      kbliItems: prev.kbliItems.filter(k => k.code !== code)
    }));
  };

  // Pesero Handlers
  const handleAddPesero = () => {
    const newPesero: Pesero = {
      id: crypto.randomUUID(),
      salutation: 'Tuan',
      name: '',
      nik: '',
      role: (data.peseros || []).filter(p => p.role === 'KOMANDITER').length === 0 ? 'KOMANDITER' : 'PENGURUS',
      modalContribution: 0,
      birthCity: '',
      birthDate: '',
      nationality: 'WNI',
      nationalityType: 'WNI',
      occupation: '',
      address: ''
    };
    setData(prev => ({
      ...prev,
      peseros: [...(prev.peseros || []), newPesero]
    }));
    setEditingPeseroId(newPesero.id || null);
  };

  const handleUpdatePesero = (id: string, updates: Partial<Pesero>) => {
    setData(prev => ({
      ...prev,
      peseros: (prev.peseros || []).map(p => p.id === id ? { ...p, ...updates } : p)
    }));
  };

  const handleRemovePesero = (id: string) => {
    if ((data.peseros || []).length <= 2) {
      alert('CV wajib memiliki minimal 2 Pesero.');
      return;
    }
    setData(prev => ({
      ...prev,
      peseros: (prev.peseros || []).filter(p => p.id !== id)
    }));
    if (editingPeseroId === id) setEditingPeseroId(null);
  };

  const handleSearchNik = async (peseroId: string, nik: string) => {
    if (!nik || nik.trim().length !== 16) return;
    try {
      const found = await searchShareholderByNIKClient(nik.trim());
      if (found) {
        let addrStr = '';
        if (typeof found.address === 'string') {
          addrStr = found.address;
        } else if (found.address && typeof found.address === 'object') {
          const a = found.address;
          addrStr = `${a.fullAddress || ''} RT ${a.rt || '000'} RW ${a.rw || '000'}, Kel. ${a.kelurahan || ''}, Kec. ${a.kecamatan || ''}, ${a.city || ''}, ${a.province || ''}`;
        }
        handleUpdatePesero(peseroId, {
          name: (found.name || '').toUpperCase(),
          salutation: found.salutation || 'Tuan',
          birthCity: found.birthCity || '',
          birthDate: found.birthDate || '',
          nationality: found.nationality || 'WNI',
          nationalityType: found.nationalityType || 'WNI',
          occupation: found.occupation || '',
          address: addrStr
        });
        alert('✅ Data Pesero berhasil ditemukan dari database!');
      } else {
        alert('Data NIK tidak ditemukan di database.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit / Export Actions with Validation Guard
  const handleSaveData = () => {
    if (!validation.isValid) {
      setShowValidationAlert(true);
      alert(`Gagal menyimpan. Terdapat ${validation.errors.length} kesalahan validasi.`);
      return;
    }
    setShowValidationAlert(false);
    if (onSave) onSave(data);
  };

  const handleExportWordAction = () => {
    if (!validation.isValid) {
      setShowValidationAlert(true);
      alert(`Gagal membuat dokumen Word. Terdapat ${validation.errors.length} kesalahan validasi.`);
      return;
    }
    setShowValidationAlert(false);
    if (onExportWord) onExportWord(data);
  };

  const handleSyncAction = () => {
    if (!validation.isValid) {
      setShowValidationAlert(true);
      alert(`Gagal sinkronisasi. Terdapat ${validation.errors.length} kesalahan validasi.`);
      return;
    }
    setShowValidationAlert(false);
    if (onSync) onSync(data);
  };

  return (
    <div className="bg-[#e9eef2] min-h-[100dvh] p-4 sm:p-6 font-sans">
      <div className="w-[94%] xl:w-[92%] max-w-none mx-auto space-y-4">

        {/* Top Header & Actions Bar */}
        <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-teal-600 text-white text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase">
                DRAFT AKTA CV
              </span>
              {projectName && (
                <span className="bg-slate-100 text-slate-700 text-[11px] font-semibold px-2.5 py-0.5 rounded border border-slate-200">
                  Proyek: {projectName}
                </span>
              )}
            </div>
            <h1 className="text-lg font-bold text-slate-800 mt-1 uppercase tracking-tight">
              DRAFT AKTA PENDIRIAN CV {data.namaCV ? `- CV. ${data.namaCV.toUpperCase()}` : ''}
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {autoSaveIndicator}

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12px] font-bold rounded-sm border border-slate-300 transition-colors"
              >
                Batal
              </button>
            )}

            {onDelete && data.id && (
              <button
                type="button"
                onClick={() => onDelete(data.id as string)}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-[12px] font-bold rounded-sm border border-red-200 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus
              </button>
            )}

            {onSync && (
              <button
                type="button"
                onClick={handleSyncAction}
                disabled={isSyncing}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[12px] font-bold rounded-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Sync Ke Laporan
              </button>
            )}

            <button
              type="button"
              onClick={() => onShowPreview(data)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold rounded-sm transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview Akta
            </button>

            <button
              type="button"
              onClick={handleExportWordAction}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold rounded-sm transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Export Word (.docx)
            </button>

            {onSave && (
              <button
                type="button"
                onClick={handleSaveData}
                disabled={isSaving}
                className="px-4 py-1.5 bg-[#3b5998] hover:bg-[#2d4373] text-white text-[12px] font-bold rounded-sm transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Simpan Data
              </button>
            )}
          </div>
        </div>

        {/* Validation Status Banner */}
        {(!validation.isValid || showValidationAlert) && (
          <div className="bg-amber-50 border border-amber-300 rounded-sm p-4 text-slate-800 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-amber-900 text-[13px] mb-1">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>PERHATIAN: Syarat Validasi Akta CV Belum Terpenuhi ({validation.errors.length} Catatan)</span>
            </div>
            <ul className="list-disc pl-5 text-[12px] text-amber-800 space-y-0.5">
              {validation.errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 1. INFORMASI AKTA */}
        <AhuSection title="1. Informasi Akta Notaris">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <AhuLabel label="Nomor Akta" required />
              <AhuInput 
                value={data.nomorAkta || ''} 
                onChange={e => setData(p => ({ ...p, nomorAkta: e.target.value }))}
                placeholder="misal: 02"
              />
            </div>
            <div>
              <AhuLabel label="Tanggal Akta" required />
              <AhuInput 
                type="date"
                value={data.tanggal || ''} 
                onChange={e => setData(p => ({ ...p, tanggal: e.target.value }))}
              />
            </div>
            <div>
              <AhuLabel label="Waktu / Jam Penandatanganan" />
              <AhuInput 
                value={data.waktu || ''} 
                onChange={e => setData(p => ({ ...p, waktu: e.target.value }))}
                placeholder="misal: 10:30 WIB"
              />
            </div>
            <div>
              <AhuLabel label="Kedudukan Notaris" />
              <AhuInput 
                value={data.notarisTempat || ''} 
                onChange={e => setData(p => ({ ...p, notarisTempat: e.target.value, notaryDomicile: e.target.value }))}
                placeholder="misal: Kabupaten Bandung Barat"
              />
            </div>
            <div>
              <AhuLabel label="Nama Notaris di Surat" />
              <AhuInput 
                value={data.notaryName || ''} 
                onChange={e => setData(p => ({ ...p, notaryName: e.target.value }))}
                placeholder="misal: R.A. NUKANTINI PUTRI PARINCHA, SH., M.Kn."
              />
            </div>
            <div>
              <AhuLabel label="Gelar / Jabatan Notaris" />
              <AhuInput 
                value={data.notaryTitle || ''} 
                onChange={e => setData(p => ({ ...p, notaryTitle: e.target.value }))}
                placeholder="Notaris di Kabupaten Bandung Barat"
              />
            </div>
          </div>

          {!activeProjectContext && profiles && profiles.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-200">
              <AhuLabel label="Pilih Profil Perusahaan (Client Profile)" />
              <SearchableClientSelect
                options={profiles}
                value={data.selectedProfileId || ''}
                onChange={async (profId) => {
                  if (profId) {
                    const fullProfile = await CompanyService.getCompanyProfile(profId);
                    if (fullProfile) {
                      const mapped = mapCompanyProfileToCV(fullProfile, data);
                      setData(mapped);
                    } else {
                      setData(p => ({ ...p, selectedProfileId: profId }));
                    }
                  } else {
                    setData(p => ({ ...p, selectedProfileId: '' }));
                  }
                }}
              />
            </div>
          )}
        </AhuSection>

        {/* 2. DATA PERUSAHAAN / CV */}
        <AhuSection title="2. Data Perseroan Komanditer (CV)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <AhuLabel label="Nama CV (Tanpa prefix 'CV.')" required />
              <AhuInput 
                value={data.namaCV || ''} 
                onChange={e => setData(p => ({ ...p, namaCV: e.target.value.toUpperCase() }))}
                placeholder="misal: DWIJAYA TRIBAROKAH"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block font-mono">
                Output di Akta: "CV. {(data.namaCV || '').toUpperCase()}"
              </span>
            </div>

            <div>
              <AhuLabel label="Kota / Kabupaten Kedudukan CV" required />
              <AhuInput 
                value={data.kotaKedudukan || ''} 
                onChange={e => setData(p => ({ ...p, kotaKedudukan: e.target.value }))}
                placeholder="misal: Kabupaten Bandung Barat"
              />
            </div>

            <div className="md:col-span-2">
              <AhuLabel label="Alamat Lengkap Kantor CV" />
              <AhuInput 
                value={data.alamatLengkapCV || ''} 
                onChange={e => setData(p => ({ ...p, alamatLengkapCV: e.target.value }))}
                placeholder="misal: Jalan Raya Batujajar Nomor 12, RT 001/RW 002, Desa Batujajar Barat, Kecamatan Batujajar"
              />
            </div>

            <div>
              <AhuLabel label="Jangka Waktu Berdiri CV" />
              <AhuInput 
                value={data.duration || 'tidak terbatas'} 
                onChange={e => setData(p => ({ ...p, duration: e.target.value }))}
                placeholder="misal: tidak terbatas"
              />
            </div>

            <div>
              <AhuLabel label="Tanggal Tutup Buku" />
              <AhuInput 
                value={data.TutupBukuTanggal || '31 Desember'} 
                onChange={e => setData(p => ({ ...p, TutupBukuTanggal: e.target.value }))}
                placeholder="misal: 31 Desember"
              />
            </div>

            <div className="md:col-span-2">
              <AhuLabel label="Deskripsi Ringkas Kegiatan Utama (Opsional)" />
              <textarea 
                rows={2}
                value={data.mainActivityDescription || ''} 
                onChange={e => setData(p => ({ ...p, mainActivityDescription: e.target.value }))}
                className="w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none focus:border-[#66afe9] bg-white text-slate-800"
                placeholder="misal: Perdagangan besar dan jasa konsultasi manajemen"
              />
            </div>
          </div>
        </AhuSection>

        {/* 3. MAKSUD DAN TUJUAN (KBLI) */}
        <AhuSection title="3. Maksud dan Tujuan (KBLI)">
          <div className="space-y-4">
            <div>
              <AhuLabel label="Cari KBLI untuk Ditambahkan" required />
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  type="text"
                  value={kbliSearchQuery}
                  onChange={e => setKbliSearchQuery(e.target.value)}
                  placeholder="Ketik kode KBLI (e.g., 46100) atau nama kegiatan usaha..."
                  className="w-full pl-9 pr-3 py-1.5 border border-[#ccc] rounded-sm text-[13px] outline-none focus:border-[#66afe9] bg-white"
                />
              </div>

              {filteredKbliData.length > 0 && (
                <div className="mt-1 border border-slate-300 rounded-sm bg-white max-h-48 overflow-y-auto shadow-md">
                  {filteredKbliData.map(item => (
                    <div 
                      key={item.code}
                      onClick={() => handleAddKbli(item)}
                      className="px-3 py-2 border-b border-slate-100 hover:bg-blue-50 cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold font-mono text-blue-700 text-xs mr-2">[{item.code}]</span>
                        <span className="text-[12px] font-semibold text-slate-800">{item.name}</span>
                      </div>
                      <Plus className="w-4 h-4 text-blue-600 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* List Selected KBLIs */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[12px] font-bold text-slate-700 uppercase">
                  Daftar KBLI Terpilih ({data.kbliItems.length})
                </span>
                {data.kbliItems.length < 1 && (
                  <span className="text-[11px] text-red-500 font-bold">* Minimal 1 KBLI</span>
                )}
              </div>

              {data.kbliItems.length === 0 ? (
                <div className="p-4 border border-dashed border-slate-300 rounded-sm text-center text-[12px] text-slate-400">
                  Belum ada KBLI terpilih. Gunakan kolom pencarian di atas untuk menambahkan KBLI.
                </div>
              ) : (
                <div className="space-y-2">
                  {data.kbliItems.map((k, idx) => (
                    <div key={k.code || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-sm flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-mono font-bold text-[11px] rounded">
                            {k.code}
                          </span>
                          <span className="font-bold text-[13px] text-slate-800">{k.name}</span>
                        </div>
                        {k.description && (
                          <p className="text-[12px] text-slate-600 mt-1 line-clamp-2">{k.description}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveKbli(k.code)}
                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </AhuSection>

        {/* 4. MODAL PERSEROAN */}
        <AhuSection title="4. Modal Total Perseroan">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <AhuLabel label="Total Modal Perseroan (Rp)" required />
              <AhuInput 
                value={formatInputNumber(data.modalTotal || 0)}
                onChange={e => {
                  const val = parseFormattedNumber(e.target.value);
                  setData(p => ({ ...p, modalTotal: val }));
                }}
                placeholder="100.000.000"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {formatCurrency(data.modalTotal || 0)}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-sm text-[12px] text-slate-700 space-y-1">
              <div className="font-bold text-slate-800 border-b border-slate-200 pb-1 flex justify-between">
                <span>Rangkuman Modal Pesero:</span>
                <span className={totalModalPesero === data.modalTotal ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>
                  {totalModalPesero === data.modalTotal ? "✅ Sesuai" : "⚠️ Selisih"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Modal CV:</span>
                <span className="font-bold">{formatCurrency(data.modalTotal || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Setoran Seluruh Pesero:</span>
                <span className="font-bold">{formatCurrency(totalModalPesero)}</span>
              </div>
            </div>
          </div>
        </AhuSection>

        {/* 5. DATA PESERO (SEKUTU PERSEROAN) */}
        <AhuSection title="5. Data Pesero (Sekutu / Persero)">
          <div className="space-y-4">
            {/* Pesero Stats Header */}
            <div className="flex flex-wrap items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-sm gap-2">
              <div className="flex items-center gap-3 text-[12px]">
                <span className="font-bold text-slate-800">Status Pesero:</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${pengurusCount >= 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  Pengurus: {pengurusCount} (Min 1)
                </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${komanditerCount >= 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  Komanditer: {komanditerCount} (Min 1)
                </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${(data.peseros || []).length >= 2 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                  Total Pesero: {(data.peseros || []).length} (Min 2)
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddPesero}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[12px] rounded-sm flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Pesero Baru
              </button>
            </div>

            {/* List of Pesero Cards */}
            <div className="space-y-3">
              {(data.peseros || []).map((pesero, idx) => {
                const isExpanded = editingPeseroId === pesero.id;

                return (
                  <div key={pesero.id || idx} className="border border-slate-300 rounded-sm bg-white overflow-hidden shadow-xs">
                    <div 
                      onClick={() => setEditingPeseroId(isExpanded ? null : (pesero.id || null))}
                      className="bg-slate-100 px-4 py-2.5 flex items-center justify-between cursor-pointer border-b border-slate-200 hover:bg-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-white font-bold text-[11px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-[13px] text-slate-800 uppercase mr-2">
                            {pesero.salutation} {pesero.name || 'NAMA PESERO'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pesero.role === 'PENGURUS' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                            {pesero.role === 'PENGURUS' ? 'PENGURUS (Komplementer / Direktur)' : 'KOMANDITER (Pesero Pasif)'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[12px] font-semibold text-slate-600">
                          Setoran: {formatCurrency(pesero.modalContribution || 0)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePesero(pesero.id || '');
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 bg-white grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200">
                        <div>
                          <AhuLabel label="Sebutan" />
                          <AhuSelect
                            value={pesero.salutation || 'Tuan'}
                            onChange={e => handleUpdatePesero(pesero.id || '', { salutation: e.target.value as any })}
                          >
                            <option value="Tuan">Tuan</option>
                            <option value="Nyonya">Nyonya</option>
                            <option value="Nona">Nona</option>
                          </AhuSelect>
                        </div>

                        <div>
                          <AhuLabel label="Nama Lengkap (Sesuai KTP)" required />
                          <AhuInput 
                            value={pesero.name || ''}
                            onChange={e => handleUpdatePesero(pesero.id || '', { name: e.target.value.toUpperCase() })}
                            placeholder="NAMA LENGKAP"
                          />
                        </div>

                        <div>
                          <AhuLabel label="Peran Pesero di CV" required />
                          <AhuSelect
                            value={pesero.role}
                            onChange={e => handleUpdatePesero(pesero.id || '', { role: e.target.value as 'PENGURUS' | 'KOMANDITER' })}
                          >
                            <option value="PENGURUS">PENGURUS (Sekutu Komplementer / Direktur)</option>
                            <option value="KOMANDITER">KOMANDITER (Sekutu Pasif / Investor)</option>
                          </AhuSelect>
                        </div>

                        <div>
                          <AhuLabel label="Nilai Setoran Modal (Rp)" required />
                          <AhuInput 
                            value={formatInputNumber(pesero.modalContribution || 0)}
                            onChange={e => handleUpdatePesero(pesero.id || '', { modalContribution: parseFormattedNumber(e.target.value) })}
                            placeholder="50.000.000"
                          />
                        </div>

                        <div>
                          <AhuLabel label="NIK (16 Digit)" />
                          <div className="flex gap-1.5">
                            <AhuInput 
                              value={pesero.nik || ''}
                              onChange={e => handleUpdatePesero(pesero.id || '', { nik: e.target.value })}
                              placeholder="3217..."
                              maxLength={16}
                            />
                            <button
                              type="button"
                              onClick={() => handleSearchNik(pesero.id || '', pesero.nik)}
                              className="px-2.5 py-1 bg-slate-800 text-white rounded-sm text-xs font-bold shrink-0 hover:bg-slate-700"
                              title="Cari NIK di Database Client"
                            >
                              <Search className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <AhuLabel label="Pekerjaan" />
                          <AhuInput 
                            value={pesero.occupation || ''}
                            onChange={e => handleUpdatePesero(pesero.id || '', { occupation: e.target.value })}
                            placeholder="misal: Swasta / Wiraswasta"
                          />
                        </div>

                        <div>
                          <AhuLabel label="Tempat Lahir" />
                          <AhuInput 
                            value={pesero.birthCity || ''}
                            onChange={e => handleUpdatePesero(pesero.id || '', { birthCity: e.target.value })}
                            placeholder="misal: Bandung"
                          />
                        </div>

                        <div>
                          <AhuLabel label="Tanggal Lahir" />
                          <AhuInput 
                            type="date"
                            value={pesero.birthDate || ''}
                            onChange={e => handleUpdatePesero(pesero.id || '', { birthDate: e.target.value })}
                          />
                        </div>

                        <div>
                          <AhuLabel label="Kewarganegaraan" />
                          <AhuSelect
                            value={pesero.nationality || 'WNI'}
                            onChange={e => handleUpdatePesero(pesero.id || '', { nationality: e.target.value })}
                          >
                            <option value="WNI">WNI</option>
                            <option value="WNA">WNA</option>
                          </AhuSelect>
                        </div>

                        <div className="md:col-span-3">
                          <AhuLabel label="Alamat Lengkap Pesero" />
                          <textarea 
                            rows={2}
                            value={typeof pesero.address === 'string' ? pesero.address : (pesero.address?.fullAddress || '')}
                            onChange={e => handleUpdatePesero(pesero.id || '', { address: e.target.value })}
                            className="w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none focus:border-[#66afe9] bg-white text-slate-800"
                            placeholder="Jalan Sukaresmi Nomor 12, RT 005/RW 005, Kel. Mekarwangi, Kec. Lembang, Kab. Bandung Barat"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </AhuSection>

        {/* 6. DATA SAKSI */}
        <AhuSection title="6. Data Saksi Notaris">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Saksi 1 */}
            <div className="space-y-3 bg-slate-50 p-4 border border-slate-200 rounded-sm">
              <h4 className="font-bold text-[13px] text-slate-800 uppercase border-b border-slate-200 pb-1">Saksi I</h4>
              <div>
                <AhuLabel label="Nama Lengkap Saksi 1" />
                <AhuInput 
                  value={data.saksi1Nama || ''}
                  onChange={e => setData(p => ({ ...p, saksi1Nama: e.target.value }))}
                />
              </div>
              <div>
                <AhuLabel label="Tempat & Tanggal Lahir" />
                <AhuInput 
                  value={data.saksi1Lahir || ''}
                  onChange={e => setData(p => ({ ...p, saksi1Lahir: e.target.value }))}
                  placeholder="Bandung, 15 Juli 1991"
                />
              </div>
              <div>
                <AhuLabel label="NIK Saksi 1" />
                <AhuInput 
                  value={data.saksi1NIK || ''}
                  onChange={e => setData(p => ({ ...p, saksi1NIK: e.target.value }))}
                />
              </div>
              <div>
                <AhuLabel label="Alamat Saksi 1" />
                <textarea 
                  rows={2}
                  value={data.saksi1Alamat || ''}
                  onChange={e => setData(p => ({ ...p, saksi1Alamat: e.target.value }))}
                  className="w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none focus:border-[#66afe9] bg-white text-slate-800"
                />
              </div>
            </div>

            {/* Saksi 2 */}
            <div className="space-y-3 bg-slate-50 p-4 border border-slate-200 rounded-sm">
              <h4 className="font-bold text-[13px] text-slate-800 uppercase border-b border-slate-200 pb-1">Saksi II</h4>
              <div>
                <AhuLabel label="Nama Lengkap Saksi 2" />
                <AhuInput 
                  value={data.saksi2Nama || ''}
                  onChange={e => setData(p => ({ ...p, saksi2Nama: e.target.value }))}
                />
              </div>
              <div>
                <AhuLabel label="Tempat & Tanggal Lahir" />
                <AhuInput 
                  value={data.saksi2Lahir || ''}
                  onChange={e => setData(p => ({ ...p, saksi2Lahir: e.target.value }))}
                  placeholder="Bandung, 17 Desember 1999"
                />
              </div>
              <div>
                <AhuLabel label="NIK Saksi 2" />
                <AhuInput 
                  value={data.saksi2NIK || ''}
                  onChange={e => setData(p => ({ ...p, saksi2NIK: e.target.value }))}
                />
              </div>
              <div>
                <AhuLabel label="Alamat Saksi 2" />
                <textarea 
                  rows={2}
                  value={data.saksi2Alamat || ''}
                  onChange={e => setData(p => ({ ...p, saksi2Alamat: e.target.value }))}
                  className="w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none focus:border-[#66afe9] bg-white text-slate-800"
                />
              </div>
            </div>
          </div>
        </AhuSection>

      </div>
    </div>
  );
}
