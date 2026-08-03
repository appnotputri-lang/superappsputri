import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getSignatureImage } from './signatureUtils';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parts[0];
    const m = parseInt(parts[1], 10) - 1;
    const d = parts[2].padStart(2, '0');
    return `${d} ${MONTH_NAMES[m] || ''} ${y}`;
  }
  return dateStr;
}

async function handlePdfOutput(doc: jsPDF, filename: string, mode: 'download' | 'share' | 'blob', shareTitle: string) {
  if (mode === 'blob') {
    return doc.output('blob');
  }
  if (mode === 'download') {
    doc.save(filename);
  } else {
    try {
      const blob = doc.output('blob');
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: shareTitle, text: shareTitle });
      } else {
        doc.save(filename);
        alert('File PDF telah diunduh (Browser tidak mendukung fitur Share).');
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Sharing failed, falling back to download:', e);
        doc.save(filename);
      }
    }
  }
}

export function addNotaryLetterhead(doc: jsPDF, pageWidth: number) {
  const margin = 20;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('NOTARIS/PPAT', margin, 15);
  
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, 17, pageWidth - margin, 17);
  
  doc.setFontSize(11);
  doc.text('NUKANTINI PUTRI PARINCHA, SH., M.Kn', margin, 22);
  
  doc.setFontSize(8.5);
  doc.text('SK MENTERI HUKUM DAN HAK ASASI MANUSIA REPUBLIK INDONESIA', margin, 26.5);
  doc.text('NO. C-309.HT 03.01-Th. 2007, Tanggal 23 Agustus 2007', margin, 30.5);
  doc.text('SK. KEPALA BADAN PERTANAHAN NASIONAL REPUBLIK INDONESIA', margin, 34.5);
  doc.text('NO. 1 - XVI I- PPAT - 2009, Tanggal 12 Februari 2009', margin, 38.5);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Kantor', margin, 43.5);
  doc.text(':', margin + 18, 43.5);
  doc.text('Komp. PPR-ITB Kav. F-5 Dago Giri, Lembang, Kab. Bandung Barat', margin + 20, 43.5);
  
  doc.text('Telp/Fax', margin, 47.5);
  doc.text(':', margin + 18, 47.5);
  doc.text('08112007061', margin + 20, 47.5);
  
  // Double lines under letterhead
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.0);
  doc.line(margin, 51, pageWidth - margin, 51);
  doc.setLineWidth(0.3);
  doc.line(margin, 52, pageWidth - margin, 52);
}

export function addNotaryHeaderMinimal(doc: jsPDF, pageWidth: number) {
  const margin = 20;
  doc.setLineWidth(0.3);
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, 12, pageWidth - margin, 12);
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('NOTARIS/PPAT NUKANTINI PUTRI PARINCHA, SH., M.Kn', margin, 9);
}

export function addNotaryFooter(doc: jsPDF, pageWidth: number, pageHeight: number, runningTitle: string) {
  const margin = 20;
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8.5);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'italic');
    
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    
    doc.text(`${runningTitle} - Halaman ${i} dari ${pageCount}`, margin, pageHeight - 10);
  }
}

export function drawRichParagraph(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number = 5) {
  const words: { text: string; bold: boolean }[] = [];
  const parts = text.split('**');
  let isBold = false;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part === '') {
      isBold = !isBold;
      continue;
    }
    const subWords = part.split(/\s+/);
    for (const sw of subWords) {
      if (sw === '') continue;
      words.push({ text: sw, bold: isBold });
    }
    isBold = !isBold;
  }

  const lines: { text: string; bold: boolean }[][] = [];
  let currentLine: { text: string; bold: boolean }[] = [];
  let currentLineWidth = 0;

  for (const word of words) {
    doc.setFont('helvetica', word.bold ? 'bold' : 'normal');
    const wordWidth = doc.getTextWidth(word.text);
    const spaceWidth = doc.getTextWidth(' ');

    const extraSpace = currentLine.length > 0 ? spaceWidth : 0;
    if (currentLineWidth + extraSpace + wordWidth > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = [word];
      currentLineWidth = wordWidth;
    } else {
      currentLine.push(word);
      currentLineWidth += extraSpace + wordWidth;
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  let currentY = y;
  const standardSpaceWidth = doc.getTextWidth(' ');

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    const isLastLine = (l === lines.length - 1);

    if (isLastLine || line.length === 1) {
      // Draw with standard spacing
      let currentX = x;
      for (let i = 0; i < line.length; i++) {
        const w = line[i];
        doc.setFont('helvetica', w.bold ? 'bold' : 'normal');
        doc.text(w.text, currentX, currentY);
        currentX += doc.getTextWidth(w.text) + standardSpaceWidth;
      }
    } else {
      // Justify line
      let totalWordsWidth = 0;
      for (const w of line) {
        doc.setFont('helvetica', w.bold ? 'bold' : 'normal');
        totalWordsWidth += doc.getTextWidth(w.text);
      }
      const numGaps = line.length - 1;
      const gapWidth = (maxWidth - totalWordsWidth) / numGaps;

      let currentX = x;
      for (let i = 0; i < line.length; i++) {
        const w = line[i];
        doc.setFont('helvetica', w.bold ? 'bold' : 'normal');
        doc.text(w.text, currentX, currentY);
        currentX += doc.getTextWidth(w.text) + gapWidth;
      }
    }
    currentY += lineHeight;
  }
  return currentY;
}

export function drawCoverLetterMPD(doc: jsPDF, data: {
  notaryTitle: string;
  notaryName: string;
  skMenkumhamTitle: string;
  skMenkumhamNo: string;
  skBpnTitle: string;
  skBpnNo: string;
  officeAddress: string;
  officePhone: string;
  letterNumber: string;
  subject: string;
  attachment: string;
  letterCity: string;
  formattedLetterDate: string;
  recipientTitle: string;
  mpdLine1: string;
  mpdLine2: string;
  mpdLine3: string;
  mpdLine4: string;
  notaryCityJurisdiction: string;
  startDateStr: string;
  endDateStr: string;
  stampOffsetX: number;
  stampOffsetY: number;
  stampSize: number;
  showStamp: boolean;
}) {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;

  // Draw Kop Surat manually based on custom states!
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(data.notaryTitle, margin, 15);
  
  doc.setLineWidth(0.6);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, 17, pageWidth - margin, 17);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(data.notaryName, margin, 22);
  
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(data.skMenkumhamTitle, margin, 26.5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.skMenkumhamNo, margin, 30.5);
  doc.setFont('helvetica', 'bold');
  doc.text(data.skBpnTitle, margin, 34.5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.skBpnNo, margin, 38.5);
  
  const officeAddressText = data.officeAddress.trim().toLowerCase().startsWith('kantor') 
    ? data.officeAddress 
    : `Kantor : ${data.officeAddress}`;
  const officePhoneText = (data.officePhone.trim().toLowerCase().startsWith('telp') || data.officePhone.trim().toLowerCase().startsWith('fax')) 
    ? data.officePhone 
    : `Telp/Fax : ${data.officePhone}`;

  doc.setFont('helvetica', 'normal');
  doc.text(officeAddressText, margin, 42.5);
  doc.text(officePhoneText, margin, 46.5);

  let currentY = 56;

  // Metadata block
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  // Left side
  doc.text(`Nomor`, margin, currentY);
  doc.text(`: ${data.letterNumber}`, margin + 20, currentY);
  currentY += 5;
  doc.text(`Perihal`, margin, currentY);
  doc.text(`: ${data.subject}`, margin + 20, currentY);
  currentY += 5;
  doc.text(`Lampiran`, margin, currentY);
  doc.text(`: ${data.attachment}`, margin + 20, currentY);

  // Right side (x = pageWidth - margin - 75)
  let rightY = 56;
  const rightX = pageWidth - margin - 75;
  doc.text(`${data.letterCity}, ${data.formattedLetterDate}`, rightX, rightY);
  rightY += 8;
  doc.text(data.recipientTitle, rightX, rightY);
  rightY += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(data.mpdLine1, rightX, rightY);
  rightY += 5;
  doc.text(data.mpdLine2, rightX, rightY);
  rightY += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(data.mpdLine3, rightX, rightY);
  rightY += 5;
  doc.text(data.mpdLine4, rightX, rightY);

  currentY = Math.max(currentY, rightY) + 15;

  // Salutation
  doc.text('Dengan hormat,', margin, currentY);
  currentY += 10;

  // Body text
  const bodyText = `Guna memenuhi ketentuan Pasal 61 ayat 1 dari Undang-Undang Nomor 30 tahun 2004 tentang Jabatan Notaris, dengan ini kami sampaikan kepada Saudara salinan daftar akta-akta Notaris dan daftar lainnya yang telah dibuat di hadapan **${data.notaryName}**, Notaris di ${data.notaryCityJurisdiction} terhitung mulai tanggal ${data.startDateStr} sampai dengan ${data.endDateStr}.`;
  
  currentY = drawRichParagraph(doc, bodyText, margin, currentY, pageWidth - (margin * 2), 5);
  currentY += 15;

  // Closing & Signature Block
  if (currentY > pageHeight - 75) {
    doc.addPage();
    currentY = 30;
  }

  const sigX = pageWidth - margin - 75;
  doc.setFont('helvetica', 'normal');
  doc.text('Hormat saya,', sigX, currentY);
  currentY += 5;
  doc.text(`Notaris di ${data.notaryCityJurisdiction}`, sigX, currentY);
  
  // Stamp & Signature Image
  if (data.showStamp) {
    try {
      const signatureImg = getSignatureImage();
      const format = signatureImg.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      const stampW = data.stampSize / 4;
      const stampH = data.stampSize / 4;
      const offsetX_mm = data.stampOffsetX * 0.26;
      const offsetY_mm = data.stampOffsetY * 0.26;
      doc.addImage(signatureImg, format, sigX - 5 + offsetX_mm, currentY + 2 + offsetY_mm, stampW, stampH);
    } catch (e) {
      console.error('Error adding stamp image to PDF:', e);
    }
  }

  currentY += 45;
  doc.setFont('helvetica', 'bold');
  doc.text(data.notaryName, sigX, currentY);
  doc.line(sigX, currentY + 1, sigX + doc.getTextWidth(data.notaryName), currentY + 1);
}

export async function exportCoverLetterMPDToPdf(data: Parameters<typeof drawCoverLetterMPD>[1], mode: 'download' | 'share' | 'blob' = 'download') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawCoverLetterMPD(doc, data);
  const filename = `Surat_Pengantar_MPD_${data.formattedLetterDate.replace(/\s+/g, '_')}.pdf`;
  return await handlePdfOutput(doc, filename, mode, 'Surat Pengantar MPD');
}

export function drawDeedReport(doc: jsPDF, data: {
  monthName: string;
  year: number;
  deeds: any[];
  signatureDate: string;
  showStamp?: boolean;
}) {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  let currentY = 25;

  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const title1 = `SALINAN DAFTAR AKTA-AKTA NOTARIS NUKANTINI PUTRI PARINCHA, SH., M.Kn`;
  const splitTitle = doc.splitTextToSize(title1, pageWidth - 40);
  doc.text(splitTitle, 20, currentY, { align: 'left' });
  currentY += (splitTitle.length * 5);
  doc.text(`BULAN ${data.monthName.toUpperCase()} ${data.year}`, 20, currentY, { align: 'left' });
  currentY += 8;

  // Map deeds to autoTable rows
  const headers = [['NO. URUT', 'NO. BULANAN', 'TANGGAL', 'SIFAT AKTA', 'NAMA PENGHADAP / PARA PIHAK']];
  
  // Sort deeds by orderNumber (ascending)
  const sortedDeeds = [...data.deeds].sort((a, b) => {
    const orderA = parseInt(a.orderNumber || '0', 10);
    const orderB = parseInt(b.orderNumber || '0', 10);
    
    if (!isNaN(orderA) && !isNaN(orderB) && orderA !== orderB) {
      return orderA - orderB;
    }
    
    if (a.date !== b.date) {
      return (a.date || '').localeCompare(b.date || '');
    }
    
    const numA = parseInt(a.number || '0', 10);
    const numB = parseInt(b.number || '0', 10);
    return numA - numB;
  });

  const body = sortedDeeds.map((deed, idx) => {
    const orderNum = deed.orderNumber || deed.number || '';
    const monthlyNum = deed.number || (idx + 1).toString();
    const dateStr = formatDateIndo(deed.date || '');
    const titleStr = (deed.title || '').toUpperCase();

    let appearerLines: string[] = [];
    if (deed.appearers && deed.appearers.length > 0) {
      deed.appearers.forEach((app: any) => {
        const appNameUpper = (app.name || '').trim().toUpperCase();
        const isBoth = app.role === 'Both' || app.role === 'SelfAndProxy' || (app.bertindakSebagai && app.bertindakSebagai.toLowerCase().includes('diri sendiri') && app.bertindakSebagai.toLowerCase().includes('kuasa'));
        const isProxy = app.role === 'Proxy' || (app.bertindakSebagai && app.bertindakSebagai.toLowerCase().includes('kuasa') && !isBoth);

        const grantors = (app.grantors && app.grantors.length > 0)
          ? app.grantors
          : ((isProxy || isBoth) && deed.grantors && deed.grantors.length > 0 ? deed.grantors : []);

        const formatGrantorName = (gName: string) => {
          const trimmed = gName.trim().toUpperCase();
          if (trimmed.startsWith('QQ ') || trimmed.startsWith('QQ.')) {
            return trimmed;
          }
          return `QQ ${trimmed}`;
        };

        if (isBoth) {
          appearerLines.push(appNameUpper);
          appearerLines.push(appNameUpper);
          grantors.forEach((g: any) => {
            appearerLines.push(`  ${formatGrantorName(g.name)}`);
          });
        } else if (isProxy) {
          appearerLines.push(appNameUpper);
          grantors.forEach((g: any) => {
            appearerLines.push(`  ${formatGrantorName(g.name)}`);
          });
        } else {
          appearerLines.push(appNameUpper);
          if (app.position) {
            appearerLines.push(`  (${app.position.toUpperCase()})`);
          }
        }
      });
    }

    return [
      orderNum,
      monthlyNum,
      dateStr,
      titleStr,
      appearerLines.join('\n') || '-'
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: headers,
    body: body,
    theme: 'grid',
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      lineColor: [0, 0, 0],
      lineWidth: 0.2
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      font: 'helvetica'
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 45, halign: 'left' },
      4: { cellWidth: 'auto', halign: 'left' }
    },
    margin: { left: 20, right: 20, top: 20, bottom: 25 }
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 12;

  // Closing & Signature Block
  const closingText = `Salinan Daftar Akta-Akta yang telah dibuat oleh saya, Notaris, selama Bulan ${data.monthName} ${data.year}.`;
  const splitClosing = doc.splitTextToSize(closingText, pageWidth - 40);

  if (currentY > pageHeight - (75 + (splitClosing.length * 5))) {
    doc.addPage();
    currentY = 25;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(splitClosing, 20, currentY);
  currentY += (splitClosing.length * 5) + 10;

  const sigX = pageWidth - 95;
  const formattedSigDate = data.signatureDate ? (data.signatureDate.includes('Bandung') ? data.signatureDate : `Bandung Barat, ${data.signatureDate}`) : `Bandung Barat, 31 ${data.monthName} ${data.year}`;
  doc.text(formattedSigDate, sigX, currentY);
  currentY += 5;
  doc.text('Notaris di Kabupaten Bandung Barat,', sigX, currentY);

  if (data.showStamp) {
    try {
      const signatureImg = getSignatureImage();
      const format = signatureImg.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(signatureImg, format, sigX - 6, currentY + 2, 45, 45);
    } catch (e) {
      console.error('Error adding signature to PDF:', e);
    }
  }

  currentY += 45;
  doc.setFont('helvetica', 'bold');
  doc.text('NUKANTINI PUTRI PARINCHA, SH., M.Kn', sigX, currentY);
  doc.line(sigX, currentY + 1, sigX + doc.getTextWidth('NUKANTINI PUTRI PARINCHA, SH., M.Kn'), currentY + 1);
}

export async function exportDeedReportToPdf(data: Parameters<typeof drawDeedReport>[1], mode: 'download' | 'share' | 'blob' = 'download') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawDeedReport(doc, data);
  const filename = `Laporan_Akta_${data.monthName}_${data.year}.pdf`;
  return await handlePdfOutput(doc, filename, mode, 'Laporan Akta');
}

export function drawPrivateDeedReport(doc: jsPDF, data: {
  monthName: string;
  year: number;
  type: 'Legalisasi' | 'Waarmerking';
  items: any[];
  signatureDate: string;
  showStamp?: boolean;
}) {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  let currentY = 25;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const actionWord = data.type === 'Legalisasi' ? 'disahkan' : 'dibukukan';
  const titleText = `Salinan Daftar Surat di bawah tangan yang ${actionWord}, Bulan ${data.monthName} ${data.year}`;
  const splitTitle = doc.splitTextToSize(titleText, pageWidth - 40);
  doc.text(splitTitle, 20, currentY, { align: 'left' });
  currentY += (splitTitle.length * 5) + 8;

  const headers = [['No.', 'Tanggal Pembukuan', 'Nama yang menandatangani atau membubuhi cap jari', 'Tanggal dan Isi singkat']];

  const sortedItems = [...data.items].sort((a, b) => {
    const numA = parseInt(a.number) || 0;
    const numB = parseInt(b.number) || 0;
    return numA - numB;
  });

  let body = sortedItems.map((item) => {
    const regDateStr = formatDateIndo(item.registrationDate || '');
    const partiesStr = item.parties && item.parties.length > 0 ? item.parties.join('\n') : '-';
    const content = `${item.description || ''}${item.notes ? '\n' + item.notes : ''}`.trim() || '-';

    return [
      item.number || '-',
      regDateStr,
      partiesStr,
      content
    ];
  });

  if (body.length === 0) {
    body = [['-NIHIL-', '-NIHIL-', '-NIHIL-', '-NIHIL-']];
  }

  autoTable(doc, {
    startY: currentY,
    head: headers,
    body: body,
    theme: 'grid',
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      lineColor: [0, 0, 0],
      lineWidth: 0.2
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      font: 'helvetica'
    },
    columnStyles: body[0][0] === '-NIHIL-' ? {
      0: { halign: 'center', fontStyle: 'bold' },
      1: { halign: 'center', fontStyle: 'bold' },
      2: { halign: 'center', fontStyle: 'bold' },
      3: { halign: 'center', fontStyle: 'bold' }
    } : {
      0: { cellWidth: 35, halign: 'center' },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 50, halign: 'left' },
      3: { cellWidth: 'auto', halign: 'left' }
    },
    margin: { left: 20, right: 20, top: 20, bottom: 25 }
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 12;

  if (currentY > pageHeight - 75) {
    doc.addPage();
    currentY = 25;
  }

  const sigX = pageWidth - 95;
  doc.text(`Bandung Barat, ${data.signatureDate || `${data.monthName} ${data.year}`}`, sigX, currentY);
  currentY += 5;
  doc.text('Notaris di Kabupaten Bandung Barat,', sigX, currentY);

  if (data.showStamp) {
    try {
      const signatureImg = getSignatureImage();
      const format = signatureImg.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(signatureImg, format, sigX - 6, currentY + 2, 45, 45);
    } catch (e) {
      console.error('Error adding signature to PDF:', e);
    }
  }

  currentY += 45;
  doc.setFont('helvetica', 'bold');
  doc.text('NUKANTINI PUTRI PARINCHA, SH., M.Kn', sigX, currentY);
  doc.line(sigX, currentY + 1, sigX + doc.getTextWidth('NUKANTINI PUTRI PARINCHA, SH., M.Kn'), currentY + 1);
}

export async function exportPrivateDeedReportToPdf(data: Parameters<typeof drawPrivateDeedReport>[1], mode: 'download' | 'share' | 'blob' = 'download') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawPrivateDeedReport(doc, data);
  const filename = `Laporan_${data.type}_${data.monthName}_${data.year}.pdf`;
  return await handlePdfOutput(doc, filename, mode, `Laporan ${data.type}`);
}

export function drawProtestChequeReport(doc: jsPDF, data: {
  monthName: string;
  year: number;
  items: any[];
  signatureDate: string;
  showStamp?: boolean;
}) {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  let currentY = 25;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const titleText = `Salinan Daftar Protest Cheque dan Protes Wessel, Bulan ${data.monthName} ${data.year}`;
  const splitTitle = doc.splitTextToSize(titleText, pageWidth - 40);
  doc.text(splitTitle, 20, currentY, { align: 'left' });
  currentY += (splitTitle.length * 5) + 8;

  if (!data.items || data.items.length === 0) {
    currentY += 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('N I H I L', pageWidth / 2, currentY, { align: 'center' });
    currentY += 20;
  } else {
    const headers = [['NO', 'TANGGAL', 'NAMA BANK & NO. CEK', 'JUMLAH UANG', 'NAMA PEMOHON', 'NAMA PENARIK CEK']];

    const formatCurrency = (val: number) => {
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
    };

    const sortedItems = [...data.items].sort((a, b) => {
      const numA = parseInt(a.number) || parseInt(a.id) || 0;
      const numB = parseInt(b.number) || parseInt(b.id) || 0;
      return numA - numB;
    });

    const body = sortedItems.map((item, idx) => {
      const protestDateStr = formatDateIndo(item.protestDate || '');
      const bankAndCek = `${item.bankName}\nNo: ${item.chequeNumber}`;
      const amountStr = formatCurrency(item.amount || 0);

      return [
        (idx + 1).toString(),
        protestDateStr,
        bankAndCek,
        amountStr,
        item.applicantName || '-',
        item.drawerName || '-'
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: headers,
      body: body,
      theme: 'grid',
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineColor: [0, 0, 0],
        lineWidth: 0.2
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        font: 'helvetica'
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 38, halign: 'left' },
        3: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
        4: { cellWidth: 34, halign: 'left' },
        5: { cellWidth: 'auto', halign: 'left' }
      },
      margin: { left: 20, right: 20, top: 20, bottom: 25 }
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 12;
  }

  if (currentY > pageHeight - 75) {
    doc.addPage();
    currentY = 25;
  }

  const sigX = pageWidth - 95;
  doc.text(`Bandung Barat, ${data.signatureDate || `${data.monthName} ${data.year}`}`, sigX, currentY);
  currentY += 5;
  doc.text('Notaris di Kabupaten Bandung Barat,', sigX, currentY);

  if (data.showStamp) {
    try {
      const signatureImg = getSignatureImage();
      const format = signatureImg.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(signatureImg, format, sigX - 6, currentY + 2, 45, 45);
    } catch (e) {
      console.error('Error adding signature to PDF:', e);
    }
  }

  currentY += 45;
  doc.setFont('helvetica', 'bold');
  doc.text('NUKANTINI PUTRI PARINCHA, SH., M.Kn', sigX, currentY);
  doc.line(sigX, currentY + 1, sigX + doc.getTextWidth('NUKANTINI PUTRI PARINCHA, SH., M.Kn'), currentY + 1);
}

export async function exportProtestChequeReportToPdf(data: Parameters<typeof drawProtestChequeReport>[1], mode: 'download' | 'share' | 'blob' = 'download') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawProtestChequeReport(doc, data);
  const filename = `Laporan_Protest_Cheque_${data.monthName}_${data.year}.pdf`;
  return await handlePdfOutput(doc, filename, mode, 'Laporan Protest Cheque');
}

export function drawDeedAlphabeticalReport(doc: jsPDF, data: {
  monthName: string;
  year: number;
  filteredSections: any[];
  notaryName: string;
  city: string;
  showStamp?: boolean;
}) {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  let currentY = 25;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const titleText = `SALINAN DAFTAR AKTA-AKTA NOTARIS NUKANTINI PUTRI PARINCHA, SH., M.Kn`;
  const splitTitle = doc.splitTextToSize(titleText, pageWidth - 40);
  doc.text(splitTitle, 20, currentY, { align: 'left' });
  currentY += (splitTitle.length * 5);
  doc.text(`BULAN ${data.monthName.toUpperCase()} ${data.year}`, 20, currentY, { align: 'left' });
  currentY += 8;

  data.filteredSections.forEach((sec) => {
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 25;
    }

    doc.setFillColor(240, 240, 240);
    doc.rect(20, currentY, 15, 7, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(20, currentY, 15, 7, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(sec.letter, 27.5, currentY + 5.2, { align: 'center' });

    currentY += 10;

    const headers = [['NO. URUT', 'NO. BLN', 'TANGGAL', 'SIFAT AKTA', 'NAMA PENGHADAP']];
    let body: string[][] = [];

    if (sec.deeds.length === 0) {
      body = [['N', 'I', 'H', 'I', 'L']];
    } else {
      body = sec.deeds.map((item: any) => {
        const d = item.deed;
        const orderNum = d.orderNumber || d.number || '';
        const deedNum = item.monthlyNumber || d.number || '';
        const dateStr = formatDateIndo(d.deedDate || d.date || '');
        const titleStr = (d.deedTitle || d.title || '').toUpperCase();

        let appearersList: string[] = [];
        if (d.appearers && d.appearers.length > 0) {
          d.appearers.forEach((app: any) => {
            const appNameUpper = (app.name || '').trim().toUpperCase();
            appearersList.push(appNameUpper);
            if (app.position) {
              appearersList.push(`  (${app.position.toUpperCase()})`);
            }
          });
        } else {
          appearersList.push('-');
        }

        return [
          orderNum.toString(),
          deedNum.toString(),
          dateStr,
          titleStr,
          appearersList.join('\n')
        ];
      });
    }

    autoTable(doc, {
      startY: currentY,
      head: headers,
      body: body,
      theme: 'grid',
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineColor: [0, 0, 0],
        lineWidth: 0.2
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        font: 'helvetica'
      },
      columnStyles: sec.deeds.length === 0 ? {
        0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 45, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 'auto', halign: 'center', fontStyle: 'bold' }
      } : {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 45, halign: 'left' },
        4: { cellWidth: 'auto', halign: 'left' }
      },
      margin: { left: 20, right: 20, top: 20, bottom: 25 }
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 8;
  });

  const closingText = `Salinan Daftar Klapper dari Akta-Akta yang telah dibuat dihadapan saya, Notaris, selama bulan ${data.monthName} ${data.year}.`;
  const splitClosing = doc.splitTextToSize(closingText, pageWidth - 40);

  if (currentY > pageHeight - (75 + (splitClosing.length * 5))) {
    doc.addPage();
    currentY = 25;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(splitClosing, 20, currentY);
  currentY += (splitClosing.length * 5) + 10;

  const sigX = pageWidth - 95;
  doc.text(`${data.city || 'Bandung Barat'}, 29 ${data.monthName} ${data.year}`, sigX, currentY);
  currentY += 5;
  doc.text('Notaris di Kabupaten Bandung Barat,', sigX, currentY);

  if (data.showStamp) {
    try {
      const signatureImg = getSignatureImage();
      const format = signatureImg.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(signatureImg, format, sigX - 6, currentY + 2, 45, 45);
    } catch (e) {
      console.error('Error adding signature to PDF:', e);
    }
  }

  currentY += 45;
  doc.setFont('helvetica', 'bold');
  doc.text(data.notaryName.toUpperCase(), sigX, currentY);
  doc.line(sigX, currentY + 1, sigX + doc.getTextWidth(data.notaryName.toUpperCase()), currentY + 1);
}

export async function exportDeedAlphabeticalReportToPdf(data: Parameters<typeof drawDeedAlphabeticalReport>[1], mode: 'download' | 'share' | 'blob' = 'download') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawDeedAlphabeticalReport(doc, data);
  const filename = `Klapper_Akta_${data.monthName}_${data.year}.pdf`;
  return await handlePdfOutput(doc, filename, mode, 'Klapper Akta');
}

export function buildAlphabeticalSections(sourceDeeds: any[]) {
  const ALPHABET_LIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  
  const sortedDeeds = [...sourceDeeds].sort((a, b) => {
    const orderA = parseInt(a.orderNumber || '0', 10);
    const orderB = parseInt(b.orderNumber || '0', 10);
    if (!isNaN(orderA) && !isNaN(orderB) && orderA !== orderB) {
      return orderA - orderB;
    }
    if (a.date !== b.date) {
      return (a.date || '').localeCompare(b.date || '');
    }
    const numA = parseInt(a.number || '0', 10);
    const numB = parseInt(b.number || '0', 10);
    return numA - numB;
  });

  const deedIndexMap = new Map<string, number>();
  sortedDeeds.forEach((d, idx) => {
    if (d.id) deedIndexMap.set(d.id, idx + 1);
  });

  const sections: { letter: string; deeds: any[] }[] = [];

  ALPHABET_LIST.forEach((letter) => {
    const letterDeeds: any[] = [];
    sortedDeeds.forEach((d) => {
      if (!d.appearers || d.appearers.length === 0) return;
      const matchingApps = d.appearers.filter((app: any) => {
        if (!app.name) return false;
        return app.name.trim().toUpperCase().startsWith(letter);
      });

      if (matchingApps.length > 0) {
        letterDeeds.push({
          deed: d,
          monthlyNumber: deedIndexMap.get(d.id) || (parseInt(d.number, 10) || 0)
        });
      }
    });

    sections.push({
      letter,
      deeds: letterDeeds
    });
  });

  return sections;
}

export async function exportAllNotaryReportsToPdf(
  data: {
    coverLetter: Parameters<typeof drawCoverLetterMPD>[1];
    deedReport: Parameters<typeof drawDeedReport>[1];
    deedAlphabeticalReport: Parameters<typeof drawDeedAlphabeticalReport>[1];
    legalisasiReport: Parameters<typeof drawPrivateDeedReport>[1];
    waarmerkingReport: Parameters<typeof drawPrivateDeedReport>[1];
    protestChequeReport: Parameters<typeof drawProtestChequeReport>[1];
    filename?: string;
  },
  mode: 'download' | 'share' | 'blob' = 'download'
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // 1. Surat Pengantar MPD
  drawCoverLetterMPD(doc, data.coverLetter);

  // 2. Laporan Akta
  doc.addPage();
  drawDeedReport(doc, data.deedReport);

  // 3. Klapper Akta
  doc.addPage();
  drawDeedAlphabeticalReport(doc, data.deedAlphabeticalReport);

  // 4. Legalisasi
  doc.addPage();
  drawPrivateDeedReport(doc, data.legalisasiReport);

  // 5. Waarmerking
  doc.addPage();
  drawPrivateDeedReport(doc, data.waarmerkingReport);

  // 6. Protest Cheque
  doc.addPage();
  drawProtestChequeReport(doc, data.protestChequeReport);

  const monthName = data.deedReport.monthName || 'Bulan';
  const year = data.deedReport.year || new Date().getFullYear();
  const filename = data.filename || `Laporan Notaris ${monthName} ${year}.pdf`;

  return await handlePdfOutput(doc, filename, mode, `Laporan Notaris ${monthName} ${year}`);
}
