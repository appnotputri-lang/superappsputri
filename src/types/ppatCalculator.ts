export const MASTER_SEQUENCE: number[] = [
  140, 200, 270, 360, 480, 660, 910, 1200, 1700, 2450, 3500, 5000, 7150, 10000, 14000, 20000, 27000, 36000, 48000, 64000, 
  82000, 103000, 128000, 160000, 200000, 243000, 285000, 335000, 394000, 464000, 537000, 614000, 702000, 802000, 916000, 
  1032000, 1147000, 1274000, 1416000, 1573000, 1722000, 1862000, 2013000, 2176000, 2352000, 2508000, 2640000, 2779000, 
  2925000, 3100000, 3375000, 3745000, 4155000, 4605000, 5095000, 5625000, 6195000, 6805000, 7455000, 8145000, 8875000, 
  9645000, 10455000, 11305000, 12195000, 13125000, 14095000, 15105000, 16285000, 17375000, 18375000, 19545000
];

export interface AdminCostItem {
  id: string;
  name: string; // Must always be UPPERCASE
  amount: number;
}

export type TransactionType = 'AJB' | 'APHB' | 'HIBAH' | 'WARIS';

export interface PpatCalculationRecord {
  id: string;
  createdAt: string;
  updatedAt?: string;
  
  // Judul Perhitungan
  title: string;
  
  // Jenis Transaksi PPAT
  transactionType: TransactionType;
  
  // Data Objek
  certificateType: string;
  certificateNumber: string;
  village: string;
  nop: string;
  
  // 1. Penilaian NJOP
  landArea: number; // m2
  landNjopPerM2: number; // Rp
  buildingArea: number; // m2
  buildingNjopPerM2: number; // Rp
  
  // 2. Nilai Transaksi & Pajak
  useMarketEstimation: boolean; // Checkbox: Nilai transaksi & pajak dari estimasi harga pasar?
  transactionValue: number; // Penilaian/ Nilai Transaksi (Rp)
  partyCount: string; // Jumlah Pemilik (APHB/PPH): e.g. '1', '2', '3', '4', '5'
  npoptkp: number; // NPOPTKP (Pengurang)
  pphRate: number; // %
  
  // 3. Biaya Administrasi & Lain-lain
  adminCosts: AdminCostItem[];
  
  // Backward compatibility helpers
  clientName?: string;
  nopPbb?: string;
  useNjopClassJump?: boolean;
  jumpType?: 'AJB' | 'APHB_WARIS_HIBAH';
  manualMarketValue?: number;
  notes?: string;
}

export const DEFAULT_ADMIN_COSTS: AdminCostItem[] = [
  { id: '1', name: 'VALIDASI PAJAK', amount: 750000 },
  { id: '2', name: 'PNBP', amount: 1950000 },
  { id: '3', name: 'ADM BPN', amount: 3500000 },
  { id: '4', name: 'PC ALIH MEDIA', amount: 1000000 },
  { id: '5', name: 'FEE NOTARIS', amount: 7000000 },
];

export const DEFAULT_CALCULATION: PpatCalculationRecord = {
  id: '',
  createdAt: new Date().toISOString(),
  title: 'IR BASAULI UMAR LUBIS',
  transactionType: 'AJB',
  certificateType: 'SHM',
  certificateNumber: '89',
  village: 'Mekarwangi',
  nop: '32.06.290.004.008-0148.0',
  landArea: 518,
  landNjopPerM2: 2176000,
  buildingArea: 0,
  buildingNjopPerM2: 0,
  useMarketEstimation: false,
  transactionValue: 1139600000,
  partyCount: '1',
  npoptkp: 80000000,
  pphRate: 2.5,
  adminCosts: DEFAULT_ADMIN_COSTS,
};
