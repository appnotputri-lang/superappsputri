import React, { useState } from 'react';
import { Mail, Printer, Download, FileText } from 'lucide-react';

export const DataCorrectionLetter: React.FC = () => {
  const [letterData, setLetterData] = useState({
    letterNumber: '',
    date: new Date().toISOString().split('T')[0],
    companyName: '',
    notaryName: '',
    correctionReason: '',
    details: ''
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-sm border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-50 text-teal-600 rounded-lg">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Surat Perbaikan Data</h1>
            <p className="text-xs text-slate-500">Generator Surat Permohonan Perbaikan Data Akta / Sabu Kemenkumham</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => window.print()} 
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-sm transition-all flex items-center gap-2 border border-slate-200"
          >
            <Printer className="w-4 h-4" /> CETAK
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-sm border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-700 uppercase border-b border-slate-100 pb-2 flex items-center gap-2">
          <FileText className="w-4 h-4 text-teal-600" /> Form Surat Perbaikan
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nomor Surat</label>
            <input 
              type="text" 
              value={letterData.letterNumber} 
              onChange={e => setLetterData(prev => ({ ...prev, letterNumber: e.target.value }))}
              placeholder="Contoh: 001/PERBAIKAN/2025"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-sm focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Surat</label>
            <input 
              type="date" 
              value={letterData.date} 
              onChange={e => setLetterData(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-sm focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Perseroan / CV</label>
            <input 
              type="text" 
              value={letterData.companyName} 
              onChange={e => setLetterData(prev => ({ ...prev, companyName: e.target.value }))}
              placeholder="Contoh: PT MAJU SEJAHTERA"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-sm focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Notaris</label>
            <input 
              type="text" 
              value={letterData.notaryName} 
              onChange={e => setLetterData(prev => ({ ...prev, notaryName: e.target.value }))}
              placeholder="Contoh: FULAN, S.H., M.Kn."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-sm focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Rincian Perbaikan Data</label>
            <textarea 
              rows={4}
              value={letterData.details} 
              onChange={e => setLetterData(prev => ({ ...prev, details: e.target.value }))}
              placeholder="Tuliskan detail perbaikan data yang dimohonkan..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-sm focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataCorrectionLetter;
