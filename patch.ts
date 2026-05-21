import fs from 'fs';

let t = fs.readFileSync('src/DocumentPreview.tsx', 'utf8');

t = t.replace(
  "textAlign: (align === 'right-center' ? 'center' : align) as any,",
  "textAlign: (align === 'right-center' ? 'center' : align) as any, justifyContent: (align === 'center' || align === 'right-center') ? 'center' : 'flex-start',"
);

// We need to replace the flex-1 overflow-hidden span correctly
t = t.replace(
  /<span className="flex-1 overflow-hidden select-none whitespace-nowrap opacity-60"/g,
  "{align !== 'center' && align !== 'right-center' && <span className=\"flex-1 overflow-hidden select-none whitespace-nowrap opacity-60\""
);

t = t.replace(
  /&nbsp;\{Array\(150\)\.fill\('-'\)\.join\(''\)\}\s*<\/span>/g,
  "&nbsp;{Array(150).fill('-').join('')}\n                   </span>}"
);

fs.writeFileSync('src/DocumentPreview.tsx', t);
console.log("DocumentPreview.tsx patched");

let r = fs.readFileSync('src/RUPSDocumentPreview.tsx', 'utf8');
r = r.replace(
  /<span className="flex-1 overflow-hidden select-none whitespace-nowrap opacity-60"/g,
  "{align !== 'center' && align !== 'right-center' && <span className=\"flex-1 overflow-hidden select-none whitespace-nowrap opacity-60\""
);

r = r.replace(
  /&nbsp;\{Array\(150\)\.fill\('-'\)\.join\(''\)\}\s*<\/span>/g,
  "&nbsp;{Array(150).fill('-').join('')}\n                   </span>}"
);

fs.writeFileSync('src/RUPSDocumentPreview.tsx', r);
console.log("RUPSDocumentPreview.tsx patched");

let c = fs.readFileSync('components/DocumentPreview.tsx', 'utf8');
c = c.replace(
  /<span className="flex-1 overflow-hidden select-none whitespace-nowrap opacity-60"/g,
  "{align !== 'center' && align !== 'right-center' && <span className=\"flex-1 overflow-hidden select-none whitespace-nowrap opacity-60\""
);

c = c.replace(
  /&nbsp;\{Array\(150\)\.fill\('-'\)\.join\(''\)\}\s*<\/span>/g,
  "&nbsp;{Array(150).fill('-').join('')}\n                   </span>}"
);

fs.writeFileSync('components/DocumentPreview.tsx', c);
console.log("components/DocumentPreview.tsx patched");
