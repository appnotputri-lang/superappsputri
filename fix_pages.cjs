const fs = require('fs');

function fixRupslb() {
  const content = fs.readFileSync('src/features/document-generator/pages/RUPSLBPage.tsx', 'utf8');
  let fixed = content.replace('return (\n              ) : (() => {', 'return (() => {');
  fixed = fixed.replace(/ {12}\);\n {2}\);\n};/g, '    })();\n};');
  fs.writeFileSync('src/features/document-generator/pages/RUPSLBPage.tsx', fixed);
}

function fixRupst() {
  const content = fs.readFileSync('src/features/document-generator/pages/RUPSTPage.tsx', 'utf8');
  let fixed = content.replace('return (\n              })() : (() => {', 'return (() => {');
  fixed = fixed.replace(/ {12}\);\n {2}\);\n};/g, '    })();\n};');
  fs.writeFileSync('src/features/document-generator/pages/RUPSTPage.tsx', fixed);
}

fixRupslb();
fixRupst();
