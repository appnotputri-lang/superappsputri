import fs from 'fs';

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Strip out multiple {align !== ...} wrappers
  content = content.replace(
    /\{align !== 'center' && align !== 'right-center' && \(\s*\{align !== 'center' && align !== 'right-center' && <span className="flex-1 overflow-hidden select-none whitespace-nowrap opacity-60" style=\{\{ letterSpacing: '0\.5px' \}\}>\s*&nbsp;\{Array\(150\)\.fill\('-'\)\.join\(''\)\}\s*<\/span>\}\s*\)\}/g,
    "{align !== 'center' && align !== 'right-center' && <span className=\"flex-1 overflow-hidden select-none whitespace-nowrap opacity-60\" style={{ letterSpacing: '0.5px' }}>&nbsp;{Array(150).fill('-').join('')}</span>}"
  );

  content = content.replace(
    /\{align !== 'center' && align !== 'center' && <span/g,
    "{align !== 'center' && align !== 'right-center' && <span"
  );
  
  // If there are broken curly braces.
  // Wait, the errors show `src/DocumentPreview.tsx(37,21): error TS1005: ',' expected`.
  
  fs.writeFileSync(file, content);
}

fixFile('src/DocumentPreview.tsx');
fixFile('src/RUPSDocumentPreview.tsx');
fixFile('components/DocumentPreview.tsx');

// Actually let me just restore the span first if I messed it up.
console.log("attempted fix");
