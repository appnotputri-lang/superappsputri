import React, { useState, useRef } from 'react';
import { PrivateDeed } from '../../../types';
import { Printer, Search, Download, Share2, Loader2 } from 'lucide-react';
import { printElement } from '../../utils/printHelper';
import { exportPrivateDeedReportToPdf } from '../../utils/notaryPdfExport';
import { getSignatureImage } from '../../utils/signatureUtils';

interface PrivateDeedPrintViewProps {
  month: number;
  year: number;
  type: 'Legalisasi' | 'Waarmerking';
  privateDeeds: PrivateDeed[];
  signatureDate: string;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// NOTE: This is a READ-ONLY monthly report/print view — matches the legacy
// "copy notaris" app, where Laporan Notaris only displays and prints data
// already entered via "Buku Legalisasi & Waarmerking". Do not add
// input/edit/delete here; data entry belongs in
// src/features/notary-books/PrivateDeedBook.tsx.
export const PrivateDeedPrintView: React.FC<PrivateDeedPrintViewProps> = ({
  month,
  year,
  type,
  privateDeeds,
  signatureDate
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const monthName = MONTH_NAMES[month - 1] || '';

  // Filter items
  const filteredItems = privateDeeds.filter(p => {
    if (!p.registrationDate) return false;
    const dt = new Date(p.registrationDate);
    const m = dt.getMonth() + 1;
    const y = dt.getFullYear();
    const matchPeriod = m === month && y === year;
    const matchType = p.type?.toLowerCase() === type.toLowerCase();

    if (!matchPeriod || !matchType) return false;

    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return p.number?.toLowerCase().includes(q) ||
           p.description?.toLowerCase().includes(q) ||
           p.parties?.some(party => party.toLowerCase().includes(q));
  });

  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handlePrint = () => {
    printElement(printRef.current, `Laporan_${type}_${month}_${year}`);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await exportPrivateDeedReportToPdf({
        monthName,
        year,
        type,
        items: filteredItems,
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
      await exportPrivateDeedReportToPdf({
        monthName,
        year,
        type,
        items: filteredItems,
        signatureDate
      }, 'share');
    } catch (e) {
      console.error(e);
      alert('Gagal memproses PDF.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:hidden">
        <div className="relative flex-1 sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Cari nomor, sifat, atau pemohon ${type}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
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
            Cetak Laporan
          </button>
        </div>
      </div>

      {/* Main Document Sheet */}
      <div ref={printRef} className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0">
        <div className="text-center mb-6">
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">
            LAPORAN SURATAN DI BAWAH TANGAN YANG DI-{type.toUpperCase()}
          </h2>
          <p className="text-xs font-medium text-slate-600 mt-0.5">
            BULAN: {monthName.toUpperCase()} {year}
          </p>
          <p className="text-[11px] text-slate-500">Notaris & PPAT Putri, S.H., M.Kn.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold">
                <th className="border border-slate-300 p-2 text-center w-10">NO</th>
                <th className="border border-slate-300 p-2 w-32 text-center">NO. REGISTER</th>
                <th className="border border-slate-300 p-2 w-28 text-center">TANGGAL</th>
                <th className="border border-slate-300 p-2 min-w-[200px]">SIFAT DOKUMEN / SURAT</th>
                <th className="border border-slate-300 p-2 min-w-[220px]">NAMA PEMOHON / PARA PIHAK</th>
                <th className="border border-slate-300 p-2 w-32">KETERANGAN</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="border border-slate-300 p-8 text-center text-slate-400 italic">
                    Tidak ada data {type} untuk periode bulan {monthName} {year}.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="border border-slate-300 p-2 text-center font-medium text-slate-600">{idx + 1}</td>
                    <td className="border border-slate-300 p-2 text-center font-bold text-slate-800">{item.number}</td>
                    <td className="border border-slate-300 p-2 text-center text-slate-600">{item.registrationDate}</td>
                    <td className="border border-slate-300 p-2 font-semibold text-slate-900">{item.description}</td>
                    <td className="border border-slate-300 p-2 text-slate-700">
                      {item.parties && item.parties.length > 0 ? (
                        <ul className="list-disc list-inside space-y-0.5">
                          {item.parties.map((p, i) => (
                            <li key={i} className="font-medium text-slate-800">{p}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>
                    <td className="border border-slate-300 p-2 text-slate-600 text-[11px]">{item.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Signature Footer */}
        <div className="mt-8 flex justify-end text-xs font-sans text-slate-900">
          <div className="text-left w-80 space-y-1">
            <p>Jawa Barat, {signatureDate || `${monthName} ${year}`}</p>
            <p>Notaris di Jawa Barat</p>

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
              PUTRI, S.H., M.Kn.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
