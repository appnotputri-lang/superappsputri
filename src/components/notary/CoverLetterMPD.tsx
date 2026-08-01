import React, { useState, useRef, useEffect } from 'react';
import { Deed, PrivateDeed, ProtestCheque, OutgoingMail } from '../../../types';
import { Printer, Settings, RotateCcw, Image, Check, Trash2, Upload, Download, Share2, Loader2, CheckCircle2, AlertCircle, ExternalLink, X, Save } from 'lucide-react';
import { printElement } from '../../utils/printHelper';
import { exportCoverLetterMPDToPdf } from '../../utils/notaryPdfExport';
import { getSignatureImage, setSignatureImage, resetSignatureImage } from '../../utils/signatureUtils';
import { saveReportToDrive } from '../../services/reportDriveService';
import { NotaryService } from '../../services/NotaryService';

interface CoverLetterMPDProps {
  month: number;
  year: number;
  signatureDate: string;
  deeds: Deed[];
  privateDeeds: PrivateDeed[];
  protestCheques: ProtestCheque[];
  outgoingMails?: OutgoingMail[];
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const ROMAN_MONTHS = [
  'I', 'II', 'III', 'IV', 'V', 'VI',
  'VII', 'VIII', 'IX', 'X', 'XI', 'XII'
];

export const CoverLetterMPD: React.FC<CoverLetterMPDProps> = ({
  month,
  year,
  signatureDate,
  deeds,
  privateDeeds,
  protestCheques,
  outgoingMails,
}) => {
  const monthName = MONTH_NAMES[month - 1] || 'Juli';
  const romanMonth = ROMAN_MONTHS[month - 1] || 'VII';
  const lastDayOfMonth = new Date(year, month, 0).getDate();

  // Dynamic Editable States with Defaults matching the PDF sample
  const [showSettings, setShowSettings] = useState(false);

  const [notaryTitle, setNotaryTitle] = useState('NOTARIS');
  const [notaryName, setNotaryName] = useState('Nukantini Putri Parincha, SH., MKn.');
  const [skMenkumhamTitle, setSkMenkumhamTitle] = useState('SK. MENTERI HUKUM DAN HAK ASASI MANUSIA REPUBLIK INDONESIA');
  const [skMenkumhamNo, setSkMenkumhamNo] = useState('No. C-309.HT.03.01-Th. 2007, Tanggal 23 Januari 2007');
  const [skBpnTitle, setSkBpnTitle] = useState('SK. KEPALA BADAN PERTANAHAN NASIONAL REPUBLIK INDONESIA');
  const [skBpnNo, setSkBpnNo] = useState('No. 1 – XVI - PPAT – 2009, Tanggal 12 Februari 2009');
  const [officeAddress, setOfficeAddress] = useState('Kantor : Komp. PPR-ITB Kav. F-5 Dago Bengkok, Lembang, Kab. Bandung Barat');
  const [officePhone, setOfficePhone] = useState('Telp/Fax : 022-2504155, 08122174848');

  const [letterNumber, setLetterNumber] = useState(`29/NPP-NOT/${romanMonth}/${year}`);
  const [subject, setSubject] = useState('Penyampaian Daftar Akta');
  const [attachment, setAttachment] = useState('1 (Satu) Berkas');
  const [letterCity, setLetterCity] = useState('Bandung');
  const [customDate, setCustomDate] = useState(`${lastDayOfMonth} ${monthName} ${year}`);

  const [recipientTitle, setRecipientTitle] = useState('Kepada Yth.');
  const [mpdLine1, setMpdLine1] = useState('Majelis Pengawas Daerah (MPD)');
  const [mpdLine2, setMpdLine2] = useState('Notaris Kabupaten Bandung Barat');
  const [mpdLine3, setMpdLine3] = useState('Jl. Raya Gadobangkong Nomor 158');
  const [mpdLine4, setMpdLine4] = useState('Kabupaten Bandung Barat 40552');

  const [notaryCityJurisdiction, setNotaryCityJurisdiction] = useState('Kabupaten Bandung Barat');
  const [startDateStr, setStartDateStr] = useState(`01 ${monthName} ${year}`);
  const [endDateStr, setEndDateStr] = useState(`${lastDayOfMonth.toString().padStart(2, '0')} ${monthName} ${year}`);

  // Stamp & Signature Image States & Position Adjustments
  const STAMP_STORAGE_KEY = 'notary_custom_stamp_signature_url';
  const STAMP_POS_Y_KEY = 'notary_stamp_pos_y';
  const STAMP_POS_X_KEY = 'notary_stamp_pos_x';
  const STAMP_SIZE_KEY = 'notary_stamp_size';

  const [showStampImage, setShowStampImage] = useState(true);
  const [customStampUrl, setCustomStampUrl] = useState<string>(getSignatureImage());

  useEffect(() => {
    setCustomStampUrl(getSignatureImage());
  }, []);

  const [isSavingNumber, setIsSavingNumber] = useState(false);
  const [saveNumberResult, setSaveNumberResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    // 1. Check if user saved a letter number for this specific month and year in local storage
    const savedKey = `mpd_letter_number_${year}_${month}`;
    const savedNum = localStorage.getItem(savedKey);
    if (savedNum) {
      setLetterNumber(savedNum);
      return;
    }

    // 2. Check if an outgoing mail entry already exists for MPD in this month and year
    const mails = outgoingMails || [];
    const existingMail = mails.find(m => {
      if (!m.date) return false;
      const isMpd =
        (m as any).type === 'surat_pengantar' ||
        (m.subject && m.subject.toLowerCase().includes('pengantar')) ||
        (m.subject && m.subject.toLowerCase().includes('daftar akta')) ||
        (m.notes && m.notes.toLowerCase().includes('mpd'));

      if (!isMpd) return false;
      try {
        const d = new Date(m.date);
        return d.getFullYear() === year && (d.getMonth() + 1) === month;
      } catch {
        return false;
      }
    });

    if (existingMail && existingMail.mailNumber) {
      setLetterNumber(existingMail.mailNumber);
      return;
    }

    // 3. Fallback: calculate next sequence number from highest recorded mail sequence
    let maxSeq = 0;
    mails.forEach(m => {
      if (!m.mailNumber) return;
      const str = m.mailNumber.trim();
      const match = str.match(/^(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    });
    const nextNum = maxSeq + 1;
    setLetterNumber(`${nextNum}/NPP-NOT/${romanMonth}/${year}`);
  }, [outgoingMails, year, month, romanMonth]);

  const handleSaveLetterNumber = async () => {
    if (!letterNumber.trim()) {
      setSaveNumberResult({ success: false, message: 'Nomor surat tidak boleh kosong.' });
      return;
    }

    setIsSavingNumber(true);
    setSaveNumberResult(null);

    try {
      // Save locally
      const savedKey = `mpd_letter_number_${year}_${month}`;
      localStorage.setItem(savedKey, letterNumber.trim());

      // Prepare date (YYYY-MM-DD)
      const targetDate = signatureDate || `${year}-${month.toString().padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}`;

      // Find existing entry in outgoing mails
      const mails = outgoingMails || [];
      const existingMail = mails.find(m => {
        if (!m.date) return false;
        const isMpd =
          (m as any).type === 'surat_pengantar' ||
          (m.subject && m.subject.toLowerCase().includes('pengantar')) ||
          (m.subject && m.subject.toLowerCase().includes('daftar akta')) ||
          (m.notes && m.notes.toLowerCase().includes('mpd'));

        if (!isMpd) return false;
        try {
          const d = new Date(m.date);
          return d.getFullYear() === year && (d.getMonth() + 1) === month;
        } catch {
          return false;
        }
      });

      if (existingMail) {
        await NotaryService.updateOutgoingMail(existingMail.id, {
          mailNumber: letterNumber.trim(),
          date: targetDate,
          recipient: `${mpdLine1} ${mpdLine2}`,
          subject: subject || 'Penyampaian Daftar Akta',
          notes: `Surat Pengantar MPD Bulan ${monthName} ${year}`
        });
      } else {
        await NotaryService.addOutgoingMail({
          mailNumber: letterNumber.trim(),
          date: targetDate,
          recipient: `${mpdLine1} ${mpdLine2}`,
          subject: subject || 'Penyampaian Daftar Akta',
          attachmentCount: 1,
          notes: `Surat Pengantar MPD Bulan ${monthName} ${year}`
        });
      }

      setSaveNumberResult({
        success: true,
        message: `Nomor Surat "${letterNumber.trim()}" berhasil disimpan dan dicatat di Buku Surat Keluar!`
      });
    } catch (err: any) {
      console.error(err);
      setSaveNumberResult({
        success: false,
        message: 'Gagal menyimpan Nomor Surat: ' + (err.message || 'Terjadi kesalahan.')
      });
    } finally {
      setIsSavingNumber(false);
    }
  };

  const [stampOffsetY, setStampOffsetY] = useState<number>(() => {
    try {
      const val = localStorage.getItem(STAMP_POS_Y_KEY);
      return val !== null ? Number(val) : -16;
    } catch {
      return -16;
    }
  });

  const [stampOffsetX, setStampOffsetX] = useState<number>(() => {
    try {
      const val = localStorage.getItem(STAMP_POS_X_KEY);
      return val !== null ? Number(val) : -24;
    } catch {
      return -24;
    }
  });

  const [stampSize, setStampSize] = useState<number>(() => {
    try {
      const val = localStorage.getItem(STAMP_SIZE_KEY);
      return val !== null ? Number(val) : 176;
    } catch {
      return 176;
    }
  });

  const updateStampPosY = (val: number) => {
    setStampOffsetY(val);
    try {
      localStorage.setItem(STAMP_POS_Y_KEY, String(val));
    } catch (e) {
      console.error(e);
    }
  };

  const updateStampPosX = (val: number) => {
    setStampOffsetX(val);
    try {
      localStorage.setItem(STAMP_POS_X_KEY, String(val));
    } catch (e) {
      console.error(e);
    }
  };

  const updateStampSize = (val: number) => {
    setStampSize(val);
    try {
      localStorage.setItem(STAMP_SIZE_KEY, String(val));
    } catch (e) {
      console.error(e);
    }
  };

  const resetToDefaults = () => {
    setNotaryTitle('NOTARIS');
    setNotaryName('Nukantini Putri Parincha, SH., MKn.');
    setSkMenkumhamTitle('SK. MENTERI HUKUM DAN HAK ASASI MANUSIA REPUBLIK INDONESIA');
    setSkMenkumhamNo('No. C-309.HT.03.01-Th. 2007, Tanggal 23 Januari 2007');
    setSkBpnTitle('SK. KEPALA BADAN PERTANAHAN NASIONAL REPUBLIK INDONESIA');
    setSkBpnNo('No. 1 – XVI - PPAT – 2009, Tanggal 12 Februari 2009');
    setOfficeAddress('Kantor : Komp. PPR-ITB Kav. F-5 Dago Bengkok, Lembang, Kab. Bandung Barat');
    setOfficePhone('Telp/Fax : 022-2504155, 08122174848');

    setLetterNumber(`29/NPP-NOT/${romanMonth}/${year}`);
    setSubject('Penyampaian Daftar Akta');
    setAttachment('1 (Satu) Berkas');
    setLetterCity('Bandung');
    setCustomDate(`${lastDayOfMonth} ${monthName} ${year}`);

    setRecipientTitle('Kepada Yth.');
    setMpdLine1('Majelis Pengawas Daerah (MPD)');
    setMpdLine2('Notaris Kabupaten Bandung Barat');
    setMpdLine3('Jl. Raya Gadobangkong Nomor 158');
    setMpdLine4('Kabupaten Bandung Barat 40552');

    setNotaryCityJurisdiction('Kabupaten Bandung Barat');
    setStartDateStr(`01 ${monthName} ${year}`);
    setEndDateStr(`${lastDayOfMonth.toString().padStart(2, '0')} ${monthName} ${year}`);

    setShowStampImage(true);
    resetSignatureImage();
    setCustomStampUrl(getSignatureImage());
  };

  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handlePrint = () => {
    printElement(printRef.current, `Surat_Pengantar_MPD_${month}_${year}`);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await exportCoverLetterMPDToPdf({
        notaryTitle,
        notaryName,
        skMenkumhamTitle,
        skMenkumhamNo,
        skBpnTitle,
        skBpnNo,
        officeAddress,
        officePhone,
        letterNumber,
        subject,
        attachment,
        letterCity,
        formattedLetterDate,
        recipientTitle,
        mpdLine1,
        mpdLine2,
        mpdLine3,
        mpdLine4,
        notaryCityJurisdiction,
        startDateStr,
        endDateStr,
        stampOffsetX,
        stampOffsetY,
        stampSize,
        showStamp: showStampImage
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
      await exportCoverLetterMPDToPdf({
        notaryTitle,
        notaryName,
        skMenkumhamTitle,
        skMenkumhamNo,
        skBpnTitle,
        skBpnNo,
        officeAddress,
        officePhone,
        letterNumber,
        subject,
        attachment,
        letterCity,
        formattedLetterDate,
        recipientTitle,
        mpdLine1,
        mpdLine2,
        mpdLine3,
        mpdLine4,
        notaryCityJurisdiction,
        startDateStr,
        endDateStr,
        stampOffsetX,
        stampOffsetY,
        stampSize,
        showStamp: showStampImage
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
      const pdfBlob = await exportCoverLetterMPDToPdf({
        notaryTitle,
        notaryName,
        skMenkumhamTitle,
        skMenkumhamNo,
        skBpnTitle,
        skBpnNo,
        officeAddress,
        officePhone,
        letterNumber,
        subject,
        attachment,
        letterCity,
        formattedLetterDate,
        recipientTitle,
        mpdLine1,
        mpdLine2,
        mpdLine3,
        mpdLine4,
        notaryCityJurisdiction,
        startDateStr,
        endDateStr,
        stampOffsetX,
        stampOffsetY,
        stampSize,
        showStamp: showStampImage
      }, 'blob');

      if (!pdfBlob) throw new Error('Gagal membuat PDF Blob.');

      const result = await saveReportToDrive(
        pdfBlob as Blob,
        { month, year, signatureDate: formattedLetterDate },
        'Surat MPD',
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

  const formattedLetterDate = signatureDate || customDate;

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:hidden gap-3">
        <div>
          <h3 className="font-bold text-slate-800 text-base">Surat Pengantar MPD</h3>
          <p className="text-xs text-slate-500">
            Format resmi Surat Pengantar Laporan Bulanan ke Majelis Pengawas Daerah (MPD)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveLetterNumber}
            disabled={isSavingNumber}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
            title="Simpan Nomor Surat ini ke sistem & Buku Surat Keluar"
          >
            {isSavingNumber ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Simpan Nomor Surat
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Settings size={15} />
            {showSettings ? 'Sembunyikan Pengaturan' : 'Edit Isi Surat'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {isDownloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            Export PDF
          </button>
          <button
            type="button"
            onClick={handleSaveDrive}
            disabled={isSavingDrive}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSavingDrive ? <Loader2 size={15} className="animate-spin" /> : <span>📁</span>}
            {isSavingDrive ? (driveProgress || 'Menyimpan...') : 'Simpan Google Drive'}
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={isSharing}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSharing ? <Loader2 size={15} className="animate-spin" /> : <Share2 size={15} />}
            Share
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Printer size={16} />
            Cetak Surat Pengantar
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

      {saveNumberResult && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
          saveNumberResult.success ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {saveNumberResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{saveNumberResult.message}</span>
          </div>
          <button
            onClick={() => setSaveNumberResult(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Editable Settings Collapsible Panel */}
      {showSettings && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner space-y-4 text-xs print:hidden">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Edit Parameters Surat Pengantar MPD
            </span>
            <button
              type="button"
              onClick={resetToDefaults}
              className="text-slate-600 hover:text-indigo-600 flex items-center gap-1 font-semibold cursor-pointer"
            >
              <RotateCcw size={13} /> Reset Standar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Nomor Surat</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={letterNumber}
                  onChange={(e) => setLetterNumber(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 font-mono text-xs font-semibold"
                />
                <button
                  type="button"
                  onClick={handleSaveLetterNumber}
                  disabled={isSavingNumber}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium text-xs flex items-center gap-1 whitespace-nowrap cursor-pointer disabled:opacity-50 shadow-sm"
                  title="Simpan Nomor Surat"
                >
                  {isSavingNumber ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Simpan
                </button>
              </div>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Perihal</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Lampiran</label>
              <input
                type="text"
                value={attachment}
                onChange={(e) => setAttachment(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Kota Surat</label>
              <input
                type="text"
                value={letterCity}
                onChange={(e) => setLetterCity(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Tanggal Surat</label>
              <input
                type="text"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Nama Notaris</label>
              <input
                type="text"
                value={notaryName}
                onChange={(e) => setNotaryName(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Tujuan MPD Line 1</label>
              <input
                type="text"
                value={mpdLine1}
                onChange={(e) => setMpdLine1(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Tujuan MPD Line 2</label>
              <input
                type="text"
                value={mpdLine2}
                onChange={(e) => setMpdLine2(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Alamat MPD</label>
              <input
                type="text"
                value={mpdLine3}
                onChange={(e) => setMpdLine3(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Wilayah Jabatan Notaris</label>
              <input
                type="text"
                value={notaryCityJurisdiction}
                onChange={(e) => setNotaryCityJurisdiction(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Periode Tanggal Awal</label>
              <input
                type="text"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Periode Tanggal Akhir</label>
              <input
                type="text"
                value={endDateStr}
                onChange={(e) => setEndDateStr(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Stamp Image Control */}
            <div className="md:col-span-2 lg:col-span-3 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={showStampImage}
                  onChange={(e) => setShowStampImage(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <Image size={15} className="text-indigo-600" />
                Tampilkan Cap Stempel & Tanda Tangan Notaris
              </label>

              {showStampImage && (
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 font-medium cursor-pointer shadow-sm">
                    <Upload size={13} />
                    Ganti Gambar Cap/TTD
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                           const reader = new FileReader();
                           reader.onload = (evt) => {
                             if (evt.target?.result) {
                               const imgData = evt.target.result as string;
                               setSignatureImage(imgData);
                               setCustomStampUrl(imgData);
                             }
                           };
                           reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  {customStampUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        resetSignatureImage();
                        setCustomStampUrl(getSignatureImage());
                      }}
                      className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-1 font-medium cursor-pointer border border-rose-200"
                    >
                      <Trash2 size={13} /> Reset Gambar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      updateStampPosY(-16);
                      updateStampPosX(-24);
                      updateStampSize(176);
                    }}
                    className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1 font-medium cursor-pointer border border-slate-200 text-xs"
                    title="Kembalikan posisi cap stempel ke default"
                  >
                    Reset Posisi
                  </button>
                </div>
              )}
            </div>

            {/* Position & Scale Sliders */}
            {showStampImage && (
              <div className="md:col-span-2 lg:col-span-3 bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="flex justify-between items-center mb-1 font-medium text-slate-700">
                    <span>Posisi Vertikal (Atas/Bawah)</span>
                    <span className="font-bold text-indigo-600">{stampOffsetY}px</span>
                  </div>
                  <input
                    type="range"
                    min={-80}
                    max={40}
                    value={stampOffsetY}
                    onChange={(e) => updateStampPosY(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1 font-medium text-slate-700">
                    <span>Posisi Horizontal (Kiri/Kanan)</span>
                    <span className="font-bold text-indigo-600">{stampOffsetX}px</span>
                  </div>
                  <input
                    type="range"
                    min={-80}
                    max={80}
                    value={stampOffsetX}
                    onChange={(e) => updateStampPosX(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1 font-medium text-slate-700">
                    <span>Ukuran Cap / TTD</span>
                    <span className="font-bold text-indigo-600">{stampSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={260}
                    value={stampSize}
                    onChange={(e) => updateStampSize(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Printable Document Sheet matching PDF sample */}
      <div ref={printRef} className="bg-white p-10 md:p-14 rounded-xl border border-slate-200 shadow-sm max-w-4xl mx-auto print:shadow-none print:border-none print:p-0 print:m-0 text-slate-900 font-serif leading-relaxed text-sm">
        
        {/* Kop Surat Header */}
        <div className="pb-3 mb-8 text-left font-serif">
          <h1 className="text-base font-bold tracking-wider uppercase font-serif text-slate-900 mb-1">
            {notaryTitle}
          </h1>
          
          {/* Top Double Divider Line under NOTARIS */}
          <div className="border-b-4 border-double border-slate-900 mb-2"></div>

          <h2 className="text-xs font-bold uppercase font-serif text-slate-900 leading-tight">
            {notaryName}
          </h2>
          <p className="text-[11px] font-bold uppercase font-serif text-slate-900 mt-1 leading-tight">
            {skMenkumhamTitle}
          </p>
          <p className="text-[11px] font-normal font-serif text-slate-900 leading-tight">
            {skMenkumhamNo}
          </p>
          <p className="text-[11px] font-bold uppercase font-serif text-slate-900 mt-1 leading-tight">
            {skBpnTitle}
          </p>
          <p className="text-[11px] font-normal font-serif text-slate-900 leading-tight">
            {skBpnNo}
          </p>
          <p className="text-[11px] font-normal font-serif text-slate-900 mt-1.5 leading-tight">
            {officeAddress}
          </p>
          <p className="text-[11px] font-normal font-serif text-slate-900 leading-tight">
            {officePhone}
          </p>
        </div>

        {/* Letter Metadata & Recipient */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 font-serif text-xs leading-normal">
          {/* Left Metadata */}
          <div className="space-y-1">
            <div className="flex items-center">
              <span className="w-20 inline-block">Nomor</span>
              <span>: {letterNumber}</span>
              <button
                type="button"
                onClick={handleSaveLetterNumber}
                disabled={isSavingNumber}
                className="ml-2 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[10px] font-sans font-medium flex items-center gap-1 print:hidden cursor-pointer"
                title="Simpan Nomor Surat ini ke Buku Surat Keluar"
              >
                {isSavingNumber ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                Simpan
              </button>
            </div>
            <div className="flex">
              <span className="w-20 inline-block">Perihal</span>
              <span>: {subject}</span>
            </div>
            <div className="flex">
              <span className="w-20 inline-block">Lampiran</span>
              <span>: {attachment}</span>
            </div>
          </div>

          {/* Right Date & Destination */}
          <div className="space-y-4">
            <div>
              <p>{letterCity}, {formattedLetterDate}</p>
            </div>
            <div>
              <p>{recipientTitle}</p>
              <p className="font-bold">{mpdLine1}</p>
              <p className="font-bold">{mpdLine2}</p>
              <p>{mpdLine3}</p>
              <p>{mpdLine4}</p>
            </div>
          </div>
        </div>

        {/* Salutation */}
        <div className="mb-4 font-serif text-xs">
          <p>Dengan hormat,</p>
        </div>

        {/* Body Paragraph */}
        <div className="mb-12 text-justify font-serif text-xs leading-relaxed">
          <p>
            Guna memenuhi ketentuan Pasal 61 ayat 1 dari Undang-Undang Nomor 30 tahun 2004 tentang Jabatan Notaris, dengan ini kami sampaikan kepada Saudara salinan daftar akta-akta Notaris dan daftar lainnya yang telah dibuat di hadapan <span className="font-bold">{notaryName}</span>, Notaris di {notaryCityJurisdiction} terhitung mulai tanggal {startDateStr} sampai dengan {endDateStr}.
          </p>
        </div>

        {/* Closing & Signature Block */}
        <div className="flex justify-end font-serif text-xs">
          <div className="text-left w-72 space-y-1 relative">
            <p>Hormat saya,</p>
            <p className="font-serif">Notaris di {notaryCityJurisdiction}</p>

            <div className="relative h-28 my-1 flex items-center">
              {showStampImage && (
                <div
                  style={{
                    top: `${stampOffsetY}px`,
                    left: `${stampOffsetX}px`,
                    width: `${stampSize}px`,
                    height: `${stampSize}px`
                  }}
                  className="absolute pointer-events-none select-none z-0"
                >
                  <img
                    src={getSignatureImage()}
                    alt="Cap Stempel dan Tanda Tangan Notaris"
                    className="w-full h-full object-contain mix-blend-multiply"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>

            <p className="font-bold underline uppercase relative z-10">{notaryName}</p>
          </div>
        </div>

      </div>
    </div>
  );
};

