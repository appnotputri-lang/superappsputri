const fs = require('fs');
const path = require('path');

const categories = [
  { letter: 'A', name: 'PERTANIAN, KEHUTANAN DAN PERIKANAN', min: '01', max: '03' },
  { letter: 'B', name: 'PERTAMBANGAN DAN PENGGALIAN', min: '05', max: '09' },
  { letter: 'C', name: 'INDUSTRI PENGOLAHAN', min: '10', max: '33' },
  { letter: 'D', name: 'PENGADAAN LISTRIK, GAS, UAP/AIR PANAS DAN UDARA DINGIN', min: '35', max: '35' },
  { letter: 'E', name: 'TREATMENT AIR & AIR LIMBAH, TREATMENT & PEMULIHAN MATERIAL SAMPAH, AKTIVITAS REMEDIASI', min: '36', max: '39' },
  { letter: 'F', name: 'KONSTRUKSI', min: '41', max: '43' },
  { letter: 'G', name: 'PERDAGANGAN BESAR DAN ECERAN; REPARASI DAN PERAWATAN MOBIL DAN SEPEDA MOTOR', min: '45', max: '47' },
  { letter: 'H', name: 'PENGANGKUTAN DAN PERGUDANGAN', min: '49', max: '53' },
  { letter: 'I', name: 'PENYEDIAAN AKOMODASI DAN PENYEDIAAN MAKAN MINUM', min: '55', max: '56' },
  { letter: 'J', name: 'INFORMASI DAN KOMUNIKASI', min: '58', max: '63' },
  { letter: 'K', name: 'AKTIVITAS KEUANGAN DAN ASURANSI', min: '64', max: '66' },
  { letter: 'L', name: 'REAL ESTAT', min: '68', max: '68' },
  { letter: 'M', name: 'AKTIVITAS PROFESIONAL, ILMIAH DAN TEKNIS', min: '69', max: '75' },
  { letter: 'N', name: 'AKTIVITAS PENYEWAAN DAN SEWA GUNA USAHA TANPA HAK OPSI, KETENAGAKERJAAN, AGEN PERJALANAN', min: '77', max: '82' },
  { letter: 'O', name: 'ADMINISTRASI PEMERINTAHAN, PERTAHANAN DAN JAMINAN SOSIAL WAJIB', min: '84', max: '84' },
  { letter: 'P', name: 'PENDIDIKAN', min: '85', max: '85' },
  { letter: 'Q', name: 'AKTIVITAS KESEHATAN MANUSIA DAN AKTIVITAS SOSIAL', min: '86', max: '88' },
  { letter: 'R', name: 'KESENIAN, HIBURAN DAN REKREASI', min: '90', max: '93' },
  { letter: 'S', name: 'AKTIVITAS JASA LAINNYA', min: '94', max: '96' },
  { letter: 'T', name: 'AKTIVITAS RUMAH TANGGA SBG PEMBERI KERJA; AKTIVITAS YG MENGHASILKAN BARANG JASA OLEH RUMAH TANGGA', min: '97', max: '98' },
  { letter: 'U', name: 'AKTIVITAS BADAN INTERNASIONAL DAN BADAN EKSTRA INTERNASIONAL LAINNYA', min: '99', max: '99' },
];

function getCategory(code) {
  if (!code || typeof code !== 'string') return { letter: '?', name: 'UNKNOWN' };
  const prefix2 = code.substring(0, 2);
  const p = parseInt(prefix2, 10);
  for (const cat of categories) {
    if (p >= parseInt(cat.min, 10) && p <= parseInt(cat.max, 10)) {
      return cat;
    }
  }
  return { letter: '?', name: 'UNKNOWN' };
}

// Check potential filenames of KBLI 2025
const filesToTry = [
  'kbli_2025.json',
  'kbli_2025.json.txt',
  'kbli_2025.txt',
  'kbli-2025.json',
  'kbli-2025.txt',
  'kbli-raw.json'
];

let rawData = null;
let chosenFile = '';
for (const file of filesToTry) {
  if (fs.existsSync(file)) {
    try {
      const content = fs.readFileSync(file, 'utf8').trim();
      if (content.length > 50) {
        // Try parsing directly as array or as wrapping { "data": [...] }
        const parsed = JSON.parse(content);
        rawData = Array.isArray(parsed) ? parsed : (parsed.data || parsed.Data);
        if (rawData && Array.isArray(rawData)) {
          chosenFile = file;
          break;
        }
      }
    } catch (e) {
      console.log(`Failed to parse ${file} as JSON:`, e.message);
    }
  }
}

if (!rawData) {
  console.error('No valid KBLI JSON file found to process. Please place kbli_2025.json or kbli_2025.txt in the workspace.');
  process.exit(1);
}

console.log(`Processing file: ${chosenFile} with ${rawData.length} items...`);

const formatted = rawData.map(item => {
  const code = item.kode || item.Kode;
  const name = item.judul || item.Judul;
  const description = item.uraian || item.Keterangan || '';
  const cat = getCategory(code);
  return {
    id: `kbli-${code}`,
    code: code,
    categoryLetter: cat.letter,
    categoryName: cat.name,
    name: name,
    description: description
  };
}).filter(item => item.code && item.name).sort((a,b) => a.code.localeCompare(b.code));

const tsContent = `// Auto-generated KBLI Data
import { KbliItem } from '../types';

export const KBLI_DATA: KbliItem[] = ${JSON.stringify(formatted, null, 2)};
`;

fs.writeFileSync('utils/kbliData.ts', tsContent);
console.log(`Successfully generated utils/kbliData.ts with ${formatted.length} items from ${chosenFile}!`);
