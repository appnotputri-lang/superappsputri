import React, { useState, useRef } from 'react';
import { Deed } from '../../../types';
import { Printer, Search, Download, Share2, Loader2 } from 'lucide-react';
import { printElement } from '../../utils/printHelper';
import { exportDeedReportToPdf } from '../../utils/notaryPdfExport';
import { getSignatureImage } from '../../utils/signatureUtils';

interface DeedReportProps {
  month: number;
  year: number;
  deeds: Deed[];
  signatureDate: string;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// NOTE: This is a READ-ONLY monthly report/print view — matches the legacy
// "copy notaris" app, where Laporan Notaris only displays and prints data
// already entered via "Buku Daftar Akta". Do not add input/edit/delete here;
// data entry belongs in src/features/notary-books/DeedBook.tsx.
export const DeedReport: React.FC<DeedReportProps> = ({
  month,
  year,
  deeds,
  signatureDate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Filter deeds for current month and year
  const filteredDeeds = deeds
    .filter(d => {
      if (!d.date) return false;
      const dateObj = new Date(d.date);
      const m = dateObj.getMonth() + 1;
      const y = dateObj.getFullYear();
      const matchPeriod = m === month && y === year;

      if (!matchPeriod) return false;

      if (!searchTerm) return true;
      const query = searchTerm.toLowerCase();
      const titleMatch = d.title?.toLowerCase().includes(query);
      const numMatch = d.number?.toLowerCase().includes(query);
      const appearerMatch = d.appearers?.some(a => a.name?.toLowerCase().includes(query));
      return titleMatch || numMatch || appearerMatch;
    })
    .sort((a, b) => {
      const orderA = parseInt(a.orderNumber || '0', 10);
      const orderB = parseInt(b.orderNumber || '0', 10);
      
      if (!isNaN(orderA) && !isNaN(orderB) && orderA !== orderB) {
        return orderA - orderB;
      }
      
      // Fallback 1: Date
      if (a.date !== b.date) {
        return (a.date || '').localeCompare(b.date || '');
      }
      
      // Fallback 2: Monthly Number
      const numA = parseInt(a.number || '0', 10);
      const numB = parseInt(b.number || '0', 10);
      return numA - numB;
    });

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    printElement(printRef.current, `Laporan_Bulanan_Akta_${month}_${year}`);
  };

  const monthName = MONTH_NAMES[month - 1] || '';

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await exportDeedReportToPdf({
        monthName,
        year,
        deeds: filteredDeeds,
        signatureDate
      }, 'download');
    } catch (e) {
      console.error(e);
      alert('Gagal mengunduh PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      await exportDeedReportToPdf({
        monthName,
        year,
        deeds: filteredDeeds,
        signatureDate
      }, 'share');
    } catch (e) {
      console.error(e);
      alert('Gagal memproses PDF.');
    } finally {
      setIsSharing(false);
    }
  };

  const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parts[0];
      const m = parseInt(parts[1], 10) - 1;
      const d = parts[2].padStart(2, '0');
      return `${d} ${MONTH_NAMES[m] || ''} ${y}`;
    }
    return dateStr;
  };

  const formatGrantorName = (gName: string) => {
    const trimmed = gName.trim().toUpperCase();
    if (trimmed.startsWith('QQ ') || trimmed.startsWith('QQ.')) {
      return trimmed;
    }
    return `QQ ${trimmed}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari akta, nomor, nama..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {isDownloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            Download PDF
          </button>
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSharing ? <Loader2 size={15} className="animate-spin" /> : <Share2 size={15} />}
            Share
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer size={15} />
            Cetak
          </button>
        </div>
      </div>

      {/* Main Report Document Sheet */}
      <div ref={printRef} className="bg-white p-6 md:p-10 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0">
        {/* Document Title Header - Left Aligned */}
        <div className="text-left mb-6 font-sans">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide leading-tight">
            SALINAN DAFTAR AKTA-AKTA NOTARIS NUKANTINI PUTRI PARINCHA,SH.M.KN
          </h2>
          <p className="text-sm font-bold text-slate-900 uppercase mt-0.5">
            BULAN {monthName.toUpperCase()} {year}
          </p>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse border border-black font-sans">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-bold uppercase text-[11px] leading-tight">
                <th className="border border-black p-2 text-center w-20">NO. URUT</th>
                <th className="border border-black p-2 text-center w-24">NO. BULANAN</th>
                <th className="border border-black p-2 text-center w-28">TANGGAL</th>
                <th className="border border-black p-2 text-left min-w-[220px]">SIFAT AKTA</th>
                <th className="border border-black p-2 text-left min-w-[240px]">NAMA PENGHADAP</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeeds.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-black p-8 text-center text-slate-400 italic">
                    Tidak ada data akta untuk periode bulan {monthName} {year}.
                  </td>
                </tr>
              ) : (
                filteredDeeds.map((deed, idx) => (
                  <tr key={deed.id} className="hover:bg-slate-50/80 transition-colors uppercase text-[11px]">
                    <td className="border border-black p-2 text-center font-normal text-slate-900">
                      {deed.orderNumber || deed.number}
                    </td>
                    <td className="border border-black p-2 text-center font-normal text-slate-900">
                      {deed.number || (idx + 1)}
                    </td>
                    <td className="border border-black p-2 text-center font-normal text-slate-900">{formatDateIndo(deed.date)}</td>
                    <td className="border border-black p-2 font-semibold text-slate-900 leading-snug">{deed.title?.toUpperCase()}</td>
                    <td className="border border-black p-2 font-normal text-slate-900 leading-snug">
                      {deed.appearers && deed.appearers.length > 0 ? (
                        <div className="space-y-1.5">
                          {deed.appearers.map((app, i) => {
                            const isBoth = app.role === 'Both';
                            const isProxy = app.role === 'Proxy';

                            const grantors = (app.grantors && app.grantors.length > 0)
                              ? app.grantors
                              : ((isProxy || isBoth) && deed.grantors && deed.grantors.length > 0 ? deed.grantors : []);

                            const appNameUpper = app.name?.trim().toUpperCase();

                            if (isBoth) {
                              return (
                                <div key={i} className="space-y-0.5">
                                  <div className="font-bold">{appNameUpper}</div>
                                  <div className="font-bold">{appNameUpper}</div>
                                  {grantors.map((g, gIdx) => (
                                    <div key={gIdx} className="font-normal pl-3">
                                      {formatGrantorName(g.name)}
                                    </div>
                                  ))}
                                </div>
                              );
                            } else if (isProxy) {
                              return (
                                <div key={i} className="space-y-0.5">
                                  <div className="font-bold">{appNameUpper}</div>
                                  {grantors.map((g, gIdx) => (
                                    <div key={gIdx} className="font-normal pl-3">
                                      {formatGrantorName(g.name)}
                                    </div>
                                  ))}
                                </div>
                              );
                            } else {
                              return (
                                <div key={i} className="space-y-0.5">
                                  <div className="font-bold">{appNameUpper}</div>
                                  {app.position && (
                                    <div className="text-[10px] font-normal">{app.position.toUpperCase()}</div>
                                  )}
                                </div>
                              );
                            }
                          })}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic font-normal">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Signature Footer Section */}
        <div className="mt-12 flex justify-end text-xs font-sans text-slate-900">
          <div className="text-left w-80 space-y-1">
            <p>Salinan Daftar Akta-Akta yang telah dibuat oleh saya,</p>
            <p>Notaris, selama Bulan {monthName} {year}.</p>
            <p className="pt-2">{signatureDate ? (signatureDate.includes('Bandung') ? signatureDate : `Bandung Barat, ${signatureDate}`) : `Bandung Barat, 28 ${monthName} ${year}`}</p>

            <div className="relative h-28 my-1 flex items-center">
              <div className="absolute -left-4 -top-8 w-44 h-44 pointer-events-none select-none z-0">
                <img
                  src={getSignatureImage()}
                  alt="Cap Stempel dan Tanda Tangan Notaris"
                  className="w-full h-full object-contain mix-blend-multiply opacity-95"
                />
              </div>
            </div>

            <p className="font-bold underline uppercase text-xs tracking-wide pt-2 z-10 relative">
              NUKANTINI PUTRI PARINCHA,SH.M.KN
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
