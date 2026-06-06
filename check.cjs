const fs = require('fs');
const raw = fs.readFileSync('kbli-raw.json', 'utf8');
console.log('kbli-raw.json length:', raw.length);
console.log('start string:', raw.substring(0, 100));
const json2020 = fs.readFileSync('kbli-2020.json', 'utf8');
console.log('kbli-2020.json length:', json2020.length);
