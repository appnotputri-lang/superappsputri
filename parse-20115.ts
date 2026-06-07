import fs from 'fs';
import { JSDOM } from 'jsdom';

const raw = fs.readFileSync('20115.json', 'utf8');
const obj = JSON.parse(raw);

const dom = new JSDOM(obj.html);

const tables = dom.window.document.querySelectorAll('table');
tables.forEach((t, index) => {
  const ths = Array.from(t.querySelectorAll('th')).map(x => x.textContent.trim());
  console.log(`[Table ${index}] HEADERS:`, ths);
});
