import fs from 'fs';
import * as cheerio from 'cheerio';

async function main() {
  const docXml = fs.readFileSync('extracted_document.xml', 'utf8');
  const $ = cheerio.load(docXml, { xml: true });
  
  const paragraphs = $('w\\:p');
  
  for (let idx of [13, 14, 15]) {
    const $p = $(paragraphs[idx]);
    console.log(`\n--- Paragraph ${idx} XML ---`);
    console.log($p.prop('outerHTML'));
  }
}

main();
