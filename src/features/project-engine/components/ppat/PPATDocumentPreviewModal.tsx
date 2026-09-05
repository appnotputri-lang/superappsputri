import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Download, FileText, Loader2, ZoomIn, ZoomOut, FileCheck } from 'lucide-react';
import { renderAsync } from 'docx-preview';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Project, PPATData, PPATDocumentItem } from '../../../../domain/project/Project';
import { generateAnyPPATDocx, generateAnyPPATDocxBlob } from './generatePPATDocx';
import { isPPATSurat } from './ppatDocTypes';

// Helper functions to sanitize oklch/oklab color values during HTML to Canvas cloning (for PDF generation)
function replaceOklchWithRgb(value: string): string {
  if (!value) return value;
  
  // oklch(L C H) or oklch(L C H / A)
  const oklchRegex = /oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/gi;
  // oklab(L a b) or oklab(L a b / A)
  const oklabRegex = /oklab\(\s*([\d.]+%?)\s+([\d.+-]+)\s+([\d.+-]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/gi;
  
  let result = value;

  result = result.replace(oklchRegex, (match, lStr, cStr, hStr, aStr) => {
    try {
      const LVal = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
      const CVal = parseFloat(cStr);
      const HVal = parseFloat(hStr);
      let AVal = 1;
      if (aStr) {
        AVal = aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr);
      }

      const hRad = (HVal * Math.PI) / 180;
      const aCoord = CVal * Math.cos(hRad);
      const bCoord = CVal * Math.sin(hRad);

      const l_ = LVal + 0.3963377774 * aCoord + 0.2158037573 * bCoord;
      const m_ = LVal - 0.1055613458 * aCoord - 0.0638541728 * bCoord;
      const s_ = LVal - 0.0894841775 * aCoord - 1.2914855480 * bCoord;

      const lVal = Math.pow(Math.max(0, l_), 3);
      const mVal = Math.pow(Math.max(0, m_), 3);
      const sVal = Math.pow(Math.max(0, s_), 3);

      const rLin = +4.0767416621 * lVal - 3.3077115913 * mVal + 0.2309699292 * sVal;
      const gLin = -1.2684380046 * lVal + 2.6097574011 * mVal - 0.3413193965 * sVal;
      const bLin = -0.0041960863 * lVal - 0.7034186147 * mVal + 1.7076147010 * sVal;

      const gamma = (c: number) => {
        return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
      };

      const rColor = Math.min(255, Math.max(0, Math.round(gamma(rLin) * 255)));
      const gColor = Math.min(255, Math.max(0, Math.round(gamma(gLin) * 255)));
      const bColor = Math.min(255, Math.max(0, Math.round(gamma(bLin) * 255)));

      return AVal === 1 ? `rgb(${rColor}, ${gColor}, ${bColor})` : `rgba(${rColor}, ${gColor}, ${bColor}, ${AVal})`;
    } catch {
      return 'rgb(0, 0, 0)';
    }
  });

  result = result.replace(oklabRegex, (match, lStr, aStr, bStr, aStr2) => {
    try {
      const LVal = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
      const aCoord = parseFloat(aStr);
      const bCoord = parseFloat(bStr);
      let AVal = 1;
      if (aStr2) {
        AVal = aStr2.endsWith('%') ? parseFloat(aStr2) / 100 : parseFloat(aStr2);
      }

      const l_ = LVal + 0.3963377774 * aCoord + 0.2158037573 * bCoord;
      const m_ = LVal - 0.1055613458 * aCoord - 0.0638541728 * bCoord;
      const s_ = LVal - 0.0894841775 * aCoord - 1.2914855480 * bCoord;

      const lVal = Math.pow(Math.max(0, l_), 3);
      const mVal = Math.pow(Math.max(0, m_), 3);
      const sVal = Math.pow(Math.max(0, s_), 3);

      const rLin = +4.0767416621 * lVal - 3.3077115913 * mVal + 0.2309699292 * sVal;
      const gLin = -1.2684380046 * lVal + 2.6097574011 * mVal - 0.3413193965 * sVal;
      const bLin = -0.0041960863 * lVal - 0.7034186147 * mVal + 1.7076147010 * sVal;

      const gamma = (c: number) => {
        return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
      };

      const rColor = Math.min(255, Math.max(0, Math.round(gamma(rLin) * 255)));
      const gColor = Math.min(255, Math.max(0, Math.round(gamma(gLin) * 255)));
      const bColor = Math.min(255, Math.max(0, Math.round(gamma(bLin) * 255)));

      return AVal === 1 ? `rgb(${rColor}, ${gColor}, ${bColor})` : `rgba(${rColor}, ${gColor}, ${bColor}, ${AVal})`;
    } catch {
      return 'rgb(0, 0, 0)';
    }
  });

  return result;
}

function sanitizeOklchInClone(originalContainer: HTMLElement, clonedContainer: HTMLElement) {
  const originalEls = Array.from(originalContainer.querySelectorAll('*')) as HTMLElement[];
  const clonedEls = Array.from(clonedContainer.querySelectorAll('*')) as HTMLElement[];

  originalEls.unshift(originalContainer);
  clonedEls.unshift(clonedContainer);

  const length = Math.min(originalEls.length, clonedEls.length);

  for (let i = 0; i < length; i++) {
    const origEl = originalEls[i];
    const cloneEl = clonedEls[i];
    if (!origEl || !cloneEl) continue;

    try {
      const computed = window.getComputedStyle(origEl);
      
      const propertiesToConvert = [
        'color',
        'backgroundColor',
        'borderColor',
        'borderTopColor',
        'borderRightColor',
        'borderBottomColor',
        'borderLeftColor',
        'outlineColor',
        'textDecorationColor',
        'boxShadow'
      ];

      for (const prop of propertiesToConvert) {
        const val = computed[prop as any];
        if (val && (val.toLowerCase().includes('oklch') || val.toLowerCase().includes('oklab'))) {
          const convertedVal = replaceOklchWithRgb(val);
          cloneEl.style[prop as any] = convertedVal;
        }
      }
    } catch (e) {
      console.warn('Failed to sanitize style for element', origEl, e);
    }
  }
}

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
  const [previewReady, setPreviewReady] = useState<boolean>(false);
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
    setPreviewReady(false);
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
          if (isMounted) {
            setPreviewReady(true);
          }
        }
      } catch (err: any) {
        console.error('Error rendering document preview:', err);
        if (isMounted) {
          setErrorMsg(err?.message || 'Gagal merender pratinjau dokumen.');
          setPreviewReady(false);
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
      // Robust detection of actual rendered document pages produced by docx-preview
      const getRenderedPages = (): HTMLElement[] => {
        if (!containerRef.current) return [];
        
        // 1. In docx-preview, every rendered page is an individual <section> tag inside the wrapper.
        const allSections = Array.from(containerRef.current.querySelectorAll('section')) as HTMLElement[];
        
        const validSections = allSections.filter((sec) => {
          if (!sec || sec.tagName !== 'SECTION') return false;
          // Do not select an ancestor section if it somehow wraps another section
          if (sec.querySelector('section')) return false;
          
          // Must have substantive content (text or elements)
          const text = sec.textContent?.trim() || '';
          const hasElements = sec.querySelector('article, p, table, img, svg, span, div') !== null;
          return text.length > 0 || hasElements;
        });

        if (validSections.length > 0) {
          return validSections;
        }
        
        // 2. Fallback: Search children inside the docx wrapper, strictly filtering out <style>, <script>, <link>
        const wrapper = containerRef.current.querySelector('div[class*="wrapper"]') || containerRef.current;
        const candidates = Array.from(wrapper.children) as HTMLElement[];
        const validCandidates = candidates.filter((el) => {
          if (!el) return false;
          const tag = el.tagName.toUpperCase();
          if (tag === 'STYLE' || tag === 'SCRIPT' || tag === 'LINK' || tag === 'NOSCRIPT') return false;
          const text = el.textContent?.trim() || '';
          const hasElements = el.querySelector('article, p, table, img, svg, span, div') !== null;
          return (text.length > 0 || hasElements) && (el.offsetWidth > 50 || el.offsetHeight > 50);
        });

        return validCandidates;
      };

      const sections = getRenderedPages();
      if (!sections || sections.length === 0) {
        alert('Dokumen belum selesai dimuat atau render kosong.');
        return;
      }

      // Legal size: 8.5 in x 14 in = 215.9 mm x 355.6 mm
      const pdfFormat: [number, number] | string = isSurat ? [215.9, 355.6] : 'a4';

      let pdf: jsPDF | null = null;
      let pagesAdded = 0;

      for (let i = 0; i < sections.length; i++) {
        const sectionEl = sections[i] as HTMLElement;
        if (!sectionEl) continue;

        // Render each distinct page element into its own sharp canvas
        const canvas = await html2canvas(sectionEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc, clonedElement) => {
            // 1. Reset all scroll offsets in cloned window & document
            if (clonedDoc.defaultView) {
              clonedDoc.defaultView.scrollTo(0, 0);
            }
            clonedDoc.documentElement.scrollTop = 0;
            clonedDoc.documentElement.scrollLeft = 0;
            clonedDoc.body.scrollTop = 0;
            clonedDoc.body.scrollLeft = 0;

            // 2. Hide other sections in the clone so target element sits cleanly from top (0,0) without offset
            const allClonedSections = Array.from(clonedDoc.querySelectorAll('section')) as HTMLElement[];
            allClonedSections.forEach((s) => {
              if (s !== clonedElement && !s.contains(clonedElement) && !clonedElement.contains(s)) {
                s.style.display = 'none';
              }
            });

            // 3. Reset any transform (zoom level), margins, padding, and overflow constraints on ancestors
            let ancestor = (clonedElement as HTMLElement)?.parentElement;
            while (ancestor && ancestor !== clonedDoc.body && ancestor !== clonedDoc.documentElement) {
              ancestor.style.transform = 'none';
              ancestor.style.webkitTransform = 'none';
              ancestor.style.overflow = 'visible';
              ancestor.style.padding = '0';
              ancestor.style.margin = '0';
              ancestor.scrollTop = 0;
              ancestor.scrollLeft = 0;
              ancestor = ancestor.parentElement;
            }

            // 4. Remove UI card decoration (drop-shadow, border, preview radius) from the page element
            if (clonedElement) {
              const targetEl = clonedElement as HTMLElement;
              targetEl.style.transform = 'none';
              targetEl.style.webkitTransform = 'none';
              targetEl.style.margin = '0 auto';
              targetEl.style.boxShadow = 'none';
              targetEl.style.border = 'none';
              targetEl.style.borderRadius = '0';

              // 5. Sanitize modern CSS colors (oklch/oklab) on cloned DOM
              sanitizeOklchInClone(sectionEl, targetEl);
            }
          }
        });

        // Skip any invalid or empty canvases
        if (!canvas || canvas.width === 0 || canvas.height === 0) {
          continue;
        }

        const imgData = canvas.toDataURL('image/jpeg', 0.98);

        // Initialize jsPDF on the first valid page to avoid any initial empty pages
        if (!pdf) {
          pdf = new jsPDF({
            unit: 'mm',
            format: pdfFormat,
            orientation: 'portrait'
          });
        } else {
          pdf.addPage(pdfFormat, 'portrait');
        }

        pagesAdded++;

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasAspect = canvas.height / canvas.width;
        const pageAspect = pdfHeight / pdfWidth;

        let renderWidth = pdfWidth;
        let renderHeight = pdfHeight;
        let xOffset = 0;
        let yOffset = 0;

        // If content is slightly taller than legal ratio, fit height to prevent bottom cutoff
        if (canvasAspect > pageAspect) {
          renderHeight = pdfHeight;
          renderWidth = pdfHeight / canvasAspect;
          xOffset = (pdfWidth - renderWidth) / 2;
        } else if (canvasAspect < pageAspect) {
          renderWidth = pdfWidth;
          renderHeight = pdfWidth * canvasAspect;
          yOffset = 0;
        } else {
          renderWidth = pdfWidth;
          renderHeight = pdfHeight;
        }

        pdf.addImage(imgData, 'JPEG', xOffset, yOffset, renderWidth, renderHeight, undefined, 'FAST');
      }

      if (!pdf || pagesAdded === 0) {
        alert('Gagal menghasilkan halaman dokumen PDF.');
        return;
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
              disabled={downloadingPdf || !previewReady}
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
        .ppat-docx-container .docx-wrapper,
        .ppat-docx-container div[class*="wrapper"] {
          background-color: transparent !important;
          padding: 1rem 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 2rem !important;
        }
        .ppat-docx-container .docx-wrapper > section.docx,
        .ppat-docx-container div[class*="wrapper"] > section,
        .ppat-docx-container section {
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
          .ppat-docx-container .docx-wrapper > section.docx,
          .ppat-docx-container div[class*="wrapper"] > section,
          .ppat-docx-container section {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};
