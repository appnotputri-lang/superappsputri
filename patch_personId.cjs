const fs = require('fs');
const path = 'src/lib/sections/personIdentification.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/useAktaFormat: true,/g, 'useAktaFormat: useAktaFormat,');

fs.writeFileSync(path, code);
