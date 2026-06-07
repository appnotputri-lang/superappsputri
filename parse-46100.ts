import fs from 'fs';
import { JSDOM } from 'jsdom';

const raw = fs.readFileSync('46100.json', 'utf8');
const obj = JSON.parse(raw);

const dom = new JSDOM(obj.html);
const list = dom.window.document.querySelectorAll('table');
console.log("Total tables: ", list.length);
list.forEach((t, i) => {
    const ths = Array.from(t.querySelectorAll('th')).map(x => x.textContent.trim());
    console.log(`Table ${i} Headers:`, ths);
    if (ths.some(h => h.toLowerCase() === 'ruang lingkup')) {
        console.log(`Found Ruang Lingkup in Table ${i}`);
        const rows = t.querySelectorAll('tbody tr');
        rows.forEach((tr, j) => {
            const tds = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
            console.log(`[Row ${j}]`, JSON.stringify(tds));
        });
    }
});
