import React from 'react';
import { CompanyData } from '../types';
import { Building2, Save } from 'lucide-react';

interface Props {
  data: CompanyData;
  updateData: (updates: Partial<CompanyData>) => void;
}

export const SirkulerLaporanFormContent: React.FC<Props> = ({ data, updateData }) => {

  const handleCheckbox = (field: keyof CompanyData, checked: boolean) => {
    updateData({ [field]: checked } as any);
  };

  return (
    <div className="space-y-6">
       <div className="bg-white border border-slate-200 rounded-sm mb-4 shadow-sm">
        <div className="bg-[#f5f5f5] px-4 py-2 border-b border-slate-200">
          <h3 className="text-[14px] font-bold text-slate-700 uppercase tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-4 bg-[#3b5998]"></span>
            Data Keputusan Sirkuler
          </h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1">Hari Keputusan</label>
              <input
                type="text"
                value={data.slHari || ''}
                onChange={(e) => updateData({ slHari: e.target.value })}
                placeholder="Misal: Senin"
                className="w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none focus:border-[#66afe9] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,.075),0_0_8px_rgba(102,175,233,.6)] transition-all bg-white text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1">Tanggal Keputusan (Huruf)</label>
              <input
                type="text"
                value={data.slTanggalHuruf || ''}
                onChange={(e) => updateData({ slTanggalHuruf: e.target.value })}
                placeholder="Misal: dua puluh enam Mei dua ribu dua puluh enam (26-05-2026)"
                 className="w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none focus:border-[#66afe9] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,.075),0_0_8px_rgba(102,175,233,.6)] transition-all bg-white text-slate-800"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-sm mb-4 shadow-sm">
        <div className="bg-[#f5f5f5] px-4 py-2 border-b border-slate-200">
          <h3 className="text-[14px] font-bold text-slate-700 uppercase tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-4 bg-[#3b5998]"></span>
            1. Alasan Tidak Wajib Audit
          </h3>
        </div>
        <div className="p-5 space-y-2">
           <p className="text-xs text-gray-500 mb-3">Pilih salah satu, beberapa atau semuanya</p>
           {[
            { id: 'slAlasanAuditA', label: 'Kegiatan Usaha Perseroan tidak menghimpun dan/atau mengelola dana masyarakat.' },
            { id: 'slAlasanAuditB', label: 'Perseroan tidak menerbitkan surat pengakuan utang kepada masyarakat.' },
            { id: 'slAlasanAuditC', label: 'Perseroan tidak merupakan Perseroan Terbuka (Tbk).' },
            { id: 'slAlasanAuditD', label: 'Perseroan tidak merupakan Persero.' },
            { id: 'slAlasanAuditE', label: 'Aset dan/atau jumlah peredaran usaha tidak lebih dari 50 Milyar, atau' },
            { id: 'slAlasanAuditF', label: 'Tidak diwajibkan oleh peraturan perundang-undangan.' }
          ].map((item) => (
            <div key={item.id} className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id={item.id}
                  type="checkbox"
                  checked={Boolean((data as any)[item.id])}
                  onChange={(e) => handleCheckbox(item.id as keyof CompanyData, e.target.checked)}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-[13px]">
                <label htmlFor={item.id} className="font-medium text-gray-700 cursor-pointer">
                  {item.label}
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

       <div className="bg-white border border-slate-200 rounded-sm mb-4 shadow-sm">
        <div className="bg-[#f5f5f5] px-4 py-2 border-b border-slate-200">
          <h3 className="text-[14px] font-bold text-slate-700 uppercase tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-4 bg-[#3b5998]"></span>
            2 & 3. Data Laporan SABH
          </h3>
        </div>
        <div className="p-5 space-y-4">
           <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1">Nomor Laporan SABH AHU</label>
            <input
              type="text"
              value={data.slLaporanNomor || ''}
              onChange={(e) => updateData({ slLaporanNomor: e.target.value })}
              className="w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none focus:border-[#66afe9] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,.075),0_0_8px_rgba(102,175,233,.6)] transition-all bg-white text-slate-800"
            />
          </div>

          <div>
             <label className="block text-[13px] font-medium text-slate-700 mb-1">Tanggal Laporan (Huruf)</label>
             <textarea
                value={data.slLaporanTanggalHuruf || ''}
                onChange={(e) => updateData({ slLaporanTanggalHuruf: e.target.value })}
                rows={2}
                className="w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none focus:border-[#66afe9] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,.075),0_0_8px_rgba(102,175,233,.6)] transition-all bg-white text-slate-800"
              />
          </div>
          
           <div>
             <label className="block text-[13px] font-medium text-slate-700 mb-1">Tahun Buku Berakhir (Huruf)</label>
             <textarea
                value={data.slTahunBukuAkhirHuruf || ''}
                onChange={(e) => updateData({ slTahunBukuAkhirHuruf: e.target.value })}
                rows={2}
                className="w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none focus:border-[#66afe9] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,.075),0_0_8px_rgba(102,175,233,.6)] transition-all bg-white text-slate-800"
              />
          </div>
        </div>
      </div>
      
       <div className="pt-4 text-[12px] text-gray-500 bg-blue-50 p-4 rounded border border-blue-200">
        Informasi Pemegang Saham, Akta, dan Notaris akan otomatis disesuaikan dengan data profil perusahaan yang dipilih. Lengkapi data pemegang saham dari tab "Company Profile".
      </div>

    </div>
  );
};
