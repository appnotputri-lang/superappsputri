const fs = require('fs');
const path = 'src/lib/sections/personIdentification.ts';
let code = fs.readFileSync(path, 'utf8');
code = code.replace(/return \[\n      \{ text: sal \},\n      \{ text: cleanName, bold: true \},/g, 'return [\n      ...prefixRuns,\n      { text: sal },\n      { text: cleanName, bold: true },');
fs.writeFileSync(path, code);
