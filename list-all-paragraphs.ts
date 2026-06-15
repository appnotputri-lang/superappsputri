import fs from 'fs';
import * as cheerio from 'cheerio';

async function main() {
  const docXml = fs.readFileSync('extracted_document.xml', 'utf8');
  const $ = cheerio.load(docXml, { xml: true });
  
  const paragraphs = $('w\\:p');
  console.log(`Document contains ${paragraphs.length} paragraphs`);
  
  // Create a log file with index, text content, and pPr tag
  let output = '';
  paragraphs.each((idx, elem) => {
    const $p = $(elem);
    const text = $p.text().trim();
    const pPrFull = $p.find('w\\:pPr').prop('outerHTML') || '';
    output += `Index: ${idx}\nText: "${text}"\npPr: ${pPrFull}\n\n`;
  });
  
  fs.writeFileSync('all_paragraphs.txt', output, 'utf8');
  console.log('Saved all paragraphs to all_paragraphs.txt');
}

main();
