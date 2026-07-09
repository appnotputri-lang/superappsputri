import React from 'react';
import { Search } from 'lucide-react';

interface KbliModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSearch: () => void;
  paginatedResults: any[];
  checkedKblis: string[];
  onToggleAllOnPage: () => void;
  onToggleKbli: (kode: string) => void;
  totalPages: number;
  pageNumbers: number[];
  currentPage: number;
  setCurrentPage: (val: number) => void;
  onAddBatch: () => void;
}

export const KbliModal: React.FC<KbliModalProps> = ({
  isOpen,
  onClose,
  searchTerm,
  setSearchTerm,
  onKeyDown,
  onSearch,
  paginatedResults,
  checkedKblis,
  onToggleAllOnPage,
  onToggleKbli,
  totalPages,
  pageNumbers,
  currentPage,
  setCurrentPage,
  onAddBatch
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-sm shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-[#0c2444] px-5 py-3 flex justify-between items-center text-white rounded-t-sm">
          <h3 className="text-sm font-bold tracking-wider text-white">TAMBAH DATA KBLI (RUPS LB)</h3>
          <button 
            onClick={onClose}
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={onKeyDown}
              />
              <button 
                onClick={onSearch}
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
                        checked={paginatedResults.length > 0 && paginatedResults.every(r => checkedKblis.includes(r.kode))}
                        onChange={onToggleAllOnPage}
                      />
                    </th>
                    <th className="px-4 py-2 font-bold text-slate-700 text-center w-24 border-r border-slate-200">Kode KBLI</th>
                    <th className="px-4 py-2 font-bold text-slate-700 text-left w-52 border-r border-slate-200">Judul KBLI</th>
                    <th className="px-4 py-2 font-bold text-slate-700 text-left">Uraian KBLI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedResults.map((item) => {
                    const isChecked = checkedKblis.includes(item.kode);
                    return (
                      <tr 
                        key={item.kode} 
                        onClick={() => onToggleKbli(item.kode)}
                        className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                          isChecked ? 'bg-indigo-50/50 hover:bg-indigo-100/50' : ''
                        }`}
                      >
                        <td className="px-4 py-2 text-center border-r border-slate-200" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-[#0c2444] border-slate-300 rounded cursor-pointer"
                            checked={isChecked}
                            onChange={() => onToggleKbli(item.kode)}
                          />
                        </td>
                        <td className="px-4 py-2 text-center border-r border-slate-200 font-mono font-bold text-slate-700">{item.kode}</td>
                        <td className="px-4 py-2 border-r border-slate-200 font-bold text-slate-800">{item.judul}</td>
                        <td className="px-4 py-2 text-slate-600 leading-relaxed text-justify">{item.uraian}</td>
                      </tr>
                    );
                  })}
                  {paginatedResults.length === 0 && (
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
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
              <span className="font-bold">Pergi ke halaman:</span>
              <div className="flex flex-wrap items-center gap-1">
                {pageNumbers.map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-2.5 py-1 border rounded-sm font-bold transition-all ${
                      currentPage === pageNum 
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
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-350 rounded-sm text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
          >
            BATAL
          </button>
          <button 
            onClick={onAddBatch}
            className="px-4 py-2 bg-[#0c2444] text-white rounded-sm text-xs font-bold hover:bg-[#16365f] transition-all"
          >
            TAMBAH TERPILIH ({checkedKblis.length})
          </button>
        </div>
      </div>
    </div>
  );
};
