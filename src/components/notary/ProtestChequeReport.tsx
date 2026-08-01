import React, { useState, useRef } from 'react';
import { ProtestCheque } from '../../../types';
import { NotaryService } from '../../services/NotaryService';
import { Plus, Edit2, Trash2, Printer, Search, X, Download, Share2, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { printElement } from '../../utils/printHelper';
import { exportProtestChequeReportToPdf } from '../../utils/notaryPdfExport';
import { getSignatureImage } from '../../utils/signatureUtils';
import { saveReportToDrive } from '../../services/reportDriveService';

interface ProtestChequeReportProps {
  month: number;
  year: number;
  protestCheques: ProtestCheque[];
  signatureDate: string;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const ProtestChequeReport: React.FC<ProtestChequeReportProps> = ({
  month,
  year,
  protestCheques,
  signatureDate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProtestCheque | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [number, setNumber] = useState('');
  const [protestDate, setProtestDate] = useState(`${year}-${month.toString().padStart(2, '0')}-01`);
  const [bankName, setBankName] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [applicantName, setApplicantName] = useState('');
  const [drawerName, setDrawerName] = useState('');
  const [notes, setNotes] = useState('');

  const monthName = MONTH_NAMES[month - 1] || '';

  const filteredItems = protestCheques.filter(p => {
    if (!p.protestDate) return false;
    const dt = new Date(p.protestDate);
    const m = dt.getMonth() + 1;
    const y = dt.getFullYear();
    const matchPeriod = m === month && y === year;

    if (!matchPeriod) return false;

    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return p.bankName?.toLowerCase().includes(q) ||
           p.chequeNumber?.toLowerCase().includes(q) ||
           p.applicantName?.toLowerCase().includes(q) ||
           p.drawerName?.toLowerCase().includes(q);
  });

  const openAddModal = () => {
    setEditingItem(null);
    setNumber('');
    setProtestDate(`${year}-${month.toString().padStart(2, '0')}-01`);
    setBankName('');
    setChequeNumber('');
    setAmount(0);
    setApplicantName('');
    setDrawerName('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: ProtestCheque) => {
    setEditingItem(item);
    setNumber(item.number || '');
    setProtestDate(item.protestDate || '');
    setBankName(item.bankName || '');
    setChequeNumber(item.chequeNumber || '');
    setAmount(item.amount || 0);
    setApplicantName(item.applicantName || '');
    setDrawerName(item.drawerName || '');
    setNotes(item.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!protestDate || !bankName || !chequeNumber) {
      alert('Mohon isi Tanggal, Bank, dan Nomor Cek.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        number: number || `PROT-${Date.now().toString().slice(-4)}`,
        protestDate,
        bankName,
        chequeNumber,
        amount,
        applicantName,
        drawerName,
        notes
      };

      if (editingItem) {
        await NotaryService.updateProtestCheque(editingItem.id, payload);
      } else {
        await NotaryService.addProtestCheque(payload);
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving protest cheque:', err);
      alert('Gagal menyimpan data protest cheque.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data protest cheque ini?')) {
      try {
        await NotaryService.deleteProtestCheque(id);
      } catch (err) {
        console.error('Error deleting protest cheque:', err);
        alert('Gagal menghapus data.');
      }
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handlePrint = () => {
    printElement(printRef.current, `Laporan_Protest_Cheque_${month}_${year}`);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await exportProtestChequeReportToPdf({
        monthName,
        year,
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
      await exportProtestChequeReportToPdf({
        monthName,
        year,
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

  const [isSavingDrive, setIsSavingDrive] = useState(false);
  const [driveProgress, setDriveProgress] = useState('');
  const [driveResult, setDriveResult] = useState<{ success: boolean; message: string; link?: string } | null>(null);

  const handleSaveDrive = async () => {
    setIsSavingDrive(true);
    setDriveProgress('Mempersiapkan PDF...');
    setDriveResult(null);
    try {
      const pdfBlob = await exportProtestChequeReportToPdf({
        monthName,
        year,
        items: filteredItems,
        signatureDate
      }, 'blob');

      if (!pdfBlob) throw new Error('Gagal membuat PDF Blob.');

      const result = await saveReportToDrive(
        pdfBlob as Blob,
        { month, year, signatureDate },
        'Protes',
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
            placeholder="Cari bank, no. cek, pemohon..."
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

          <button
            onClick={openAddModal}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            Tambah Protest Cheque
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
            Salinan Daftar Protest Cheque dan Protes Wessel, Bulan {monthName} {year}
          </h2>
        </div>

        {filteredItems.length === 0 ? (
          <div className="py-12 my-4 text-center font-bold text-sm tracking-[0.5em] text-slate-900 uppercase">
            N I H I L
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold">
                  <th className="border border-slate-300 p-2 text-center w-10">NO</th>
                  <th className="border border-slate-300 p-2 w-28 text-center">TANGGAL</th>
                  <th className="border border-slate-300 p-2 min-w-[160px]">NAMA BANK & NO. CEK</th>
                  <th className="border border-slate-300 p-2 text-right w-36">JUMLAH UANG</th>
                  <th className="border border-slate-300 p-2 min-w-[160px]">NAMA PEMOHON</th>
                  <th className="border border-slate-300 p-2 min-w-[160px]">NAMA PENARIK CEK</th>
                  <th className="border border-slate-300 p-2 w-20 text-center print:hidden">AKSI</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="border border-slate-300 p-2 text-center font-medium text-slate-600">{idx + 1}</td>
                    <td className="border border-slate-300 p-2 text-center text-slate-600">{item.protestDate}</td>
                    <td className="border border-slate-300 p-2">
                      <p className="font-bold text-slate-900">{item.bankName}</p>
                      <p className="text-[11px] text-slate-500">No: {item.chequeNumber}</p>
                    </td>
                    <td className="border border-slate-300 p-2 text-right font-bold text-slate-900">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="border border-slate-300 p-2 font-medium text-slate-800">{item.applicantName || '-'}</td>
                    <td className="border border-slate-300 p-2 font-medium text-slate-800">{item.drawerName || '-'}</td>
                    <td className="border border-slate-300 p-2 text-center print:hidden">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Signature Footer */}
        <div className="mt-8 flex justify-end text-xs font-sans text-slate-900">
          <div className="text-left w-80 space-y-1">
            <p>Bandung Barat, {signatureDate || `${monthName} ${year}`}</p>
            <p>Notaris di Kabupaten Bandung Barat,</p>

            <div className="relative h-28 my-1 flex items-center">
              <div className="absolute -left-4 -top-8 w-44 h-44 pointer-events-none select-none z-0">
                <img
                  src={getSignatureImage()}
                  alt="Cap Stempel dan Tanda Tangan Notaris"
                  className="w-full h-full object-contain mix-blend-multiply opacity-95"
                />
              </div>
            </div>

            <p className="font-bold underline text-xs tracking-wide pt-2 z-10 relative">
              NUKANTINI PUTRI PARINCHA, SH., M.Kn
            </p>
          </div>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingItem ? 'Edit Data Protest Cheque' : 'Tambah Protest Cheque'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tanggal Protest *</label>
                  <input
                    type="date"
                    required
                    value={protestDate}
                    onChange={(e) => setProtestDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nama Bank *</label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Contoh: Bank BCA"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nomor Cek / BG *</label>
                  <input
                    type="text"
                    required
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    placeholder="Contoh: CQ-123456"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Jumlah Uang (Rp)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Pemohon Protest</label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="Nama pemohon / penerima cek"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Penarik Cek</label>
                <input
                  type="text"
                  value={drawerName}
                  onChange={(e) => setDrawerName(e.target.value)}
                  placeholder="Nama yang menerbitkan cek"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
