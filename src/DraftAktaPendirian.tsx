import React, { useState } from 'react';
import { KbliItem } from '../types';
import { KBLI_DATA } from '../utils/kbliData';
import { Eye, Printer, Users, Building2, Banknote, HelpCircle, Save } from 'lucide-react';
import { AddressSelects } from './components/AddressSelects';

export interface Pendiri {
  id: string;
  nama: string;
  tempatLahir: string;
  tanggalLahir: string;
  pekerjaan: string;
  alamatJalan: string;
  kota: string;
  rt: string;
  rw: string;
  kelurahan: string;
  kecamatan: string;
  provinsi: string;
  nik: string;
  sahamSaham: number;
  jabatan: string; // misal "Direktur Utama", "Direktur", "Komisaris Utama", "Komisaris"
}

export interface PendirianData {
  namaPt: string;
  kotaKedudukan: string;
  kuotaWaktuDireksi: string; // misal "5 (lima) tahun"
  tanggal: string;
  waktu: string;
  notarisTempat: string; // misal "Kabupaten Bandung Barat"
  notarisNamaSurat: string;
  kbliItems: KbliItem[];
  modalDasar: number;
  nilaiPerLembar: number;
  modalDisetorPersen: number;
  pendiri: Pendiri[];
}

interface DraftAktaPendirianProps {
  onShowPreview: (data: any, type: string) => void;
  onExportWord: (data: any, type: string) => void;
}

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
        <span className="text-slate-400 group-hover:text-slate-600 font-bold font-mono text-[16px]">
          {open ? '[-]' : '[+]'}
        </span>
      </div>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
};

export default function DraftAktaPendirian({ onShowPreview, onExportWord }: DraftAktaPendirianProps) {
  const [data, setData] = useState<PendirianData>({
    namaPt: '',
    kotaKedudukan: '',
    kuotaWaktuDireksi: '5',
    tanggal: new Date().toISOString().split('T')[0],
    waktu: '10:00',
    notarisTempat: 'Kabupaten Bandung Barat',
    notarisNamaSurat: '',
    kbliItems: [
      { id: '1', code: '47914', name: 'Perdagangan Eceran Melalui Media Untuk Barang Campuran Sebagaimana Tersebut Dalam 47911 S.D. 47913', description: 'Kelompok ini mencakup usaha perdagangan eceran berbagai jenis barang campuran sebagaimana tersebut dalam 47911 s.d. 47913 melalui pesanan (surat, telepon atau internet) dan barang akan dikirim kepada pembeli sesuai dengan barang yang diinginkan berdasarkan katalog, iklan, model, telepon, radio, televisi, internet, media massa dan sejenisnya.' },
      { id: '2', code: '47919', name: 'Perdagangan Eceran Melalui Media Untuk Berbagai Macam Barang Lainnya', description: 'Kelompok ini mencakup usaha perdagangan eceran berbagai barang lainnya melalui pesanan dan barang akan dikirim kepada pembeli sesuai dengan barang yang diinginkan berdasarkan katalog, model, telepon, tv, internet, media massa, dan sejenisnya.' }
    ],
    modalDasar: 52000000,
    modalDisetorPersen: 25,
    nilaiPerLembar: 50000,
    pendiri: [
      {
        id: crypto.randomUUID(),
        nama: '', tempatLahir: '', tanggalLahir: '', pekerjaan: '',
        alamatJalan: '', kota: '', rt: '', rw: '', kelurahan: '', kecamatan: '', provinsi: '',
        nik: '', sahamSaham: 130, jabatan: 'Direktur'
      }
    ]
  });

  const [kbliSearchTerm, setKbliSearchTerm] = useState('');
  const searchResults = kbliSearchTerm.length > 2 
    ? KBLI_DATA.filter(k => 
        k.code.includes(kbliSearchTerm) || 
        k.name.toLowerCase().includes(kbliSearchTerm.toLowerCase())
      ).slice(0, 5)
    : [];

  const updateData = (field: keyof PendirianData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handlePendiriChange = (id: string, field: keyof Pendiri, value: any) => {
    setData(prev => ({
      ...prev,
      pendiri: prev.pendiri.map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  const addPendiri = () => {
    setData(prev => ({
      ...prev,
      pendiri: [
        ...prev.pendiri,
        {
          id: crypto.randomUUID(),
          nama: '', tempatLahir: '', tanggalLahir: '', pekerjaan: '',
          alamatJalan: '', kota: '', rt: '', rw: '', kelurahan: '', kecamatan: '', provinsi: '',
          nik: '', sahamSaham: 130, jabatan: 'Komisaris'
        }
      ]
    }));
  }

  const removePendiri = (id: string) => {
    setData(prev => ({
      ...prev,
      pendiri: prev.pendiri.filter(p => p.id !== id)
    }));
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-sm shadow-sm border border-slate-200">
        <div>
          <h2 className="text-[16px] font-bold flex items-center gap-2 text-slate-800 uppercase">
            <Building2 className="w-5 h-5 text-[#3b5998]" /> Form Pendirian Perseroan Terbatas
          </h2>
        </div>
        <div className="flex gap-2">
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
        <div>
          <AhuSection title="Informasi Pendirian">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#333] mb-1">Nama Perseroan Terbatas (PT)</label>
                <input type="text" value={data.namaPt} onChange={e => updateData('namaPt', e.target.value)} className="w-full text-sm p-1.5 border border-slate-300 rounded focus:border-blue-500 outline-none" placeholder="Contoh: MAJU BERSAMA" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#333] mb-1">Tempat Kedudukan (Kota/Kabupaten)</label>
                <input type="text" value={data.kotaKedudukan} onChange={e => updateData('kotaKedudukan', e.target.value)} className="w-full text-sm p-1.5 border border-slate-300 rounded focus:border-blue-500 outline-none" placeholder="Jakarta Selatan" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#333] mb-1">Masa Jabatan Direksi & Komisaris (Tahun)</label>
                <input type="text" value={data.kuotaWaktuDireksi} onChange={e => updateData('kuotaWaktuDireksi', e.target.value)} className="w-full text-sm p-1.5 border border-slate-300 rounded focus:border-blue-500 outline-none" />
              </div>
            </div>
          </AhuSection>
          
          <AhuSection title="Jadwal & Notaris">
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2">
                 <div>
                    <label className="block text-xs font-bold text-[#333] mb-1">Tanggal Akta</label>
                    <input type="date" value={data.tanggal} onChange={e => updateData('tanggal', e.target.value)} className="w-full text-sm p-1.5 border border-slate-300 rounded" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-[#333] mb-1">Waktu</label>
                    <input type="time" value={data.waktu} onChange={e => updateData('waktu', e.target.value)} className="w-full text-sm p-1.5 border border-slate-300 rounded" />
                 </div>
              </div>

            </div>
          </AhuSection>

          <AhuSection title="Maksud & Tujuan (KBLI)">
             <div className="space-y-4">
                <div className="relative">
                   <div className="flex bg-white border border-slate-300 rounded shadow-sm focus-within:border-[#3b5998] focus-within:ring-1 focus-within:ring-[#3b5998] overflow-hidden">
                     <span className="flex items-center pl-3 text-slate-400">🔍</span>
                     <input 
                       type="text" 
                       placeholder="Cari Kode KBLI (misal: 47911 atau eceran)..." 
                       value={kbliSearchTerm}
                       onChange={e => setKbliSearchTerm(e.target.value)}
                       className="w-full text-sm p-3 outline-none" 
                     />
                   </div>
                   
                   {searchResults.length > 0 && (
                     <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-60 overflow-y-auto">
                        {searchResults.map((result) => {
                          const isSelected = data.kbliItems.some(i => i.code === result.code);
                          return (
                            <div 
                              key={result.code}
                              className={`p-3 border-b text-sm cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
                              onClick={() => {
                                if (!isSelected) {
                                  const newItem: KbliItem = {
                                    id: crypto.randomUUID(),
                                    code: result.code,
                                    name: result.name,
                                    description: result.description,
                                    categoryLetter: result.categoryLetter,
                                    categoryName: result.categoryName
                                  };
                                  updateData('kbliItems', [newItem, ...data.kbliItems]);
                                  setKbliSearchTerm('');
                                }
                              }}
                            >
                              <div className="font-bold text-[#3b5998] flex items-center justify-between">
                                <span>{result.code}</span>
                                {isSelected && <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">SUDAH DITAMBAHKAN</span>}
                              </div>
                              <div className="font-semibold text-slate-800 mt-0.5">{result.name}</div>
                              <div className="text-xs text-slate-500 mt-1 line-clamp-2">{result.description}</div>
                            </div>
                          );
                        })}
                     </div>
                   )}
                </div>

                <div className="space-y-3">
                   {data.kbliItems.length === 0 && (
                     <div className="text-center p-8 bg-slate-50 border border-slate-200 border-dashed rounded text-slate-400 text-sm">
                       Belum ada KBLI yang ditambahkan. Silakan cari dan pilih KBLI di atas.
                     </div>
                   )}
                   {data.kbliItems.map((item, idx) => (
                      <div key={item.id} className="bg-white border-l-4 border-l-[#3b5998] border-y border-r border-slate-200 p-4 rounded shadow-sm">
                        <div className="flex justify-between items-start">
                           <div className="flex-1">
                              <h4 className="font-bold flex items-center gap-2">
                                <span className="bg-[#3b5998] text-white px-2 py-0.5 rounded text-xs">{item.code}</span>
                                <span className="text-slate-800">{item.name}</span>
                              </h4>
                           </div>
                           <button onClick={() => updateData('kbliItems', data.kbliItems.filter(k => k.id !== item.id))} className="text-slate-400 hover:text-red-500 bg-slate-100 hover:bg-red-50 p-1.5 rounded transition-colors">
                              Hapus
                           </button>
                        </div>
                        <div className="mt-3 bg-slate-50 p-3 rounded border border-slate-100">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Deskripsi Tambahan / Penjelasan</label>
                          <textarea 
                            value={item.description || ''} 
                            onChange={(e) => {
                              updateData(
                                'kbliItems', 
                                data.kbliItems.map(k => k.id === item.id ? { ...k, description: e.target.value } : k)
                              );
                            }}
                            className="w-full text-xs p-2 border border-slate-300 rounded focus:border-[#3b5998] outline-none min-h-[60px]"
                            placeholder="Deskripsi kegiatan spesifik (opsional)"
                          />
                        </div>
                      </div>
                   ))}
                </div>
             </div>
          </AhuSection>
        </div>

        <div>
          <AhuSection title="Struktur Pendirian">
            <div className="space-y-4">
              <div>
                 <h4 className="flex items-center gap-2 text-sm font-bold text-[#333] mb-2"><Banknote className="w-4 h-4 text-[#3b5998]" /> Modal Perseroan</h4>
                 <div className="grid grid-cols-1 gap-3">
                   <div>
                     <label className="block text-xs text-slate-600 mb-1">Modal Dasar (Rp)</label>
                     <input type="number" value={data.modalDasar} onChange={e => updateData('modalDasar', parseInt(e.target.value) || 0)} className="w-full text-sm p-1.5 border border-slate-300 rounded" />
                   </div>
                   <div>
                     <label className="block text-xs text-slate-600 mb-1">Nilai per Saham (Rp)</label>
                     <input type="number" value={data.nilaiPerLembar} onChange={e => updateData('nilaiPerLembar', parseInt(e.target.value) || 0)} className="w-full text-sm p-1.5 border border-slate-300 rounded" />
                   </div>
                   <div>
                     <label className="flex items-center justify-between text-xs text-slate-600 mb-1">
                        <span>Ditempatkan & Disetor (%)</span>
                        <span className="text-blue-700 font-bold">{Math.floor((data.modalDasar / data.nilaiPerLembar) * ((data.modalDisetorPersen || 25) / 100)) || 0} Lembar</span>
                     </label>
                     <input type="number" min="0" max="100" value={data.modalDisetorPersen || 25} onChange={e => updateData('modalDisetorPersen', parseInt(e.target.value) || 0)} className="w-full text-sm p-1.5 border border-slate-300 rounded" />
                   </div>
                 </div>
              </div>
              <div className="border-t border-slate-200 pt-3">
                 <h4 className="flex justify-between items-center text-sm font-bold text-[#333] mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#3b5998]" /> Para Pendiri / Pemegang Saham Pertama
                    </div>
                    <button onClick={addPendiri} className="text-xs bg-[#3b5998] text-white px-2 py-1 rounded hover:bg-[#2c3b41]">
                        + Tambah
                    </button>
                 </h4>
                 <div className="space-y-3">
                    {data.pendiri.map((p, index) => (
                      <div key={p.id} className="border border-slate-200 rounded p-3 bg-slate-50 relative">
                        <div className="flex justify-between items-center mb-2 border-b border-slate-300 pb-1">
                          <span className="text-xs font-bold">Pendiri {index + 1}</span>
                          <button onClick={() => removePendiri(p.id)} className="text-xs text-red-500 hover:text-red-700">Hapus</button>
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-xs">
                           <div>
                             <label className="block text-slate-500 mb-0.5">Nama Lengkap</label>
                             <input type="text" value={p.nama} onChange={e => handlePendiriChange(p.id, 'nama', e.target.value)} className="w-full p-1 border rounded" />
                           </div>
                           <div>
                             <label className="block text-slate-500 mb-0.5">NIK / KTP</label>
                             <input type="text" value={p.nik} onChange={e => handlePendiriChange(p.id, 'nik', e.target.value)} className="w-full p-1 border rounded" />
                           </div>
                           <div className="grid grid-cols-1 gap-1 col-span-1">
                             <div>
                                <label className="block text-slate-500 mb-0.5">Tempat Lahir</label>
                                <input type="text" value={p.tempatLahir} onChange={e => handlePendiriChange(p.id, 'tempatLahir', e.target.value)} className="w-full p-1 border rounded" />
                             </div>
                             <div>
                                <label className="block text-slate-500 mb-0.5">Tanggal Lahir</label>
                                <input type="date" value={p.tanggalLahir} onChange={e => handlePendiriChange(p.id, 'tanggalLahir', e.target.value)} className="w-full p-1 border rounded" />
                             </div>
                           </div>
                           <div>
                             <label className="block text-slate-500 mb-0.5">Pekerjaan</label>
                             <input type="text" value={p.pekerjaan} onChange={e => handlePendiriChange(p.id, 'pekerjaan', e.target.value)} className="w-full p-1 border rounded w-full" />
                           </div>
                           <div className="col-span-1">
                             <label className="block text-slate-500 mb-0.5">Alamat Jalan</label>
                             <input type="text" value={p.alamatJalan} onChange={e => handlePendiriChange(p.id, 'alamatJalan', e.target.value)} className="w-full p-1 border rounded" />
                           </div>
                           <div className="grid grid-cols-1 gap-2">
                              <div><label className="block text-slate-500 mb-0.5">RT</label><input type="text" value={p.rt} onChange={e => handlePendiriChange(p.id, 'rt', e.target.value)} className="w-full p-1 border rounded" /></div>
                              <div><label className="block text-slate-500 mb-0.5">RW</label><input type="text" value={p.rw} onChange={e => handlePendiriChange(p.id, 'rw', e.target.value)} className="w-full p-1 border rounded" /></div>
                           </div>
                           <div className="col-span-1">
                             <AddressSelects 
                               provinsi={p.provinsi || ''}
                               kota={p.kota}
                               kecamatan={p.kecamatan}
                               kelurahan={p.kelurahan}
                               onChange={(field, value) => handlePendiriChange(p.id, field as keyof Pendiri, value)}
                             />
                           </div>
                           
                           <div className="col-span-1 border-t mt-2 pt-2 grid grid-cols-1 gap-2">
                             <div>
                               <label className="block text-slate-500 mb-0.5 font-bold text-blue-700">Jumlah Saham Diambil</label>
                               <input type="number" value={p.sahamSaham} onChange={e => handlePendiriChange(p.id, 'sahamSaham', parseInt(e.target.value) || 0)} className="w-full p-1 border border-blue-300 rounded focus:border-blue-500" />
                             </div>
                             <div>
                               <label className="block text-slate-500 mb-0.5 font-bold text-blue-700">Jabatan Pengurus</label>
                               <select value={p.jabatan} onChange={e => handlePendiriChange(p.id, 'jabatan', e.target.value)} className="w-full p-1.5 border border-blue-300 rounded focus:border-blue-500">
                                 <option value="Direktur Utama">Direktur Utama</option>
                                 <option value="Direktur">Direktur</option>
                                 <option value="Komisaris Utama">Komisaris Utama</option>
                                 <option value="Komisaris">Komisaris</option>
                               </select>
                             </div>
                           </div>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          </AhuSection>
        </div>
      </div>
    </div>
  );
}
