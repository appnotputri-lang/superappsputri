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

export function formatIndonesianDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const raw = dateStr.split('T')[0];
    const parts = raw.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parts[2].padStart(2, '0');
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day} ${months[monthIdx]} ${year}`;
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    }
    return dateStr;
  } catch {
    return dateStr || '';
  }
}

export function formatRupiahLetter(val: number, isDeduction = false): string {
  const numStr = new Intl.NumberFormat('id-ID').format(Math.abs(val || 0));
  if (isDeduction) {
    return `(Rp. ${numStr},-)`;
  }
  return `Rp. ${numStr},-`;
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

export function generateQuotationLetterHTML(
  quotation: Quotation,
  qrBase64: string,
  autoPrint = false
): string {
  const honorific = (quotation.recipientHonorific || 'BAPAK').trim();
  const clientNameUpper = (quotation.clientName || '').toUpperCase();
  const fullRecipient = honorific ? `${honorific} ${clientNameUpper}` : clientNameUpper;

  const firstItem = quotation.items && quotation.items.length > 0 ? quotation.items[0] : null;
  const firstItemTitle = firstItem ? (firstItem.description || '').split('\n')[0].replace(/^[0-9]+\.\s*/, '').trim() : '';
  const workTitle = quotation.subject || (firstItemTitle ? `biaya pengurusan ${firstItemTitle}` : 'biaya pengurusan Akta');
  const subjectText = quotation.subject?.startsWith('Penawaran') ? quotation.subject : `Penawaran ${workTitle}`;

  const dateFormatted = formatIndonesianDate(quotation.date) || formatDate(quotation.date);
  const closingNoteText = quotation.closingNote !== undefined
    ? quotation.closingNote
    : (quotation.notes || 'HARGA TERSEBUT DIATAS UNTUK 1 BUAH AKTA');

  // Section A items list
  const sectionAItems = (quotation.items || []).map((it, idx) => {
    const rawFirstLine = (it.description || '').split('\n')[0].replace(/^[0-9]+\.\s*/, '').trim();
    const cleanName = rawFirstLine || `Pekerjaan ${idx + 1}`;
    return `<li style="margin-bottom: 4px;">pengurusan ${cleanName}.</li>`;
  }).join('');

  // Section B table rows
  let rowIdx = 1;
  const tableRows = (quotation.items || []).map((it) => {
    const lines = (it.description || '').split('\n').filter(Boolean);
    const mainTitle = lines[0] ? lines[0].replace(/^[0-9]+\.\s*/, '').trim() : '';
    const subLines = lines.slice(1).map(l => `<div style="padding-left: 12px; color: #475569; font-size: 11px;">${l}</div>`).join('');
    const subtotal = getItemSubtotal(it);
    return `
      <tr>
        <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: top;">${rowIdx++}</td>
        <td style="border: 1px solid #000; padding: 6px 10px; vertical-align: top;">
          <div style="font-weight: 500;">- ${mainTitle}</div>
          ${subLines}
        </td>
        <td style="border: 1px solid #000; padding: 6px 10px; text-align: right; vertical-align: top; white-space: nowrap; font-family: 'Times New Roman', Times, serif; font-size: 13px;">
          ${formatRupiahLetter(subtotal)}
        </td>
        <td style="border: 1px solid #000; padding: 6px 10px; text-align: center; vertical-align: top; font-size: 11px; color: #475569;">
          ${it.quantity && it.quantity > 1 ? `${it.quantity} Buah` : ''}
        </td>
      </tr>
    `;
  }).join('');

  // Tax row
  const hasTax = quotation.taxAmount && quotation.taxAmount > 0;
  const taxRatePercent = quotation.taxRate ? (quotation.taxRate * 100).toFixed(1).replace('.0', '') : '2,5';
  const taxRowHtml = hasTax ? `
    <tr>
      <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: top;">${rowIdx++}</td>
      <td style="border: 1px solid #000; padding: 6px 10px; vertical-align: top;">Pph 21 ${taxRatePercent}%</td>
      <td style="border: 1px solid #000; padding: 6px 10px; text-align: right; vertical-align: top; white-space: nowrap; font-family: 'Times New Roman', Times, serif; font-size: 13px;">
        ${formatRupiahLetter(quotation.taxAmount!, true)}
      </td>
      <td style="border: 1px solid #000; padding: 6px 10px; text-align: center; vertical-align: top;"></td>
    </tr>
  ` : '';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>${quotation.quotationNumber} - Surat Penawaran</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 18mm 12mm 18mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Times New Roman', Times, serif;
      background: #ffffff;
      color: #000000;
      font-size: 13px;
      line-height: 1.4;
    }
    .letter-container {
      max-width: 210mm;
      margin: 0 auto;
      background: #ffffff;
      padding: 4px 0;
    }
    .kop-header {
      text-align: left;
      margin-bottom: 4px;
    }
    .kop-title {
      font-size: 14px;
      font-weight: bold;
      text-decoration: underline;
      margin-bottom: 2px;
      letter-spacing: 0.5px;
    }
    .kop-name {
      font-size: 13px;
      font-weight: bold;
      margin-top: 3px;
      margin-bottom: 2px;
    }
    .kop-sub {
      font-size: 10.5px;
      font-weight: bold;
      line-height: 1.25;
    }
    .kop-sub-normal {
      font-size: 10.5px;
      font-weight: normal;
      line-height: 1.25;
    }
    .kop-contact {
      font-size: 10.5px;
      margin-top: 2px;
      line-height: 1.25;
    }
    .kop-divider {
      border: 0;
      border-top: 1.5px dashed #000000;
      margin: 6px 0 12px 0;
    }
    .date-row {
      margin-bottom: 12px;
    }
    .recipient-block {
      margin-bottom: 12px;
    }
    .subject-row {
      margin-bottom: 12px;
      font-weight: bold;
    }
    .content-section {
      margin-bottom: 12px;
    }
    .section-title {
      font-weight: bold;
      margin-bottom: 3px;
    }
    .custom-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 3px;
      margin-bottom: 4px;
    }
    .custom-table th {
      border: 1px solid #000;
      padding: 5px 8px;
      background-color: #f8fafc;
      font-weight: bold;
      text-align: center;
      font-size: 12px;
    }
    .note-text {
      font-weight: bold;
      font-size: 11.5px;
      margin-top: 4px;
      margin-bottom: 10px;
    }
    .company-bank-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .company-bank-table td {
      padding: 1.5px 0;
      vertical-align: top;
    }
    .closing-text {
      margin-top: 12px;
      margin-bottom: 14px;
      line-height: 1.35;
    }
    .signature-block {
      margin-top: 8px;
      display: inline-block;
    }
    .sig-qr {
      width: 60px;
      height: 60px;
      margin: 6px 0;
      display: block;
    }
  </style>
  ${autoPrint ? `<script>setTimeout(() => { window.print(); }, 500);</script>` : ''}
</head>
<body>
  <div class="letter-container">
    <!-- KOP SURAT NOTARIS/PPAT -->
    <div class="kop-header">
      <div class="kop-title">NOTARIS/PPAT</div>
      <div class="kop-name">NUKANTINI PUTRI PARINCHA, SH., M.Kn.</div>
      <div class="kop-sub">SK MENTERI HUKUM DAN HAK ASASI MANUSIA REPUBLIK INDONESIA</div>
      <div class="kop-sub-normal">NO. C-309.HT 03.01-Th. 2007, Tanggal 23 Agustus 2007</div>
      <div class="kop-sub">SK. KEPALA BADAN PERTANAHAN NASIONAL REPUBLIK INDONESIA</div>
      <div class="kop-sub-normal">NO. 1 – XVI I- PPAT – 2009, Tanggal 12 Februari 2009</div>
      <div class="kop-contact">
        <table style="font-size: 10.5px; border-collapse: collapse;">
          <tr>
            <td style="width: 70px; vertical-align: top;">Kantor</td>
            <td style="width: 12px; vertical-align: top;">:</td>
            <td>Komp. PPR-ITB Kav. F-5 Dago Bengkok, Lembang, Kab. Bandung Barat</td>
          </tr>
          <tr>
            <td style="vertical-align: top;">Telp/Fax</td>
            <td style="vertical-align: top;">:</td>
            <td>022-2504155, 08122174848</td>
          </tr>
        </table>
      </div>
    </div>

    <hr class="kop-divider" />

    <!-- TANGGAL -->
    <div class="date-row">
      <strong>Tanggal : ${dateFormatted}</strong>
    </div>

    <!-- KEPADA -->
    <div class="recipient-block">
      <div><strong>Kepada Yth. :</strong></div>
      <div style="margin-top: 3px; font-weight: bold; text-transform: uppercase;">
        ${fullRecipient}
      </div>
      ${quotation.clientAddress ? `<div style="font-size: 11.5px; color: #333; margin-top: 2px;">${quotation.clientAddress}</div>` : ''}
    </div>

    <!-- PERIHAL -->
    <div class="subject-row">
      Perihal : ${subjectText}
    </div>

    <!-- SALAM PEMBUKA -->
    <div class="content-section">
      <div style="margin-bottom: 4px;">Dengan Hormat,</div>
      <div style="text-align: justify;">
        Bersama dengan ini kami bermaksud mengajukan penawaran kerja sama dengan ${fullRecipient} dalam pengurusan ${workTitle}, Adapun detail sbb :
      </div>
    </div>

    <!-- BAGIAN A: JENIS PENGURUSAN -->
    <div class="content-section">
      <div class="section-title">A. ${quotation.sectionATitle || 'Jenis Pengurusan'} :</div>
      <ol style="margin: 0; padding-left: 20px;">
        ${sectionAItems || '<li>pengurusan Akta dan Dokumen Legalitas.</li>'}
      </ol>
    </div>

    <!-- BAGIAN B: RINCIAN BIAYA -->
    <div class="content-section">
      <div class="section-title">B. ${quotation.sectionBTitle || 'Biaya Pengecekan'}</div>
      <table class="custom-table">
        <thead>
          <tr>
            <th style="width: 36px;">No</th>
            <th>Detail Perijinan</th>
            <th style="width: 140px;">Biaya</th>
            <th style="width: 100px;">Catatan</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
          ${taxRowHtml}
          <tr style="font-weight: bold; background-color: #fafafa;">
            <td colspan="2" style="border: 1px solid #000; padding: 6px 10px; text-align: center; font-size: 12.5px;">
              TOTAL BIAYA
            </td>
            <td style="border: 1px solid #000; padding: 6px 10px; text-align: right; white-space: nowrap; font-family: 'Times New Roman', Times, serif; font-size: 12.5px;">
              ${formatRupiahLetter(quotation.totalAmount)}
            </td>
            <td style="border: 1px solid #000; padding: 6px 10px;"></td>
          </tr>
        </tbody>
      </table>

      ${closingNoteText ? `<div class="note-text">Note : ${closingNoteText}</div>` : ''}
    </div>

    <!-- BAGIAN C: DETAIL PERUSAHAAN & BANK -->
    <div class="content-section">
      <div class="section-title">C. Detail Perusahaan & Bank</div>
      <table class="company-bank-table">
        <tr>
          <td style="width: 210px;">Nama Perusahaan / Pribadi</td>
          <td style="width: 14px;">:</td>
          <td>Notaris/PPAT Nukantini Putri Parincha, SH., M.Kn.</td>
        </tr>
        <tr>
          <td>Contact Person</td>
          <td>:</td>
          <td>Putri</td>
        </tr>
        <tr>
          <td>Alamat Perusahaan</td>
          <td>:</td>
          <td>Komplek PPR ITB Kav F5, Dago Giri, Desa Mekarwangi, Kecamatan Lembang, Kabupaten Bandung Barat</td>
        </tr>
        <tr>
          <td>No Telepon / Handphone</td>
          <td>:</td>
          <td>081-2217-4848</td>
        </tr>
        <tr>
          <td>No. NPWP</td>
          <td>:</td>
          <td>32.026.793.9.421.000</td>
        </tr>
        <tr>
          <td>Nama Bank</td>
          <td>:</td>
          <td>BCA</td>
        </tr>
        <tr>
          <td>Cabang</td>
          <td>:</td>
          <td>Dago - Bandung</td>
        </tr>
        <tr>
          <td>Nama Pemilik Rekening</td>
          <td>:</td>
          <td>Nukantini Putri Parincha</td>
        </tr>
        <tr>
          <td>Nomor Rekening</td>
          <td>:</td>
          <td><strong>777-0673016</strong></td>
        </tr>
      </table>
    </div>

    <!-- PENUTUP -->
    <div class="closing-text">
      Demikian kami sampaikan Surat Penawaran untuk ${workTitle}, atas perhatian dan kerjasamanya kami ucapkan terimakasih.
    </div>

    <!-- TANDA TANGAN -->
    <div class="signature-block">
      <div>Hormat Kami</div>
      ${qrBase64 ? `
        <div style="margin: 5px 0;">
          <img src="${qrBase64}" class="sig-qr" alt="QR Verifikasi" />
        </div>
      ` : '<div style="height: 50px;"></div>'}
      <div style="font-weight: bold; text-decoration: underline; margin-top: 3px;">
        NUKANTINI PUTRI PARINCHA, SH., M.Kn.
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function generateQuotationHTML(
  quotation: Quotation, 
  qrBase64: string, 
  autoPrint = false, 
  lang: 'id' | 'en' = 'id',
  formatOverride?: 'standard' | 'letter'
): string {
  const chosenFormat = formatOverride || quotation.formatType || 'standard';
  if (chosenFormat === 'letter') {
    return generateQuotationLetterHTML(quotation, qrBase64, autoPrint);
  }

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

export async function downloadQuotationLetterPdf(quotation: Quotation, publicUrl?: string) {
  const qrBase64 = await getQrCodeBase64(quotation, publicUrl);
  const filename = `Surat_Penawaran_${quotation.quotationNumber.replace(/[\/\\]/g, '_')}.pdf`;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const honorific = (quotation.recipientHonorific || 'BAPAK').trim();
  const clientNameUpper = (quotation.clientName || '').toUpperCase();
  const fullRecipient = honorific ? `${honorific} ${clientNameUpper}` : clientNameUpper;

  const firstItem = quotation.items && quotation.items.length > 0 ? quotation.items[0] : null;
  const firstItemTitle = firstItem ? (firstItem.description || '').split('\n')[0].replace(/^[0-9]+\.\s*/, '').trim() : '';
  const workTitle = quotation.subject || (firstItemTitle ? `biaya pengurusan ${firstItemTitle}` : 'biaya pengurusan Akta');
  const subjectText = quotation.subject?.startsWith('Penawaran') ? quotation.subject : `Penawaran ${workTitle}`;

  const dateFormatted = formatIndonesianDate(quotation.date) || formatDate(quotation.date);
  const closingNoteText = quotation.closingNote !== undefined
    ? quotation.closingNote
    : (quotation.notes || 'HARGA TERSEBUT DIATAS UNTUK 1 BUAH AKTA');

  let currentY = 16;

  // 1. KOP SURAT NOTARIS/PPAT
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('NOTARIS/PPAT', 18, currentY);
  const titleWidth = doc.getTextWidth('NOTARIS/PPAT');
  doc.setLineWidth(0.3);
  doc.line(18, currentY + 0.8, 18 + titleWidth, currentY + 0.8);

  currentY += 5.5;
  doc.setFontSize(10.5);
  doc.text('NUKANTINI PUTRI PARINCHA, SH., M.Kn.', 18, currentY);

  currentY += 4.5;
  doc.setFontSize(8.5);
  doc.text('SK MENTERI HUKUM DAN HAK ASASI MANUSIA REPUBLIK INDONESIA', 18, currentY);

  currentY += 3.8;
  doc.setFont('times', 'normal');
  doc.text('NO. C-309.HT 03.01-Th. 2007, Tanggal 23 Agustus 2007', 18, currentY);

  currentY += 4.2;
  doc.setFont('times', 'bold');
  doc.text('SK. KEPALA BADAN PERTANAHAN NASIONAL REPUBLIK INDONESIA', 18, currentY);

  currentY += 3.8;
  doc.setFont('times', 'normal');
  doc.text('NO. 1 – XVI I- PPAT – 2009, Tanggal 12 Februari 2009', 18, currentY);

  currentY += 4.2;
  doc.setFontSize(8);
  doc.text('Kantor : Komp. PPR-ITB Kav. F-5 Dago Bengkok, Lembang, Kab. Bandung Barat', 18, currentY);

  currentY += 3.8;
  doc.text('Telp/Fax : 022-2504155, 08122174848', 18, currentY);

  currentY += 3;
  // Dotted line separator
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.setLineWidth(0.4);
  doc.line(18, currentY, 192, currentY);
  doc.setLineDashPattern([], 0);

  currentY += 6;
  // 2. TANGGAL
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.text(`Tanggal : ${dateFormatted}`, 18, currentY);

  currentY += 6;
  // 3. KEPADA YTH
  doc.text('Kepada Yth. :', 18, currentY);
  currentY += 4.5;
  doc.text(fullRecipient, 18, currentY);

  currentY += 6;
  // 4. PERIHAL
  doc.text(`Perihal : ${subjectText}`, 18, currentY);

  currentY += 6;
  // 5. PEMBUKA
  doc.setFont('times', 'normal');
  doc.text('Dengan Hormat,', 18, currentY);
  currentY += 4.5;
  const introStr = `Bersama dengan ini kami bermaksud mengajukan penawaran kerja sama dengan ${fullRecipient} dalam pengurusan ${workTitle}, Adapun detail sbb :`;
  const introLines = doc.splitTextToSize(introStr, 174);
  doc.text(introLines, 18, currentY);
  currentY += (introLines.length * 4.2) + 2;

  // 6. BAGIAN A: JENIS PENGURUSAN
  doc.setFont('times', 'bold');
  doc.text(`A. ${quotation.sectionATitle || 'Jenis Pengurusan'} :`, 18, currentY);
  currentY += 4.5;
  doc.setFont('times', 'normal');
  (quotation.items || []).forEach((it, idx) => {
    const rawLine = (it.description || '').split('\n')[0].replace(/^[0-9]+\.\s*/, '').trim() || `Pengurusan Pekerjaan ${idx + 1}`;
    doc.text(`${idx + 1}. pengurusan ${rawLine}.`, 22, currentY);
    currentY += 4.2;
  });

  currentY += 2;
  // 7. BAGIAN B: BIAYA PENGECEKAN
  doc.setFont('times', 'bold');
  doc.text(`B. ${quotation.sectionBTitle || 'Biaya Pengecekan'}`, 18, currentY);
  currentY += 2;

  // Build table data
  let rowNo = 1;
  const tableData: any[] = [];
  (quotation.items || []).forEach((it) => {
    const lines = (it.description || '').split('\n').filter(Boolean);
    const mainTitle = lines[0] ? `- ${lines[0].replace(/^[0-9]+\.\s*/, '').trim()}` : '';
    const otherLines = lines.slice(1).map(l => `   ${l}`).join('\n');
    const fullDesc = otherLines ? `${mainTitle}\n${otherLines}` : mainTitle;

    tableData.push([
      String(rowNo++),
      fullDesc,
      formatRupiahLetter(getItemSubtotal(it)),
      it.quantity && it.quantity > 1 ? `${it.quantity} Buah` : ''
    ]);
  });

  if (quotation.taxAmount && quotation.taxAmount > 0) {
    const taxRatePercent = quotation.taxRate ? (quotation.taxRate * 100).toFixed(1).replace('.0', '') : '2,5';
    tableData.push([
      String(rowNo++),
      `Pph 21 ${taxRatePercent}%`,
      formatRupiahLetter(quotation.taxAmount, true),
      ''
    ]);
  }

  // Row TOTAL
  tableData.push([
    { content: 'TOTAL BIAYA', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } },
    { content: formatRupiahLetter(quotation.totalAmount), styles: { halign: 'right', fontStyle: 'bold' } },
    { content: '', styles: { halign: 'center' } }
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['No', 'Detail Perijinan', 'Biaya', 'Catatan']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      font: 'times',
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
      valign: 'middle',
      textColor: [0, 0, 0],
      lineWidth: 0.25,
      lineColor: [0, 0, 0],
      cellPadding: 2
    },
    styles: {
      font: 'times',
      fontSize: 8.5,
      textColor: [0, 0, 0],
      lineWidth: 0.25,
      lineColor: [0, 0, 0],
      cellPadding: 2.2
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 28, halign: 'center' }
    },
    margin: { left: 18, right: 18 }
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 3.5;

  // Note text
  if (closingNoteText) {
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.text(`Note : ${closingNoteText}`, 18, currentY);
    currentY += 6;
  } else {
    currentY += 3;
  }

  // 8. BAGIAN C: DETAIL PERUSAHAAN & BANK
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.text('C. Detail Perusahaan & Bank', 18, currentY);
  currentY += 4;

  const bankData = [
    ['Nama Perusahaan / Pribadi', ':', 'Notaris/PPAT Nukantini Putri Parincha, SH., M.Kn.'],
    ['Contact Person', ':', 'Putri'],
    ['Alamat Perusahaan', ':', 'Komplek PPR ITB Kav F5, Dago Giri, Desa Mekarwangi,\nKecamatan Lembang, Kabupaten Bandung Barat'],
    ['No Telepon / Handphone', ':', '081-2217-4848'],
    ['No. NPWP', ':', '32.026.793.9.421.000'],
    ['Nama Bank', ':', 'BCA'],
    ['Cabang', ':', 'Dago - Bandung'],
    ['Nama Pemilik Rekening', ':', 'Nukantini Putri Parincha'],
    ['Nomor Rekening', ':', '777-0673016']
  ];

  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  bankData.forEach(([label, colon, val]) => {
    doc.text(label, 22, currentY);
    doc.text(colon, 65, currentY);
    const valLines = doc.splitTextToSize(val, 120);
    doc.text(valLines, 68, currentY);
    currentY += (valLines.length * 3.5);
  });

  currentY += 3;
  // 9. PENUTUP
  const closingStr = `Demikian kami sampaikan Surat Penawaran untuk ${workTitle}, atas perhatian dan kerjasamanya kami ucapkan terimakasih.`;
  const closingLines = doc.splitTextToSize(closingStr, 174);
  doc.text(closingLines, 18, currentY);
  currentY += (closingLines.length * 3.8) + 4;

  // 10. TANDA TANGAN
  doc.text('Hormat Kami', 18, currentY);
  currentY += 4;

  if (qrBase64) {
    try {
      doc.addImage(qrBase64, 'PNG', 18, currentY, 16, 16);
      currentY += 18;
    } catch {
      currentY += 15;
    }
  } else {
    currentY += 15;
  }

  doc.setFont('times', 'bold');
  doc.text('NUKANTINI PUTRI PARINCHA, SH., M.Kn.', 18, currentY);
  const nameWidth = doc.getTextWidth('NUKANTINI PUTRI PARINCHA, SH., M.Kn.');
  doc.setLineWidth(0.3);
  doc.line(18, currentY + 0.8, 18 + nameWidth, currentY + 0.8);

  doc.save(filename);
}

export async function printQuotation(
  quotation: Quotation, 
  publicUrl?: string, 
  lang: 'id' | 'en' = 'id',
  formatOverride?: 'standard' | 'letter'
) {
  const qrBase64 = await getQrCodeBase64(quotation, publicUrl);
  const html = generateQuotationHTML(quotation, qrBase64, true, lang, formatOverride);

  const win = window.open('', '_blank');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
  } else {
    alert('Harap izinkan popup browser untuk membuka dialog cetak penawaran.');
  }
}

export async function downloadQuotationPdf(
  quotation: Quotation, 
  publicUrl?: string, 
  lang: 'id' | 'en' = 'id',
  formatOverride?: 'standard' | 'letter'
) {
  const chosenFormat = formatOverride || quotation.formatType || 'standard';
  if (chosenFormat === 'letter') {
    return downloadQuotationLetterPdf(quotation, publicUrl);
  }

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
