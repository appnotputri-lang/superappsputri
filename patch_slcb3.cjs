const fs = require('fs');
const path = 'src/lib/sirkulerLaporanContentBlocks.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.split('if (isDirector && checkIsBadanHukum(r.shareholder)').join('if (checkIsBadanHukum(r.shareholder)');

fs.writeFileSync(path, code);
