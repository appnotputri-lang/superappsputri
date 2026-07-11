const fs = require('fs');

function fix(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/'\.\.\/\.\.\/\.\.\/\.\.\/utils\/sanitize'/g, "'../../../utils/sanitize'");
  fs.writeFileSync(file, content);
}

fix('src/features/document-generator/pages/RUPSLBPage.tsx');
fix('src/features/document-generator/pages/RUPSTPage.tsx');
fix('src/features/document-generator/pages/PendirianPage.tsx');

