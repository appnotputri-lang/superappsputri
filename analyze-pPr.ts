import fs from 'fs';
import * as cheerio from 'cheerio';

function cleanXml(xml: string): string {
  return xml.replace(/\s+/g, ' ').trim();
}

async function main() {
  const docXml = fs.readFileSync('extracted_document.xml', 'utf8');
  const $ = cheerio.load(docXml, { xml: true });
  
  const paragraphs = $('w\\:p');
  console.log(`Analyzing ${paragraphs.length} paragraphs...`);
  
  const catalog: { [key: string]: string[] } = {
    title: [],         // PENDIRIAN PERSEROAN TERBATAS etc.
    normal: [],        // Pada hari ini, dll.
    pasalTitle: [],    // NAMA DAN TEMPAT KEDUDUKAN etc.
    pasalLabel: [],    // PASAL 1 etc.
    numberedPasal: [], // 1. Perseroan Terbatas dll.
    subNumbered: [],   // a. Nama dan alamat dll.
    bullet: [],        // Group KBLIs or items
    shareholderLine1: [], // Tuan Victory...
    shareholderLine2: [], // nominal...
    witness: [],       // Saksi
    notarisLabel: [],  // Notaris di...
    notarisName: []    // NUKANTINI...
  };
  
  paragraphs.each((idx, elem) => {
    const $p = $(elem);
    const text = $p.text().trim();
    const pPrXml = $p.find('w\\:pPr').html();
    const pPrFull = $p.find('w\\:pPr').prop('outerHTML') || '';
    
    if (idx === 0 || idx === 1) {
      catalog.title.push(pPrFull);
    } else if (text.startsWith('Pada hari ini') || text.startsWith('Pukul') || text.startsWith('Telah hadir di hadapan saya')) {
      catalog.normal.push(pPrFull);
    } else if (text === 'NAMA DAN TEMPAT KEDUDUKAN' || text === 'JANGKA WAKTU BERDIRINYA PERSEROAN' || text === 'MAKSUD DAN TUJUAN SERTA KEGIATAN USAHA') {
      catalog.pasalTitle.push(pPrFull);
    } else if (text === 'PASAL 1' || text === 'PASAL 2' || text === 'PASAL 3') {
      catalog.pasalLabel.push(pPrFull);
    } else if (text.startsWith('Perseroan Terbatas ini bernama') || text.startsWith('Perseroan didirikan untuk jangka waktu')) {
      catalog.numberedPasal.push(pPrFull);
    } else if (text.startsWith('Nama dan alamat pemegang') || text.startsWith('Nomor surat saham')) {
      catalog.subNumbered.push(pPrFull);
    } else if (text.startsWith('Tuan VICTORY HENDRIO, tersebut di atas, sejumlah 130')) {
      catalog.shareholderLine1.push(pPrFull);
    } else if (text.startsWith('dengan nilai nominal seluruhnya sebesar Rp. 6.500.000')) {
      catalog.shareholderLine2.push(pPrFull);
    } else if (text.startsWith('Nendi Suhendi, lahir di Bandung')) {
      catalog.witness.push(pPrFull);
    } else if (text.startsWith('Notaris di Kabupaten Bandung Barat')) {
      catalog.notarisLabel.push(pPrFull);
    } else if (text.startsWith('NUKANTINI PUTRI PARINCHA')) {
      catalog.notarisName.push(pPrFull);
    }
  });
  
  // Format and print first item of each catalog
  for (const [key, xmls] of Object.entries(catalog)) {
    console.log(`\n==========================================`);
    console.log(`Key: ${key} (found ${xmls.length} samples)`);
    if (xmls.length > 0) {
      // Print clean pretty xml
      console.log(xmls[0]);
    } else {
      console.log('No elements matched.');
    }
  }
}

main();
