const fs = require('fs');

function fix(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/'..\/..\/..\/App'/g, "'../../../../App'");
  content = content.replace(/'..\/..\/..\/utils\//g, "'../../../../src/utils/");
  content = content.replace(/'..\/..\/..\/components\//g, "'../../../../src/components/");
  content = content.replace(/'..\/..\/..\/constants\//g, "'../../../../src/constants/");
  content = content.replace(/'..\/..\/..\/lib\//g, "'../../../../src/lib/");
  // ShareholderEditor is default export
  content = content.replace(/import \{ ShareholderEditor \} from/g, 'import ShareholderEditor from');
  content = content.replace(/import \{ ImportKBLI \} from/g, 'import ImportKBLI from');
  fs.writeFileSync(file, content);
}

fix('src/features/document-generator/pages/RUPSLBPage.tsx');
fix('src/features/document-generator/pages/RUPSTPage.tsx');

let app = fs.readFileSync('App.tsx', 'utf8');
app = app.replace("syncCompanyDataToRupst: () => Promise<boolean>;", "syncCompanyDataToRupst: () => any;");
fs.writeFileSync('App.tsx', app);

let docGen = fs.readFileSync('src/features/document-generator/pages/DocumentGeneratorPage.tsx', 'utf8');
docGen = docGen.replace("syncCompanyDataToRupst: () => Promise<boolean>;", "syncCompanyDataToRupst: () => any;");
fs.writeFileSync('src/features/document-generator/pages/DocumentGeneratorPage.tsx', docGen);

