import React from 'react';
import { PpatCalculationRecord } from '../../types/ppatCalculator';

interface PrintSheetProps {
  calc: PpatCalculationRecord;
  calculatedValues: {
    exactIndex: number;
    targetIndex: number;
    estimatedLandPricePerM2: number;
    totalLandNjop: number;
    totalBuildingNjop: number;
    totalNjopPbb: number;
    totalMarketValue: number;
    npop: number;
    dasarPenetapan?: 'TRANSAKSI' | 'NJOP';
    pphRate: number;
    pphAmount?: number;
    pph: number;
    npoptkp?: number;
    npopkp?: number;
    bphtbRate?: number;
    bphtbAmount?: number;
    bphtb: number;
    subtotalAdmin: number;
    grandTotal: number;
    totalBuyer: number;
    totalSeller: number;
    porsiHak?: number;
    legalBasis?: {
      pph: string;
      bphtb: string;
    };
  };
}

export const PpatCalculationPrintSheet: React.FC<PrintSheetProps> = ({ calc, calculatedValues }) => {
  const formatRp = (val: number | undefined) => {
    return `Rp ${(Math.round(val || 0)).toLocaleString('id-ID')}`;
  };

  const formatPlainNumber = (val: number | string | undefined) => {
    if (val === undefined || val === null || val === '') return '0';
    const num = typeof val === 'string' ? parseInt(val.replace(/\D/g, ''), 10) : Math.round(val);
    if (isNaN(num)) return '0';
    return num.toLocaleString('id-ID');
  };

  const pphNominal = calculatedValues.pphAmount !== undefined ? calculatedValues.pphAmount : calculatedValues.pph;
  const bphtbNominal = calculatedValues.bphtbAmount !== undefined ? calculatedValues.bphtbAmount : calculatedValues.bphtb;
  const npoptkpVal = calculatedValues.npoptkp !== undefined ? calculatedValues.npoptkp : (calc.npoptkp || 80000000);
  const npopkpVal = calculatedValues.npopkp !== undefined ? calculatedValues.npopkp : Math.max(0, calculatedValues.npop - npoptkpVal);

  const pphRateDisplay = calculatedValues.pphRate
    ? `${(calculatedValues.pphRate * 100).toString().replace('.', ',')}%`
    : '2,5%';

  // Title / Client name
  const sheetTitle = (calc.title || calc.clientName || 'IR BASAULI UMAR LUBIS').toUpperCase();

  return (
    <div className="bg-white text-black font-sans max-w-[210mm] mx-auto p-4 sm:p-6 text-[11px] leading-tight print:p-0 print:max-w-none print:text-[10.5px] print:shadow-none shadow-sm">
      
      {/* ─── HEADER TITLE & GREEN BAR ─────────────────────────────────────────── */}
      <div className="text-center mb-4">
        <h1 className="text-lg sm:text-xl font-bold tracking-wider uppercase text-black">
          {sheetTitle}
        </h1>
        <div className="h-[3.5px] bg-[#1b5e20] w-full mt-2 mb-4"></div>
      </div>

      {/* ─── METADATA SECTION ─────────────────────────────────────────────────── */}
      <div className="mb-4 space-y-1 text-xs">
        <div className="grid grid-cols-[140px_10px_1fr] items-baseline">
          <span className="font-bold text-black">Jenis Transaksi</span>
          <span className="font-bold text-black">:</span>
          <span className="font-bold text-black">{calc.transactionType || 'AJB'}</span>
        </div>
        <div className="grid grid-cols-[140px_10px_1fr] items-baseline">
          <span className="font-bold text-black">Jenis Sertipikat</span>
          <span className="font-bold text-black">:</span>
          <span className="font-bold text-black">{calc.certificateType || 'SHM'}</span>
        </div>
        <div className="grid grid-cols-[140px_10px_1fr] items-baseline">
          <span className="font-bold text-black">Nomor Sertipikat</span>
          <span className="font-bold text-black">:</span>
          <span className="font-bold text-black">{calc.certificateNumber || '-'}</span>
        </div>
        <div className="grid grid-cols-[140px_10px_1fr] items-baseline">
          <span className="font-bold text-black">Desa</span>
          <span className="font-bold text-black">:</span>
          <span className="font-bold text-black">{calc.village || '-'}</span>
        </div>
        <div className="grid grid-cols-[140px_10px_1fr] items-baseline">
          <span className="font-bold text-black">NOP</span>
          <span className="font-bold text-black">:</span>
          <span className="font-bold text-black font-mono">{calc.nop || calc.nopPbb || '-'}</span>
        </div>
      </div>

      {/* ─── SECTION 1: PENILAIAN NJOP ────────────────────────────────────────── */}
      <div className="mb-4">
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-black mb-1">
          PENILAIAN NJOP
        </h2>
        <table className="w-full border-collapse border border-black text-[11px]">
          <thead>
            <tr className="border-b border-black">
              <th className="border-r border-black py-1 px-3 text-center font-bold w-[25%] uppercase">OBJEK</th>
              <th className="border-r border-black py-1 px-3 text-center font-bold w-[15%] uppercase">LUAS</th>
              <th className="border-r border-black py-1 px-3 text-center font-bold w-[30%] uppercase">PENILAIAN NJOP</th>
              <th className="py-1 px-3 text-center font-bold w-[30%] uppercase">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-black">
              <td className="border-r border-black py-1 px-3 font-semibold uppercase">TANAH</td>
              <td className="border-r border-black py-1 px-3 text-center font-medium">{formatPlainNumber(calc.landArea)}</td>
              <td className="border-r border-black py-1 px-3 text-right font-medium">{formatPlainNumber(calc.landNjopPerM2)}</td>
              <td className="py-1 px-3 text-right font-medium">{formatRp(calculatedValues.totalLandNjop)}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="border-r border-black py-1 px-3 font-semibold uppercase">BANGUNAN</td>
              <td className="border-r border-black py-1 px-3 text-center font-medium">{formatPlainNumber(calc.buildingArea || 0)}</td>
              <td className="border-r border-black py-1 px-3 text-right font-medium">{formatPlainNumber(calc.buildingNjopPerM2 || 0)}</td>
              <td className="py-1 px-3 text-right font-medium">{formatRp(calculatedValues.totalBuildingNjop)}</td>
            </tr>
            <tr className="border-b border-black">
              <td colSpan={3} className="border-r border-black py-1 px-3 text-center font-bold uppercase">
                TOTAL
              </td>
              <td className="py-1 px-3 text-right font-bold">{formatRp(calculatedValues.totalNjopPbb)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="border-r border-black py-1 px-3 text-center font-bold uppercase">
                PENILAIAN/ NILAI TRANSAKSI
              </td>
              <td className="py-1 px-3 text-right font-bold">{formatRp(calculatedValues.npop)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ─── SECTION 2: BPHTB ─────────────────────────────────────────────────── */}
      <div className="mb-4">
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-black mb-1">
          BPHTB
        </h2>
        <table className="w-full border-collapse border border-black text-[11px]">
          <tbody>
            <tr className="border-b border-black">
              <td className="border-r border-black py-1 px-3 font-bold w-[70%] uppercase">NILAI TRANSAKSI</td>
              <td className="py-1 px-3 text-right font-bold w-[30%]">{formatRp(calculatedValues.npop)}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="border-r border-black py-1 px-3 font-bold uppercase">NPOPTKP</td>
              <td className="py-1 px-3 text-right font-medium">{formatRp(npoptkpVal)}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="border-r border-black py-1 px-3 font-bold uppercase">NPOPKP</td>
              <td className="py-1 px-3 text-right font-medium">{formatRp(npopkpVal)}</td>
            </tr>
            <tr>
              <td className="border-r border-black py-1 px-3 font-bold uppercase">NILAI PAJAK 5%</td>
              <td className="py-1 px-3 text-right font-bold">{formatRp(bphtbNominal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ─── SECTION 3: PPH ──────────────────────────────────────────────────── */}
      <div className="mb-4">
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-black mb-1">
          PPH
        </h2>
        <table className="w-full border-collapse border border-black text-[11px]">
          <tbody>
            <tr className="border-b border-black">
              <td className="border-r border-black py-1 px-3 font-bold w-[70%] uppercase">NILAI TRANSAKSI</td>
              <td className="py-1 px-3 text-right font-bold w-[30%]">{formatRp(calculatedValues.npop)}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="border-r border-black py-1 px-3 font-bold uppercase">
                {calc.transactionType === 'WARIS' ? 'PPH FINAL (0% BEBAS WARIS)' : `PPH FINAL ${pphRateDisplay}`}
              </td>
              <td className="py-1 px-3 text-right font-medium">{formatRp(pphNominal)}</td>
            </tr>
            <tr>
              <td className="border-r border-black py-1 px-3 font-bold uppercase">TOTAL PPH</td>
              <td className="py-1 px-3 text-right font-bold">{formatRp(pphNominal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ─── SECTION 4: BIAYA ADMINISTRASI & LAIN-LAIN ─────────────────────────── */}
      <div className="mb-4">
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-black mb-1">
          BIAYA ADMINISTRASI & LAIN-LAIN
        </h2>
        <table className="w-full border-collapse border border-black text-[11px]">
          <tbody>
            {(calc.adminCosts || []).map((cost, index) => (
              <tr key={cost.id || index} className="border-b border-black">
                <td className="border-r border-black py-1 px-3 font-bold w-[70%] uppercase">
                  {(cost.name || '').toUpperCase()}
                </td>
                <td className="py-1 px-3 text-right font-medium w-[30%]">
                  {formatRp(cost.amount)}
                </td>
              </tr>
            ))}
            <tr>
              <td className="border-r border-black py-1 px-3 font-bold uppercase">
                TOTAL BIAYA ADM & LAIN-LAIN
              </td>
              <td className="py-1 px-3 text-right font-bold">
                {formatRp(calculatedValues.subtotalAdmin)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ─── SECTION 5: GRAND TOTAL (PAJAK + BIAYA) ──────────────────────────── */}
      <div className="mb-4 border border-black rounded-sm overflow-hidden flex items-center justify-between p-3 bg-[#f3f9f8]">
        <span className="text-sm font-black uppercase tracking-wide text-black">
          GRAND TOTAL (PAJAK + BIAYA)
        </span>
        <span className="text-base sm:text-lg font-black text-black">
          {formatRp(calculatedValues.grandTotal)}
        </span>
      </div>

      {/* ─── SECTION 6: PEMBAYARAN DITRANSFER KE ──────────────────────────────── */}
      <div className="border border-slate-300 rounded-xl p-4 bg-white text-[11px] leading-relaxed text-slate-900">
        <div className="font-bold uppercase tracking-wider text-slate-900 mb-1">
          PEMBAYARAN DITRANSFER KE:
        </div>
        <div className="space-y-0.5 font-bold">
          <div>BCA Cabang Dago - Bandung</div>
          <div>Acc. 7770673016</div>
          <div>A.n Nukantini Putri Parincha</div>
        </div>
        <div className="mt-3 space-y-0.5 text-slate-700 font-medium text-[10px]">
          <div>NPWP 16 digit : 3217015610760002</div>
          <div>SWIFT BCA : CENAIDJA</div>
        </div>
      </div>

    </div>
  );
};
