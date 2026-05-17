export type AktaPerubahan = {
  id: string;
  tglRapat: string; 
  nomorRapat: string;
  notaris: string;
  notarisTitle?: string;
  kedudukanNotaris: string;
  skPerubahan: string;
  tglSKPerubahan: string; 
  jenisSK: 'SK' | 'SP' | 'Penerimaan Pemberitahuan';
};

export const initialData = {
  // Data Akta
  nomorAkta: '05',
  tanggalAkta: '2026-05-08',
  jamAkta: '13:30',
  notarisNama: 'NUKANTINI PUTRI PARINCHA, Sarjana Hukum, Magister Kenotariatan',
  notarisKedudukan: 'Kabupaten Bandung Barat',

  // Data PT
  namaPT: 'PT AHLAN KHIDMAH TIJARAH',
  kedudukanPT: 'Jakarta Selatan',
  
  tglPendirianPT: '2023-09-04',
  nomorPendirian: '24',
  notarisPT: 'NURLISA UKE DESY, Sarjana Hukum, Magister Kenotariatan',
  notarisPTTitle: 'Sarjana Hukum, Magister Kenotariatan',
  kedudukanNotarisPT: 'Kabupaten Bogor',
  skPengesahan: 'AHU-0066369.AH.01.01.Tahun 2023',
  tglSKPengesahan: '2023-09-05',

  aktaPerubahan: [
    {
      id: '1',
      tglRapat: '2023-10-02',
      nomorRapat: '15',
      notaris: 'NURLISA UKE DESY, Sarjana Hukum, Magister Kenotariatan',
      notarisTitle: 'Sarjana Hukum, Magister Kenotariatan',
      kedudukanNotaris: 'Kabupaten Bogor',
      skPerubahan: 'AHU-AH.01.09-0169479',
      tglSKPerubahan: '2023-10-03',
      jenisSK: 'Penerimaan Pemberitahuan' as const
    }
  ],

  jumlahSahamPT: '127500',
  jumlahSahamHibah: '127500',
  nilaiNominalSaham: '1000', // Example
  hargaJualSaham: '3125000', // Only for Jual Beli
  tipeAkta: 'Hibah', // 'Hibah' or 'Jual Beli'

  tglSirkuler: '2026-05-06',
  namaPengadilan: 'Pengadilan Negeri Bale Bandung di Baleendah',

  // Pihak 1 (Pemberi Hibah)
  pihak1Gelar: 'Nyonya',
  pihak1Nama: 'R IRA WIDYASARI',
  pihak1TempatLahir: 'Jakarta',
  pihak1TanggalLahir: '1972-06-23',
  pihak1Pekerjaan: 'Wiraswasta',
  pihak1AlamatJalan: 'Jalan Flamboyan Nomor 1 Kodam',
  pihak1RT: '001',
  pihak1RW: '006',
  pihak1Provinsi: 'DKI JAKARTA',
  pihak1Kota: 'JAKARTA BARAT',
  pihak1Kecamatan: 'KEBON JERUK',
  pihak1Kelurahan: 'KEBON JERUK',
  pihak1NIK: '1171056306720001',

  // Pasangan Pihak 1
  pihak1StatusPersetujuan: 'Suami', // Suami, Istri, Tidak Ada
  suamiAlamatSama: true,
  suamiNama: 'FACHRURRAZI',
  suamiTempatLahir: 'Kota Bakti',
  suamiTanggalLahir: '1980-11-27',
  suamiPekerjaan: 'Wiraswasta',
  suamiAlamatJalan: 'Jalan Flamboyan Nomor 1 Kodam',
  suamiRT: '001',
  suamiRW: '006',
  suamiProvinsi: 'DKI JAKARTA',
  suamiKota: 'JAKARTA BARAT',
  suamiKecamatan: 'KEBON JERUK',
  suamiKelurahan: 'KEBON JERUK',
  suamiNIK: '117105271180002',
  tglPersetujuanSuami: '2026-05-06',

  // Pihak 2 (Penerima Hibah)
  pihak2Gelar: 'Tuan',
  pihak2Nama: 'MUHAMMAD RAFA ALFAIZ',
  pihak2TempatLahir: 'Jakarta',
  pihak2TanggalLahir: '2008-12-06',
  pihak2Pekerjaan: 'Pelajar/Mahasiswa',
  pihak2AlamatJalan: 'Jalan Flamboyan Nomor 1 Kodam',
  pihak2RT: '001',
  pihak2RW: '006',
  pihak2Provinsi: 'DKI JAKARTA',
  pihak2Kota: 'JAKARTA BARAT',
  pihak2Kecamatan: 'KEBON JERUK',
  pihak2Kelurahan: 'KEBON JERUK',
  pihak2NIK: '1171050612080002',

  // Saksi
  saksi1Nama: 'Nendi Suhendi',
  saksi1Lahir: 'Bandung, pada tanggal limabelas Juli seribu sembilan ratus sembilan puluh satu (15-07-1991)',
  saksi1Alamat: 'Jalan Sukaresmi Nomor 12, Rukun Tetangga 005, Rukun Warga 005, Kecamatan Lembang, Desa Mekarwangi',
  saksi1NIK: '3217011507910016',
  saksi2Nama: 'Siti Nur Azizah',
  saksi2Lahir: 'Bandung, pada tanggal tujuh belas Desember seribu sembilan ratus sembilan puluh sembilan (17-12-1999)',
  saksi2Alamat: 'Kabupaten Bandung, Jalan Lembah Pakar Timur II Kampung Sekebuluh Rukun Tetangga 001, Rukun Warga 004, Desa Ciburial, Kecamatan Cimenyan',
  saksi2NIK: '3204065712990001'
};

export type FormData = typeof initialData;
