const fs = require('fs');
let content = fs.readFileSync('src/lib/formatter.ts', 'utf8');
content = content.replace(/: formatDateStr\(/g, ': formatDateRupst(');
fs.writeFileSync('src/lib/formatter.ts', content);
console.log('Done');
