const fs = require('fs');

function fix(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/'\.\.\/\.\.\/\.\.\/\.\.\/src\//g, "'../../../");
  content = content.replace(/'\.\.\/\.\.\/\.\.\/\.\.\/App'/g, "'../../../../App'");
  // Restore Search and Calendar
  content = content.replace("import { History, Archive, Coins, Users, FileSignature, CheckSquare, XCircle, Play, ArrowRightLeft, TrendingUp, MapPin } from 'lucide-react';", "import { History, Archive, Coins, Users, FileSignature, CheckSquare, XCircle, Search, Calendar, Play, ArrowRightLeft, TrendingUp, MapPin } from 'lucide-react';");
  fs.writeFileSync(file, content);
}

fix('src/features/document-generator/pages/RUPSLBPage.tsx');
fix('src/features/document-generator/pages/RUPSTPage.tsx');

let app = fs.readFileSync('App.tsx', 'utf8');
app = app.replace("syncCompanyDataToRupst: () => any;", "syncCompanyDataToRupst: () => Promise<boolean>;");
fs.writeFileSync('App.tsx', app);

let docGen = fs.readFileSync('src/features/document-generator/pages/DocumentGeneratorPage.tsx', 'utf8');
docGen = docGen.replace("syncCompanyDataToRupst: () => any;", "syncCompanyDataToRupst: () => Promise<boolean>;");
fs.writeFileSync('src/features/document-generator/pages/DocumentGeneratorPage.tsx', docGen);

