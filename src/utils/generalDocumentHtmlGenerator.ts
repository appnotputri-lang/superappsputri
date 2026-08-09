import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GeneralDocumentData } from '../types';

export function formatDateIndonesian(dateStr?: string, includeDay = true): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const dayNum = parseInt(parts[2], 10);
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      
      const d = new Date(year, monthIdx, dayNum);
      const monthName = months[monthIdx] || parts[1];
      const dayName = days[d.getDay()];
      
      if (includeDay && dayName) {
        return `${dayName}, ${dayNum} ${monthName} ${year}`;
      }
      return `${dayNum} ${monthName} ${year}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function formatDate(dateStr?: string): string {
  return formatDateIndonesian(dateStr, false);
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

export async function getQrCodeBase64(docData: GeneralDocumentData, publicUrl?: string): Promise<string> {
  const token = docData.publicToken || docData.id || docData.referenceNo;
  const targetUrl = publicUrl || `${window.location.origin}/doc/${token}`;

  try {
    const dataUrl = await QRCode.toDataURL(targetUrl, { width: 240, margin: 1 });
    if (dataUrl) return dataUrl;
  } catch (e) {
    console.warn('QRCode library error, using qrserver fallback', e);
  }

  const qrServerUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(targetUrl)}`;
  return await urlToBase64(qrServerUrl);
}

export function getFooterText(docData: GeneralDocumentData): string {
  return 'Saya yang bertandatangan dibawah ini, menyatakan telah menerima dokumen tersebut diatas, Tanda Terima ini mohon di tandatangani dan dikirim ke alamat KOMP PPR ITB Kav F-5, Mekarwangi, Lembang, Kabupaten Bandung Barat, atau dapat di scan dan dikirim melalui email ke alamat notarisppatputri@gmail.com, apabila Tanda Terima ini tidak dikirim kembali, maka Tanda Terima ini dinyatakan sah dan dianggap telah diterima apabila setatus dalam pengiriman expedisi dinyatakan telah diterima.';
}

export function generateGeneralDocumentHTML(docData: GeneralDocumentData, qrBase64: string, autoPrint = false): string {
  const isDelivery = docData.docType === 'DELIVERY';
  const docTitle = isDelivery ? 'SURAT JALAN DOKUMEN' : 'TANDA TERIMA BERKAS';
  const rightBoxLabel = isDelivery ? 'UNTUK' : 'PENERIMA';
  const footerNote = getFooterText(docData);

  const itemsRows = (docData.items || []).map((item, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 12px; font-size: 12px; color: #475569; text-align: center; vertical-align: top;">${idx + 1}</td>
      <td style="padding: 10px 12px; font-size: 12px; color: #0f172a; line-height: 1.5; vertical-align: top; font-weight: 500;">
        ${(item.description || '').replace(/\n/g, '<br/>')}
      </td>
      <td style="padding: 10px 12px; font-size: 12px; text-align: center; vertical-align: top; font-weight: 600; color: #0f172a;">
        ${item.type || 'Asli'}
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <title>${docTitle} - ${docData.referenceNo}</title>
      <style>
        @page { size: A4; margin: 0; }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact;
        }
        .page-container {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm 20mm;
          box-sizing: border-box;
          margin: 0 auto;
          position: relative;
          background: #ffffff;
        }
        .brand-header-name {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.25;
        }
        .brand-header-sub {
          font-size: 10px;
          color: #64748b;
          margin-top: 3px;
          line-height: 1.4;
        }
        .doc-no-label {
          font-size: 10px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          text-align: right;
        }
        .doc-no-val {
          font-size: 20px;
          font-weight: 900;
          color: #0f172a;
          text-align: right;
          line-height: 1.1;
        }
        .doc-title {
          font-size: 22px;
          font-weight: 900;
          color: #0f172a;
          text-transform: uppercase;
          text-align: center;
          letter-spacing: 0.02em;
        }
        .doc-date {
          font-size: 12px;
          color: #64748b;
          text-align: center;
          margin-top: 4px;
        }
        .info-box {
          background-color: #f8fafc;
          border-radius: 8px;
          padding: 14px 16px;
          height: 100%;
          box-sizing: border-box;
        }
        .info-box-title {
          font-size: 10px;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
        }
        .table-custom {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          border: 1px solid #e2e8f0;
        }
        .table-custom th {
          background-color: #0f172a;
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          padding: 10px 12px;
        }
        .disclaimer-box {
          background-color: #f8fafc;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 9.5px;
          color: #64748b;
          font-style: italic;
          line-height: 1.4;
          text-align: justify;
          margin-top: 20px;
        }
        @media print {
          body { background: #fff; }
          .page-container { padding: 12mm 15mm; }
        }
      </style>
    </head>
    <body>
      <div class="page-container">
        <!-- HEADER -->
        <table style="width: 100%; margin-bottom: 12px; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: top;">
              <div class="brand-header-name">
                Notaris/PPAT Nukantini Putri Parincha,SH.M.kn
              </div>
              <div class="brand-header-sub">
                Komplek PPR ITB F5, Dago Giri, Mekarwangi, Lembang, Bandung Barat, 40391<br />
                Email: notarisppatputri@gmail.com | Telp: 08112007061
              </div>
            </td>
            <td style="vertical-align: top; text-align: right; width: 120px;">
              <div class="doc-no-label">NOMOR</div>
              <div class="doc-no-val">${docData.referenceNo}</div>
            </td>
          </tr>
        </table>

        <!-- DIVIDER LINE -->
        <div style="height: 2px; background-color: #0f172a; margin-bottom: 24px;"></div>

        <!-- TITLE & DATE -->
        <div style="margin-bottom: 24px;">
          <div class="doc-title">${docTitle}</div>
          <div class="doc-date">Tanggal: ${formatDateIndonesian(docData.date, true)}</div>
        </div>

        <!-- SENDER & RECEIVER BOXES -->
        <table style="width: 100%; margin-bottom: 24px; border-collapse: separate; border-spacing: 16px 0; margin-left: -16px; margin-right: -16px;">
          <tr>
            <td style="width: 50%; vertical-align: top;">
              <div class="info-box">
                <div class="info-box-title">PENGIRIM</div>
                <div style="font-size: 13px; font-weight: 800; color: #0f172a; line-height: 1.3;">
                  Notaris/PPAT Nukantini Putri Parincha,SH.M.kn
                </div>
              </div>
            </td>
            <td style="width: 50%; vertical-align: top;">
              <div class="info-box">
                <div class="info-box-title">${rightBoxLabel}</div>
                <div style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; line-height: 1.3;">
                  ${docData.clientPic ? docData.clientPic.toUpperCase() : docData.clientName.toUpperCase()}
                </div>
                ${docData.clientPic && docData.clientName ? `
                  <div style="font-size: 11px; font-weight: 700; color: #475569; margin-top: 2px; text-transform: uppercase;">
                    (${docData.clientName})
                  </div>
                ` : ''}
                ${docData.deliveryMethod ? `
                  <div style="font-size: 11px; color: #64748b; margin-top: 6px;">
                    Via: ${docData.deliveryMethod}
                  </div>
                ` : ''}
              </div>
            </td>
          </tr>
        </table>

        <!-- ITEMS TABLE -->
        <table class="table-custom">
          <thead>
            <tr>
              <th style="width: 45px; text-align: center;">No</th>
              <th style="text-align: left;">Deskripsi Berkas / Barang</th>
              <th style="width: 130px; text-align: center;">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows.length > 0 ? itemsRows : `
              <tr>
                <td colspan="3" style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
                  Belum ada daftar dokumen.
                </td>
              </tr>
            `}
          </tbody>
        </table>

        <!-- DISCLAIMER BOX -->
        <div class="disclaimer-box">
          ${footerNote}
        </div>

        <!-- SIGNATURE AREA -->
        <table style="width: 100%; margin-top: 40px; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; text-align: center; vertical-align: top; padding-right: 20px;">
              <div style="font-size: 11px; color: #64748b; margin-bottom: 50px;">Diserahkan Oleh,</div>
              <div style="border-bottom: 1px solid #0f172a; width: 70%; margin: 0 auto; padding-bottom: 2px; font-size: 11px; font-weight: 800; color: #0f172a; text-transform: uppercase;">
                ${docData.officerName || 'SITI NUR AZIZAH'}
              </div>
              <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
                Tanda Tangan & Nama Terang
              </div>
            </td>
            <td style="width: 50%; text-align: center; vertical-align: top; padding-left: 20px;">
              <div style="font-size: 11px; color: #64748b;">${formatDateIndonesian(docData.date, false)}</div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 50px;">Diterima Oleh,</div>
              <div style="border-bottom: 1px solid #0f172a; width: 70%; margin: 0 auto; height: 16px;"></div>
              <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
                Tanda Tangan & Stempel
              </div>
            </td>
          </tr>
        </table>
      </div>

      ${autoPrint ? `<script>window.onload = function() { window.print(); }</script>` : ''}
    </body>
    </html>
  `;
}

export async function printGeneralDocument(docData: GeneralDocumentData, publicUrl?: string) {
  const qrBase64 = await getQrCodeBase64(docData, publicUrl);
  const html = generateGeneralDocumentHTML(docData, qrBase64, true);

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    alert('Pop-up terblokir. Silakan izinkan pop-up untuk mencetak dokumen.');
  }
}

export async function downloadGeneralDocumentPdf(docData: GeneralDocumentData, publicUrl?: string) {
  const isDelivery = docData.docType === 'DELIVERY';
  const prefix = isDelivery ? 'SURAT_JALAN' : 'TANDA_TERIMA';
  const cleanRef = (docData.referenceNo || 'DOC').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${prefix}_${cleanRef}.pdf`;

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  // Top header brand left
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Notaris/PPAT Nukantini Putri Parincha,SH.M.kn', 15, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Komplek PPR ITB F5, Dago Giri, Mekarwangi, Lembang, Bandung Barat, 40391\nEmail: notarisppatputri@gmail.com | Telp: 08112007061', 15, 23);

  // Top header right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('NOMOR', 195, 18, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(docData.referenceNo || '000', 195, 24, { align: 'right' });

  // Divider line
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(15, 30, 195, 30);

  // Title
  const docTitle = isDelivery ? 'SURAT JALAN DOKUMEN' : 'TANDA TERIMA BERKAS';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(docTitle, 105, 39, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Tanggal: ${formatDateIndonesian(docData.date, true)}`, 105, 44, { align: 'center' });

  // Boxes
  const rightBoxLabel = isDelivery ? 'UNTUK' : 'PENERIMA';

  // Left Box (Pengirim)
  doc.setFillColor(248, 250, 252);
  doc.rect(15, 49, 87, 24, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(148, 163, 184);
  doc.text('PENGIRIM', 18, 54);
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Notaris/PPAT Nukantini Putri\nParincha,SH.M.kn', 18, 60);

  // Right Box (Untuk)
  doc.setFillColor(248, 250, 252);
  doc.rect(108, 49, 87, 24, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(148, 163, 184);
  doc.text(rightBoxLabel, 111, 54);

  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  const recipientName = docData.clientPic ? docData.clientPic.toUpperCase() : docData.clientName.toUpperCase();
  doc.text(recipientName, 111, 60);

  let rY = 64;
  if (docData.clientPic && docData.clientName) {
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`(${docData.clientName})`, 111, rY);
    rY += 4;
  }
  if (docData.deliveryMethod) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Via: ${docData.deliveryMethod}`, 111, rY);
  }

  // Items Table
  const tableData = (docData.items || []).map((item, index) => [
    (index + 1).toString(),
    item.description || '-',
    item.type || 'Asli'
  ]);

  autoTable(doc, {
    startY: 78,
    head: [['No', 'Deskripsi Berkas / Barang', 'Keterangan']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { halign: 'left' },
      2: { halign: 'center', cellWidth: 30, fontStyle: 'bold' }
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      textColor: [15, 23, 42]
    },
    margin: { left: 15, right: 15 }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Disclaimer Box
  const disclaimerText = getFooterText(docData);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);

  const splitDisclaimer = doc.splitTextToSize(disclaimerText, 172);
  const boxHeight = splitDisclaimer.length * 4 + 6;
  doc.setFillColor(248, 250, 252);
  doc.rect(15, finalY, 180, boxHeight, 'F');

  doc.text(disclaimerText, 19, finalY + 5, { align: 'justify', maxWidth: 172 });

  const sigY = finalY + boxHeight + 25;

  // Signatures
  // Left: Diserahkan Oleh
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Diserahkan Oleh,', 50, sigY, { align: 'center' });

  const officerName = docData.officerName || 'SITI NUR AZIZAH';
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(officerName.toUpperCase(), 50, sigY + 20, { align: 'center' });
  doc.setLineWidth(0.3);
  doc.setDrawColor(15, 23, 42);
  doc.line(25, sigY + 21, 75, sigY + 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Tanda Tangan & Nama Terang', 50, sigY + 25, { align: 'center' });

  // Right: Diterima Oleh
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(formatDateIndonesian(docData.date, false), 150, sigY - 5, { align: 'center' });
  doc.text('Diterima Oleh,', 150, sigY, { align: 'center' });

  doc.line(125, sigY + 21, 175, sigY + 21);
  doc.setFontSize(7.5);
  doc.text('Tanda Tangan & Stempel', 150, sigY + 25, { align: 'center' });

  doc.save(filename);
}
