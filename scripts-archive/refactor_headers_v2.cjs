const fs = require('fs');

let code = fs.readFileSync('src/lib/pendirianContentBlocks.ts', 'utf8');

// We want to replace all centered bold paragraphs with dividers, 
// EXCEPT for the very first few (PENDIRIAN..., PT..., Nomor...)
// These usually appear before the preamble or right at the start of blocks.push.

const lines = code.split('\n');
let preamblePassed = false;
let resultLines = [];

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Simple heuristic: once we see "Pada hari ini" or similar, we are past the front page header.
    // However, the headers we want to change are later.
    
    // Check if it's a centered bold paragraph
    const match = line.match(/\{ type: 'p', align: 'center', runs: \[\{ text: "(.*?)", bold: true \}\] \},/);
    if (match) {
        const text = match[1];
        // Skip front page headers
        if (text.startsWith("PENDIRIAN") || text.includes("PT. ") || text.startsWith("Nomor")) {
            resultLines.push(line);
            continue;
        }
        
        // Convert to divider
        resultLines.push(line.replace(/\{ type: 'p', align: 'center', runs: \[\{ text: ".*?", bold: true \}\] \},/, `{ type: 'divider', text: "${text}" },`));
    } else {
        resultLines.push(line);
    }
}

code = resultLines.join('\n');

// Re-run the Pasal split logic just in case some were missed or newly created as dividers with "PASAL X" text
code = code.replace(/\{ type: 'divider', text: "PASAL (\d+)" \},/g, (match, p1) => {
    return `{ type: 'divider', text: "PASAL" },\n    { type: 'divider', text: "${p1}" },`;
});

fs.writeFileSync('src/lib/pendirianContentBlocks.ts', code);
console.log('Headers refactored V2.');
