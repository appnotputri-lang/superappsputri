import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProjectReportItem } from '../types';
import { getGroupedReports, formatAgendaLabel, getProjectStatusDisplay, getCleanTransitionComment } from './firestoreService';
import { getJakartaDateString, formatJakartaPrintDate } from '../dateUtils';

export { formatJakartaPrintDate };

function mapStatusToDisplay(status: string, metadata?: any): string {
  const displayStatus = getProjectStatusDisplay(status, metadata);
  const cleanS = (displayStatus || '').toUpperCase().trim();

  if (cleanS === 'PROGRES MINUTA') {
    return 'PROGRES MINUTA';
  }
  if (cleanS.includes('SELESAI') || cleanS.includes('FINAL') || cleanS.includes('COMPLETE') || cleanS.includes('SIAP_KIRIM')) {
    return 'SELESAI';
  }
  if (cleanS.includes('PERBAIKAN') || cleanS.includes('REVISION') || cleanS.includes('DIKEMBALIKAN')) {
    return 'PERBAIKAN';
  }
  if (cleanS.includes('DRAFTING') || cleanS.includes('PROSES') || cleanS.includes('KOREKSI')) {
    return 'PROSES DRAFTING';
  }
  if (cleanS === 'DRAFT NOTULEN DI KIRIM' || cleanS === 'DRAFT NOTULEN DIKIRIM' || cleanS === 'DRAFT AKTA DIKIRIM' || cleanS === 'REVIEW NOTULEN' || cleanS === 'DRAFT AKTA & NOTULEN DIKIRIM') {
    return 'REVIEW NOTULEN';
  }
  if (cleanS === 'SUDAH CETAK AKTA' || cleanS === 'NIB SEDANG DI INPUT') {
    return 'NIB SEDANG DI INPUT';
  }
  if (cleanS === 'SUDAH INPUT AHU' || cleanS === 'INPUT AHU') {
    return 'INPUT AHU';
  }
  return displayStatus;
}

function getStatusColors(status: string): { bg: [number, number, number]; text: [number, number, number] } {
  const s = (status || '').toUpperCase().trim();
  if (s === 'PROSES DRAFTING' || s === 'DRAFTING' || s === 'DRAFT') {
    return {
      bg: [254, 243, 199], // amber-100
      text: [180, 83, 9] // amber-700
    };
  }
  if (s === 'REVIEW NOTULEN' || s === 'DRAFT NOTULEN DI KIRIM' || s === 'DRAFT NOTULEN DIKIRIM' || s === 'DRAFT AKTA DIKIRIM') {
    return {
      bg: [219, 234, 254], // blue-100
      text: [29, 78, 216] // blue-700
    };
  }
  if (s === 'NIB SEDANG DI INPUT' || s === 'SUDAH CETAK AKTA') {
    return {
      bg: [243, 232, 255], // purple-100
      text: [107, 33, 168] // purple-800
    };
  }
  if (s === 'INPUT AHU' || s === 'SUDAH INPUT AHU') {
    return {
      bg: [204, 251, 241], // teal-100
      text: [15, 118, 110] // teal-700
    };
  }
  if (s === 'PROGRES MINUTA') {
    return {
      bg: [254, 243, 199], // amber-100
      text: [120, 53, 4] // amber-900
    };
  }
  if (s === 'SELESAI' || s === 'FINAL' || s === 'COMPLETE' || s === 'SIAP_KIRIM') {
    return {
      bg: [209, 250, 229], // emerald-100
      text: [4, 120, 87] // emerald-700
    };
  }
  if (s === 'PERBAIKAN' || s === 'REVISION' || s === 'DIKEMBALIKAN') {
    return {
      bg: [254, 226, 226], // red-100
      text: [185, 28, 28] // red-700
    };
  }
  return {
    bg: [241, 245, 249], // slate-100
    text: [71, 85, 105] // slate-600
  };
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export interface GeneratedPdfReport {
  arrayBuffer: ArrayBuffer;
  base64: string;
  fileName: string;
  totalActiveProjects: number;
  totalClients: number;
}

/**
 * Generates the official Landscape A4 "LAPORAN PROYEK AKTIF" PDF
 */
export async function generateActiveProjectsPdf(
  activeReports: ProjectReportItem[],
  date: Date = new Date()
): Promise<GeneratedPdfReport> {
  const doc = new jsPDF('l', 'mm', 'a4');
  const groupedCatReports = getGroupedReports(activeReports);

  // Header Style
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(12, 36, 68); // #0c2444 Navy
  doc.text('LAPORAN PROYEK AKTIF', 14, 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(12, 36, 68);
  doc.text('KANTOR NOTARIS NUKANTINI PUTRI PARINCHA SH.,M.Kn', 14, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);

  const printDateStr = formatJakartaPrintDate(date);
  doc.text(`Kategori: Semua Kategori | Jenis: Semua Jenis | Status: Semua Status | Tanggal Cetak: ${printDateStr}`, 14, 28);

  // Separator line (Landscape width: 297mm - 14mm*2 = 269mm -> x2 = 283mm)
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 32, 283, 32);

  let currentY = 40;

  if (activeReports.length > 0) {
    // Section Header with vertical amber bar
    doc.setFillColor(245, 158, 11); // Amber-500 (#f59e0b)
    doc.rect(14, currentY - 4.5, 2.5, 5.5, 'F');

    // Group title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42); // Slate-900 (#0f172a)
    doc.text(`KATEGORI STATUS: SEDANG BERJALAN (${groupedCatReports.length} Klien / ${activeReports.length} Berkas)`, 18.5, currentY);

    currentY = currentY + 4;

    // PDF Columns in Landscape Mode
    const tableColumn = [
      'No',
      'Nama PT / Klien',
      'Nama PIC',
      'Jenis Pekerjaan & Agenda Perubahan',
      'Status Terakhir',
      'Catatan Transisi'
    ];

    // Build Table Rows
    const tableRows: any[] = [];
    groupedCatReports.forEach((rec, idx) => {
      const rowSpanVal = rec.items.length;
      const picDisplay = rec.picName && rec.picName !== '-' ? rec.picName : '-';

      rec.items.forEach((item, itemIdx) => {
        const displayStatus = mapStatusToDisplay(item.status, item.metadata);
        const noteText = getCleanTransitionComment(item.lastTransitionComment);

        // Support RUPS LB Agenda Perubahan
        let pekerjaanText = item.pekerjaan.toUpperCase();
        const isRupsLb =
          item.pekerjaan.toUpperCase().includes('RUPS') ||
          (item.changeAgendas && item.changeAgendas.length > 0);

        if (isRupsLb && item.changeAgendas && item.changeAgendas.length > 0) {
          const agendasFormatted = item.changeAgendas
            .map((ag: string) => `• ${formatAgendaLabel(ag)}`)
            .join('\n');
          pekerjaanText = `${pekerjaanText}\n${agendasFormatted}`;
        }

        if (itemIdx === 0) {
          tableRows.push([
            { content: (idx + 1).toString(), rowSpan: rowSpanVal, styles: { halign: 'center' as const, valign: 'middle' as const } },
            { content: rec.namaPt.toUpperCase(), rowSpan: rowSpanVal, styles: { valign: 'middle' as const } },
            { content: picDisplay, rowSpan: rowSpanVal, styles: { valign: 'middle' as const } },
            pekerjaanText,
            displayStatus.toUpperCase(),
            noteText
          ]);
        } else {
          tableRows.push([
            pekerjaanText,
            displayStatus.toUpperCase(),
            noteText
          ]);
        }
      });
    });

    // Generate Table with AutoTable
    autoTable(doc, {
      startY: currentY,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 3.5, bottom: 3.5, left: 3.5, right: 3.5 },
        valign: 'middle',
        lineColor: [226, 232, 240],
        lineWidth: 0.15
      },
      headStyles: {
        fillColor: [12, 36, 68], // Navy #0c2444
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left',
        fontSize: 8,
        cellPadding: { top: 4, bottom: 4, left: 3.5, right: 3.5 }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // slate-50
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 48, fontStyle: 'bold', halign: 'left' },
        2: { cellWidth: 32, halign: 'left' },
        3: { cellWidth: 72, halign: 'left' },
        4: { cellWidth: 38, halign: 'center' },
        5: { cellWidth: 69, halign: 'left' }
      },
      willDrawCell: data => {
        if (data.column.index === 4 && data.cell.section === 'body') {
          (data.cell as any).rawStatusText = data.cell.text.join(' ') || '';
          data.cell.text = [];
        }
      },
      didDrawCell: data => {
        if (data.column.index === 4 && data.cell.section === 'body') {
          const statusText = (data.cell as any).rawStatusText || '';
          if (statusText) {
            const colors = getStatusColors(statusText);
            const cell = data.cell;

            doc.setFont('helvetica', 'bold');
            const fontSize = statusText.length > 20 ? 5.5 : 6.5;
            doc.setFontSize(fontSize);

            const maxPillWidth = cell.width - 4;
            const lines = doc.splitTextToSize(statusText, maxPillWidth - 4);

            const lineHeight = fontSize === 5.5 ? 2.5 : 2.8;
            const pillHeight = Math.max(5, lines.length * lineHeight + 1.8);
            const pillX = cell.x + (cell.width - maxPillWidth) / 2;
            const pillY = cell.y + (cell.height - pillHeight) / 2;

            // Draw rounded rectangle for pill background
            doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
            doc.roundedRect(pillX, pillY, maxPillWidth, pillHeight, 1.2, 1.2, 'F');

            // Draw centered text
            doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
            lines.forEach((line: string, i: number) => {
              const offset = (pillHeight - lines.length * lineHeight) / 2;
              const lineY = pillY + offset + i * lineHeight + lineHeight * 0.82;
              doc.text(line, cell.x + cell.width / 2, lineY, { align: 'center' });
            });
          }
        }
      },
      didDrawPage: data => {
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;

        // Thin footer separator line
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.3);
        doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);

        // Footer page counter
        const pageStr = `Halaman ${data.pageNumber}`;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(pageStr, 14, pageHeight - 9);

        // Footer branding
        const brandingStr = 'SuperApps Putri — Sistem Manajemen Proyek Notaris';
        doc.text(brandingStr, pageWidth - 14, pageHeight - 9, { align: 'right' });
      }
    });
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text('Tidak ada laporan dokumen pekerjaan aktif saat ini.', 14, currentY);
  }

  const ymd = getJakartaDateString(date);

  const fileName = `Laporan_Proyek_Aktif_${ymd}.pdf`;
  const arrayBuffer = doc.output('arraybuffer');
  const base64 = arrayBufferToBase64(arrayBuffer);

  return {
    arrayBuffer,
    base64,
    fileName,
    totalActiveProjects: activeReports.length,
    totalClients: groupedCatReports.length
  };
}
