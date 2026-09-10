import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DailyReportRow, PpatProfileConfig } from '../types/ppat';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function exportPpatReportToPdf(params: {
  month: number;
  year: number;
  rows: DailyReportRow[];
  config: PpatProfileConfig;
  signatureDate?: string;
  showStamp?: boolean;
}) {
  const { month, year, rows, config, signatureDate } = params;
  const monthName = MONTH_NAMES[month - 1];

  // Hitung total akta pada bulan ini untuk mengecek apakah laporan berstatus NIHIL
  const totalDeeds = rows.reduce((acc, r) => acc + (r.deeds?.length || 0), 0);
  const isNihilMonth = totalDeeds === 0;

  // Create A4 Landscape document (297mm x 210mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8; // Margin tepi kiri & kanan 8mm (lebar tabel 281mm)

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isNihilMonth ? 10.5 : 11);
  doc.text('LAPORAN BULANAN PEMBUATAN AKTA PPAT', pageWidth / 2, isNihilMonth ? 8.5 : 10, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(isNihilMonth ? 8 : 8.5);
  doc.text(`Bulan: ${monthName.toUpperCase()} ${year}`, pageWidth / 2, isNihilMonth ? 12 : 14, { align: 'center' });

  // Sub-header PPAT info (Kiri) & Instansi Tujuan (Kanan)
  doc.setFontSize(isNihilMonth ? 7 : 7.5);
  const subHeaderY = isNihilMonth ? 16 : 18.5;
  const lineSpacing = isNihilMonth ? 3.0 : 3.4;

  doc.text(`Nama PPAT : ${config.ppatName}`, margin, subHeaderY);
  doc.text(`Daerah Kerja : ${config.workingArea}`, margin, subHeaderY + lineSpacing);
  doc.text(`Alamat Kantor : ${config.officeAddress}${config.skNumber ? `  (SK: ${config.skNumber})` : ''}`, margin, subHeaderY + lineSpacing * 2);

  doc.text(`Kepada Yth:`, pageWidth - 80, subHeaderY);
  doc.text(`1. Kepala Kantor Pertanahan ${config.workingArea}`, pageWidth - 80, subHeaderY + lineSpacing);
  doc.text(`2. Kepala Kantor Pelayanan Pajak Pratama`, pageWidth - 80, subHeaderY + lineSpacing * 2);

  // Build Table Data
  let currentDeedOrder = 0;
  const tableRows: any[] = [];

  rows.forEach(dayRow => {
    if (dayRow.isWeekend || dayRow.isHoliday) {
      const holidayLabel = dayRow.holidayInfo?.name ? `LIBUR (${dayRow.holidayInfo.name})` : 'LIBUR';
      tableRows.push({
        no: dayRow.dayNumber,
        akta: `${String(dayRow.dayNumber).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
        bentuk: '—',
        pengalih: '—',
        penerima: '—',
        hak: '—',
        letak: '—',
        luasTanah: '—',
        luasBgn: '—',
        harga: '—',
        pbb: '—',
        ssp: '—',
        ssb: '—',
        ket: holidayLabel,
        isHoliday: true
      });
    } else if (dayRow.isNihil || dayRow.deeds.length === 0) {
      tableRows.push({
        no: dayRow.dayNumber,
        akta: `${String(dayRow.dayNumber).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
        bentuk: '—',
        pengalih: '—',
        penerima: '—',
        hak: '—',
        letak: '—',
        luasTanah: '—',
        luasBgn: '—',
        harga: '—',
        pbb: '—',
        ssp: '—',
        ssb: '—',
        ket: 'NIHIL',
        isNihil: true
      });
    } else {
      // Day with deeds
      dayRow.deeds.forEach((deed, dIdx) => {
        currentDeedOrder++;
        const pbbStr = deed.spptPbbNopYear || (deed.spptPbbNjop ? `NJOP: Rp ${deed.spptPbbNjop.toLocaleString('id-ID')}` : '—');
        const sspStr = deed.sspAmount ? `Rp ${deed.sspAmount.toLocaleString('id-ID')}\n(${deed.sspDate || '-'})` : '—';
        const ssbStr = deed.ssbAmount ? `Rp ${deed.ssbAmount.toLocaleString('id-ID')}\n(${deed.ssbDate || '-'})` : '—';

        tableRows.push({
          no: dIdx === 0 ? dayRow.dayNumber : '',
          akta: `No: ${deed.deedNumber || '-'}\nTgl: ${deed.date || ''}`,
          bentuk: deed.legalActType || 'Jual Beli',
          pengalih: `${deed.grantorName || '-'}\n${deed.grantorAddress ? `${deed.grantorAddress}` : ''}${deed.grantorNpwp ? `\nNPWP: ${deed.grantorNpwp}` : ''}`,
          penerima: `${deed.transfereeName || '-'}\n${deed.transfereeAddress ? `${deed.transfereeAddress}` : ''}${deed.transfereeNpwp ? `\nNPWP: ${deed.transfereeNpwp}` : ''}`,
          hak: deed.rightTypeAndNumber || '—',
          letak: deed.landLocation || '—',
          luasTanah: deed.landArea ? `${deed.landArea} m²` : '—',
          luasBgn: deed.buildingArea ? `${deed.buildingArea} m²` : '—',
          harga: deed.transactionValue ? `Rp ${deed.transactionValue.toLocaleString('id-ID')}` : '—',
          pbb: pbbStr,
          ssp: sspStr,
          ssb: ssbStr,
          ket: deed.notes || 'Lengkap',
          isDeed: true
        });
      });
    }
  });

  const tableStartY = isNihilMonth ? 24 : 27;

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin, right: margin, top: 6, bottom: isNihilMonth ? 6 : 10 },
    pageBreak: isNihilMonth ? 'avoid' : 'auto',
    rowPageBreak: isNihilMonth ? 'avoid' : 'auto',
    head: [
      [
        { content: 'NO.\nTGL', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'AKTA', colSpan: 1, styles: { halign: 'center' } },
        { content: 'BENTUK\nPERBUATAN HUKUM', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'NAMA, ALAMAT & NPWP PARA PIHAK', colSpan: 2, styles: { halign: 'center' } },
        { content: 'JENIS &\nNO. HAK', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'LETAK TANAH\n& BANGUNAN', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'LUAS (M²)', colSpan: 2, styles: { halign: 'center' } },
        { content: 'HARGA TRANSAKSI\n(RP)', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'SPPT PBB', colSpan: 1, styles: { halign: 'center' } },
        { content: 'SSP (PPH)', colSpan: 1, styles: { halign: 'center' } },
        { content: 'SSB (BPHTB)', colSpan: 1, styles: { halign: 'center' } },
        { content: 'KET', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
      ],
      [
        { content: 'NOMOR & TGL', styles: { halign: 'center' } },
        { content: 'PIHAK PENGALIH', styles: { halign: 'center' } },
        { content: 'PIHAK PENERIMA', styles: { halign: 'center' } },
        { content: 'TANAH', styles: { halign: 'center' } },
        { content: 'BGN', styles: { halign: 'center' } },
        { content: 'NOP / NJOP', styles: { halign: 'center' } },
        { content: 'TGL / RP', styles: { halign: 'center' } },
        { content: 'TGL / RP', styles: { halign: 'center' } }
      ]
    ],
    body: tableRows.map(r => [
      r.no,
      r.akta,
      r.bentuk,
      r.pengalih,
      r.penerima,
      r.hak,
      r.letak,
      r.luasTanah,
      r.luasBgn,
      r.harga,
      r.pbb,
      r.ssp,
      r.ssb,
      r.ket
    ]),
    theme: 'grid',
    styles: {
      fontSize: isNihilMonth ? 5.5 : 6,
      cellPadding: isNihilMonth 
        ? { top: 0.45, bottom: 0.45, left: 0.6, right: 0.6 }
        : { top: 0.9, bottom: 0.9, left: 1.0, right: 1.0 },
      minCellHeight: isNihilMonth ? 2.5 : 3.2,
      lineColor: [130, 130, 130],
      lineWidth: 0.1,
      textColor: [30, 30, 30]
    },
    headStyles: {
      fillColor: [240, 243, 246],
      textColor: [20, 20, 20],
      fontStyle: 'bold',
      lineWidth: 0.12,
      lineColor: [90, 90, 90],
      fontSize: isNihilMonth ? 5.5 : 6,
      cellPadding: isNihilMonth
        ? { top: 0.6, bottom: 0.6, left: 0.6, right: 0.6 }
        : { top: 1.0, bottom: 1.0, left: 1.0, right: 1.0 }
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },      // No/Tgl
      1: { cellWidth: 18, halign: 'center' },     // Akta
      2: { cellWidth: 18, halign: isNihilMonth ? 'center' : 'left' },     // Bentuk
      3: { cellWidth: 33, halign: isNihilMonth ? 'center' : 'left' },     // Pengalih
      4: { cellWidth: 33, halign: isNihilMonth ? 'center' : 'left' },     // Penerima
      5: { cellWidth: 22, halign: 'center' },     // Jenis Hak
      6: { cellWidth: 25, halign: isNihilMonth ? 'center' : 'left' },     // Letak
      7: { cellWidth: 12, halign: isNihilMonth ? 'center' : 'right' },    // Luas T
      8: { cellWidth: 12, halign: isNihilMonth ? 'center' : 'right' },    // Luas B
      9: { cellWidth: 24, halign: isNihilMonth ? 'center' : 'right' },    // Harga
      10: { cellWidth: 24, halign: isNihilMonth ? 'center' : 'left' },    // PBB
      11: { cellWidth: 18, halign: isNihilMonth ? 'center' : 'right' },   // SSP
      12: { cellWidth: 18, halign: isNihilMonth ? 'center' : 'right' },   // SSB
      13: { cellWidth: 16, halign: 'center' }    // Ket
    },
    didParseCell: function(data) {
      if (data.section === 'body') {
        const rawRow = tableRows[data.row.index];
        if (rawRow?.isHoliday) {
          data.cell.styles.fillColor = [245, 245, 245];
          data.cell.styles.textColor = [120, 120, 120];
        } else if (rawRow?.isNihil) {
          data.cell.styles.fillColor = [255, 255, 255];
          if (data.column.index === 13) {
            data.cell.styles.textColor = [70, 70, 70];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    }
  });

  // Footer / Signature Section
  const lastY = (doc as any).lastAutoTable?.finalY || 115;
  // Buat ruang tempat tanda tangan tinggi (28mm-30mm) agar leluasa dan pas ketika dicap stempel dinas PPAT
  const stampHeight = isNihilMonth ? 28 : 26;
  const neededHeight = stampHeight + 15;
  
  // Posisi vertikal tanda tangan: jika Nihil, tempatkan dengan seimbang di area bawah lembar
  let signatureY = isNihilMonth 
    ? Math.max(lastY + 10, pageHeight - 52) 
    : lastY + 8;
  
  if (!isNihilMonth && signatureY + neededHeight > pageHeight - 8) {
    doc.addPage();
    signatureY = 22;
  }

  const signPlaceDate = signatureDate || `${config.city || 'Sleman'}, ${new Date(year, month, 0).getDate()} ${monthName} ${year}`;
  
  doc.setFontSize(isNihilMonth ? 7.5 : 8);
  doc.setFont('helvetica', 'normal');
  doc.text(signPlaceDate, pageWidth - 65, signatureY, { align: 'center' });
  doc.text('Pejabat Pembuat Akta Tanah (PPAT)', pageWidth - 65, signatureY + 4, { align: 'center' });
  
  // Ruang tanda tangan & cap stempel bulat PPAT setinggi stampHeight (~28mm)
  const ppatNameY = signatureY + 4 + stampHeight;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isNihilMonth ? 8.5 : 9);
  doc.text(config.ppatName, pageWidth - 65, ppatNameY, { align: 'center' });

  // Garis bawah nama PPAT
  const nameWidth = doc.getTextWidth(config.ppatName);
  doc.setLineWidth(0.2);
  doc.line(pageWidth - 65 - nameWidth / 2, ppatNameY + 0.8, pageWidth - 65 + nameWidth / 2, ppatNameY + 0.8);

  // Nomor SK PPAT (hindari duplikasi "SK. SK")
  if (config.skNumber) {
    const rawSk = config.skNumber.trim();
    const skDisplay = /^sk\b/i.test(rawSk) ? rawSk : `SK. ${rawSk}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isNihilMonth ? 7 : 7.5);
    doc.text(skDisplay, pageWidth - 65, ppatNameY + 4.5, { align: 'center' });
  }

  // Jika laporan Nihil, pastikan tidak ada halaman kedua yang dibuat secara tidak sengaja
  if (isNihilMonth) {
    while (doc.getNumberOfPages() > 1) {
      doc.deletePage(doc.getNumberOfPages());
    }
  }

  // Save PDF
  const filename = `Laporan_PPAT_${monthName}_${year}${isNihilMonth ? '_Nihil' : ''}.pdf`;
  doc.save(filename);
}
