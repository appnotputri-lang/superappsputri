import * as XLSX from 'xlsx';
import { DailyReportRow, PpatProfileConfig } from '../types/ppat';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function exportPpatReportToExcel(params: {
  month: number;
  year: number;
  rows: DailyReportRow[];
  config: PpatProfileConfig;
}) {
  const { month, year, rows, config } = params;
  const monthName = MONTH_NAMES[month - 1];

  // Header Rows
  const wsData: any[][] = [
    ['LAPORAN BULANAN PEMBUATAN AKTA PPAT'],
    [`BULAN: ${monthName.toUpperCase()} ${year}`],
    [],
    [`Nama PPAT: ${config.ppatName}`, '', '', '', '', '', '', `Kepada Yth:`],
    [`Daerah Kerja: ${config.workingArea}`, '', '', '', '', '', '', `1. Kepala Kantor Pertanahan ${config.workingArea}`],
    [`Alamat Kantor: ${config.officeAddress}`, '', '', '', '', '', '', `2. Kepala Kantor Pelayanan Pajak Pratama`],
    [],
    // Table Headers (Level 1)
    [
      'NO. TGL',
      'NOMOR AKTA',
      'TGL AKTA',
      'BENTUK PERBUATAN HUKUM',
      'PIHAK MENGALIHKAN / MEMBERIKAN',
      'ALAMAT & NPWP PENGALIH',
      'PIHAK MENERIMA',
      'ALAMAT & NPWP PENERIMA',
      'JENIS & NO. HAK',
      'LETAK TANAH & BANGUNAN',
      'LUAS TANAH (M2)',
      'LUAS BGN (M2)',
      'HARGA TRANSAKSI (RP)',
      'NOP SPPT PBB',
      'NJOP (RP)',
      'TGL SSP',
      'SSP PPH (RP)',
      'TGL SSB',
      'SSB BPHTB (RP)',
      'KETERANGAN'
    ]
  ];

  // Populate data
  rows.forEach(dayRow => {
    if (dayRow.isWeekend || dayRow.isHoliday) {
      const holidayLabel = dayRow.holidayInfo?.name ? `LIBUR (${dayRow.holidayInfo.name})` : 'LIBUR';
      wsData.push([
        dayRow.dayNumber,
        '-',
        `${String(dayRow.dayNumber).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        holidayLabel
      ]);
    } else if (dayRow.isNihil || dayRow.deeds.length === 0) {
      wsData.push([
        dayRow.dayNumber,
        '-',
        `${String(dayRow.dayNumber).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        'NIHIL'
      ]);
    } else {
      dayRow.deeds.forEach((deed, dIdx) => {
        wsData.push([
          dIdx === 0 ? dayRow.dayNumber : '',
          deed.deedNumber || '-',
          deed.date || '',
          deed.legalActType || 'Jual Beli',
          deed.grantorName || '-',
          `${deed.grantorAddress || ''} ${deed.grantorNpwp ? `| NPWP: ${deed.grantorNpwp}` : ''}`.trim(),
          deed.transfereeName || '-',
          `${deed.transfereeAddress || ''} ${deed.transfereeNpwp ? `| NPWP: ${deed.transfereeNpwp}` : ''}`.trim(),
          deed.rightTypeAndNumber || '-',
          deed.landLocation || '-',
          deed.landArea ? Number(deed.landArea) : '-',
          deed.buildingArea ? Number(deed.buildingArea) : '-',
          deed.transactionValue ? Number(deed.transactionValue) : '-',
          deed.spptPbbNopYear || '-',
          deed.spptPbbNjop ? Number(deed.spptPbbNjop) : '-',
          deed.sspDate || '-',
          deed.sspAmount ? Number(deed.sspAmount) : '-',
          deed.ssbDate || '-',
          deed.ssbAmount ? Number(deed.ssbAmount) : '-',
          deed.notes || 'Lengkap'
        ]);
      });
    }
  });

  // Footer Signature Space
  wsData.push([]);
  wsData.push([]);
  wsData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', `${config.city || 'Sleman'}, ${new Date(year, month, 0).getDate()} ${monthName} ${year}`]);
  wsData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Pejabat Pembuat Akta Tanah (PPAT)']);
  wsData.push([]);
  wsData.push([]);
  wsData.push([]);
  wsData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', config.ppatName]);
  if (config.skNumber) {
    wsData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', config.skNumber]);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 8 },  // No Tgl
    { wch: 14 }, // No Akta
    { wch: 12 }, // Tgl Akta
    { wch: 22 }, // Bentuk
    { wch: 28 }, // Pihak 1
    { wch: 28 }, // Alamat 1
    { wch: 28 }, // Pihak 2
    { wch: 28 }, // Alamat 2
    { wch: 24 }, // Jenis Hak
    { wch: 28 }, // Letak
    { wch: 14 }, // Luas T
    { wch: 14 }, // Luas B
    { wch: 20 }, // Nilai
    { wch: 22 }, // NOP
    { wch: 18 }, // NJOP
    { wch: 12 }, // Tgl SSP
    { wch: 18 }, // SSP
    { wch: 12 }, // Tgl SSB
    { wch: 18 }, // SSB
    { wch: 18 }  // KET
  ];

  XLSX.utils.book_append_sheet(wb, ws, `Laporan PPAT ${monthName}`);
  XLSX.writeFile(wb, `Laporan_PPAT_${monthName}_${year}.xlsx`);
}
