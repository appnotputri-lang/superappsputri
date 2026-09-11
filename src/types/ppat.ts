export type HolidayType = 'NATIONAL' | 'COLLECTIVE_LEAVE' | 'REGIONAL' | 'OFFICE_HOLIDAY' | 'OTHER';

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: HolidayType;
  year: number;
  source: 'OFFICIAL' | 'MANUAL';
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type PpatLegalActType = 
  | 'JUAL_BELI' 
  | 'HIBAH' 
  | 'APHT' 
  | 'SKMHT' 
  | 'APHB' 
  | 'TUKAR_MENUKAR' 
  | 'INBRENG' 
  | 'HAK_TANGGUNGAN' 
  | 'LAINNYA';

export interface PpatDeed {
  id: string;
  orderNumber?: string;
  deedNumber: string;
  date: string; // YYYY-MM-DD
  legalActType: string; // e.g. "Jual Beli", "Hibah", "APHT", etc.
  
  // Pihak yang Mengalihkan / Memberikan (Penjual / Debitur / Pemberi Hibah)
  grantorName: string;
  grantorAddress?: string;
  grantorNpwp?: string;

  // Pihak yang Menerima (Pembeli / Kreditur / Penerima Hibah)
  transfereeName: string;
  transfereeAddress?: string;
  transfereeNpwp?: string;

  // Detail Tanah / Objek
  rightTypeAndNumber: string; // e.g. "Hak Milik No. 1234/Condongcatur"
  landLocation: string;       // e.g. "Condongcatur, Depok, Sleman"
  landArea: number | string;  // Luas Tanah (m2)
  buildingArea?: number | string; // Luas Bangunan (m2)

  // Nilai Transaksi & SPPT PBB
  transactionValue: number;   // Harga Transaksi / Nilai Pengalihan (Rp)
  spptPbbNopYear?: string;    // NOP & Tahun Pajak (e.g. "34.04.010.001.002-0003.0 (2026)")
  spptPbbNjop?: number;       // NJOP (Rp)

  // Pajak PPh (SSP)
  sspDate?: string;           // Tanggal SSP
  sspAmount?: number;         // Nominal SSP PPh (Rp)

  // Pajak BPHTB (SSB)
  ssbDate?: string;           // Tanggal SSB / BPHTB
  ssbAmount?: number;         // Nominal SSB / BPHTB (Rp)

  notes?: string;             // Keterangan
  createdAt?: string;
  updatedAt?: string;
}

export interface PpatProfileConfig {
  id?: string;
  ppatName: string;
  skNumber?: string;
  workingArea: string;
  officeAddress: string;
  city: string;
  phone?: string;
  email?: string;
  nip?: string;
  npwp?: string;
  reportRecipients?: string;
  updatedAt?: string;
}

export const DEFAULT_PPAT_PROFILE: PpatProfileConfig = {
  ppatName: 'R.A. NUKANTINI PUTRI PARINCHA, SH, M.Kn',
  skNumber: '',
  workingArea: 'KABUPATEN BANDUNG BARAT',
  officeAddress: 'Komp. PPR-ITB Kav. F-5 Dago Bengkok, Lembang',
  city: 'Bandung Barat',
  phone: '0812-3456-7890',
  npwp: '3217015610760002',
  reportRecipients: [
    '1) Kepala Kantor Wilayah BPN Propinsi Jawa Barat',
    '2) Kepala Kantor Pertanahan Kabupaten Bandung Barat',
    '3) Kepala Kantor Badan Pengelolaan Keuangan Daerah Kab. Bandung Barat',
    '4) Kepala Kantor Pelayanan Pajak Pratama Cimahi'
  ].join('\n')
};

export const LEGAL_ACT_TYPES = [
  'Jual Beli',
  'Tukar Menukar',
  'Hibah',
  'Pemasukan ke Dalam Perusahaan (Inbreng)',
  'Pembagian Hak Bersama (APHB)',
  'Pemberian Hak Tanggungan (APHT)',
  'Surat Kuasa Membebankan Hak Tanggungan (SKMHT)',
  'Pemberian Hak Pakai / HGB di atas Hak Milik',
  'Lainnya'
] as const;

export interface DailyReportRow {
  date?: string;              // YYYY-MM-DD
  dateStr?: string;           // YYYY-MM-DD
  dayNumber: number;          // 1 .. 31
  dayName?: string;           // Senin, Selasa, dst.
  isWeekend: boolean;
  isHoliday: boolean;
  holidayInfo?: Holiday;
  isNihil: boolean;           // True jika hari kerja tanpa akta
  deeds: PpatDeed[];          // Daftar akta pada tanggal ini
}
