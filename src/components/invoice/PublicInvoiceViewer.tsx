import React, { useState, useEffect, useCallback } from 'react';
import { Invoice } from '../../../types';
import { InvoiceService } from '../../services/InvoiceService';
import {
  generateInvoicePdfBlob,
  downloadInvoicePdf,
  printInvoice,
} from '../../utils/invoiceHtmlGenerator';
import { isReservedPath } from '../../constants/tabs';
import { InvoicePdfViewer } from './InvoicePdfViewer';

export const PublicInvoiceViewer: React.FC = () => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let token: string | null = null;

      // 1. Format terbaru: root path /{token}
      const rootMatch = window.location.pathname.match(/^\/([A-Za-z0-9_-]+)\/?$/);
      if (rootMatch && !isReservedPath(window.location.pathname)) {
        token = rootMatch[1];
      }

      // 1b. Format legacy: /INV/{slug} atau /inv/{slug}
      if (!token) {
        const invMatch = window.location.pathname.match(/^\/inv\/([^/?#]+)/i);
        if (invMatch) {
          token = decodeURIComponent(invMatch[1]);
        }
      }

      // 2. Fallback: path lama /invoice/public/{token}
      if (!token) {
        const pathMatch = window.location.pathname.match(/\/invoice\/public\/([^/?#]+)/);
        if (pathMatch) {
          token = decodeURIComponent(pathMatch[1]);
        }
      }

      // 3. Fallback: query string ?token=
      if (!token) {
        token = new URLSearchParams(window.location.search).get('token');
      }

      // 4. Fallback: format hash lama #/invoice/public?token=
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

        // Update document title for browser tab
        document.title = `Invoice ${data.invoiceNumber || ''} - ${data.clientName || 'Notaris Putri'}`;

        // Generate the PDF document (Single Source of Truth)
        try {
          const blob = await generateInvoicePdfBlob(data);
          setPdfBlob(blob);
        } catch (pdfErr: any) {
          console.error('Failed to generate PDF document:', pdfErr);
          setError('Gagal membuat dokumen PDF invoice.');
        }
      } else {
        setError('Invoice tidak ditemukan atau telah dihapus.');
      }
    } catch (err: any) {
      console.error('Error fetching public invoice:', err);
      setError(err?.message || 'Gagal memuat invoice.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handlePrint = async () => {
    if (!invoice) return;
    try {
      // Print the exact same PDF document
      await printInvoice(invoice, undefined, 'id', pdfBlob || undefined);
    } catch (err) {
      console.error('Print failed:', err);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    setDownloading(true);
    try {
      // Download the exact same PDF document
      await downloadInvoicePdf(invoice, undefined, 'id', pdfBlob || undefined);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Gagal mengunduh PDF. Silakan coba gunakan tombol Cetak.');
    } finally {
      setDownloading(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  const handleShare = async () => {
    if (!invoice) return;
    const token = invoice.publicToken || invoice.id;
    const publicUrl = invoice.legacyPublicUrl || `${window.location.origin}/${token}`;
    const shareText = `Invoice ${invoice.invoiceNumber || ''}\n${invoice.clientName || 'Klien'}\nLihat invoice:\n${publicUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoice.invoiceNumber || ''}`,
          text: shareText,
          url: publicUrl,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      alert(`Tautan invoice berhasil disalin:\n${publicUrl}`);
    } catch {
      prompt('Salin tautan invoice:', publicUrl);
    }
  };

  const fileName = invoice
    ? `Invoice_${invoice.invoiceNumber.replace(/[\/\\]/g, '_')}.pdf`
    : 'Invoice.pdf';

  return (
    <InvoicePdfViewer
      pdfBlob={pdfBlob}
      fileName={fileName}
      onDownload={handleDownloadPDF}
      onPrint={handlePrint}
      onShare={handleShare}
      onBack={window.history.length > 1 ? handleBack : undefined}
      isDownloading={downloading}
      isLoading={loading}
      error={error}
      onRetry={fetchInvoice}
    />
  );
};
