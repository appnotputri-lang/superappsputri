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

  // Create A4 Landscape document (297mm x 210mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('LAPORAN BULANAN PEMBUATAN AKTA PPAT', pageWidth / 2, 12, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Bulan: ${monthName.toUpperCase()} ${year}`, pageWidth / 2, 16.5, { align: 'center' });

  // Sub-header PPAT info (Left) & Destination (Right)
  doc.setFontSize(8);
  doc.text(`Nama PPAT : ${config.ppatName}`, margin, 22);
  doc.text(`Daerah Kerja : ${config.workingArea}`, margin, 25.5);
  doc.text(`Alamat Kantor : ${config.officeAddress}`, margin, 29);

  doc.text(`Kepada Yth:`, pageWidth - 80, 22);
  doc.text(`1. Kepala Kantor Pertanahan ${config.workingArea}`, pageWidth - 80, 25.5);
  doc.text(`2. Kepala Kantor Pelayanan Pajak Pratama`, pageWidth - 80, 29);

  // Build Table Data
  // Columns:
  // 1: NO. URUT
  // 2: AKTA (NOMOR & TGL)
  // 3: BENTUK PERBUATAN HUKUM
  // 4: PIHAK MENGALIHKAN / MEMBERIKAN
  // 5: PIHAK MENERIMA
  // 6: JENIS & NO. HAK
  // 7: LETAK TANAH & BANGUNAN
  // 8: LUAS TANAH (M2)
  // 9: LUAS BANGUNAN (M2)
  // 10: HARGA TRANSAKSI (RP)
  // 11: SPPT PBB (NOP & NJOP)
  // 12: SSP (PPH)
  // 13: SSB (BPHTB)
  // 14: KET

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

  autoTable(doc, {
    startY: 32,
    margin: { left: margin, right: margin, bottom: 35 },
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
      fontSize: 6.5,
      cellPadding: 1.5,
      lineColor: [100, 100, 100],
      lineWidth: 0.1,
      textColor: [30, 30, 30]
    },
    headStyles: {
      fillColor: [240, 243, 246],
      textColor: [20, 20, 20],
      fontStyle: 'bold',
      lineWidth: 0.15,
      lineColor: [80, 80, 80],
      fontSize: 6.5
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },      // No/Tgl
      1: { cellWidth: 20 },                       // Akta
      2: { cellWidth: 20 },                       // Bentuk
      3: { cellWidth: 32 },                       // Pengalih
      4: { cellWidth: 32 },                       // Penerima
      5: { cellWidth: 22 },                       // Jenis Hak
      6: { cellWidth: 24 },                       // Letak
      7: { cellWidth: 12, halign: 'right' },      // Luas T
      8: { cellWidth: 12, halign: 'right' },      // Luas B
      9: { cellWidth: 24, halign: 'right' },      // Harga
      10: { cellWidth: 25 },                      // PBB
      11: { cellWidth: 20, halign: 'right' },     // SSP
      12: { cellWidth: 20, halign: 'right' },     // SSB
      13: { cellWidth: 16, halign: 'center' }     // Ket
    },
    didParseCell: function(data) {
      if (data.section === 'body') {
        const rawRow = tableRows[data.row.index];
        if (rawRow?.isHoliday) {
          data.cell.styles.fillColor = [240, 240, 240];
          data.cell.styles.textColor = [120, 120, 120];
        } else if (rawRow?.isNihil) {
          data.cell.styles.fillColor = [255, 255, 255];
        }
      }
    }
  });

  // Footer / Signature Section
  const lastY = (doc as any).lastAutoTable?.finalY || 160;
  let signatureY = lastY + 8;
  
  if (signatureY + 28 > pageHeight) {
    doc.addPage();
    signatureY = 20;
  }

  const signPlaceDate = signatureDate || `${config.city || 'Sleman'}, ${new Date(year, month, 0).getDate()} ${monthName} ${year}`;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(signPlaceDate, pageWidth - 65, signatureY, { align: 'center' });
  doc.text('Pejabat Pembuat Akta Tanah (PPAT)', pageWidth - 65, signatureY + 4, { align: 'center' });
  
  doc.setFont('helvetica', 'bold');
  doc.text(config.ppatName, pageWidth - 65, signatureY + 22, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  if (config.skNumber) {
    doc.setFontSize(7);
    doc.text(config.skNumber, pageWidth - 65, signatureY + 25.5, { align: 'center' });
  }

  // Save PDF
  const filename = `Laporan_PPAT_${monthName}_${year}.pdf`;
  doc.save(filename);
}
