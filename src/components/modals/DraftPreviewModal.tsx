import React from 'react';
import { Modal } from '../../../components/Modal';
import { ZoomOut, ZoomIn, Printer, FileCode } from 'lucide-react';
import DocumentPreview from '../../../components/DocumentPreview';
import { RUPSTDocumentPreview } from '../../RUPSTDocumentPreview';

interface DraftPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  zoom: number;
  setZoom: (val: number | ((prev: number) => number)) => void;
  handlePrint: () => void;
  handleExportWord: () => void;
  activeSidebarTab: string;
  mergedData: any;
}

export const DraftPreviewModal: React.FC<DraftPreviewModalProps> = ({
  isOpen,
  onClose,
  zoom,
  setZoom,
  handlePrint,
  handleExportWord,
  activeSidebarTab,
  mergedData
}) => {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="DRAFT DOKUMEN"
      maxWidth="max-w-7xl"
      headerColor="bg-[#3b5998] text-white"
    >
      <div className="flex flex-col items-center h-[88vh] bg-slate-200/50 rounded-b-2xl overflow-hidden relative">
        <div className="no-print sticky top-0 w-full py-4 z-40 flex justify-center gap-4 bg-white/90 backdrop-blur-md shadow-md border-b border-slate-200">
          <div className="flex bg-white rounded-full p-1 border border-slate-300 shadow-sm">
            <button 
              onClick={() => setZoom(prev => Math.max(0.4, prev - 0.1))} 
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
              title="Perkecil"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <div className="flex items-center px-4 text-sm font-bold text-slate-700 min-w-[70px] justify-center">
              {Math.round(zoom * 100)}%
            </div>
            <button 
              onClick={() => setZoom(prev => Math.min(2, prev + 0.1))} 
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
              title="Perbesar"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setZoom(1)} 
              className="px-4 text-[11px] font-bold text-blue-600 hover:bg-slate-100 rounded-full transition-colors uppercase border-l border-slate-200"
            >
              100%
            </button>
          </div>
            
          <div className="h-10 w-[1px] bg-slate-300"></div>

          <button onClick={handlePrint} className="px-8 py-2.5 bg-[#3b5998] text-white rounded-full font-bold text-[13px] flex items-center gap-2 hover:bg-[#2d4373] transition-all shadow-md group">
            <Printer className="w-4 h-4 group-hover:scale-110 transition-transform" /> Cetak / PDF
          </button>
          <button onClick={handleExportWord} className="px-8 py-2.5 bg-emerald-600 text-white rounded-full font-bold text-[13px] flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-md group">
            <FileCode className="w-4 h-4 group-hover:scale-110 transition-transform" /> Word (.docx)
          </button>
        </div>
          
        <div className="flex-1 w-full overflow-auto p-4 sm:p-8 pt-4 custom-scrollbar bg-slate-200/50">
          {activeSidebarTab === 'rupst' ? (
            <RUPSTDocumentPreview data={mergedData} />
          ) : (
            <DocumentPreview data={mergedData} showHeader={false} zoom={zoom} />
          )}
        </div>
      </div>
    </Modal>
  );
};
