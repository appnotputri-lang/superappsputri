import React, { useState, useEffect } from 'react';
import { Invoice } from '../../../types';
import { InvoiceService } from '../../services/InvoiceService';
import { Printer, CheckCircle2, AlertCircle, FileText, Building2, CreditCard } from 'lucide-react';

export const PublicInvoiceViewer: React.FC = () => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      setLoading(true);
      try {
        // Extract token from query params or hash
        let token = new URLSearchParams(window.location.search).get('token');
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

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number, curr = 'IDR') => {
    if (curr === 'IDR') {
      return `Rp ${new Intl.NumberFormat('id-ID', {
        maximumFractionDigits: 0
      }).format(val || 0)}`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Memuat data invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-md max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-base font-bold text-slate-800">Invoice Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500">{error || 'Silakan hubungi Notaris untuk informasi lebih lanjut.'}</p>
        </div>
      </div>
    );
  }

  const isEn = invoice.language === 'en';

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 print:bg-white print:p-0">
      {/* Printable Sheet Container */}
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Print Button (Hidden on Print) */}
        <div className="flex justify-end print:hidden">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Printer size={16} />
            {isEn ? 'Print Invoice' : 'Cetak / Simpan PDF'}
          </button>
        </div>

        {/* Main Document Box */}
        <div className="bg-white p-8 md:p-12 rounded-2xl border border-slate-200 shadow-lg print:shadow-none print:border-none print:p-0 text-xs text-slate-800 space-y-8">
          {/* Header Kop */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-6 gap-4">
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 tracking-wide">
                NOTARIS & PPAT PUTRI, S.H., M.Kn.
              </h1>
              <p className="text-slate-600 text-[11px] mt-1">
                Jl. Utama Notaris No. 88, Kota, Jawa Barat
              </p>
              <p className="text-slate-500 text-[11px]">
                Email: notarisputri@gmail.com | Telp: (021) 555-1234
              </p>
            </div>

            <div className="sm:text-right">
              <h2 className="text-xl font-black text-emerald-700 tracking-wider uppercase">INVOICE</h2>
              <p className="font-bold text-slate-800 text-sm mt-1">{invoice.invoiceNumber}</p>
              <div className="mt-2 inline-block">
                <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  invoice.status === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {invoice.status}
                </span>
              </div>
            </div>
          </div>

          {/* Dates & Client info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div>
              <p className="font-bold text-slate-500 uppercase text-[10px] tracking-wider mb-1">
                {isEn ? 'Billed To:' : 'Ditujukan Kepada:'}
              </p>
              <p className="font-bold text-slate-900 text-sm">{invoice.clientName}</p>
              {invoice.clientAddress && <p className="text-slate-600 mt-0.5">{invoice.clientAddress}</p>}
              {invoice.clientEmail && <p className="text-slate-500">{invoice.clientEmail}</p>}
              {invoice.clientPhone && <p className="text-slate-500">{invoice.clientPhone}</p>}
            </div>

            <div className="sm:text-right space-y-1">
              <p><span className="font-semibold text-slate-500">{isEn ? 'Issue Date:' : 'Tgl Terbit:'}</span> {invoice.issueDate}</p>
              {invoice.dueDate && (
                <p><span className="font-semibold text-slate-500">{isEn ? 'Due Date:' : 'Jatuh Tempo:'}</span> {invoice.dueDate}</p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 text-slate-900 font-bold">
                  <th className="py-2.5">{isEn ? 'Description' : 'Deskripsi Layanan'}</th>
                  <th className="py-2.5 text-center w-16">{isEn ? 'Qty' : 'Jumlah'}</th>
                  <th className="py-2.5 text-right w-32">{isEn ? 'Unit Price' : 'Harga Satuan'}</th>
                  <th className="py-2.5 text-right w-32">{isEn ? 'Amount' : 'Total'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.items?.map((it, idx) => (
                  <tr key={idx} className="py-2">
                    <td className="py-2.5 font-medium text-slate-800">
                      {it.description}
                      {it.isTaxed && <span className="text-[10px] text-blue-600 ml-1 font-semibold">(Gross Up PPh 21)</span>}
                    </td>
                    <td className="py-2.5 text-center font-semibold text-slate-700">{it.quantity}</td>
                    <td className="py-2.5 text-right font-medium text-slate-700">
                      {formatCurrency(it.unitPrice, invoice.currency)}
                    </td>
                    <td className="py-2.5 text-right font-bold text-slate-900">
                      {formatCurrency((it.quantity || 0) * (it.unitPrice || 0), invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="flex justify-end pt-2">
            <div className="w-64 space-y-2 text-right">
              <div className="flex justify-between text-slate-600">
                <span>{isEn ? 'Honorarium:' : 'Honorarium:'}</span>
                <span className="font-semibold text-slate-900">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
              </div>
              {invoice.taxAmount && invoice.taxAmount > 0 ? (
                <div className="flex justify-between text-slate-600">
                  <span>{isEn ? 'PPh 21 (Gross Up):' : 'PPh 21 (Gross Up):'}</span>
                  <span className="font-semibold text-slate-900">+{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
                </div>
              ) : null}
              <div className="flex justify-between pt-2 border-t-2 border-slate-900 text-sm font-bold">
                <span className="text-slate-900">{isEn ? 'Total Amount:' : 'Total Tagihan:'}</span>
                <span className="text-emerald-700">{formatCurrency(invoice.totalAmount, invoice.currency)}</span>
              </div>
              {invoice.paidAmount > 0 && (
                <div className="flex justify-between text-slate-600 pt-1">
                  <span>{isEn ? 'Paid Amount:' : 'Telah Dibayar:'}</span>
                  <span className="font-semibold text-emerald-600">-{formatCurrency(invoice.paidAmount, invoice.currency)}</span>
                </div>
              )}
              {invoice.balanceDue > 0 && (
                <div className="flex justify-between pt-1 font-bold text-amber-700 border-t border-slate-200">
                  <span>{isEn ? 'Balance Due:' : 'Sisa Tagihan:'}</span>
                  <span>{formatCurrency(invoice.balanceDue, invoice.currency)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Instructions & Bank Details */}
          {invoice.bankDetails && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                <CreditCard size={15} className="text-emerald-600" />
                {isEn ? 'Payment Instructions' : 'Instruksi Pembayaran Transfer Bank'}
              </h4>
              <p className="text-slate-600">
                {isEn ? 'Please transfer the payment to the following account:' : 'Silakan lakukan transfer pembayaran ke rekening berikut:'}
              </p>
              <div className="p-3 bg-white rounded-lg border border-slate-200/80 font-mono text-xs space-y-1">
                <p><span className="text-slate-500">Bank:</span> <strong className="text-slate-900">{invoice.bankDetails.bankName}</strong></p>
                <p><span className="text-slate-500">{isEn ? 'Account No:' : 'No. Rekening:'}</span> <strong className="text-emerald-700 font-bold">{invoice.bankDetails.accountNumber}</strong></p>
                <p><span className="text-slate-500">{isEn ? 'Account Name:' : 'Atas Nama:'}</span> <strong className="text-slate-900">{invoice.bankDetails.accountHolder}</strong></p>
              </div>
            </div>
          )}

          {/* Terms / Notes */}
          {invoice.terms && (
            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
              <p className="font-bold text-slate-700">{isEn ? 'Terms & Notes:' : 'Syarat & Catatan:'}</p>
              <p>{invoice.terms}</p>
            </div>
          )}

          {/* Signature Block */}
          <div className="pt-8 flex justify-end">
            <div className="text-center w-56">
              <p className="text-slate-600 mb-14">{isEn ? 'Authorized Signature,' : 'Hormat Kami,'}</p>
              <p className="font-bold underline text-slate-900">NOTARIS & PPAT PUTRI, S.H., M.Kn.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
