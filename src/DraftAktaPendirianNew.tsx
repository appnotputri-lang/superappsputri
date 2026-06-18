import React, { useState, useMemo } from 'react';
import { KbliItem, Shareholder, Address } from '../types';
import { KBLI_DATA } from '../utils/kbliData';
import { Eye, Printer, Users, Building2, Banknote, ChevronDown, ChevronRight, Search, Trash2, Plus, User, MapPin, Briefcase, ArrowRight, Save } from 'lucide-react';
import { IndoRegionSelector } from '../components/AddressFields';
import { db, searchShareholderByNIKClient } from './lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { DocxXmlEngine } from './lib/DocxXmlEngine';
import { saveAs } from 'file-saver';

// Local utility types matching existing ones
const AhuSection = ({ title, children, isOpen = true }: any) => {
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

const AhuLabel = ({ label, required = false }: any) => (
  <label className="block text-[12px] font-bold text-slate-600 mb-1 uppercase tracking-tight">
    {label} {required && <span className="text-red-500">*</span>}
  </label>
);

const AhuInput = ({ className = "", ...props }: any) => (
  <input 
    {...props} 
    className={`w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none focus:border-[#66afe9] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,.075),0_0_8px_rgba(102,175,233,.6)] transition-all bg-white text-slate-800 ${className}`} 
  />
);

const AhuSelect = ({ children, className = "", ...props }: any) => (
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
}

interface DraftAktaPendirianProps {
  profiles: any[];
  initialData?: PendirianData | null;
  onSave?: (data: PendirianData) => void;
  onCancel?: () => void;
  isSaving?: boolean;
}

function formatNumber(num: number) {
  return typeof num === 'number' ? num.toLocaleString('id-ID') : '0';
}

export default function DraftAktaPendirianNew({ 
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
    const searchStr = kbliModalSearchTerm.toLowerCase().trim();
    if (!searchStr) {
      setKbliModalSearchResults([...KBLI_DATA].sort((a, b) => a.code.localeCompare(b.code)));
      return;
    }
    const keywords = searchStr.split(/\s+/).filter(k => k.length > 0);
    const filtered = KBLI_DATA.filter(item => {
      if (/^\d+$/.test(searchStr)) return item.code.startsWith(searchStr);
      return item.code.includes(searchStr) || keywords.every(kw => (item.name || '').toLowerCase().includes(kw) || (item.description || '').toLowerCase().includes(kw));
    });
    setKbliModalSearchResults([...filtered].sort((a, b) => a.code.localeCompare(b.code)));
  };

  const kbliItemsPerPage = 10;
  const kbliTotPages = Math.ceil(kbliModalSearchResults.length / kbliItemsPerPage);
  const kbliPaginatedResults = useMemo(() => kbliModalSearchResults.slice((kbliCurrentPage - 1) * kbliItemsPerPage, kbliCurrentPage * kbliItemsPerPage), [kbliModalSearchResults, kbliCurrentPage]);

  const updateData = (field: keyof PendirianData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleShareholderChange = (id: string, updates: Partial<Shareholder>) => {
    setData(prev => ({ ...prev, shareholders: prev.shareholders.map(p => p.id === id ? { ...p, ...updates } : p) }));
  };

  const addShareholder = () => {
    setData(prev => ({
      ...prev,
      shareholders: [...prev.shareholders, { id: crypto.randomUUID(), salutation: 'Tuan', name: '', birthCity: '', birthDate: '', nationality: 'WNI', nationalityType: 'WNI', address: { ...INITIAL_ADDRESS }, nik: '', sharesOwned: 0, occupation: '', managementPosition: 'Komisaris', isManagement: true, shareholderType: 'PERORANGAN', isForeign: false }]
    }));
  };

  const removeShareholder = (id: string) => {
    setData(prev => ({ ...prev, shareholders: prev.shareholders.filter(p => p.id !== id) }));
  };

  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);

  const handleGenerateDocx = async () => {
    if (!data.namaPt) return alert("Mohon isi Nama PT terlebih dahulu!");
    setIsGeneratingDocx(true);
    
    try {
      // Fetch active template
      const q = query(collection(db, 'akta_templates'), where('type', '==', 'PENDIRIAN_NEW'), where('isActive', '==', true), limit(1));
      const res = await getDocs(q);
      
      if (res.empty) {
        alert("Template DOCX tidak ditemukan! Silakan ke menu Template Akta dan unggah/aktifkan sebuah template Pendirian NEW.");
        setIsGeneratingDocx(false);
        return;
      }
      
      const tdoc = res.docs[0].data();
      const base64Str = tdoc.base64Data;
      
      // Mapping Data untuk Placeholder DOCX
      const payload: any = {
        NAMA_PT: data.namaPt.toUpperCase(),
        KOTA_KEDUDUKAN: data.kotaKedudukan,
        ALAMAT_PT: data.alamatLengkapPT,
        TANGGAL_AKTA: new Date(data.tanggal).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }),
        NOTARIS_TEMPAT: data.notarisTempat,
        KUOTA_DIREKSI: data.kuotaWaktuDireksi,
        MODAL_DASAR: formatNumber(data.modalDasar),
        NILAI_PER_LEMBAR: formatNumber(data.nilaiPerLembar),
        PERSEN_DISETOR: data.modalDisetorPersen,
        TOTAL_DISETOR: formatNumber(data.modalDasar * (data.modalDisetorPersen / 100)),
        LEMBAR_DISETOR: formatNumber((data.modalDasar * (data.modalDisetorPersen / 100)) / data.nilaiPerLembar),
        TOTAL_LEMBAR_SAHAM: formatNumber(data.modalDasar / data.nilaiPerLembar),
        KBLI: data.kbliItems.map(k => ({
          KODE: k.code,
          JUDUL: k.name,
          URAIAN: k.description
        })),
        PENDIRI: data.shareholders.map(s => ({
          NAMA: s.name.toUpperCase(),
          JABATAN: s.isManagement ? s.managementPosition : "Pegang Saham",
          TOTAL_SAHAM: formatNumber(s.sharesOwned),
          NILAI_SAHAM: formatNumber(s.sharesOwned * data.nilaiPerLembar),
          NIK: s.nik || s.passportNumber || "-",
          ALAMAT: s.address.fullAddress,
          PEKERJAAN: s.occupation || "-"
        })),
        DIREKSI: data.shareholders.filter(s => s.isManagement && s.managementPosition?.includes('Direktur')).map(s => ({
          NAMA: s.name.toUpperCase(),
          JABATAN: s.managementPosition
        })),
        KOMISARIS: data.shareholders.filter(s => s.isManagement && s.managementPosition?.includes('Komisaris')).map(s => ({
          NAMA: s.name.toUpperCase(),
          JABATAN: s.managementPosition
        })),
      };

      const outBlob = DocxXmlEngine.generateDocx(base64Str, payload);
      saveAs(outBlob, `AKTA_PENDIRIAN_NEW_${data.namaPt.replace(/\s+/g, '_')}_GEN.docx`);
      
    } catch(err: any) {
      console.error(err);
      alert("Gagal memproses Template DOCX: " + err.message);
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-20 animate-in fade-in">
      <div className="flex justify-between items-center bg-white p-4 rounded-sm shadow-sm border border-slate-200 sticky top-0 z-10">
        <div>
          <h2 className="text-[16px] font-bold flex items-center gap-2 text-slate-800 uppercase">
             <Building2 className="w-5 h-5 text-[#3b5998]" /> Form Pendirian (DOCX V2)
          </h2>
          <span className="text-[10px] bg-yellow-400 font-bold px-1 rounded ml-7">ENGINE DOCX V2</span>
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-bold rounded shadow hover:bg-slate-200 flex items-center gap-2">
              <ArrowRight className="w-4 h-4 rotate-180" /> Kembali
            </button>
          )}

          {onSave && (
            <button type="button" disabled={isSaving} onClick={() => onSave(data)} className="px-3 py-1.5 bg-[#3b5998] text-white text-sm font-bold rounded shadow hover:bg-[#2d4373] flex items-center gap-2 disabled:opacity-50">
              <Save className="w-4 h-4" /> {isSaving ? 'Menyimpan...' : 'Simpan Draft'}
            </button>
          )}

          <button 
            type="button" 
            disabled={isGeneratingDocx}
            onClick={handleGenerateDocx}
            className="px-3 py-1.5 bg-[#00a65a] text-white text-sm font-bold rounded shadow hover:bg-[#008d4c] flex items-center gap-2"
          >
            <Printer className="w-4 h-4" /> {isGeneratingDocx ? "Memproses..." : "Render DOCX"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* INFORMASI UTAMA */}
        <AhuSection title="Informasi Pendirian PT">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <AhuLabel label="Pilih Klien PT (Opsional)" />
              <div className="md:col-span-3">
                <AhuSelect onChange={(e: any) => { /* simplified for brevity */ }}>
                  <option value="">-- PILIH DATA DARI MANIFEST PT --</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.companyName}</option>)}
                </AhuSelect>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <AhuLabel label="Nama Perseroan Terbatas" required />
              <div className="md:col-span-3">
                 <AhuInput type="text" value={data.namaPt} onChange={(e: any) => updateData('namaPt', e.target.value.toUpperCase())} placeholder="CONTOH: MAJU BERSAMA" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <AhuLabel label="Tempat Kedudukan (Kota/Kab)" required />
              <div className="md:col-span-3">
                <AhuInput type="text" value={data.kotaKedudukan} onChange={(e: any) => updateData('kotaKedudukan', e.target.value)} placeholder="JAKARTA SELATAN" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <AhuLabel label="Alamat Lengkap PT" required />
              <div className="md:col-span-3">
                <textarea 
                  value={data.alamatLengkapPT || ''} 
                  onChange={(e: any) => updateData('alamatLengkapPT', e.target.value)} 
                  className="w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none focus:border-[#66afe9] transition-all bg-white text-slate-800" 
                  rows={2} 
                />
              </div>
            </div>

            <div className="bg-slate-50 p-4 border border-slate-200 rounded-sm mt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <AhuLabel label="Modal Dasar (Rp)" />
                  <AhuInput type="number" value={data.modalDasar} onChange={(e: any) => updateData('modalDasar', parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <AhuLabel label="Nilai per Saham (Rp)" />
                  <AhuInput type="number" value={data.nilaiPerLembar} onChange={(e: any) => updateData('nilaiPerLembar', parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <AhuLabel label="Ditempatkan & Disetor (%)" />
                  <AhuInput type="number" min="0" max="100" value={data.modalDisetorPersen} onChange={(e: any) => updateData('modalDisetorPersen', parseInt(e.target.value) || 0)} />
                </div>
              </div>
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center mt-2">
              <AhuLabel label="Masa Jabatan Direksi & Komisaris" />
              <div className="md:col-span-3 flex items-center gap-2">
                <AhuInput type="text" className="w-20" value={data.kuotaWaktuDireksi} onChange={(e: any) => updateData('kuotaWaktuDireksi', e.target.value)} />
                <span className="text-[13px] font-bold text-slate-500 uppercase">Tahun</span>
              </div>
            </div>
          </div>
        </AhuSection>
        
        {/* KBLI Placeholder Area */}
        <AhuSection title="Maksud & Tujuan (KBLI)">
            <p className="text-xs text-slate-500 mb-2">Karena ini versi DOCX baru (Templating), Data KBLI akan dirender sebagai `#KBLI` ... `\KBLI` block. Pastikan Template Anda memilikinya.</p>
            <button
                  type="button"
                  onClick={() => setIsAddKbliModalOpen(true)}
                  className="px-4 py-2 bg-[#3b5998] text-white text-[12px] font-bold rounded-sm mb-4"
                >
                  <Plus className="w-4 h-4 inline-block mr-1" /> Tambah KBLI
            </button>
            <div className="grid gap-2">
               {data.kbliItems.map((item, idx) => (
                  <div key={item.id} className="p-2 border rounded-sm flex bg-slate-50 justify-between items-center text-xs font-mono">
                     <span>{idx+1}. {item.code} - {item.name}</span>
                     <Trash2 className="w-4 h-4 text-red-500 cursor-pointer" onClick={() => updateData('kbliItems', data.kbliItems.filter(k => k.id !== item.id))} />
                  </div>
               ))}
            </div>
        </AhuSection>

        {/* STRUKTUR PEMEGANG SAHAM */}
        <AhuSection title="Pemegang Saham & Pengurus">
            <button 
                  type="button" 
                  onClick={addShareholder} 
                  className="px-4 py-2 bg-[#3b5998] text-white text-[12px] font-bold rounded-sm"
            >
              Tambah Pendiri
            </button>
             {data.shareholders.map((p, index) => (
                 <div key={p.id} className="border p-4 bg-slate-50 mt-4 rounded">
                     <div className="flex gap-4">
                         <div className="flex-1">
                             <AhuLabel label="Nama Pendiri" />
                             <AhuInput value={p.name} onChange={(e: any) => handleShareholderChange(p.id, { name: e.target.value })} />
                         </div>
                         <div className="flex-1">
                             <AhuLabel label="Jabatan" />
                             <AhuSelect value={p.managementPosition} onChange={(e: any) => handleShareholderChange(p.id, { isManagement: e.target.value !== 'Tidak Ada', managementPosition: e.target.value })}>
                                <option value="Tidak Ada">Hanya Pemegang Saham</option>
                                <option value="Direktur Utama">Direktur Utama</option>
                                <option value="Direktur">Direktur</option>
                                <option value="Komisaris Utama">Komisaris Utama</option>
                                <option value="Komisaris">Komisaris</option>
                             </AhuSelect>
                         </div>
                         <div className="flex-1">
                             <AhuLabel label="Jumlah Saham" />
                             <AhuInput type="number" value={p.sharesOwned} onChange={(e: any) => handleShareholderChange(p.id, { sharesOwned: parseInt(e.target.value) || 0 })} />
                         </div>
                         <button onClick={() => removeShareholder(p.id)} className="text-red-500 mt-6"><Trash2 className="w-5 h-5"/></button>
                     </div>
                 </div>
             ))}
        </AhuSection>
      </div>

      {isAddKbliModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
           {/* simplified modal for brevity */}
           <div className="bg-white p-6 max-h-[80vh] overflow-y-auto w-full max-w-2xl">
              <h2 className="font-bold border-b pb-2 mb-4">Pilih KBLI</h2>
              <div>
                  {kbliPaginatedResults.map(i => (
                      <div key={i.code} className="flex gap-2 items-center border-b p-2">
                           <input type="checkbox" checked={kbliCheckedKblis.includes(i.code)} onChange={() => setKbliCheckedKblis(c => c.includes(i.code) ? c.filter(x=>x!==i.code) : [...c, i.code])} />
                           <span className="text-xs">{i.code} - {i.name}</span>
                      </div>
                  ))}
              </div>
              <div className="mt-4 flex justify-between">
                 <button onClick={() => setIsAddKbliModalOpen(false)} className="px-4 py-2 border">Batal</button>
                 <button onClick={() => {
                     const itms = kbliCheckedKblis.map(c => KBLI_DATA.find(x => x.code === c)).filter(x=>!!x) as KbliItem[];
                     setData(d => ({ ...d, kbliItems: [...d.kbliItems, ...itms.map(i => ({...i, id: crypto.randomUUID()}))] }));
                     setKbliCheckedKblis([]);
                     setIsAddKbliModalOpen(false);
                 }} className="px-4 py-2 bg-blue-600 text-white">Tambahkan</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
