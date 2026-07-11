const fs = require('fs');

function fix(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/'\.\.\/\.\.\/\.\.\/utils\//g, "'../../../../utils/");
  content = content.replace(/'\.\.\/\.\.\/\.\.\/constants\//g, "'../../../../src/constants/");
  content = content.replace(/AutoSaveIndicatorComponent\n\} from/g, "AutoSaveIndicatorComponent\n  } from");
  fs.writeFileSync(file, content);
}

fix('src/features/document-generator/pages/RUPSLBPage.tsx');
fix('src/features/document-generator/pages/RUPSTPage.tsx');

