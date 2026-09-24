/**
 * PPAT Tax Calculation Service
 * 
 * Dasar Hukum:
 * 1. PPh Final Penjual: PP No. 34 Tahun 2016 tentang Pajak Penghasilan atas Penghasilan dari Pengalihan Hak atas Tanah dan/atau Bangunan.
 * 2. BPHTB Pembeli: UU No. 1 Tahun 2022 tentang Hubungan Keuangan antara Pemerintah Pusat dan Pemerintahan Daerah (UU HKPD).
 */

export type JenisAktaPpat = 'AJB' | 'APHB' | 'HIBAH' | 'WARIS';

export interface TaxCalculationInput {
  luasTanah: number;
  njopTanah: number;
  luasBangunan: number;
  njopBangunan: number;
  nilaiTransaksi: number;
  npoptkp?: number;        // default: 80000000 (atau 300000000 untuk waris/hibah wasiat)
  pphRate?: number;        // default: 0.025 (2.5%) atau 2.5 jika dalam persen
  jenisAkta: JenisAktaPpat;
  porsiHakAphb?: number;  // 0 - 1 (opsional, untuk APHB, e.g. 0.5 atau 1/2)
}

export interface TaxCalculationResult {
  totalNjopTanah: number;
  totalNjopBangunan: number;
  totalNjop: number;
  nilaiTransaksi: number;
  npop: number;           // Nilai tertinggi yang dijadikan dasar penetapan pajak
  dasarPenetapan: 'TRANSAKSI' | 'NJOP';
  pphRate: number;        // Nilai desimal (e.g. 0.025)
  pphAmount: number;      // PPh Final (Pajak Penjual)
  npoptkp: number;        // Nilai Perolehan Objek Pajak Tidak Kena Pajak
  npopkp: number;         // Dasar pengenaan BPHTB setelah dikurangi NPOPTKP
  bphtbRate: number;      // 0.05 (5%)
  bphtbAmount: number;    // BPHTB (Pajak Pembeli)
  totalPajak: number;     // pphAmount + bphtbAmount
  
  // Metadata tambahan untuk transparansi & lembar cetak
  porsiHak: number;       // Faktor porsi peralihan (1 untuk AJB/Waris biasa, 1/N untuk APHB)
  legalBasis: {
    pph: string;
    bphtb: string;
  };
}

/**
 * Nilai standar NPOPTKP sesuai regulasi umum:
 * - Standar Umum (AJB / Hibah / Lelang): Rp 80.000.000
 * - Khusus Waris / Hibah Wasiat: Rp 300.000.000
 */
export const DEFAULT_NPOPTKP_STANDARD = 80_000_000;
export const DEFAULT_NPOPTKP_WARIS = 300_000_000;

/**
 * Tarif Baku PPh Final Pengalihan Hak Tanah/Bangunan (PP 34/2016):
 * - Umum (Jual Beli AJB / Hibah selain keluarga lurus): 2.5% (0.025)
 * - Rumah Sederhana / RSS oleh Wajib Pajak Developer: 1.0% (0.01)
 * - Waris / Hibah Keluarga Sedarah Lurus 1 Derajat (dengan SKB PPh): 0% (0.00)
 */
export const PPH_RATE_STANDARD = 0.025;
export const PPH_RATE_RSS = 0.01;
export const PPH_RATE_WARIS = 0.0;

/**
 * Tarif Baku BPHTB Nasional (UU HKPD No. 1 Tahun 2022):
 * - Standar: 5% (0.05)
 */
export const BPHTB_RATE_STANDARD = 0.05;

/**
 * Pure function untuk menghitung PPh dan BPHTB secara akurat dan taat hukum pajak
 */
export function calculatePpatTaxes(input: TaxCalculationInput): TaxCalculationResult {
  const luasTanah = Math.max(0, Number(input.luasTanah) || 0);
  const njopTanah = Math.max(0, Number(input.njopTanah) || 0);
  const luasBangunan = Math.max(0, Number(input.luasBangunan) || 0);
  const njopBangunan = Math.max(0, Number(input.njopBangunan) || 0);
  const nilaiTransaksi = Math.max(0, Number(input.nilaiTransaksi) || 0);

  // 1. ATURAN DASAR PENGENAAN PAJAK (DPP)
  const totalNjopTanah = luasTanah * njopTanah;
  const totalNjopBangunan = luasBangunan * njopBangunan;
  const totalNjop = totalNjopTanah + totalNjopBangunan;

  // NPOP (Nilai Perolehan Objek Pajak): Menggunakan nilai tertinggi antara Nilai Transaksi & Total NJOP
  const npop = Math.max(nilaiTransaksi, totalNjop);
  const dasarPenetapan: 'TRANSAKSI' | 'NJOP' = (nilaiTransaksi >= totalNjop && nilaiTransaksi > 0) ? 'TRANSAKSI' : 'NJOP';

  // 2. LOGIKA PERHITUNGAN PPh FINAL (PP 34/2016)
  // Menentukan tarif PPh (jika input.pphRate diberikan sebagai e.g. 2.5, konversi ke 0.025)
  let rawPphRate: number;
  if (input.jenisAkta === 'WARIS') {
    rawPphRate = 0.0;
  } else if (input.pphRate !== undefined && input.pphRate !== null) {
    rawPphRate = input.pphRate > 1 ? input.pphRate / 100 : input.pphRate;
  } else {
    rawPphRate = PPH_RATE_STANDARD;
  }

  // Porsi hak untuk APHB (Akta Pembagian Hak Bersama)
  let porsiHak = 1;
  if (input.jenisAkta === 'APHB') {
    if (input.porsiHakAphb !== undefined && input.porsiHakAphb > 0 && input.porsiHakAphb <= 1) {
      porsiHak = input.porsiHakAphb;
    }
  }

  // PPh Amount = Math.round(npop * pphRate * porsiHak)
  const pphAmount = Math.round(npop * rawPphRate * (input.jenisAkta === 'APHB' ? porsiHak : 1));

  // 3. LOGIKA PERHITUNGAN BPHTB (UU HKPD 1/2022)
  // Default NPOPTKP: Jika tidak diisi, gunakan standar daerah (Rp 80jt atau Rp 300jt jika waris)
  let defaultNpoptkp = input.jenisAkta === 'WARIS' ? DEFAULT_NPOPTKP_WARIS : DEFAULT_NPOPTKP_STANDARD;
  const npoptkp = (input.npoptkp !== undefined && input.npoptkp !== null && input.npoptkp >= 0)
    ? Number(input.npoptkp)
    : defaultNpoptkp;

  // Untuk APHB, dasar pengenaan dikenakan atas porsi hak yang beralih/diperoleh
  let npopBphtbBase = npop;
  if (input.jenisAkta === 'APHB') {
    npopBphtbBase = npop * porsiHak;
  }

  // NPOPKP = Math.max(0, npopBphtbBase - npoptkp)
  const npopkp = Math.max(0, npopBphtbBase - npoptkp);

  // BPHTB Amount = Math.round(npopkp * 0.05)
  const bphtbAmount = Math.round(npopkp * BPHTB_RATE_STANDARD);

  // 4. TOTAL PAJAK
  const totalPajak = pphAmount + bphtbAmount;

  return {
    totalNjopTanah,
    totalNjopBangunan,
    totalNjop,
    nilaiTransaksi,
    npop,
    dasarPenetapan,
    pphRate: rawPphRate,
    pphAmount,
    npoptkp,
    npopkp,
    bphtbRate: BPHTB_RATE_STANDARD,
    bphtbAmount,
    totalPajak,
    porsiHak,
    legalBasis: {
      pph: 'PP No. 34 Tahun 2016 (PPh Final Pengalihan Hak atas Tanah/Bangunan)',
      bphtb: 'UU HKPD No. 1 Tahun 2022 (Bea Perolehan Hak atas Tanah dan Bangunan)'
    }
  };
}
