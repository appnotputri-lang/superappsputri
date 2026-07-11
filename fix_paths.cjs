const fs = require('fs');

function fix(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/..\/..\/..\/src\//g, '../../../');
  // Also some were ../../../../src/ (which is correct if they were in components)
  // Let's just fix anything that says '../../../src/'
  fs.writeFileSync(file, content);
}

fix('src/features/document-generator/pages/RUPSLBPage.tsx');
fix('src/features/document-generator/pages/RUPSTPage.tsx');
fix('src/features/document-generator/pages/PendirianPage.tsx');
