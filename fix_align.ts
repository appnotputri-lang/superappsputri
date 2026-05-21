import fs from 'fs';

function ensureAlign(file) {
  let text = fs.readFileSync(file, 'utf8');
  let lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("if (block.type === 'list') {") || 
        lines[i].includes("else if (block.type === 'list') {") || 
        lines[i].includes("else if (block.type === 'shareholder-list') {") ||
        lines[i].includes("else if (block.type === 'management-list') {")) {
      
      // Inject const align = 'left'; just below it.
      lines.splice(i + 1, 0, "      const align = 'left';");
      i++; // skip the injected line
    }
  }
  
  fs.writeFileSync(file, lines.join('\n'));
}

ensureAlign('src/DocumentPreview.tsx');
ensureAlign('src/RUPSDocumentPreview.tsx');
ensureAlign('components/DocumentPreview.tsx');
