import fs from 'fs';

const rawHtml = fs.readFileSync('test-fetch.json', 'utf8');
const obj = JSON.parse(rawHtml);
console.log(obj.html);
