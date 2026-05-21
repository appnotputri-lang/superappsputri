import fs from 'fs';

let text = fs.readFileSync('src/DocumentPreview.tsx', 'utf8');

text = text.replace(
  "justifyContent: (align === 'center' || align === 'right-center') ? 'center' : 'flex-start',",
  "justifyContent: (align === 'center' || marginLeft === '50%') ? 'center' : 'flex-start',"
);

text = text.replace(
  "{align !== 'center' && align !== 'right-center' && (",
  "{align !== 'center' && marginLeft !== '50%' && ("
);

// We need to type the injected const align = 'left' -> const align: string = 'left'.
text = text.replace(/const align = 'left';/g, "const align: string = 'left';");

fs.writeFileSync('src/DocumentPreview.tsx', text);


let rups = fs.readFileSync('src/RUPSDocumentPreview.tsx', 'utf8');

rups = rups.replace(/const align = 'left';/g, "const align: string = 'left';");

fs.writeFileSync('src/RUPSDocumentPreview.tsx', rups);


let c = fs.readFileSync('components/DocumentPreview.tsx', 'utf8');
c = c.replace(/const align = 'left';/g, "const align: string = 'left';");

fs.writeFileSync('components/DocumentPreview.tsx', c);

