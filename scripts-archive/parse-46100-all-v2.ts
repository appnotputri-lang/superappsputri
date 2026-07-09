import fs from 'fs';
import { JSDOM } from 'jsdom';

const raw = fs.readFileSync('46100.json', 'utf8');
const obj = JSON.parse(raw);

const dom = new JSDOM(obj.html);
const list = dom.window.document.querySelectorAll('.dpb-oss-pbumku-title');
list.forEach((item, index) => {
    console.log(`pbumku-title ${index}:`, item?.textContent?.trim());
});

const titles = dom.window.document.querySelectorAll('h3, h4, h2, .title');
titles.forEach((item, index) => {
    console.log(`title ${index}:`, item?.textContent?.trim());
});

const topLevelDivs = dom.window.document.querySelectorAll('.dpb-oss-table-block > div');
topLevelDivs.forEach((item, index) => {
    console.log(`topLevelDiv ${index}:`, item?.className);
});

