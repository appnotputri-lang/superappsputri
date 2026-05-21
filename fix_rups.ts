import fs from 'fs';

let text = fs.readFileSync('src/RUPSDocumentPreview.tsx', 'utf8');

text = text.replace(
  "{align !== 'center' && (\n                    {align !== 'center' && align !== 'right-center' && <span",
  "{align !== 'center' && (\n                    {<span"
);

// We need to just fix lines 69 to 73.
let lines = text.split('\n');
lines[68] = "                  {align !== 'center' && (";
lines[69] = "                    <span className=\"flex-1 overflow-hidden select-none whitespace-nowrap opacity-60\" style={{ letterSpacing: '0.5px' }}>";
lines[70] = "                      &nbsp;{Array(200).fill('-').join('')}";
lines[71] = "                    </span>";
lines[72] = "                  )}";

fs.writeFileSync('src/RUPSDocumentPreview.tsx', lines.join('\n'));
