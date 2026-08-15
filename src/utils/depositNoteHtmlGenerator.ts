import { DepositNote } from '../types';
import { terbilang } from '../lib/formatter';

export function formatCurrencyIDR(val: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(val || 0);
}

export function formatDateIndonesian(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(d);
  } catch (e) {
    return dateStr;
  }
}

export function generateDepositNotePrintHtml(note: DepositNote, companyInfo?: any): string {
  const notarisName = companyInfo?.name || 'NUKANTINI PUTRI PARINCHA, SH., M.Kn.';
  const notarisTitle = companyInfo?.title || 'NOTARIS & PPAT KOTA SURABAYA';
  const notarisAddress = companyInfo?.address || 'Jl. Raya Darmo No. 123, Surabaya, Jawa Timur';
  const notarisPhone = companyInfo?.phone || 'Telp. (031) 555-0123 / Email: notaris.nukantini@gmail.com';

  const dateFormatted = formatDateIndonesian(note.date);
  const totalAmountStr = formatCurrencyIDR(note.totalAmount);
  const terbilangStr = terbilang(note.totalAmount) + ' rupiah';
  const capitalizedTerbilang = terbilangStr.charAt(0).toUpperCase() + terbilangStr.slice(1);

  const qrCodeImg = !note.hideQr ? `
    <div style="margin-bottom: 5px;">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(
        `VALIDATED TTP: ${note.depositNumber} | TOTAL: ${totalAmountStr} | RECIPIENT: ${note.recipientName || 'Notaris'}`
      )}" alt="QR Validation" style="width: 75px; height: 75px; display: inline-block;" />
    </div>
  ` : '';

  const itemRows = note.items.map((item, index) => `
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 8px 12px; text-align: center; width: 40px; font-size: 13px;">${index + 1}</td>
      <td style="border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 13px;">${item.description}</td>
      <td style="border: 1px solid #cbd5e1; padding: 8px 12px; text-align: right; font-weight: 600; width: 160px; font-size: 13px;">${formatCurrencyIDR(item.amount)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Tanda Terima Titipan Uang - ${note.depositNumber}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm 20mm;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          color: #0f172a;
          line-height: 1.5;
          margin: 0;
          padding: 0;
          background: #fff;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }
        .header h1 {
          font-size: 18px;
          font-weight: bold;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .header h2 {
          font-size: 14px;
          font-weight: bold;
          margin: 3px 0 0 0;
          color: #334155;
        }
        .header p {
          font-size: 11px;
          margin: 3px 0 0 0;
          color: #475569;
        }
        .doc-title {
          text-align: center;
          margin-bottom: 24px;
        }
        .doc-title h3 {
          font-size: 16px;
          font-weight: bold;
          text-decoration: underline;
          margin: 0;
          letter-spacing: 1px;
        }
        .doc-title p {
          font-size: 13px;
          font-weight: bold;
          margin: 4px 0 0 0;
          color: #334155;
        }
        .meta-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 13px;
        }
        .meta-table td {
          padding: 4px 0;
          vertical-align: top;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .items-table th {
          background-color: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 10px 12px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .terbilang-box {
          background-color: #f8fafc;
          border: 1px solid #cbd5e1;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 25px;
          font-size: 13px;
          font-style: italic;
        }
        .signatures {
          width: 100%;
          margin-top: 40px;
          page-break-inside: avoid;
        }
        .sig-col {
          width: 50%;
          text-align: center;
          vertical-align: top;
          font-size: 13px;
        }
        .sig-space {
          height: 70px;
        }
        .footer-note {
          margin-top: 40px;
          font-size: 11px;
          color: #64748b;
          border-top: 1px dashed #cbd5e1;
          padding-top: 8px;
        }
        @media print {
          body { background: transparent; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${notarisName}</h1>
        <h2>${notarisTitle}</h2>
        <p>${notarisAddress} | ${notarisPhone}</p>
      </div>

      <div class="doc-title">
        <h3>TANDA TERIMA TITIPAN UANG</h3>
        <p>No: ${note.depositNumber}</p>
      </div>

      <table class="meta-table">
        <tr>
          <td style="width: 150px; font-weight: bold;">Telah Terima Dari</td>
          <td style="width: 15px;">:</td>
          <td style="font-weight: bold;">${note.clientName}</td>
        </tr>
        ${note.clientAddress ? `
        <tr>
          <td style="font-weight: bold;">Alamat Klien</td>
          <td>:</td>
          <td>${note.clientAddress}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="font-weight: bold;">Tanggal Terima</td>
          <td>:</td>
          <td>${dateFormatted}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Metode Pembayaran</td>
          <td>:</td>
          <td>${note.paymentMethod || 'Transfer'}</td>
        </tr>
      </table>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 40px;">No</th>
            <th style="text-align: left;">Rincian Titipan / Keterangan</th>
            <th style="text-align: right; width: 160px;">Jumlah (Rp)</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="border: 1px solid #cbd5e1; padding: 10px 12px; text-align: right; font-weight: bold; font-size: 13px; background-color: #f8fafc;">
              TOTAL TITIPAN:
            </td>
            <td style="border: 1px solid #cbd5e1; padding: 10px 12px; text-align: right; font-weight: bold; font-size: 14px; background-color: #f8fafc; color: #047857;">
              ${totalAmountStr}
            </td>
          </tr>
        </tfoot>
      </table>

      <div class="terbilang-box">
        <strong>Terbilang:</strong> ${capitalizedTerbilang}
      </div>

      ${note.notes ? `
      <div style="margin-bottom: 20px; font-size: 12px; color: #334155;">
        <strong>Catatan Tambahan:</strong> ${note.notes}
      </div>
      ` : ''}

      <table class="signatures">
        <tr>
          <td class="sig-col">
            <p>Penitip / Klien,</p>
            <div class="sig-space"></div>
            <p><strong>( ${note.clientName} )</strong></p>
          </td>
          <td class="sig-col">
            <p>Penerima / Staff Notaris,</p>
            ${qrCodeImg}
            ${note.hideQr ? '<div class="sig-space"></div>' : ''}
            <p><strong>( ${note.recipientName || 'Staff Notaris'} )</strong></p>
          </td>
        </tr>
      </table>

      <div class="footer-note">
        * Tanda terima ini merupakan bukti sah penerimaan titipan uang untuk pengurusan berkas/transaksi pada Kantor Notaris & PPAT.<br/>
        * Cetak otomatis dari Sistem Administrasi Notaris pada ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}.
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;
}

export function printDepositNoteHtml(note: DepositNote, companyInfo?: any) {
  const html = generateDepositNotePrintHtml(note, companyInfo);
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
