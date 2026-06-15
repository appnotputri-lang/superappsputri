import fs from 'fs';
import * as cheerio from 'cheerio';

async function main() {
  const numXml = fs.readFileSync('extracted_numbering.xml', 'utf8');
  const $ = cheerio.load(numXml, { xml: true });
  
  const numInstances = $('w\\:num');
  console.log(`Number of w:num instances: ${numInstances.length}`);
  
  numInstances.slice(0, 10).each((idx, elem) => {
    const $num = $(elem);
    const numId = $num.attr('w:numId');
    const abstractNumId = $num.find('w\\:abstractNumId').attr('w:val');
    console.log(`numId: ${numId} -> abstractNumId: ${abstractNumId}`);
  });
  
  const abstractNums = $('w\\:abstractNum');
  console.log(`\nNumber of w:abstractNum definitions: ${abstractNums.length}`);
  
  abstractNums.slice(0, 5).each((idx, elem) => {
    const $abs = $(elem);
    const absNumId = $abs.attr('w:abstractNumId');
    console.log(`abstractNumId: ${absNumId}`);
    $abs.find('w\\:lvl').each((_, lvl) => {
      const $lvl = $(lvl);
      const ilvl = $lvl.attr('w:ilvl');
      const numFmt = $lvl.find('w\\:numFmt').attr('w:val');
      const lvlText = $lvl.find('w\\:lvlText').attr('w:val');
      console.log(`  lvl: ${ilvl}, numFmt: ${numFmt}, lvlText: ${lvlText}`);
    });
  });
}

main();
