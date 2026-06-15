import fs from 'fs';
import * as cheerio from 'cheerio';

async function main() {
  const docXml = fs.readFileSync('extracted_document.xml', 'utf8');
  const $ = cheerio.load(docXml, { xml: true });
  
  const paragraphs = $('w\\:p');
  
  let currentnumId = '';
  paragraphs.each((idx, elem) => {
     const $p = $(elem);
     const numIdAttr = $p.find('w\\:numPr').find('w\\:numId').attr('w:val');
     const ilvl = $p.find('w\\:numPr').find('w\\:ilvl').attr('w:val');
     const text = $p.text().trim();
     
     if (numIdAttr) {
        console.log(`P[${idx}] text="${text.slice(0, 40)}" | numId=${numIdAttr} | ilvl=${ilvl}`);
     }
  });
}

main();
