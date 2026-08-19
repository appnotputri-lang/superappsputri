import QRCode from 'qrcode';
import { Invoice, PaymentRecord } from '../types';
import { getItemSubtotal } from '../services/taxCalculator';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function terbilang(n: number): string {
  const angka = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  let num = Math.floor(Math.abs(n));
  if (num === 0) return "# Nol Rupiah #";

  function konversi(x: number): string {
    if (x < 12) return angka[x];
    else if (x < 20) return konversi(x - 10) + " Belas";
    else if (x < 100) return konversi(Math.floor(x / 10)) + " Puluh " + konversi(x % 10);
    else if (x < 200) return "Seratus " + konversi(x - 100);
    else if (x < 1000) return konversi(Math.floor(x / 100)) + " Ratus " + konversi(x % 100);
    else if (x < 2000) return "Seribu " + konversi(x - 1000);
    else if (x < 1000000) return konversi(Math.floor(x / 1000)) + " Ribu " + konversi(x % 1000);
    else if (x < 1000000000) return konversi(Math.floor(x / 1000000)) + " Juta " + konversi(x % 1000000);
    else if (x < 1000000000000) return konversi(Math.floor(x / 1000000000)) + " Milyar " + konversi(x % 1000000000);
    else if (x < 1000000000000000) return konversi(Math.floor(x / 1000000000000)) + " Triliun " + konversi(x % 1000000000000);
    return "";
  }

  const hasil = konversi(num).replace(/\s+/g, ' ').trim();
  return `# ${hasil} Rupiah #`;
}

export function numberToWordsEN(n: number): string {
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", 
                 "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  let num = Math.floor(Math.abs(n));
  if (num === 0) return "# Zero Rupiah #";

  function convert(x: number): string {
    if (x < 20) return units[x];
    if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 ? " " + units[x % 10] : "");
    if (x < 1000) return units[Math.floor(x / 100)] + " Hundred" + (x % 100 ? " " + convert(x % 100) : "");
    if (x < 1000000) return convert(Math.floor(x / 1000)) + " Thousand" + (x % 1000 ? " " + convert(x % 1000) : "");
    if (x < 1000000000) return convert(Math.floor(x / 1000000)) + " Million" + (x % 1000000 ? " " + convert(x % 1000000) : "");
    if (x < 1000000000000) return convert(Math.floor(x / 1000000000)) + " Billion" + (x % 1000000000 ? " " + convert(x % 1000000000) : "");
    return "";
  }

  const result = convert(num).replace(/\s+/g, ' ').trim();
  return `# ${result} Rupiah #`;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function formatNum(val?: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(val || 0);
}

export async function urlToBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

export async function getQrCodeBase64(invoice: Invoice, publicUrl?: string): Promise<string> {
  const token = invoice.publicToken || invoice.id || invoice.invoiceNumber;
  const targetUrl = publicUrl || invoice.legacyPublicUrl || `${window.location.origin}/${token}`;

  try {
    const dataUrl = await QRCode.toDataURL(targetUrl, { width: 240, margin: 1 });
    if (dataUrl) return dataUrl;
  } catch (e) {
    console.warn('QRCode library error, using qrserver fallback', e);
  }

  const qrServerUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(targetUrl)}`;
  return await urlToBase64(qrServerUrl);
}

export function generateInvoiceHTML(invoice: Invoice, qrBase64: string, autoPrint = false, lang: 'id' | 'en' = 'id'): string {
  const isEn = lang === 'en';
  const bank = invoice.bankDetails || {
    bankName: 'BCA Cabang Dago - Bandung',
    accountNumber: 'Acc. 7770673016',
    accountHolder: 'A.n Nukantini Putri Parincha',
    npwp: '3217015610760002',
    swiftCode: 'CENAIDJA'
  };

  const notesText = invoice.notes !== undefined
    ? invoice.notes
    : 'Pemotongan pajak PPh Pasal 21 harus disetorkan paling lambat tanggal 10 bulan berikutnya, untuk mencegah sanksi Ditjen Pajak.';

  const itemsHtml = (invoice.items || []).map((it) => {
    const lines = (it.description || '').split('\n');
    const formattedLines = lines.map((line) => {
      const trimmed = line.trim();
      const isHeader = /^[0-9]+\./.test(trimmed);
      if (isHeader) {
        return `<div style="font-weight: 700; color: #0f172a; margin-top: 6px; font-size: 13px;">${line}</div>`;
      }
      return `<div style="color: #334155; margin-left: 10px; font-size: 12px; line-height: 1.4;">${line}</div>`;
    }).join('');

    return `
      <div style="display: flex; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
        <div style="flex: 1; padding-right: 20px;">
          ${formattedLines}
        </div>
        <div style="font-weight: 700; color: #0f172a; text-align: right; white-space: nowrap; font-size: 13px;">
          ${formatNum(getItemSubtotal(it))}
        </div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="${isEn ? 'en' : 'id'}">
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
      background: #ffffff;
      color: #1e293b;
      width: 210mm;
      min-height: 297mm;
    }
    .page-container {
      width: 210mm;
      padding: 14mm 16mm;
      margin: 0 auto;
      background: #ffffff;
    }
    .header-table {
      width: 100%;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 19px;
      font-weight: 800;
      color: #2563eb;
      text-transform: uppercase;
      line-height: 1.2;
      letter-spacing: -0.02em;
    }
    .doc-title {
      font-size: 32px;
      font-weight: 900;
      color: #2563eb;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      text-align: right;
      margin-bottom: 6px;
    }
    .meta-table {
      margin-left: auto;
      border-collapse: collapse;
      font-size: 12px;
    }
    .meta-table td {
      padding: 2px 0;
    }
    .meta-label {
      color: #64748b;
      padding-right: 16px;
      text-align: right;
    }
    .meta-val {
      font-weight: 700;
      color: #0f172a;
      text-align: right;
    }
    .section-grid {
      display: flex;
      gap: 32px;
      margin-bottom: 24px;
      font-size: 12px;
    }
    .section-col {
      flex: 1;
    }
    .section-header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 4px;
      margin-bottom: 8px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
    }
    .party-name {
      font-weight: 700;
      color: #1d4ed8;
      margin-bottom: 2px;
    }
    .party-detail {
      color: #475569;
      line-height: 1.4;
    }
    .items-table-header {
      background: #1e293b;
      color: #ffffff;
      padding: 10px 16px;
      border-radius: 4px 4px 0 0;
      font-weight: 700;
      font-size: 12px;
      display: flex;
      justify-content: space-between;
      letter-spacing: 0.05em;
    }
    .items-container {
      border-bottom: 1px solid #cbd5e1;
      min-height: 100px;
      margin-bottom: 24px;
    }
    .footer-grid {
      display: flex;
      gap: 24px;
      font-size: 12px;
    }
    .footer-left {
      flex: 1.3;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .footer-right {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .terbilang-box {
      background: #f1f5f9;
      padding: 12px 14px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .terbilang-title {
      font-size: 10px;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .terbilang-value {
      font-weight: 700;
      color: #0f172a;
      font-style: italic;
    }
    .bank-box {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      padding: 14px;
      border-radius: 10px;
      line-height: 1.5;
    }
    .bank-title {
      font-weight: 700;
      color: #1e293b;
      font-size: 11px;
      letter-spacing: 0.04em;
      margin-bottom: 8px;
    }
    .bank-item {
      font-weight: 700;
      color: #0f172a;
    }
    .notes-warn {
      color: #dc2626;
      font-weight: 700;
      font-size: 11px;
      margin-top: 8px;
      line-height: 1.4;
    }
    .totals-table {
      width: 100%;
      text-align: right;
      font-size: 13px;
    }
    .totals-table td {
      padding: 3px 0;
    }
    .totals-label {
      color: #475569;
    }
    .totals-val {
      font-weight: 700;
      color: #0f172a;
    }
    .tax-row {
      color: #dc2626;
      font-weight: 600;
    }
    .grand-total-row td {
      border-top: 2px solid #0f172a;
      padding-top: 14px !important;
      font-weight: 900;
      font-size: 15px;
      color: #0f172a;
    }
    .due-row td {
      font-weight: 900;
      font-size: 14px;
      color: #dc2626;
      padding-top: 6px !important;
    }
    .signature-container {
      text-align: center;
      margin-top: auto;
      padding-top: 8px;
    }
    .qr-img {
      width: 100px;
      height: 100px;
      margin: 6px auto;
      display: block;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 2px;
    }
  </style>
  ${autoPrint ? `<script>setTimeout(() => { window.print(); }, 500);</script>` : ''}
</head>
<body>
  <div class="page-container">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <div class="brand-title">
            NOTARIS/PPAT NUKANTINI PUTRI<br />PARINCHA,SH.M.KN
          </div>
        </td>
        <td style="vertical-align: top; text-align: right;">
          <div class="doc-title">INVOICE</div>
          <table class="meta-table">
            <tr>
              <td class="meta-label">${isEn ? 'Invoice No' : 'Nomor'}</td>
              <td class="meta-val">${invoice.invoiceNumber}</td>
            </tr>
            <tr>
              <td class="meta-label">${isEn ? 'Date' : 'Tanggal'}</td>
              <td class="meta-val">${formatDate(invoice.issueDate)}</td>
            </tr>
            <tr>
              <td class="meta-label">${isEn ? 'Due Date' : 'Jatuh Tempo'}</td>
              <td class="meta-val">${formatDate(invoice.dueDate)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Parties Grid -->
    <div class="section-grid">
      <div class="section-col">
        <div class="section-header">${isEn ? 'From' : 'Dari'}</div>
        <div class="party-name">Notaris/PPAT Nukantini Putri Parincha</div>
        <div class="party-detail">
          Komplek PPR ITB F5, Dago Giri, Mekarwangi, Lembang,<br />
          Bandung Barat, 40391<br />
          08112007061
        </div>
      </div>
      <div class="section-col">
        <div class="section-header">${isEn ? 'Bill To' : 'Tagihan Kepada'}</div>
        <div class="party-name">${invoice.clientName}</div>
        <div class="party-detail">
          ${invoice.clientAddress ? invoice.clientAddress.replace(/\n/g, '<br />') : ''}
          ${invoice.clientPhone ? `<br />${invoice.clientPhone}` : ''}
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <div class="items-table-header">
      <span>${isEn ? 'DESCRIPTION' : 'DESKRIPSI'}</span>
      <span>${isEn ? 'AMOUNT' : 'JUMLAH'}</span>
    </div>
    <div class="items-container">
      ${itemsHtml}
    </div>

    <!-- Bottom Footer Grid -->
    <div class="footer-grid">
      <div class="footer-left">
        <!-- Terbilang -->
        <div class="terbilang-box">
          <div class="terbilang-title">${isEn ? 'Amount in Words' : 'Terbilang'}</div>
          <div class="terbilang-value">${isEn ? numberToWordsEN(invoice.totalAmount) : terbilang(invoice.totalAmount)}</div>
        </div>

        <!-- Bank Details -->
        <div class="bank-box">
          <div class="bank-title">${isEn ? 'PAYMENT TRANSFERRED TO:' : 'PEMBAYARAN DITRANSFER KE:'}</div>
          <div class="bank-item">${bank.bankName}</div>
          <div class="bank-item">${bank.accountNumber}</div>
          <div class="bank-item">${bank.accountHolder}</div>
          <div style="margin-top: 4px; color: #334155;">
            ${isEn ? 'Tax ID (NPWP) 16 digits :' : 'NPWP 16 digit :'} <strong>${bank.npwp || '3217015610760002'}</strong>
          </div>
          <div style="color: #334155;">
            ${isEn ? 'BCA SWIFT Code :' : 'SWIFT BCA :'} <strong>${bank.swiftCode || 'CENAIDJA'}</strong>
          </div>
          ${notesText ? `<div class="notes-warn">* ${notesText}</div>` : ''}
        </div>
      </div>

      <div class="footer-right">
        <!-- Totals -->
        <table class="totals-table">
          <tr>
            <td class="totals-label">Subtotal</td>
            <td class="totals-val">${formatNum(invoice.subtotal || invoice.totalAmount)}</td>
          </tr>
          ${invoice.taxAmount && invoice.taxAmount > 0 ? `
            <tr class="tax-row">
              <td>${isEn ? 'Tax (PPh 21)' : 'Pajak (PPh 21)'}</td>
              <td>(${formatNum(invoice.taxAmount)})</td>
            </tr>
          ` : ''}
          <tr class="grand-total-row">
            <td>Total</td>
            <td>Rp ${formatNum(invoice.totalAmount)}</td>
          </tr>
          <tr class="due-row">
            <td>${isEn ? 'Balance Due' : 'Sisa Tagihan'}</td>
            <td>${formatNum(invoice.balanceDue ?? invoice.totalAmount)}</td>
          </tr>
        </table>

        <!-- Signature & QR -->
        <div class="signature-container">
          <div style="font-weight: 600; color: #1e293b; font-size: 12px;">${isEn ? 'Sincerely,' : 'Hormat Kami,'}</div>
          ${qrBase64 ? `<img src="${qrBase64}" alt="QR" class="qr-img" />` : '<div style="height: 100px;"></div>'}
          <div style="font-weight: 800; font-size: 10px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px;">
            NOTARIS/PPAT NUKANTINI PUTRI PARINCHA
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function printInvoice(invoice: Invoice, publicUrl?: string, lang: 'id' | 'en' = 'id') {
  const qrBase64 = await getQrCodeBase64(invoice, publicUrl);
  const html = generateInvoiceHTML(invoice, qrBase64, true, lang);

  const win = window.open('', '_blank');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
  } else {
    alert('Harap izinkan popup browser untuk membuka dialog cetak invoice.');
  }
}

export async function downloadInvoicePdf(invoice: Invoice, publicUrl?: string, lang: 'id' | 'en' = 'id') {
  const isEn = lang === 'en';
  const qrBase64 = await getQrCodeBase64(invoice, publicUrl);
  const filename = `Invoice_${invoice.invoiceNumber.replace(/[\/\\]/g, '_')}.pdf`;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.width; // 210
  const pageHeight = doc.internal.pageSize.height; // 297

  // --- 1. TOP HEADER (Kop Surat) ---
  // Left: Brand/Notary name
  doc.setTextColor(37, 99, 235); // Blue #2563eb
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('NOTARIS/PPAT NUKANTINI PUTRI\nPARINCHA, SH., M.Kn', 15, 20);

  // Right: Document Title "INVOICE" & meta details
  doc.setFontSize(24);
  doc.text('INVOICE', 195, 20, { align: 'right' });

  // Draw Meta Table
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${isEn ? 'Invoice No' : 'Nomor'} :`, 155, 27, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.invoiceNumber, 195, 27, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.text(`${isEn ? 'Date' : 'Tanggal'} :`, 155, 31, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(formatDate(invoice.issueDate), 195, 31, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.text(`${isEn ? 'Due Date' : 'Jatuh Tempo'} :`, 155, 35, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(formatDate(invoice.dueDate), 195, 35, { align: 'right' });

  // Divider Line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(15, 40, 195, 40);

  // --- 2. PARTIES SECTION (Dari & Tagihan Kepada) ---
  const partyY = 46;
  
  // Column 1: Dari
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(isEn ? 'FROM' : 'DARI', 15, partyY);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(15, partyY + 2, 100, partyY + 2);

  doc.setTextColor(29, 78, 216); // blue-700
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Notaris/PPAT Nukantini Putri Parincha', 15, partyY + 7);

  doc.setTextColor(71, 85, 105); // slate-600
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const fromAddress = doc.splitTextToSize('Komplek PPR ITB F5, Dago Giri, Mekarwangi, Lembang, Bandung Barat, 40391', 85);
  doc.text(fromAddress, 15, partyY + 11);
  doc.text('08112007061', 15, partyY + 11 + (fromAddress.length * 4));

  // Column 2: Tagihan Kepada
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(isEn ? 'BILL TO' : 'TAGIHAN KEPADA', 110, partyY);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(110, partyY + 2, 195, partyY + 2);

  doc.setTextColor(29, 78, 216); // blue-700
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(invoice.clientName, 110, partyY + 7);

  doc.setTextColor(71, 85, 105); // slate-600
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const toAddress = doc.splitTextToSize(invoice.clientAddress || '', 85);
  doc.text(toAddress, 110, partyY + 11);
  
  const toPhoneY = partyY + 11 + (toAddress.length * 4);
  if (invoice.clientPhone) {
    doc.text(invoice.clientPhone, 110, toPhoneY);
  }

  // Determine starting point for Items Table
  const tableStartY = Math.max(partyY + 11 + (fromAddress.length * 4) + 6, toPhoneY + 6);

  // --- 3. ITEMS TABLE ---
  const tableHeaders = [[isEn ? 'DESCRIPTION' : 'DESKRIPSI', isEn ? 'AMOUNT' : 'JUMLAH']];
  const tableBody = (invoice.items || []).map((it) => {
    const lines = (it.description || '').split('\n');
    const formattedDesc = lines.map(line => {
      const trimmed = line.trim();
      const isHeader = /^[0-9]+\./.test(trimmed);
      if (isHeader) {
        return trimmed;
      }
      return '   ' + trimmed;
    }).join('\n');
    return [formattedDesc, formatNum(getItemSubtotal(it))];
  });

  autoTable(doc, {
    startY: tableStartY,
    head: tableHeaders,
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // #1e293b
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }
    },
    styles: {
      fontSize: 8,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      lineColor: [226, 232, 240], // slate-200
      lineWidth: 0.3,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'left' },
      1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      // For column 1 header, align right
      if (data.section === 'head' && data.column.index === 1) {
        data.cell.styles.halign = 'right';
      }
    },
    margin: { left: 15, right: 15, bottom: 20 }
  });

  // --- 4. FOOTER GRID ---
  // Get last autoTable final Y coordinate
  // @ts-ignore
  let currentY = doc.lastAutoTable.finalY + 8;

  // Let's ensure there is enough space for the footer elements (approx 75mm needed)
  if (currentY + 75 > pageHeight) {
    doc.addPage();
    currentY = 20;
  }

  const bank = invoice.bankDetails || {
    bankName: 'BCA Cabang Dago - Bandung',
    accountNumber: 'Acc. 7770673016',
    accountHolder: 'A.n Nukantini Putri Parincha',
    npwp: '3217015610760002',
    swiftCode: 'CENAIDJA'
  };

  const notesText = invoice.notes !== undefined
    ? invoice.notes
    : 'Pemotongan pajak PPh Pasal 21 harus disetorkan paling lambat tanggal 10 bulan berikutnya, untuk mencegah sanksi Ditjen Pajak.';

  // LEFT COLUMN: Terbilang Box & Bank Box
  // 1. Terbilang Box
  doc.setFillColor(241, 245, 249); // #f1f5f9
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.roundedRect(15, currentY, 95, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // #64748b
  doc.text(isEn ? 'Amount in Words' : 'Terbilang', 19, currentY + 5);

  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42); // #0f172a
  const terbilangStr = isEn ? numberToWordsEN(invoice.totalAmount) : terbilang(invoice.totalAmount);
  const terbilangLines = doc.splitTextToSize(terbilangStr, 87);
  doc.text(terbilangLines, 19, currentY + 9);

  // 2. Bank Details Box (with warning note inside)
  const bankY = currentY + 22;
  const noteLines = notesText ? doc.splitTextToSize('* ' + notesText, 87) : [];
  const bankBoxHeight = 33 + (noteLines.length * 4);

  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.setDrawColor(203, 213, 225); // #cbd5e1
  doc.roundedRect(15, bankY, 95, bankBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59); // #1e293b
  doc.text(isEn ? 'PAYMENT TRANSFERRED TO:' : 'PEMBAYARAN DITRANSFER KE:', 19, bankY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(bank.bankName, 19, bankY + 10);
  doc.text(bank.accountNumber, 19, bankY + 14);
  doc.text(bank.accountHolder, 19, bankY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85); // #334155
  doc.text(isEn ? 'Tax ID (NPWP) 16 digits :' : 'NPWP 16 digit :', 19, bankY + 23);
  doc.setFont('helvetica', 'bold');
  doc.text(bank.npwp || '3217015610760002', 43, bankY + 23);

  doc.setFont('helvetica', 'normal');
  doc.text(isEn ? 'BCA SWIFT Code :' : 'SWIFT BCA :', 19, bankY + 27);
  doc.setFont('helvetica', 'bold');
  doc.text(bank.swiftCode || 'CENAIDJA', 43, bankY + 27);

  if (notesText) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(220, 38, 38); // red-600 #dc2626
    doc.text(noteLines, 19, bankY + 32);
  }

  // RIGHT COLUMN: Totals Table
  let rightY = currentY + 5;

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal', 155, rightY, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatNum(invoice.subtotal || invoice.totalAmount), 195, rightY, { align: 'right' });

  // Tax row (if any)
  if (invoice.taxAmount && invoice.taxAmount > 0) {
    rightY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(220, 38, 38);
    doc.text(isEn ? 'Tax (PPh 21)' : 'Pajak (PPh 21)', 155, rightY, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`(${formatNum(invoice.taxAmount)})`, 195, rightY, { align: 'right' });
  }

  // Draw the divider line before "Total"
  rightY += 6;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(120, rightY, 195, rightY);

  // Grand Total
  rightY += 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Total', 155, rightY, { align: 'right' });
  doc.text(`Rp ${formatNum(invoice.totalAmount)}`, 195, rightY, { align: 'right' });

  // Sisa Tagihan
  rightY += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(220, 38, 38);
  doc.text(isEn ? 'Balance Due' : 'Sisa Tagihan', 155, rightY, { align: 'right' });
  doc.text(formatNum(invoice.balanceDue ?? invoice.totalAmount), 195, rightY, { align: 'right' });

  // Signature Section
  const sigY = rightY + 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(isEn ? 'Sincerely,' : 'Hormat Kami,', 157, sigY, { align: 'center' });

  if (qrBase64) {
    doc.addImage(qrBase64, 'PNG', 143, sigY + 3, 28, 28);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  
  // Wrap signature brand to ensure it doesn't clip
  const sigBrand = doc.splitTextToSize('NOTARIS/PPAT NUKANTINI PUTRI PARINCHA', 75);
  doc.text(sigBrand, 157, sigY + 34, { align: 'center' });

  doc.save(filename);
}

export function generateKwitansiHTML(invoice: Invoice, payment: PaymentRecord, qrBase64: string, autoPrint = false): string {
  const receiptNo = payment.refNumber || payment.id || (`KWT/${invoice.invoiceNumber}`);
  const paymentDate = formatDate(payment.date);
  const words = terbilang(payment.amount);
  const clientName = invoice.clientName || 'Klien';
  const description = invoice.projectTitle || (invoice.items?.[0]?.description ? invoice.items[0].description.split('\n')[0] : 'Pembayaran Tagihan');
  const paymentMethod = payment.method || 'Transfer BCA';
  const refText = payment.refNumber ? ` (Ref: ${payment.refNumber})` : '';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Kwitansi ${receiptNo}</title>
  <style>
    @page { size: A4; margin: 0; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #f8fafc;
      margin: 0;
      padding: 40px;
      -webkit-print-color-adjust: exact;
    }
    .kwitansi-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
      padding: 40px;
      border-radius: 8px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .notary-title {
      color: #2563eb;
      font-size: 16px;
      font-weight: bold;
      line-height: 1.3;
    }
    .notary-sub {
      color: #64748b;
      font-size: 11px;
      margin-top: 4px;
    }
    .doc-title {
      text-align: right;
    }
    .doc-title h1 {
      margin: 0;
      font-size: 26px;
      color: #0f172a;
      letter-spacing: 2px;
    }
    .doc-meta {
      font-size: 12px;
      color: #475569;
      margin-top: 6px;
    }
    .content-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .content-table td {
      padding: 12px 8px;
      vertical-align: top;
      font-size: 13px;
    }
    .label {
      width: 180px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    .colon {
      width: 15px;
      font-weight: bold;
    }
    .value {
      color: #0f172a;
      font-weight: 500;
    }
    .amount-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      padding: 12px 18px;
      border-radius: 6px;
      display: inline-block;
      font-size: 20px;
      font-weight: bold;
    }
    .terbilang-box {
      background: #f8fafc;
      border-left: 4px solid #2563eb;
      padding: 10px 14px;
      font-style: italic;
      color: #1e293b;
      font-weight: bold;
    }
    .footer-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    .notes-side {
      font-size: 11px;
      color: #64748b;
      max-width: 320px;
    }
    .sig-side {
      text-align: center;
      width: 240px;
    }
    .sig-date {
      font-size: 12px;
      color: #334155;
      margin-bottom: 8px;
    }
    .sig-title {
      font-size: 12px;
      color: #334155;
      margin-bottom: 12px;
    }
    .sig-qr {
      width: 80px;
      height: 80px;
      margin: 0 auto 12px;
    }
    .sig-name {
      font-weight: bold;
      font-size: 12px;
      color: #0f172a;
      border-top: 1px solid #cbd5e1;
      padding-top: 6px;
    }
  </style>
  ${autoPrint ? `<script>window.onload = function() { window.print(); };</script>` : ''}
</head>
<body>
  <div class="kwitansi-card">
    <div class="header">
      <div>
        <div class="notary-title">NOTARIS / PPAT<br>NUKANTINI PUTRI PARINCHA, S.H., M.Kn.</div>
        <div class="notary-sub">Jl. Dipatiukur No. 128, Bandung | Telp: (022) 2501234</div>
      </div>
      <div class="doc-title">
        <h1>KWITANSI</h1>
        <div class="doc-meta">
          <div><strong>No. Kwitansi:</strong> ${receiptNo}</div>
          <div><strong>Tanggal:</strong> ${paymentDate}</div>
        </div>
      </div>
    </div>

    <table class="content-table">
      <tr>
        <td class="label">Sudah Terima Dari</td>
        <td class="colon">:</td>
        <td class="value" style="font-size: 15px; font-weight: bold;">${clientName}</td>
      </tr>
      <tr>
        <td class="label">Uang Sejumlah</td>
        <td class="colon">:</td>
        <td class="value">
          <div class="amount-box">Rp ${formatNum(payment.amount)}</div>
        </td>
      </tr>
      <tr>
        <td class="label">Terbilang</td>
        <td class="colon">:</td>
        <td class="value">
          <div class="terbilang-box">${words}</div>
        </td>
      </tr>
      <tr>
        <td class="label">Untuk Pembayaran</td>
        <td class="colon">:</td>
        <td class="value">
          <strong>Invoice ${invoice.invoiceNumber}</strong>
          ${description ? `<br><span style="color: #475569;">${description}</span>` : ''}
        </td>
      </tr>
      <tr>
        <td class="label">Metode Pembayaran</td>
        <td class="colon">:</td>
        <td class="value">${paymentMethod}${refText}</td>
      </tr>
      ${payment.notes ? `
      <tr>
        <td class="label">Catatan</td>
        <td class="colon">:</td>
        <td class="value" style="color: #64748b; font-style: italic;">${payment.notes}</td>
      </tr>
      ` : ''}
    </table>

    <div class="footer-section">
      <div class="notes-side">
        <div style="font-weight: bold; color: #0f172a; margin-bottom: 4px;">Informasi Dokumen:</div>
        <div>Total Invoice: Rp ${formatNum(invoice.totalAmount)}</div>
        <div>Sisa Tagihan: Rp ${formatNum(invoice.balanceDue ?? 0)}</div>
        <div style="margin-top: 6px; font-size: 10px; color: #94a3b8;">* Kwitansi ini sah sebagai bukti pembayaran resmi kantor Notaris / PPAT.</div>
      </div>
      <div class="sig-side">
        <div class="sig-date">Bandung, ${paymentDate}</div>
        <div class="sig-title">Hormat Kami,</div>
        ${qrBase64 ? `<img src="${qrBase64}" class="sig-qr" alt="QR Signature" />` : '<div style="height: 60px;"></div>'}
        <div class="sig-name">NOTARIS / PPAT NUKANTINI PUTRI PARINCHA, S.H., M.Kn.</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function downloadKwitansiPdf(invoice: Invoice, payment: PaymentRecord, publicUrl?: string) {
  const qrBase64 = await getQrCodeBase64(invoice, publicUrl);
  const receiptNo = payment.refNumber || payment.id || (`KWT_${invoice.invoiceNumber}`);
  const filename = `Kwitansi_${receiptNo.replace(/[\/\\]/g, '_')}.pdf`;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Top Header - Notaris
  doc.setTextColor(37, 99, 235); // Blue #2563eb
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('NOTARIS/PPAT NUKANTINI PUTRI\nPARINCHA, SH., M.Kn', 15, 20);

  // Title - KWITANSI
  doc.setFontSize(22);
  doc.text('KWITANSI', 195, 20, { align: 'right' });

  // Meta details
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('No. Kwitansi :', 155, 27, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(payment.refNumber || payment.id || `KWT/${invoice.invoiceNumber}`, 195, 27, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.text('Tanggal :', 155, 31, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(formatDate(payment.date), 195, 31, { align: 'right' });

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(15, 38, 195, 38);

  let currentY = 48;

  // Helper to draw structured row
  const drawRow = (label: string, valueRender: () => number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(label.toUpperCase(), 15, currentY);
    doc.text(':', 55, currentY);
    const nextY = valueRender();
    currentY = nextY + 8;
  };

  // 1. Sudah terima dari
  drawRow('Sudah Terima Dari', () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(invoice.clientName || '-', 60, currentY);
    return currentY;
  });

  // 2. Uang sejumlah
  drawRow('Uang Sejumlah', () => {
    doc.setFillColor(239, 246, 255); // bg-blue-50
    doc.setDrawColor(191, 219, 254); // border-blue-200
    doc.roundedRect(60, currentY - 5, 80, 10, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 64, 175); // blue-800
    doc.text(`Rp ${formatNum(payment.amount)}`, 64, currentY + 2);
    return currentY + 4;
  });

  // 3. Terbilang
  drawRow('Terbilang', () => {
    const wordsText = terbilang(payment.amount);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(37, 99, 235); // blue-600 left border
    
    // Draw left accent bar
    doc.rect(60, currentY - 4, 1.5, 10, 'F');

    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    const splitWords = doc.splitTextToSize(wordsText, 125);
    doc.text(splitWords, 64, currentY + 1);
    return currentY + (splitWords.length * 4);
  });

  // 4. Untuk Pembayaran
  drawRow('Untuk Pembayaran', () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`Invoice ${invoice.invoiceNumber}`, 60, currentY);

    const desc = invoice.projectTitle || (invoice.items?.[0]?.description ? invoice.items[0].description.split('\n')[0] : '');
    let endY = currentY;
    if (desc) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const splitDesc = doc.splitTextToSize(desc, 125);
      doc.text(splitDesc, 60, currentY + 5);
      endY = currentY + 5 + (splitDesc.length * 4);
    }
    return endY;
  });

  // 5. Metode Pembayaran
  drawRow('Metode Pembayaran', () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    const methodStr = `${payment.method || 'Transfer BCA'}${payment.refNumber ? ` (Ref: ${payment.refNumber})` : ''}`;
    doc.text(methodStr, 60, currentY);
    return currentY;
  });

  // Catatan if present
  if (payment.notes) {
    drawRow('Catatan', () => {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(payment.notes || '', 60, currentY);
      return currentY;
    });
  }

  // Divider Line before footer
  currentY += 5;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(15, currentY, 195, currentY);

  // Footer / Signature
  const footerY = currentY + 10;
  
  // Left: Summary info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Ringkasan Tagihan:', 15, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Total Invoice : Rp ${formatNum(invoice.totalAmount)}`, 15, footerY + 5);
  doc.text(`Sisa Tagihan : Rp ${formatNum(invoice.balanceDue ?? 0)}`, 15, footerY + 9);

  // Right: Signature
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Bandung, ${formatDate(payment.date)}`, 157, footerY, { align: 'center' });
  doc.text('Hormat Kami,', 157, footerY + 5, { align: 'center' });

  if (qrBase64) {
    doc.addImage(qrBase64, 'PNG', 143, footerY + 8, 28, 28);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  const sigBrand = doc.splitTextToSize('NOTARIS/PPAT NUKANTINI PUTRI PARINCHA, SH., M.Kn', 75);
  doc.text(sigBrand, 157, footerY + 39, { align: 'center' });

  doc.save(filename);
}

export async function printKwitansi(invoice: Invoice, payment: PaymentRecord, publicUrl?: string) {
  const qrBase64 = await getQrCodeBase64(invoice, publicUrl);
  const html = generateKwitansiHTML(invoice, payment, qrBase64, true);

  const win = window.open('', '_blank');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
  } else {
    alert('Harap izinkan popup browser untuk membuka dialog cetak kwitansi.');
  }
}
