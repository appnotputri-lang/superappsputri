import React from 'react';
import { ShareTransfer, Shareholder } from '../types';
import { Trash2, Plus, ArrowRight, BookOpen } from 'lucide-react';
import { formatInputNumber, parseFormattedNumber } from '../utils/formatters';

interface Props {
  transfers: ShareTransfer[];
  shareholders: Shareholder[];
  finalShareholders: Shareholder[];
  onChange: (transfers: ShareTransfer[]) => void;
  globalSharePrice: number;
}

const StockTransferEditor: React.FC<Props> = ({ transfers = [], shareholders = [], finalShareholders = [], onChange, globalSharePrice }) => {
  const addTransfer = () => {
    onChange([
      ...transfers,
      {
        id: crypto.randomUUID(),
        type: 'Jual Beli',
        fromShareholderId: '',
        toShareholderId: '',
        sharesTransferred: 0
      }
    ]);
  };

  const updateTransfer = (id: string, updates: Partial<ShareTransfer>) => {
    onChange(transfers.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const removeTransfer = (id: string) => {
    onChange(transfers.filter(t => t.id !== id));
  };

  const getPartyName = (id: string) => {
    // Search in existing first
    const existing = shareholders.find(s => s.id === id);
    if (existing) return existing.name || '(Tanpa Nama)';
    
    // Then in final
    const final = finalShareholders.find(s => s.id === id);
    if (final) return final.name || '(Tanpa Nama)';

    return '';
  };

  return (
    <div className="space-y-6">
      {transfers.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500 mb-4">Belum ada data peralihan saham.</p>
          <button 
            onClick={addTransfer}
            className="px-4 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" /> Tambah Transaksi
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end mb-4">
             <button 
                onClick={addTransfer}
                className="px-4 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Tambah Transaksi
              </button>
          </div>
          {transfers.map((t, index) => (
            <div key={t.id} className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm relative group">
              <button 
                onClick={() => removeTransfer(t.id)} 
                className="absolute -top-2 -right-2 p-1.5 bg-white text-red-400 border border-slate-200 rounded-full shadow-md hover:bg-red-50 hover:text-red-600 transition-all z-10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </span>
                <select
                  value={t.type}
                  onChange={e => updateTransfer(t.id, { type: e.target.value as any })}
                  className="px-4 py-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-white text-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Jual Beli">JUAL BELI</option>
                  <option value="Hibah">HIBAH</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Pihak Pengalih (Dari)</label>
                  <select
                    value={t.fromShareholderId || ''}
                    onChange={e => updateTransfer(t.id, { fromShareholderId: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">-- Pilih Pihak (Di Notulen) --</option>
                    {shareholders.map(s => (
                      <option key={s.id} value={s.id}>{s.name || '(Tanpa Nama)'}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-center pt-4 md:pt-0">
                  <ArrowRight className="w-5 h-5 text-slate-300 rotate-90 md:rotate-0" />
                </div>

                <div>
                  <div className="mb-1">
                    <label className="block text-xs font-bold text-slate-400 uppercase">Pihak Penerima (Ke)</label>
                  </div>
                  <select
                    value={t.toShareholderId || ''}
                    onChange={e => updateTransfer(t.id, { toShareholderId: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">-- Pilih Pihak (Final Struktur) --</option>
                    {finalShareholders.map(p => (
                      <option key={p.id} value={p.id}>{p.name || '(Tanpa Nama)'}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Jumlah Saham Yang Dialihkan</label>
                <div className="relative w-full md:w-1/2">
                  <input 
                    type="text" 
                    value={formatInputNumber(t.sharesTransferred)} 
                    onChange={e => updateTransfer(t.id, { sharesTransferred: parseFormattedNumber(e.target.value) })}
                    className="w-full px-4 py-3 border border-indigo-200 rounded-xl text-sm font-bold pr-14 bg-indigo-50/30 focus:ring-2 focus:ring-indigo-500 outline-none" 
                    placeholder="0" 
                  />
                  <span className="absolute right-3 top-2 text-xs text-indigo-400 font-bold uppercase">Lembar</span>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StockTransferEditor;
