import React, { useState } from 'react';
import { 
  FileText, Download, Printer, Eye, CheckCircle2, 
  AlertTriangle, ShieldCheck, X, Copy, Check
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { Project, PPATData, PPATParty } from '../../../../domain/project/Project';
import { generatePaktaIntegritasDocx, generateSuratPernyataanDocx } from './generatePPATDocx';
import { ProjectService } from '../../../../services/ProjectService';

interface PPATDocumentGeneratorProps {
  project: Project;
  currentUser?: any;
  onUpdateProject?: (updated: Project) => void;
}

export const PPATDocumentGenerator: React.FC<PPATDocumentGeneratorProps> = ({
  project,
  currentUser,
  onUpdateProject
}) => {
  const ppatData: PPATData = project.ppatData || {
    transactionType: project.projectType || 'Akta Jual Beli (AJB)',
    firstParties: [],
    secondParties: [],
    object: {}
  };

  const [activeModalDoc, setActiveModalDoc] = useState<'pakta' | 'pernyataan' | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [registering, setRegistering] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);

  const firstParty: PPATParty = ppatData.firstParties?.[0] || { id: '', name: '', nik: '', address: '', job: '' };
  const secondParty: PPATParty = ppatData.secondParties?.[0] || { id: '', name: '', nik: '', address: '', job: '' };
  const obj = ppatData.object || {};
  const transactionType = (ppatData.transactionType || project.projectType || 'Jual Beli')
    .replace(/^Akta\s+/i, '')
    .replace(/\s*\([^)]*\)/g, '');

  const formatDateIndo = (dateStr?: string): string => {
    if (!dateStr) {
      return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatRupiah = (val?: number): string => {
    if (!val) return 'Rp 0';
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  const isDataReady = Boolean(firstParty.name && secondParty.name && obj.nop);

  // Download DOCX
  const handleDownloadDocx = async (type: 'pakta' | 'pernyataan') => {
    setDownloading(type);
    try {
      if (type === 'pakta') {
        await generatePaktaIntegritasDocx(project, ppatData);
      } else {
        await generateSuratPernyataanDocx(project, ppatData);
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(null);
    }
  };

  // Register document into Project's document registry
  const handleRegisterDocument = async (type: 'pakta' | 'pernyataan') => {
    setRegistering(type);
    try {
      const docName = type === 'pakta' 
        ? `Pakta Integritas Pemindahan Hak - ${transactionType}`
        : `Surat Pernyataan Pemindahan Hak - ${transactionType}`;

      const newDocRef = {
        id: `doc_${Date.now()}`,
        name: `${docName} (${secondParty.name || 'Klien'})`,
        type: 'OTHER',
        url: '',
        uploadedAt: new Date().toISOString()
      };

      const updatedDocs = [...(project.documents || []), newDocRef];

      const projectRef = doc(db, 'office_projects', project.projectId);
      await updateDoc(projectRef, {
        documents: updatedDocs,
        updatedAt: new Date()
      });

      try {
        await ProjectService.addTimeline(project.projectId, {
          status: 'document_added',
          title: `Dokumen didaftarkan: ${newDocRef.name}`,
          description: `Dihasilkan melalui generator dokumen PPAT.`,
          createdBy: currentUser?.displayName || 'Petugas PPAT'
        });
      } catch (e) {
        console.warn('Could not add timeline log', e);
      }

      setRegisterSuccess(type);
      setTimeout(() => setRegisterSuccess(null), 3000);

      if (onUpdateProject) {
        onUpdateProject({
          ...project,
          documents: updatedDocs
        });
      }
    } catch (err) {
      console.error('Error registering document:', err);
    } finally {
      setRegistering(null);
    }
  };

  // Print Document
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">
              Dokumen Resmi PPAT & Pajak BPHTB
            </h4>
            <p className="text-[11px] text-slate-500">
              Cetak dan unduh dokumen Pakta Integritas & Surat Pernyataan sesuai format baku Kab. Bandung Barat.
            </p>
          </div>
        </div>

        {!isDataReady && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Lengkapi NOP dan Nama Para Pihak di tab Data PPAT</span>
          </div>
        )}
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CARD 1: PAKTA INTEGRITAS */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:border-amber-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase tracking-wider">
                Wajib BPHTB
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>

            <h5 className="text-sm font-bold text-slate-800 mb-1">
              Pakta Integritas Pemindahan Hak
            </h5>
            <p className="text-[11px] text-slate-600 mb-4 leading-relaxed">
              Surat kepatuhan dan integritas nilai transaksi sesuai Perda Kab. Bandung Barat No. 1 Tahun 2024, ditandatangani Pihak Pertama dan Pihak Kedua bermeterai Rp 10.000.
            </p>

            <div className="text-[11px] text-slate-500 space-y-1 mb-4 bg-white p-2.5 rounded-lg border border-slate-200/80">
              <p>• Pihak 1: <strong className="text-slate-700">{firstParty.name || '(Belum diisi)'}</strong></p>
              <p>• Pihak 2: <strong className="text-slate-700">{secondParty.name || '(Belum diisi)'}</strong></p>
              <p>• NOP: <strong className="text-slate-700">{obj.nop || '(Belum diisi)'}</strong></p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveModalDoc('pakta')}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-all"
              >
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                <span>Lihat & Cetak</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadDocx('pakta')}
                disabled={downloading === 'pakta'}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloading === 'pakta' ? 'Memproses...' : 'Unduh .docx'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleRegisterDocument('pakta')}
              disabled={registering === 'pakta'}
              className="w-full text-center text-[11px] text-slate-500 hover:text-amber-700 py-1 transition-all"
            >
              {registerSuccess === 'pakta' ? (
                <span className="text-emerald-600 font-semibold flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan di Berkas Proyek
                </span>
              ) : (
                '+ Simpan Catatan Dokumen ke Proyek'
              )}
            </button>
          </div>
        </div>

        {/* CARD 2: SURAT PERNYATAAN */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:border-blue-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase tracking-wider">
                Lampiran Akta
              </span>
              <ShieldCheck className="w-4 h-4 text-blue-600" />
            </div>

            <h5 className="text-sm font-bold text-slate-800 mb-1">
              Surat Pernyataan Pemindahan Hak
            </h5>
            <p className="text-[11px] text-slate-600 mb-4 leading-relaxed">
              Surat pernyataan nilai transaksi dan objek riil ditandatangani Pihak Pertama, Pihak Kedua, serta Mengetahui PPAT Nukantini Putri Parincha, S.H., M.Kn.
            </p>

            <div className="text-[11px] text-slate-500 space-y-1 mb-4 bg-white p-2.5 rounded-lg border border-slate-200/80">
              <p>• Transaksi: <strong className="text-slate-700">{transactionType}</strong></p>
              <p>• Nilai: <strong className="text-slate-700">{formatRupiah(obj.transactionValue)}</strong></p>
              <p>• Lokasi: <strong className="text-slate-700">{obj.village ? `Desa ${obj.village}` : '-'}</strong></p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveModalDoc('pernyataan')}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-all"
              >
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span>Lihat & Cetak</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadDocx('pernyataan')}
                disabled={downloading === 'pernyataan'}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloading === 'pernyataan' ? 'Memproses...' : 'Unduh .docx'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleRegisterDocument('pernyataan')}
              disabled={registering === 'pernyataan'}
              className="w-full text-center text-[11px] text-slate-500 hover:text-blue-700 py-1 transition-all"
            >
              {registerSuccess === 'pernyataan' ? (
                <span className="text-emerald-600 font-semibold flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan di Berkas Proyek
                </span>
              ) : (
                '+ Simpan Catatan Dokumen ke Proyek'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* PREVIEW & PRINT MODAL */}
      {activeModalDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Bar */}
            <div className="px-6 py-3.5 bg-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {activeModalDoc === 'pakta' ? 'Pakta Integritas Pemindahan Hak' : 'Surat Pernyataan Pemindahan Hak'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak (Print)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalDoc(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Sheet Body */}
            <div className="p-8 overflow-y-auto bg-slate-100 flex justify-center">
              <div 
                id="ppat-printable-document"
                className="w-full max-w-[210mm] bg-white p-10 shadow-md border border-slate-200 text-slate-900 font-serif leading-relaxed text-[13px]"
              >
                {activeModalDoc === 'pakta' ? (
                  /* ================= PAKTA INTEGRITAS TEMPLATE ================= */
                  <div className="space-y-4">
                    <div className="text-center font-bold pb-2">
                      <h2 className="text-base tracking-wide uppercase">PAKTA INTEGRITAS</h2>
                      <h3 className="text-sm tracking-wide uppercase">
                        PEMINDAHAN HAK KARENA {transactionType.toUpperCase()}
                      </h3>
                    </div>

                    <p className="text-xs">Kami yang bertanda tangan di bawah ini:</p>

                    {/* I. Pihak Pertama */}
                    <div className="space-y-1 text-xs">
                      <p className="font-bold">I. PIHAK PERTAMA (PENJUAL / PELEPAS HAK):</p>
                      <table className="w-full text-xs">
                        <tbody>
                          <tr>
                            <td className="w-44 py-0.5 text-slate-600">Nama Lengkap</td>
                            <td className="w-4">:</td>
                            <td className="font-semibold">{firstParty.name || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">NIK / Identitas</td>
                            <td>:</td>
                            <td>{firstParty.nik || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">Pekerjaan</td>
                            <td>:</td>
                            <td>{firstParty.job || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">Alamat Lengkap</td>
                            <td>:</td>
                            <td>{firstParty.address || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">Bertindak Untuk & Atas Nama</td>
                            <td>:</td>
                            <td>
                              {firstParty.isLegalEntity
                                ? `${firstParty.representativeTitle || 'Direktur'} mewakili ${firstParty.companyName || firstParty.name}`
                                : 'Diri Sendiri / Para Ahli Waris'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* II. Pihak Kedua */}
                    <div className="space-y-1 text-xs pt-1">
                      <p className="font-bold">II. PIHAK KEDUA (PEMBELI / PENERIMA HAK):</p>
                      <table className="w-full text-xs">
                        <tbody>
                          <tr>
                            <td className="w-44 py-0.5 text-slate-600">Nama Lengkap</td>
                            <td className="w-4">:</td>
                            <td className="font-semibold">{secondParty.name || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">NIK / Identitas</td>
                            <td>:</td>
                            <td>{secondParty.nik || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">Pekerjaan</td>
                            <td>:</td>
                            <td>{secondParty.job || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">Alamat Lengkap</td>
                            <td>:</td>
                            <td>{secondParty.address || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">Bertindak Untuk & Atas Nama</td>
                            <td>:</td>
                            <td>
                              {secondParty.isLegalEntity
                                ? `${secondParty.representativeTitle || 'Direktur'} mewakili ${secondParty.companyName || secondParty.name}`
                                : 'Diri Sendiri'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* III. Objek */}
                    <div className="space-y-1 text-xs pt-1">
                      <p className="font-bold">III. DATA OBJEK PEMINDAHAN HAK:</p>
                      <table className="w-full text-xs">
                        <tbody>
                          <tr>
                            <td className="w-44 py-0.5 text-slate-600">Nomor Objek Pajak (NOP)</td>
                            <td className="w-4">:</td>
                            <td className="font-semibold">{obj.nop || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">SPPT PBB Atas Nama</td>
                            <td>:</td>
                            <td>{obj.spptName || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">Letak Tanah / Bangunan</td>
                            <td>:</td>
                            <td>{obj.location || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">RT / RW</td>
                            <td>:</td>
                            <td>RT {obj.rt || '-'} / RW {obj.rw || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">Desa / Kecamatan</td>
                            <td>:</td>
                            <td>Desa {obj.village || '-'}, Kec. {obj.district || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">Kabupaten / Kota</td>
                            <td>:</td>
                            <td>{obj.city || 'Bandung Barat'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">Dokumen Kepemilikan</td>
                            <td>:</td>
                            <td>{obj.documentType || 'SHM'} Nomor {obj.certificateNumber || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">Luas Tanah / Bangunan</td>
                            <td>:</td>
                            <td>Tanah: {obj.landArea || 0} m² | Bangunan: {obj.buildingArea || 0} m²</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">Nilai NJOP PBB</td>
                            <td>:</td>
                            <td>{formatRupiah(obj.njop)}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">Tanggal Transaksi</td>
                            <td>:</td>
                            <td>{formatDateIndo(obj.transactionDate)}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">Nilai Transaksi Riil</td>
                            <td>:</td>
                            <td className="font-bold text-slate-900">{formatRupiah(obj.transactionValue)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="pt-2 text-xs space-y-1.5">
                      <p className="font-semibold">Menyatakan dengan sebenarnya bahwa:</p>
                      <ol className="list-decimal pl-5 space-y-1 text-slate-800">
                        <li>Bahwa data identitas para pihak dan data objek pajak yang kami cantumkan di atas adalah benar sesuai dengan bukti kepemilikan dan keadaan yang sebenarnya.</li>
                        <li>Bahwa nilai transaksi / nilai perolehan hak yang kami nyatakan adalah nilai transaksi riil yang sebenarnya disepakati antara para pihak tanpa ada nilai yang disembunyikan.</li>
                        <li>Bahwa kami bertanggung jawab penuh baik secara perdata maupun pidana atas kebenaran seluruh data identitas, objek, serta nilai perolehan yang dilaporkan.</li>
                        <li>Bahwa kami bersedia dilakukan verifikasi dan pemeriksaan lapangan sewaktu-waktu oleh Badan Pendapatan Daerah Kabupaten Bandung Barat atau instansi berwenang terkait pemenuhan kewajiban perpajakan daerah (BPHTB).</li>
                        <li>Apabila di kemudian hari terbukti nilai transaksi yang kami laporkan tidak benar, kami bersedia dikenakan sanksi denda administratif serta membayar kekurangan pajak BPHTB sesuai ketentuan Peraturan Daerah Kabupaten Bandung Barat Nomor 1 Tahun 2024 tentang Pajak Daerah dan Retribusi Daerah.</li>
                      </ol>
                    </div>

                    {/* Tanda Tangan */}
                    <div className="pt-4">
                      <p className="text-right text-xs mb-4">
                        {obj.city || 'Bandung Barat'}, {formatDateIndo(obj.transactionDate)}
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-center text-xs">
                        <div className="p-3">
                          <p className="font-bold">PIHAK KEDUA (PEMBELI)</p>
                          <p className="text-[10px] text-slate-500 mb-14">(Meterai Rp 10.000)</p>
                          <p className="font-bold underline">{secondParty.name || '(-)'}</p>
                        </div>
                        <div className="p-3">
                          <p className="font-bold">PIHAK PERTAMA (PENJUAL)</p>
                          <p className="text-[10px] text-slate-500 mb-14">(Meterai Rp 10.000)</p>
                          <p className="font-bold underline">{firstParty.name || '(-)'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ================= SURAT PERNYATAAN TEMPLATE ================= */
                  <div className="space-y-4">
                    <div className="text-center font-bold pb-2">
                      <h2 className="text-base tracking-wide uppercase">SURAT PERNYATAAN</h2>
                      <h3 className="text-sm tracking-wide uppercase">
                        PEMINDAHAN HAK KARENA {transactionType.toUpperCase()}
                      </h3>
                    </div>

                    <p className="text-xs">Yang bertanda tangan di bawah ini:</p>

                    {/* 1. Pihak Pertama */}
                    <div className="space-y-1 text-xs">
                      <p className="font-bold">1. PIHAK PERTAMA (PENJUAL / PELEPAS HAK):</p>
                      <table className="w-full text-xs">
                        <tbody>
                          <tr>
                            <td className="w-40 py-0.5 text-slate-600">Nama</td>
                            <td className="w-4">:</td>
                            <td className="font-semibold">{firstParty.name || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">NIK</td>
                            <td>:</td>
                            <td>{firstParty.nik || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">Pekerjaan</td>
                            <td>:</td>
                            <td>{firstParty.job || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">Alamat</td>
                            <td>:</td>
                            <td>{firstParty.address || '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* 2. Pihak Kedua */}
                    <div className="space-y-1 text-xs pt-1">
                      <p className="font-bold">2. PIHAK KEDUA (PEMBELI / PENERIMA HAK):</p>
                      <table className="w-full text-xs">
                        <tbody>
                          <tr>
                            <td className="w-40 py-0.5 text-slate-600">Nama</td>
                            <td className="w-4">:</td>
                            <td className="font-semibold">{secondParty.name || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">NIK</td>
                            <td>:</td>
                            <td>{secondParty.nik || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">Pekerjaan</td>
                            <td>:</td>
                            <td>{secondParty.job || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">Alamat</td>
                            <td>:</td>
                            <td>{secondParty.address || '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* 3. Data Objek */}
                    <div className="space-y-1 text-xs pt-1">
                      <p className="font-bold">3. DATA OBJEK DAN NILAI TRANSAKSI:</p>
                      <table className="w-full text-xs">
                        <tbody>
                          <tr>
                            <td className="w-40 py-0.5 text-slate-600">Luas Tanah</td>
                            <td className="w-4">:</td>
                            <td>{obj.landArea || 0} m²</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">Luas Bangunan</td>
                            <td>:</td>
                            <td>{obj.buildingArea || 0} m²</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">Bukti Kepemilikan</td>
                            <td>:</td>
                            <td>{obj.documentType || 'SHM'} Nomor: {obj.certificateNumber || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">Nomor Objek Pajak (NOP)</td>
                            <td>:</td>
                            <td className="font-semibold">{obj.nop || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">Letak Objek Pajak</td>
                            <td>:</td>
                            <td>{obj.location || '-'}, RT {obj.rt || '-'}/RW {obj.rw || '-'}, Desa {obj.village || '-'}, Kec. {obj.district || '-'}, {obj.city || 'Bandung Barat'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">SPPT PBB Atas Nama</td>
                            <td>:</td>
                            <td>{obj.spptName || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">Tanggal Transaksi</td>
                            <td>:</td>
                            <td>{formatDateIndo(obj.transactionDate)}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-slate-600">Harga / Nilai Transaksi</td>
                            <td>:</td>
                            <td className="font-bold text-slate-900">{formatRupiah(obj.transactionValue)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <p className="text-xs pt-2 leading-relaxed">
                      Dengan ini menyatakan dengan sesungguhnya bahwa harga / nilai transaksi yang tercantum di atas adalah benar-benar nilai yang disepakati bersama dan dibayarkan secara sah tanpa ada pengurangan atau rekayasa nilai.
                    </p>

                    <p className="text-xs leading-relaxed">
                      Demikian Surat Pernyataan ini kami buat dengan penuh kesadaran dan tanggung jawab untuk dipergunakan sebagaimana mestinya.
                    </p>

                    {/* Tanda Tangan */}
                    <div className="pt-4">
                      <p className="text-right text-xs mb-4">
                        {obj.city || 'Bandung Barat'}, {formatDateIndo(obj.transactionDate)}
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-center text-xs">
                        <div>
                          <p className="text-slate-600">Yang Membuat Pernyataan,</p>
                          <p className="font-bold">PIHAK KEDUA (PEMBELI)</p>
                          <p className="text-[10px] text-slate-500 mb-14">(Meterai Rp 10.000)</p>
                          <p className="font-bold underline">{secondParty.name || '(-)'}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Yang Membuat Pernyataan,</p>
                          <p className="font-bold">PIHAK PERTAMA (PENJUAL)</p>
                          <p className="text-[10px] text-slate-500 mb-14">(Meterai Rp 10.000)</p>
                          <p className="font-bold underline">{firstParty.name || '(-)'}</p>
                        </div>
                      </div>

                      <div className="pt-8 text-center text-xs">
                        <p className="text-slate-600">Mengetahui,</p>
                        <p className="font-bold uppercase">PEJABAT PEMBUAT AKTA TANAH (PPAT)</p>
                        <p className="font-bold uppercase text-[11px] text-slate-700">KABUPATEN BANDUNG BARAT</p>
                        <div className="h-16" />
                        <p className="font-bold underline text-slate-900">
                          NUKANTINI PUTRI PARINCHA, S.H., M.Kn.
                        </p>
                        <p className="text-[11px] text-slate-600">SK Kepala BPN RI / Daerah Kerja: Kab. Bandung Barat</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
