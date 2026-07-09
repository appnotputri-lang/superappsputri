const fs = require('fs');
let code = fs.readFileSync('src/lib/pendirianContentBlocks.ts', 'utf-8');
code = code.replace(/\(dua puluh lima persen\)/g, '(${terbilang(modalDisetorPersen)} persen)');
fs.writeFileSync('src/lib/pendirianContentBlocks.ts', code);
console.log('Fixed terbilang');
