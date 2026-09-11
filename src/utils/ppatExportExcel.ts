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
  const nextMonthDate = new Date(year, month, 1);
  const nextMonthName = MONTH_NAMES[nextMonthDate.getMonth()];
  const nextMonthYear = nextMonthDate.getFullYear();
  const defaultSignDate = `01 ${nextMonthName} ${nextMonthYear}`;
  const signCity = (config.city && config.city !== 'Lembang' && config.city !== 'Sleman') ? config.city : 'Bandung Barat';
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

  const wsData: any[][] = [
    ['Lampiran Keputusan Bersama Menteri Negara Agraria / Kepala Badan Pertanahan Nasional dan Direktur Jenderal Pajak'],
    ['Nomor: SKB 2 Tahun 1998 KEP – 179/Pj/1998, Tanggal: 27 Agustus 1998'],
    [],
    [`Nama PPAT: ${config.ppatName}`, '', '', '', '', '', '', 'Kepada Yth:'],
    [`Alamat: ${config.officeAddress}`, '', '', '', '', '', '', recipientLines[0] || ''],
    [`NPWP: ${npwp}`, '', '', '', '', '', '', recipientLines[1] || ''],
    [`Daerah Kerja: ${workingArea}`, '', '', '', '', '', '', recipientLines[2] || ''],
    ['', '', '', '', '', '', '', recipientLines[3] || ''],
    [],
    ['LAPORAN BULANAN PEMBUATAN AKTA OLEH PPAT'],
    [`Bulan: ${monthName.toUpperCase()}    Tahun: ${year}`],
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
  wsData.push([`${signCity}, ${defaultSignDate}`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', `Pejabat Pembuat Akta Tanah`]);
  wsData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', `di ${workingArea}`]);
  wsData.push([]);
  wsData.push([]);
  wsData.push([]);
  wsData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', `(${config.ppatName})`]);

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
