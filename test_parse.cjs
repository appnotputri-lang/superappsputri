const fs = require('fs');
const { JSDOM } = require('jsdom');

const xml = fs.readFileSync('temp_doc.xml', 'utf8');
const dom = new JSDOM(xml, { contentType: 'application/xml' });
const doc = dom.window.document;

const paragraphs = Array.from(doc.getElementsByTagName('w:p'));
console.log('Total w:p elements found by DOM:', paragraphs.length);

paragraphs.forEach((p, idx) => {
  // get direct or descendant w:t elements
  const ts = Array.from(p.getElementsByTagName('w:t'));
  const text = ts.map(t => t.textContent).join('');
  if (text.includes('SUKMADJAJA') || text.includes('ACIH') || text.includes('ROSIDAH') || text.includes('651') || text.includes('430.000.000') || text.includes('AKTA JUAL BELI') || text.includes('Nomor')) {
    console.log(`P#${idx}: "${text.trim().substring(0, 100)}"`);
  }
});
