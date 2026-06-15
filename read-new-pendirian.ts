import fs from 'fs';
import JSZip from 'jszip';
import * as cheerio from 'cheerio';

async function main() {
  try {
    const fileData = fs.readFileSync('PT. pendirian.docx');
    console.log('Reading PT. pendirian.docx, size:', fileData.length, 'bytes');
    const zip = await JSZip.loadAsync(fileData);
    const docXml = await zip.file('word/document.xml')?.async('text');
    if (!docXml) {
       console.log('Could not find word/document.xml inside zip');
       return;
    }
    const $ = cheerio.load(docXml, { xml: true });
    const paragraphs: string[] = [];
    $('w\\:p, p').each((_, pElem) => {
      const runs: string[] = [];
      $(pElem).find('w\\:t, t').each((_, tElem) => {
        runs.push($(tElem).text());
      });
      paragraphs.push(runs.join(''));
    });
    
    const fullText = paragraphs.join('\n');
    fs.writeFileSync('PT_PENDIRIAN_NEW_TEXT.txt', fullText, 'utf8');
    console.log('Successfully written to PT_PENDIRIAN_NEW_TEXT.txt, total characters:', fullText.length);
    console.log('------------------ FIRST 2000 CHARACTERS ----------------');
    console.log(fullText.slice(0, 2000));
    console.log('---------------------------------------------------------');
    
    // Also save last 2000 characters to show end structure
    console.log('------------------ LAST 2000 CHARACTERS ----------------');
    console.log(fullText.slice(-2000));
    console.log('---------------------------------------------------------');
  } catch (error) {
     console.error('Error parsing docx:', error);
  }
}

main();
