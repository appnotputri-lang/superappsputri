import React, { useState, useEffect } from 'react';
import { Invoice } from '../../../types';
import { InvoiceService } from '../../services/InvoiceService';
import { Printer, Download, Loader2, AlertCircle, Banknote, MapPin, Mail, Phone } from 'lucide-react';
import { printInvoice, downloadInvoicePdf } from '../../utils/invoiceHtmlGenerator';

export const PublicInvoiceViewer: React.FC = () => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchInvoice = async () => {
      setLoading(true);
      try {
        let token: string | null = null;

        // 1. Format baru: path /invoice/public/{token}
        const pathMatch = window.location.pathname.match(/\/invoice\/public\/([^/?#]+)/);
        if (pathMatch) {
          token = decodeURIComponent(pathMatch[1]);
        }

        // 2. Fallback: query string ?token=
        if (!token) {
          token = new URLSearchParams(window.location.search).get('token');
        }

        // 3. Fallback: format hash lama #/invoice/public?token=
        if (!token && window.location.hash.includes('token=')) {
          const hashParts = window.location.hash.split('token=');
          if (hashParts[1]) {
            token = hashParts[1].split('&')[0];
          }
        }

        if (!token) {
          setError('Tautan invoice tidak valid atau token tidak ditemukan.');
          setLoading(false);
          return;
        }

        const data = await InvoiceService.getInvoiceByPublicToken(token);
        if (data) {
          setInvoice(data);
        } else {
          setError('Invoice tidak ditemukan atau telah dihapus.');
        }
      } catch (err) {
        console.error('Error fetching public invoice:', err);
        setError('Gagal memuat invoice.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, []);

  const handlePrint = async () => {
    if (!invoice) return;
    try {
      await printInvoice(invoice);
    } catch (err) {
      console.error('Print failed:', err);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    setDownloading(true);
    try {
      await downloadInvoicePdf(invoice);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Gagal mengunduh PDF. Silakan coba gunakan tombol Cetak.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center border border-slate-100">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Invoice Tidak Ditemukan</h2>
          <p className="text-slate-500 text-sm">{error || 'Silakan hubungi Notaris untuk informasi lebih lanjut.'}</p>
        </div>
      </div>
    );
  }

  const remaining = Math.max(0, invoice.balanceDue ?? (invoice.totalAmount - (invoice.paidAmount || 0)));
  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-100 font-sans">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 md:py-12">
        {/* Tombol aksi */}
        <div className="mb-4 flex justify-end gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2 border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors font-medium text-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-70 cursor-pointer"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span className="hidden sm:inline">Download PDF</span>
            <span className="inline sm:hidden">PDF</span>
          </button>
        </div>

        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-200">
          {/* Header gelap */}
          <div className="bg-slate-900 text-white p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 md:gap-0">
              <div className="w-full md:w-auto">
                <h1 className="text-xl md:text-2xl font-bold uppercase tracking-wide">
                  Notaris/PPAT Nukantini Putri Parincha, SH. M.Kn
                </h1>
                <div className="mt-2 text-slate-300 text-xs md:text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 text-blue-400" />
                    <span>Komplek PPR ITB F5, Dago Giri, Mekarwangi, Lembang, Bandung Barat, 40391</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 text-blue-400" />
                    <span>notarisppatputri@gmail.com</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 text-blue-400" />
                    <span>08112007061</span>
                  </div>
                </div>
              </div>
              <div className="text-left md:text-right w-full md:w-auto border-t border-slate-700 pt-4 md:border-0 md:pt-0">
                <div className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full uppercase tracking-widest inline-block mb-2">INVOICE</div>
                <p className="font-mono text-base sm:text-lg md:text-xl font-bold break-all md:break-normal">{invoice.invoiceNumber}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(invoice.issueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 md:p-8">
            <div className="flex justify-center mb-8">
              <div className={`px-6 py-2 rounded-full border-2 text-sm font-bold uppercase tracking-wider ${
                invoice.status === 'PAID' ? 'border-green-500 text-green-600 bg-green-50' : 'border-red-500 text-red-600 bg-red-50'
              }`}>
                {invoice.status === 'PAID' ? 'LUNAS (PAID)' : 'BELUM LUNAS (UNPAID)'}
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tagihan Kepada</h3>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-800 text-lg">{invoice.clientName}</p>
                {invoice.clientAddress && <p className="text-slate-600 text-sm mt-1">{invoice.clientAddress}</p>}
                {invoice.clientPhone && <p className="text-slate-600 text-sm mt-1">{invoice.clientPhone}</p>}
              </div>
            </div>

            <div className="border rounded-xl overflow-x-auto border-slate-200 mb-8">
              <table className="w-full text-sm min-w-[400px]">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="px-4 py-3 text-left">Deskripsi Layanan</th>
                    <th className="px-4 py-3 text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item, idx) => {
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
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 align-top">
                          {new Intl.NumberFormat('id-ID').format(item.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col-reverse md:flex-row justify-between gap-8">
              <div className="md:w-1/2">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-blue-600" />
                  Pembayaran Ditransfer Ke:
                </h3>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-900">{invoice.bankDetails?.bankName || 'BCA Cabang Dago - Bandung'}</p>
                  <p className="font-mono text-slate-700 mt-1">Acc. {invoice.bankDetails?.accountNumber || '7770673016'}</p>
                  <p className="text-slate-600">A.n {invoice.bankDetails?.accountHolder || 'Nukantini Putri Parincha'}</p>
                  <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-600 space-y-1">
                    <div className="flex justify-between"><span>NPWP 16 digit:</span> <span className="font-mono">{invoice.bankDetails?.npwp || '3217015610760002'}</span></div>
                    <div className="flex justify-between"><span>SWIFT BCA:</span> <span className="font-mono">{invoice.bankDetails?.swiftCode || 'CENAIDJA'}</span></div>
                  </div>
                  <div className="mt-3 text-red-600 text-[11px] font-medium italic">
                    * Pemotongan pajak PPh Pasal 21 harus disetorkan paling lambat tanggal 10 bulan berikutnya, untuk mencegah sanksi Ditjen Pajak.
                  </div>
                </div>
              </div>

              <div className="md:w-1/2">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Sub Total</span>
                    <span className="font-mono font-medium">{fmtCurrency(invoice.subtotal)}</span>
                  </div>
                  {invoice.taxAmount > 0 && (
                    <div className="flex justify-between text-red-500">
                      <span>Pajak (PPh 21)</span>
                      <span className="font-mono font-medium">({fmtCurrency(invoice.taxAmount)})</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-900 pt-3 border-t border-slate-200">
                    <span className="font-bold">Total Tagihan</span>
                    <span className="font-mono font-bold text-lg">{fmtCurrency(invoice.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span className="font-medium">Sudah Dibayar</span>
                    <span className="font-mono font-medium">{fmtCurrency(invoice.paidAmount || 0)}</span>
                  </div>
                  {remaining > 0 && (
                    <div className="flex justify-between text-red-600 pt-2 border-t border-slate-100">
                      <span className="font-bold">Sisa Pembayaran</span>
                      <span className="font-mono font-bold text-lg">{fmtCurrency(remaining)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-6 text-center text-xs text-slate-400 border-t border-slate-100">
            <p>Halaman ini digenerate otomatis oleh Sistem Notaris Putri.</p>
            <p className="mt-1">Dapat diakses melalui Scan QR Code pada dokumen fisik.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
