import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Printer,
  FileText,
  ArrowLeft,
  RotateCcw,
  Loader2,
  AlertCircle,
  MoreVertical,
  Check,
  Search
} from 'lucide-react';

// Polyfill Promise.withResolvers if not present in older runtime
if (typeof (Promise as any).withResolvers === 'undefined') {
  (Promise as any).withResolvers = function () {
    let resolve: any, reject: any;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// Configure PDF.js worker
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
  }
}

interface InvoicePdfViewerProps {
  pdfBlob: Blob | null;
  fileName?: string;
  onDownload?: () => void;
  onPrint?: () => void;
  onBack?: () => void;
  isDownloading?: boolean;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

interface PageRenderItemProps {
  pageNumber: number;
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  scale: number;
}

const PageRenderItem: React.FC<PageRenderItemProps> = ({ pageNumber, pdfDoc, scale }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        const pixelRatio = window.devicePixelRatio || 1;
        // Viewport for display CSS dimensions
        const displayViewport = page.getViewport({ scale });
        // Viewport for canvas pixel buffer (multiplied by devicePixelRatio for razor-sharp rendering)
        const renderViewport = page.getViewport({ scale: scale * pixelRatio });

        setPageSize({ width: displayViewport.width, height: displayViewport.height });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;

        // Cancel previous render task on scale change
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // ignore
          }
        }

        canvas.width = Math.floor(renderViewport.width);
        canvas.height = Math.floor(renderViewport.height);
        canvas.style.width = `${Math.floor(displayViewport.width)}px`;
        canvas.style.height = `${Math.floor(displayViewport.height)}px`;

        const renderContext = {
          canvasContext: context,
          viewport: renderViewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`Error rendering page ${pageNumber}:`, err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [pageNumber, pdfDoc, scale]);

  return (
    <div
      className="bg-white shadow-[0_4px_24px_rgba(0,0,0,0.14),0_1px_4px_rgba(0,0,0,0.08)] rounded-sm border border-slate-300/80 overflow-hidden"
      style={{
        width: pageSize ? `${Math.floor(pageSize.width)}px` : undefined,
        height: pageSize ? `${Math.floor(pageSize.height)}px` : undefined,
      }}
    >
      <canvas ref={canvasRef} className="block mx-auto" />
    </div>
  );
};

const ZOOM_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export const InvoicePdfViewer: React.FC<InvoicePdfViewerProps> = ({
  pdfBlob,
  fileName = 'Invoice.pdf',
  onDownload,
  onPrint,
  onBack,
  isDownloading = false,
  isLoading = false,
  error = null,
  onRetry,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [internalLoading, setInternalLoading] = useState<boolean>(true);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  const [showZoomMenu, setShowZoomMenu] = useState<boolean>(false);
  const [fitMode, setFitMode] = useState<'width' | 'custom'>('custom');

  // Load PDF document from blob
  useEffect(() => {
    let isCancelled = false;

    if (!pdfBlob) {
      setPdfDoc(null);
      setNumPages(0);
      return;
    }

    const loadPdf = async () => {
      setInternalLoading(true);
      setInternalError(null);

      try {
        const arrayBuffer = await pdfBlob.arrayBuffer();
        if (isCancelled) return;

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);

        // Calculate initial scale: on mobile default to Fit Width, on desktop default to 100% or fit if small
        const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
        const firstPage = await doc.getPage(1);
        const defaultViewport = firstPage.getViewport({ scale: 1 });

        if (containerWidth < 768) {
          // Mobile: automatically fit to screen width with 32px margins
          const targetWidth = Math.max(280, containerWidth - 32);
          const calculatedScale = targetWidth / defaultViewport.width;
          setScale(Math.min(1.4, Math.max(0.35, Number(calculatedScale.toFixed(2)))));
          setFitMode('width');
        } else {
          // Desktop
          if (defaultViewport.width > containerWidth - 80) {
            const calculatedScale = (containerWidth - 80) / defaultViewport.width;
            setScale(Number(calculatedScale.toFixed(2)));
            setFitMode('width');
          } else {
            setScale(1.0);
            setFitMode('custom');
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Failed to load PDF document:', err);
          setInternalError(err?.message || 'Gagal memproses dokumen PDF.');
        }
      } finally {
        if (!isCancelled) {
          setInternalLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [pdfBlob]);

  // Fit to Width Handler
  const handleFitWidth = useCallback(async () => {
    if (!pdfDoc || !containerRef.current) return;
    try {
      const firstPage = await pdfDoc.getPage(1);
      const defaultViewport = firstPage.getViewport({ scale: 1 });
      const containerWidth = containerRef.current.clientWidth;
      const padding = containerWidth < 640 ? 32 : 48;
      const targetWidth = containerWidth - padding;
      const newScale = Math.min(2.5, Math.max(0.35, targetWidth / defaultViewport.width));
      setScale(Number(newScale.toFixed(2)));
      setFitMode('width');
      setShowMoreMenu(false);
      setShowZoomMenu(false);
    } catch (e) {
      console.error('Fit width error:', e);
    }
  }, [pdfDoc]);

  // Window resize observer to adapt Fit Width automatically
  useEffect(() => {
    let timeoutId: any = null;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (fitMode === 'width' && pdfDoc && containerRef.current) {
          handleFitWidth();
        }
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [fitMode, pdfDoc, handleFitWidth]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        if (onPrint) {
          e.preventDefault();
          onPrint();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPrint]);

  // Zoom In Handler
  const handleZoomIn = () => {
    setScale((prev) => {
      const next = Math.min(2.5, Number((prev + 0.15).toFixed(2)));
      setFitMode('custom');
      return next;
    });
    setShowZoomMenu(false);
  };

  // Zoom Out Handler
  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(0.4, Number((prev - 0.15).toFixed(2)));
      setFitMode('custom');
      return next;
    });
    setShowZoomMenu(false);
  };

  // Set Preset Zoom Handler
  const handleSetZoomPreset = (newScale: number) => {
    setScale(newScale);
    setFitMode('custom');
    setShowZoomMenu(false);
    setShowMoreMenu(false);
  };

  // Reset Zoom Handler
  const handleResetZoom = () => {
    setScale(1.0);
    setFitMode('custom');
    setShowMoreMenu(false);
    setShowZoomMenu(false);
  };

  const activeLoading = isLoading || internalLoading;
  const activeError = error || internalError;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#e9ecf0] text-slate-800 font-sans select-none overflow-hidden">
      {/* 1. TOP TOOLBAR - Google Drive Minimal Aesthetic */}
      <header className="h-14 bg-slate-900 text-white flex items-center justify-between px-3 sm:px-5 shadow-md shrink-0 border-b border-slate-800 z-20">
        {/* Left Section: Back button & Document Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-full hover:bg-slate-800 active:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Kembali"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-red-600/90 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1
                className="text-xs sm:text-sm font-semibold text-slate-100 truncate max-w-[140px] xs:max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg"
                title={fileName}
              >
                {fileName}
              </h1>
              {numPages > 0 && (
                <p className="text-[10px] text-slate-400 font-medium">
                  {numPages} {numPages > 1 ? 'Halaman' : 'Halaman'} • A4 PDF
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Center/Right Section: Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Zoom Controls */}
          <div className="relative flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700/60 shadow-xs">
            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.45}
              className="p-1.5 sm:p-2 rounded-md hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Perkecil (-)"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowZoomMenu(!showZoomMenu)}
              className="px-2 py-1 text-xs font-mono font-semibold text-slate-200 hover:text-white hover:bg-slate-700 rounded transition-colors cursor-pointer flex items-center gap-1"
              title="Pilih Zoom Level"
            >
              <span>{Math.round(scale * 100)}%</span>
            </button>

            <button
              onClick={handleZoomIn}
              disabled={scale >= 2.45}
              className="p-1.5 sm:p-2 rounded-md hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Perbesar (+)"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            {/* Zoom dropdown popover */}
            {showZoomMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowZoomMenu(false)}
                />
                <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 w-32 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-40 text-xs text-slate-200">
                  <button
                    onClick={handleFitWidth}
                    className={`w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between cursor-pointer ${
                      fitMode === 'width' ? 'text-blue-400 font-bold' : ''
                    }`}
                  >
                    <span>Fit Width</span>
                    {fitMode === 'width' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <div className="my-1 border-t border-slate-800" />
                  {ZOOM_PRESETS.map((p) => {
                    const isCurrent = Math.round(scale * 100) === Math.round(p * 100) && fitMode !== 'width';
                    return (
                      <button
                        key={p}
                        onClick={() => handleSetZoomPreset(p)}
                        className={`w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between cursor-pointer ${
                          isCurrent ? 'text-blue-400 font-bold' : ''
                        }`}
                      >
                        <span>{Math.round(p * 100)}%</span>
                        {isCurrent && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Fit Width Button */}
          <button
            onClick={handleFitWidth}
            className={`p-2 rounded-lg transition-colors cursor-pointer hidden sm:flex items-center gap-1.5 text-xs font-medium border ${
              fitMode === 'width'
                ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                : 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700 border-slate-700/60'
            }`}
            title="Sesuaikan Lebar Layar (Fit Width)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Fit Width</span>
          </button>

          <div className="h-6 w-px bg-slate-700/80 mx-1 hidden sm:block" />

          {/* Print Button */}
          {onPrint && (
            <button
              onClick={onPrint}
              className="p-2 sm:px-3 sm:py-2 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium border border-slate-700/60 shadow-xs"
              title="Cetak PDF (Ctrl+P)"
              aria-label="Print"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span className="hidden sm:inline">Print</span>
            </button>
          )}

          {/* Download Button */}
          {onDownload && (
            <button
              onClick={onDownload}
              disabled={isDownloading}
              className="p-2 sm:px-3 sm:py-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold border border-blue-500 shadow-xs disabled:opacity-60"
              title="Unduh PDF Resmi"
              aria-label="Download"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Download</span>
            </button>
          )}

          {/* More options menu dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Opsi lainnya"
              aria-label="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMoreMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowMoreMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1.5 z-40 text-xs text-slate-200">
                  <button
                    onClick={handleFitWidth}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Sesuaikan Lebar (Fit Width)</span>
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ukuran Asli (100%)</span>
                  </button>
                  <div className="my-1 border-t border-slate-800" />
                  {onPrint && (
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        onPrint();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer sm:hidden"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-400" />
                      <span>Cetak Dokumen</span>
                    </button>
                  )}
                  {onDownload && (
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        onDownload();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer sm:hidden text-blue-400 font-bold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. PDF VIEWER CONTENT AREA */}
      <main
        ref={containerRef}
        className="flex-1 overflow-auto bg-[#e9ecf0] p-4 sm:p-6 md:p-8 flex flex-col items-center"
      >
        {activeLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-md border border-slate-200 flex items-center justify-center mb-4">
              <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Menyiapkan dokumen...</p>
            <p className="text-xs text-slate-500 mt-1">Memuat berkas PDF resmi Notaris/PPAT</p>
          </div>
        ) : activeError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-sm w-full border border-slate-200 text-center">
              <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h2 className="text-base font-bold text-slate-800 mb-1">Gagal menampilkan invoice</h2>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                {activeError || 'Silakan coba muat ulang halaman.'}
              </p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Coba Lagi
                </button>
              )}
            </div>
          </div>
        ) : pdfDoc && numPages > 0 ? (
          <div className="flex flex-col items-center w-full max-w-full">
            {Array.from({ length: numPages }, (_, idx) => {
              const pageNumber = idx + 1;
              return (
                <div
                  key={pageNumber}
                  className="flex flex-col items-center mb-6 last:mb-2 w-full"
                >
                  <PageRenderItem
                    pageNumber={pageNumber}
                    pdfDoc={pdfDoc}
                    scale={scale}
                  />
                  {numPages > 1 && (
                    <div className="mt-2 text-[11px] font-semibold text-slate-500 bg-slate-200/80 px-2.5 py-0.5 rounded-full">
                      Halaman {pageNumber} dari {numPages}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
            <p className="text-sm text-slate-500">Tidak ada dokumen untuk ditampilkan.</p>
          </div>
        )}
      </main>
    </div>
  );
};
