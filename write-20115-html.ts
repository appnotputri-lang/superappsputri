import fs from 'fs';
import { JSDOM } from 'jsdom';
const raw = fs.readFileSync('20115.json', 'utf8');
const obj = JSON.parse(raw);
const dom = new JSDOM(obj.html);
fs.writeFileSync('20115.html', dom.window.document.body.innerHTML);
