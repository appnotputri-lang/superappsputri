import fs from 'fs';
import { JSDOM } from 'jsdom';

const raw = fs.readFileSync('46100.json', 'utf8');
const obj = JSON.parse(raw);

const dom = new JSDOM(obj.html);
const list = dom.window.document.querySelectorAll('.dpb-oss-accordion-item');
list.forEach((item, index) => {
    const head = item.querySelector('.dpb-oss-accordion-head');
    console.log(`Accordion ${index}:`, head?.textContent?.trim());
});
