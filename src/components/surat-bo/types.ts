export type HubunganKorporasiType = 'Pengurus' | 'Pemilik Modal' | 'Pemilik Modal Sesungguhnya';

export interface PemberiKuasaData {
  nama: string;
  alamat: string;
  noKtp: string;
  jabatan: string;
  namaPt: string;
}

export interface PenerimaKuasaData {
  nama: string;
  pekerjaan: string;
}

export interface BeneficialOwnerData {
  nama: string;
  alamat: string;
  nik: string;
  npwp: string;
  hubungan: HubunganKorporasiType;
}

export interface DasarBOOption {
  id: string;
  text: string;
}

export interface SuratBoFormData {
  pemberiKuasa: PemberiKuasaData;
  bo: BeneficialOwnerData;
  selectedDasarIds: string[];
  tempat: string;
  tanggal: string; // e.g., "15 September 2026"
}
