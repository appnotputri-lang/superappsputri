const fs = require('fs');

function patch(file) {
  let content = fs.readFileSync(file, 'utf8');
  let lines = content.split('\n');
  
  // Find where </div> is near the end
  let i = lines.length - 1;
  while (i >= 0 && !lines[i].includes('})();')) {
    i--;
  }
  
  if (i >= 0) {
    lines[i] = '            );';
    lines.splice(i + 1, 0, '  })();');
  }
  
  fs.writeFileSync(file, lines.join('\n'));
}

patch('src/features/document-generator/pages/RUPSLBPage.tsx');
patch('src/features/document-generator/pages/RUPSTPage.tsx');
