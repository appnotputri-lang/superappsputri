import React, { useState } from 'react';
import { Search, Info, AlertTriangle, ArrowRight, BookOpen } from 'lucide-react';
import mappingData from '../../KBLI_2020_vs_2025.json';

interface KBLIEntry {
  kode: string;
  judul: string;
}

interface KBLIMappingItem {
  kbli_2020: KBLIEntry;
  kbli_2025: KBLIEntry;
  jenis_perubahan: string;
}

const KBLIMapping: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<KBLIMappingItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const filtered = ((mappingData as any).data as KBLIMappingItem[]).filter(
      item => item.kbli_2020.kode.includes(searchTerm) || 
              item.kbli_2020.judul.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setResults(filtered);
    setHasSearched(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-sm shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-50 p-2 rounded">
            <BookOpen className="w-6 h-6 text-[#3b5998]" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-slate-800 uppercase tracking-tight">Cek Perubahan KBLI 2020 ke 2025</h2>
            <p className="text-[12px] text-slate-500">Cari kode atau judul KBLI 2020 untuk melihat pemetaannya ke KBLI 2025</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Masukkan kode KBLI 2020 (cth: 46101) atau judul..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-sm text-[14px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            className="bg-[#3b5998] hover:bg-[#2d4373] text-white px-6 py-2.5 rounded-sm font-bold text-[13px] transition-all flex items-center gap-2 shadow-sm uppercase tracking-wide"
          >
            Cari
          </button>
        </form>
      </div>

      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[13px] font-bold text-slate-600 uppercase tracking-wider">
              {results.length > 0 ? `Ditemukan ${results.length} hasil Pemetaan` : 'Hasil Pencarian'}
            </h3>
          </div>

          {results.length > 0 ? (
            <div className="grid gap-4">
              {results.map((item, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-sm overflow-hidden shadow-sm hover:border-blue-200 transition-all group">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1.5">
                      <Info className="w-3 h-3" /> {item.jenis_perubahan}
                    </span>
                  </div>
                  <div className="p-4 flex flex-col md:flex-row items-center gap-4 md:gap-8">
                    <div className="flex-1 space-y-1 w-full">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">KBLI 2020</div>
                      <div className="flex items-start gap-2">
                        <span className="text-[15px] font-bold text-slate-800 bg-slate-100 px-1.5 rounded">{item.kbli_2020.kode}</span>
                        <span className="text-[14px] text-slate-700 leading-snug">{item.kbli_2020.judul}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center shrink-0">
                      <div className="bg-blue-50 p-2 rounded-full group-hover:scale-110 transition-transform hidden md:block">
                        <ArrowRight className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="h-px bg-slate-200 w-full flex-1 md:hidden my-2"></div>
                    </div>

                    <div className="flex-1 space-y-1 w-full text-left md:text-right">
                      <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">KBLI 2025</div>
                      <div className="flex items-start justify-start md:justify-end gap-2 flex-row-reverse md:flex-row">
                        <span className="text-[14px] text-slate-700 leading-snug">{item.kbli_2025.judul}</span>
                        <span className="text-[15px] font-bold text-emerald-700 bg-emerald-50 px-1.5 rounded border border-emerald-100">{item.kbli_2025.kode}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-orange-50 border border-orange-200 p-8 rounded-sm text-center space-y-3">
              <div className="bg-orange-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h4 className="text-[16px] font-bold text-orange-800">KBLI tidak berubah</h4>
                <p className="text-[13px] text-orange-700">Kode KBLI 2020 yang Anda cari tidak ditemukan dalam daftar perubahan, kemungkinan besar kode ini tetap sama di KBLI 2025.</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-sm flex gap-3 items-start">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-[12px] text-blue-800 leading-relaxed">
          <p className="font-bold mb-1 uppercase tracking-tight">Catatan Penting:</p>
          Layanan ini membantu Anda mengidentifikasi perubahan struktur kode pada transisi KBLI 2020 ke KBLI 2025 (misal: Pecah Kode, Gabung Kode, atau Perubahan Judul). Pastikan selalu melakukan verifikasi ulang pada sistem OSS RBA saat penginputan data.
        </div>
      </div>
    </div>
  );
};

export default KBLIMapping;
