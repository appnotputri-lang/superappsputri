import React, { useState, useMemo } from 'react';
import { CompanyData } from '../types';
import { RUPSDocumentPreview } from './RUPSDocumentPreview';
import { generateRupstAktaBlocks } from './lib/rupsTahunanAktaContentBlocks';
import { generateRUPSTAktaDocx } from './lib/generateRUPSTAktaDocx';
import { Download, Eye, X, Loader2, FileSignature } from 'lucide-react';

interface DraftAktaRUPSTProps {
  companyData: CompanyData;
}

export default function DraftAktaRUPST({ companyData }: DraftAktaRUPSTProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const isSirkuler = companyData.rupstType === 'sirkuler';
  const aktaTitle = isSirkuler ? 'Draft Akta Sirkuler RUPST' : 'Draft Akta RUPST';
  const aktaSubtitle = isSirkuler 
    ? 'Hasil input Akta Pernyataan Keputusan Sirkuler RUPST Notariil' 
    : 'Hasil input Akta Berita Acara / Pernyataan Keputusan RUPST Notariil';

  const aktaBlocks = useMemo(() => {
    try {
      return generateRupstAktaBlocks(companyData);
    } catch (err) {
      console.error('Error generating RUPST Akta blocks for preview:', err);
      return [];
    }
  }, [companyData]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await generateRUPSTAktaDocx(companyData);
    } catch (err) {
      console.error('Failed to download Draft Akta RUPST DOCX:', err);
      alert('Gagal menghasilkan Draft Akta RUPST DOCX.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <FileSignature className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">{aktaTitle}</h2>
            <p className="text-xs text-slate-500">{aktaSubtitle}</p>
          </div>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button 
            type="button"
            onClick={() => setIsPreviewOpen(true)} 
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors px-3.5 py-2 rounded-lg flex items-center gap-2 text-xs font-bold shadow-xs cursor-pointer"
          >
            <Eye size={16} className="text-blue-600" /> Pratinjau Akta
          </button>
          <button 
            type="button"
            onClick={handleDownload} 
            disabled={isDownloading}
            className="bg-[#1b449c] hover:bg-[#13327d] text-white transition-colors px-3.5 py-2 rounded-lg flex items-center gap-2 text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Download DOCX
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[450px] max-h-[600px] bg-slate-100 rounded-xl overflow-y-auto border border-slate-200 shadow-inner">
         <RUPSDocumentPreview data={companyData} customBlocks={aktaBlocks} />
      </div>

      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-gray-100 w-full max-w-5xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
              <h2 className="font-bold text-base text-slate-800 flex items-center gap-2">
                 <FileSignature size={20} className="text-blue-600"/> Pratinjau Dokumen {aktaTitle}
              </h2>
              <button 
                type="button"
                onClick={() => setIsPreviewOpen(false)} 
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-200 p-4">
               <RUPSDocumentPreview data={companyData} customBlocks={aktaBlocks} />
            </div>
            <div className="bg-white border-t border-slate-200 p-4 flex justify-end px-6 shrink-0 gap-3">
               <button 
                type="button"
                onClick={() => setIsPreviewOpen(false)} 
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
               >
                 Tutup
               </button>
               <button 
                type="button"
                onClick={handleDownload} 
                disabled={isDownloading}
                className="px-4 py-2 text-xs font-bold bg-[#1b449c] hover:bg-[#13327d] text-white rounded-lg flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
               >
                  {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16}/>}
                  Download DOCX
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
