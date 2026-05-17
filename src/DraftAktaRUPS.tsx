import React, { useState } from 'react';
import { CompanyData } from '../types';
import { RUPSDocumentPreview } from './RUPSDocumentPreview';
import { generateRUPSDocx } from './lib/generateRUPSDocx';
import { Download, Eye, X } from 'lucide-react';

interface DraftAktaRUPSProps {
  companyData: CompanyData;
}

export default function DraftAktaRUPS({ companyData }: DraftAktaRUPSProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleDownload = async () => {
    await generateRUPSDocx(companyData);
  };

  return (
    <div className="w-full flex flex-col">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Draft Akta RUPS</h2>
          <p className="text-sm text-slate-500">Hasil input dari form Notulen</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsPreviewOpen(true)} 
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-semibold shadow-sm"
          >
            <Eye size={18} className="text-blue-600" /> Pratinjau Draft
          </button>
          <button 
            onClick={handleDownload} 
            className="bg-[#3b5998] hover:bg-[#2c4073] text-white transition-colors px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-semibold shadow-sm"
          >
            <Download size={18} /> Download DOCX
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[500px] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-inner">
         <RUPSDocumentPreview data={companyData} />
      </div>

      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-100 w-full max-w-5xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white px-6 py-4 border-b flex justify-between items-center shrink-0">
              <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                 <Eye size={20} className="text-blue-600"/> Pratinjau Dokumen Akta RUPS
              </h2>
              <button onClick={() => setIsPreviewOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-slate-500 hover:text-slate-900">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-200">
               <RUPSDocumentPreview data={companyData} />
            </div>
            <div className="bg-white border-t p-4 flex justify-end px-6 shrink-0 gap-3">
               <button onClick={() => setIsPreviewOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Tutup</button>
               <button onClick={handleDownload} className="px-5 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 shadow-sm transition-colors">
                  <Download size={16}/> Download DOCX
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
