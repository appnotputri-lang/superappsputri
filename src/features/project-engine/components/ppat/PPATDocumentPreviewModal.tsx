import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Download, FileText, Loader2, ZoomIn, ZoomOut, FileCheck } from 'lucide-react';
import { renderAsync } from 'docx-preview';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Project, PPATData, PPATDocumentItem } from '../../../../domain/project/Project';
import { generateAnyPPATDocx, generateAnyPPATDocxBlob } from './generatePPATDocx';
import { isPPATSurat } from './ppatDocTypes';

interface PPATDocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentItem: PPATDocumentItem;
  project: Project;
  ppatData: PPATData;
}

export const PPATDocumentPreviewModal: React.FC<PPATDocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  documentItem,
  project,
  ppatData
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const containerRef = useRef<HTMLDivElement>(null);

  const isSurat = isPPATSurat(documentItem);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);

    const renderDocument = async () => {
      try {
        const { blob } = await generateAnyPPATDocxBlob(documentItem, project, ppatData);

        if (!isMounted) return;

        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          await renderAsync(blob, containerRef.current, undefined, {
            className: 'docx-preview-content',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            ignoreLastRenderedPageBreak: false,
            useBase64URL: false
          });
        }
      } catch (err: any) {
        console.error('Error rendering document preview:', err);
        if (isMounted) {
          setErrorMsg(err?.message || 'Gagal merender pratinjau dokumen.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    renderDocument();

    return () => {
      isMounted = false;
    };
  }, [isOpen, documentItem, project, ppatData]);

  if (!isOpen) return null;

  const handleDownloadDocx = async () => {
    setDownloading(true);
    try {
      await generateAnyPPATDocx(documentItem, project, ppatData);
    } catch (err) {
      console.error('Download error:', err);
      alert('Gagal mengunduh file Word.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!containerRef.current) return;
    setDownloadingPdf(true);
    try {
      const sections = containerRef.current.querySelectorAll('section.docx');
      if (!sections || sections.length === 0) {
        alert('Dokumen belum selesai dimuat.');
        return;
      }

      // Legal size: 8.5 in x 14 in = 215.9 mm x 355.6 mm
      const pdfFormat: [number, number] | string = isSurat ? [215.9, 355.6] : 'a4';

      const pdf = new jsPDF({
        unit: 'mm',
        format: pdfFormat,
        orientation: 'portrait'
      });

      for (let i = 0; i < sections.length; i++) {
        const sectionEl = sections[i] as HTMLElement;
        const canvas = await html2canvas(sectionEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        if (i > 0) {
          pdf.addPage(pdfFormat, 'portrait');
        }

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      const cleanTitle = (documentItem.title || 'Dokumen_PPAT').replace(/[^a-zA-Z0-9_-]/g, '_');
      pdf.save(`${cleanTitle}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Gagal mengunduh file PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/75 backdrop-blur-xs overflow-hidden print:p-0 print:bg-white print:fixed-none">
      <div className="bg-slate-900 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col h-[94vh] border border-slate-800 print:h-auto print:shadow-none print:w-full print:rounded-none">
        
        {/* Header Bar */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm tracking-wide text-slate-100 truncate">
                Pratinjau Dokumen: {documentItem.title}
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>Dokumen Master PPAT ({isSurat ? 'Surat Legal 8.5"x14"' : 'Akta'})</span>
                <span className="text-slate-600">•</span>
                <span>Status: <strong className="text-amber-400 font-semibold">{documentItem.status ? documentItem.status.toUpperCase() : 'DRAFT'}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Zoom Controls */}
            <div className="hidden md:flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 mr-2">
              <button
                onClick={() => setZoomLevel((prev) => Math.max(prev - 10, 60))}
                className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                title="Perkecil"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 text-[11px] font-mono text-slate-300 min-w-[42px] text-center">
                {zoomLevel}%
              </span>
              <button
                onClick={() => setZoomLevel((prev) => Math.min(prev + 10, 150))}
                className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                title="Perbesar"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf || loading}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingPdf ? 'Memproses PDF...' : 'Unduh PDF'}</span>
            </button>

            <button
              onClick={handleDownloadDocx}
              disabled={downloading}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'Mengunduh...' : 'Unduh Word (.docx)'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
              title="Tutup Pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Container Body */}
        <div className="flex-1 overflow-y-auto bg-slate-950/90 p-4 sm:p-8 flex justify-center print:bg-white print:p-0 print:overflow-visible relative ppat-docx-container">
          
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/90 text-white gap-3 backdrop-blur-xs">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-xs font-medium text-slate-300">
                Menyiapkan pratinjau dari template DOCX resmi...
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="m-auto max-w-md p-6 bg-red-950/80 border border-red-800 rounded-xl text-center space-y-3 text-red-200">
              <p className="text-sm font-bold">Gagal Menampilkan Pratinjau</p>
              <p className="text-xs opacity-90">{errorMsg}</p>
              <button
                onClick={handleDownloadDocx}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-400 transition-colors"
              >
                Unduh DOCX Langsung
              </button>
            </div>
          )}

          <div
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            className="transition-transform duration-150 ease-out w-full flex flex-col items-center print:transform-none"
          >
            <div ref={containerRef} className="w-full flex flex-col items-center" />
          </div>
        </div>
      </div>

      {/* Embedded CSS for DOCX Preview Rendering */}
      <style>{`
        .ppat-docx-container .docx-wrapper {
          background-color: transparent !important;
          padding: 1rem 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 2rem !important;
        }
        .ppat-docx-container .docx-wrapper > section.docx {
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3) !important;
          border: 1px solid #334155 !important;
          border-radius: 4px !important;
          background-color: #ffffff !important;
          color: #0f172a !important;
          margin-bottom: 0 !important;
        }
        @media print {
          .ppat-docx-container {
            background-color: #ffffff !important;
            padding: 0 !important;
          }
          .ppat-docx-container .docx-wrapper > section.docx {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};
