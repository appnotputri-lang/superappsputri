const fs = require('fs');
const path = 'src/lib/sirkulerLaporanContentBlocks.ts';
let code = fs.readFileSync(path, 'utf8');

// I will import `buildAmendmentDeedBlocks` at the top
code = code.replace(/import \{ \n  formatNumber,/, 'import { buildAmendmentDeedBlocks } from "./sections/history/amendmentDeeds";\nimport { \n  formatNumber,');

fs.writeFileSync(path, code);
