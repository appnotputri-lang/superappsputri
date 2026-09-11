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
import { PpatDeed, Holiday, DailyReportRow, PpatProfileConfig, DEFAULT_PPAT_PROFILE } from '../../types/ppat';
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
  const [config, setConfig] = useState<PpatProfileConfig>({ ...DEFAULT_PPAT_PROFILE });

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
  const nextMonthDate = new Date(selectedYear, selectedMonth, 1);
  const nextMonthName = MONTH_OPTIONS.find((m) => m.value === nextMonthDate.getMonth() + 1)?.label || 'Bulan';
  const nextMonthYear = nextMonthDate.getFullYear();
  const defaultSignDate = `01 ${nextMonthName} ${nextMonthYear}`;
  const signCity = (config.city && config.city !== 'Lembang' && config.city !== 'Sleman') ? config.city : 'Bandung Barat';
  const recipientLines = (config.reportRecipients && config.reportRecipients.trim())
    ? config.reportRecipients.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
    : [
        '1) Kepala Kantor Wilayah BPN Propinsi Jawa Barat',
        '2) Kepala Kantor Pertanahan Kabupaten Bandung Barat',
        '3) Kepala Kantor Badan Pengelolaan Keuangan Daerah Kab. Bandung Barat',
        '4) Kepala Kantor Pelayanan Pajak Pratama Cimahi'
      ];

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
                  Format Resmi SKB 1998
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Buku Laporan Bulanan Pembuatan Akta Pejabat Pembuat Akta Tanah (PPAT)
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
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 mt-6">
        
        {/* Paper Document Container */}
        <div className="bg-white rounded-xl shadow-md border border-slate-300 p-4 sm:p-7 print:shadow-none print:border-none print:p-0">
          
          {/* Header Regulasi SKB (Bagian Atas Persis PDF) */}
          <div className="mb-4 text-[10.5px] sm:text-[11px] text-black font-sans leading-tight">
            <p className="font-medium">Lampiran Keputusan Bersama Menteri Negara Agraria / Kepala Badan Pertanahan Nasional</p>
            <p className="font-medium">dan Direktur Jenderal Pajak.</p>
            <p className="mt-0.5 font-medium">Nomor&nbsp;&nbsp;&nbsp;: SKB 2 Tahun 1998 KEP – 179/Pj/1998</p>
            <p className="font-medium">Tanggal : 27 Agustus 1998</p>
          </div>

          {/* Dua Kolom Identitas PPAT (Kiri) & Instansi Penerima (Kanan) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-[10.5px] sm:text-[11px] text-black font-sans leading-snug">
            <div className="space-y-0.5">
              <div className="flex">
                <span className="w-28 font-medium">Nama PPAT</span>
                <span className="font-bold">: {config.ppatName}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-medium">Alamat</span>
                <span>: {config.officeAddress}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-medium">NPWP</span>
                <span>: {config.npwp || '3217015610760002'}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-medium">Daerah Kerja</span>
                <span className="font-bold">: {(config.workingArea || 'KABUPATEN BANDUNG BARAT').toUpperCase()}</span>
              </div>
            </div>

            <div className="space-y-0.5 md:pl-8">
              <p className="font-medium">Kepada Yth,</p>
              {recipientLines.map((recipient, rIdx) => (
                <p key={rIdx}>{recipient}</p>
              ))}
            </div>
          </div>

          {/* Judul Utama Laporan di Tengah */}
          <div className="text-center my-5">
            <h2 className="text-xs sm:text-sm md:text-base font-bold text-black uppercase tracking-wider">
              LAPORAN BULANAN PEMBUATAN AKTA OLEH PPAT
            </h2>
            <p className="text-[11px] sm:text-xs md:text-sm font-bold text-black mt-1">
              Bulan : {currentMonthObj?.label.toUpperCase()} &nbsp;&nbsp;&nbsp;&nbsp; Tahun : {selectedYear}
            </p>
          </div>

          {/* Tabel Laporan 18 Kolom Persis PDF */}
          <div className="overflow-x-auto border border-black shadow-xs">
            <table className="w-full border-collapse text-[9.5px] sm:text-[10.5px] text-black font-sans leading-tight border border-black">
              
              {/* Level 1, 2, & 3 Headers (18 Kolom Resmi SKB 1998) */}
              <thead>
                {/* Level 1: 12 Header Utama */}
                <tr className="border border-black font-bold text-center bg-white text-black">
                  <th rowSpan={2} className="border border-black px-1.5 py-1.5 w-10 align-middle">
                    NO.<br />URUT
                  </th>
                  <th colSpan={2} className="border border-black px-1.5 py-1 align-middle">
                    AKTA
                  </th>
                  <th rowSpan={2} className="border border-black px-1.5 py-1.5 min-w-[85px] align-middle">
                    BENTUK<br />PERBUATAN<br />HUKUM
                  </th>
                  <th colSpan={2} className="border border-black px-1.5 py-1 min-w-[190px] align-middle">
                    NAMA, ALAMAT DAN NPWP
                  </th>
                  <th rowSpan={2} className="border border-black px-1.5 py-1.5 min-w-[80px] align-middle">
                    JENIS<br />DAN<br />NOMOR<br />HAK
                  </th>
                  <th rowSpan={2} className="border border-black px-1.5 py-1.5 min-w-[90px] align-middle">
                    LETAK<br />TANAH<br />DAN<br />BANGUNAN
                  </th>
                  <th colSpan={2} className="border border-black px-1.5 py-1 min-w-[60px] align-middle">
                    LUAS (M2)
                  </th>
                  <th rowSpan={2} className="border border-black px-1.5 py-1.5 min-w-[100px] align-middle">
                    HARGA<br />TRANSAKSI<br />PEROLEHAN<br />/ PENGALIHAN<br />HAK (RP.)
                  </th>
                  <th colSpan={2} className="border border-black px-1.5 py-1 min-w-[90px] align-middle">
                    SPPT PBB
                  </th>
                  <th colSpan={2} className="border border-black px-1.5 py-1 min-w-[80px] align-middle">
                    SSP
                  </th>
                  <th colSpan={2} className="border border-black px-1.5 py-1 min-w-[80px] align-middle">
                    SSB
                  </th>
                  <th rowSpan={2} className="border border-black px-1.5 py-1.5 min-w-[60px] align-middle">
                    KET
                  </th>
                  <th rowSpan={2} className="border border-black px-1.5 py-1.5 w-12 align-middle print:hidden bg-slate-100 text-slate-700">
                    AKSI
                  </th>
                </tr>

                {/* Level 2: Sub-header Kolom Turunan */}
                <tr className="border border-black font-bold text-center bg-white text-black text-[9px] sm:text-[9.5px]">
                  {/* Under AKTA */}
                  <th className="border border-black px-1 py-1 min-w-[45px] align-middle">NO.</th>
                  <th className="border border-black px-1 py-1 min-w-[70px] align-middle">TANGGAL</th>

                  {/* Under NAMA, ALAMAT DAN NPWP */}
                  <th className="border border-black px-1.5 py-1 min-w-[95px] align-middle">
                    PIHAK YANG<br />MENGALIHKAN/<br />MEMBERIKAN
                  </th>
                  <th className="border border-black px-1.5 py-1 min-w-[95px] align-middle">
                    PIHAK YANG<br />MENERIMA
                  </th>

                  {/* Under LUAS */}
                  <th className="border border-black px-1 py-1 w-9 align-middle">TNH</th>
                  <th className="border border-black px-1 py-1 w-9 align-middle">BGN</th>

                  {/* Under SPPT PBB */}
                  <th className="border border-black px-1 py-1 min-w-[60px] align-middle">
                    NOP<br />TAHUN
                  </th>
                  <th className="border border-black px-1 py-1 min-w-[55px] align-middle">
                    NJOP<br />(RP.000)
                  </th>

                  {/* Under SSP */}
                  <th className="border border-black px-1 py-1 min-w-[50px] align-middle">TANGGAL</th>
                  <th className="border border-black px-1 py-1 min-w-[50px] align-middle">(Rp)</th>

                  {/* Under SSB */}
                  <th className="border border-black px-1 py-1 min-w-[50px] align-middle">TANGGAL</th>
                  <th className="border border-black px-1 py-1 min-w-[50px] align-middle">(RP)</th>
                </tr>

                {/* Level 3: Baris Penomoran Kolom 1 s/d 18 */}
                <tr className="border border-black font-bold text-center bg-white text-black text-[9px]">
                  <th className="border border-black py-0.5">1</th>
                  <th className="border border-black py-0.5">2</th>
                  <th className="border border-black py-0.5">3</th>
                  <th className="border border-black py-0.5">4</th>
                  <th className="border border-black py-0.5">5</th>
                  <th className="border border-black py-0.5">6</th>
                  <th className="border border-black py-0.5">7</th>
                  <th className="border border-black py-0.5">8</th>
                  <th className="border border-black py-0.5">9</th>
                  <th className="border border-black py-0.5">10</th>
                  <th className="border border-black py-0.5">11</th>
                  <th className="border border-black py-0.5">12</th>
                  <th className="border border-black py-0.5">13</th>
                  <th className="border border-black py-0.5">14</th>
                  <th className="border border-black py-0.5">15</th>
                  <th className="border border-black py-0.5">16</th>
                  <th className="border border-black py-0.5">17</th>
                  <th className="border border-black py-0.5">18</th>
                  <th className="border border-black py-0.5 print:hidden bg-slate-100 text-slate-400">—</th>
                </tr>
              </thead>

              {/* Table Body (Persis seperti baris dalam PDF) */}
              <tbody className="divide-y divide-black">
                {dailyReportRows.map((row) => {
                  const isLibur = row.isWeekend || row.isHoliday;
                  const dateFormatted = `${String(row.dayNumber).padStart(2, '0')}-${String(selectedMonth).padStart(2, '0')}-${selectedYear}`;

                  // BARIS HARI LIBUR: Abu-abu tegas, teks hitam tebal, kolom 4 NIHIL, kolom 18 LIBUR
                  if (isLibur) {
                    return (
                      <tr
                        key={row.dayNumber}
                        className="bg-[#bebebe] text-black font-bold border-b border-black text-center"
                      >
                        <td className="border border-black py-1 px-1">{row.dayNumber}.</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1 font-bold">{dateFormatted}</td>
                        <td className="border border-black py-1 px-1 tracking-widest font-bold">N I H I L</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1 font-bold">LIBUR</td>
                        <td className="border border-black py-1 px-1 print:hidden bg-slate-300">
                          <button
                            onClick={() => handleCreateDeedForDay(row.date)}
                            className="text-[9px] text-slate-800 hover:text-emerald-900 underline font-medium"
                            title="Tambah akta lembur jika ada"
                          >
                            + Akta
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  // BARIS HARI KERJA NIHIL: Background putih, kolom 4 NIHIL, kolom 5-18 tanda '-'
                  if (row.isNihil || row.deeds.length === 0) {
                    return (
                      <tr
                        key={row.dayNumber}
                        className="bg-white hover:bg-slate-50 text-black border-b border-black text-center transition-colors"
                      >
                        <td className="border border-black py-1 px-1 font-bold">{row.dayNumber}.</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1 font-bold">{dateFormatted}</td>
                        <td className="border border-black py-1 px-1 tracking-widest font-bold">N I H I L</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1">-</td>
                        <td className="border border-black py-1 px-1 font-bold">-</td>
                        <td className="border border-black py-1 px-1 print:hidden">
                          <button
                            onClick={() => handleCreateDeedForDay(row.date)}
                            className="p-0.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                            title="Tambah Akta pada Tanggal ini"
                          >
                            <Plus className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  // BARIS HARI BERISI AKTA
                  return row.deeds.map((deed, dIdx) => (
                    <tr
                      key={deed.id}
                      className="bg-white hover:bg-emerald-50/40 text-black border-b border-black transition-colors"
                    >
                      <td className="border border-black py-1 px-1 text-center font-bold">
                        {dIdx === 0 ? `${row.dayNumber}.` : ''}
                      </td>
                      <td className="border border-black py-1 px-1 text-center font-bold">
                        {deed.deedNumber || '-'}
                      </td>
                      <td className="border border-black py-1 px-1 text-center font-bold">
                        {deed.date || dateFormatted}
                      </td>
                      <td className="border border-black py-1 px-1 text-center font-bold">
                        {deed.legalActType || 'Jual Beli'}
                      </td>
                      <td className="border border-black py-1 px-1.5 text-left text-[9px] sm:text-[9.5px]">
                        <div className="font-semibold">{deed.grantorName || '-'}</div>
                        {deed.grantorAddress && <div className="text-slate-700 text-[8.5px]">{deed.grantorAddress}</div>}
                        {deed.grantorNpwp && <div className="text-slate-600 font-mono text-[8px]">NPWP: {deed.grantorNpwp}</div>}
                      </td>
                      <td className="border border-black py-1 px-1.5 text-left text-[9px] sm:text-[9.5px]">
                        <div className="font-semibold">{deed.transfereeName || '-'}</div>
                        {deed.transfereeAddress && <div className="text-slate-700 text-[8.5px]">{deed.transfereeAddress}</div>}
                        {deed.transfereeNpwp && <div className="text-slate-600 font-mono text-[8px]">NPWP: {deed.transfereeNpwp}</div>}
                      </td>
                      <td className="border border-black py-1 px-1 text-center">
                        {deed.rightTypeAndNumber || '-'}
                      </td>
                      <td className="border border-black py-1 px-1 text-left text-[9px] sm:text-[9.5px]">
                        {deed.landLocation || '-'}
                      </td>
                      <td className="border border-black py-1 px-1 text-center font-mono">
                        {deed.landArea ? `${deed.landArea}` : '-'}
                      </td>
                      <td className="border border-black py-1 px-1 text-center font-mono">
                        {deed.buildingArea ? `${deed.buildingArea}` : '-'}
                      </td>
                      <td className="border border-black py-1 px-1 text-center font-mono font-medium">
                        {deed.transactionValue ? deed.transactionValue.toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="border border-black py-1 px-1 text-center font-mono">
                        {deed.spptPbbNopYear || '-'}
                      </td>
                      <td className="border border-black py-1 px-1 text-center font-mono">
                        {deed.spptPbbNjop ? deed.spptPbbNjop.toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="border border-black py-1 px-1 text-center font-mono">
                        {deed.sspDate || '-'}
                      </td>
                      <td className="border border-black py-1 px-1 text-center font-mono">
                        {deed.sspAmount ? deed.sspAmount.toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="border border-black py-1 px-1 text-center font-mono">
                        {deed.ssbDate || '-'}
                      </td>
                      <td className="border border-black py-1 px-1 text-center font-mono">
                        {deed.ssbAmount ? deed.ssbAmount.toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="border border-black py-1 px-1 text-center">
                        {deed.notes || '-'}
                      </td>
                      <td className="border border-black py-1 px-1 text-center print:hidden">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEditDeed(deed)}
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                            title="Edit Data Akta"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteDeed(deed.id, deed.deedNumber)}
                            className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Hapus Akta"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>

          {/* Bagian Bawah Persis PDF: Tempat Tanggal di Kiri Bawah, Tanda Tangan PPAT di Kanan Bawah */}
          <div className="mt-8 flex flex-col sm:flex-row justify-between items-start text-xs text-black font-sans">
            {/* Tempat dan Tanggal di Kiri Bawah (sejajar margin kiri tabel) */}
            <div className="font-bold mb-4 sm:mb-0">
              {signCity}, {defaultSignDate}
            </div>

            {/* Pejabat Pembuat Akta Tanah di Kanan Bawah */}
            <div className="text-center w-72 space-y-0.5">
              <div className="font-bold">Pejabat Pembuat Akta Tanah</div>
              <div className="font-bold">di {(config.workingArea || 'KABUPATEN BANDUNG BARAT').toUpperCase()}</div>
              <div className="h-24 sm:h-28" /> {/* Ruang fisik tanda tangan & cap stempel resmi PPAT */}
              <div className="font-bold underline uppercase">
                ({config.ppatName})
              </div>
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
