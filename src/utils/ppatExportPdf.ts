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
  const margin = 8; // Margin kiri & kanan 8mm (lebar tabel 281mm di A4 landscape 297mm)

  // 1. HEADER REGULASI SKB DI ATAS (Sesuai persis format resmi PPAT di screenshot referensi)
  const skbStartX = 110;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.0);
  doc.text('Lampiran Keputusan Bersama Menteri Negara Agraria / Kepala Badan Pertanahan Nasional', skbStartX, 6.0);
  doc.text('dan Direktur Jenderal Pajak.', skbStartX, 9.2);
  doc.text('Nomor   : SKB 2 Tahun 1998 KEP – 179/Pj/1998', skbStartX, 12.4);
  doc.text('Tanggal : 27 Agustus 1998', skbStartX, 15.6);

  // 2. IDENTITAS PPAT (KIRI) DAN KEPADA YTH (KANAN)
  const ppatName = config.ppatName || 'R.A. NUKANTINI PUTRI PARINCHA, SH, M.Kn';
  const officeAddress = config.officeAddress || 'Komp. PPR-ITB Kav. F-5 Dago Bengkok, Lembang';
  const npwp = (config.npwp && config.npwp !== '24.150.722.7-421.001') ? config.npwp : '3217015610760002';
  const workingArea = (config.workingArea || 'KABUPATEN BANDUNG BARAT').toUpperCase();

  const recipientLines = (config.reportRecipients && config.reportRecipients.trim())
    ? config.reportRecipients.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    : [
        '1) Kepala Kantor Wilayah BPN Propinsi Jawa Barat',
        '2) Kepala Kantor Pertanahan Kabupaten Bandung Barat',
        '3) Kepala Kantor Badan Pengelolaan Keuangan Daerah Kab. Bandung Barat',
        '4) Kepala Kantor Pelayanan Pajak Pratama Cimahi'
      ];

  const idStartY = 19.5;
  const lineSpacing = 3.6;

  // Sisi Kiri: Data PPAT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('Nama PPAT', margin, idStartY);
  doc.text(':', margin + 19, idStartY);
  doc.text(ppatName, margin + 21, idStartY);

  doc.text('Alamat', margin, idStartY + lineSpacing);
  doc.text(':', margin + 19, idStartY + lineSpacing);
  doc.setFont('helvetica', 'normal');
  doc.text(officeAddress, margin + 21, idStartY + lineSpacing);

  doc.setFont('helvetica', 'bold');
  doc.text('NPWP', margin, idStartY + lineSpacing * 2);
  doc.text(':', margin + 19, idStartY + lineSpacing * 2);
  doc.text(npwp, margin + 21, idStartY + lineSpacing * 2);

  doc.text('Daerah Kerja', margin, idStartY + lineSpacing * 3);
  doc.text(':', margin + 19, idStartY + lineSpacing * 3);
  doc.text(workingArea, margin + 21, idStartY + lineSpacing * 3);

  // Sisi Kanan: Instansi Penerima / Kepada Yth
  const recipientStartX = 168;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.0);
  doc.text('Kepada Yth,', recipientStartX, idStartY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  recipientLines.forEach((line, idx) => {
    doc.text(line, recipientStartX, idStartY + 3.4 + idx * 3.3);
  });

  // 3. JUDUL LAPORAN DI TENGAH
  const titleY = 37.0;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.0);
  doc.text('LAPORAN BULANAN PEMBUATAN AKTA OLEH PPAT', pageWidth / 2, titleY, { align: 'center' });

  doc.setFontSize(8.8);
  doc.text(`Bulan : ${monthName} Tahun : ${year}`, pageWidth / 2, titleY + 4.5, { align: 'center' });

  // 4. DATA TABEL (18 Kolom sesuai format baku PPAT)
  let currentDeedOrder = 0;
  const tableRows: any[] = [];

  rows.forEach(dayRow => {
    const dayStr = String(dayRow.dayNumber).padStart(2, '0');
    const monthStr = String(month).padStart(2, '0');
    const dateFormatted = `${dayStr}-${monthStr}-${year}`;

    if (dayRow.isWeekend || dayRow.isHoliday) {
      tableRows.push({
        col1: `${dayRow.dayNumber}.`,
        col2: '',
        col3: dateFormatted,
        col4: 'N I H I L',
        col5: '-',
        col6: '-',
        col7: '-',
        col8: '-',
        col9: '-',
        col10: '-',
        col11: '-',
        col12: '-',
        col13: '-',
        col14: '-',
        col15: '-',
        col16: '-',
        col17: '-',
        col18: 'LIBUR',
        isHoliday: true
      });
    } else if (dayRow.isNihil || dayRow.deeds.length === 0) {
      tableRows.push({
        col1: `${dayRow.dayNumber}.`,
        col2: '',
        col3: dateFormatted,
        col4: 'N I H I L',
        col5: '-',
        col6: '-',
        col7: '-',
        col8: '-',
        col9: '-',
        col10: '-',
        col11: '-',
        col12: '-',
        col13: '-',
        col14: '-',
        col15: '-',
        col16: '-',
        col17: '-',
        col18: '-',
        isNihil: true
      });
    } else {
      // Hari yang memiliki akta
      dayRow.deeds.forEach((deed, dIdx) => {
        currentDeedOrder++;
        tableRows.push({
          col1: dIdx === 0 ? `${dayRow.dayNumber}.` : '',
          col2: deed.deedNumber || '-',
          col3: deed.date || dateFormatted,
          col4: deed.legalActType || 'Jual Beli',
          col5: `${deed.grantorName || '-'}${deed.grantorNpwp ? `\nNPWP: ${deed.grantorNpwp}` : ''}`,
          col6: `${deed.transfereeName || '-'}${deed.transfereeNpwp ? `\nNPWP: ${deed.transfereeNpwp}` : ''}`,
          col7: deed.rightTypeAndNumber || '-',
          col8: deed.landLocation || '-',
          col9: deed.landArea ? `${deed.landArea}` : '-',
          col10: deed.buildingArea ? `${deed.buildingArea}` : '-',
          col11: deed.transactionValue ? `${deed.transactionValue.toLocaleString('id-ID')}` : '-',
          col12: deed.spptPbbNopYear || '-',
          col13: deed.spptPbbNjop ? `${deed.spptPbbNjop.toLocaleString('id-ID')}` : '-',
          col14: deed.sspDate || '-',
          col15: deed.sspAmount ? `${deed.sspAmount.toLocaleString('id-ID')}` : '-',
          col16: deed.ssbDate || '-',
          col17: deed.ssbAmount ? `${deed.ssbAmount.toLocaleString('id-ID')}` : '-',
          col18: deed.notes || '-',
          isDeed: true
        });
      });
    }
  });

  const rowCount = tableRows.length;
  // Hitung minCellHeight agar 31 baris pas dan proporsional dalam 1 halaman tunggal A4
  const rowHeight = isNihilMonth ? Math.min(2.85, Math.max(2.6, 85 / Math.max(rowCount, 28))) : 3.0;

  // 5. HEADER 3 TINGKAT TABEL (18 Kolom persis seperti screenshot)
  const headRows = [
    [
      { content: 'NO.\nURUT', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'AKTA', colSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'BENTUK\nPERBUATAN\nHUKUM', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'NAMA, ALAMAT DAN NPWP', colSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'JENIS\nDAN\nNOMOR\nHAK', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'LETAK\nTANAH\nDAN\nBANGUNAN', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'LUAS (M2)', colSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'HARGA\nTRANSAKSI\nPEROLEHAN\n/ PENGALIHAN\nHAK (RP.)', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'SPPT PBB', colSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'SSP', colSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'SSB', colSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'KET', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
    ],
    [
      { content: 'NO.', styles: { halign: 'center', valign: 'middle' } },
      { content: 'TANGGAL', styles: { halign: 'center', valign: 'middle' } },
      { content: 'PIHAK YANG\nMENGALIHKAN/\nMEMBERIKAN', styles: { halign: 'center', valign: 'middle' } },
      { content: 'PIHAK YANG\nMENERIMA', styles: { halign: 'center', valign: 'middle' } },
      { content: 'TNH', styles: { halign: 'center', valign: 'middle' } },
      { content: 'BGN', styles: { halign: 'center', valign: 'middle' } },
      { content: 'NOP\nTAHUN', styles: { halign: 'center', valign: 'middle' } },
      { content: 'NJOP\n(RP.000)', styles: { halign: 'center', valign: 'middle' } },
      { content: 'TANGGAL', styles: { halign: 'center', valign: 'middle' } },
      { content: '(Rp)', styles: { halign: 'center', valign: 'middle' } },
      { content: 'TANGGAL', styles: { halign: 'center', valign: 'middle' } },
      { content: '(RP)', styles: { halign: 'center', valign: 'middle' } }
    ],
    // Baris penomoran kolom 1 - 18
    [
      { content: '1', styles: { halign: 'center', valign: 'middle' } },
      { content: '2', styles: { halign: 'center', valign: 'middle' } },
      { content: '3', styles: { halign: 'center', valign: 'middle' } },
      { content: '4', styles: { halign: 'center', valign: 'middle' } },
      { content: '5', styles: { halign: 'center', valign: 'middle' } },
      { content: '6', styles: { halign: 'center', valign: 'middle' } },
      { content: '7', styles: { halign: 'center', valign: 'middle' } },
      { content: '8', styles: { halign: 'center', valign: 'middle' } },
      { content: '9', styles: { halign: 'center', valign: 'middle' } },
      { content: '10', styles: { halign: 'center', valign: 'middle' } },
      { content: '11', styles: { halign: 'center', valign: 'middle' } },
      { content: '12', styles: { halign: 'center', valign: 'middle' } },
      { content: '13', styles: { halign: 'center', valign: 'middle' } },
      { content: '14', styles: { halign: 'center', valign: 'middle' } },
      { content: '15', styles: { halign: 'center', valign: 'middle' } },
      { content: '16', styles: { halign: 'center', valign: 'middle' } },
      { content: '17', styles: { halign: 'center', valign: 'middle' } },
      { content: '18', styles: { halign: 'center', valign: 'middle' } }
    ]
  ];

  autoTable(doc, {
    startY: 45.0,
    margin: { left: margin, right: margin, top: 5, bottom: isNihilMonth ? 5 : 10 },
    pageBreak: isNihilMonth ? 'avoid' : 'auto',
    rowPageBreak: isNihilMonth ? 'avoid' : 'auto',
    head: headRows as any,
    body: tableRows.map(r => [
      r.col1,
      r.col2,
      r.col3,
      r.col4,
      r.col5,
      r.col6,
      r.col7,
      r.col8,
      r.col9,
      r.col10,
      r.col11,
      r.col12,
      r.col13,
      r.col14,
      r.col15,
      r.col16,
      r.col17,
      r.col18
    ]),
    theme: 'grid',
    styles: {
      fontSize: 5.8,
      cellPadding: { top: 0.35, bottom: 0.35, left: 0.3, right: 0.3 },
      minCellHeight: rowHeight,
      valign: 'middle',
      lineColor: [0, 0, 0],
      lineWidth: 0.15,
      textColor: [0, 0, 0]
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineWidth: 0.15,
      lineColor: [0, 0, 0],
      fontSize: 5.0,
      cellPadding: { top: 0.5, bottom: 0.5, left: 0.3, right: 0.3 },
      valign: 'middle'
    },
    // Total lebar kolom = 281mm (margin kiri 8mm + 281mm + margin kanan 8mm = 297mm A4)
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },     // 1: NO. URUT
      1: { cellWidth: 8, halign: 'center' },                         // 2: NO.
      2: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },     // 3: TANGGAL
      3: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },     // 4: BENTUK PERBUATAN HUKUM
      4: { cellWidth: 32, halign: isNihilMonth ? 'center' : 'left' },// 5: PENGALIH
      5: { cellWidth: 32, halign: isNihilMonth ? 'center' : 'left' },// 6: PENERIMA
      6: { cellWidth: 16, halign: 'center' },                        // 7: JENIS DAN NOMOR HAK
      7: { cellWidth: 18, halign: isNihilMonth ? 'center' : 'left' },// 8: LETAK TANAH
      8: { cellWidth: 9, halign: 'center' },                         // 9: TNH
      9: { cellWidth: 9, halign: 'center' },                         // 10: BGN
      10: { cellWidth: 21, halign: 'center' },                       // 11: HARGA TRANSAKSI
      11: { cellWidth: 15, halign: 'center' },                       // 12: NOP TAHUN
      12: { cellWidth: 15, halign: 'center' },                       // 13: NJOP
      13: { cellWidth: 13, halign: 'center' },                       // 14: SSP TGL
      14: { cellWidth: 13, halign: 'center' },                       // 15: SSP RP
      15: { cellWidth: 13, halign: 'center' },                       // 16: SSB TGL
      16: { cellWidth: 13, halign: 'center' },                       // 17: SSB RP
      17: { cellWidth: 10, halign: 'center', fontStyle: 'bold' }     // 18: KET
    },
    didParseCell: function(data) {
      // Styling baris body: Libur diwarnai abu-abu tegas persis seperti screenshot
      if (data.section === 'body') {
        const rawRow = tableRows[data.row.index];
        if (rawRow?.isHoliday) {
          data.cell.styles.fillColor = [190, 190, 190]; // Abu-abu tegas untuk baris libur
          data.cell.styles.textColor = [0, 0, 0];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.fillColor = [255, 255, 255];
          data.cell.styles.textColor = [0, 0, 0];
        }
      }
    }
  });

  // 6. BAGIAN TANDA TANGAN & TEMPAT/TANGGAL (Persis seperti screenshot referensi)
  const lastY = (doc as any).lastAutoTable?.finalY || 140;
  const signatureY = lastY + 7;

  // Tanggal di sebelah kiri bawah: contoh "Bandung Barat, 01 September 2026"
  const nextMonthDate = new Date(year, month, 1);
  const nextMonthName = MONTH_NAMES[nextMonthDate.getMonth()];
  const nextMonthYear = nextMonthDate.getFullYear();
  const defaultSignDate = `01 ${nextMonthName} ${nextMonthYear}`;
  const displaySignDate = signatureDate || defaultSignDate;
  const signCity = (config.city && config.city !== 'Lembang' && config.city !== 'Sleman') ? config.city : 'Bandung Barat';
  const cityDateText = `${signCity}, ${displaySignDate}`;

  // Teks Tempat dan Tanggal di Kiri Bawah (sejajar margin kiri tabel)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(cityDateText, margin, signatureY);

  // Bagian Tanda Tangan PPAT di Kanan Bawah
  const signCenterX = pageWidth - 60; // Posisi tengah blok tanda tangan kanan
  const rawWorkingArea = (config.workingArea || 'Kabupaten Bandung Barat').trim();
  const workingAreaText = rawWorkingArea.toLowerCase().startsWith('di ') ? rawWorkingArea : `di ${rawWorkingArea}`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Pejabat Pembuat Akta Tanah', signCenterX, signatureY, { align: 'center' });
  doc.text(workingAreaText, signCenterX, signatureY + 4.0, { align: 'center' });

  // Ruang tanda tangan dan stempel dinas PPAT (~19mm)
  const ppatNameY = signatureY + 4.0 + 19;
  const formattedPpatName = `(${ppatName})`;

  doc.setFontSize(8.5);
  doc.text(formattedPpatName, signCenterX, ppatNameY, { align: 'center' });

  // Garis bawah nama PPAT persis seperti screenshot
  const nameWidth = doc.getTextWidth(formattedPpatName);
  doc.setLineWidth(0.25);
  doc.line(signCenterX - nameWidth / 2, ppatNameY + 0.8, signCenterX + nameWidth / 2, ppatNameY + 0.8);

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

