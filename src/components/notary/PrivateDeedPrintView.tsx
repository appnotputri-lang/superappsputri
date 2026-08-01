import React, { useState, useRef } from 'react';
import { PrivateDeed } from '../../../types';
import { Printer, Search, Download, Share2, Loader2, CheckCircle2, AlertCircle, ExternalLink, X } from 'lucide-react';
import { printElement } from '../../utils/printHelper';
import { exportPrivateDeedReportToPdf } from '../../utils/notaryPdfExport';
import { getSignatureImage } from '../../utils/signatureUtils';
import { saveReportToDrive } from '../../services/reportDriveService';

interface PrivateDeedPrintViewProps {
  month: number;
  year: number;
  type: 'Legalisasi' | 'Waarmerking';
  privateDeeds: PrivateDeed[];
  signatureDate: string;
  showStamp?: boolean;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const formatDateIndo = (dateStr: string) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parts[0];
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const mName = MONTH_NAMES[m - 1] || '';
    return `${d} ${mName} ${y}`;
  }
  return dateStr;
};

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
  signatureDate,
  showStamp = false
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
        signatureDate,
        showStamp
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
        signatureDate,
        showStamp
      }, 'share');
    } catch (e) {
      console.error(e);
      alert('Gagal memproses PDF.');
    } finally {
      setIsSharing(false);
    }
  };

  const [isSavingDrive, setIsSavingDrive] = useState(false);
  const [driveProgress, setDriveProgress] = useState('');
  const [driveResult, setDriveResult] = useState<{ success: boolean; message: string; link?: string } | null>(null);

  const handleSaveDrive = async () => {
    setIsSavingDrive(true);
    setDriveProgress('Mempersiapkan PDF...');
    setDriveResult(null);
    try {
      const pdfBlob = await exportPrivateDeedReportToPdf({
        monthName,
        year,
        type,
        items: filteredItems,
        signatureDate,
        showStamp
      }, 'blob');

      if (!pdfBlob) throw new Error('Gagal membuat PDF Blob.');

      const tabName = type === 'Legalisasi' ? 'Daftar Legalisasi' : 'Daftar Waarmerking';

      const result = await saveReportToDrive(
        pdfBlob as Blob,
        { month, year, signatureDate },
        tabName,
        (msg) => setDriveProgress(msg)
      );

      setDriveResult({
        success: true,
        message: 'Laporan berhasil disimpan ke Google Drive.',
        link: result.webViewLink
      });
    } catch (e: any) {
      console.error(e);
      setDriveResult({
        success: false,
        message: 'Gagal menyimpan laporan ke Google Drive.'
      });
    } finally {
      setIsSavingDrive(false);
      setDriveProgress('');
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
            Export PDF
          </button>
          <button
            onClick={handleSaveDrive}
            disabled={isSavingDrive}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSavingDrive ? <Loader2 size={15} className="animate-spin" /> : <span>📁</span>}
            {isSavingDrive ? (driveProgress || 'Menyimpan...') : 'Simpan Google Drive'}
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

      {driveResult && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
          driveResult.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {driveResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{driveResult.message}</span>
          </div>
          <div className="flex items-center gap-2">
            {driveResult.link && (
              <a
                href={driveResult.link}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-[11px] flex items-center gap-1"
              >
                <ExternalLink size={13} />
                Buka di Drive
              </a>
            )}
            <button
              onClick={() => setDriveResult(null)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Main Document Sheet */}
      <div ref={printRef} className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0">
        <div className="text-left mb-6">
          <h2 className="text-sm font-bold text-slate-900">
            Salinan Daftar Surat di bawah tangan yang {type === 'Legalisasi' ? 'disahkan' : 'dibukukan'}, Bulan {monthName} {year}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold">
                <th className="border border-slate-300 p-2 text-center w-36">No.</th>
                <th className="border border-slate-300 p-2 text-center w-36">Tanggal Pembukuan</th>
                <th className="border border-slate-300 p-2 min-w-[200px] text-center">Nama yang menandatangani atau membubuhi cap jari</th>
                <th className="border border-slate-300 p-2 min-w-[200px] text-center">Tanggal dan Isi singkat</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td className="border border-slate-300 p-2 text-center font-bold text-slate-800">-NIHIL-</td>
                  <td className="border border-slate-300 p-2 text-center font-bold text-slate-800">-NIHIL-</td>
                  <td className="border border-slate-300 p-2 text-center font-bold text-slate-800">-NIHIL-</td>
                  <td className="border border-slate-300 p-2 text-center font-bold text-slate-800">-NIHIL-</td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="border border-slate-300 p-2 text-center font-bold text-slate-800">{item.number || '-'}</td>
                    <td className="border border-slate-300 p-2 text-center text-slate-600">{formatDateIndo(item.registrationDate || '')}</td>
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
                    <td className="border border-slate-300 p-2 text-slate-800">
                      <div className="font-medium">{item.description}</div>
                      {item.notes && <div className="text-[11px] text-slate-500 mt-1">{item.notes}</div>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Signature Footer */}
        <div className="mt-8 flex justify-end text-xs font-sans text-slate-900">
          <div className="text-left w-80 space-y-1">
            <p>Bandung Barat, {signatureDate || `${monthName} ${year}`}</p>
            <p>Notaris di Kabupaten Bandung Barat,</p>

            <div className="relative h-28 my-1 flex items-center">
              {showStamp && (
                <div className="absolute -left-4 -top-8 w-44 h-44 pointer-events-none select-none z-0">
                  <img
                    src={getSignatureImage()}
                    alt="Cap Stempel dan Tanda Tangan Notaris"
                    className="w-full h-full object-contain mix-blend-multiply opacity-95"
                  />
                </div>
              )}
            </div>

            <p className="font-bold underline text-xs tracking-wide pt-2 z-10 relative">
              NUKANTINI PUTRI PARINCHA, SH., M.Kn
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
