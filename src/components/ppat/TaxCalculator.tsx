import React, { useState, useMemo, useEffect } from 'react';
import {
  Calculator as CalcIcon,
  Building2,
  MapPin,
  TrendingUp,
  Scale,
  ShieldCheck,
  RotateCcw,
  Copy,
  Check,
  Info,
  ChevronDown,
  ChevronUp,
  Receipt,
  FileText,
  Percent,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  calculatePpatTaxes,
  JenisAktaPpat,
  TaxCalculationInput,
  TaxCalculationResult,
  DEFAULT_NPOPTKP_STANDARD,
  DEFAULT_NPOPTKP_WARIS,
  PPH_RATE_STANDARD,
  PPH_RATE_RSS,
  PPH_RATE_WARIS,
  BPHTB_RATE_STANDARD
} from '../../services/ppatTaxCalculator';

export interface TaxCalculatorProps {
  initialValues?: Partial<TaxCalculationInput> & {
    porsiPartyCount?: number;
  };
  onCalculationChange?: (result: TaxCalculationResult, input: TaxCalculationInput) => void;
  className?: string;
  showTitle?: boolean;
}

// Helper to format numbers with thousand separators
const formatNumberId = (val: number | string | undefined | null): string => {
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

// Currency formatter with "Rp" prefix
const formatRp = (val: number | undefined | null): string => {
  return `Rp ${(Math.round(val || 0)).toLocaleString('id-ID')}`;
};

export const TaxCalculator: React.FC<TaxCalculatorProps> = ({
  initialValues,
  onCalculationChange,
  className = '',
  showTitle = true
}) => {
  // ─── Input States ──────────────────────────────────────────────────────────
  const [jenisAkta, setJenisAkta] = useState<JenisAktaPpat>(initialValues?.jenisAkta || 'AJB');
  const [luasTanah, setLuasTanah] = useState<number>(initialValues?.luasTanah ?? 0);
  const [njopTanah, setNjopTanah] = useState<number>(initialValues?.njopTanah ?? 0);
  const [luasBangunan, setLuasBangunan] = useState<number>(initialValues?.luasBangunan ?? 0);
  const [njopBangunan, setNjopBangunan] = useState<number>(initialValues?.njopBangunan ?? 0);
  const [nilaiTransaksi, setNilaiTransaksi] = useState<number>(initialValues?.nilaiTransaksi ?? 0);
  
  // APHB party count (e.g. 2 -> 1/2 = 50%, 3 -> 1/3 = 33.3%)
  const [aphbPartyCount, setAphbPartyCount] = useState<number>(initialValues?.porsiPartyCount || 2);
  const [customPorsiHak, setCustomPorsiHak] = useState<number | null>(
    initialValues?.porsiHakAphb !== undefined ? initialValues.porsiHakAphb : null
  );

  // Advanced overrides (NPOPTKP & PPh Rate)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customNpoptkp, setCustomNpoptkp] = useState<string>('');
  const [customPphRate, setCustomPphRate] = useState<string>('');

  const [copied, setCopied] = useState(false);

  // Automatically update defaults when deed type changes
  const activeNpoptkp = useMemo(() => {
    if (customNpoptkp !== '') {
      return parseNumberId(customNpoptkp);
    }
    return jenisAkta === 'WARIS' ? DEFAULT_NPOPTKP_WARIS : DEFAULT_NPOPTKP_STANDARD;
  }, [customNpoptkp, jenisAkta]);

  const activePphRate = useMemo(() => {
    if (customPphRate !== '') {
      const parsed = parseFloat(customPphRate.replace(',', '.'));
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed > 1 ? parsed / 100 : parsed;
      }
    }
    if (jenisAkta === 'WARIS') return PPH_RATE_WARIS;
    return PPH_RATE_STANDARD;
  }, [customPphRate, jenisAkta]);

  // Determine APHB portion
  const porsiHakAphb = useMemo(() => {
    if (jenisAkta !== 'APHB') return undefined;
    if (customPorsiHak !== null && customPorsiHak > 0 && customPorsiHak <= 1) {
      return customPorsiHak;
    }
    return aphbPartyCount > 0 ? 1 / aphbPartyCount : 0.5;
  }, [jenisAkta, customPorsiHak, aphbPartyCount]);

  // Execute pure calculation
  const calculationResult: TaxCalculationResult = useMemo(() => {
    const input: TaxCalculationInput = {
      luasTanah,
      njopTanah,
      luasBangunan,
      njopBangunan,
      nilaiTransaksi,
      npoptkp: activeNpoptkp,
      pphRate: activePphRate,
      jenisAkta,
      porsiHakAphb
    };

    return calculatePpatTaxes(input);
  }, [luasTanah, njopTanah, luasBangunan, njopBangunan, nilaiTransaksi, activeNpoptkp, activePphRate, jenisAkta, porsiHakAphb]);

  // Notify parent component if callback provided
  useEffect(() => {
    if (onCalculationChange) {
      onCalculationChange(calculationResult, {
        luasTanah,
        njopTanah,
        luasBangunan,
        njopBangunan,
        nilaiTransaksi,
        npoptkp: activeNpoptkp,
        pphRate: activePphRate,
        jenisAkta,
        porsiHakAphb
      });
    }
  }, [calculationResult, onCalculationChange, luasTanah, njopTanah, luasBangunan, njopBangunan, nilaiTransaksi, activeNpoptkp, activePphRate, jenisAkta, porsiHakAphb]);

  // Handle Deed Type Selection
  const handleDeedTypeChange = (type: JenisAktaPpat) => {
    setJenisAkta(type);
    // Reset custom overrides when deed type is explicitly switched
    setCustomNpoptkp('');
    setCustomPphRate('');
  };

  // Quick Preset / Reset
  const handleReset = () => {
    setJenisAkta('AJB');
    setLuasTanah(0);
    setNjopTanah(0);
    setLuasBangunan(0);
    setNjopBangunan(0);
    setNilaiTransaksi(0);
    setAphbPartyCount(2);
    setCustomPorsiHak(null);
    setCustomNpoptkp('');
    setCustomPphRate('');
  };

  // Copy Summary to Clipboard
  const handleCopySummary = async () => {
    const lines = [
      `=== RINGKASAN ESTIMASI PAJAK PPAT ===`,
      `Jenis Akta       : ${jenisAkta}`,
      `Luas Tanah       : ${formatNumberId(luasTanah)} m² @ ${formatRp(njopTanah)}`,
      `Total NJOP Tanah : ${formatRp(calculationResult.totalNjopTanah)}`,
      `Luas Bangunan    : ${formatNumberId(luasBangunan)} m² @ ${formatRp(njopBangunan)}`,
      `Total NJOP Bangunan : ${formatRp(calculationResult.totalNjopBangunan)}`,
      `Total NJOP PBB   : ${formatRp(calculationResult.totalNjop)}`,
      `Nilai Transaksi  : ${formatRp(nilaiTransaksi)}`,
      `DPP / NPOP       : ${formatRp(calculationResult.npop)} (${calculationResult.dasarPenetapan})`,
      `---------------------------------------`,
      `PPh Final        : ${formatRp(calculationResult.pphAmount)} (${(calculationResult.pphRate * 100).toFixed(1)}%)`,
      `BPHTB (5%)       : ${formatRp(calculationResult.bphtbAmount)} (NPOPKP: ${formatRp(calculationResult.npopkp)})`,
      `TOTAL PAJAK      : ${formatRp(calculationResult.totalPajak)}`,
      `=======================================`
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy summary:', err);
    }
  };

  return (
    <div className={`w-full max-w-6xl mx-auto space-y-6 ${className}`}>
      {/* ─── COMPONENT HEADER ─────────────────────────────────────────────────── */}
      {showTitle && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-xs">
              <CalcIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  Kalkulator Pajak PPAT (PPh & BPHTB)
                </h2>
                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> PP 34/2016 & UU HKPD 1/2022
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Hitung otomatis Dasar Pengenaan Pajak (DPP / NPOP), Pajak Penjual (PPh), dan Pajak Pembeli (BPHTB)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
              title="Reset Formulir"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all"
              title="Salin Rincian Perhitungan"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-blue-600" />
                  <span>Salin Ringkasan</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─── MAIN GRID: INPUTS (LEFT) & SUMMARY CARD (RIGHT) ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ─── LEFT COLUMN: INPUT FORM ────────────────────────────────────────── */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-5">
            
            {/* 1. Jenis Akta / Deed Type Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Jenis Akta / Transaksi PPAT <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={jenisAkta}
                  onChange={(e) => handleDeedTypeChange(e.target.value as JenisAktaPpat)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden transition-all appearance-none cursor-pointer"
                >
                  <option value="AJB">AJB (Akta Jual Beli) - Tarif PPh 2.5%, BPHTB 5%</option>
                  <option value="APHB">APHB (Akta Pembagian Hak Bersama) - Proporsional Porsi Hak</option>
                  <option value="HIBAH">HIBAH (Akta Hibah) - PPh 2.5% / SKB, BPHTB 5%</option>
                  <option value="WARIS">WARIS (Keterangan Waris) - Bebas PPh (0%), NPOPTKP Rp 300 Jt</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-3.5 pointer-events-none" />
              </div>

              {/* Deed type contextual hint */}
              <div className="mt-2 text-[11px] text-slate-500 flex items-start gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  {jenisAkta === 'AJB' && (
                    <span><strong>Jual Beli Biasa (AJB):</strong> PPh Final Penjual 2.5% (PP 34/2016) dan BPHTB Pembeli 5% setelah dikurangi NPOPTKP (Rp 80 Jt).</span>
                  )}
                  {jenisAkta === 'APHB' && (
                    <span><strong>APHB (Pembagian Hak Bersama):</strong> Pajak dikenakan proporsional atas porsi hak yang beralih/diperoleh (misal 1/2 bagian untuk 2 pihak).</span>
                  )}
                  {jenisAkta === 'HIBAH' && (
                    <span><strong>Hibah:</strong> Dikenakan BPHTB 5% dengan NPOPTKP standar. PPh 2.5% kecuali hibah keluarga sedarah garis lurus 1 derajat yang ber-SKB PPh (0%).</span>
                  )}
                  {jenisAkta === 'WARIS' && (
                    <span><strong>Waris / Turun Waris:</strong> Bebas PPh Final (0%). Batas NPOPTKP BPHTB khusus waris otomatis diset ke Rp 300.000.000 (UU HKPD No. 1/2022).</span>
                  )}
                </div>
              </div>
            </div>

            {/* 1.1 APHB Specific Portion Controls */}
            {jenisAkta === 'APHB' && (
              <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-700" />
                    Porsi Peralihan Hak APHB
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md">
                    {((porsiHakAphb || 0.5) * 100).toFixed(1)}% ({porsiHakAphb === 0.5 ? '1/2' : porsiHakAphb === 1/3 ? '1/3' : porsiHakAphb === 0.25 ? '1/4' : `${(porsiHakAphb || 0.5) * 100}%`})
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { count: 2, label: '2 Pihak (1/2 = 50%)' },
                    { count: 3, label: '3 Pihak (1/3 = 33.3%)' },
                    { count: 4, label: '4 Pihak (1/4 = 25%)' }
                  ].map((p) => (
                    <button
                      key={p.count}
                      type="button"
                      onClick={() => {
                        setAphbPartyCount(p.count);
                        setCustomPorsiHak(null);
                      }}
                      className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                        customPorsiHak === null && aphbPartyCount === p.count
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100/60'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Data Tanah (Luas & NJOP) */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  Objek Tanah
                </label>
                {calculationResult.totalNjopTanah > 0 && (
                  <span className="text-[11px] font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                    Total: {formatRp(calculationResult.totalNjopTanah)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Luas Tanah (m²) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatNumberId(luasTanah)}
                      onChange={(e) => setLuasTanah(parseNumberId(e.target.value))}
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden font-mono transition-all"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">m²</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    NJOP Tanah per m² (Rp) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="text"
                      value={formatNumberId(njopTanah)}
                      onChange={(e) => setNjopTanah(parseNumberId(e.target.value))}
                      placeholder="0"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden font-mono transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Data Bangunan (Luas & NJOP) */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-600" />
                  Objek Bangunan (Opsional)
                </label>
                {calculationResult.totalNjopBangunan > 0 && (
                  <span className="text-[11px] font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                    Total: {formatRp(calculationResult.totalNjopBangunan)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Luas Bangunan (m²)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatNumberId(luasBangunan)}
                      onChange={(e) => setLuasBangunan(parseNumberId(e.target.value))}
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden font-mono transition-all"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">m²</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    NJOP Bangunan per m² (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="text"
                      value={formatNumberId(njopBangunan)}
                      onChange={(e) => setNjopBangunan(parseNumberId(e.target.value))}
                      placeholder="0"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden font-mono transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Nilai Transaksi / Harga Kesepakatan */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  Nilai Transaksi Riil / Kesepakatan (Rp) <span className="text-red-500">*</span>
                </label>
                {calculationResult.totalNjop > 0 && (
                  <button
                    type="button"
                    onClick={() => setNilaiTransaksi(calculationResult.totalNjop)}
                    className="text-[10.5px] font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-2"
                  >
                    Samakan dgn NJOP ({formatRp(calculationResult.totalNjop)})
                  </button>
                )}
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-400">Rp</span>
                <input
                  type="text"
                  value={formatNumberId(nilaiTransaksi)}
                  onChange={(e) => setNilaiTransaksi(parseNumberId(e.target.value))}
                  placeholder="0"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-base font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden font-mono transition-all"
                />
              </div>

              {/* Live DPP / NPOP Feedback */}
              <div className={`mt-3 p-3 rounded-xl border text-xs flex items-center justify-between ${
                calculationResult.dasarPenetapan === 'TRANSAKSI'
                  ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
                  : 'bg-blue-50/70 border-blue-200/80 text-blue-900'
              }`}>
                <div className="flex items-center gap-2">
                  <Scale className={`w-4 h-4 shrink-0 ${calculationResult.dasarPenetapan === 'TRANSAKSI' ? 'text-emerald-600' : 'text-blue-600'}`} />
                  <div>
                    <span className="font-bold">Dasar Pengenaan Pajak (DPP / NPOP):</span>
                    <span className="ml-1 text-[11px] opacity-80">
                      {calculationResult.dasarPenetapan === 'TRANSAKSI'
                        ? '(Nilai Transaksi > Total NJOP)'
                        : '(Total NJOP PBB > Nilai Transaksi)'}
                    </span>
                  </div>
                </div>
                <span className="font-mono font-black text-sm">
                  {formatRp(calculationResult.npop)}
                </span>
              </div>
            </div>

            {/* 5. Collapsible Advanced Tax Rules (NPOPTKP & PPh Rate) */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full text-xs font-bold text-slate-600 hover:text-slate-900 py-1.5 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-slate-500" />
                  Pengaturan Lanjutan (Batas NPOPTKP & Tarif PPh)
                </span>
                {showAdvanced ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showAdvanced && (
                <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Batas NPOPTKP Daerah (Rp)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-[11px] font-bold text-slate-400">Rp</span>
                        <input
                          type="text"
                          value={customNpoptkp !== '' ? customNpoptkp : formatNumberId(activeNpoptkp)}
                          onChange={(e) => setCustomNpoptkp(e.target.value)}
                          placeholder={formatNumberId(activeNpoptkp)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:border-blue-500 outline-hidden font-mono"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Default: {jenisAkta === 'WARIS' ? 'Rp 300.000.000 (Waris)' : 'Rp 80.000.000 (Umum)'}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Tarif PPh Final (%)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={customPphRate !== '' ? customPphRate : (activePphRate * 100).toString()}
                          onChange={(e) => setCustomPphRate(e.target.value)}
                          placeholder={(activePphRate * 100).toString()}
                          className="w-full px-3 py-2 pr-8 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:border-blue-500 outline-hidden font-mono"
                        />
                        <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Default: {jenisAkta === 'WARIS' ? '0% (Waris)' : '2.5% (AJB Umum) / 1.0% (RSS)'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ─── RIGHT COLUMN: PROFESSIONAL SUMMARY CARD ────────────────────────── */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-5 sticky top-6">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                  Ringkasan Pajak Transaksi
                </h3>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                calculationResult.dasarPenetapan === 'TRANSAKSI'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}>
                DPP: {calculationResult.dasarPenetapan}
              </span>
            </div>

            {/* 1. Nilai Dasar Objek Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Total NJOP Tanah:</span>
                <span className="font-mono font-medium text-slate-800">{formatRp(calculationResult.totalNjopTanah)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Total NJOP Bangunan:</span>
                <span className="font-mono font-medium text-slate-800">{formatRp(calculationResult.totalNjopBangunan)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700 font-semibold pt-1 border-t border-slate-100">
                <span>Total NJOP PBB:</span>
                <span className="font-mono text-slate-900">{formatRp(calculationResult.totalNjop)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700 font-semibold">
                <span>Nilai Transaksi Kesepakatan:</span>
                <span className="font-mono text-slate-900">{formatRp(nilaiTransaksi)}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-100/80 rounded-xl font-bold text-slate-900">
                <span className="text-[11px] uppercase tracking-wide">Dasar NPOP (Nilai Tertinggi):</span>
                <span className="font-mono text-sm">{formatRp(calculationResult.npop)}</span>
              </div>
            </div>

            {/* 2. PPh Final Card (Pajak Penjual) */}
            <div className="p-4 bg-purple-50/70 border border-purple-200/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-purple-950 uppercase tracking-wide block">
                    PPh Final (Pajak Penjual)
                  </span>
                  <span className="text-[10px] text-purple-700">
                    Dasar: PP No. 34 Tahun 2016
                  </span>
                </div>
                <span className="text-xs font-bold font-mono bg-purple-100 text-purple-900 px-2 py-0.5 rounded-md">
                  {(calculationResult.pphRate * 100).toFixed(1)}%
                </span>
              </div>

              <div className="text-[11px] text-purple-900/80 pt-1 border-t border-purple-200/60">
                {jenisAkta === 'WARIS' ? (
                  <span>Bebas PPh (0%) untuk waris keluarga lurus</span>
                ) : jenisAkta === 'APHB' ? (
                  <span>
                    {(calculationResult.pphRate * 100).toFixed(1)}% × {formatRp(calculationResult.npop)} × {((porsiHakAphb || 0.5) * 100).toFixed(1)}%
                  </span>
                ) : (
                  <span>
                    {(calculationResult.pphRate * 100).toFixed(1)}% × NPOP ({formatRp(calculationResult.npop)})
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 font-extrabold text-sm text-purple-950">
                <span>Nominal PPh:</span>
                <span className="font-mono text-base">{formatRp(calculationResult.pphAmount)}</span>
              </div>
            </div>

            {/* 3. BPHTB Card (Pajak Pembeli) */}
            <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-950 uppercase tracking-wide block">
                    BPHTB (Pajak Pembeli)
                  </span>
                  <span className="text-[10px] text-blue-700">
                    Dasar: UU HKPD No. 1 Tahun 2022
                  </span>
                </div>
                <span className="text-xs font-bold font-mono bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md">
                  5.0%
                </span>
              </div>

              <div className="text-[10.5px] text-blue-900/80 space-y-0.5 pt-1 border-t border-blue-200/60">
                <div className="flex justify-between">
                  <span>NPOPTKP (Pengurang):</span>
                  <span className="font-mono">{formatRp(calculationResult.npoptkp)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>NPOPKP (Kena Pajak):</span>
                  <span className="font-mono">{formatRp(calculationResult.npopkp)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 font-extrabold text-sm text-blue-950">
                <span>Nominal BPHTB:</span>
                <span className="font-mono text-base">{formatRp(calculationResult.bphtbAmount)}</span>
              </div>
            </div>

            {/* 4. TOTAL PAJAK (PPH + BPHTB) */}
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2.5 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  TOTAL PAJAK (PPh + BPHTB)
                </span>
                <span className="text-[11px] font-medium text-emerald-400 bg-slate-800 px-2 py-0.5 rounded">
                  Pajak Final
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 text-right">
                {formatRp(calculationResult.totalPajak)}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[10.5px] text-slate-300">
                <div>
                  <span className="text-slate-400 block">Porsi Penjual:</span>
                  <strong className="text-white font-mono">{formatRp(calculationResult.pphAmount)}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Porsi Pembeli:</span>
                  <strong className="text-white font-mono">{formatRp(calculationResult.bphtbAmount)}</strong>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
