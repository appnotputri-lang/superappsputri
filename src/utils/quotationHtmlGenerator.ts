import QRCode from 'qrcode';
import { Quotation } from '../types';
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

export async function getQrCodeBase64(quotation: Quotation, publicUrl?: string): Promise<string> {
  const token = quotation.publicToken || quotation.id || quotation.quotationNumber;
  const targetUrl = publicUrl || `${window.location.origin}/q/${token}`;

  try {
    const dataUrl = await QRCode.toDataURL(targetUrl, { width: 240, margin: 1 });
    if (dataUrl) return dataUrl;
  } catch (e) {
    console.warn('QRCode library error, using qrserver fallback', e);
  }

  const qrServerUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(targetUrl)}`;
  return await urlToBase64(qrServerUrl);
}

export function generateQuotationHTML(quotation: Quotation, qrBase64: string, autoPrint = false, lang: 'id' | 'en' = 'id'): string {
  const isEn = lang === 'en';
  const notesText = quotation.notes !== undefined
    ? quotation.notes
    : (isEn ? 'This quotation is valid for 14 days from issue date.' : 'Penawaran ini berlaku selama 14 hari sejak tanggal diterbitkan.');

  const itemsHtml = (quotation.items || []).map((it) => {
    const lines = (it.description || '').split('\n');
    const formattedLines = lines.map((line) => {
      const trimmed = line.trim();
      const isHeader = /^[0-9]+\./.test(trimmed);
      if (isHeader) {
        return `<div style="font-weight: 700; color: #0f172a; margin-top: 6px; font-size: 13px;">${line}</div>`;
      }
      return `<div style="color: #334155; margin-left: 10px; font-size: 12px; line-height: 1.4;">${line}</div>`;
    }).join('');

    const taxNote = it.isTaxed 
      ? `<div style="color: #64748b; font-size: 10px; font-style: italic; margin-top: 4px; margin-left: 10px;">(${isEn ? 'Includes Tax PPh 21' : 'Termasuk PPh 21'})</div>` 
      : '';

    return `
      <div style="display: flex; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
        <div style="flex: 1; padding-right: 20px;">
          ${formattedLines}
          ${taxNote}
        </div>
        <div style="font-weight: 700; color: #0f172a; text-align: right; white-space: nowrap; font-size: 13px; align-self: flex-start; padding-top: 4px;">
          ${formatNum(getItemSubtotal(it))}
        </div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="${isEn ? 'en' : 'id'}">
<head>
  <meta charset="utf-8">
  <title>Penawaran ${quotation.quotationNumber}</title>
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
    .notes-box {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      padding: 14px;
      border-radius: 10px;
      line-height: 1.5;
    }
    .notes-title {
      font-weight: 700;
      color: #1e293b;
      font-size: 11px;
      letter-spacing: 0.04em;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .notes-content {
      color: #334155;
      font-size: 11px;
      white-space: pre-line;
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
          <div class="doc-title">${isEn ? 'QUOTATION' : 'PENAWARAN'}</div>
          <table class="meta-table">
            <tr>
              <td class="meta-label">${isEn ? 'Quotation No' : 'Nomor'}</td>
              <td class="meta-val">${quotation.quotationNumber}</td>
            </tr>
            <tr>
              <td class="meta-label">${isEn ? 'Date' : 'Tanggal'}</td>
              <td class="meta-val">${formatDate(quotation.date)}</td>
            </tr>
            ${quotation.validUntil ? `
            <tr>
              <td class="meta-label">${isEn ? 'Valid Until' : 'Berlaku Hingga'}</td>
              <td class="meta-val">${formatDate(quotation.validUntil)}</td>
            </tr>
            ` : ''}
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
        <div class="section-header">${isEn ? 'Quotation To' : 'Penawaran Kepada'}</div>
        <div class="party-name">${quotation.clientName}</div>
        <div class="party-detail">
          ${quotation.clientAddress ? quotation.clientAddress.replace(/\n/g, '<br />') : ''}
          ${quotation.clientPhone ? `<br />${quotation.clientPhone}` : ''}
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <div class="items-table-header">
      <span>${isEn ? 'SERVICE DESCRIPTION' : 'DESKRIPSI LAYANAN'}</span>
      <span>${isEn ? 'ESTIMATED COST' : 'ESTIMASI BIAYA'}</span>
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
          <div class="terbilang-value">${isEn ? numberToWordsEN(quotation.totalAmount) : terbilang(quotation.totalAmount)}</div>
        </div>

        <!-- Informasi Pembayaran -->
        <div class="notes-box" style="margin-top: 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px;">
          <div style="font-weight: 700; color: #1e293b; font-size: 11px; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.04em;">${isEn ? 'PAYMENT INFORMATION:' : 'INFORMASI PEMBAYARAN:'}</div>
          <div style="font-weight: 700; color: #0f172a; font-size: 11.5px; line-height: 1.5; margin-bottom: 6px;">
            BCA Cabang Dago - Bandung<br />
            Acc. 7770673016<br />
            A.n Nukantini Putri Parincha
          </div>
          <div style="color: #475569; font-size: 11px; line-height: 1.4;">
            ${isEn ? 'Tax ID (NPWP) 16 digits :' : 'NPWP 16 digit :'} <strong>3217015610760002</strong><br />
            ${isEn ? 'BCA SWIFT Code :' : 'SWIFT BCA :'} <strong>CENAIDJA</strong>
          </div>
          ${notesText ? `
            <div style="margin-top: 10px; border-top: 1px dashed #cbd5e1; padding-top: 8px; color: #dc2626; font-size: 10.5px; font-weight: 600; line-height: 1.4;">
              * ${notesText}
            </div>
          ` : ''}
        </div>
      </div>

      <div class="footer-right">
        <!-- Totals -->
        <table class="totals-table">
          <tr>
            <td class="totals-label">Subtotal</td>
            <td class="totals-val">${formatNum(quotation.subtotal || quotation.totalAmount)}</td>
          </tr>
          ${quotation.taxAmount && quotation.taxAmount > 0 ? `
            <tr class="tax-row">
              <td class="totals-label" style="color: #dc2626;">${isEn ? 'Tax Withholding (PPh 21)' : 'Potongan PPh 21'}</td>
              <td style="color: #dc2626; font-weight: 700;">(${formatNum(quotation.taxAmount)})</td>
            </tr>
          ` : ''}
          <tr class="grand-total-row">
            <td>${isEn ? 'Total Estimate' : 'Total Estimasi'}</td>
            <td style="color: #2563eb; font-weight: 900;">Rp ${formatNum(quotation.totalAmount)}</td>
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

export async function printQuotation(quotation: Quotation, publicUrl?: string, lang: 'id' | 'en' = 'id') {
  const qrBase64 = await getQrCodeBase64(quotation, publicUrl);
  const html = generateQuotationHTML(quotation, qrBase64, true, lang);

  const win = window.open('', '_blank');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
  } else {
    alert('Harap izinkan popup browser untuk membuka dialog cetak penawaran.');
  }
}

export async function downloadQuotationPdf(quotation: Quotation, publicUrl?: string, lang: 'id' | 'en' = 'id') {
  const isEn = lang === 'en';
  const qrBase64 = await getQrCodeBase64(quotation, publicUrl);
  const filename = `Penawaran_${quotation.quotationNumber.replace(/[\/\\]/g, '_')}.pdf`;

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

  // Right: Document Title "PENAWARAN" & meta details
  doc.setFontSize(24);
  doc.text(isEn ? 'QUOTATION' : 'PENAWARAN', 195, 20, { align: 'right' });

  // Draw Meta Table
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${isEn ? 'Quotation No' : 'Nomor'} :`, 155, 27, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(quotation.quotationNumber, 195, 27, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.text(`${isEn ? 'Date' : 'Tanggal'} :`, 155, 31, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(formatDate(quotation.date), 195, 31, { align: 'right' });

  if (quotation.validUntil) {
    doc.setFont('helvetica', 'normal');
    doc.text(`${isEn ? 'Valid Until' : 'Berlaku Hingga'} :`, 155, 35, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(formatDate(quotation.validUntil), 195, 35, { align: 'right' });
  }

  // Divider Line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(15, 40, 195, 40);

  // --- 2. PARTIES SECTION ---
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

  // Column 2: Penawaran Kepada
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(isEn ? 'QUOTATION TO' : 'PENAWARAN KEPADA', 110, partyY);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(110, partyY + 2, 195, partyY + 2);

  doc.setTextColor(29, 78, 216); // blue-700
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(quotation.clientName, 110, partyY + 7);

  doc.setTextColor(71, 85, 105); // slate-600
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const toAddress = doc.splitTextToSize(quotation.clientAddress || '', 85);
  doc.text(toAddress, 110, partyY + 11);
  
  const toPhoneY = partyY + 11 + (toAddress.length * 4);
  if (quotation.clientPhone) {
    doc.text(quotation.clientPhone, 110, toPhoneY);
  }

  // Determine starting point for Items Table
  const tableStartY = Math.max(partyY + 11 + (fromAddress.length * 4) + 6, toPhoneY + 6);

  // --- 3. ITEMS TABLE ---
  const tableHeaders = [[isEn ? 'SERVICE DESCRIPTION' : 'DESKRIPSI LAYANAN', isEn ? 'ESTIMATED COST' : 'ESTIMASI BIAYA']];
  const tableBody = (quotation.items || []).map((it) => {
    const lines = (it.description || '').split('\n');
    let formattedDesc = lines.map(line => {
      const trimmed = line.trim();
      const isHeader = /^[0-9]+\./.test(trimmed);
      if (isHeader) {
        return trimmed;
      }
      return '   ' + trimmed;
    }).join('\n');
    if (it.isTaxed) {
      formattedDesc += `\n(${isEn ? 'Includes Tax PPh 21' : 'Termasuk PPh 21'})`;
    }
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
      if (data.section === 'head' && data.column.index === 1) {
        data.cell.styles.halign = 'right';
      }
    },
    margin: { left: 15, right: 15, bottom: 20 }
  });

  // --- 4. FOOTER GRID ---
  // @ts-ignore
  let currentY = doc.lastAutoTable.finalY + 8;

  if (currentY + 65 > pageHeight) {
    doc.addPage();
    currentY = 20;
  }

  const notesText = quotation.notes !== undefined
    ? quotation.notes
    : (isEn ? 'This quotation is valid for 14 days from issue date.' : 'Penawaran ini berlaku selama 14 hari sejak tanggal diterbitkan.');

  // LEFT COLUMN: Terbilang Box & Payment Box
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
  const terbilangStr = isEn ? numberToWordsEN(quotation.totalAmount) : terbilang(quotation.totalAmount);
  const terbilangLines = doc.splitTextToSize(terbilangStr, 87);
  doc.text(terbilangLines, 19, currentY + 9);

  // 2. Informasi Pembayaran Box
  const bankY = currentY + 22;
  const noteLines = notesText ? doc.splitTextToSize('* ' + notesText, 87) : [];
  const bankBoxHeight = 33 + (noteLines.length * 4);

  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.setDrawColor(203, 213, 225); // #cbd5e1
  doc.roundedRect(15, bankY, 95, bankBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59); // #1e293b
  doc.text(isEn ? 'PAYMENT INFORMATION:' : 'INFORMASI PEMBAYARAN:', 19, bankY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('BCA Cabang Dago - Bandung', 19, bankY + 10);
  doc.text('Acc. 7770673016', 19, bankY + 14);
  doc.text('A.n Nukantini Putri Parincha', 19, bankY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85); // #334155
  doc.text(isEn ? 'Tax ID (NPWP) 16 digits :' : 'NPWP 16 digit :', 19, bankY + 23);
  doc.setFont('helvetica', 'bold');
  doc.text('3217015610760002', 43, bankY + 23);

  doc.setFont('helvetica', 'normal');
  doc.text(isEn ? 'BCA SWIFT Code :' : 'SWIFT BCA :', 19, bankY + 27);
  doc.setFont('helvetica', 'bold');
  doc.text('CENAIDJA', 43, bankY + 27);

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
  doc.text(formatNum(quotation.subtotal || quotation.totalAmount), 195, rightY, { align: 'right' });

  // Tax row (if any)
  if (quotation.taxAmount && quotation.taxAmount > 0) {
    rightY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(220, 38, 38);
    doc.text(isEn ? 'Tax Withholding (PPh 21)' : 'Potongan PPh 21', 155, rightY, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`(${formatNum(quotation.taxAmount)})`, 195, rightY, { align: 'right' });
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
  doc.text(isEn ? 'Total Estimate' : 'Total Estimasi', 155, rightY, { align: 'right' });
  doc.text(`Rp ${formatNum(quotation.totalAmount)}`, 195, rightY, { align: 'right' });

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
  
  const sigBrand = doc.splitTextToSize('NOTARIS/PPAT NUKANTINI PUTRI PARINCHA', 75);
  doc.text(sigBrand, 157, sigY + 34, { align: 'center' });

  doc.save(filename);
}
