import fs from 'fs';
import JSZip from 'jszip';
import * as cheerio from 'cheerio';

async function main() {
  try {
    const fileData = fs.readFileSync('template_pendirian.docx');
    const zip = await JSZip.loadAsync(fileData);
    
    const docXml = await zip.file('word/document.xml')?.async('text');
    const stylesXml = await zip.file('word/styles.xml')?.async('text');
    const numberingXml = await zip.file('word/numbering.xml')?.async('text');

    if (docXml) fs.writeFileSync('extracted_document.xml', docXml, 'utf8');
    if (stylesXml) fs.writeFileSync('extracted_styles.xml', stylesXml, 'utf8');
    if (numberingXml) fs.writeFileSync('extracted_numbering.xml', numberingXml, 'utf8');

    console.log('Successfully extracted the three XML files.');
    
    // Let's inspect some settings like page size, margins
    if (docXml) {
       const $ = cheerio.load(docXml, { xml: true });
       const pgSz = $('w\\:pgSz').first();
       const pgMar = $('w\\:pgMar').first();
       console.log('Page Size:', pgSz.attr('w:w'), pgSz.attr('w:h'));
       console.log('Page Margins:', {
         top: pgMar.attr('w:top'),
         bottom: pgMar.attr('w:bottom'),
         left: pgMar.attr('w:left'),
         right: pgMar.attr('w:right')
       });
       
       // Count unique w:pPr styles
       const pPrs = $('w\\:pPr');
       console.log('Number of w:pPr elements:', pPrs.length);
       
       const uniqueStyles = new Set();
       $('w\\:pStyle').each((_, elem) => {
         uniqueStyles.add($(elem).attr('w:val'));
       });
       console.log('Unique paragraph styles:', Array.from(uniqueStyles));

       const uniqueNums = new Set();
       $('w\\:numPr').each((_, elem) => {
         const numId = $(elem).find('w\\:numId').attr('w:val');
         uniqueNums.add(numId);
       });
       console.log('Unique w:numId values:', Array.from(uniqueNums));
    }
  } catch (error) {
     console.error('Error during extraction:', error);
  }
}

main();
