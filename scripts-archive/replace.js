import fs from 'fs';
let code = fs.readFileSync('App.tsx', 'utf8');

// Modernize aesthetic
code = code.replace(/text-\[10px\]/g, 'text-xs');
code = code.replace(/text-\[11px\]/g, 'text-sm');
code = code.replace(/rounded-2xl/g, 'rounded-3xl');
code = code.replace(/text-\[9px\]/g, 'text-[11px]');

fs.writeFileSync('App.tsx', code);
console.log('Done');
