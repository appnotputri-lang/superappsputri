import fs from 'fs';
const lines = fs.readFileSync('App.tsx', 'utf8').split('\n');
lines[848] = '            )}\n\n            {/* PENGURUS DAN PEMEGANG SAHAM BARU */}';
fs.writeFileSync('App.tsx', lines.join('\n'));
