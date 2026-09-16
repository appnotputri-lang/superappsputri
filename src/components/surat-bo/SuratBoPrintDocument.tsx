import React from 'react';
import { DASAR_BO_OPTIONS, PENERIMA_KUASA_FIXED } from './constants';
import { SuratBoFormData } from './types';

interface SuratBoPrintDocumentProps {
  data: SuratBoFormData;
  className?: string;
  id?: string;
}

export const SuratBoPrintDocument: React.FC<SuratBoPrintDocumentProps> = ({
  data,
  className = '',
  id = 'surat-bo-printable-area'
}) => {
  const { pemberiKuasa, bo, selectedDasarIds, tempat, tanggal } = data;

  // Filter the selected dasar BO items, keeping original legal order
  const activeDasarItems = DASAR_BO_OPTIONS.filter((opt) =>
    selectedDasarIds.includes(opt.id)
  );

  // If none selected, fallback to all or standard
  const displayedDasarItems =
    activeDasarItems.length > 0 ? activeDasarItems : DASAR_BO_OPTIONS;

  // Format Nama PT for the purpose clause
  const cleanPtName = pemberiKuasa.namaPt?.trim() || '.......................';
  const ptDisplayName = cleanPtName.toUpperCase().startsWith('PT')
    ? cleanPtName
    : `PT. ${cleanPtName}`;

  return (
    <div
      id={id}
      className={`bg-white text-black leading-relaxed font-serif text-[13.5px] print:text-[12pt] print:leading-normal print:p-0 ${className}`}
      style={{
        fontFamily: '"Times New Roman", Times, "Libre Baskerville", serif',
        color: '#000000',
        lineHeight: '1.65'
      }}
    >
      {/* JUDUL DOKUMEN */}
      <div className="text-center mb-6">
        <h1 className="text-lg print:text-[15pt] font-bold tracking-wider uppercase underline underline-offset-4 decoration-1">
          SURAT KUASA
        </h1>
      </div>

      {/* PEMBUKA */}
      <div className="space-y-1 mb-4">
        <p>Saya yang bertanda tangan di bawah ini :</p>
        <div className="pt-1.5 pl-2 sm:pl-4 space-y-1">
          <div className="grid grid-cols-[110px_16px_1fr] print:grid-cols-[100px_16px_1fr] items-start">
            <span>Nama</span>
            <span>:</span>
            <span className="font-semibold uppercase tracking-wide">
              {pemberiKuasa.nama || '..........................................................'}
            </span>
          </div>
          <div className="grid grid-cols-[110px_16px_1fr] print:grid-cols-[100px_16px_1fr] items-start">
            <span>Alamat</span>
            <span>:</span>
            <span>
              {pemberiKuasa.alamat || '..........................................................'}
            </span>
          </div>
          <div className="grid grid-cols-[110px_16px_1fr] print:grid-cols-[100px_16px_1fr] items-start">
            <span>No. KTP</span>
            <span>:</span>
            <span className="tracking-wider">
              {pemberiKuasa.noKtp || '..........................................................'}
            </span>
          </div>
          <div className="grid grid-cols-[110px_16px_1fr] print:grid-cols-[100px_16px_1fr] items-start">
            <span>Jabatan</span>
            <span>:</span>
            <span>
              {pemberiKuasa.jabatan || `Direktur “${ptDisplayName}”`}
            </span>
          </div>
        </div>
      </div>

      {/* PENERIMA KUASA (TETAP & READ-ONLY) */}
      <div className="space-y-1 mb-4">
        <p>Dengan ini menyetujui dan memberikan kuasa kepada :</p>
        <div className="pt-1.5 pl-2 sm:pl-4 space-y-1">
          <div className="grid grid-cols-[110px_16px_1fr] print:grid-cols-[100px_16px_1fr] items-start">
            <span>Nama</span>
            <span>:</span>
            <span className="font-bold tracking-wide">
              {PENERIMA_KUASA_FIXED.nama}
            </span>
          </div>
          <div className="grid grid-cols-[110px_16px_1fr] print:grid-cols-[100px_16px_1fr] items-start">
            <span>Pekerjaan</span>
            <span>:</span>
            <span>
              {PENERIMA_KUASA_FIXED.pekerjaan}
            </span>
          </div>
        </div>
      </div>

      {/* TUJUAN KUASA & DATA BENEFICIAL OWNER */}
      <div className="space-y-2 mb-4 text-justify">
        <p>
          Untuk mengurus pelaporan beneficial owner {ptDisplayName} di{' '}
          <span className="font-mono text-[13px] print:text-[11pt]">https://bo.ahu.go.id</span>, dengan data sebagai berikut:
        </p>

        <div className="pt-1 pl-2 sm:pl-4 space-y-1">
          <div className="grid grid-cols-[110px_16px_1fr] print:grid-cols-[100px_16px_1fr] items-start">
            <span>Nama</span>
            <span>:</span>
            <span className="font-semibold uppercase tracking-wide">
              {bo.nama || '..........................................................'}
            </span>
          </div>
          <div className="grid grid-cols-[110px_16px_1fr] print:grid-cols-[100px_16px_1fr] items-start">
            <span>Alamat</span>
            <span>:</span>
            <span>
              {bo.alamat || '..........................................................'}
            </span>
          </div>
          <div className="grid grid-cols-[110px_16px_1fr] print:grid-cols-[100px_16px_1fr] items-start">
            <span>NIK</span>
            <span>:</span>
            <span className="tracking-wider">
              {bo.nik || '..........................................................'}
            </span>
          </div>
          <div className="grid grid-cols-[110px_16px_1fr] print:grid-cols-[100px_16px_1fr] items-start">
            <span>NPWP</span>
            <span>:</span>
            <span className="tracking-wider">
              {bo.npwp || '..........................................................'}
            </span>
          </div>
        </div>
      </div>

      {/* HUBUNGAN KORPORASI DENGAN PEMILIK MANFAAT */}
      <div className="mb-3 text-justify">
        <p>
          Bahwa hubungan Antara Korporasi dengan Pemilik Manfaat adalah{' '}
          <span className="font-semibold underline decoration-1 underline-offset-2">
            {bo.hubungan || 'Pengurus/Pemilik Modal/Pemilik Modal sesungguhnya'}
          </span>
          *.
        </p>
      </div>

      {/* DASAR BENEFICIAL OWNER */}
      <div className="mb-4">
        <p className="mb-1.5 font-medium">
          sebagai Beneficial Owner Berdasarkan :
        </p>
        <ul className="space-y-1 pl-4 sm:pl-6 list-none text-justify">
          {displayedDasarItems.map((item) => (
            <li key={item.id} className="relative pl-4">
              <span className="absolute left-0 top-0 text-black">•</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* PENUTUP */}
      <div className="mb-8 text-justify">
        <p>
          Demikian surat kuasa ini dibuat dalam keadaaan sadar dan sehat, tanpa adanya tekanan maupun paksaan dari pihak manapun, dan untuk dipergunakan sebagaimana mestinya.
        </p>
      </div>

      {/* TITIMANGSA & TANDA TANGAN */}
      <div className="pt-2">
        {/* Tempat & Tanggal */}
        <div className="text-right pr-4 sm:pr-8 mb-4">
          <p>
            {tempat || 'Bandung'}, {tanggal}
          </p>
        </div>

        {/* Kolom Tanda Tangan */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="font-medium mb-16 print:mb-20">Penerima Kuasa</p>
            <p className="font-bold underline underline-offset-2">
              ({PENERIMA_KUASA_FIXED.nama})
            </p>
          </div>

          <div>
            <p className="font-medium mb-4">Pemberi Kuasa</p>
            {/* Box Materai placeholder untuk formalitas */}
            <div className="h-12 flex items-center justify-center">
              <span className="text-[10px] text-slate-400 border border-dashed border-slate-300 px-2 py-0.5 rounded print:text-[8pt] print:border-slate-400">
                Materai Rp 10.000
              </span>
            </div>
            <p className="font-bold underline underline-offset-2">
              ({pemberiKuasa.nama ? pemberiKuasa.nama.toUpperCase() : '..................................................'})
            </p>
          </div>
        </div>
      </div>

      {/* CATATAN KAKI */}
      <div className="mt-8 pt-4 border-t border-slate-200 print:border-slate-300 text-[11px] print:text-[9.5pt] text-slate-600 print:text-black">
        <p className="font-medium">Catatan:</p>
        <p>*pilih salah satu sesuai warna</p>
      </div>
    </div>
  );
};
