const fs = require('fs');

let code = fs.readFileSync('src/lib/pendirianContentBlocks.ts', 'utf8');

// Replace standard centered headers with divider blocks
// Matches: { type: 'p', align: 'center', runs: [{ text: "...", bold: true }] }
// But we skip the very first few (PENDIRIAN..., PT..., Nomor...)

const titles = [
  "NAMA DAN TEMPAT KEDUDUKAN",
  "JANGKA WAKTU BERDIRINYA PERSEROAN",
  "MAKSUD DAN TUJUAN SERTA KEGIATAN USAHA",
  "M O D A L",
  "MODAL",
  "S A H A M",
  "SAHAM",
  "PENGGANTI SURAT SAHAM",
  "PEMINDAHAN HAK ATAS SAHAM",
  "RAPAT UMUM PEMEGANG SAHAM",
  "TEMPAT, PANGGILAN DAN PIMPINAN RAPAT UMUM PEMEGANG SAHAM",
  "HAK SUARA DAN KEPUTUSAN",
  "DIREKSI",
  "DEWAN KOMISARIS",
  "RENCANA KERJA, TAHUN BUKU DAN LAPORAN TAHUNAN",
  "PENGGUNAAN LABA DAN PEMBAGIAN DIVIDEN",
  "PENGGUNAAN LABA DAN PEMBAGIAN LABA",
  "PENGGUNAAN LABA",
  "KETENTUAN PENUTUP"
];

titles.forEach(title => {
  const regex = new RegExp(`\\{ type: 'p', align: 'center', runs: \\[\\{ text: "${title}", bold: true \\}\\] \\},`, 'g');
  code = code.replace(regex, `{ type: 'divider', text: "${title}" },`);
});

// Replace "PASAL 1", "PASAL 2" etc with multi-line dividers
// Matches: { type: 'p', align: 'center', runs: [{ text: "PASAL 1", bold: true }] },
// Becomes: { type: 'divider', text: "PASAL" }, { type: 'divider', text: "1" },

code = code.replace(/\{ type: 'p', align: 'center', runs: \[\{ text: "PASAL (\d+)", bold: true \}\] \},/g, (match, p1) => {
  return `{ type: 'divider', text: "PASAL" },\n    { type: 'divider', text: "${p1}" },`;
});

// Also handle cases with extra spaces if any
code = code.replace(/\{ type: 'p', align: 'center', runs: \[\{ text: "PASAL (\d+)", bold: true \}\]\},/g, (match, p1) => {
  return `{ type: 'divider', text: "PASAL" },\n    { type: 'divider', text: "${p1}" },`;
});

fs.writeFileSync('src/lib/pendirianContentBlocks.ts', code);
console.log('Headers refactored.');
