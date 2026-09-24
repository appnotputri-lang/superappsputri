import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PpatDeed, PpatProfileConfig } from '../types/ppat';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function exportPpatDeedBookToExcel(params: {
  month: number;
  year: number;
  deeds: PpatDeed[];
  config: PpatProfileConfig;
}) {
  const { month, year, deeds, config } = params;
  const monthName = MONTH_NAMES[month - 1];

  const wsData: any[][] = [
    ['BUKU DAFTAR AKTA PPAT (REGISTER AKTA PPAT)'],
    [`PPAT: ${config.ppatName}`],
    [`Daerah Kerja: ${config.workingArea || 'KABUPATEN BANDUNG BARAT'}`],
    [`Alamat Kantor: ${config.officeAddress || ''}`],
    [`Bulan: ${monthName.toUpperCase()}    Tahun: ${year}`],
    [],
    [
      'NO. URUT',
      'NOMOR AKTA',
      'TANGGAL AKTA',
      'BENTUK PERBUATAN HUKUM',
      'PIHAK MENGALIHKAN / MEMBERIKAN',
      'ALAMAT & NPWP PENGALIH',
      'PIHAK MENERIMA',
      'ALAMAT & NPWP PENERIMA',
      'JENIS & NOMOR HAK',
      'LETAK TANAH / BANGUNAN',
      'LUAS TANAH (M2)',
      'LUAS BANGUNAN (M2)',
      'HARGA TRANSAKSI (RP)',
      'NOP SPPT PBB & TAHUN',
      'NJOP (RP)',
      'TGL SSP (PPH)',
      'NOMINAL SSP (RP)',
      'TGL SSB (BPHTB)',
      'NOMINAL SSB (RP)',
      'KETERANGAN'
    ]
  ];

  deeds.forEach((deed, index) => {
    wsData.push([
      index + 1,
      deed.deedNumber || '',
      deed.date || '',
      deed.legalActType || '',
      deed.grantorName || '',
      `${deed.grantorAddress || ''}${deed.grantorNpwp ? ` (NPWP: ${deed.grantorNpwp})` : ''}`,
      deed.transfereeName || '',
      `${deed.transfereeAddress || ''}${deed.transfereeNpwp ? ` (NPWP: ${deed.transfereeNpwp})` : ''}`,
      deed.rightTypeAndNumber || '',
      deed.landLocation || '',
      Number(deed.landArea) || 0,
      Number(deed.buildingArea) || 0,
      Number(deed.transactionValue) || 0,
      deed.spptPbbNopYear || '',
      Number(deed.spptPbbNjop) || 0,
      deed.sspDate || '',
      Number(deed.sspAmount) || 0,
      deed.ssbDate || '',
      Number(deed.ssbAmount) || 0,
      deed.notes || ''
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Daftar Akta ${monthName}`);
  XLSX.writeFile(wb, `Buku_Daftar_Akta_PPAT_${monthName}_${year}.xlsx`);
}

export function exportPpatDeedBookToPdf(params: {
  month: number;
  year: number;
  deeds: PpatDeed[];
  config: PpatProfileConfig;
}) {
  const { month, year, deeds, config } = params;
  const monthName = MONTH_NAMES[month - 1];

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('BUKU DAFTAR AKTA PPAT', pageWidth / 2, 14, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Nama PPAT : ${config.ppatName}`, 14, 22);
  doc.text(`Daerah Kerja : ${config.workingArea || 'Kabupaten Bandung Barat'}`, 14, 27);
  doc.text(`Bulan / Tahun : ${monthName} ${year}`, pageWidth - 14, 22, { align: 'right' });
  doc.text(`Jumlah Akta : ${deeds.length} Akta`, pageWidth - 14, 27, { align: 'right' });

  const tableData = deeds.map((deed, index) => [
    index + 1,
    deed.deedNumber || '-',
    deed.date || '-',
    deed.legalActType || '-',
    `${deed.grantorName || '-'}\n${deed.grantorAddress ? `(${deed.grantorAddress})` : ''}`,
    `${deed.transfereeName || '-'}\n${deed.transfereeAddress ? `(${deed.transfereeAddress})` : ''}`,
    `${deed.rightTypeAndNumber || '-'}\n${deed.landLocation || ''}`,
    `${deed.landArea ? `T: ${deed.landArea}m²` : ''} ${deed.buildingArea ? `B: ${deed.buildingArea}m²` : ''}`,
    deed.transactionValue ? `Rp ${Number(deed.transactionValue).toLocaleString('id-ID')}` : '-',
    deed.sspAmount ? `Rp ${Number(deed.sspAmount).toLocaleString('id-ID')}` : '-',
    deed.ssbAmount ? `Rp ${Number(deed.ssbAmount).toLocaleString('id-ID')}` : '-',
    deed.notes || '-'
  ]);

  autoTable(doc, {
    startY: 32,
    head: [[
      'No',
      'No. Akta',
      'Tgl Akta',
      'Perbuatan Hukum',
      'Pihak Pengalih (Penjual)',
      'Pihak Penerima (Pembeli)',
      'Obyek & Letak Tanah',
      'Luas',
      'Nilai Transaksi',
      'SSP PPh',
      'SSB BPHTB',
      'Ket'
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [15, 118, 110], // Emerald/Teal 700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 16 },
      2: { halign: 'center', cellWidth: 16 },
      3: { cellWidth: 24 },
      4: { cellWidth: 38 },
      5: { cellWidth: 38 },
      6: { cellWidth: 36 },
      7: { halign: 'center', cellWidth: 18 },
      8: { halign: 'right', cellWidth: 26 },
      9: { halign: 'right', cellWidth: 20 },
      10: { halign: 'right', cellWidth: 20 },
      11: { cellWidth: 18 }
    }
  });

  doc.save(`Buku_Daftar_Akta_PPAT_${monthName}_${year}.pdf`);
}
