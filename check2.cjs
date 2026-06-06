const fs = require('fs');
const raw = JSON.parse(fs.readFileSync('kbli-raw.json', 'utf8'));
console.log('length:', raw.length);
console.log('first item:', raw[0]);
