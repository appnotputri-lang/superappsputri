import fs from 'fs';
import { JSDOM } from 'jsdom';
const raw = fs.readFileSync('46100.json', 'utf8');
const obj = JSON.parse(raw);
const dom = new JSDOM(obj.html);
fs.writeFileSync('46100.html', dom.window.document.body.innerHTML);
