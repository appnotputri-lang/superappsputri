import fs from 'fs';

function fixFile(file) {
  let text = fs.readFileSync(file, 'utf8');
  let lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Array(")) {
      // The line with Array(200) or Array(150)
      if (lines[i+1].trim() === "</span>") {
        lines[i+1] = lines[i+1].replace("</span>", "</span>}");
      }
    }
  }

  fs.writeFileSync(file, lines.join('\n'));
}

fixFile('src/RUPSDocumentPreview.tsx');
fixFile('src/DocumentPreview.tsx');
fixFile('components/DocumentPreview.tsx');
