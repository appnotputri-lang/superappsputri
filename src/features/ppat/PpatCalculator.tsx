import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Printer,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  X,
  Eye,
  Info,
  Save,
  Search,
  Copy,
  RefreshCw,
  Database,
  Edit3,
  Calendar,
  List,
  Calculator as CalcIcon,
  Layers,
  ArrowLeft,
  ChevronRight,
  Receipt,
  FileSpreadsheet,
  Building,
  MapPin,
  Check,
  AlertCircle,
  Scale,
  ShieldCheck
} from 'lucide-react';
import {
  MASTER_SEQUENCE,
  PpatCalculationRecord,
  AdminCostItem,
  TransactionType,
  DEFAULT_CALCULATION,
  DEFAULT_ADMIN_COSTS
} from '../../types/ppatCalculator';
import { PpatCalculatorService } from '../../services/PpatCalculatorService';
import {
  calculatePpatTaxes,
  DEFAULT_NPOPTKP_STANDARD,
  DEFAULT_NPOPTKP_WARIS,
  PPH_RATE_STANDARD,
  PPH_RATE_RSS,
  PPH_RATE_WARIS,
  TaxCalculationResult
} from '../../services/ppatTaxCalculator';
import { PpatCalculationPrintSheet } from '../../components/ppat/PpatCalculationPrintSheet';
import { SidebarTabId } from '../../../types';

interface PpatCalculatorProps {
  setActiveSidebarTab?: (tab: SidebarTabId) => void;
}

// Helper to format integer to Indonesian currency string (e.g. 2176000 -> "2.176.000")
const formatNumberId = (val: number | string | undefined): string => {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'string' ? parseInt(val.replace(/\D/g, ''), 10) : Math.round(val);
  if (isNaN(num)) return '';
  return num.toLocaleString('id-ID');
};

// Helper to parse formatted string to number
const parseNumberId = (val: string): number => {
  const clean = val.replace(/\D/g, '');
  return clean ? parseInt(clean, 10) : 0;
};

export const PpatCalculator: React.FC<PpatCalculatorProps> = ({ setActiveSidebarTab }) => {
  // Main view state: starts at 'list' by default
  const [currentView, setCurrentView] = useState<'list' | 'form' | 'preview'>('list');
  
  const [calc, setCalc] = useState<PpatCalculationRecord>(() => {
    return { ...DEFAULT_CALCULATION, id: `calc_${Date.now()}` };
  });

  const [history, setHistory] = useState<PpatCalculationRecord[]>(() => PpatCalculatorService.getHistorySync());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load history from D1 on mount
  const loadHistoryFromD1 = async () => {
    setIsLoadingHistory(true);
    try {
      const records = await PpatCalculatorService.getCalculations();
      setHistory(records);
    } catch (e) {
      console.error('Error loading PPAT calculation history:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistoryFromD1();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Find exact index in MASTER_SEQUENCE for land NJOP
  const exactIndex = useMemo(() => {
    if (!calc.landNjopPerM2) return -1;
    return MASTER_SEQUENCE.indexOf(Number(calc.landNjopPerM2));
  }, [calc.landNjopPerM2]);

  // Determine target index and estimated land price per m2 (+16 for AJB, +10 for APHB/WARIS/HIBAH)
  const targetIndex = useMemo(() => {
    if (exactIndex === -1) return -1;
    const jump = calc.transactionType === 'AJB' ? 16 : 10;
    const target = exactIndex + jump;
    return Math.min(target, MASTER_SEQUENCE.length - 1);
  }, [exactIndex, calc.transactionType]);

  const estimatedLandPricePerM2 = useMemo(() => {
    if (targetIndex === -1) return 0;
    return MASTER_SEQUENCE[targetIndex];
  }, [targetIndex]);

  // Total Estimated Market Value (Land Market + Building NJOP)
  const estimatedMarketTotal = useMemo(() => {
    const landArea = Number(calc.landArea) || 0;
    const buildingArea = Number(calc.buildingArea) || 0;
    const buildingNjop = Number(calc.buildingNjopPerM2) || 0;
    const landPrice = estimatedLandPricePerM2 > 0 ? estimatedLandPricePerM2 : (Number(calc.landNjopPerM2) || 0);

    return (landArea * landPrice) + (buildingArea * buildingNjop);
  }, [calc.landArea, calc.buildingArea, calc.buildingNjopPerM2, calc.landNjopPerM2, estimatedLandPricePerM2]);

  // When user toggles estimated market value checkbox, update transactionValue
  const handleToggleMarketEstimation = (checked: boolean) => {
    if (checked) {
      setCalc(prev => ({
        ...prev,
        useMarketEstimation: true,
        transactionValue: estimatedMarketTotal
      }));
    } else {
      setCalc(prev => ({
        ...prev,
        useMarketEstimation: false
      }));
    }
  };

  // Dedicated Tax & Cost Calculations via pure function calculatePpatTaxes
  const calculatedValues = useMemo(() => {
    // Determine APHB party portion
    let porsiHakAphb: number | undefined = undefined;
    if (calc.transactionType === 'APHB') {
      const p = parseFloat(calc.partyCount || '1');
      if (!isNaN(p) && p > 0) {
        porsiHakAphb = 1 / p;
      }
    }

    // Call pure tax calculator
    const taxResult: TaxCalculationResult = calculatePpatTaxes({
      luasTanah: Number(calc.landArea) || 0,
      njopTanah: Number(calc.landNjopPerM2) || 0,
      luasBangunan: Number(calc.buildingArea) || 0,
      njopBangunan: Number(calc.buildingNjopPerM2) || 0,
      nilaiTransaksi: Number(calc.transactionValue) || 0,
      npoptkp: Number(calc.npoptkp) || (calc.transactionType === 'WARIS' ? DEFAULT_NPOPTKP_WARIS : DEFAULT_NPOPTKP_STANDARD),
      pphRate: calc.transactionType === 'WARIS' ? 0 : (Number(calc.pphRate) || 2.5),
      jenisAkta: calc.transactionType,
      porsiHakAphb
    });

    // Subtotal Admin Costs
    const subtotalAdmin = (calc.adminCosts || []).reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

    // Grand Total (PPh + BPHTB + Admin Costs)
    const grandTotal = taxResult.pphAmount + taxResult.bphtbAmount + subtotalAdmin;

    // Split buyer vs seller
    const totalBuyer = taxResult.bphtbAmount + subtotalAdmin;
    const totalSeller = taxResult.pphAmount;

    return {
      ...taxResult,
      exactIndex,
      targetIndex,
      estimatedLandPricePerM2,
      totalLandNjop: taxResult.totalNjopTanah,
      totalBuildingNjop: taxResult.totalNjopBangunan,
      totalNjopPbb: taxResult.totalNjop,
      totalMarketValue: estimatedMarketTotal,
      pph: taxResult.pphAmount,
      bphtb: taxResult.bphtbAmount,
      subtotalAdmin,
      grandTotal,
      totalBuyer,
      totalSeller
    };
  }, [calc, exactIndex, targetIndex, estimatedLandPricePerM2, estimatedMarketTotal]);

  // Admin costs handlers
  const handleUpdateAdminCostName = (index: number, name: string) => {
    const updated = [...calc.adminCosts];
    updated[index] = { ...updated[index], name: name.toUpperCase() };
    setCalc(prev => ({ ...prev, adminCosts: updated }));
  };

  const handleUpdateAdminCostAmount = (index: number, valStr: string) => {
    const num = parseNumberId(valStr);
    const updated = [...calc.adminCosts];
    updated[index] = { ...updated[index], amount: num };
    setCalc(prev => ({ ...prev, adminCosts: updated }));
  };

  const handleAddAdminCost = () => {
    const newItem: AdminCostItem = {
      id: `adm_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: '',
      amount: 0
    };
    setCalc(prev => ({ ...prev, adminCosts: [...prev.adminCosts, newItem] }));
  };

  const handleRemoveAdminCost = (index: number) => {
    const updated = calc.adminCosts.filter((_, idx) => idx !== index);
    setCalc(prev => ({ ...prev, adminCosts: updated }));
  };

  // Start a new calculation
  const handleAddNew = () => {
    setCalc({
      ...DEFAULT_CALCULATION,
      id: `calc_${Date.now()}`,
      title: 'ESTIMASI BIAYA AKTA PPAT',
      adminCosts: DEFAULT_ADMIN_COSTS.map(item => ({ ...item }))
    });
    setEditingId(null);
    setCurrentView('form');
  };

  // Save to D1 (either update existing or save as new)
  const handleSaveToD1 = async (forceNew: boolean = false, returnToList: boolean = false) => {
    setIsSaving(true);
    try {
      const saved = await PpatCalculatorService.saveCalculation(calc, forceNew);
      setCalc(saved);
      setEditingId(saved.id);
      
      // Refresh history list from D1
      const updatedList = await PpatCalculatorService.getCalculations();
      setHistory(updatedList);
      
      if (forceNew) {
        showToast(`Draf baru "${saved.title}" berhasil disimpan di database D1!`);
      } else {
        showToast(`Perubahan "${saved.title}" berhasil disimpan di database D1!`);
      }

      if (returnToList) {
        setCurrentView('list');
      }
    } catch (e: any) {
      console.error('Error saving calculation to D1:', e);
      showToast('Gagal menyimpan ke D1: ' + (e.message || 'Terjadi kesalahan'));
    } finally {
      setIsSaving(false);
    }
  };

  // Load calculation from history into form for editing
  const handleEditCalculation = (record: PpatCalculationRecord) => {
    setCalc({
      ...DEFAULT_CALCULATION,
      ...record,
      title: record.title || record.clientName || 'PERHITUNGAN PPAT',
      nop: record.nop || record.nopPbb || '',
      transactionType: record.transactionType || (record.jumpType === 'AJB' ? 'AJB' : 'APHB'),
      adminCosts: record.adminCosts && record.adminCosts.length > 0
        ? record.adminCosts
        : DEFAULT_ADMIN_COSTS.map(item => ({ ...item }))
    });
    setEditingId(record.id);
    setCurrentView('form');
    showToast(`Memuat perhitungan "${record.title || 'PPAT'}".`);
  };

  // Open preview sheet directly from list
  const handlePreviewCalculation = (record: PpatCalculationRecord) => {
    setCalc({
      ...DEFAULT_CALCULATION,
      ...record,
      title: record.title || record.clientName || 'PERHITUNGAN PPAT',
      nop: record.nop || record.nopPbb || '',
      transactionType: record.transactionType || (record.jumpType === 'AJB' ? 'AJB' : 'APHB'),
      adminCosts: record.adminCosts && record.adminCosts.length > 0
        ? record.adminCosts
        : DEFAULT_ADMIN_COSTS.map(item => ({ ...item }))
    });
    setEditingId(record.id);
    setCurrentView('preview');
  };

  // Duplicate a calculation record
  const handleDuplicateCalculation = async (record: PpatCalculationRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const duplicated: PpatCalculationRecord = {
        ...record,
        id: `calc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: `${record.title || 'Perhitungan'} (Salinan)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await PpatCalculatorService.saveCalculation(duplicated, true);
      const updatedList = await PpatCalculatorService.getCalculations();
      setHistory(updatedList);
      showToast(`Salinan "${duplicated.title}" berhasil diduplikasi di D1!`);
    } catch (e: any) {
      showToast('Gagal menduplikasi perhitungan.');
    }
  };

  // Delete a calculation record
  const handleDeleteCalculation = async (id: string, title?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Hapus draf "${title || 'ini'}" dari database D1?`)) {
      try {
        await PpatCalculatorService.deleteCalculation(id);
        const updatedList = await PpatCalculatorService.getCalculations();
        setHistory(updatedList);
        if (editingId === id) {
          setEditingId(null);
        }
        showToast('Perhitungan berhasil dihapus dari database D1.');
      } catch (e) {
        showToast('Gagal menghapus dari database D1.');
      }
    }
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Filtered history list
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      if (filterType !== 'ALL' && item.transactionType !== filterType) {
        return false;
      }
      if (!historySearch.trim()) return true;
      const q = historySearch.toLowerCase();
      const matchTitle = (item.title || item.clientName || '').toLowerCase().includes(q);
      const matchVillage = (item.village || '').toLowerCase().includes(q);
      const matchCert = (item.certificateNumber || '').toLowerCase().includes(q);
      const matchType = (item.transactionType || '').toLowerCase().includes(q);
      const matchNop = (item.nop || '').toLowerCase().includes(q);
      return matchTitle || matchVillage || matchCert || matchType || matchNop;
    });
  }, [history, historySearch, filterType]);

  return (
    <div className="min-h-screen bg-slate-50/70 py-6 sm:py-8 px-3 sm:px-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-sm font-medium animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================================================================ */}
      {/* VIEW 1: DAFTAR / LIST PERHITUNGAN (DEFAULT VIEW)                */}
      {/* ================================================================ */}
      {currentView === 'list' && (
        <div className="max-w-6xl mx-auto space-y-5 animate-in fade-in">
          
          {/* Main Module Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-sm">
                <CalcIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">Kalkulator Biaya PPAT</h1>
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    <Database className="w-3 h-3 text-emerald-600" /> Database D1
                  </span>
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200/80 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    <ShieldCheck className="w-3 h-3 text-blue-600" /> PP 34/2016 & UU HKPD 1/2022
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Pencatatan estimasi pajak transaksi (PPh & BPHTB), administrasi BPN, serta rincian biaya akta PPAT
                </p>
              </div>
            </div>

            {/* Primary Action Button: Tambah Perhitungan */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={loadHistoryFromD1}
                disabled={isLoadingHistory}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all shadow-xs"
                title="Refresh Sinkronisasi Database D1"
              >
                <RefreshCw className={`w-4 h-4 text-blue-600 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                type="button"
                onClick={handleAddNew}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg shadow-blue-500/20"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Tambah Perhitungan</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              
              {/* Search input */}
              <div className="md:col-span-6 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Cari berdasarkan judul, nama klien, desa, no. sertifikat, NOP..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
                {historySearch && (
                  <button
                    type="button"
                    onClick={() => setHistorySearch('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Transaction Type Filter Tabs */}
              <div className="md:col-span-6 flex items-center justify-start md:justify-end gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
                  Filter:
                </span>
                {[
                  { key: 'ALL', label: 'Semua Akta' },
                  { key: 'AJB', label: 'Jual Beli (AJB)' },
                  { key: 'APHB', label: 'APHB' },
                  { key: 'WARIS', label: 'Waris' },
                  { key: 'HIBAH', label: 'Hibah' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFilterType(tab.key)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      filterType === tab.key
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* List Table / Cards */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            {isLoadingHistory ? (
              <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                <span className="font-medium text-slate-600">Memuat data perhitungan dari database D1...</span>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-xs">
                  <CalcIcon className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">
                  {historySearch || filterType !== 'ALL'
                    ? 'Tidak ada perhitungan yang sesuai filter'
                    : 'Belum ada data perhitungan tersimpan'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                  {historySearch || filterType !== 'ALL'
                    ? 'Coba gunakan kata kunci pencarian yang lain atau reset filter jenis akta.'
                    : 'Mulai buat estimasi biaya akta PPAT baru dengan menekan tombol di bawah ini.'}
                </p>
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={handleAddNew}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Perhitungan Baru</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredHistory.map((item) => {
                  // Pure function tax calculations for list item
                  const porsiFactor = item.transactionType === 'APHB' ? 1 / Math.max(1, parseFloat(item.partyCount || '1')) : undefined;
                  const itemTaxes = calculatePpatTaxes({
                    luasTanah: item.landArea || 0,
                    njopTanah: item.landNjopPerM2 || 0,
                    luasBangunan: item.buildingArea || 0,
                    njopBangunan: item.buildingNjopPerM2 || 0,
                    nilaiTransaksi: item.transactionValue || 0,
                    npoptkp: item.npoptkp,
                    pphRate: item.pphRate,
                    jenisAkta: item.transactionType,
                    porsiHakAphb: porsiFactor
                  });

                  const adminTotal = (item.adminCosts || []).reduce((acc, c) => acc + (c.amount || 0), 0);
                  const grandTotal = itemTaxes.totalPajak + adminTotal;

                  return (
                    <div
                      key={item.id}
                      className="p-4 sm:p-5 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 group"
                    >
                      {/* Left: Metadata & Object Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                          <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                            item.transactionType === 'AJB'
                              ? 'bg-blue-100 text-blue-800'
                              : item.transactionType === 'APHB'
                              ? 'bg-amber-100 text-amber-900'
                              : item.transactionType === 'WARIS'
                              ? 'bg-purple-100 text-purple-900'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}>
                            {item.transactionType === 'AJB' && 'AJB (Jual Beli)'}
                            {item.transactionType === 'APHB' && 'APHB (Hak Bersama)'}
                            {item.transactionType === 'WARIS' && 'Waris / Turun Waris'}
                            {item.transactionType === 'HIBAH' && 'Hibah'}
                          </span>

                          <h3 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                            {item.title || item.clientName || 'Estimasi Perhitungan PPAT'}
                          </h3>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            itemTaxes.dasarPenetapan === 'TRANSAKSI'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            DPP: {itemTaxes.dasarPenetapan} (NPOP Rp {formatNumberId(itemTaxes.npop)})
                          </span>
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600 mt-2.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">Sertifikat:</span>
                            <span className="font-semibold text-slate-800">
                              {item.certificateType || 'SHM'} {item.certificateNumber ? `No. ${item.certificateNumber}` : '-'}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">Lokasi:</span>
                            <span className="font-semibold text-slate-800">
                              {item.village ? `Desa ${item.village}` : '-'}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">Luas & NJOP:</span>
                            <span className="font-mono font-medium text-slate-800">
                              {formatNumberId(item.landArea)} m² @ Rp {formatNumberId(item.landNjopPerM2)}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">Nilai Transaksi / DPP:</span>
                            <span className="font-mono font-bold text-slate-900">
                              Rp {formatNumberId(itemTaxes.npop)}
                            </span>
                          </div>
                        </div>

                        {/* Cost summary badges */}
                        <div className="flex items-center gap-3 text-xs text-slate-600 mt-3 flex-wrap">
                          <span className="bg-purple-50 text-purple-900 border border-purple-200 px-2 py-0.5 rounded text-[11px]">
                            PPh: <b className="font-mono">{formatNumberId(itemTaxes.pphAmount)}</b>
                          </span>
                          <span className="bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded text-[11px]">
                            BPHTB: <b className="font-mono">{formatNumberId(itemTaxes.bphtbAmount)}</b>
                          </span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            Adm & Jasa: <b className="font-mono text-slate-800">Rp {formatNumberId(adminTotal)}</b>
                          </span>
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                            Total: <b className="font-mono">Rp {formatNumberId(grandTotal)}</b>
                          </span>
                          
                          <span className="ml-auto text-slate-400 text-[11px] flex items-center gap-1 font-medium">
                            <Calendar className="w-3 h-3" />
                            {new Date(item.updatedAt || item.createdAt || Date.now()).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end lg:self-center border-t lg:border-t-0 pt-3 lg:pt-0 w-full lg:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => handleEditCalculation(item)}
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePreviewCalculation(item)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                          title="Pratinjau / Cetak Lembar Rincian"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                          <span className="hidden sm:inline">Cetak</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDuplicateCalculation(item, e)}
                          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-transparent hover:border-slate-200"
                          title="Duplikat / Salin Perhitungan"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteCalculation(item.id, item.title, e)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-200"
                          title="Hapus dari Database D1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* VIEW 2: FORMULIR TAMBAH / EDIT PERHITUNGAN                      */}
      {/* ================================================================ */}
      {currentView === 'form' && (
        <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in">
          
          {/* Form Header Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentView('list')}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors shrink-0"
                title="Kembali ke Daftar Perhitungan"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    {editingId ? 'Edit Perhitungan PPAT' : 'Tambah Perhitungan PPAT Baru'}
                  </h1>
                  {editingId ? (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                      <Edit3 className="w-3 h-3 text-amber-600" /> Mode Edit Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                      <Plus className="w-3 h-3 text-blue-600" /> Draf Baru
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lengkapi data tanah, nilai transaksi, pajak & biaya administrasi di bawah ini
                </p>
              </div>
            </div>

            {/* Top Right Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setCurrentView('preview')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Pratinjau Cetak</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveToD1(false, false)}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
              >
                {isSaving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{editingId ? 'Simpan Perubahan' : 'Simpan ke D1'}</span>
              </button>
            </div>
          </div>

          {/* Form Content Body */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-7 space-y-6">
            
            {/* ─── Field: Judul / Nama Klien / Transaksi ─── */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Judul Perhitungan / Klien <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={calc.title}
                onChange={(e) => setCalc(prev => ({ ...prev, title: e.target.value.toUpperCase() }))}
                placeholder="CONTOH: ESTIMASI AJB IBU SITI / BPK AHMAD"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden transition-all uppercase"
              />
            </div>

            {/* ─── Field: Jenis Transaksi (AJB / APHB / Hibah / Waris) ─── */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Jenis Transaksi Akta PPAT
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(['AJB', 'APHB', 'HIBAH', 'WARIS'] as TransactionType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      const nextPph = t === 'WARIS' ? 0 : 2.5;
                      const nextNpoptkp = t === 'WARIS' ? DEFAULT_NPOPTKP_WARIS : DEFAULT_NPOPTKP_STANDARD;
                      setCalc(prev => ({
                        ...prev,
                        transactionType: t,
                        pphRate: nextPph,
                        npoptkp: nextNpoptkp
                      }));
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      calc.transactionType === t
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {t === 'AJB' && 'Jual Beli (AJB)'}
                    {t === 'APHB' && 'APHB (Hak Bersama)'}
                    {t === 'HIBAH' && 'Hibah'}
                    {t === 'WARIS' && 'Waris / Turun Waris'}
                  </button>
                ))}
              </div>
              {calc.transactionType === 'AJB' && (
                <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-500 shrink-0" />
                  AJB Umum: Estimasi harga pasar meloncat +16 kelas NJOP. PPh Final 2.5% (PP 34/2016) & BPHTB 5% (UU HKPD 1/2022).
                </p>
              )}
              {calc.transactionType === 'APHB' && (
                <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-500 shrink-0" />
                  APHB: Estimasi harga pasar meloncat +10 kelas. Pajak dikenakan proporsional atas porsi hak yang beralih (1/N pihak).
                </p>
              )}
              {calc.transactionType === 'WARIS' && (
                <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-purple-500 shrink-0" />
                  Waris: Bebas PPh Final (0%). NPOPTKP BPHTB khusus waris otomatis diset ke Rp 300.000.000 (dapat disesuaikan).
                </p>
              )}
            </div>

            {/* ─── Field: Jenis & Nomor Sertifikat, Desa, NOP ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Jenis Sertifikat
                </label>
                <select
                  value={calc.certificateType || 'SHM'}
                  onChange={(e) => setCalc(prev => ({ ...prev, certificateType: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 outline-hidden"
                >
                  <option value="SHM">SHM (Hak Milik)</option>
                  <option value="SHGB">SHGB (Guna Bangunan)</option>
                  <option value="SHP">SHP (Hak Pakai)</option>
                  <option value="Letter C / Girik">Letter C / Girik</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nomor Sertifikat / Hak
                </label>
                <input
                  type="text"
                  value={calc.certificateNumber || ''}
                  onChange={(e) => setCalc(prev => ({ ...prev, certificateNumber: e.target.value }))}
                  placeholder="Contoh: No. 01234"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Desa / Kelurahan
                </label>
                <input
                  type="text"
                  value={calc.village || ''}
                  onChange={(e) => setCalc(prev => ({ ...prev, village: e.target.value.toUpperCase() }))}
                  placeholder="Contoh: KEBONAGUNG"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 outline-hidden uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                NOP PBB (Nomor Objek Pajak)
              </label>
              <input
                type="text"
                value={calc.nop || ''}
                onChange={(e) => setCalc(prev => ({ ...prev, nop: e.target.value }))}
                placeholder="Contoh: 35.07.xxx.xxx.xxx-xxxx.x"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 outline-hidden font-mono"
              />
            </div>

            {/* ─── SECTION 1: LUAS & NJOP TANAH ─── */}
            <div className="pt-3 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                1. Data Tanah & NJOP PBB
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Luas Tanah (m²)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatNumberId(calc.landArea)}
                      onChange={(e) => setCalc(prev => ({ ...prev, landArea: parseNumberId(e.target.value) }))}
                      placeholder="0"
                      className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-hidden font-mono"
                    />
                    <span className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400">m²</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    NJOP Tanah per m² (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-[11px] font-bold text-slate-400">Rp</span>
                    <input
                      type="text"
                      value={formatNumberId(calc.landNjopPerM2)}
                      onChange={(e) => setCalc(prev => ({ ...prev, landNjopPerM2: parseNumberId(e.target.value) }))}
                      placeholder="0"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-hidden font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Sequence feedback card */}
              {calc.landNjopPerM2 > 0 && (
                <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2 text-xs text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[11px]">NJOP Tanah Saat Ini (PBB):</span>
                    <span className="font-mono font-bold text-slate-900">
                      Rp {formatNumberId(calc.landNjopPerM2)} /m²
                      {exactIndex >= 0 && (
                        <span className="text-[10px] text-blue-600 font-semibold ml-1.5 bg-blue-50 px-1.5 py-0.5 rounded">
                          Kelas #{exactIndex + 1}
                        </span>
                      )}
                    </span>
                  </div>

                  {exactIndex >= 0 ? (
                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                      <span className="text-slate-600 text-[11px] flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        Estimasi Harga Pasar (Naik +{calc.transactionType === 'AJB' ? '16' : '10'} Kelas):
                      </span>
                      <span className="font-mono font-bold text-emerald-700">
                        Rp {formatNumberId(estimatedLandPricePerM2)} /m²
                        <span className="text-[10px] text-emerald-700 font-semibold ml-1.5 bg-emerald-50 px-1.5 py-0.5 rounded">
                          Kelas #{targetIndex + 1}
                        </span>
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded">
                      Nilai NJOP Rp {formatNumberId(calc.landNjopPerM2)} tidak persis ada di tabel sequence master.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ─── SECTION 2: LUAS & NJOP BANGUNAN ─── */}
            <div className="pt-3 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                2. Data Bangunan (Jika Ada)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Luas Bangunan (m²)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatNumberId(calc.buildingArea)}
                      onChange={(e) => setCalc(prev => ({ ...prev, buildingArea: parseNumberId(e.target.value) }))}
                      placeholder="0"
                      className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-hidden font-mono"
                    />
                    <span className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400">m²</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    NJOP Bangunan per m² (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-[11px] font-bold text-slate-400">Rp</span>
                    <input
                      type="text"
                      value={formatNumberId(calc.buildingNjopPerM2)}
                      onChange={(e) => setCalc(prev => ({ ...prev, buildingNjopPerM2: parseNumberId(e.target.value) }))}
                      placeholder="0"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-hidden font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ─── SECTION 3: NILAI TRANSAKSI / PASAR & DASAR PENGENAAN PAJAK (DPP) ─── */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  3. Nilai Transaksi / Akta & Dasar Penetapan (NPOP)
                </h3>
                
                {estimatedMarketTotal > 0 && (
                  <button
                    type="button"
                    onClick={() => handleToggleMarketEstimation(!calc.useMarketEstimation)}
                    className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                      calc.useMarketEstimation
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Gunakan Estimasi Pasar (Rp {formatNumberId(estimatedMarketTotal)})</span>
                  </button>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Nilai Transaksi Riil / Kesepakatan (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="text"
                    value={formatNumberId(calc.transactionValue)}
                    onChange={(e) => setCalc(prev => ({ ...prev, transactionValue: parseNumberId(e.target.value), useMarketEstimation: false }))}
                    placeholder="0"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-500 outline-hidden font-mono"
                  />
                </div>
                
                {/* DPP Status Banner */}
                <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-blue-600" />
                    <span>Total NJOP PBB: <b className="font-mono text-slate-900">Rp {formatNumberId(calculatedValues.totalNjopPbb)}</b></span>
                    <span className="text-slate-400">vs</span>
                    <span>Transaksi: <b className="font-mono text-slate-900">Rp {formatNumberId(calc.transactionValue || 0)}</b></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500">NPOP Terpilih:</span>
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                      Rp {formatNumberId(calculatedValues.npop)} ({calculatedValues.dasarPenetapan})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── SECTION 4: PARAMETER PAJAK SESUAI PP 34/2016 & UU HKPD 1/2022 ─── */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  4. Parameter Pajak (PPh Final & BPHTB)
                </h3>
                <span className="text-[10px] text-slate-500">
                  PP 34/2016 & UU HKPD 1/2022
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* NPOPTKP BPHTB */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    NPOPTKP BPHTB (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-[11px] font-bold text-slate-400">Rp</span>
                    <input
                      type="text"
                      value={formatNumberId(calc.npoptkp)}
                      onChange={(e) => setCalc(prev => ({ ...prev, npoptkp: parseNumberId(e.target.value) }))}
                      placeholder={calc.transactionType === 'WARIS' ? '300.000.000' : '80.000.000'}
                      className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-hidden font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {calc.transactionType === 'WARIS' ? 'Standar Waris: Rp 300 Juta' : 'Standar Umum: Rp 80 Juta'}
                  </span>
                </div>

                {/* Tarif PPh Final */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-slate-600">
                      Tarif PPh Final (%)
                    </label>
                    <div className="flex gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setCalc(prev => ({ ...prev, pphRate: 2.5 }))}
                        className="text-blue-600 hover:underline"
                        title="PPh Umum 2.5%"
                      >
                        2.5%
                      </button>
                      <span>|</span>
                      <button
                        type="button"
                        onClick={() => setCalc(prev => ({ ...prev, pphRate: 1.0 }))}
                        className="text-blue-600 hover:underline"
                        title="Rumah Sederhana / RSS Developer 1.0%"
                      >
                        1.0%
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    disabled={calc.transactionType === 'WARIS'}
                    value={calc.transactionType === 'WARIS' ? 0 : calc.pphRate}
                    onChange={(e) => setCalc(prev => ({ ...prev, pphRate: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-hidden font-mono disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {calc.transactionType === 'WARIS' ? 'Waris Bebas PPh (0%)' : 'PP 34/2016 (Umum 2.5%)'}
                  </span>
                </div>

                {/* Jumlah Pihak APHB */}
                {calc.transactionType === 'APHB' ? (
                  <div>
                    <label className="block text-[11px] font-medium text-amber-800 mb-1">
                      Jumlah Pihak APHB (1/N)
                    </label>
                    <input
                      type="text"
                      value={calc.partyCount || '2'}
                      onChange={(e) => setCalc(prev => ({ ...prev, partyCount: e.target.value }))}
                      placeholder="Contoh: 2"
                      className="w-full px-3 py-2 bg-amber-50/60 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 focus:bg-white focus:border-amber-500 outline-hidden font-mono"
                    />
                    <span className="text-[10px] text-amber-700 block mt-0.5">
                      Porsi peralihan: 1/{calc.partyCount || '2'} bagian
                    </span>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Tarif BPHTB (%)
                    </label>
                    <input
                      type="text"
                      disabled
                      value="5.0% (Standar UU HKPD)"
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      (NPOP - NPOPTKP) x 5%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ─── SECTION 5: BIAYA ADMINISTRASI / JASA / BPN ─── */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  5. Rincian Biaya Administrasi, Jasa & PNBP
                </h3>
                <button
                  type="button"
                  onClick={handleAddAdminCost}
                  className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Baris Biaya</span>
                </button>
              </div>

              <div className="space-y-2">
                {calc.adminCosts.map((item, idx) => (
                  <div key={item.id || idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleUpdateAdminCostName(idx, e.target.value)}
                      placeholder="NAMA BIAYA / JASA"
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 uppercase focus:bg-white focus:border-blue-500 outline-hidden"
                    />
                    
                    <div className="relative w-40 sm:w-48">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                      <input
                        type="text"
                        value={formatNumberId(item.amount)}
                        onChange={(e) => handleUpdateAdminCostAmount(idx, e.target.value)}
                        placeholder="0"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 font-mono text-right focus:bg-white focus:border-blue-500 outline-hidden"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveAdminCost(idx)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                      title="Hapus baris"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── LIVE CALCULATION RESULT BOX (STRUCTURED TAX REKAP) ─── */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-4 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Ringkasan Estimasi Biaya & Pajak PPAT
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Dasar Pengenaan Pajak (DPP / NPOP): <b className="text-white font-mono">Rp {formatNumberId(calculatedValues.npop)}</b> ({calculatedValues.dasarPenetapan})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">NPOPKP (Kena Pajak BPHTB):</span>
                  <span className="text-xs font-mono font-bold text-blue-400">
                    Rp {formatNumberId(calculatedValues.npopkp)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-purple-300 text-[11px] block font-medium">PPh Final (Penjual):</span>
                  <span className="font-mono font-bold text-white text-sm">
                    Rp {formatNumberId(calculatedValues.pphAmount)}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Tarif {calculatedValues.pphRate * 100}%
                  </span>
                </div>

                <div>
                  <span className="text-blue-300 text-[11px] block font-medium">BPHTB (Pembeli):</span>
                  <span className="font-mono font-bold text-white text-sm">
                    Rp {formatNumberId(calculatedValues.bphtbAmount)}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    5% x NPOPKP
                  </span>
                </div>

                <div>
                  <span className="text-slate-300 text-[11px] block font-medium">Subtotal Administrasi:</span>
                  <span className="font-mono font-bold text-white text-sm">
                    Rp {formatNumberId(calculatedValues.subtotalAdmin)}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {calc.adminCosts.length} Komponen
                  </span>
                </div>

                <div>
                  <span className="text-emerald-400 text-[11px] font-bold block">Grand Total Biaya:</span>
                  <span className="font-mono font-extrabold text-emerald-400 text-base">
                    Rp {formatNumberId(calculatedValues.grandTotal)}
                  </span>
                  <span className="text-[10px] text-emerald-300 block mt-0.5">
                    Pajak + Administrasi
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-2.5 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
                <span>Tanggungan Pembeli (BPHTB + Adm): <b className="text-slate-200 font-mono">Rp {formatNumberId(calculatedValues.totalBuyer)}</b></span>
                <span>Tanggungan Penjual (PPh Final): <b className="text-slate-200 font-mono">Rp {formatNumberId(calculatedValues.totalSeller)}</b></span>
              </div>
            </div>

            {/* ─── BOTTOM ACTION BUTTONS ─── */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCurrentView('list')}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Daftar</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {editingId && (
                  <button
                    type="button"
                    onClick={() => handleSaveToD1(true, false)}
                    disabled={isSaving}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    title="Simpan sebagai draf baru terpisah"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                    <span>Simpan Draf Baru</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSaveToD1(false, true)}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Simpan & Kembali ke Daftar</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* VIEW 3: PRATINJAU CETAK LEMBAR RINCIAN (PRINT PREVIEW)          */}
      {/* ================================================================ */}
      {currentView === 'preview' && (
        <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in">
          <div className="bg-slate-800 text-white px-5 py-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden shadow-sm">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-blue-300 shrink-0" />
              <span className="font-bold text-xs sm:text-sm truncate">
                Pratinjau Lembar Rincian Biaya (Format Cetak A4)
              </span>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak Dokumen
              </button>
              
              <button
                type="button"
                onClick={() => setCurrentView('form')}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
              >
                Edit di Form
              </button>

              <button
                type="button"
                onClick={() => setCurrentView('list')}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
              >
                Ke Daftar
              </button>
            </div>
          </div>
          
          <div className="bg-white p-6 sm:p-10 border border-slate-200 rounded-2xl shadow-xl">
            <PpatCalculationPrintSheet calc={calc} calculatedValues={calculatedValues} />
          </div>
        </div>
      )}
    </div>
  );
};
