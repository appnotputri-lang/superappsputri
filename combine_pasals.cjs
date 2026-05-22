const fs = require('fs');

let code = fs.readFileSync('src/lib/pendirianContentBlocks.ts', 'utf8');

// Pattern to find: 
// { type: 'divider', text: "PASAL" },
// { type: 'divider', text: "X" },
// And replace with:
// { type: 'divider', text: "PASAL X" },

// Use a regex that handles potential spacing variations
code = code.replace(/\{ type: 'divider', text: "PASAL" \},\s*\{ type: 'divider', text: "(\d+)" \},/g, (match, p1) => {
    return `{ type: 'divider', text: "PASAL ${p1}" },`;
});

fs.writeFileSync('src/lib/pendirianContentBlocks.ts', code);
console.log('Pasal headers combined.');
