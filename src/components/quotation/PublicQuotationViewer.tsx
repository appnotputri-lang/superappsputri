import React, { useState, useEffect } from 'react';
import { Quotation } from '../../../types';
import { QuotationService } from '../../services/QuotationService';
import { Printer, Download, Loader2, AlertCircle, MapPin, Mail, Phone, Calendar, FileText, Database } from 'lucide-react';
import { printQuotation, downloadQuotationPdf, formatIndonesianDate, formatRupiahLetter } from '../../utils/quotationHtmlGenerator';
import { isReservedPath } from '../../constants/tabs';
import { getItemSubtotal } from '../../services/taxCalculator';

export const PublicQuotationViewer: React.FC = () => {
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [viewFormat, setViewFormat] = useState<'standard' | 'letter'>('letter');

  useEffect(() => {
    const fetchQuotation = async () => {
      setLoading(true);
      try {
        let token: string | null = null;

        // 1. Format terbaru: root path /q/{token} atau /{token}
        const rootMatch = window.location.pathname.match(/^\/q\/([A-Za-z0-9_-]+)\/?$/i);
        if (rootMatch) {
          token = rootMatch[1];
        } else {
          const rootMatchDirect = window.location.pathname.match(/^\/([A-Za-z0-9_-]+)\/?$/);
          if (rootMatchDirect && !isReservedPath(window.location.pathname)) {
            token = rootMatchDirect[1];
          }
        }

        // 2. Fallback: query string ?token=
        if (!token) {
          token = new URLSearchParams(window.location.search).get('token');
        }

        if (!token) {
          setError('Tautan penawaran tidak valid atau token tidak ditemukan.');
          setLoading(false);
          return;
        }

        const data = await QuotationService.getQuotationByPublicToken(token);
        if (data) {
          setQuotation(data);
          setViewFormat(data.formatType || 'letter');
        } else {
          setError('Penawaran tidak ditemukan atau telah dihapus.');
        }
      } catch (err) {
        console.error('Error fetching public quotation:', err);
        setError('Gagal memuat penawaran.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuotation();
  }, []);

  const handlePrint = async () => {
    if (!quotation) return;
    try {
      await printQuotation(quotation, undefined, 'id', viewFormat);
    } catch (err) {
      console.error('Print failed:', err);
    }
  };

  const handleDownloadPDF = async () => {
    if (!quotation) return;
    setDownloading(true);
    try {
      await downloadQuotationPdf(quotation, undefined, 'id', viewFormat);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Gagal mengunduh PDF. Silakan coba gunakan tombol Cetak.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="min-h-full bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center border border-slate-100">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Penawaran Tidak Ditemukan</h2>
          <p className="text-slate-500 text-sm">{error || 'Silakan hubungi Notaris untuk informasi lebih lanjut.'}</p>
        </div>
      </div>
    );
  }

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  const honorific = (quotation.recipientHonorific || 'BAPAK').trim();
  const clientNameUpper = (quotation.clientName || '').toUpperCase();
  const fullRecipient = honorific ? `${honorific} ${clientNameUpper}` : clientNameUpper;

  const firstItem = quotation.items && quotation.items.length > 0 ? quotation.items[0] : null;
  const firstItemTitle = firstItem ? (firstItem.description || '').split('\n')[0].replace(/^[0-9]+\.\s*/, '').trim() : '';
  const workTitle = quotation.subject || (firstItemTitle ? `biaya pengurusan ${firstItemTitle}` : 'biaya pengurusan Akta');
  const subjectText = quotation.subject?.startsWith('Penawaran') ? quotation.subject : `Penawaran ${workTitle}`;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-100 font-sans">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 md:py-10 space-y-4">
        {/* Tombol aksi & format toggle */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewFormat('letter')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewFormat === 'letter' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText size={14} /> Surat Resmi
            </button>
            <button
              type="button"
              onClick={() => setViewFormat('standard')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewFormat === 'standard' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database size={14} /> Format Standar
            </button>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-white text-slate-700 px-3.5 py-1.5 border border-slate-300 rounded-xl shadow-xs hover:bg-slate-50 transition-colors font-semibold text-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-xl shadow-xs hover:bg-blue-700 transition-colors font-semibold text-xs disabled:opacity-70 cursor-pointer"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* View Content */}
        {viewFormat === 'letter' ? (
          /* FORMAT SURAT RESMI NOTARIS/PPAT */
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-300 p-6 sm:p-10 font-serif text-slate-950 text-xs sm:text-sm space-y-4">
            {/* KOP SURAT NOTARIS/PPAT */}
            <div className="space-y-0.5 text-left border-b-2 border-dashed border-black pb-3">
              <h3 className="font-bold text-sm sm:text-base underline tracking-wide">NOTARIS/PPAT</h3>
              <h2 className="font-bold text-sm sm:text-base mt-1">NUKANTINI PUTRI PARINCHA, SH., M.Kn.</h2>
              <p className="font-bold text-[11px] sm:text-xs">SK MENTERI HUKUM DAN HAK ASASI MANUSIA REPUBLIK INDONESIA</p>
              <p className="text-[11px] sm:text-xs">NO. C-309.HT 03.01-Th. 2007, Tanggal 23 Agustus 2007</p>
              <p className="font-bold text-[11px] sm:text-xs mt-1">SK. KEPALA BADAN PERTANAHAN NASIONAL REPUBLIK INDONESIA</p>
              <p className="text-[11px] sm:text-xs">NO. 1 – XVI I- PPAT – 2009, Tanggal 12 Februari 2009</p>
              <div className="text-[11px] sm:text-xs pt-1 space-y-0.5">
                <div className="flex">
                  <span className="w-20 font-medium shrink-0">Kantor</span>
                  <span className="w-4 shrink-0">:</span>
                  <span>Komp. PPR-ITB Kav. F-5 Dago Bengkok, Lembang, Kab. Bandung Barat</span>
                </div>
                <div className="flex">
                  <span className="w-20 font-medium shrink-0">Telp/Fax</span>
                  <span className="w-4 shrink-0">:</span>
                  <span>022-2504155, 08122174848</span>
                </div>
              </div>
            </div>

            {/* Tanggal */}
            <div className="pt-2">
              <strong>Tanggal : {formatIndonesianDate(quotation.date)}</strong>
            </div>

            {/* Kepada Yth. */}
            <div className="space-y-0.5">
              <div><strong>Kepada Yth. :</strong></div>
              <div className="font-bold uppercase tracking-wide">
                {fullRecipient}
              </div>
              {quotation.clientAddress && (
                <p className="text-xs text-slate-600 whitespace-pre-line">{quotation.clientAddress}</p>
              )}
            </div>

            {/* Perihal */}
            <div className="font-bold pt-1">
              Perihal : {subjectText}
            </div>

            {/* Salam Pembuka */}
            <div className="space-y-1 pt-1 leading-relaxed text-justify">
              <div>Dengan Hormat,</div>
              <div>
                Bersama dengan ini kami bermaksud mengajukan penawaran kerja sama dengan <strong>{fullRecipient}</strong> dalam pengurusan {workTitle}, Adapun detail sbb :
              </div>
            </div>

            {/* Bagian A: Jenis Pengurusan */}
            <div className="space-y-1.5 pt-1">
              <div className="font-bold">A. {quotation.sectionATitle || 'Jenis Pengurusan'} :</div>
              <ol className="list-decimal pl-6 space-y-1">
                {quotation.items.map((it, idx) => (
                  <li key={idx}>
                    pengurusan {it.description?.split('\n')[0]?.replace(/^[0-9]+\.\s*/, '').trim() || `Pekerjaan ${idx + 1}`}.
                  </li>
                ))}
              </ol>
            </div>

            {/* Bagian B: Biaya Pengecekan */}
            <div className="space-y-2 pt-2">
              <div className="font-bold">B. {quotation.sectionBTitle || 'Biaya Pengecekan'}</div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-black text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-black">
                      <th className="border border-black p-2 w-12 text-center">No</th>
                      <th className="border border-black p-2 text-left">Detail Perijinan</th>
                      <th className="border border-black p-2 w-44 text-right">Biaya</th>
                      <th className="border border-black p-2 w-32 text-center">Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.items.map((it, idx) => {
                      const lines = (it.description || '').split('\n').filter(Boolean);
                      const mainDesc = lines[0] ? lines[0].replace(/^[0-9]+\.\s*/, '').trim() : '';
                      const subDesc = lines.slice(1);
                      return (
                        <tr key={idx}>
                          <td className="border border-black p-2 text-center align-top">{idx + 1}</td>
                          <td className="border border-black p-2 align-top">
                            <div className="font-medium">- {mainDesc}</div>
                            {subDesc.map((s, sIdx) => (
                              <div key={sIdx} className="pl-3 text-slate-600 text-xs">{s}</div>
                            ))}
                          </td>
                          <td className="border border-black p-2 text-right align-top whitespace-nowrap">
                            {formatRupiahLetter(getItemSubtotal(it))}
                          </td>
                          <td className="border border-black p-2 text-center align-top text-xs text-slate-500">
                            {it.quantity && it.quantity > 1 ? `${it.quantity} Buah` : ''}
                          </td>
                        </tr>
                      );
                    })}

                    {/* PPh 21 Row */}
                    {quotation.taxAmount && quotation.taxAmount > 0 ? (
                      <tr>
                        <td className="border border-black p-2 text-center align-top">{quotation.items.length + 1}</td>
                        <td className="border border-black p-2 align-top">
                          Pph 21 {quotation.taxRate ? (quotation.taxRate * 100).toFixed(1).replace('.0', '') : '2,5'}%
                        </td>
                        <td className="border border-black p-2 text-right align-top whitespace-nowrap">
                          {formatRupiahLetter(quotation.taxAmount, true)}
                        </td>
                        <td className="border border-black p-2 text-center align-top"></td>
                      </tr>
                    ) : null}

                    {/* Total Row */}
                    <tr className="font-bold bg-slate-50">
                      <td colSpan={2} className="border border-black p-2.5 text-center tracking-wide">
                        TOTAL BIAYA
                      </td>
                      <td className="border border-black p-2.5 text-right whitespace-nowrap font-bold">
                        {formatRupiahLetter(quotation.totalAmount)}
                      </td>
                      <td className="border border-black p-2.5 text-center"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="font-bold text-xs sm:text-sm pt-1">
                Note : {quotation.closingNote || quotation.notes || 'HARGA TERSEBUT DIATAS UNTUK 1 BUAH AKTA'}
              </div>
            </div>

            {/* Bagian C: Detail Perusahaan & Bank */}
            <div className="space-y-1.5 pt-2">
              <div className="font-bold">C. Detail Perusahaan & Bank</div>
              <div className="text-xs sm:text-sm leading-relaxed space-y-0.5">
                <div className="flex">
                  <span className="w-52 shrink-0">Nama Perusahaan / Pribadi</span>
                  <span className="w-4 shrink-0">:</span>
                  <span>Notaris/PPAT Nukantini Putri Parincha, SH., M.Kn.</span>
                </div>
                <div className="flex">
                  <span className="w-52 shrink-0">Contact Person</span>
                  <span className="w-4 shrink-0">:</span>
                  <span>Putri</span>
                </div>
                <div className="flex">
                  <span className="w-52 shrink-0">Alamat Perusahaan</span>
                  <span className="w-4 shrink-0">:</span>
                  <span>Komplek PPR ITB Kav F5, Dago Giri, Desa Mekarwangi, Kecamatan Lembang, Kabupaten Bandung Barat</span>
                </div>
                <div className="flex">
                  <span className="w-52 shrink-0">No Telepon / Handphone</span>
                  <span className="w-4 shrink-0">:</span>
                  <span>081-2217-4848</span>
                </div>
                <div className="flex">
                  <span className="w-52 shrink-0">No. NPWP</span>
                  <span className="w-4 shrink-0">:</span>
                  <span>32.026.793.9.421.000</span>
                </div>
                <div className="flex">
                  <span className="w-52 shrink-0">Nama Bank</span>
                  <span className="w-4 shrink-0">:</span>
                  <span>BCA</span>
                </div>
                <div className="flex">
                  <span className="w-52 shrink-0">Cabang</span>
                  <span className="w-4 shrink-0">:</span>
                  <span>Dago - Bandung</span>
                </div>
                <div className="flex">
                  <span className="w-52 shrink-0">Nama Pemilik Rekening</span>
                  <span className="w-4 shrink-0">:</span>
                  <span>Nukantini Putri Parincha</span>
                </div>
                <div className="flex">
                  <span className="w-52 shrink-0">Nomor Rekening</span>
                  <span className="w-4 shrink-0">:</span>
                  <span className="font-bold">777-0673016</span>
                </div>
              </div>
            </div>

            {/* Penutup */}
            <div className="pt-2 leading-relaxed">
              Demikian kami sampaikan Surat Penawaran untuk {workTitle}, atas perhatian dan kerjasamanya kami ucapkan terimakasih.
            </div>

            {/* Tanda Tangan */}
            <div className="pt-4 space-y-12">
              <div>Hormat Kami</div>
              <div className="font-bold underline text-sm sm:text-base tracking-wide">
                NUKANTINI PUTRI PARINCHA, SH., M.Kn.
              </div>
            </div>
          </div>
        ) : (
          /* FORMAT STANDAR (MODERN) */
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="bg-slate-900 text-white p-6 md:p-8">
              <div className="flex flex-col md:flex-row justify-between items-start gap-6 md:gap-0">
                <div className="w-full md:w-auto">
                  <h1 className="text-xl md:text-2xl font-bold uppercase tracking-wide text-sky-400">
                    Notaris/PPAT Nukantini Putri Parincha, SH. M.Kn
                  </h1>
                  <div className="mt-2 text-slate-300 text-xs md:text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 text-sky-400" />
                      <span>Komplek PPR ITB F5, Dago Giri, Mekarwangi, Lembang, Bandung Barat, 40391</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 text-sky-400" />
                      <span>notarisppatputri@gmail.com</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 text-sky-400" />
                      <span>08112007061</span>
                    </div>
                  </div>
                </div>
                <div className="text-left md:text-right w-full md:w-auto border-t border-slate-700 pt-4 md:border-0 md:pt-0">
                  <div className="text-xs font-bold bg-sky-500/20 text-sky-300 px-3 py-1 rounded-full uppercase tracking-widest inline-block mb-2">PENAWARAN</div>
                  <p className="font-mono text-base sm:text-lg md:text-xl font-bold break-all md:break-normal">{quotation.quotationNumber}</p>
                  <div className="text-xs text-slate-400 mt-1 space-y-1">
                    <p>Tanggal: {new Date(quotation.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    {quotation.validUntil && (
                      <p className="text-amber-400">Berlaku Hingga: {new Date(quotation.validUntil).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 md:p-8">
              <div className="flex justify-center mb-8">
                <div className={`px-6 py-2 rounded-full border-2 text-sm font-bold uppercase tracking-wider ${
                  quotation.status === 'ACCEPTED' ? 'border-green-500 text-green-600 bg-green-50' :
                  quotation.status === 'REJECTED' ? 'border-red-500 text-red-600 bg-red-50' :
                  quotation.status === 'SENT' ? 'border-sky-500 text-sky-600 bg-sky-50' :
                  'border-slate-400 text-slate-500 bg-slate-50'
                }`}>
                  Status: {
                    quotation.status === 'ACCEPTED' ? 'DISETUJUI' :
                    quotation.status === 'REJECTED' ? 'DITOLAK' :
                    'TERKIRIM'
                  }
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Penawaran Kepada</h3>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 font-sans">
                  <p className="font-bold text-slate-800 text-lg">{quotation.clientName}</p>
                  {quotation.clientAddress && <p className="text-slate-600 text-sm mt-1 whitespace-pre-wrap">{quotation.clientAddress}</p>}
                  {quotation.clientPhone && <p className="text-slate-600 text-sm mt-1">{quotation.clientPhone}</p>}
                  {quotation.clientEmail && <p className="text-slate-600 text-sm mt-0.5">{quotation.clientEmail}</p>}
                </div>
              </div>

              <div className="border rounded-xl overflow-x-auto border-slate-200 mb-8">
                <table className="w-full text-sm min-w-[400px]">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                      <th className="px-4 py-3 text-left">Deskripsi Layanan</th>
                      <th className="px-4 py-3 text-right">Estimasi Biaya</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quotation.items.map((item, idx) => {
                      const lines = (item.description || '').split('\n');
                      return (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-slate-700">
                            <div className="space-y-1">
                              {lines.map((line, lIdx) => {
                                const trimmed = line.trim();
                                const isHeader = /^[0-9]+\./.test(trimmed);
                                return (
                                  <p
                                    key={lIdx}
                                    className={`${isHeader ? 'font-bold text-slate-900 text-xs sm:text-sm' : 'text-slate-600 pl-4 text-xs sm:text-sm'}`}
                                  >
                                    {trimmed}
                                  </p>
                                );
                              })}
                              {item.isTaxed && (
                                <p className="text-slate-400 font-medium pl-4 text-xs italic mt-1">
                                  (Termasuk PPh 21)
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 align-top">
                            {new Intl.NumberFormat('id-ID').format(getItemSubtotal(item))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col-reverse md:flex-row justify-between gap-8">
                <div className="md:w-1/2 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                      Informasi Pembayaran:
                    </h3>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-600 text-xs sm:text-sm leading-relaxed">
                      <p className="font-bold text-slate-800">BCA Cabang Dago - Bandung</p>
                      <p className="font-bold text-slate-800 font-mono text-sm">Acc. 7770673016</p>
                      <p className="font-bold text-slate-800">A.n Nukantini Putri Parincha</p>
                      <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-500 space-y-0.5">
                        <p>NPWP 16 digit: <strong className="text-slate-700">3217015610760002</strong></p>
                        <p>SWIFT BCA: <strong className="text-slate-700">CENAIDJA</strong></p>
                      </div>
                    </div>
                  </div>

                  {quotation.notes && (
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-sky-600" />
                        Catatan / Ketentuan:
                      </h3>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-600 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                        {quotation.notes}
                      </div>
                    </div>
                  )}
                </div>

                <div className="md:w-1/2">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Sub Total</span>
                      <span className="font-mono font-medium">{fmtCurrency(quotation.subtotal || quotation.totalAmount)}</span>
                    </div>
                    {quotation.taxAmount && quotation.taxAmount > 0 ? (
                      <div className="flex justify-between text-red-500">
                        <span>Potongan PPh 21</span>
                        <span className="font-mono font-medium">({fmtCurrency(quotation.taxAmount)})</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between text-slate-900 pt-3 border-t border-slate-200">
                      <span className="font-bold">Total Estimasi</span>
                      <span className="font-mono font-bold text-lg text-sky-700">{fmtCurrency(quotation.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-6 text-center text-xs text-slate-400 border-t border-slate-100">
              <p>Halaman ini digenerate otomatis oleh Sistem Notaris Putri.</p>
              <p className="mt-1">Dapat diakses melalui Scan QR Code pada dokumen fisik.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
