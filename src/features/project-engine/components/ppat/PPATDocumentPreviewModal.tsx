import React, { useState } from 'react';
import { X, Printer, Download, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Project, PPATData, PPATDocumentItem, PPATParty } from '../../../../domain/project/Project';
import { generateAnyPPATDocx, terbilang } from './generatePPATDocx';
import { formatFullPartyAddress, isCityKota, formatCleanVillage, formatCleanDistrict } from './ppatAddressUtils';

interface PPATDocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentItem: PPATDocumentItem;
  project: Project;
  ppatData: PPATData;
}

export const PPATDocumentPreviewModal: React.FC<PPATDocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  documentItem,
  project,
  ppatData
}) => {
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const firstParties: PPATParty[] = ppatData.firstParties && ppatData.firstParties.length > 0
    ? ppatData.firstParties
    : [{ id: '', name: '', nik: '', address: '', job: '', phone: '' }];
  const secondParties: PPATParty[] = ppatData.secondParties && ppatData.secondParties.length > 0
    ? ppatData.secondParties
    : [{ id: '', name: '', nik: '', address: '', job: '', phone: '' }];

  const firstParty = firstParties[0];
  const secondParty = secondParties[0];
  const obj = ppatData.object || {};
  const transactionType = ppatData.transactionType || project.projectType || 'Jual Beli';

  const formatDateIndo = (dateStr?: string) => {
    if (!dateStr) {
      return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatRupiah = (val?: number) => {
    if (!val) return 'Rp 0';
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  const handleDownloadDocx = async () => {
    setDownloading(true);
    try {
      await generateAnyPPATDocx(documentItem, project, ppatData);
    } catch (err) {
      console.error('Download error:', err);
      alert('Gagal mengunduh file Word.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const letterDate = documentItem.letterDate || new Date().toISOString();
  const letterLocation = documentItem.letterLocation || 'Kabupaten Bandung Barat';
  const isPaktaIntegritas = documentItem.documentType === 'pakta_integritas';
  const transferType = documentItem.specificData?.transferType || transactionType || 'Jual Beli';
  const statusTransaksi = documentItem.specificData?.transactionStatus || documentItem.specificData?.transferStatus || obj.transactionStatus || 'telah';
  const transactionVal = Number(documentItem.specificData?.agreedPrice || obj.transactionValue || 0);

  // Klasifikasi Varian Pakta Integritas
  const tTypeLower = transferType.toLowerCase();
  let paktaVariant: 'jual_beli' | 'tukar_hibah' | 'waris' | 'hibah_wasiat' | 'putusan_hakim' | 'hak_baru' | 'lelang' = 'jual_beli';
  if (tTypeLower.includes('hibah wasiat')) {
    paktaVariant = 'hibah_wasiat';
  } else if (tTypeLower.includes('waris')) {
    paktaVariant = 'waris';
  } else if (tTypeLower.includes('putusan') || tTypeLower.includes('hakim')) {
    paktaVariant = 'putusan_hakim';
  } else if (tTypeLower.includes('hak baru') || tTypeLower.includes('pelepasan hak')) {
    paktaVariant = 'hak_baru';
  } else if (tTypeLower.includes('lelang')) {
    paktaVariant = 'lelang';
  } else if (
    tTypeLower.includes('hibah') ||
    tTypeLower.includes('tukar') ||
    tTypeLower.includes('inbreng') ||
    tTypeLower.includes('perseroan') ||
    tTypeLower.includes('hadiah') ||
    tTypeLower.includes('pemisahan') ||
    tTypeLower.includes('penggabungan') ||
    tTypeLower.includes('peleburan') ||
    tTypeLower.includes('pemekaran')
  ) {
    paktaVariant = 'tukar_hibah';
  } else {
    paktaVariant = 'jual_beli';
  }

  const isDualParty = paktaVariant === 'jual_beli' || paktaVariant === 'tukar_hibah';
  const labelP1 = paktaVariant === 'tukar_hibah' ? 'Pelepas Hak' : 'Penjual';
  const labelP2 = paktaVariant === 'tukar_hibah' ? 'Penerima Hak' : 'Pembeli';
  const isPerolehanLabel = paktaVariant === 'tukar_hibah' || paktaVariant === 'waris' || paktaVariant === 'hibah_wasiat';
  const labelTanggal = isPerolehanLabel ? 'Tanggal Perolehan' : 'Tanggal Transaksi';
  const labelNilai = paktaVariant === 'jual_beli' ? 'Nilai Transaksi' : 'Pengakuan Nilai Perolehan';
  const statusWord = statusTransaksi === 'akan' ? 'akan' : 'telah';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:fixed-none">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:w-full print:rounded-none">
        {/* Header - Hidden on print */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide text-slate-100">
                Pratinjau Dokumen: {documentItem.title}
              </h3>
              <p className="text-xs text-slate-400">
                {isPaktaIntegritas ? 'Format Resmi Pakta Integritas (Perda KBB No. 1/2024)' : 'Format Resmi Kantor PPAT'} • Status: <span className="text-amber-400 font-semibold">{documentItem.status.toUpperCase()}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Dokumen
            </button>
            <button
              onClick={handleDownloadDocx}
              disabled={downloading}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              {downloading ? 'Mengunduh...' : 'Unduh Word (.docx)'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Container (A4 layout styling) */}
        <div className="p-6 md:p-10 overflow-y-auto bg-slate-100 flex justify-center print:bg-white print:p-0">
          <div className="bg-white w-full max-w-[210mm] min-h-[297mm] p-10 md:p-14 shadow-lg rounded-sm text-slate-900 font-serif text-[13px] leading-relaxed border border-slate-200 print:shadow-none print:border-none print:p-0 print:min-h-0">
            
            {/* === TAMPILAN KHUSUS: PAKTA INTEGRITAS SESUAI TEMPLATE PDF RESMI === */}
            {isPaktaIntegritas ? (
              <div className="space-y-4">
                {/* Header Pakta Integritas */}
                <div className="text-center mb-6">
                  <h1 className="text-base md:text-lg font-bold tracking-wide uppercase text-slate-900">
                    PAKTA INTEGRITAS
                  </h1>
                  
                  {paktaVariant === 'jual_beli' && (
                    <h2 className="text-sm font-bold tracking-wide uppercase text-slate-900 mt-1 max-w-xl mx-auto">
                      PEMINDAHAN HAK KARENA JUAL BELI
                    </h2>
                  )}

                  {paktaVariant === 'tukar_hibah' && (
                    <div className="mt-1 max-w-2xl mx-auto">
                      <h2 className="text-sm font-bold tracking-wide uppercase text-slate-900">
                        PEMINDAHAN HAK KARENA
                      </h2>
                      <h3 className="text-xs md:text-sm font-bold tracking-wide uppercase text-red-600 mt-0.5 leading-snug">
                        TUKAR-MENUKAR/ HIBAH/ HIBAH WASIAT/ PEMASUKAN DALAM PERSEROAN ATAU BADAN HUKUM LAINNYA/ PEMISAHAN HAK YANG MENGAKIBATKAN PERALIHAN/ PENGGABUNGAN USAHA/ PELEBURAN USAHA/ PEMEKARAN USAHA/ HADIAH
                      </h3>
                      <p className="text-xs font-bold text-red-600 tracking-wider uppercase mt-0.5">
                        (PILIH SALAH SATU)
                      </p>
                    </div>
                  )}

                  {paktaVariant === 'waris' && (
                    <h2 className="text-sm font-bold tracking-wide uppercase text-slate-900 mt-1 max-w-xl mx-auto">
                      PEMINDAHAN HAK KARENA WARIS
                    </h2>
                  )}

                  {paktaVariant === 'hibah_wasiat' && (
                    <h2 className="text-sm font-bold tracking-wide uppercase text-slate-900 mt-1 max-w-xl mx-auto">
                      PEMINDAHAN HAK KARENA HIBAH WASIAT
                    </h2>
                  )}

                  {paktaVariant === 'putusan_hakim' && (
                    <h2 className="text-sm font-bold tracking-wide uppercase text-slate-900 mt-1 max-w-2xl mx-auto">
                      PEMINDAHAN HAK KARENA PELAKSANAAN PUTUSAN HAKIM YANG MEMPUNYAI KEKUATAN HUKUM TETAP
                    </h2>
                  )}

                  {paktaVariant === 'hak_baru' && (
                    <div className="mt-1 max-w-2xl mx-auto">
                      <h2 className="text-xs md:text-sm font-bold tracking-wide uppercase text-red-600 leading-snug">
                        PEMINDAHAN HAK KARENA PEMBERIAN HAK BARU ATAS TANAH SEBAGAI KELANJUTAN DARI PELEPASAN HAK/ PEMBERIAN HAK BARU ATAS TANAH DI LUAR PELEPASAN HAK
                      </h2>
                      <p className="text-xs font-bold text-red-600 tracking-wider uppercase mt-0.5">
                        (PILIH SALAH SATU)
                      </p>
                    </div>
                  )}

                  {paktaVariant === 'lelang' && (
                    <div className="mt-1 max-w-xl mx-auto">
                      <h2 className="text-sm font-bold tracking-wide uppercase text-slate-900">
                        PEMINDAHAN HAK KARENA
                      </h2>
                      <h3 className="text-sm font-bold tracking-wide uppercase text-slate-900 mt-0.5">
                        PENUNJUKAN PEMBELI DALAM LELANG
                      </h3>
                    </div>
                  )}
                </div>

                <p className="text-justify text-[13px]">
                  Sehubungan dengan adanya peralihan hak atas tanah dan/atau bangunan, dengan uraian sebagai berikut:
                </p>

                {/* Section I. Penjual / Pelepas Hak (jika dual party) atau Single list (jika waris/hibah wasiat/dll) */}
                {isDualParty ? (
                  <>
                    <p className="font-bold text-slate-900 text-[13px]">I. {labelP1}</p>
                    <div className="space-y-3">
                      {firstParties.map((p, idx) => (
                        <div key={p.id || idx} className="pl-4 space-y-1">
                          <div className="grid grid-cols-12 gap-1 text-[13px]">
                            <span className="col-span-3 text-slate-800 font-medium">
                              {firstParties.length > 1 ? `${idx + 1}. ` : '1. '}Nama
                            </span>
                            <span className="col-span-9 font-semibold">: {p.name || '............................................................................................................'}</span>
                            
                            <span className="col-span-3 text-slate-800 pl-4 font-medium">NIK</span>
                            <span className="col-span-9">: {p.nik || '............................................................................................................'}</span>
                            
                            <span className="col-span-3 text-slate-800 pl-4 font-medium">Tmpt/Tgl Lahir</span>
                            <span className="col-span-9">
                              : {p.birthPlace && p.birthDate ? `${p.birthPlace} / ${formatDateIndo(p.birthDate)}` : '................................. / ...................................................................'}
                            </span>
                            
                            <span className="col-span-3 text-slate-800 pl-4 font-medium">Alamat</span>
                            <span className="col-span-9">: {formatFullPartyAddress(p) || '............................................................................................................'}</span>
                            
                            <span className="col-span-3 text-slate-800 pl-4 font-medium">No. Tlp</span>
                            <span className="col-span-9">
                              : {p.phone ? <span className="font-semibold">{p.phone}</span> : '............................................................................................................'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Section II. Pembeli / Penerima Hak */}
                    <div className="space-y-3 pt-3">
                      <p className="font-bold text-slate-900 text-[13px]">II. {labelP2}</p>
                      {secondParties.map((p, idx) => (
                        <div key={p.id || idx} className="pl-4 space-y-1">
                          <div className="grid grid-cols-12 gap-1 text-[13px]">
                            <span className="col-span-3 text-slate-800 font-medium">
                              {secondParties.length > 1 ? `${idx + 1}. ` : '1. '}Nama
                            </span>
                            <span className="col-span-9 font-semibold">: {p.name || '............................................................................................................'}</span>
                            
                            <span className="col-span-3 text-slate-800 pl-4 font-medium">NIK</span>
                            <span className="col-span-9">: {p.nik || '............................................................................................................'}</span>
                            
                            <span className="col-span-3 text-slate-800 pl-4 font-medium">Tmpt/Tgl Lahir</span>
                            <span className="col-span-9">
                              : {p.birthPlace && p.birthDate ? `${p.birthPlace} / ${formatDateIndo(p.birthDate)}` : '................................. / ...................................................................'}
                            </span>
                            
                            <span className="col-span-3 text-slate-800 pl-4 font-medium">Alamat</span>
                            <span className="col-span-9">: {formatFullPartyAddress(p) || '............................................................................................................'}</span>
                            
                            <span className="col-span-3 text-slate-800 pl-4 font-medium">No. Tlp</span>
                            <span className="col-span-9">
                              : {p.phone ? <span className="font-semibold">{p.phone}</span> : '............................................................................................................'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    {(secondParties.length > 0 && secondParties[0]?.name ? secondParties : firstParties).map((p, idx) => (
                      <div key={p.id || idx} className="pl-4 space-y-1">
                        <div className="grid grid-cols-12 gap-1 text-[13px]">
                          <span className="col-span-3 text-slate-800 font-medium">
                            {(secondParties.length > 0 && secondParties[0]?.name ? secondParties : firstParties).length > 1 ? `${idx + 1}. ` : '1. '}Nama
                          </span>
                          <span className="col-span-9 font-semibold">: {p.name || '............................................................................................................'}</span>
                          
                          <span className="col-span-3 text-slate-800 pl-4 font-medium">NIK</span>
                          <span className="col-span-9">: {p.nik || '............................................................................................................'}</span>
                          
                          <span className="col-span-3 text-slate-800 pl-4 font-medium">Tmpt/Tgl Lahir</span>
                          <span className="col-span-9">
                            : {p.birthPlace && p.birthDate ? `${p.birthPlace} / ${formatDateIndo(p.birthDate)}` : '................................. / ...................................................................'}
                          </span>
                          
                          <span className="col-span-3 text-slate-800 pl-4 font-medium">Alamat</span>
                          <span className="col-span-9">: {formatFullPartyAddress(p) || '............................................................................................................'}</span>
                          
                          <span className="col-span-3 text-slate-800 pl-4 font-medium">No. Tlp</span>
                          <span className="col-span-9">
                            : {p.phone ? <span className="font-semibold">{p.phone}</span> : '............................................................................................................'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Uraian Transaksi */}
                <div className="pt-2">
                  <div className="text-justify text-[13px]">
                    {paktaVariant === 'jual_beli' && (
                      <p>
                        Kami {statusWord} melakukan transaksi jual beli, dengan uraian sebagai berikut:
                      </p>
                    )}
                    {paktaVariant === 'tukar_hibah' && (
                      <p>
                        Kami {statusWord} melakukan pemindahan hak karena Tukar-Menukar/ Hibah/ Hibah Wasiat/ Pemasukan Dalam Perseroan Atau Badan Hukum Lainnya/ Pemisahan Hak Yang Mengakibatkan Peralihan/ Penggabungan Usaha/ Peleburan Usaha/ Pemekaran Usaha/ Hadiah, dengan uraian sebagai berikut:
                      </p>
                    )}
                    {paktaVariant === 'waris' && (
                      <p>
                        Saya/Kami {statusWord} melakukan pemindahan hak karena Waris, dengan uraian sebagai berikut:
                      </p>
                    )}
                    {paktaVariant === 'hibah_wasiat' && (
                      <p>
                        Saya/Kami {statusWord} melakukan pemindahan hak karena Hibah Wasiat, dengan uraian sebagai berikut:
                      </p>
                    )}
                    {paktaVariant === 'putusan_hakim' && (
                      <p>
                        Saya/Kami {statusWord} melakukan pemindahan hak karena Pelaksanaan Putusan Hakim Yang Mempunyai Kekuatan Hukum Tetap, dengan uraian sebagai berikut:
                      </p>
                    )}
                    {paktaVariant === 'hak_baru' && (
                      <p>
                        Saya/Kami {statusWord} melakukan pemindahan hak karena Pemberian Hak Baru Atas Tanah Sebagai Kelanjutan Dari Pelepasan Hak/ Pemberian Hak Baru Atas Tanah Di Luar Pelepasan Hak, dengan uraian sebagai berikut:
                      </p>
                    )}
                    {paktaVariant === 'lelang' && (
                      <p>
                        Saya/Kami {statusWord} melakukan pemindahan hak karena Penunjukan Pembeli Dalam Lelang, dengan uraian sebagai berikut:
                      </p>
                    )}
                  </div>
                  
                  <div className="mt-2 space-y-1 pl-4 text-[13px]">
                    <div className="grid grid-cols-12 gap-1">
                      <span className="col-span-5 text-slate-800">Nomor Objek Pajak (NOP)</span>
                      <span className="col-span-7">: {obj.nop || '.........................................................................'}</span>

                      <span className="col-span-5 text-slate-800">Dalam SPPT PBB tertulis atas nama</span>
                      <span className="col-span-7">: {obj.spptName || '.........................................................................'}</span>

                      <span className="col-span-5 text-slate-800">Letak Tanah dan/atau Bangunan</span>
                      <span className="col-span-7">: {obj.location || '.........................................................................'}</span>

                      <span className="col-span-5 text-slate-800 pl-6">RT/RW</span>
                      <span className="col-span-7">: {obj.rt || obj.rw ? `${obj.rt || '-'}/${obj.rw || '-'}` : '.....................................................'}</span>

                      <span className="col-span-5 text-slate-800 pl-6">{isCityKota(obj.city) ? 'Kelurahan' : 'Desa'}</span>
                      <span className="col-span-7">: {formatCleanVillage(obj.village) || '.....................................................'}</span>

                      <span className="col-span-5 text-slate-800 pl-6">Kecamatan</span>
                      <span className="col-span-7">: {formatCleanDistrict(obj.district) || '.....................................................'}</span>

                      <span className="col-span-5 text-slate-800">Dokumen Kepemilikan</span>
                      <span className="col-span-7">: {obj.certificateNumber ? `${obj.certificateType || 'SHM'} No. ${obj.certificateNumber}` : '.........................................................................'}</span>

                      <span className="col-span-5 text-slate-800">Luas Tanah</span>
                      <span className="col-span-7">: {(obj.landArea !== undefined && obj.landArea !== null && obj.landArea !== 0 && String(obj.landArea).trim() !== '') ? `${obj.landArea} m²` : '-'}</span>

                      <span className="col-span-5 text-slate-800">Luas Bangunan</span>
                      <span className="col-span-7">: {(obj.buildingArea !== undefined && obj.buildingArea !== null && obj.buildingArea !== 0 && String(obj.buildingArea).trim() !== '') ? `${obj.buildingArea} m²` : '-'}</span>

                      <span className="col-span-5 text-slate-800">Nilai NJOP</span>
                      <span className="col-span-7">: {obj.njop ? formatRupiah(obj.njop) : '.........................................................................'}</span>

                      <span className="col-span-5 text-slate-800">{labelTanggal}</span>
                      <span className="col-span-7">: {obj.transactionDate ? formatDateIndo(obj.transactionDate) : '.........................................................................'}</span>

                      <span className="col-span-5 text-slate-800">{labelNilai}</span>
                      <span className="col-span-7">: {transactionVal ? formatRupiah(transactionVal) : '.........................................................................'}</span>
                    </div>
                    <p className="pl-6 italic text-[12px] text-slate-700">
                      ( {transactionVal ? terbilang(transactionVal) : '..................................................................................'} )
                    </p>
                  </div>
                </div>

                {/* 5 Poin Pernyataan Resmi */}
                <div className="pt-2 space-y-2 text-justify">
                  {isDualParty ? (
                    <p className="text-justify">Bersama ini kami menyatakan bahwa:</p>
                  ) : (
                    <p className="text-justify">Bersama ini saya/kami menyatakan bahwa:</p>
                  )}
                  <ol className="list-decimal list-outside pl-6 space-y-2 text-[12.5px] leading-relaxed text-justify">
                    <li className="text-justify">
                      status tanah dan/atau bangunan tersebut tidak dalam status sengketa dan kami menjamin tidak akan ada gugatan/tuntutan dari pihak manapun juga, dan bilamana dikemudian hari timbul permasalahan terkait pemalsuan data, kesalahan data atau gugatan/tuntutan berkaitan hal-hal tersebut di atas, maka sepenuhnya menjadi tanggung jawab kami;
                    </li>
                    <li className="text-justify">
                      {paktaVariant === 'jual_beli' || paktaVariant === 'tukar_hibah'
                        ? 'telah diberikan penjelasan oleh PPAT dan memahami ketentuan Peraturan Daerah Kabupaten Bandung Barat Nomor 1 Tahun 2024 tentang Pajak Daerah dan Retribusi Daerah;'
                        : 'telah memahami ketentuan Peraturan Daerah Kabupaten Bandung Barat Nomor 1 Tahun 2024 tentang Pajak Daerah dan Retribusi Daerah;'}
                    </li>
                    <li className="text-justify">
                      bersedia untuk hadir memberikan keterangan dan data pendukung atas peralihan hak dimaksud apabila dikemudian hari diperlukan;
                    </li>
                    <li className="text-justify">
                      bersedia untuk melakukan pembayaran kembali atas kurang bayar dari jumlah pembayaran BPHTB yang seharusnya apabila dikemudian hari ditemukan selisih atau ketidaksesuaian pembayaran; dan
                    </li>
                    <li className="text-justify">
                      apabila terbukti melanggar hal-hal yang telah kami nyatakan dalam pernyataan ini, kami bersedia diproses sesuai ketentuan peraturan perundang-undangan.
                    </li>
                  </ol>
                  <p className="pt-2 text-justify">
                    Demikian Pakta Integritas ini dibuat dengan sebenar-benarnya dan saya bersedia menerima segala konsekuensi hukum yang ditimbulkan apabila dikemudian hari terbukti pernyataan dalam Pakta Integritas ini tidak benar.
                  </p>
                </div>

                {/* Lokasi, Tanggal & Tanda Tangan */}
                <div className="pt-6">
                  <p className="text-right font-medium">
                    {letterLocation}, {documentItem.letterDate && documentItem.letterDate.trim() ? formatDateIndo(documentItem.letterDate) : '.......................................................'}
                  </p>

                  {!isDualParty ? (
                    <div className="flex justify-end pt-4">
                      <div className="text-center w-72 space-y-3">
                        <p className="font-bold">Penerima Hak,</p>
                        <div className="border border-dashed border-slate-400 w-32 h-16 mx-auto flex flex-col items-center justify-center text-[10px] text-slate-600 bg-slate-50/50 rounded">
                          <span>Meterai</span>
                          <span className="font-bold text-slate-800">Rp10.000</span>
                        </div>
                        <p className="font-bold pt-4">
                          ( {(secondParties.length > 0 && secondParties[0]?.name ? secondParties[0].name : firstParty.name) || '.....................................'} )
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-8 pt-6 text-center">
                      <div className="flex flex-col items-center justify-between min-h-[160px]">
                        <p className="font-bold">{labelP1},</p>
                        <div className="h-16"></div>
                        <p className="font-bold">
                          ( {firstParty.name || '.....................................'} )
                        </p>
                      </div>

                      <div className="flex flex-col items-center justify-between min-h-[160px]">
                        <p className="font-bold">{labelP2},</p>
                        <div className="border border-dashed border-slate-400 w-32 h-16 flex flex-col items-center justify-center text-[10px] text-slate-600 bg-slate-50/50 rounded my-1">
                          <span>Meterai Rp</span>
                          <span className="font-bold text-slate-800">10.000</span>
                        </div>
                        <p className="font-bold pt-1">
                          ( {secondParty.name || '........................................'} )
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* === DOKUMEN PPAT LAINNYA (DENGAN KOP KANTOR PPAT) === */
              <div>
                {/* Kop / Header Instansi PPAT */}
                <div className="text-center border-b-2 border-slate-800 pb-3 mb-6">
                  <h2 className="text-sm font-bold tracking-widest uppercase text-slate-800">
                    PEJABAT PEMBUAT AKTA TANAH (PPAT)
                  </h2>
                  <h1 className="text-base font-extrabold uppercase text-slate-900 tracking-wider">
                    NUKANTINI PUTRI PARINCHA, S.H., M.Kn.
                  </h1>
                  <p className="text-[11px] text-slate-600 font-sans mt-0.5">
                    Daerah Kerja: Kabupaten Bandung Barat • SK Kepala Badan Pertanahan Nasional RI
                  </p>
                </div>

                {/* Judul Dokumen */}
                <div className="text-center my-6">
                  <h2 className="text-base font-extrabold tracking-wide uppercase underline decoration-1 underline-offset-4">
                    {documentItem.title.toUpperCase()}
                  </h2>
                  {documentItem.letterNumber && (
                    <p className="text-xs font-sans text-slate-600 mt-1">
                      Nomor: {documentItem.letterNumber}
                    </p>
                  )}
                </div>

                {/* Body Content based on document type */}
                <div className="space-y-4 text-justify">
                  <p>Pada hari ini, bertempat di {letterLocation}, kami yang bertanda tangan di bawah ini:</p>

                  {/* PIHAK PERTAMA */}
                  <div className="pl-4 space-y-1">
                    <p className="font-bold">I. PIHAK PERTAMA (PENJUAL / PELEPAS HAK):</p>
                    <div className="grid grid-cols-12 gap-1 text-[12px]">
                      <span className="col-span-3 text-slate-600">Nama Lengkap</span>
                      <span className="col-span-9 font-semibold">: {firstParty.name || '-'}</span>
                      <span className="col-span-3 text-slate-600">NIK / Paspor</span>
                      <span className="col-span-9">: {firstParty.nik || '-'}</span>
                      <span className="col-span-3 text-slate-600">Pekerjaan</span>
                      <span className="col-span-9">: {firstParty.job || '-'}</span>
                      <span className="col-span-3 text-slate-600">Alamat Lengkap</span>
                      <span className="col-span-9">: {firstParty.address || '-'}</span>
                    </div>
                  </div>

                  {/* PIHAK KEDUA */}
                  <div className="pl-4 space-y-1">
                    <p className="font-bold">II. PIHAK KEDUA (PEMBELI / PENERIMA HAK):</p>
                    <div className="grid grid-cols-12 gap-1 text-[12px]">
                      <span className="col-span-3 text-slate-600">Nama Lengkap</span>
                      <span className="col-span-9 font-semibold">: {secondParty.name || '-'}</span>
                      <span className="col-span-3 text-slate-600">NIK / Paspor</span>
                      <span className="col-span-9">: {secondParty.nik || '-'}</span>
                      <span className="col-span-3 text-slate-600">Pekerjaan</span>
                      <span className="col-span-9">: {secondParty.job || '-'}</span>
                      <span className="col-span-3 text-slate-600">Alamat Lengkap</span>
                      <span className="col-span-9">: {secondParty.address || '-'}</span>
                    </div>
                  </div>

                  {/* OBJEK TRANSAKSI */}
                  <div className="space-y-1 pt-2">
                    <p>
                      Menerangkan bahwa berkenaan dengan rencana peralihan hak berupa <strong>{transactionType}</strong> atas sebidang tanah dan/atau bangunan berikut:
                    </p>
                    <div className="bg-slate-50 p-3 rounded border border-slate-200 text-[12px] space-y-1 font-sans">
                      <div className="grid grid-cols-12 gap-1">
                        <span className="col-span-4 text-slate-500">Nomor Sertipikat</span>
                        <span className="col-span-8 font-bold">{obj.certificateType || 'SHM'} No. {obj.certificateNumber || '-'}</span>
                        <span className="col-span-4 text-slate-500">Letak Tanah</span>
                        <span className="col-span-8">{obj.village || '-'}, Kec. {obj.district || '-'}, {obj.regency || 'KBB'}</span>
                        <span className="col-span-4 text-slate-500">Luas Tanah / Bangunan</span>
                        <span className="col-span-8">{obj.landArea || 0} m² / {obj.buildingArea || 0} m²</span>
                        <span className="col-span-4 text-slate-500">NOP PBB / NJOP</span>
                        <span className="col-span-8 font-mono">{obj.nop || '-'} ({formatRupiah(obj.njop)})</span>
                        <span className="col-span-4 text-slate-500">Nilai Transaksi</span>
                        <span className="col-span-8 font-bold text-slate-900">{formatRupiah(documentItem.specificData?.agreedPrice || obj.transactionValue)}</span>
                      </div>
                    </div>
                  </div>

                  {/* KLAUSUL KHUSUS DOKUMEN */}
                  {documentItem.documentType === 'surat_persetujuan_keluarga' && (
                    <div className="space-y-2 pt-2">
                      <p>
                        Bahwa sehubungan dengan objek tersebut di atas adalah merupakan harta bersama, maka:
                      </p>
                      <div className="bg-amber-50/60 p-3 rounded border border-amber-200 text-[12px] font-sans">
                        <p className="font-bold text-slate-800">
                          Nama Pasangan: {documentItem.specificData?.spouseConsentName || '(Belum diisi)'} ({documentItem.specificData?.spouseRelation || 'Pasangan Sah'})
                        </p>
                        <p className="text-slate-600">
                          NIK: {documentItem.specificData?.spouseConsentNik || '-'}
                        </p>
                        <p className="mt-1 text-slate-700 italic">
                          Dengan sadar dan tanpa paksaan memberikan persetujuan sepenuhnya atas penjualan/pengalihan hak ini.
                        </p>
                      </div>
                    </div>
                  )}

                  {documentItem.documentType === 'surat_kuasa_ppat' && (
                    <div className="space-y-2 pt-2">
                      <p>
                        Memberikan kuasa penuh kepada:
                      </p>
                      <div className="bg-blue-50/60 p-3 rounded border border-blue-200 text-[12px] font-sans">
                        <p className="font-bold text-slate-800">
                          {documentItem.specificData?.attorneyName || 'STAF KANTOR PPAT NUKANTINI PUTRI PARINCHA, S.H., M.Kn.'}
                        </p>
                        <p className="text-slate-600">
                          Alamat / Kantor: {documentItem.specificData?.attorneyAddress || 'Kantor PPAT Nukantini Putri Parincha, S.H., M.Kn.'}
                        </p>
                        <p className="mt-1 text-slate-700">
                          Untuk melakukan pengurusan pengecekan sertipikat, validasi pajak daerah (BPHTB di Bapenda KBB), validasi PPh di KPP Pratama, dan pendaftaran peralihan hak di Kantor Pertanahan.
                        </p>
                      </div>
                    </div>
                  )}

                  {documentItem.documentType === 'surat_pasal_99' && (
                    <div className="space-y-2 pt-2">
                      <p className="font-bold text-slate-800">
                        Pernyataan Pemenuhan Ketentuan Batas Maksimum & Bukan Absentee (Pasal 99 PMNA/KaBPN 3/1997):
                      </p>
                      <ol className="list-decimal list-inside pl-2 space-y-1.5 text-[12px] bg-slate-50 p-3.5 rounded border border-slate-200">
                        <li>Dengan perolehan hak atas tanah ini, pihak yang memperoleh hak TIDAK AKAN menjadi pemegang hak atas tanah yang melebihi batas maksimum penguasaan tanah menurut peraturan perundang-undangan yang berlaku.</li>
                        <li>Perolehan hak atas tanah tersebut BUKAN merupakan perolehan tanah secara absentee (guntai).</li>
                        <li>Pernyataan ini dibuat dengan itikad baik dan penuh tanggung jawab untuk keperluan pendaftaran peralihan hak di Kantor Pertanahan.</li>
                      </ol>
                    </div>
                  )}

                  {documentItem.documentType === 'surat_pasal_100' && (
                    <div className="space-y-2 pt-2">
                      <p className="font-bold text-slate-800">
                        Pernyataan Penguasaan Fisik Bidang Tanah & Itikad Baik (Pasal 100 PMNA/KaBPN 3/1997):
                      </p>
                      <ol className="list-decimal list-inside pl-2 space-y-1.5 text-[12px] bg-slate-50 p-3.5 rounded border border-slate-200">
                        <li>Bidang tanah tersebut secara nyata dikuasai secara fisik dengan itikad baik tanpa ada keberatan atau sengketa dari pihak manapun;</li>
                        <li>Tanah tidak sedang menjadi jaminan utang tak tercatat, tidak tersangkut perkara di Pengadilan, dan bebas dari sita jaminan;</li>
                        <li>Batas-batas tanah terpasang dengan patok tanda batas yang jelas dan disepakati oleh para pemilik tanah yang berbatasan secara damai.</li>
                      </ol>
                    </div>
                  )}

                  {documentItem.documentType === 'surat_tidak_sengketa' && (
                    <div className="space-y-2 pt-2">
                      <p>Menyatakan dengan sesungguhnya bahwa tanah tersebut:</p>
                      <ol className="list-decimal list-inside pl-2 space-y-1 text-[12px]">
                        <li>Dikuasai secara fisik secara beritikad baik tanpa ada gangguan pihak lain;</li>
                        <li>Tidak sedang dalam keadaan sengketa, perkara perdata, maupun sita pengadilan;</li>
                        <li>Batas-batas tanah telah disetujui oleh para pemilik tanah yang berbatasan secara damai.</li>
                      </ol>
                    </div>
                  )}

                  {documentItem.notes && (
                    <div className="pt-2">
                      <p className="font-semibold text-xs text-slate-700 font-sans">Keterangan / Klausul Tambahan:</p>
                      <p className="text-[12px] italic text-slate-600 font-sans bg-slate-50 p-2.5 rounded border border-slate-200">
                        {documentItem.notes}
                      </p>
                    </div>
                  )}

                  <p className="pt-2">
                    Demikian surat ini dibuat dengan sebenarnya dan penuh tanggung jawab hukum untuk dipergunakan sebagaimana mestinya di hadapan Pejabat Pembuat Akta Tanah (PPAT).
                  </p>

                  {/* Tanggal dan Lokasi */}
                  <div className="text-right pt-4">
                    <p>{letterLocation}, {formatDateIndo(letterDate)}</p>
                  </div>

                  {/* Kolom Tanda Tangan */}
                  <div className="grid grid-cols-2 gap-6 pt-4 text-center">
                    <div className="flex flex-col items-center">
                      <p className="font-bold">PIHAK KEDUA (PEMBELI)</p>
                      <div className="h-20 flex items-center justify-center text-slate-400 text-[10px] font-sans">
                        (Meterai Rp 10.000)
                      </div>
                      <p className="font-bold underline decoration-1 underline-offset-4">
                        ( {secondParty.name || '...........................................'} )
                      </p>
                    </div>

                    <div className="flex flex-col items-center">
                      <p className="font-bold">PIHAK PERTAMA (PENJUAL)</p>
                      <div className="h-20 flex items-center justify-center text-slate-400 text-[10px] font-sans">
                        (Meterai Rp 10.000)
                      </div>
                      <p className="font-bold underline decoration-1 underline-offset-4">
                        ( {firstParty.name || '...........................................'} )
                      </p>
                    </div>
                  </div>

                  {/* Mengetahui PPAT */}
                  <div className="text-center pt-8">
                    <p className="text-xs text-slate-600">Mengetahui,</p>
                    <p className="font-bold text-xs uppercase">PEJABAT PEMBUAT AKTA TANAH (PPAT)</p>
                    <div className="h-16"></div>
                    <p className="font-extrabold uppercase underline decoration-1 underline-offset-4">
                      NUKANTINI PUTRI PARINCHA, S.H., M.Kn.
                    </p>
                    <p className="text-[10px] text-slate-500 font-sans">Daerah Kerja: Kabupaten Bandung Barat</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0 print:hidden">
          <span>💡 Dokumen ini menggunakan data pihak dan objek dari Proyek PPAT.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

