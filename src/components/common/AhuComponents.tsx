import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatDateIndo } from '../../../utils/formatters';

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

export const getCompanyInitials = (name: string): string => {
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

export const getPastelColor = (name: string) => {
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

export const CompanyAvatar = ({ name }: { name: string }) => {
  const initials = getCompanyInitials(name);
  const colors = getPastelColor(name);
  return (
    <div className={`w-[36px] h-[36px] rounded-[12px] flex items-center justify-center font-semibold text-[12px] border shrink-0 uppercase select-none ${colors.bg}`}>
      {initials}
    </div>
  );
};
