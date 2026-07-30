import React, { useState, useEffect } from 'react';
import { Deed, PrivateDeed, ProtestCheque, OutgoingMail } from '../../../types';
import { NotaryService } from '../../services/NotaryService';
import { CoverLetterMPD } from './CoverLetterMPD';
import { DeedReport } from './DeedReport';
import { DeedAlphabeticalReport } from './DeedAlphabeticalReport';
import { PrivateDeedPrintView } from './PrivateDeedPrintView';
import { ProtestChequeReport } from './ProtestChequeReport';
import { BookOpen, FileText, ListOrdered, ShieldCheck, FileCheck, AlertCircle, Calendar, ExternalLink, Info } from 'lucide-react';

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

export const NotaryReportHub: React.FC = () => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [signatureDate, setSignatureDate] = useState<string>(
    `${currentDate.getDate()} ${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
  );

  const [activeSubTab, setActiveSubTab] = useState<NotaryReportSubTab>('surat_pengantar');

  // Firestore state
  const [deeds, setDeeds] = useState<Deed[]>([]);
  const [privateDeeds, setPrivateDeeds] = useState<PrivateDeed[]>([]);
  const [protestCheques, setProtestCheques] = useState<ProtestCheque[]>([]);
  const [outgoingMails, setOutgoingMails] = useState<OutgoingMail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubDeeds = NotaryService.subscribeDeeds(data => setDeeds(data));
    const unsubPrivate = NotaryService.subscribePrivateDeeds(data => setPrivateDeeds(data));
    const unsubProtest = NotaryService.subscribeProtestCheques(data => setProtestCheques(data));
    const unsubMails = NotaryService.subscribeOutgoingMails(data => {
      setOutgoingMails(data);
      setLoading(false);
    });

    return () => {
      unsubDeeds();
      unsubPrivate();
      unsubProtest();
      unsubMails();
    };
  }, []);

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

  const SUB_TABS: { id: NotaryReportSubTab; label: string; icon: React.FC<{ size?: number; className?: string }>; count?: number }[] = [
    { id: 'surat_pengantar', label: 'Surat Pengantar MPD', icon: FileText },
    { id: 'laporan_akta', label: 'Laporan Bulanan Akta', icon: BookOpen, count: currentDeeds.length },
    { id: 'klapper_akta', label: 'Laporan Klapper Akta', icon: ListOrdered },
    { id: 'legalisasi', label: 'Laporan Legalisasi', icon: ShieldCheck, count: currentLegalisasi.length },
    { id: 'waarmerking', label: 'Laporan Waarmerking', icon: FileCheck, count: currentWaarmerking.length },
    { id: 'protest_cheque', label: 'Protest Cheque', icon: AlertCircle, count: currentProtest.length }
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
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
        </div>
      </div>

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
          />
        )}

        {activeSubTab === 'laporan_akta' && (
          <DeedReport
            month={selectedMonth}
            year={selectedYear}
            deeds={deeds}
            signatureDate={signatureDate}
          />
        )}

        {activeSubTab === 'klapper_akta' && (
          <DeedAlphabeticalReport
            month={selectedMonth}
            year={selectedYear}
            deeds={deeds}
            signatureDate={signatureDate}
          />
        )}

        {activeSubTab === 'legalisasi' && (
          <PrivateDeedPrintView
            month={selectedMonth}
            year={selectedYear}
            type="Legalisasi"
            privateDeeds={privateDeeds}
            signatureDate={signatureDate}
          />
        )}

        {activeSubTab === 'waarmerking' && (
          <PrivateDeedPrintView
            month={selectedMonth}
            year={selectedYear}
            type="Waarmerking"
            privateDeeds={privateDeeds}
            signatureDate={signatureDate}
          />
        )}

        {activeSubTab === 'protest_cheque' && (
          <ProtestChequeReport
            month={selectedMonth}
            year={selectedYear}
            protestCheques={protestCheques}
            signatureDate={signatureDate}
          />
        )}
      </div>
    </div>
  );
};
