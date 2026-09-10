import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Printer,
  Download,
  FileSpreadsheet,
  Settings,
  Edit2,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  Building,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { PpatDeed, Holiday, DailyReportRow, PpatProfileConfig } from '../../types/ppat';
import { PpatService } from '../../services/PpatService';
import { PpatDeedModal } from './PpatDeedModal';
import { HolidayManagerModal } from './HolidayManagerModal';
import { PpatProfileModal } from './PpatProfileModal';
import { exportPpatReportToPdf } from '../../utils/ppatExportPdf';
import { exportPpatReportToExcel } from '../../utils/ppatExportExcel';

const MONTH_OPTIONS = [
  { value: 1, label: 'Januari', short: 'Jan' },
  { value: 2, label: 'Februari', short: 'Feb' },
  { value: 3, label: 'Maret', short: 'Mar' },
  { value: 4, label: 'April', short: 'Apr' },
  { value: 5, label: 'Mei', short: 'Mei' },
  { value: 6, label: 'Juni', short: 'Jun' },
  { value: 7, label: 'Juli', short: 'Jul' },
  { value: 8, label: 'Agustus', short: 'Agu' },
  { value: 9, label: 'September', short: 'Sep' },
  { value: 10, label: 'Oktober', short: 'Okt' },
  { value: 11, label: 'November', short: 'Nov' },
  { value: 12, label: 'Desember', short: 'Des' }
];

export const PpatReportPage: React.FC = () => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);

  const [deeds, setDeeds] = useState<PpatDeed[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [config, setConfig] = useState<PpatProfileConfig>({
    ppatName: 'PUTRI, S.H., M.Kn.',
    skNumber: 'SK Kepala BPN RI No. 12-X-2020',
    workingArea: 'Kabupaten Sleman',
    officeAddress: 'Jl. Kaliurang Km 5.5 No. 88, Sleman, D.I. Yogyakarta',
    city: 'Sleman',
    phone: '0274-889900'
  });

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isDeedModalOpen, setIsDeedModalOpen] = useState(false);
  const [editingDeed, setEditingDeed] = useState<PpatDeed | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState<string>('');

  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Load Initial Data & Subscriptions
  useEffect(() => {
    let unsubscribeDeeds: () => void;
    let unsubscribeHolidays: () => void;

    const initData = async () => {
      setLoading(true);
      try {
        const ppatConf = await PpatService.getPpatSettings();
        setConfig(ppatConf);

        unsubscribeDeeds = PpatService.subscribePpatDeedsByMonth(selectedYear, selectedMonth, (data) => {
          setDeeds(data);
          setLoading(false);
        });

        unsubscribeHolidays = PpatService.subscribeHolidays(selectedYear, (data) => {
          setHolidays(data);
        });
      } catch (err) {
        console.error('Error loading PPAT report data:', err);
        setLoading(false);
      }
    };

    initData();

    return () => {
      if (unsubscribeDeeds) unsubscribeDeeds();
      if (unsubscribeHolidays) unsubscribeHolidays();
    };
  }, [selectedYear, selectedMonth]);

  // Generate calendar days for selected month & year
  const dailyReportRows = useMemo<DailyReportRow[]>(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const rows: DailyReportRow[] = [];

    // Map holidays by YYYY-MM-DD
    const holidayMap = new Map<string, Holiday>();
    holidays.forEach((h) => {
      if (h.isActive) {
        holidayMap.set(h.date, h);
      }
    });

    // Group deeds by YYYY-MM-DD
    const deedsByDate = new Map<string, PpatDeed[]>();
    deeds.forEach((d) => {
      const list = deedsByDate.get(d.date) || [];
      list.push(d);
      deedsByDate.set(d.date, list);
    });

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(selectedYear, selectedMonth - 1, day);
      const dayOfWeek = dateObj.getDay(); // 0 = Minggu, 6 = Sabtu
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // HANYA hari Minggu yang libur akhir pekan. Hari Sabtu tetap hari kerja (tidak libur).
      const isWeekend = dayOfWeek === 0;
      const holidayInfo = holidayMap.get(dateStr);
      const isHoliday = !!holidayInfo;
      const dayDeeds = deedsByDate.get(dateStr) || [];
      const isNihil = dayDeeds.length === 0;

      rows.push({
        dayNumber: day,
        date: dateStr,
        isWeekend,
        isHoliday,
        holidayInfo,
        deeds: dayDeeds,
        isNihil
      });
    }

    return rows;
  }, [selectedYear, selectedMonth, deeds, holidays]);

  // Calculations for Summary
  const stats = useMemo(() => {
    let totalDeeds = 0;
    let totalTransaction = 0;
    let totalSsp = 0;
    let totalSsb = 0;
    let holidayCount = 0;
    let workDayCount = 0;

    dailyReportRows.forEach((r) => {
      if (r.isWeekend || r.isHoliday) {
        holidayCount++;
      } else {
        workDayCount++;
      }
      r.deeds.forEach((d) => {
        totalDeeds++;
        totalTransaction += Number(d.transactionValue) || 0;
        totalSsp += Number(d.sspAmount) || 0;
        totalSsb += Number(d.ssbAmount) || 0;
      });
    });

    return {
      daysInMonth: dailyReportRows.length,
      holidayCount,
      workDayCount,
      totalDeeds,
      totalTransaction,
      totalSsp,
      totalSsb
    };
  }, [dailyReportRows]);

  // Handlers
  const handleCreateDeedForDay = (dateStr: string) => {
    setEditingDeed(null);
    setModalDefaultDate(dateStr);
    setIsDeedModalOpen(true);
  };

  const handleEditDeed = (deed: PpatDeed) => {
    setEditingDeed(deed);
    setModalDefaultDate(deed.date);
    setIsDeedModalOpen(true);
  };

  const handleDeleteDeed = async (id: string, deedNumber: string) => {
    if (window.confirm(`Hapus akta PPAT No. ${deedNumber}?`)) {
      try {
        await PpatService.deletePpatDeed(id);
      } catch (err: any) {
        alert(err.message || 'Gagal menghapus akta');
      }
    }
  };

  const handleSaveDeed = async (formData: Partial<PpatDeed>) => {
    if (editingDeed?.id) {
      await PpatService.updatePpatDeed(editingDeed.id, formData);
    } else {
      await PpatService.createPpatDeed(formData);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    exportPpatReportToPdf({
      month: selectedMonth,
      year: selectedYear,
      rows: dailyReportRows,
      config: config
    });
  };

  const handleExportExcel = () => {
    exportPpatReportToExcel({
      month: selectedMonth,
      year: selectedYear,
      rows: dailyReportRows,
      config: config
    });
  };

  const currentMonthObj = MONTH_OPTIONS.find((m) => m.value === selectedMonth);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 font-sans print:bg-white print:p-0">
      
      {/* Top Controls & Actions (Hidden during print) */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Title & Badge */}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                  Laporan Bulanan Akta PPAT
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full">
                  Format Resmi BPN
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pembuatan Buku Laporan Bulanan Akta Tanah Pejabat Pembuat Akta Tanah (PPAT)
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setEditingDeed(null);
                  setModalDefaultDate(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`);
                  setIsDeedModalOpen(true);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" /> Tambah Akta
              </button>

              <button
                onClick={() => setIsHolidayModalOpen(true)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                title="Kelola Kalender Hari Libur"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-500" /> Hari Libur
              </button>

              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                title="Pengaturan Data PPAT"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" /> Profil PPAT
              </button>

              <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

              <button
                onClick={handlePrint}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                title="Cetak Tampilan Dokumen"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" /> Cetak
              </button>

              <button
                onClick={handleExportPdf}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                title="Unduh format PDF"
              >
                <Download className="w-3.5 h-3.5 text-rose-500" /> Export PDF
              </button>

              <button
                onClick={handleExportExcel}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                title="Unduh format Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export Excel
              </button>
            </div>
          </div>

          {/* Month & Year Navigation Bar */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            
            {/* Year Selector & Month Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full">
              {/* Year Select */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-xs font-bold text-slate-800 bg-slate-100 border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {[2023, 2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>Tahun {y}</option>
                ))}
              </select>

              {/* Month Pills */}
              <div className="flex items-center gap-1">
                {MONTH_OPTIONS.map((m) => {
                  const isActive = selectedMonth === m.value;
                  return (
                    <button
                      key={m.value}
                      onClick={() => setSelectedMonth(m.value)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-emerald-600 text-white font-bold shadow-xs'
                          : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 bg-slate-100'
                      }`}
                    >
                      {m.short}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick stats mini badge */}
            <div className="text-xs text-slate-500 flex items-center gap-3">
              <span>Periode: <strong>{currentMonthObj?.label} {selectedYear}</strong></span>
              <span>Total Akta: <strong className="text-emerald-700">{stats.totalDeeds}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Report Canvas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* Paper Document Container */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200/80 p-6 sm:p-8 print:shadow-none print:border-none print:p-0">
          
          {/* Header Formal PPAT */}
          <div className="text-center mb-6 pb-4 border-b-2 border-slate-800">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-wider uppercase">
              LAPORAN BULANAN PEMBUATAN AKTA PPAT
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-0.5">
              BULAN: {currentMonthObj?.label.toUpperCase()} {selectedYear}
            </p>
          </div>

          {/* Sub Header (PPAT Info Left & Destination Right) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-xs text-slate-800">
            <div className="space-y-1">
              <div className="grid grid-cols-3">
                <span className="font-semibold text-slate-600">Nama PPAT</span>
                <span className="col-span-2">: {config.ppatName}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="font-semibold text-slate-600">Daerah Kerja</span>
                <span className="col-span-2">: {config.workingArea}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="font-semibold text-slate-600">Alamat Kantor</span>
                <span className="col-span-2">: {config.officeAddress}</span>
              </div>
              {config.skNumber && (
                <div className="grid grid-cols-3">
                  <span className="font-semibold text-slate-600">Nomor SK</span>
                  <span className="col-span-2">: {config.skNumber}</span>
                </div>
              )}
            </div>

            <div className="space-y-1 md:pl-8">
              <div className="font-semibold text-slate-700">Kepada Yth:</div>
              <div className="pl-3 space-y-0.5 text-slate-700">
                <div>1. Kepala Kantor Pertanahan {config.workingArea}</div>
                <div>2. Kepala Kantor Pelayanan Pajak Pratama</div>
              </div>
            </div>
          </div>

          {/* Table Report with multi-level headers */}
          <div className="overflow-x-auto border border-slate-400 rounded-lg">
            <table className="w-full border-collapse text-[11px] text-slate-800 leading-tight">
              
              {/* Level 1 & Level 2 Headers */}
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-400 text-center divide-x divide-slate-400">
                  <th rowSpan={2} className="py-2.5 px-2 w-12 align-middle">
                    NO.<br />TGL
                  </th>
                  <th colSpan={1} className="py-1 px-2 min-w-[130px]">
                    AKTA
                  </th>
                  <th rowSpan={2} className="py-2.5 px-2 min-w-[130px] align-middle">
                    BENTUK<br />PERBUATAN HUKUM
                  </th>
                  <th colSpan={2} className="py-1 px-2 min-w-[280px]">
                    NAMA, ALAMAT & NPWP PARA PIHAK
                  </th>
                  <th rowSpan={2} className="py-2.5 px-2 min-w-[140px] align-middle">
                    JENIS &<br />NO. HAK
                  </th>
                  <th rowSpan={2} className="py-2.5 px-2 min-w-[150px] align-middle">
                    LETAK TANAH<br />& BANGUNAN
                  </th>
                  <th colSpan={2} className="py-1 px-2 min-w-[100px]">
                    LUAS (M²)
                  </th>
                  <th rowSpan={2} className="py-2.5 px-2 min-w-[120px] align-middle">
                    HARGA TRANSAKSI<br />(RP)
                  </th>
                  <th colSpan={1} className="py-1 px-2 min-w-[130px]">
                    SPPT PBB
                  </th>
                  <th colSpan={1} className="py-1 px-2 min-w-[110px]">
                    SSP (PPH)
                  </th>
                  <th colSpan={1} className="py-1 px-2 min-w-[110px]">
                    SSB (BPHTB)
                  </th>
                  <th rowSpan={2} className="py-2.5 px-2 min-w-[110px] align-middle">
                    KET
                  </th>
                  <th rowSpan={2} className="py-2.5 px-2 w-16 align-middle print:hidden">
                    AKSI
                  </th>
                </tr>

                {/* Sub-header row */}
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-400 text-center divide-x divide-slate-400 text-[10px]">
                  <th className="py-1.5 px-2">NOMOR & TGL</th>
                  <th className="py-1.5 px-2">PIHAK PENGALIH</th>
                  <th className="py-1.5 px-2">PIHAK PENERIMA</th>
                  <th className="py-1.5 px-2 w-12">TANAH</th>
                  <th className="py-1.5 px-2 w-12">BGN</th>
                  <th className="py-1.5 px-2">NOP / NJOP</th>
                  <th className="py-1.5 px-2">TGL / RP</th>
                  <th className="py-1.5 px-2">TGL / RP</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-300">
                {dailyReportRows.map((row) => {
                  const isLibur = row.isWeekend || row.isHoliday;
                  const holidayLabel = row.holidayInfo?.name ? `LIBUR (${row.holidayInfo.name})` : 'LIBUR';

                  if (isLibur) {
                    return (
                      <tr
                        key={row.dayNumber}
                        className="bg-slate-100/90 text-slate-500 divide-x divide-slate-300"
                      >
                        <td className="py-2 px-2 text-center font-bold text-slate-700 bg-slate-200/60">
                          {row.dayNumber}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-[10px]">
                          {String(row.dayNumber).padStart(2, '0')}/{String(selectedMonth).padStart(2, '0')}/{selectedYear}
                        </td>
                        <td className="py-2 px-2 text-center">—</td>
                        <td className="py-2 px-2 text-center">—</td>
                        <td className="py-2 px-2 text-center">—</td>
                        <td className="py-2 px-2 text-center">—</td>
                        <td className="py-2 px-2 text-center">—</td>
                        <td className="py-2 px-2 text-center">—</td>
                        <td className="py-2 px-2 text-center">—</td>
                        <td className="py-2 px-2 text-center">—</td>
                        <td className="py-2 px-2 text-center">—</td>
                        <td className="py-2 px-2 text-center">—</td>
                        <td className="py-2 px-2 text-center">—</td>
                        <td className="py-2 px-2 text-center font-semibold text-slate-600 bg-slate-200/50">
                          {holidayLabel}
                        </td>
                        <td className="py-2 px-2 text-center print:hidden">
                          <button
                            onClick={() => handleCreateDeedForDay(row.date)}
                            className="text-[10px] text-slate-400 hover:text-emerald-700 underline"
                            title="Tetap tambah akta bila ada transaksi lembur"
                          >
                            + Akta
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  if (row.isNihil || row.deeds.length === 0) {
                    return (
                      <tr
                        key={row.dayNumber}
                        className="hover:bg-slate-50/70 divide-x divide-slate-300 transition-colors"
                      >
                        <td className="py-2 px-2 text-center font-semibold text-slate-800 bg-slate-50">
                          {row.dayNumber}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-[10px] text-slate-500">
                          {String(row.dayNumber).padStart(2, '0')}/{String(selectedMonth).padStart(2, '0')}/{selectedYear}
                        </td>
                        <td className="py-2 px-2 text-center text-slate-400">—</td>
                        <td className="py-2 px-2 text-center text-slate-400">—</td>
                        <td className="py-2 px-2 text-center text-slate-400">—</td>
                        <td className="py-2 px-2 text-center text-slate-400">—</td>
                        <td className="py-2 px-2 text-center text-slate-400">—</td>
                        <td className="py-2 px-2 text-center text-slate-400">—</td>
                        <td className="py-2 px-2 text-center text-slate-400">—</td>
                        <td className="py-2 px-2 text-center text-slate-400">—</td>
                        <td className="py-2 px-2 text-center text-slate-400">—</td>
                        <td className="py-2 px-2 text-center text-slate-400">—</td>
                        <td className="py-2 px-2 text-center text-slate-400">—</td>
                        <td className="py-2 px-2 text-center font-medium text-slate-500">
                          NIHIL
                        </td>
                        <td className="py-2 px-2 text-center print:hidden">
                          <button
                            onClick={() => handleCreateDeedForDay(row.date)}
                            className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                            title="Tambah Akta pada Tanggal ini"
                          >
                            <Plus className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  // Day with Deeds
                  return row.deeds.map((deed, dIdx) => (
                    <tr
                      key={deed.id}
                      className="hover:bg-emerald-50/40 divide-x divide-slate-300 transition-colors"
                    >
                      {dIdx === 0 ? (
                        <td
                          rowSpan={row.deeds.length}
                          className="py-2 px-2 text-center font-bold text-slate-900 bg-emerald-100/30 align-top"
                        >
                          {row.dayNumber}
                        </td>
                      ) : null}

                      {/* Akta No & Tgl */}
                      <td className="py-2 px-2 align-top">
                        <div className="font-bold text-slate-900">{deed.deedNumber}</div>
                        <div className="text-[10px] text-slate-500">{deed.date}</div>
                        {deed.orderNumber && (
                          <div className="text-[9px] text-slate-400">Urut: {deed.orderNumber}</div>
                        )}
                      </td>

                      {/* Bentuk Perbuatan Hukum */}
                      <td className="py-2 px-2 font-medium text-slate-800 align-top">
                        {deed.legalActType}
                      </td>

                      {/* Pihak Pengalih */}
                      <td className="py-2 px-2 align-top">
                        <div className="font-semibold text-slate-900">{deed.grantorName || '—'}</div>
                        {deed.grantorAddress && (
                          <div className="text-[10px] text-slate-600 mt-0.5">{deed.grantorAddress}</div>
                        )}
                        {deed.grantorNpwp && (
                          <div className="text-[9px] font-mono text-slate-500">NPWP: {deed.grantorNpwp}</div>
                        )}
                      </td>

                      {/* Pihak Penerima */}
                      <td className="py-2 px-2 align-top">
                        <div className="font-semibold text-slate-900">{deed.transfereeName || '—'}</div>
                        {deed.transfereeAddress && (
                          <div className="text-[10px] text-slate-600 mt-0.5">{deed.transfereeAddress}</div>
                        )}
                        {deed.transfereeNpwp && (
                          <div className="text-[9px] font-mono text-slate-500">NPWP: {deed.transfereeNpwp}</div>
                        )}
                      </td>

                      {/* Jenis & No Hak */}
                      <td className="py-2 px-2 font-medium text-slate-800 align-top">
                        {deed.rightTypeAndNumber || '—'}
                      </td>

                      {/* Letak Tanah */}
                      <td className="py-2 px-2 text-slate-700 align-top">
                        {deed.landLocation || '—'}
                      </td>

                      {/* Luas Tanah */}
                      <td className="py-2 px-2 text-right font-mono align-top">
                        {deed.landArea ? `${deed.landArea} m²` : '—'}
                      </td>

                      {/* Luas Bangunan */}
                      <td className="py-2 px-2 text-right font-mono align-top">
                        {deed.buildingArea ? `${deed.buildingArea} m²` : '—'}
                      </td>

                      {/* Harga Transaksi */}
                      <td className="py-2 px-2 text-right font-mono font-medium text-slate-900 align-top">
                        {deed.transactionValue ? `Rp ${deed.transactionValue.toLocaleString('id-ID')}` : '—'}
                      </td>

                      {/* SPPT PBB */}
                      <td className="py-2 px-2 align-top">
                        {deed.spptPbbNopYear && (
                          <div className="text-[10px] font-mono">{deed.spptPbbNopYear}</div>
                        )}
                        {deed.spptPbbNjop ? (
                          <div className="text-[10px] font-mono text-slate-600">
                            NJOP: Rp {deed.spptPbbNjop.toLocaleString('id-ID')}
                          </div>
                        ) : null}
                        {!deed.spptPbbNopYear && !deed.spptPbbNjop && '—'}
                      </td>

                      {/* SSP (PPh) */}
                      <td className="py-2 px-2 text-right align-top">
                        {deed.sspAmount ? (
                          <>
                            <div className="font-mono text-emerald-800 font-medium">
                              Rp {deed.sspAmount.toLocaleString('id-ID')}
                            </div>
                            {deed.sspDate && (
                              <div className="text-[9px] text-slate-500">Tgl: {deed.sspDate}</div>
                            )}
                          </>
                        ) : '—'}
                      </td>

                      {/* SSB (BPHTB) */}
                      <td className="py-2 px-2 text-right align-top">
                        {deed.ssbAmount ? (
                          <>
                            <div className="font-mono text-blue-800 font-medium">
                              Rp {deed.ssbAmount.toLocaleString('id-ID')}
                            </div>
                            {deed.ssbDate && (
                              <div className="text-[9px] text-slate-500">Tgl: {deed.ssbDate}</div>
                            )}
                          </>
                        ) : '—'}
                      </td>

                      {/* Keterangan */}
                      <td className="py-2 px-2 text-center text-slate-600 align-top">
                        {deed.notes || 'Lengkap'}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-2 text-center align-top print:hidden">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEditDeed(deed)}
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                            title="Edit Data Akta"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDeed(deed.id, deed.deedNumber)}
                            className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Hapus Akta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ));
                })}
              </tbody>

              {/* Table Footer with Summaries */}
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900 divide-x divide-slate-400">
                  <td colSpan={9} className="py-2.5 px-3 text-right uppercase text-xs">
                    JUMLAH TOTAL BULAN INI ({stats.totalDeeds} AKTA):
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-xs text-slate-900">
                    Rp {stats.totalTransaction.toLocaleString('id-ID')}
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-500">—</td>
                  <td className="py-2.5 px-2 text-right font-mono text-xs text-emerald-800">
                    Rp {stats.totalSsp.toLocaleString('id-ID')}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-xs text-blue-800">
                    Rp {stats.totalSsb.toLocaleString('id-ID')}
                  </td>
                  <td colSpan={2} className="py-2.5 px-2 text-center text-slate-500 print:table-cell">
                    —
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signature / Validation Footer */}
          <div className="mt-12 flex justify-end">
            <div className="text-center w-72 text-xs space-y-1">
              <div>
                {config.city || 'Sleman'}, {new Date(selectedYear, selectedMonth, 0).getDate()} {currentMonthObj?.label} {selectedYear}
              </div>
              <div className="font-medium text-slate-700">
                Pejabat Pembuat Akta Tanah (PPAT)
              </div>
              <div className="h-28" /> {/* Ruang fisik tanda tangan & cap stempel dinas PPAT dibuat tinggi agar pas saat dicap */}
              <div className="font-bold text-slate-900 text-sm underline">
                {config.ppatName}
              </div>
              {config.skNumber && (
                <div className="text-[10px] text-slate-600">
                  {config.skNumber}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Modals */}
      <PpatDeedModal
        isOpen={isDeedModalOpen}
        onClose={() => setIsDeedModalOpen(false)}
        onSave={handleSaveDeed}
        initialData={editingDeed}
        defaultDate={modalDefaultDate}
      />

      <HolidayManagerModal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        year={selectedYear}
        onUpdate={() => {
          PpatService.getHolidaysByYear(selectedYear).then(setHolidays);
        }}
      />

      <PpatProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        config={config}
        onSave={(newConf) => setConfig(newConf)}
      />

    </div>
  );
};
