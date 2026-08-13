import React, { useState, useEffect } from 'react';
import { Deed, PrivateDeed, ProtestCheque, OutgoingMail } from '../../../types';
import { NotaryService } from '../../services/NotaryService';
import { CoverLetterMPD } from './CoverLetterMPD';
import { DeedReport } from './DeedReport';
import { DeedAlphabeticalReport } from './DeedAlphabeticalReport';
import { PrivateDeedPrintView } from './PrivateDeedPrintView';
import { ProtestChequeReport } from './ProtestChequeReport';
import { saveReportToDrive } from '../../services/reportDriveService';
import { exportAllNotaryReportsToPdf, buildAlphabeticalSections } from '../../utils/notaryPdfExport';
import { BookOpen, FileText, ListOrdered, ShieldCheck, FileCheck, AlertCircle, Calendar, ExternalLink, Info, Download, CloudUpload, Loader2, CheckCircle2, FileCheck2 } from 'lucide-react';

type NotaryReportSubTab =
  | 'surat_pengantar'
  | 'laporan_akta'
  | 'klapper_akta'
  | 'legalisasi'
  | 'waarmerking'
  | 'protest_cheque';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const getRomanMonth = (num: number): string => {
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return roman[num - 1] || 'I';
};

export const NotaryReportHub: React.FC = () => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [signatureDate, setSignatureDate] = useState<string>(
    `${currentDate.getDate()} ${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
  );
  const [showStamp, setShowStamp] = useState<boolean>(false);

  const [activeSubTab, setActiveSubTab] = useState<NotaryReportSubTab>('surat_pengantar');

  // Drive & PDF Export States
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSavingDrive, setIsSavingDrive] = useState(false);
  const [driveProgress, setDriveProgress] = useState('');
  const [driveResult, setDriveResult] = useState<{ success: boolean; message: string; link?: string } | null>(null);

  // Firestore state & month cache
  const [cache, setCache] = useState<{
    [periodKey: string]: {
      deeds: Deed[];
      privateDeeds: PrivateDeed[];
      protestCheques: ProtestCheque[];
      outgoingMails: OutgoingMail[];
    };
  }>({});

  const [deeds, setDeeds] = useState<Deed[]>([]);
  const [privateDeeds, setPrivateDeeds] = useState<PrivateDeed[]>([]);
  const [protestCheques, setProtestCheques] = useState<ProtestCheque[]>([]);
  const [outgoingMails, setOutgoingMails] = useState<OutgoingMail[]>([]);
  const [loading, setLoading] = useState(true);

  const periodKey = `${selectedYear}-${selectedMonth}`;

  useEffect(() => {
    // If cached, display cached data immediately
    if (cache[periodKey]) {
      setDeeds(cache[periodKey].deeds);
      setPrivateDeeds(cache[periodKey].privateDeeds);
      setProtestCheques(cache[periodKey].protestCheques);
      setOutgoingMails(cache[periodKey].outgoingMails);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // Subscribe ONLY to the selected month/year in real-time
    const unsubDeeds = NotaryService.subscribeDeedsByMonth(selectedYear, selectedMonth, (data) => {
      const list = data || [];
      setDeeds(list);
      setCache((prev) => ({
        ...prev,
        [periodKey]: {
          ...(prev[periodKey] || { deeds: [], privateDeeds: [], protestCheques: [], outgoingMails: [] }),
          deeds: list
        }
      }));
      setLoading(false);
    });

    const unsubPrivate = NotaryService.subscribePrivateDeedsByMonth(selectedYear, selectedMonth, (data) => {
      const list = data || [];
      setPrivateDeeds(list);
      setCache((prev) => ({
        ...prev,
        [periodKey]: {
          ...(prev[periodKey] || { deeds: [], privateDeeds: [], protestCheques: [], outgoingMails: [] }),
          privateDeeds: list
        }
      }));
    });

    const unsubProtest = NotaryService.subscribeProtestChequesByMonth(selectedYear, selectedMonth, (data) => {
      const list = data || [];
      setProtestCheques(list);
      setCache((prev) => ({
        ...prev,
        [periodKey]: {
          ...(prev[periodKey] || { deeds: [], privateDeeds: [], protestCheques: [], outgoingMails: [] }),
          protestCheques: list
        }
      }));
    });

    const unsubMails = NotaryService.subscribeOutgoingMailsByMonth(selectedYear, selectedMonth, (data) => {
      const list = data || [];
      setOutgoingMails(list);
      setCache((prev) => ({
        ...prev,
        [periodKey]: {
          ...(prev[periodKey] || { deeds: [], privateDeeds: [], protestCheques: [], outgoingMails: [] }),
          outgoingMails: list
        }
      }));
    });

    return () => {
      unsubDeeds();
      unsubPrivate();
      unsubProtest();
      unsubMails();
    };
  }, [selectedYear, selectedMonth, periodKey]);

  // Filter counts for current selected month & year
  const currentDeeds = deeds.filter(d => {
    if (!d.date) return false;
    const dt = new Date(d.date);
    return dt.getMonth() + 1 === selectedMonth && dt.getFullYear() === selectedYear;
  });

  const currentLegalisasi = privateDeeds.filter(p => {
    if (!p.registrationDate) return false;
    const dt = new Date(p.registrationDate);
    return dt.getMonth() + 1 === selectedMonth &&
           dt.getFullYear() === selectedYear &&
           p.type?.toLowerCase() === 'legalisasi';
  });

  const currentWaarmerking = privateDeeds.filter(p => {
    if (!p.registrationDate) return false;
    const dt = new Date(p.registrationDate);
    return dt.getMonth() + 1 === selectedMonth &&
           dt.getFullYear() === selectedYear &&
           p.type?.toLowerCase() === 'waarmerking';
  });

  const currentProtest = protestCheques.filter(p => {
    if (!p.protestDate) return false;
    const dt = new Date(p.protestDate);
    return dt.getMonth() + 1 === selectedMonth && dt.getFullYear() === selectedYear;
  });

  const buildCombinedReportPayload = () => {
    const monthName = MONTH_NAMES[selectedMonth - 1];
    const alphabeticalSections = buildAlphabeticalSections(currentDeeds);
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();

    return {
      coverLetter: {
        notaryTitle: 'NOTARIS',
        notaryName: 'Nukantini Putri Parincha, SH., MKn.',
        skMenkumhamTitle: 'SK. MENTERI HUKUM DAN HAK ASASI MANUSIA REPUBLIK INDONESIA',
        skMenkumhamNo: 'No. C-309.HT.03.01-Th. 2007, Tanggal 23 Januari 2007',
        skBpnTitle: 'SK. KEPALA BADAN PERTANAHAN NASIONAL REPUBLIK INDONESIA',
        skBpnNo: 'No. 1 – XVI - PPAT – 2009, Tanggal 12 Februari 2009',
        officeAddress: 'Kantor : Komp. PPR-ITB Kav. F-5 Dago Bengkok, Lembang, Kab. Bandung Barat',
        officePhone: 'Telp/Fax : 022-2504155, 08122174848',
        letterNumber: `29/NPP-NOT/${getRomanMonth(selectedMonth)}/${selectedYear}`,
        subject: 'Penyampaian Daftar Akta',
        attachment: '1 (Satu) Berkas',
        letterCity: 'Bandung',
        formattedLetterDate: signatureDate,
        recipientTitle: 'Kepada Yth.',
        mpdLine1: 'Ketua Majelis Pengawas Daerah Notaris',
        mpdLine2: 'Kabupaten Bandung Barat',
        mpdLine3: 'di',
        mpdLine4: 'Bandung',
        notaryCityJurisdiction: 'Kabupaten Bandung Barat',
        startDateStr: `1 ${monthName} ${selectedYear}`,
        endDateStr: `${lastDay} ${monthName} ${selectedYear}`,
        stampOffsetX: 0,
        stampOffsetY: 0,
        stampSize: 180,
        showStamp
      },
      deedReport: {
        monthName,
        year: selectedYear,
        deeds: currentDeeds,
        signatureDate,
        showStamp
      },
      deedAlphabeticalReport: {
        monthName,
        year: selectedYear,
        filteredSections: alphabeticalSections,
        notaryName: 'Nukantini Putri Parincha, SH., MKn.',
        city: 'Bandung Barat',
        showStamp
      },
      legalisasiReport: {
        monthName,
        year: selectedYear,
        type: 'Legalisasi' as const,
        items: currentLegalisasi,
        signatureDate,
        showStamp
      },
      waarmerkingReport: {
        monthName,
        year: selectedYear,
        type: 'Waarmerking' as const,
        items: currentWaarmerking,
        signatureDate,
        showStamp
      },
      protestChequeReport: {
        monthName,
        year: selectedYear,
        items: currentProtest,
        signatureDate,
        showStamp
      }
    };
  };

  const handleExportAllPdf = async () => {
    setIsExportingPdf(true);
    try {
      const monthName = MONTH_NAMES[selectedMonth - 1];
      const payload = {
        ...buildCombinedReportPayload(),
        filename: `Laporan Notaris ${monthName} ${selectedYear}.pdf`
      };
      await exportAllNotaryReportsToPdf(payload, 'download');
    } catch (err) {
      console.error('Error exporting all PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSaveAllToDrive = async () => {
    setIsSavingDrive(true);
    setDriveProgress('Mempersiapkan dokumen PDF gabungan...');
    setDriveResult(null);

    try {
      const monthName = MONTH_NAMES[selectedMonth - 1];
      const customFileName = `Laporan Notaris ${monthName} ${selectedYear}.pdf`;
      const payload = {
        ...buildCombinedReportPayload(),
        filename: customFileName
      };

      const pdfBlob = await exportAllNotaryReportsToPdf(payload, 'blob');

      if (!pdfBlob) throw new Error('Gagal membuat PDF Blob.');

      const result = await saveReportToDrive(
        pdfBlob as Blob,
        { month: selectedMonth, year: selectedYear, signatureDate },
        `Laporan Notaris ${monthName} ${selectedYear}`,
        (msg) => setDriveProgress(msg),
        customFileName
      );

      setDriveResult({
        success: true,
        message: `Semua laporan Notaris (${monthName} ${selectedYear}) berhasil digabung & disimpan ke Google Drive.`,
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

  const SUB_TABS: { id: NotaryReportSubTab; label: string; icon: React.FC<{ size?: number; className?: string }>; count?: number }[] = [
    { id: 'surat_pengantar', label: 'Surat Pengantar MPD', icon: FileText },
    { id: 'laporan_akta', label: 'Laporan Bulanan Akta', icon: BookOpen, count: currentDeeds.length },
    { id: 'klapper_akta', label: 'Laporan Klapper Akta', icon: ListOrdered },
    { id: 'legalisasi', label: 'Laporan Legalisasi', icon: ShieldCheck, count: currentLegalisasi.length },
    { id: 'waarmerking', label: 'Laporan Waarmerking', icon: FileCheck, count: currentWaarmerking.length },
    { id: 'protest_cheque', label: 'Protest Cheque', icon: AlertCircle, count: currentProtest.length }
  ];

  return (
    <div className="p-4 md:p-6 w-[94%] xl:w-[92%] max-w-none mx-auto space-y-6">
      {/* Notice Banner for iFrame Printing */}
      {typeof window !== 'undefined' && window.self !== window.top && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl flex items-start sm:items-center justify-between gap-3 text-xs print:hidden shadow-sm">
          <div className="flex items-start sm:items-center gap-2.5">
            <Info size={16} className="text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <p>
              <span className="font-bold">Tips Mencetak:</span> Jendela pratinjau (iFrame) dapat memblokir perintah cetak browser. Silakan klik tombol 
              <span className="font-bold underline mx-1">Buka di Tab Baru</span> di pojok kanan atas pratinjau agar tombol <span className="font-bold">Cetak / Print</span> berjalan lancar.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.open(window.location.href, '_blank')}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shrink-0 flex items-center gap-1 transition-colors cursor-pointer text-[11px]"
          >
            <ExternalLink size={12} /> Buka Tab Baru
          </button>
        </div>
      )}

      {/* Page Title & Period Controls Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center font-bold">
              <BookOpen size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Laporan Notaris Bulanan</h1>
              <p className="text-xs text-slate-500">
                Penyusunan & Pengiriman Laporan Resmi ke Majelis Pengawas Daerah (MPD) Notaris
              </p>
            </div>
          </div>
        </div>

        {/* Month, Year & Date Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <Calendar size={15} className="text-slate-400 ml-1" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent font-medium text-xs text-slate-700 focus:outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={idx} value={idx + 1}>{m}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-medium text-xs text-slate-700 focus:outline-none cursor-pointer border-l border-slate-200 pl-2"
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-medium text-slate-500">Tgl TTD:</span>
            <input
              type="text"
              value={signatureDate}
              onChange={(e) => setSignatureDate(e.target.value)}
              placeholder="e.g. 05 Mei 2026"
              className="bg-transparent font-medium text-xs text-slate-800 focus:outline-none w-28"
            />
          </div>

          <label className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors select-none">
            <input
              type="checkbox"
              checked={showStamp}
              onChange={(e) => setShowStamp(e.target.checked)}
              className="w-4 h-4 text-sky-600 border-slate-300 rounded focus:ring-sky-500 cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-700">Tampilkan TTD & Cap</span>
          </label>
        </div>
      </div>

      {/* Global Export & Drive Save Bar for All Reports */}
      <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-indigo-900 p-4 rounded-2xl text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
            <FileCheck2 size={22} className="text-sky-300" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white flex items-center gap-2">
              Export Laporan Lengkap (6-in-1 PDF)
            </h2>
            <p className="text-xs text-sky-200">
              Menggabungkan Surat Pengantar MPD, Laporan Akta, Klapper Akta, Legalisasi, Waarmerking, & Protest Cheque bulan {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={handleExportAllPdf}
            disabled={isExportingPdf || isSavingDrive}
            className="flex-1 sm:flex-initial px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-2 border border-white/20 cursor-pointer disabled:opacity-50"
          >
            {isExportingPdf ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            <span>Download PDF Lengkap</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAllToDrive}
            disabled={isSavingDrive || isExportingPdf}
            className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSavingDrive ? <Loader2 size={15} className="animate-spin" /> : <CloudUpload size={15} />}
            <span>Simpan ke Google Drive</span>
          </button>
        </div>
      </div>

      {/* Result Banner when Saving to Drive */}
      {driveResult && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs shadow-sm transition-all ${
          driveResult.success
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center gap-2.5">
            {driveResult.success ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0" /> : <AlertCircle size={18} className="text-rose-600 shrink-0" />}
            <span className="font-medium">{driveResult.message}</span>
          </div>
          {driveResult.link && (
            <a
              href={driveResult.link}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors text-xs shrink-0"
            >
              <ExternalLink size={13} />
              Buka File di Drive
            </a>
          )}
        </div>
      )}

      {driveProgress && (
        <div className="bg-sky-50 border border-sky-200 text-sky-900 px-4 py-3 rounded-xl flex items-center gap-3 text-xs animate-pulse">
          <Loader2 size={16} className="animate-spin text-sky-600 shrink-0" />
          <span>{driveProgress}</span>
        </div>
      )}

      {/* Sub-menu Tabs */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm overflow-x-auto print:hidden">
        <div className="flex items-center gap-1 min-w-max">
          {SUB_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Active Sub-report */}
      <div className="transition-all duration-200">
        {activeSubTab === 'surat_pengantar' && (
          <CoverLetterMPD
            month={selectedMonth}
            year={selectedYear}
            signatureDate={signatureDate}
            deeds={deeds}
            privateDeeds={privateDeeds}
            protestCheques={protestCheques}
            outgoingMails={outgoingMails}
            showStamp={showStamp}
          />
        )}

        {activeSubTab === 'laporan_akta' && (
          <DeedReport
            month={selectedMonth}
            year={selectedYear}
            deeds={deeds}
            signatureDate={signatureDate}
            showStamp={showStamp}
          />
        )}

        {activeSubTab === 'klapper_akta' && (
          <DeedAlphabeticalReport
            month={selectedMonth}
            year={selectedYear}
            deeds={deeds}
            signatureDate={signatureDate}
            showStamp={showStamp}
          />
        )}

        {activeSubTab === 'legalisasi' && (
          <PrivateDeedPrintView
            month={selectedMonth}
            year={selectedYear}
            type="Legalisasi"
            privateDeeds={privateDeeds}
            signatureDate={signatureDate}
            showStamp={showStamp}
          />
        )}

        {activeSubTab === 'waarmerking' && (
          <PrivateDeedPrintView
            month={selectedMonth}
            year={selectedYear}
            type="Waarmerking"
            privateDeeds={privateDeeds}
            signatureDate={signatureDate}
            showStamp={showStamp}
          />
        )}

        {activeSubTab === 'protest_cheque' && (
          <ProtestChequeReport
            month={selectedMonth}
            year={selectedYear}
            protestCheques={protestCheques}
            signatureDate={signatureDate}
            showStamp={showStamp}
          />
        )}
      </div>
    </div>
  );
};
