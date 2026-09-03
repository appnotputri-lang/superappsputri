import { PPATDocumentCategory } from '../../../../domain/project/Project';

export interface PPATDocTypeConfig {
  id: string;
  title: string;
  category: PPATDocumentCategory;
  shortDesc: string;
  recommendedFor?: string[];
  isAvailableForGeneration: boolean;
  defaultTitle: string;
}

export const PPAT_DOC_TYPES: PPATDocTypeConfig[] = [
  // === KATEGORI SURAT (FOKUS UTAMA) ===
  {
    id: 'kuasa_migrasi',
    title: 'Surat Kuasa Migrasi E-Sertipikat',
    category: 'surat',
    shortDesc: 'Surat kuasa khusus permohonan dan pengurusan alih media (migrasi) sertipikat analog ke sertipikat elektronik di Kantor Pertanahan/BPN.',
    recommendedFor: ['Migrasi E-Sertipikat', 'Alih Media BPN', 'Balik Nama'],
    isAvailableForGeneration: true,
    defaultTitle: 'Surat Kuasa Migrasi E-Sertipikat'
  },
  {
    id: 'kuasa_pengecekan_sertipikat',
    title: 'Surat Kuasa Pengecekan Sertipikat',
    category: 'surat',
    shortDesc: 'Surat kuasa khusus permohonan dan pengurusan pengecekan keabsahan/status sertipikat tanah di Kantor Pertanahan/BPN.',
    recommendedFor: ['Pengecekan BPN', 'Validasi Sertipikat', 'Persiapan AJB'],
    isAvailableForGeneration: true,
    defaultTitle: 'Surat Kuasa Pengecekan Sertipikat'
  },
  {
    id: 'kuasa_znt',
    title: 'Surat Kuasa Pengecekan Zona Nilai Tanah (ZNT)',
    category: 'surat',
    shortDesc: 'Surat kuasa khusus permohonan dan pengurusan Pengecekan Zona Nilai Tanah (ZNT) di Kantor Pertanahan/BPN.',
    recommendedFor: ['Pengecekan ZNT', 'Validasi ZNT BPN', 'Persiapan BPHTB/PBB'],
    isAvailableForGeneration: true,
    defaultTitle: 'Surat Kuasa Pengecekan Zona Nilai Tanah (ZNT)'
  },
  {
    id: 'surat_pernyataan',
    title: 'Surat Pernyataan Pemindahan Hak',
    category: 'surat',
    shortDesc: 'Pernyataan resmi kebenaran data, keabsahan kepemilikan tanah, dan kesediaan menanggung kewajiban pajak/hukum.',
    recommendedFor: ['AJB', 'Hibah', 'APHB', 'Semua Transaksi'],
    isAvailableForGeneration: true,
    defaultTitle: 'Surat Pernyataan Pemindahan Hak'
  },
  {
    id: 'pakta_integritas',
    title: 'Pakta Integritas Pemindahan Hak',
    category: 'surat',
    shortDesc: 'Pakta integritas kepatuhan hukum, jaminan tidak ada pemalsuan warkah, dan bebas sengketa antar para pihak.',
    recommendedFor: ['AJB', 'Hibah', 'APHB', 'Validasi BPHTB'],
    isAvailableForGeneration: true,
    defaultTitle: 'Pakta Integritas Pemindahan Hak'
  },
  {
    id: 'surat_persetujuan_keluarga',
    title: 'Surat Persetujuan Suami / Istri (Keluarga)',
    category: 'surat',
    shortDesc: 'Surat persetujuan resmi dari pasangan sah (suami/istri) untuk pengalihan atau penjualan harta bersama (gono-gini).',
    recommendedFor: ['AJB Perorangan', 'Hibah', 'Harta Bersama'],
    isAvailableForGeneration: true,
    defaultTitle: 'Surat Persetujuan Suami / Istri'
  },
  {
    id: 'surat_kuasa_ppat',
    title: 'Surat Kuasa Pengurusan PPAT & Pendaftaran BPN',
    category: 'surat',
    shortDesc: 'Surat kuasa khusus kepada staf/notaris untuk pengecekan sertipikat, validasi pajak, dan pendaftaran balik nama di BPN.',
    recommendedFor: ['Pengurusan Kantor Pertanahan', 'Balik Nama'],
    isAvailableForGeneration: true,
    defaultTitle: 'Surat Kuasa Pengurusan PPAT & Pendaftaran BPN'
  },
  {
    id: 'surat_pasal_99',
    title: 'Surat Pernyataan Pasal 99 (Batas Maksimum & Bukan Absentee)',
    category: 'surat',
    shortDesc: 'Pernyataan pemenuhan ketentuan Pasal 99 PMNA/KaBPN No. 3/1997 mengenai batas maksimum kepemilikan tanah dan bukan tanah absentee.',
    recommendedFor: ['Pendaftaran BPN', 'Balik Nama AJB', 'Hibah', 'Peralihan Hak'],
    isAvailableForGeneration: true,
    defaultTitle: 'Surat Pernyataan Memenuhi Ketentuan Pasal 99'
  },
  {
    id: 'surat_pasal_100',
    title: 'Surat Pernyataan Pasal 100 (Penguasaan Fisik & Itikad Baik)',
    category: 'surat',
    shortDesc: 'Pernyataan pemenuhan ketentuan Pasal 100 PMNA/KaBPN No. 3/1997 tentang penguasaan fisik bidang tanah secara nyata dan beritikad baik.',
    recommendedFor: ['Pendaftaran BPN', 'Balik Nama', 'Pendaftaran Pertama', 'AJB'],
    isAvailableForGeneration: true,
    defaultTitle: 'Surat Pernyataan Memenuhi Ketentuan Pasal 100'
  },
  {
    id: 'surat_tidak_sengketa',
    title: 'Surat Pernyataan Tanah Tidak Sengketa & Penguasaan Fisik',
    category: 'surat',
    shortDesc: 'Pernyataan penguasaan fisik tanah secara damai dan tidak tersangkut perkara pengadilan, sita jaminan, atau sengketa batas.',
    recommendedFor: ['Pengecekan BPN', 'Balik Nama', 'Pendaftaran Pertama'],
    isAvailableForGeneration: true,
    defaultTitle: 'Surat Pernyataan Tanah Tidak Sengketa'
  },
  {
    id: 'surat_keterangan_nilai_pajak',
    title: 'Surat Pernyataan Nilai Transaksi & Pajak (PPh / BPHTB)',
    category: 'surat',
    shortDesc: 'Keterangan kesepakatan harga transaksi sebenarnya untuk keperluan validasi SKPDKB/SSP PPh Final & SSB BPHTB ke Bapenda.',
    recommendedFor: ['Validasi BPHTB Bapenda', 'Validasi PPh KPP Pratama'],
    isAvailableForGeneration: true,
    defaultTitle: 'Surat Pernyataan Nilai Transaksi Sebenarnya'
  },
  {
    id: 'surat_kustom',
    title: 'Surat Keterangan / Pernyataan Kustom',
    category: 'surat',
    shortDesc: 'Format surat fleksibel untuk keperluan administratif PPAT lainnya dengan kop surat kantor notaris/PPAT.',
    recommendedFor: ['Administrasi Khusus'],
    isAvailableForGeneration: true,
    defaultTitle: 'Surat Keterangan PPAT'
  },

  // === KATEGORI AKTA (TAHAP BERIKUTNYA) ===
  {
    id: 'akta_ajb',
    title: 'Akta Jual Beli (AJB)',
    category: 'akta',
    shortDesc: 'Draf akta otentik pemindahan hak atas tanah dan/atau bangunan karena transaksi jual beli di hadapan PPAT.',
    recommendedFor: ['Transaksi Jual Beli Hak Atas Tanah'],
    isAvailableForGeneration: true,
    defaultTitle: 'Draf Akta Jual Beli (AJB)'
  },
  {
    id: 'akta_hibah',
    title: 'Akta Hibah',
    category: 'akta',
    shortDesc: 'Draf akta otentik pemberian tanah secara cuma-cuma dari pemberi hibah kepada penerima hibah.',
    recommendedFor: ['Pemberian Hibah Keluarga/Pihak Ketiga'],
    isAvailableForGeneration: true,
    defaultTitle: 'Draf Akta Hibah'
  },
  {
    id: 'akta_aphb',
    title: 'Akta Pembagian Hak Bersama (APHB)',
    category: 'akta',
    shortDesc: 'Draf akta pembagian hak atas tanah bersama antara beberapa pemegang hak (misal: ahli waris).',
    recommendedFor: ['Waris & Pembagian Harta Bersama'],
    isAvailableForGeneration: true,
    defaultTitle: 'Draf Akta Pembagian Hak Bersama (APHB)'
  },
  {
    id: 'akta_apht',
    title: 'Akta Pemberian Hak Tanggungan (APHT)',
    category: 'akta',
    shortDesc: 'Draf akta pembebanan hak tanggungan atas tanah sebagai jaminan pelunasan utang/kredit perbankan.',
    recommendedFor: ['Kredit Bank / Jaminan'],
    isAvailableForGeneration: true,
    defaultTitle: 'Draf Akta Pemberian Hak Tanggungan (APHT)'
  },
  {
    id: 'akta_skmht',
    title: 'Surat Kuasa Membebankan Hak Tanggungan (SKMHT)',
    category: 'akta',
    shortDesc: 'Kuasa khusus dari debitor kepada kreditor untuk membebankan hak tanggungan di kemudian hari.',
    recommendedFor: ['Kredit Sindikasi / Pembebanan Berjangka'],
    isAvailableForGeneration: true,
    defaultTitle: 'Draf Surat Kuasa Membebankan Hak Tanggungan (SKMHT)'
  }
];
