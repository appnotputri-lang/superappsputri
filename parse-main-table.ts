import fs from 'fs';
import { JSDOM } from 'jsdom';

const raw = fs.readFileSync('20115.json', 'utf8');
const obj = JSON.parse(raw);

const dom = new JSDOM(obj.html);
const html = dom.window.document.body.innerHTML;

const matches = html.match(/.{0,50}risiko.{0,50}/gi);
console.log("Risiko matches:", matches);
