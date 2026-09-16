import { DasarBOOption, HubunganKorporasiType, PenerimaKuasaData } from './types';

// DATA PENERIMA KUASA BERSIFAT TETAP & READ-ONLY (TIDAK DAPAT DIUBAH OLEH PENGGUNA)
export const PENERIMA_KUASA_FIXED: Readonly<PenerimaKuasaData> = {
  nama: 'NUKANTINI PUTRI PARINCHA, SH., MKn.',
  pekerjaan: 'Notaris di Kabupaten Bandung Barat'
} as const;

export const HUBUNGAN_KORPORASI_OPTIONS: { id: HubunganKorporasiType; label: string; badge: string; desc: string }[] = [
  {
    id: 'Pengurus',
    label: 'Pengurus',
    badge: 'Direksi / Komisaris',
    desc: 'Menjabat dalam kepengurusan perseroan yang berwenang mengambil keputusan'
  },
  {
    id: 'Pemilik Modal',
    label: 'Pemilik Modal',
    badge: 'Pemegang Saham Tercatat',
    desc: 'Memiliki porsi saham atau modal tercatat dalam anggaran dasar perseroan'
  },
  {
    id: 'Pemilik Modal Sesungguhnya',
    label: 'Pemilik Modal Sesungguhnya',
    badge: 'Ultimate Beneficial Owner',
    desc: 'Pemilik dana atau pengendali sesungguhnya atas perseroan terbatas'
  }
];

export const DASAR_GROUP_123 = ['dasar_1', 'dasar_2', 'dasar_3'] as const;

export const DASAR_BO_OPTIONS: DasarBOOption[] = [
  {
    id: 'dasar_1',
    text: 'Memiliki saham lebih dari 25% (dua puluh lima persen) pada perseroan terbatas sebagaimana tercantum dalam anggaran dasar;'
  },
  {
    id: 'dasar_2',
    text: 'Memiliki hak suara lebih dari 25% (dua puluh lima persen) pada perseroan terbatas sebagaimana tercantum dalam anggaran dasar;'
  },
  {
    id: 'dasar_3',
    text: 'Menerima keuntungan atau laba lebih dari 25% (dua puluh lima persen) dari keuntungan atau laba yang diperoleh perseroan terbatas per tahun;'
  },
  {
    id: 'dasar_4',
    text: 'Memiliki kewenangan untuk mengangkat, menggantikan, atau memberhentikan anggota direksi dan anggota dewan Komisaris;'
  },
  {
    id: 'dasar_5',
    text: 'Memiliki kewenangan atau kekuasaan untuk mempengaruhi atau mengendalikan perseroan terbatas tanpa harus mendapat otorisasi dari pihak manapun;'
  },
  {
    id: 'dasar_6',
    text: 'Menerima manfaat dari perseroan terbatas;'
  },
  {
    id: 'dasar_7',
    text: 'Merupakan pemilik sebenarnya dari dana atas kepemilikan saham perseroan terbatas;'
  }
];

export const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function getTodayFormalIndonesianDate(): string {
  const now = new Date();
  const day = now.getDate();
  const month = MONTH_NAMES_ID[now.getMonth()];
  const year = now.getFullYear();
  return `${day} ${month} ${year}`;
}
