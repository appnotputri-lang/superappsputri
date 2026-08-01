import React, { useState, useEffect } from 'react';
import { Invoice } from '../../../types';
import { InvoiceService } from '../../services/InvoiceService';
import { Printer, Download } from 'lucide-react';
import { InvoicePrintTemplate } from './InvoicePrintTemplate';
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
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
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

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs print:hidden">
          <div>
            <h1 className="text-sm font-bold text-slate-900">
              Invoice #{invoice.invoiceNumber}
            </h1>
            <p className="text-xs text-slate-500">Notaris/PPAT Nukantini Putri Parincha, SH. M.Kn</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Download size={15} />
              {downloading ? 'Mengunduh PDF...' : 'Download PDF'}
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Printer size={15} />
              Cetak
            </button>
          </div>
        </div>

        {/* Invoice Printable View */}
        <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200/80 bg-white print:shadow-none print:border-none">
          <InvoicePrintTemplate invoice={invoice} />
        </div>
      </div>
    </div>
  );
};

