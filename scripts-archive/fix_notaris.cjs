const fs = require('fs');

let pendirianBlocks = fs.readFileSync('src/lib/pendirianContentBlocks.ts', 'utf-8');
pendirianBlocks = pendirianBlocks.replace(/\$\{data\.notarisTempat\}/g, '${data.notarisTempat || "Kabupaten Bandung Barat"}');
pendirianBlocks = pendirianBlocks.replace(/toTitleCase\(data\.notarisTempat\)/g, 'toTitleCase(data.notarisTempat || "Kabupaten Bandung Barat")');
fs.writeFileSync('src/lib/pendirianContentBlocks.ts', pendirianBlocks);

let rupsBlocks = fs.readFileSync('src/lib/rupsContentBlocks.ts', 'utf-8');
rupsBlocks = rupsBlocks.replace(/\$\{domicile \|\| "..."\}/g, '${domicile || "Kabupaten Bandung Barat"}');
fs.writeFileSync('src/lib/rupsContentBlocks.ts', rupsBlocks);
console.log('Fixed notarisTempat in blocks');
