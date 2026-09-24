import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  Filter,
  Download,
  Printer,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Building,
  CheckCircle2,
  AlertCircle,
  Eye,
  ArrowUpRight,
  RefreshCw,
  FileText,
  X,
  Scale,
  DollarSign,
  MapPin,
  Tag
} from 'lucide-react';
import { PpatDeed, PpatProfileConfig, DEFAULT_PPAT_PROFILE, LEGAL_ACT_TYPES } from '../../types/ppat';
import { PpatService } from '../../services/PpatService';
import { PpatDeedModal } from '../../components/ppat/PpatDeedModal';
import { exportPpatDeedBookToExcel, exportPpatDeedBookToPdf } from '../../utils/ppatDeedBookExport';
import { SidebarTabId } from '../../../types';

interface PpatDeedBookProps {
  setActiveSidebarTab?: (tab: SidebarTabId) => void;
}

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

export const PpatDeedBook: React.FC<PpatDeedBookProps> = ({ setActiveSidebarTab }) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);

  const [deeds, setDeeds] = useState<PpatDeed[]>([]);
  const [config, setConfig] = useState<PpatProfileConfig>({ ...DEFAULT_PPAT_PROFILE });
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLegalAct, setSelectedLegalAct] = useState<string>('ALL');

  // Modals
  const [isDeedModalOpen, setIsDeedModalOpen] = useState(false);
  const [editingDeed, setEditingDeed] = useState<PpatDeed | null>(null);
  const [viewingDeed, setViewingDeed] = useState<PpatDeed | null>(null);

  // Month counts cache
  const [monthDeedCounts, setMonthDeedCounts] = useState<Record<number, number>>({});

  // Load PPAT profile configuration and live deeds data
  useEffect(() => {
    let unsubscribe: () => void;

    const init = async () => {
      setLoading(true);
      try {
        const ppatConf = await PpatService.getPpatSettings();
        setConfig(ppatConf);

        unsubscribe = PpatService.subscribePpatDeedsByMonth(selectedYear, selectedMonth, (data) => {
          setDeeds(data);
          setLoading(false);
        });
      } catch (err) {
        console.error('[PpatDeedBook] Error loading deeds:', err);
        setLoading(false);
      }
    };

    init();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedYear, selectedMonth]);

  // Pre-fetch count of deeds for all months in the selected year
  useEffect(() => {
    let isMounted = true;
    const fetchYearSummary = async () => {
      try {
        const counts: Record<number, number> = {};
        for (let m = 1; m <= 12; m++) {
          const monthData = await PpatService.getPpatDeedsByMonth(selectedYear, m);
          counts[m] = monthData.length;
        }
        if (isMounted) {
          setMonthDeedCounts(counts);
        }
      } catch (err) {
        console.error('[PpatDeedBook] Error fetching month counts:', err);
      }
    };

    fetchYearSummary();
    return () => {
      isMounted = false;
    };
  }, [selectedYear, deeds]);

  // Filtered deeds
  const filteredDeeds = useMemo(() => {
    return deeds.filter((deed) => {
      // Type Filter
      if (selectedLegalAct !== 'ALL' && deed.legalActType !== selectedLegalAct) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchNumber = deed.deedNumber?.toLowerCase().includes(query);
        const matchGrantor = deed.grantorName?.toLowerCase().includes(query);
        const matchTransferee = deed.transfereeName?.toLowerCase().includes(query);
        const matchRight = deed.rightTypeAndNumber?.toLowerCase().includes(query);
        const matchLocation = deed.landLocation?.toLowerCase().includes(query);
        const matchNop = deed.spptPbbNopYear?.toLowerCase().includes(query);
        const matchNotes = deed.notes?.toLowerCase().includes(query);

        return matchNumber || matchGrantor || matchTransferee || matchRight || matchLocation || matchNop || matchNotes;
      }

      return true;
    });
  }, [deeds, selectedLegalAct, searchQuery]);

  // Statistical calculations
  const stats = useMemo(() => {
    let totalTransaction = 0;
    let totalSsp = 0;
    let totalSsb = 0;

    deeds.forEach((d) => {
      totalTransaction += Number(d.transactionValue) || 0;
      totalSsp += Number(d.sspAmount) || 0;
      totalSsb += Number(d.ssbAmount) || 0;
    });

    return {
      totalDeeds: deeds.length,
      filteredCount: filteredDeeds.length,
      totalTransaction,
      totalSsp,
      totalSsb
    };
  }, [deeds, filteredDeeds]);

  // Action handlers
  const handleOpenAddDeed = () => {
    setEditingDeed(null);
    setIsDeedModalOpen(true);
  };

  const handleEditDeed = (deed: PpatDeed) => {
    setEditingDeed(deed);
    setIsDeedModalOpen(true);
  };

  const handleDeleteDeed = async (deed: PpatDeed) => {
    if (window.confirm(`Hapus akta PPAT No. ${deed.deedNumber || '-'} (${deed.legalActType})? Data yang dihapus akan otomatis tersinkronisasi dan hilang dari Laporan Bulanan PPAT.`)) {
      try {
        await PpatService.deletePpatDeed(deed.id);
      } catch (err: any) {
        alert(err?.message || 'Gagal menghapus akta PPAT');
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

  const handleExportExcel = () => {
    exportPpatDeedBookToExcel({
      month: selectedMonth,
      year: selectedYear,
      deeds: filteredDeeds,
      config
    });
  };

  const handleExportPdf = () => {
    exportPpatDeedBookToPdf({
      month: selectedMonth,
      year: selectedYear,
      deeds: filteredDeeds,
      config
    });
  };

  const handleNavigateToReport = () => {
    if (setActiveSidebarTab) {
      setActiveSidebarTab('laporan_ppat');
    } else {
      window.location.href = '/laporan-ppat';
    }
  };

  const getLegalActColor = (type: string) => {
    switch (type) {
      case 'Jual Beli':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'APHT':
      case 'Pemberian Hak Tanggungan (APHT)':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Hibah':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'SKMHT':
      case 'Surat Kuasa Membebankan Hak Tanggungan (SKMHT)':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Pembagian Hak Bersama (APHB)':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Tukar Menukar':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Pemasukan ke Dalam Perusahaan (Inbreng)':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatCurrency = (val: number | undefined) => {
    if (!val || isNaN(val)) return 'Rp 0';
    return `Rp ${Number(val).toLocaleString('id-ID')}`;
  };

  const currentMonthObj = MONTH_OPTIONS.find((m) => m.value === selectedMonth) || MONTH_OPTIONS[0];

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* ─── PAGE HEADER ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                  Buku Daftar Akta PPAT
                </h1>
                <p className="text-xs md:text-sm text-slate-500 font-medium">
                  Register Administrasi Akta PPAT Baku & Terhubung Langsung ke Laporan Bulanan PPAT
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg font-medium border border-emerald-200">
                <Scale className="w-3.5 h-3.5 text-emerald-600" />
                PPAT: {config.ppatName}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-medium border border-slate-200">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                Wilayah Kerja: {config.workingArea || 'Kabupaten Bandung Barat'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleOpenAddDeed}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm shadow-xs hover:shadow transition-all duration-150 active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Akta PPAT</span>
            </button>

            <button
              onClick={handleNavigateToReport}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium text-sm shadow-xs transition-colors"
              title="Buka Laporan Bulanan PPAT untuk bulan ini"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Buka Laporan PPAT</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
            </button>

            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                title="Unduh Register Akta PPAT format Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
              <button
                onClick={handleExportPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white hover:shadow-xs rounded-lg transition-colors border border-transparent hover:border-slate-200"
                title="Cetak / Unduh Buku Register Akta format PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak / PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── INTEGRATION BANNER ─────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5 sm:mt-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                Sinkronisasi Aktif
              </span>
              <h3 className="text-sm font-bold text-slate-800">
                Terhubung Langsung dengan Laporan Bulanan PPAT
              </h3>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Setiap akta yang didaftarkan di sini otomatis termuat pada Laporan Bulanan PPAT ({currentMonthObj.label} {selectedYear}) untuk diserahkan ke BPN, BPKD, dan Kantor Pajak Pratama.
            </p>
          </div>
        </div>
        <button
          onClick={handleNavigateToReport}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-emerald-900 bg-white border border-emerald-300 hover:bg-emerald-50 rounded-lg shadow-2xs shrink-0 transition-colors"
        >
          <span>Lihat Format Laporan Resmi</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
        </button>
      </div>

      {/* ─── YEAR & MONTH TABS ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Periode Register</span>
          </div>
          {/* Year selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setSelectedYear((prev) => prev - 1)}
              className="p-1 hover:bg-white rounded-lg text-slate-600 transition-colors shadow-2xs"
              title="Tahun Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-bold text-slate-800">{selectedYear}</span>
            <button
              onClick={() => setSelectedYear((prev) => prev + 1)}
              className="p-1 hover:bg-white rounded-lg text-slate-600 transition-colors shadow-2xs"
              title="Tahun Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 12 Month Tabs */}
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 pt-1">
          {MONTH_OPTIONS.map((m) => {
            const isActive = selectedMonth === m.value;
            const count = monthDeedCounts[m.value] || 0;
            return (
              <button
                key={m.value}
                onClick={() => setSelectedMonth(m.value)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs scale-102'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                }`}
              >
                <span>{m.short}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full mt-0.5 font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : count > 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'text-slate-400'
                  }`}
                >
                  {count > 0 ? `${count}` : '-'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── SUMMARY STATS ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold">Total Akta ({currentMonthObj.label})</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-slate-900">{stats.totalDeeds} <span className="text-xs font-normal text-slate-500">Akta</span></div>
          <div className="text-[11px] text-emerald-700 mt-1 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Tersinkron ke Laporan PPAT</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold">Total Nilai Transaksi</span>
            <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg md:text-xl font-bold text-slate-900 truncate" title={formatCurrency(stats.totalTransaction)}>
            {formatCurrency(stats.totalTransaction)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Nilai perolehan/pengalihan</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold">Setoran SSP (PPh)</span>
            <div className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg md:text-xl font-bold text-purple-900 truncate" title={formatCurrency(stats.totalSsp)}>
            {formatCurrency(stats.totalSsp)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Pajak Penghasilan (Final)</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold">Setoran SSB (BPHTB)</span>
            <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg md:text-xl font-bold text-amber-900 truncate" title={formatCurrency(stats.totalSsb)}>
            {formatCurrency(stats.totalSsb)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Bea Perolehan Hak Tanah & Bangunan</div>
        </div>
      </div>

      {/* ─── FILTER & SEARCH BAR ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex-1 w-full flex flex-col sm:flex-row items-center gap-2.5">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari no akta, nama pihak, sertifikat..."
              className="w-full pl-9 pr-8 py-2 text-xs md:text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Legal Act Dropdown */}
          <div className="w-full sm:w-60">
            <select
              value={selectedLegalAct}
              onChange={(e) => setSelectedLegalAct(e.target.value)}
              className="w-full py-2 px-3 text-xs md:text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700 transition-all"
            >
              <option value="ALL">Semua Bentuk Perbuatan Hukum</option>
              {LEGAL_ACT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Counter and Reset */}
        <div className="flex items-center gap-2 self-end md:self-center text-xs text-slate-500">
          <span>Menampilkan <strong className="text-slate-800">{filteredDeeds.length}</strong> dari {deeds.length} akta</span>
          {(searchQuery || selectedLegalAct !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedLegalAct('ALL');
              }}
              className="text-emerald-600 hover:text-emerald-700 font-semibold underline underline-offset-2 ml-1"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* ─── MAIN REGISTER TABLE ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            <p className="text-sm font-medium">Memuat data Buku Register Akta PPAT...</p>
          </div>
        ) : filteredDeeds.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {deeds.length === 0
                ? `Belum Ada Akta Terdaftar pada ${currentMonthObj.label} ${selectedYear}`
                : 'Tidak ada akta yang sesuai dengan kriteria filter'}
            </h3>
            <p className="text-xs md:text-sm text-slate-500 max-w-md mx-auto">
              {deeds.length === 0
                ? `Bulan ini berstatus Nihil pada Laporan Bulanan PPAT. Anda dapat mendaftarkan akta baru kapan saja.`
                : 'Coba ubah kata kunci pencarian atau reset filter jenis perbuatan hukum.'}
            </p>
            {deeds.length === 0 && (
              <button
                onClick={handleOpenAddDeed}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Akta Pertama</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-100 border-b border-slate-800 font-semibold tracking-wider uppercase text-[10px]">
                  <th className="py-3 px-3 w-10 text-center">No</th>
                  <th className="py-3 px-3 min-w-[130px]">No & Tgl Akta</th>
                  <th className="py-3 px-3 min-w-[140px]">Bentuk Perbuatan</th>
                  <th className="py-3 px-3 min-w-[200px]">Pihak Mengalihkan (Penjual)</th>
                  <th className="py-3 px-3 min-w-[200px]">Pihak Menerima (Pembeli)</th>
                  <th className="py-3 px-3 min-w-[200px]">Obyek & Letak Tanah</th>
                  <th className="py-3 px-3 min-w-[130px] text-right">Nilai Transaksi</th>
                  <th className="py-3 px-3 min-w-[130px] text-right">SSP (PPh)</th>
                  <th className="py-3 px-3 min-w-[130px] text-right">SSB (BPHTB)</th>
                  <th className="py-3 px-3 min-w-[100px]">Keterangan</th>
                  <th className="py-3 px-3 w-24 text-center sticky right-0 bg-slate-900">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredDeeds.map((deed, index) => {
                  return (
                    <tr
                      key={deed.id}
                      className="hover:bg-emerald-50/40 transition-colors group"
                    >
                      {/* 1. No Urut */}
                      <td className="py-3.5 px-3 text-center font-bold text-slate-500">
                        {index + 1}
                      </td>

                      {/* 2. No & Tanggal Akta */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900 text-[13px]">
                          No. {deed.deedNumber || '-'}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{deed.date || '-'}</span>
                        </div>
                      </td>

                      {/* 3. Bentuk Perbuatan Hukum */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${getLegalActColor(
                            deed.legalActType
                          )}`}
                        >
                          {deed.legalActType}
                        </span>
                      </td>

                      {/* 4. Pihak Mengalihkan */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900">
                          {deed.grantorName || '-'}
                        </div>
                        {deed.grantorNpwp && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            NPWP: {deed.grantorNpwp}
                          </div>
                        )}
                        {deed.grantorAddress && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5" title={deed.grantorAddress}>
                            {deed.grantorAddress}
                          </div>
                        )}
                      </td>

                      {/* 5. Pihak Menerima */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900">
                          {deed.transfereeName || '-'}
                        </div>
                        {deed.transfereeNpwp && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            NPWP: {deed.transfereeNpwp}
                          </div>
                        )}
                        {deed.transfereeAddress && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5" title={deed.transfereeAddress}>
                            {deed.transfereeAddress}
                          </div>
                        )}
                      </td>

                      {/* 6. Obyek & Letak */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900 text-[11px]">
                          {deed.rightTypeAndNumber || '-'}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1" title={deed.landLocation}>
                          {deed.landLocation || '-'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {deed.landArea ? `LT: ${deed.landArea} m²` : ''} {deed.buildingArea ? `| LB: ${deed.buildingArea} m²` : ''}
                        </div>
                      </td>

                      {/* 7. Nilai Transaksi */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-bold text-slate-900 font-mono text-[12px]">
                          {formatCurrency(Number(deed.transactionValue))}
                        </div>
                        {deed.spptPbbNjop ? (
                          <div className="text-[10px] text-slate-400">
                            NJOP: {formatCurrency(Number(deed.spptPbbNjop))}
                          </div>
                        ) : null}
                      </td>

                      {/* 8. SSP (PPh) */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-bold text-purple-900 font-mono text-[12px]">
                          {formatCurrency(Number(deed.sspAmount))}
                        </div>
                        {deed.sspDate && (
                          <div className="text-[10px] text-slate-400">
                            Tgl: {deed.sspDate}
                          </div>
                        )}
                      </td>

                      {/* 9. SSB (BPHTB) */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-bold text-amber-900 font-mono text-[12px]">
                          {formatCurrency(Number(deed.ssbAmount))}
                        </div>
                        {deed.ssbDate && (
                          <div className="text-[10px] text-slate-400">
                            Tgl: {deed.ssbDate}
                          </div>
                        )}
                      </td>

                      {/* 10. Keterangan */}
                      <td className="py-3.5 px-3">
                        <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {deed.notes || 'Lengkap'}
                        </span>
                      </td>

                      {/* 11. Aksi */}
                      <td className="py-3.5 px-3 text-center sticky right-0 bg-white group-hover:bg-emerald-50/40">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewingDeed(deed)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-100/60 rounded-lg transition-colors"
                            title="Lihat Detail Akta Lengkap"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEditDeed(deed)}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-100/60 rounded-lg transition-colors"
                            title="Edit Data Akta"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDeed(deed)}
                            className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-100/60 rounded-lg transition-colors"
                            title="Hapus Akta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── QUICK VIEW DETAIL MODAL ────────────────────────────────────────────── */}
      {viewingDeed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-base">Detail Akta PPAT No. {viewingDeed.deedNumber || '-'}</h3>
                  <p className="text-xs text-slate-400">
                    Bentuk Perbuatan: {viewingDeed.legalActType} | Tanggal: {viewingDeed.date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingDeed(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-700">
              {/* Para Pihak */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider text-emerald-700">
                    Pihak Yang Mengalihkan (Penjual / Debitur)
                  </div>
                  <div className="text-sm font-bold text-slate-900">{viewingDeed.grantorName || '-'}</div>
                  <div><strong>NPWP:</strong> {viewingDeed.grantorNpwp || '-'}</div>
                  <div><strong>Alamat:</strong> {viewingDeed.grantorAddress || '-'}</div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider text-blue-700">
                    Pihak Yang Menerima (Pembeli / Kreditur)
                  </div>
                  <div className="text-sm font-bold text-slate-900">{viewingDeed.transfereeName || '-'}</div>
                  <div><strong>NPWP:</strong> {viewingDeed.transfereeNpwp || '-'}</div>
                  <div><strong>Alamat:</strong> {viewingDeed.transfereeAddress || '-'}</div>
                </div>
              </div>

              {/* Obyek Hak */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider text-purple-700">
                  Detail Obyek Tanah & Bangunan
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Jenis & No. Hak</span>
                    <strong className="text-slate-900">{viewingDeed.rightTypeAndNumber || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Luas Tanah & Bangunan</span>
                    <strong className="text-slate-900">
                      T: {viewingDeed.landArea || 0} m² | B: {viewingDeed.buildingArea || 0} m²
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Letak Tanah</span>
                    <strong className="text-slate-900">{viewingDeed.landLocation || '-'}</strong>
                  </div>
                </div>
              </div>

              {/* Nilai Transaksi & Pajak */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider text-amber-700">
                  Nilai Transaksi & Pembayaran Pajak
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Harga Transaksi</span>
                    <strong className="text-emerald-700 font-mono text-sm">
                      {formatCurrency(Number(viewingDeed.transactionValue))}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">NOP PBB & Tahun</span>
                    <strong className="text-slate-800">{viewingDeed.spptPbbNopYear || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">NJOP PBB</span>
                    <strong className="text-slate-800 font-mono">
                      {formatCurrency(Number(viewingDeed.spptPbbNjop))}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">SSP PPh (Final)</span>
                    <strong className="text-purple-800 font-mono">
                      {formatCurrency(Number(viewingDeed.sspAmount))}
                    </strong>
                    <div className="text-[10px] text-slate-500">Tgl: {viewingDeed.sspDate || '-'}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">SSB BPHTB</span>
                    <strong className="text-amber-800 font-mono">
                      {formatCurrency(Number(viewingDeed.ssbAmount))}
                    </strong>
                    <div className="text-[10px] text-slate-500">Tgl: {viewingDeed.ssbDate || '-'}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Catatan / Keterangan</span>
                    <strong className="text-slate-800">{viewingDeed.notes || 'Lengkap'}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  const toEdit = viewingDeed;
                  setViewingDeed(null);
                  handleEditDeed(toEdit);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Akta Ini</span>
              </button>
              <button
                onClick={() => setViewingDeed(null)}
                className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs border border-slate-300 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD / EDIT DEED MODAL ──────────────────────────────────────────────── */}
      <PpatDeedModal
        isOpen={isDeedModalOpen}
        onClose={() => {
          setIsDeedModalOpen(false);
          setEditingDeed(null);
        }}
        onSave={handleSaveDeed}
        initialData={editingDeed}
        defaultDate={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`}
      />
    </div>
  );
};
