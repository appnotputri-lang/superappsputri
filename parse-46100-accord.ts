import fs from 'fs';
import { JSDOM } from 'jsdom';

const raw = fs.readFileSync('46100.json', 'utf8');
const obj = JSON.parse(raw);

const dom = new JSDOM(obj.html);
const list = dom.window.document.querySelectorAll('.dpb-oss-accordion-head');
list.forEach(head => {
    console.log(head.textContent?.trim());
});
