import { Address } from '../../../types';

export interface LeaseParty {
  id: string;
  role: 'Pihak Pertama' | 'Pihak Kedua' | 'Pihak Ketiga';
  clientId: string; // Ref to CompanyProfile
  name: string;
  clientType: string;
  alamat: string;
  nik: string;
  npwp: string;
  maritalStatus: 'Belum Kawin' | 'Kawin' | 'Cerai Hidup' | 'Cerai Mati' | '';
  position: string; // Jabatan
  authorityBasis: string; // Dasar Kewenangan
  representative: string; // Representatif
  spouseApproval: string; // Persetujuan Pasangan (jika ada)
}

export interface LeaseObject {
  objectType: string; // Jenis Obyek (e.g., Bangunan, Ruko, Tanah, Rumah, Gudang)
  objectName: string; // Nama Obyek
  alamat: string;
  landArea: string; // Luas Tanah (m2)
  buildingArea: string; // Luas Bangunan (m2)
  shm: string; // SHM Nomor
  nib: string; // NIB
  surveyCertificate: string; // Surat Ukur
  imb: string; // IMB/PBG
  spptPbb: string; // SPPT PBB
  ownerName: string; // Pemilik
  attachments: string[]; // Lampiran
}

export interface LeasePayment {
  id: string;
  amount: number;
  paymentDate: string; // Tanggal Pembayaran
  paymentType: 'Deposit' | 'Cicilan' | 'Pelunasan' | 'Uang Muka' | string;
  description: string;
}

export interface LeaseProjectData {
  id: string; // Same as projectId
  projectId: string;
  createdAt: string;
  updatedAt: string;
  
  // Para Pihak
  parties: LeaseParty[];
  
  // Obyek Sewa
  leaseObject: LeaseObject;
  
  // Pasal 2 - Jangka Waktu
  startDate: string;
  endDate: string;
  durationYears: number;
  durationMonths: number;
  durationDays: number;
  
  // Pasal 3 - Harga
  annualPrice: number;
  totalPrice: number;
  
  // Pasal 4 - Pembayaran
  depositAmount: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountOwner: string;
  notaryFeeResponsible: 'Pihak Pertama' | 'Pihak Kedua' | 'Kedua Belah Pihak' | string;
  payments: LeasePayment[];
  
  // Pasal 5 - Serah Terima
  handoverDate: string;
  buildingCondition: string;
  handoverNotes: string;
  
  // Pasal 6 - Kewajiban Pihak Pertama
  firstPartyObligations: string[];
  
  // Pasal 7 - Kewajiban Pihak Kedua
  secondPartyObligations: string[];
  
  // Pasal 8 - Pemeliharaan
  maintenanceClauses: string[];
  
  // Pasal 9 - Pengalihan Hak
  allowTransfer: boolean;
  transferConditions: string;
  
  // Pasal 10 - Pemutusan
  terminationReasons: string[];
  
  // Pasal 11 - Pajak
  pphAmount: number;
  pphResponsible: 'Pihak Pertama' | 'Pihak Kedua' | string;
  pbbResponsible: 'Pihak Pertama' | 'Pihak Kedua' | string;
  otherTaxes: string;
  
  // Pasal 12 - Hak Opsi
  hasOptionRight: boolean;
  optionRightSettings: string;
  
  // Pasal 13 - Penyerahan Kembali
  returnConditions: string;
  
  // Pasal 14 - Denda
  fineAmountPerDay: number;
  fineMaxAmount: number;
  delayDurationLimitDays: number;
  
  // Pasal 15 - Force Majeure
  useForceMajeure: boolean;
  forceMajeureEvents: string[];
  
  // Pasal 16 - Ketentuan Lain
  additionalClauses: string[]; // List of clauses
  
  // Pasal 17 - Penyelesaian Perselisihan
  disputeResolution: 'Musyawarah' | 'Pengadilan Negeri' | 'Arbitrase' | string;
}
