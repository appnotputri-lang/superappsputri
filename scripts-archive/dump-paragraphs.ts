import JSZip from 'jszip';
import fs from 'fs';
import { JSDOM } from 'jsdom';

async function dumpDocx() {
  const data = fs.readFileSync('DRAFT PENDIRIAN PT.docx');
  const zip = await JSZip.loadAsync(data);
  const xml = await zip.file('word/document.xml').async('text');
  const dom = new JSDOM(xml, { contentType: 'text/xml' });
  const ps = Array.from(dom.window.document.getElementsByTagName('w:p'));
  
  ps.forEach((p, i) => {
    const text = Array.from(p.getElementsByTagName('w:t')).map(t => t.textContent).join('');
    console.log(`${i}: ${text.substring(0, 50)}`);
  });
}

dumpDocx().catch(console.error);
